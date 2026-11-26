// Timing logic of the equipped weapon: fire modes, rate of fire, bursts,
// reload, equip delay, bloom. Pure: it emits events, the combat system resolves shots.
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { getWeapon } from '../config/weapons.js';

let uidCounter = 0;

// A weapon item, as stored in the inventory or on the ground.
export function createWeaponItem(id, { mag, reserve } = {}) {
  const w = getWeapon(id);
  uidCounter += 1;
  return {
    uid: `w${uidCounter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    id,
    mag: mag ?? w.magazine,
    reserve: reserve ?? w.reserveAmmo,
  };
}

export class WeaponController {
  constructor(cfg = COMBAT_CONFIG) {
    this.cfg = cfg;
    this.item = null;
    this.weapon = null;
    this.cooldown = 0;
    this.equipTimer = 0;
    this.reloadTimer = 0;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.pendingClick = 0;
    this.bloom = 0;
    this.sinceLastShot = Infinity;
    this.dryLatch = false;
    this.events = [];
  }

  get reloading() {
    return this.reloadTimer > 0;
  }

  get reloadProgress() {
    return this.reloading ? 1 - this.reloadTimer / this.weapon.reloadTime : 0;
  }

  get equipping() {
    return this.equipTimer > 0;
  }

  // Equips an item (or null for empty hands). Cancels any reload.
  equip(item) {
    if (item === this.item) return;
    this.item = item;
    this.weapon = item ? getWeapon(item.id) : null;
    this.reloadTimer = 0;
    this.burstLeft = 0;
    this.pendingClick = 0;
    this.bloom = 0;
    this.cooldown = 0;
    this.equipTimer = this.weapon ? this.weapon.equipTime : 0;
  }

  cancelReload() {
    this.reloadTimer = 0;
  }

  canReload() {
    const it = this.item;
    return Boolean(it && !this.reloading && it.mag < this.weapon.magazine && it.reserve > 0);
  }

  startReload() {
    if (!this.canReload()) return false;
    this.reloadTimer = this.weapon.reloadTime;
    this.burstLeft = 0;
    this.events.push({ type: 'reloadStart' });
    return true;
  }

  /**
   * @param {number} dt
   * @param {{firePressed:boolean, fireDown:boolean, reloadPressed:boolean, allowFire:boolean}} input
   *        allowFire = false while building, sprinting with a rifle, using an item...
   * @returns {Array<{type:string, bloom?:number}>} events of this frame (reused array)
   */
  update(dt, input) {
    const ev = this.events;
    ev.length = 0;
    this.sinceLastShot += dt;
    if (this.sinceLastShot >= this.cfg.bloomResetTime) this.bloom = 0;
    if (!input.fireDown) this.dryLatch = false;
    const w = this.weapon;
    const it = this.item;
    if (!w) return ev;

    this.equipTimer = Math.max(0, this.equipTimer - dt);
    this.pendingClick = Math.max(0, this.pendingClick - dt);

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const n = Math.min(w.magazine - it.mag, it.reserve);
        it.mag += n;
        it.reserve -= n;
        ev.push({ type: 'reloadEnd' });
      }
    }
    if (input.reloadPressed) this.startReload();

    const interval = 60 / w.fireRate;
    const busy = this.equipTimer > 0 || this.reloadTimer > 0;
    if (input.firePressed) this.pendingClick = 0.18; // a click slightly early is kept

    let wantShot = false;
    if (w.fireMode === 'auto') wantShot = input.fireDown;
    else if (w.fireMode === 'semi') wantShot = this.pendingClick > 0;
    else if (w.fireMode === 'burst') {
      if (this.burstLeft === 0 && this.pendingClick > 0 && this.cooldown <= 0 && !busy && input.allowFire && it.mag > 0) {
        this.burstLeft = Math.min(w.burstCount, it.mag);
        this.pendingClick = 0;
      }
      wantShot = this.burstLeft > 0;
    }

    let guard = 0;
    this.cooldown -= dt;
    while (wantShot && this.cooldown <= 0 && guard++ < 8) {
      if (busy || !input.allowFire) break;
      if (it.mag <= 0) {
        this.burstLeft = 0;
        if (it.reserve > 0) this.startReload();
        else if (!this.dryLatch) {
          ev.push({ type: 'dry' });
          this.dryLatch = true;
        }
        this.pendingClick = 0;
        break;
      }
      it.mag -= 1;
      ev.push({ type: 'shot', bloom: this.bloom });
      this.bloom = Math.min(this.cfg.maxBloom, this.bloom + this.cfg.bloomPerShot);
      this.sinceLastShot = 0;
      this.cooldown += interval;
      if (w.fireMode === 'semi') {
        this.pendingClick = 0;
        wantShot = false;
      } else if (w.fireMode === 'burst') {
        this.burstLeft -= 1;
        if (this.burstLeft <= 0) {
          this.cooldown += w.burstDelay;
          wantShot = false;
        }
      }
    }
    if (this.cooldown < 0) this.cooldown = 0;
    // Automatic reload when the magazine is emptied by the last shot.
    if (it.mag === 0 && it.reserve > 0 && !this.reloading && this.burstLeft === 0 && ev.some((e) => e.type === 'shot')) {
      this.startReload();
    }
    return ev;
  }
}
