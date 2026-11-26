// Damageable characters (local player, training dummies, later remote players).
// Each target exposes a capsule body and a head sphere for hit detection.
import { distanceToVerticalCapsule, raySphere, rayVerticalCapsule } from '../core/physics/Hitboxes.js';

/**
 * Target shape:
 * {
 *   id, kind: 'player' | 'dummy',
 *   x, y, z,                       // feet position
 *   radius, height,                // body capsule
 *   headRadius,                    // head sphere radius, center at y + height - headRadius
 *   alive: boolean,
 *   applyDamage(amount, info) -> {total, died, ...}
 * }
 */
export class TargetRegistry {
  constructor() {
    this.targets = new Map();
  }

  add(target) {
    this.targets.set(target.id, target);
    return target;
  }

  remove(id) {
    this.targets.delete(id);
  }

  get(id) {
    return this.targets.get(id);
  }

  static headCenterY(t) {
    return t.y + t.height - t.headRadius * 0.9;
  }

  /**
   * Nearest target hit by the ray within maxDistance.
   * @returns {{target:object, distance:number, headshot:boolean}|null}
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDistance, ignoreId = null) {
    let best = null;
    let bestT = maxDistance;
    for (const t of this.targets.values()) {
      if (!t.alive || t.id === ignoreId) continue;
      // Cheap reject: distance from the ray to the target center line.
      const cx = t.x - ox;
      const cz = t.z - oz;
      const proj = cx * dx + cz * dz;
      if (proj < -2) continue;
      const headY = TargetRegistry.headCenterY(t);
      const th = raySphere(ox, oy, oz, dx, dy, dz, t.x, headY, t.z, t.headRadius);
      const bodyTop = headY - t.headRadius * 0.6;
      const tb = rayVerticalCapsule(ox, oy, oz, dx, dy, dz, t.x, t.y, bodyTop, t.z, t.radius);
      let tt = -1;
      let head = false;
      if (th >= 0 && (tb < 0 || th <= tb)) {
        tt = th;
        head = true;
      } else if (tb >= 0) {
        tt = tb;
      }
      if (tt >= 0 && tt < bestT) {
        bestT = tt;
        best = { target: t, distance: tt, headshot: head };
      }
    }
    return best;
  }

  // Targets within radius of a point: [{ target, distance }] (distance to the capsule surface).
  query(x, y, z, radius) {
    const out = [];
    for (const t of this.targets.values()) {
      if (!t.alive) continue;
      const d = distanceToVerticalCapsule(x, y, z, t.x, t.y, t.y + t.height, t.z, t.radius);
      if (d <= radius) out.push({ target: t, distance: d });
    }
    return out;
  }
}
