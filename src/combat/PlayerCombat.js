// Local player's use of weapons and items: aim from the camera, fire, reload,
// switch slots, pick up, drop and consume. Talks to the CombatSystem for hits.
import * as THREE from 'three';
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../config/consumables.js';
import { getWeapon } from '../config/weapons.js';
import { effectiveSpread, maxShotDistance } from './Ballistics.js';
import { UseResult } from '../player/ConsumableUse.js';
import { SLOT_COUNT } from '../player/Inventory.js';

const notCharacter = (c) => !c.userData?.character;
const DEG = Math.PI / 180;

export class PlayerCombat {
  constructor({ player, combat, targets, loot, world, effects, audio, hud, events, cfg = COMBAT_CONFIG }) {
    this.player = player;
    this.combat = combat;
    this.targets = targets;
    this.loot = loot;
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.hud = hud;
    this.events = events;
    this.cfg = cfg;
    this.focus = null;
    this.spread = 0;
    this._muzzle = new THREE.Vector3();
    this._aim = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } };
  }

  // Points the player's combat at the systems of a newly loaded map.
  attach({ combat, targets, loot, world, effects }) {
    this.combat = combat;
    this.targets = targets;
    this.loot = loot;
    this.world = world;
    this.effects = effects;
    this.focus = null;
  }

  get loadout() {
    return this.player.loadout;
  }

  get weapon() {
    return this.loadout.activeWeapon;
  }

  // Firing a rifle stops the sprint (pistols and revolvers can fire while running).
  adjustIntent(intent, input, building) {
    const w = this.weapon;
    if (w && !building && !w.canFireWhileSprinting && input.isDown('fire')) intent.sprint = false;
    return intent;
  }

  /**
   * @param {number} dt
   * @param {{input, intent, building:boolean, cameraRig, camera, wheel:number}} ctx
   */
  update(dt, { input, intent, building, cameraRig, camera, wheel }) {
    const lo = this.loadout;
    const p = this.player;

    // Slots (keys 1-5 and wheel belong to the build bar in build mode).
    if (!building) {
      for (let i = 0; i < SLOT_COUNT; i++) if (input.wasPressed(`slot${i + 1}`)) this.selectSlot(i);
      if (wheel !== 0) this._cycle(wheel > 0 ? 1 : -1);
    }

    // Consumables.
    CONSUMABLE_ORDER.forEach((id) => {
      if (input.wasPressed(CONSUMABLES[id].key)) this.useConsumable(id);
    });

    const w = this.weapon;
    const sprinting = p.controller.state.sprinting;
    const blockedBySprint = w && sprinting && !w.canFireWhileSprinting;
    const allowFire = Boolean(w) && !building && !blockedBySprint && p.alive;
    const firePressed = input.wasPressed('fire') && !building;
    const fireDown = input.isDown('fire') && !building;

    const moving = Math.hypot(intent.moveX, intent.moveY) > 0.1 || intent.jumpPressed;
    const used = lo.use.update(dt, { moving, firing: Boolean(w) && (firePressed || (fireDown && allowFire)) }, lo.inventory, lo.health);
    if (used?.type === 'completed') {
      this.audio.play(CONSUMABLES[used.id].stat === 'shield' ? 'pickup' : 'healDone', { volume: 0.7 });
      this.hud.toast(`${CONSUMABLES[used.id].name} : +${Math.round(used.gained)}`, 'good');
    } else if (used?.type === 'cancelled') {
      this.hud.toast('Utilisation annulée', 'warn');
    }

    if (input.wasPressed('reload') && w && !lo.weapon.canReload() && !lo.weapon.reloading) {
      const it = lo.activeItem;
      if (it.reserve === 0 && it.mag < w.magazine) this.hud.toast('Plus de munitions en réserve', 'warn');
    }

    lo.syncEquipped();
    const events = lo.weapon.update(dt, { firePressed, fireDown, reloadPressed: input.wasPressed('reload'), allowFire });
    for (const e of events) {
      if (e.type === 'shot') this._shoot(e, cameraRig, intent);
      else if (e.type === 'reloadStart') this.audio.play('reload', { volume: 0.7 });
      else if (e.type === 'reloadEnd') this.audio.play('reloadDone', { volume: 0.6 });
      else if (e.type === 'dry') {
        this.audio.play('dryFire', { volume: 0.7 });
        this.hud.toast('Plus de munitions', 'warn');
      }
    }
    if (firePressed && blockedBySprint) this.hud.toast('Impossible de tirer en courant avec cette arme', 'warn');

    // Spread shown by the crosshair (degrees -> pixels at the current FOV).
    if (w) {
      this.spread = effectiveSpread(w, lo.weapon.bloom, this._modifiers(intent));
      const h = window.innerHeight;
      const tanHalf = Math.tan((camera.fov * DEG) / 2);
      this.spreadPx = (Math.tan(this.spread * DEG) / tanHalf) * (h / 2);
    } else {
      this.spreadPx = null;
    }

    // Pickup / drop.
    this._updateFocus();
    if (input.wasPressed('interact')) this.pickup();
    if (input.wasPressed('drop') && !building) this.dropActive(cameraRig);
  }

  _modifiers(intent) {
    const p = this.player;
    return {
      sprint: p.controller.state.sprinting,
      airborne: !p.motor.grounded,
      crouch: p.motor.crouched,
      aim: intent.aiming,
    };
  }

  selectSlot(i) {
    if (this.loadout.selectSlot(i) && this.loadout.activeItem) this.audio.play('equip', { volume: 0.5 });
  }

  _cycle(step) {
    if (this.loadout.cycleSlot(step)) this.audio.play('equip', { volume: 0.5 });
  }

  useConsumable(id) {
    const r = this.loadout.startUse(id);
    if (r !== UseResult.STARTED && r !== UseResult.BUSY) this.hud.toast(r, 'warn');
  }

  // Camera ray -> aim point; the shot leaves from the eye toward it.
  _resolveAim(cameraRig) {
    const p = this.player.position;
    const cam = cameraRig.position;
    const f = cameraRig.forward;
    const ex = p.x;
    const ey = p.y + this.player.eyeHeight;
    const ez = p.z;
    // Ignore what lies between the camera and the player.
    const t0 = Math.max(0, (ex - cam.x) * f.x + (ey - cam.y) * f.y + (ez - cam.z) * f.z);
    const sx = cam.x + f.x * t0;
    const sy = cam.y + f.y * t0;
    const sz = cam.z + f.z * t0;
    const w = this.weapon;
    const maxDist = maxShotDistance(w, this.cfg);
    const wh = this.world.raycast(sx, sy, sz, f.x, f.y, f.z, maxDist, { filter: notCharacter });
    let dist = wh ? wh.distance : maxDist;
    const th = this.targets.raycast(sx, sy, sz, f.x, f.y, f.z, dist, this.player.target.id);
    if (th) dist = th.distance;
    const ax = sx + f.x * dist;
    const ay = sy + f.y * dist;
    const az = sz + f.z * dist;
    let dx = ax - ex;
    let dy = ay - ey;
    let dz = az - ez;
    const l = Math.hypot(dx, dy, dz);
    if (l < 1.2) {
      dx = f.x; dy = f.y; dz = f.z;
    } else {
      dx /= l; dy /= l; dz /= l;
    }
    const a = this._aim;
    a.origin.x = ex; a.origin.y = ey; a.origin.z = ez;
    a.dir.x = dx; a.dir.y = dy; a.dir.z = dz;
    return a;
  }

  _shoot(event, cameraRig, intent) {
    const w = this.weapon;
    const aim = this._resolveAim(cameraRig);
    const spread = effectiveSpread(w, event.bloom, this._modifiers(intent));
    const m = this.player.getMuzzle(this._muzzle);
    const muzzle = { x: m.x, y: m.y, z: m.z };
    this.combat.fire({ ownerId: this.player.target.id, weapon: w, origin: aim.origin, muzzle, dir: aim.dir, spread });
    this.effects.muzzleFlash(muzzle, aim.dir, w.pellets > 1 || w.explosion ? 1.6 : w.category === 'pistol' ? 0.8 : 1);
    this.audio.play(`shot:${w.id}`, { volume: w.sound.gain, pitchVariance: 0.04 });
    cameraRig.addRecoil(w.recoil * (intent.aiming ? 0.7 : 1));
    this.player.onShot();
  }

  _updateFocus() {
    const p = this.player.position;
    const item = this.player.alive ? this.loot.nearest(p.x, p.y, p.z, this.cfg.pickupRadius) : null;
    this.focus = item;
    if (!item) {
      this.prompt = null;
      return;
    }
    const inv = this.loadout.inventory;
    if (item.kind === 'weapon') {
      const w = getWeapon(item.weapon.id);
      const pv = inv.previewWeapon(item.weapon);
      const active = inv.activeItem ? getWeapon(inv.activeItem.id).name : '';
      const detail = pv.action === 'refill' ? 'Recharger le chargeur'
        : pv.action === 'swap' ? `Échanger contre ${active}`
          : pv.action === 'none' ? pv.reason : `Ramasser · ${item.weapon.mag} / ${item.weapon.reserve}`;
      this.prompt = { title: w.name, detail, disabled: pv.action === 'none' };
    } else {
      const c = CONSUMABLES[item.consumable];
      const full = inv.consumables[item.consumable] >= 5;
      this.prompt = { title: `${c.name} ×${item.count}`, detail: full ? 'Maximum atteint (5)' : 'Ramasser', disabled: full };
    }
  }

  pickup() {
    const item = this.focus;
    if (!item) return false;
    const lo = this.loadout;
    if (item.kind === 'weapon') {
      const pv = lo.inventory.previewWeapon(item.weapon);
      if (pv.action === 'none') {
        this.hud.toast(pv.reason, 'warn');
        return false;
      }
      const taken = this.loot.take(item.id);
      if (!taken) return false;
      const r = lo.pickWeapon(taken.weapon);
      if (r.dropped) {
        const p = this.player.position;
        this.loot.dropWeapon(r.dropped, p.x, p.y, p.z);
      }
      this.audio.play('pickup', { volume: 0.6 });
      return true;
    }
    const accepted = lo.inventory.addConsumable(item.consumable, item.count);
    if (accepted === 0) {
      this.hud.toast('Maximum atteint (5)', 'warn');
      return false;
    }
    if (accepted >= item.count) this.loot.take(item.id);
    else this.loot.reduce(item.id, item.count - accepted);
    this.audio.play('pickup', { volume: 0.6 });
    return true;
  }

  dropActive(cameraRig) {
    const item = this.loadout.dropActive();
    if (!item) return false;
    const p = this.player.position;
    const fx = -Math.sin(cameraRig.yaw);
    const fz = -Math.cos(cameraRig.yaw);
    let x = p.x + fx * this.cfg.dropDistance;
    let z = p.z + fz * this.cfg.dropDistance;
    // Do not drop through a wall: keep it at the player's feet if blocked.
    const block = this.world.raycast(p.x, p.y + 0.5, p.z, fx, 0, fz, this.cfg.dropDistance + 0.3, { filter: notCharacter });
    if (block) {
      x = p.x;
      z = p.z;
    }
    const y = this.world.groundHeight(x, z, 0.2, p.y + 0.6);
    this.loot.dropWeapon(item, x, Number.isFinite(y) ? y : p.y, z);
    this.audio.play('equip', { volume: 0.5, pitch: 0.8 });
    return true;
  }
}
