// Authoritative state of all builds: validation, colliders, health, destruction.
// Pure logic (no Three.js). Rendering and input listen through `hooks`.
// add / remove / damage take plain records, so the network layer can replay
// remote builds with exactly the same code path.
import { BUILD_CONFIG } from '../config/buildConfig.js';
import { anchorKey, getPieceShape, getSkirt, slotKeys } from './BuildGeometry.js';

export const BuildReason = Object.freeze({
  NO_TARGET: 'Visez le sol ou une construction',
  LIMIT: 'Limite de constructions atteinte',
  HEIGHT: 'Hauteur non autorisée',
  BOUNDS: 'Hors de la carte',
  OCCUPIED: 'Emplacement déjà occupé',
  PLAYER: 'Un joueur occupe l’emplacement',
  BURIED: 'Sous le sol',
  OBSTACLE: 'Obstacle sur l’emplacement',
  FAR: 'Trop loin',
});

const PLAYER_EPS = 0.06; // overlap smaller than this is ignored (standing on a piece)
const SOLID_EPS = 0.04;

function overlaps(a, b, eps) {
  return a.minX < b.maxX - eps && a.maxX > b.minX + eps
    && a.minY < b.maxY - eps && a.maxY > b.minY + eps
    && a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;
}

export class BuildingState {
  /**
   * @param {object} o
   * @param {import('../core/physics/CollisionWorld.js').CollisionWorld} o.world
   * @param {{getHeight:Function}} o.terrain
   * @param {number} o.mapHalf half size of the map in meters
   * @param {{onAdded?:Function,onRemoved?:Function,onDamaged?:Function,onDestroyed?:Function}} [o.hooks]
   */
  constructor({ world, terrain, mapHalf, config = BUILD_CONFIG, hooks = {} }) {
    this.world = world;
    this.terrain = terrain;
    this.mapHalf = mapHalf;
    this.cfg = config;
    this.hooks = hooks;
    this.builds = new Map();
    this.slots = new Map();
    this.idCounter = 0;
  }

  get count() {
    return this.builds.size;
  }

  /**
   * @param {object} c candidate {type,gx,gy,gz,rot,by}
   * @param {{player?:object, others?:object[], eye?:{x:number,y:number,z:number}}} ctx
   *        player / others: {x, y (feet), z, radius, height}
   * @returns {{ok:boolean, reason:string|null, shape:object|null}}
   */
  validate(c, ctx = {}) {
    const cfg = this.cfg;
    const fail = (reason, shape = null) => ({ ok: false, reason, shape });
    if (!c) return fail(BuildReason.NO_TARGET);
    if (this.builds.size >= cfg.maxBuilds) return fail(BuildReason.LIMIT);
    if (c.gy < 0 || c.gy > cfg.maxLevel) return fail(BuildReason.HEIGHT);

    const shape = getPieceShape(c, cfg);
    const a = shape.aabb;
    const limit = this.mapHalf - cfg.mapMargin;
    if (a.minX < -limit || a.maxX > limit || a.minZ < -limit || a.maxZ > limit) return fail(BuildReason.BOUNDS, shape);

    for (const key of slotKeys(c)) if (this.slots.has(key)) return fail(BuildReason.OCCUPIED, shape);

    for (const p of [ctx.player, ...(ctx.others || [])]) {
      if (!p) continue;
      const box = { minX: p.x - p.radius, maxX: p.x + p.radius, minY: p.y, maxY: p.y + p.height, minZ: p.z - p.radius, maxZ: p.z + p.radius };
      if (overlaps(a, box, PLAYER_EPS)) return fail(BuildReason.PLAYER, shape);
    }

    if (this.terrain && a.maxY < this.terrain.getHeight(shape.x, shape.z) - 0.05) return fail(BuildReason.BURIED, shape);

    if (ctx.eye && Math.hypot(shape.x - ctx.eye.x, shape.y - ctx.eye.y, shape.z - ctx.eye.z) > cfg.reach + cfg.gridSize) {
      return fail(BuildReason.FAR, shape);
    }

    // Static obstacles, and builds of another cluster (same-cluster builds use slots).
    const pfx = anchorKey(c.by);
    const near = this.world.query(a.minX, a.minZ, a.maxX, a.maxZ);
    for (let i = 0; i < near.length; i++) {
      const other = near[i];
      const ob = other.userData?.build;
      if (ob && anchorKey(ob.by) === pfx) continue;
      if (overlaps(a, other, SOLID_EPS)) return fail(ob ? BuildReason.OCCUPIED : BuildReason.OBSTACLE, shape);
    }
    return { ok: true, reason: null, shape };
  }

  createRecord(candidate, owner) {
    this.idCounter += 1;
    return {
      id: `${owner}-${this.idCounter.toString(36)}${Date.now().toString(36)}`,
      type: candidate.type, gx: candidate.gx, gy: candidate.gy, gz: candidate.gz, rot: candidate.rot, by: candidate.by,
      owner, health: this.cfg.pieces[candidate.type].health,
    };
  }

  // Adds a build from a record. Returns the build, the existing one if the id is known, or null if the slot is taken.
  add(rec, { animate = true } = {}) {
    const existing = this.builds.get(rec.id);
    if (existing) return existing;
    const keys = slotKeys(rec);
    for (const k of keys) if (this.slots.has(k)) return null;

    const shape = getPieceShape(rec, this.cfg);
    const skirt = getSkirt(rec, shape, this.terrain, this.cfg);
    const maxHealth = this.cfg.pieces[rec.type].health;
    const b = { ...rec, health: Math.min(rec.health ?? maxHealth, maxHealth), maxHealth, shape, skirt, keys, colliders: [] };

    const userData = { build: b };
    const solids = skirt ? [shape, skirt] : [shape];
    for (const s of solids) {
      const base = { x: s.x, y: s.y, z: s.z, hx: s.hx, hy: s.hy, hz: s.hz, tag: 'wood', userData };
      b.colliders.push(s.kind === 'ramp' ? this.world.addRamp({ ...base, yaw: s.yaw }) : this.world.addBox({ ...base, yaw: 0 }));
    }
    for (const k of keys) this.slots.set(k, b);
    this.builds.set(b.id, b);
    this.hooks.onAdded?.(b, { animate });
    return b;
  }

  remove(id) {
    const b = this.builds.get(id);
    if (!b) return null;
    for (const c of b.colliders) this.world.remove(c);
    for (const k of b.keys) this.slots.delete(k);
    this.builds.delete(id);
    this.hooks.onRemoved?.(b);
    return b;
  }

  // Applies damage. Returns { destroyed, build } or null if the build is unknown.
  damage(id, amount) {
    const b = this.builds.get(id);
    if (!b || amount <= 0) return null;
    b.health -= amount;
    if (b.health <= 0) {
      b.health = 0;
      this.remove(id);
      this.hooks.onDestroyed?.(b);
      return { destroyed: true, build: b };
    }
    this.hooks.onDamaged?.(b);
    return { destroyed: false, build: b };
  }

  // Damage from a world raycast hit (hitscan weapons, projectiles).
  damageFromHit(hit, amount) {
    const b = hit?.collider?.userData?.build;
    return b ? this.damage(b.id, amount) : null;
  }

  // Area damage decreasing linearly with the distance to the piece.
  explode(x, y, z, radius, maxDamage) {
    const results = [];
    for (const b of [...this.builds.values()]) {
      const a = b.shape.aabb;
      const dx = Math.max(a.minX - x, 0, x - a.maxX);
      const dy = Math.max(a.minY - y, 0, y - a.maxY);
      const dz = Math.max(a.minZ - z, 0, z - a.maxZ);
      const d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      const result = this.damage(b.id, maxDamage * (1 - d / radius));
      if (result) results.push(result);
    }
    return results;
  }

  clear() {
    for (const id of [...this.builds.keys()]) this.remove(id);
  }

  toRecord(b) {
    return { type: b.type, gx: b.gx, gy: b.gy, gz: b.gz, rot: b.rot, by: b.by, owner: b.owner, health: b.health };
  }
}
