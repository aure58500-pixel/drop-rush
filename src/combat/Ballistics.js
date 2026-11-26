// Pure ballistic helpers: spread, cone sampling, damage over distance.
import { COMBAT_CONFIG } from '../config/combatConfig.js';

const DEG = Math.PI / 180;

/**
 * Effective spread half-angle in degrees.
 * @param {object} weapon weapon config
 * @param {number} bloom extra degrees from consecutive shots
 * @param {{sprint?:boolean, airborne?:boolean, crouch?:boolean, aim?:boolean}} m
 */
export function effectiveSpread(weapon, bloom, m, cfg = COMBAT_CONFIG) {
  const k = cfg.spreadMultipliers;
  let s = weapon.spread + bloom;
  if (m.sprint) s *= k.sprint;
  if (m.airborne) s *= k.airborne;
  if (m.crouch) s *= k.crouch;
  if (m.aim) s *= k.aim;
  return s;
}

// Random direction inside a cone (uniform over the disk of angles).
export function coneDirection(dx, dy, dz, halfAngleDeg, r1, r2, out = { x: 0, y: 0, z: 0 }) {
  const angle = halfAngleDeg * DEG * Math.sqrt(r1);
  const phi = 2 * Math.PI * r2;
  // Orthonormal basis (u, v) perpendicular to d.
  let ux;
  let uy;
  let uz;
  if (Math.abs(dy) < 0.99) {
    ux = dz; uy = 0; uz = -dx; // d x up
  } else {
    ux = 0; uy = -dz; uz = dy; // d x right
  }
  const ul = Math.hypot(ux, uy, uz);
  ux /= ul; uy /= ul; uz /= ul;
  const vx = dy * uz - dz * uy;
  const vy = dz * ux - dx * uz;
  const vz = dx * uy - dy * ux;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const cp = Math.cos(phi) * s;
  const sp = Math.sin(phi) * s;
  out.x = dx * c + ux * cp + vx * sp;
  out.y = dy * c + uy * cp + vy * sp;
  out.z = dz * c + uz * cp + vz * sp;
  const l = Math.hypot(out.x, out.y, out.z);
  out.x /= l; out.y /= l; out.z /= l;
  return out;
}

// Damage of one pellet at a distance (before the headshot multiplier).
export function damageAtDistance(weapon, distance, cfg = COMBAT_CONFIG) {
  if (weapon.damageFalloff === false || !Number.isFinite(weapon.range)) return weapon.damage;
  return distance > weapon.range * cfg.falloffStart ? weapon.damage * cfg.falloffMultiplier : weapon.damage;
}

export function maxShotDistance(weapon, cfg = COMBAT_CONFIG) {
  return Number.isFinite(weapon.range) ? weapon.range : cfg.hitscanMaxDistance;
}
