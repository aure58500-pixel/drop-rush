// Geometry of the plateau (pure JavaScript): top surface on a polar grid
// aligned with every ring and sector edge, cliff skirt (sea maps) or rocky
// underside (floating maps), and the canal water surfaces.
import { hexToLinear } from '../core/utils/math.js';
import { mulberry32, deriveSeed } from '../core/utils/random.js';

const TAU = Math.PI * 2;

function uniq(sorted, eps) {
  const out = [];
  for (const v of sorted) if (!out.length || v - out[out.length - 1] > eps) out.push(v);
  return out;
}

function pushTri(acc, a, b, c, rgb, up = true) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  let l = Math.hypot(nx, ny, nz);
  if (l < 1e-9) return;
  let p1 = b; let p2 = c;
  if (up && ny < 0) { nx = -nx; ny = -ny; nz = -nz; p1 = c; p2 = b; }
  l = Math.hypot(nx, ny, nz);
  for (const v of [a, p1, p2]) {
    acc.positions.push(v[0], v[1], v[2]);
    acc.normals.push(nx / l, ny / l, nz / l);
    acc.colors.push(rgb[0], rgb[1], rgb[2]);
  }
}

const finalize = (acc) => ({
  positions: new Float32Array(acc.positions),
  normals: new Float32Array(acc.normals),
  colors: new Float32Array(acc.colors),
  triangles: acc.positions.length / 9,
});

const cache = new Map();
const lin = (hex) => {
  if (!cache.has(hex)) cache.set(hex, hexToLinear(hex));
  return cache.get(hex);
};

export function buildPlateauArrays(terrain, def) {
  const { radii: br, angles: ba } = terrain.breakpoints();
  const R = terrain.radius;
  const step = def.terrain.radialStep ?? 8;
  const radii = [];
  for (let r = 4; r < R; r += step) radii.push(r);
  const allRadii = uniq([...radii, ...br, R].sort((a, b) => a - b), 0.25);
  const segments = def.terrain.segments ?? 144;
  const angles = [];
  for (let k = 0; k < segments; k++) angles.push((TAU * k) / segments);
  for (const a of ba) angles.push(((a % TAU) + TAU) % TAU);
  const allAngles = uniq(angles.sort((a, b) => a - b), 0.002);
  const n = allAngles.length;
  const rng = mulberry32(deriveSeed(def.seed, 'ground'));
  const variation = new Float32Array(allRadii.length * n * 2).map(() => 0.95 + rng() * 0.08);

  const P = (r, a) => {
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    return [x, terrain.getHeight(x * 0.99999, z * 0.99999), z];
  };
  const bedColor = def.palette?.channelBed || '#7f8794';
  const bankColor = def.palette?.channelBank || '#a7a29a';
  const colorAt = (x, z, k) => {
    const dep = terrain.depression(x, z).depth;
    const base = dep > 0.05 ? lin(dep > 1.2 ? bedColor : bankColor) : lin(terrain.paintAt(x, z).color);
    const v = variation[k % variation.length];
    return [base[0] * v, base[1] * v, base[2] * v];
  };

  const top = { positions: [], normals: [], colors: [] };
  const grid = allRadii.map((r) => allAngles.map((a) => P(r, a)));
  const center = [0, terrain.getHeight(0, 0), 0];
  for (let j = 0; j < n; j++) {
    const a = grid[0][j];
    const b = grid[0][(j + 1) % n];
    pushTri(top, center, a, b, colorAt((a[0] + b[0]) / 3, (a[2] + b[2]) / 3, j));
  }
  let k = 0;
  for (let i = 0; i < allRadii.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = grid[i][j];
      const b = grid[i][(j + 1) % n];
      const c = grid[i + 1][(j + 1) % n];
      const d = grid[i + 1][j];
      const mx = (a[0] + b[0] + c[0] + d[0]) / 4;
      const mz = (a[2] + b[2] + c[2] + d[2]) / 4;
      const col = colorAt(mx, mz, k++);
      pushTri(top, a, b, c, col);
      pushTri(top, a, c, d, col);
    }
  }

  // Cliff skirt or floating underside: rings shrinking inward (never outside the collision radius).
  const cliff = { positions: [], normals: [], colors: [] };
  const cfg = def.cliff || {};
  const colors = (cfg.colors || ['#8a7f74', '#766b61', '#62584f']).map(lin);
  const segs = 96;
  const jitter = mulberry32(deriveSeed(def.seed, 'cliff'));
  const rows = cfg.style === 'floating'
    ? [[1, terrain.topY], [0.985, terrain.topY - 3], [0.9, terrain.topY - 14], [0.7, terrain.topY - 32], [0.4, cfg.bottom ?? -60], [0.05, (cfg.bottom ?? -60) - 25]]
    : [[1, terrain.topY], [0.992, terrain.topY - 5], [0.982, terrain.topY - 12], [0.975, cfg.bottom ?? -22]];
  const ring = rows.map(([f, y], ri) => Array.from({ length: segs }, (_, s) => {
    const a = (TAU * s) / segs;
    const jr = ri === 0 ? 0 : (jitter() - 0.5) * (cfg.style === 'floating' ? 6 : 3);
    const r = R * f - (ri === 0 ? 0 : Math.abs(jr));
    return [Math.sin(a) * r, y + (ri === 0 ? -0.02 : (jitter() - 0.5) * 2), -Math.cos(a) * r];
  }));
  for (let ri = 0; ri < ring.length - 1; ri++) {
    for (let s = 0; s < segs; s++) {
      const a = ring[ri][s]; const b = ring[ri][(s + 1) % segs];
      const c = ring[ri + 1][(s + 1) % segs]; const d = ring[ri + 1][s];
      const col = colors[(ri + s) % colors.length];
      // Outward facing: orient against the axis.
      emitOutward(cliff, a, b, c, col);
      emitOutward(cliff, a, c, d, col);
    }
  }

  // Canal water surfaces (one flat polar patch per water channel).
  const water = { positions: [], normals: [], colors: [] };
  const wcol = lin(def.palette?.water || '#3fa9f5');
  for (const ch of terrain.channels) {
    if (!ch.water) continue;
    const y = terrain.topY - ch.water.below;
    const a0 = ch.type === 'ring' ? 0 : ch.a - ch.h;
    const a1 = ch.type === 'ring' ? TAU : ch.a + ch.h;
    const na = ch.type === 'ring' ? 72 : 6;
    const nr = 4;
    for (let i = 0; i < nr; i++) {
      for (let j = 0; j < na; j++) {
        const r0 = ch.r0 + ((ch.r1 - ch.r0) * i) / nr;
        const r1 = ch.r0 + ((ch.r1 - ch.r0) * (i + 1)) / nr;
        const t0 = a0 + ((a1 - a0) * j) / na;
        const t1 = a0 + ((a1 - a0) * (j + 1)) / na;
        const q = (r, t) => [Math.sin(t) * r, y, -Math.cos(t) * r];
        pushTri(water, q(r0, t0), q(r0, t1), q(r1, t1), wcol);
        pushTri(water, q(r0, t0), q(r1, t1), q(r1, t0), wcol);
      }
    }
  }
  return { top: finalize(top), cliff: finalize(cliff), water: finalize(water) };
}

function emitOutward(acc, a, b, c, rgb) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3;
  const mz = (a[2] + b[2] + c[2]) / 3;
  let p1 = b; let p2 = c;
  if (nx * mx + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; p1 = c; p2 = b; }
  const l = Math.hypot(nx, ny, nz) || 1;
  for (const v of [a, p1, p2]) {
    acc.positions.push(v[0], v[1], v[2]);
    acc.normals.push(nx / l, ny / l, nz / l);
    acc.colors.push(rgb[0], rgb[1], rgb[2]);
  }
}
