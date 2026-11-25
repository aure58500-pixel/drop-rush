// Training dummies (static targets with health + shield) and turrets that
// shoot back, so damage, shield, healing and the damage indicator can be
// tested without other players.
import * as THREE from 'three';
import { TRAINING_CONFIG } from '../config/combatConfig.js';
import { Health } from './Health.js';
import { faceted } from '../map/geometryUtils.js';

const HEIGHT = 1.8;
const RADIUS = 0.38;
const HEAD = 0.17;

export const TURRET_WEAPON = {
  id: 'turret', name: 'Tourelle', category: 'heavy',
  damage: TRAINING_CONFIG.turret.damage, range: TRAINING_CONFIG.turret.range,
  spread: TRAINING_CONFIG.turret.spread, pellets: 1, headshotMultiplier: 1, damageFalloff: false,
};

function box(w, h, d) {
  return faceted(new THREE.BoxGeometry(w, h, d));
}

function buildModel(kind) {
  const g = new THREE.Group();
  const turret = kind === 'turret';
  const main = new THREE.MeshLambertMaterial({ color: turret ? '#e63946' : '#f4a261' });
  const white = new THREE.MeshLambertMaterial({ color: '#f8f4e3' });
  const dark = new THREE.MeshLambertMaterial({ color: '#3d3d3d' });
  const wood = new THREE.MeshLambertMaterial({ color: '#8a5a32' });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(box(0.7, 0.08, 0.7), dark, 0, 0.04, 0);
  add(box(0.12, 0.75, 0.12), wood, 0, 0.45, 0);
  const pivot = new THREE.Group();
  pivot.position.y = 0.8;
  g.add(pivot);
  const torso = new THREE.Mesh(box(0.62, 0.7, 0.32), main);
  torso.position.set(0, 0.35, 0);
  torso.castShadow = true;
  pivot.add(torso);
  const ring = new THREE.Mesh(box(0.34, 0.34, 0.04), white);
  ring.position.set(0, 0.38, 0.17);
  pivot.add(ring);
  const bull = new THREE.Mesh(box(0.14, 0.14, 0.05), main);
  bull.position.set(0, 0.38, 0.18);
  pivot.add(bull);
  const head = new THREE.Mesh(faceted(new THREE.IcosahedronGeometry(HEAD, 1)), turret ? dark : white);
  head.position.set(0, 0.83, 0);
  head.castShadow = true;
  pivot.add(head);
  let barrel = null;
  if (turret) {
    barrel = new THREE.Mesh(box(0.08, 0.08, 0.45), dark);
    barrel.position.set(0.22, 0.45, 0.3);
    pivot.add(barrel);
    const eye = new THREE.Mesh(box(0.2, 0.05, 0.04), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    eye.position.set(0, 0.85, HEAD - 0.01);
    pivot.add(eye);
  }
  return { group: g, pivot, materials: [main], barrel };
}

function buildBar() {
  const group = new THREE.Group();
  const mk = (w, h, color, z) => {
    const geo = new THREE.PlaneGeometry(w, h).translate(w / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, depthTest: true, fog: false }));
    m.position.set(-w / 2, 0, z);
    group.add(m);
    return m;
  };
  mk(0.84, 0.2, '#14182e', 0);
  const shield = mk(0.78, 0.06, '#4cc9f0', 0.001);
  shield.position.y = 0.045;
  const health = mk(0.78, 0.06, '#80ed99', 0.001);
  health.position.y = -0.04;
  group.renderOrder = 4;
  return { group, health, shield };
}

class Dummy {
  constructor(def, index, { scene, world, terrain }) {
    this.kind = def.kind || 'dummy';
    this.def = def;
    this.world = world;
    this.id = `${this.kind}-${index}`;
    this.name = this.kind === 'turret' ? 'Tourelle' : `Mannequin ${index + 1}`;
    this.x = def.x;
    this.z = def.z;
    this.y = terrain.getHeight(def.x, def.z);
    this.yaw = ((def.yaw || 0) * Math.PI) / 180;
    this.radius = RADIUS;
    this.height = HEIGHT;
    this.headRadius = HEAD;
    this.shieldMax = def.shield || 0;
    this.health = new Health({ maxHealth: TRAINING_CONFIG.dummyHealth, maxShield: 100, shield: this.shieldMax });
    this.alive = true;
    this.respawnTimer = 0;
    this.fall = 0;
    this.flash = 0;
    this.fireTimer = 0;
    this.acquired = 0;

    const model = buildModel(this.kind);
    this.model = model;
    model.group.position.set(this.x, this.y, this.z);
    model.group.rotation.y = this.yaw;
    scene.add(model.group);
    this.bar = buildBar();
    this.bar.group.position.set(this.x, this.y + 2.15, this.z);
    scene.add(this.bar.group);
    this._addCollider();
    this._refreshBar();
  }

  _addCollider() {
    this.collider = this.world.addCylinder({
      x: this.x, z: this.z, radius: this.radius, y0: this.y, y1: this.y + this.height,
      tag: 'wood', userData: { character: true, dummy: this },
    });
  }

  applyDamage(amount, info) {
    const r = this.health.applyDamage(amount);
    this.flash = 0.12;
    if (r.died) {
      this.alive = false;
      this.respawnTimer = TRAINING_CONFIG.dummyRespawnDelay;
      this.world.remove(this.collider);
      this.collider = null;
    }
    this._refreshBar();
    this.lastAttacker = info?.ownerId;
    return r;
  }

  _refreshBar() {
    const h = this.health;
    this.bar.health.scale.x = Math.max(0.001, h.health / h.maxHealth);
    this.bar.shield.scale.x = Math.max(0.001, h.shield / h.maxShield);
    this.bar.shield.visible = h.shield > 0;
    this.bar.group.visible = this.alive;
  }

  respawn() {
    this.alive = true;
    this.health.reset(TRAINING_CONFIG.dummyHealth, this.shieldMax);
    this.fall = 0;
    this.acquired = 0;
    this._addCollider();
    this._refreshBar();
  }

  // Barrel tip in world space (barrel at local x 0.22, y 1.25, tip at z 0.55).
  muzzle() {
    const yaw = this.model.group.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lx = 0.22;
    const lz = 0.55;
    return { x: this.x + lx * c + lz * s, y: this.y + 1.25, z: this.z - lx * s + lz * c };
  }

  update(dt, camera) {
    if (!this.alive) {
      this.fall = Math.min(1, this.fall + dt * 4);
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
    } else {
      this.fall = Math.max(0, this.fall - dt * 6);
    }
    this.model.pivot.rotation.x = -this.fall * 1.45;
    this.flash = Math.max(0, this.flash - dt);
    for (const m of this.model.materials) m.emissive.setScalar(this.flash > 0 ? 0.6 : 0);
    if (this.bar.group.visible) this.bar.group.quaternion.copy(camera.quaternion);
  }
}

export class TrainingDummies {
  constructor(defs, { scene, world, terrain, targets, combat, audio }) {
    this.targets = targets;
    this.combat = combat;
    this.audio = audio;
    this.world = world;
    this.list = (defs || []).map((d, i) => new Dummy(d, i, { scene, world, terrain }));
    for (const d of this.list) targets.add(d);
  }

  update(dt, camera, player) {
    for (const d of this.list) {
      d.update(dt, camera);
      if (d.kind === 'turret' && d.alive) this._turret(d, dt, player);
    }
  }

  _turret(d, dt, player) {
    const cfg = TRAINING_CONFIG.turret;
    const chestY = player ? player.y + player.height * 0.6 : 0;
    const dx = player ? player.x - d.x : 0;
    const dz = player ? player.z - d.z : 0;
    const dist = Math.hypot(dx, dz);
    let canSee = false;
    if (player && player.alive && dist < cfg.range) {
      const ox = d.x;
      const oy = d.y + 1.5;
      const oz = d.z;
      const lx = player.x - ox;
      const ly = chestY - oy;
      const lz = player.z - oz;
      const len = Math.hypot(lx, ly, lz) || 1;
      const hit = this.world.raycast(ox, oy, oz, lx / len, ly / len, lz / len, len, { filter: (c) => !c.userData?.character });
      canSee = !hit;
    }
    if (!canSee) {
      d.acquired = 0;
      return;
    }
    // Turn toward the player.
    const targetYaw = Math.atan2(dx, dz);
    let delta = targetYaw - d.model.group.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    d.model.group.rotation.y += delta * Math.min(1, dt * 6);
    d.acquired += dt;
    if (d.acquired < cfg.windup) return;
    d.fireTimer -= dt;
    if (d.fireTimer > 0) return;
    d.fireTimer = cfg.interval;
    const m = d.muzzle();
    const dx2 = player.x - m.x;
    const dy2 = chestY - m.y;
    const dz2 = player.z - m.z;
    const l = Math.hypot(dx2, dy2, dz2) || 1;
    const dir = { x: dx2 / l, y: dy2 / l, z: dz2 / l };
    this.combat.fire({ ownerId: d.id, weapon: TURRET_WEAPON, origin: m, muzzle: m, dir, spread: cfg.spread });
    this.combat.hooks.onShot?.({ weapon: TURRET_WEAPON, muzzle: m, dir, ownerId: d.id });
  }

  reset() {
    for (const d of this.list) {
      if (!d.alive) d.respawn();
      else {
        d.health.reset(TRAINING_CONFIG.dummyHealth, d.shieldMax);
        d._refreshBar();
      }
    }
  }
}
