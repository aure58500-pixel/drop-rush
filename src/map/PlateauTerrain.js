// Circular plateau terrain described analytically (pure JavaScript).
// Used for collisions (getHeight), rendering (PlateauMesh samples the same
// function), water rules (waterAt) and ground painting (paintAt).
//
// Angles: azimuth in degrees, 0 = north (-Z), 90 = east (+X), clockwise seen from above.
// def.terrain = {
//   radius, topY, bottomY,          // plateau edge, plateau height, height outside
//   channels: [                       // depressions (canals, chasms)
//     { type: 'ring', r0, r1, depth, bank, water?: { below, slowFactor } },
//     { type: 'sector', angle, half, r0, r1, depth, bank, water? },
//   ],
//   paint: { base: { color, cat }, rings: [{ r0, r1, color, cat }], sectors: [{ angle, half, r0, r1, color, cat }] },
// }
const DEG = Math.PI / 180;

export function azimuth(x, z) {
  return Math.atan2(x, -z);
}

export function polarToXZ(angleDeg, r) {
  const a = angleDeg * DEG;
  return [Math.sin(a) * r, -Math.cos(a) * r];
}

function angleDelta(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

export class PlateauTerrain {
  constructor(def) {
    const t = def.terrain;
    this.radius = t.radius;
    this.topY = t.topY ?? 0;
    this.bottomY = t.bottomY ?? -60;
    this.cellSize = 2; // ray marching step reference
    this.half = t.radius + 20; // square bound, kept for systems that need one
    this.channels = (t.channels || []).map((c) => ({ ...c, a: (c.angle ?? 0) * DEG, h: (c.half ?? 0) * DEG }));
    const paint = t.paint || {};
    this.paintBase = paint.base || { color: '#7cb342', cat: 'grass' };
    this.paintRings = paint.rings || [];
    this.paintSectors = (paint.sectors || []).map((s) => ({ ...s, a: s.angle * DEG, h: s.half * DEG }));
  }

  // Signed "inside" distance (meters) of a point within a channel, or -Infinity.
  _inside(c, x, z, r) {
    if (c.type === 'ring') return Math.min(r - c.r0, c.r1 - r);
    const dr = Math.min(r - c.r0, c.r1 - r);
    if (dr < 0) return dr;
    const da = (c.h - angleDelta(azimuth(x, z), c.a)) * r;
    return Math.min(dr, da);
  }

  // Depth below the plateau top and the channel responsible.
  depression(x, z) {
    const r = Math.hypot(x, z);
    let best = 0;
    let channel = null;
    for (const c of this.channels) {
      const d = this._inside(c, x, z, r);
      if (d <= 0) continue;
      const dep = c.depth * Math.min(1, d / c.bank);
      if (dep > best) {
        best = dep;
        channel = c;
      }
    }
    return { depth: best, channel };
  }

  getHeight(x, z) {
    if (x * x + z * z > this.radius * this.radius) return this.bottomY;
    return this.topY - this.depression(x, z).depth;
  }

  getNormal(x, z) {
    const e = 0.5;
    const nx = this.getHeight(x - e, z) - this.getHeight(x + e, z);
    const nz = this.getHeight(x, z - e) - this.getHeight(x, z + e);
    const ny = 2 * e;
    const l = Math.hypot(nx, ny, nz);
    return [nx / l, ny / l, nz / l];
  }

  // Water of a channel at (x, z): { level, slowFactor } or null.
  waterAt(x, z) {
    if (x * x + z * z > this.radius * this.radius) return null;
    const { depth, channel } = this.depression(x, z);
    if (!channel?.water || depth <= 0) return null;
    const level = this.topY - channel.water.below;
    if (this.topY - depth >= level) return null; // bank above the water line
    return { level, slowFactor: channel.water.slowFactor, jumpAllowance: channel.water.jumpAllowance ?? 1.6 };
  }

  // Ground paint at (x, z): { color, cat }. Channels are painted by PlateauMesh.
  paintAt(x, z) {
    const r = Math.hypot(x, z);
    let hit = this.paintBase;
    for (const p of this.paintRings) if (r >= p.r0 && r < p.r1) hit = p;
    if (this.paintSectors.length) {
      const a = azimuth(x, z);
      for (const p of this.paintSectors) if (r >= p.r0 && r < p.r1 && angleDelta(a, p.a) <= p.h) hit = p;
    }
    return hit;
  }

  // Radii and angles where the surface changes (mesh breakpoints).
  breakpoints() {
    const radii = new Set([this.radius]);
    const angles = new Set();
    for (const c of this.channels) {
      const b = Math.min(c.bank, (c.r1 - c.r0) / 2);
      [c.r0, c.r0 + b, c.r1 - b, c.r1].forEach((v) => radii.add(v));
      if (c.type === 'sector') {
        const rm = (c.r0 + c.r1) / 2;
        const bank = Math.min(c.bank / rm, c.h);
        for (const s of [-1, 1]) {
          angles.add(c.a + s * c.h);
          angles.add(c.a + s * (c.h - bank));
        }
      }
    }
    for (const p of this.paintRings) [p.r0, p.r1].forEach((v) => radii.add(v));
    for (const p of this.paintSectors) {
      [p.r0, p.r1].forEach((v) => radii.add(v));
      angles.add(p.a - p.h);
      angles.add(p.a + p.h);
    }
    return {
      radii: [...radii].filter((r) => r > 0 && r <= this.radius).sort((a, b) => a - b),
      angles: [...angles],
    };
  }
}
