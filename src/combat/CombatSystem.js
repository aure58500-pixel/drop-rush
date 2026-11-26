// Resolves shots and projectiles against the world, the builds and the targets.
// Pure logic: visuals and sounds are requested through `hooks`.
// The shooter's client computes hits; targets apply damage (network-ready).
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { coneDirection, damageAtDistance, maxShotDistance } from './Ballistics.js';
import { TargetRegistry } from './TargetRegistry.js';

const EPS = 0.02;

function surfaceOf(hit) {
  if (!hit) return null;
  if (hit.terrain) return 'terrain';
  if (hit.collider?.userData?.build) return 'build';
  return hit.collider?.tag || 'stone';
}

// Character colliders exist for movement only; shots use the hitboxes instead.
const notCharacter = (c) => !c.userData?.character;

export class CombatSystem {
  /**
   * @param {object} o
   * @param {import('../core/physics/CollisionWorld.js').CollisionWorld} o.world
   * @param {TargetRegistry} o.targets
   * @param {object} o.building BuildingSystem-like ({ damageFromHit, damageBuild, explode })
   * @param {number} o.mapHalf projectiles beyond this distance on X or Z are removed
   * @param {object} [o.hooks] onTracer, onImpact, onTargetHit, onExplosion, onProjectileSpawn,
   *                           onProjectileMove, onProjectileEnd, onArrowStuck
   * @param {() => number} [o.random]
   */
  constructor({ world, targets, building, mapHalf, hooks = {}, random = Math.random, cfg = COMBAT_CONFIG }) {
    this.world = world;
    this.targets = targets;
    this.building = building;
    this.mapHalf = mapHalf;
    this.hooks = hooks;
    this.random = random;
    this.cfg = cfg;
    this.projectiles = [];
    this.nextProjectileId = 1;
    this._dir = { x: 0, y: 0, z: 0 };
  }

  /**
   * One trigger pull: hitscan pellets or a projectile.
   * @param {{ownerId:string, weapon:object, origin:{x,y,z}, muzzle:{x,y,z}, dir:{x,y,z}, spread:number}} shot
   * @returns {{hits:Array, damageByTarget:Map}}
   */
  fire(shot) {
    if (shot.weapon.projectile) return this._spawnProjectile(shot);
    return this._hitscan(shot);
  }

  _hitscan({ ownerId, weapon, origin, muzzle, dir, spread }) {
    const maxDist = maxShotDistance(weapon, this.cfg);
    const pellets = weapon.pellets || 1;
    const perTarget = new Map();
    const perBuild = new Map();
    const hits = [];
    for (let i = 0; i < pellets; i++) {
      const d = coneDirection(dir.x, dir.y, dir.z, spread, this.random(), this.random(), this._dir);
      const wh = this.world.raycast(origin.x, origin.y, origin.z, d.x, d.y, d.z, maxDist, { filter: notCharacter });
      const limit = wh ? wh.distance : maxDist;
      const th = this.targets.raycast(origin.x, origin.y, origin.z, d.x, d.y, d.z, limit, ownerId);
      let end;
      if (th) {
        end = { x: origin.x + d.x * th.distance, y: origin.y + d.y * th.distance, z: origin.z + d.z * th.distance };
        const mult = th.headshot ? (weapon.headshotMultiplier ?? 2) : 1;
        const dmg = damageAtDistance(weapon, th.distance, this.cfg) * mult;
        const acc = perTarget.get(th.target) || { damage: 0, headshot: false, point: end };
        acc.damage += dmg;
        acc.headshot = acc.headshot || th.headshot;
        perTarget.set(th.target, acc);
        hits.push({ kind: 'target', target: th.target, point: end, headshot: th.headshot });
        this.hooks.onImpact?.(end, { x: -d.x, y: -d.y, z: -d.z }, 'flesh');
      } else if (wh) {
        end = { x: wh.x, y: wh.y, z: wh.z };
        const surface = surfaceOf(wh);
        if (surface === 'build') {
          const b = wh.collider.userData.build;
          const acc = perBuild.get(b.id) || { damage: 0 };
          acc.damage += damageAtDistance(weapon, wh.distance, this.cfg);
          perBuild.set(b.id, acc);
        }
        hits.push({ kind: surface, point: end });
        this.hooks.onImpact?.(end, { x: wh.nx, y: wh.ny, z: wh.nz }, surface);
      } else {
        end = { x: origin.x + d.x * maxDist, y: origin.y + d.y * maxDist, z: origin.z + d.z * maxDist };
      }
      this.hooks.onTracer?.(muzzle, end, weapon);
    }
    for (const [target, acc] of perTarget) this._damageTarget(target, acc.damage, { ownerId, weapon, headshot: acc.headshot, point: acc.point, source: origin });
    for (const [id, acc] of perBuild) this.building?.damageBuild(id, acc.damage);
    return { hits, damageByTarget: perTarget };
  }

  _damageTarget(target, amount, info) {
    if (!target.alive || amount <= 0) return null;
    const result = target.applyDamage(Math.round(amount), info);
    this.hooks.onTargetHit?.(target, result, info);
    return result;
  }

  _spawnProjectile({ ownerId, weapon, origin, muzzle, dir, spread }) {
    const p = weapon.projectile;
    const d = coneDirection(dir.x, dir.y, dir.z, spread, this.random(), this.random(), { x: 0, y: 0, z: 0 });
    // Start at the eye (no shooting through a wall the muzzle pokes into), drawn from the muzzle.
    const proj = {
      id: this.nextProjectileId++,
      ownerId,
      weapon,
      kind: p.kind,
      x: origin.x, y: origin.y, z: origin.z,
      vx: d.x * p.speed, vy: d.y * p.speed, vz: d.z * p.speed,
      gravity: p.gravity || 0,
      traveled: 0,
      life: 0,
      visual: { x: muzzle.x, y: muzzle.y, z: muzzle.z },
    };
    this.projectiles.push(proj);
    this.hooks.onProjectileSpawn?.(proj);
    return { hits: [], damageByTarget: new Map(), projectile: proj };
  }

  update(dt) {
    const list = this.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (this._stepProjectile(p, dt)) {
        list.splice(i, 1);
        this.hooks.onProjectileEnd?.(p);
      }
    }
  }

  // Returns true when the projectile is finished.
  _stepProjectile(p, dt) {
    p.life += dt;
    p.vy -= p.gravity * dt;
    const sx = p.vx * dt;
    const sy = p.vy * dt;
    const sz = p.vz * dt;
    const len = Math.hypot(sx, sy, sz);
    if (len < 1e-6) return p.life > this.cfg.projectileMaxLifetime;
    const dx = sx / len;
    const dy = sy / len;
    const dz = sz / len;

    const wh = this.world.raycast(p.x, p.y, p.z, dx, dy, dz, len, { filter: notCharacter });
    const limit = wh ? wh.distance : len;
    const th = this.targets.raycast(p.x, p.y, p.z, dx, dy, dz, limit, p.ownerId);

    // The drawn projectile converges from the muzzle onto the real path.
    const k = Math.min(1, dt * 12);
    const nx = p.x + sx;
    const ny = p.y + sy;
    const nz = p.z + sz;
    p.visual.x += (nx - p.visual.x) * k + sx * (1 - k);
    p.visual.y += (ny - p.visual.y) * k + sy * (1 - k);
    p.visual.z += (nz - p.visual.z) * k + sz * (1 - k);

    if (th || wh) {
      const t = th ? th.distance : wh.distance;
      const hx = p.x + dx * t;
      const hy = p.y + dy * t;
      const hz = p.z + dz * t;
      p.traveled += t;
      const point = { x: hx, y: hy, z: hz };
      const w = p.weapon;
      if (p.kind === 'rocket') {
        let directTarget = null;
        let directBuild = null;
        if (th) {
          directTarget = th.target;
          this._damageTarget(th.target, w.damage, { ownerId: p.ownerId, weapon: w, headshot: false, point, source: point });
        } else if (surfaceOf(wh) === 'build') {
          directBuild = wh.collider.userData.build.id;
          this.building?.damageBuild(directBuild, w.damage);
        }
        const n = wh && !th ? { x: wh.nx, y: wh.ny, z: wh.nz } : { x: -dx, y: -dy, z: -dz };
        this.explode(point, n, w, p.ownerId, { directTarget, directBuild });
      } else {
        // Arrow: damage with headshot and falloff, then stick into the surface.
        if (th) {
          const mult = th.headshot ? (w.headshotMultiplier ?? 2) : 1;
          this._damageTarget(th.target, damageAtDistance(w, p.traveled, this.cfg) * mult, { ownerId: p.ownerId, weapon: w, headshot: th.headshot, point, source: point });
          this.hooks.onImpact?.(point, { x: -dx, y: -dy, z: -dz }, 'flesh');
        } else {
          const surface = surfaceOf(wh);
          if (surface === 'build') this.building?.damageBuild(wh.collider.userData.build.id, damageAtDistance(w, p.traveled, this.cfg));
          this.hooks.onImpact?.(point, { x: wh.nx, y: wh.ny, z: wh.nz }, surface);
          this.hooks.onArrowStuck?.(point, { x: dx, y: dy, z: dz }, {
            buildId: surface === 'build' ? wh.collider.userData.build.id : null,
          });
        }
      }
      p.x = hx; p.y = hy; p.z = hz;
      return true;
    }

    p.x = nx; p.y = ny; p.z = nz;
    p.traveled += len;
    this.hooks.onProjectileMove?.(p);
    const outOfMap = Math.abs(p.x) > this.mapHalf || Math.abs(p.z) > this.mapHalf || p.y < -50;
    const outOfRange = Number.isFinite(p.weapon.range) && p.traveled > p.weapon.range;
    return outOfMap || outOfRange || p.life > this.cfg.projectileMaxLifetime;
  }

  /**
   * Area damage, linear from `damage` at the center to 0 at `radius`. Characters
   * behind a solid obstacle are protected; builds are always damaged.
   */
  explode(point, normal, weapon, ownerId, { directTarget = null, directBuild = null } = {}) {
    const e = weapon.explosion;
    if (!e) return;
    // Move the center slightly off the surface so line-of-sight tests start in the open.
    const cx = point.x + normal.x * 0.25;
    const cy = point.y + normal.y * 0.25;
    const cz = point.z + normal.z * 0.25;
    for (const { target, distance } of this.targets.query(cx, cy, cz, e.radius)) {
      if (target === directTarget) continue;
      if (target.id === ownerId && !e.selfDamage) continue;
      const ty = target.y + target.height * 0.5;
      const lx = target.x - cx;
      const ly = ty - cy;
      const lz = target.z - cz;
      const l = Math.hypot(lx, ly, lz);
      if (l > 0.3) {
        const block = this.world.raycast(cx, cy, cz, lx / l, ly / l, lz / l, l - target.radius, { filter: notCharacter });
        if (block) continue;
      }
      const dmg = e.damage * (1 - distance / e.radius);
      this._damageTarget(target, dmg, { ownerId, weapon, headshot: false, point: { x: target.x, y: ty, z: target.z }, source: point, explosion: true });
    }
    if (this.building) {
      // Splash on builds (the directly hit build already took the direct damage).
      for (const b of [...this.building.state.builds.values()]) {
        if (b.id === directBuild) continue;
        const a = b.shape.aabb;
        const dx = Math.max(a.minX - cx, 0, cx - a.maxX);
        const dy = Math.max(a.minY - cy, 0, cy - a.maxY);
        const dz = Math.max(a.minZ - cz, 0, cz - a.maxZ);
        const d = Math.hypot(dx, dy, dz);
        if (d <= e.radius) this.building.damageBuild(b.id, e.damage * (1 - d / e.radius));
      }
    }
    this.hooks.onExplosion?.({ x: cx, y: cy, z: cz }, e.radius);
  }

  clear() {
    for (const p of this.projectiles) this.hooks.onProjectileEnd?.(p);
    this.projectiles.length = 0;
  }
}

export { TargetRegistry };
