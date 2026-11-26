// Pure JavaScript (no Three.js) geometry builder shared by characters, weapons,
// builds and maps. A "part" is a primitive with a transform and a color; parts
// are merged into vertex-colored triangle arrays (one draw call per merge).
//
// Part spec:
//   { s: 'ell' | 'box' | 'cone' | 'wedge', size, p: [x, y, z], c: '#hex',
//     r?: [rx, ry, rz] (Euler XYZ), dir?: [x, y, z] (aligns local +Y),
//     yaw?: number (extra rotation around world Y, applied last),
//     sc?: [sx, sy, sz] (scale before rotation), n?: roundness, seg?: [w, h], half?: true }
//   ell  : superellipsoid, size = radii. n = 2 sphere, 3-4 rounded box, 6 boxy.
//          half = upper half only. seg = [around, rings].
//   box  : size = full [w, h, d], flat shaded.
//   cone : size = [bottomRadius, topRadius, height] along +Y, seg = [around].
//   wedge: size = full [w, h, d], solid ramp whose top rises toward local +Z.
import { hexToLinear } from '../utils/math.js';

function ellipsoid(size, n = 2, seg = [10, 6], half = false) {
  const [rx, ry, rz] = size;
  const [w, h] = seg;
  const pos = [];
  const idx = [];
  const put = (dx, dy, dz) => {
    const norm = (Math.abs(dx) ** n + Math.abs(dy) ** n + Math.abs(dz) ** n) ** (1 / n) || 1;
    pos.push((dx / norm) * rx, (dy / norm) * ry, (dz / norm) * rz);
    return pos.length / 3 - 1;
  };
  const top = put(0, 1, 0);
  const rings = half ? h : h - 1;
  const thetaMax = half ? Math.PI / 2 : Math.PI;
  const ring = [];
  for (let r = 1; r <= rings; r++) {
    const theta = (thetaMax * r) / h;
    const row = [];
    for (let k = 0; k < w; k++) {
      const phi = (2 * Math.PI * k) / w;
      row.push(put(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)));
    }
    ring.push(row);
  }
  for (let k = 0; k < w; k++) idx.push(top, ring[0][(k + 1) % w], ring[0][k]);
  for (let r = 0; r < rings - 1; r++) {
    for (let k = 0; k < w; k++) {
      const a = ring[r][k];
      const b = ring[r][(k + 1) % w];
      const c = ring[r + 1][k];
      const d = ring[r + 1][(k + 1) % w];
      idx.push(a, b, d, a, d, c);
    }
  }
  if (!half) {
    const bottom = put(0, -1, 0);
    const last = ring[rings - 1];
    for (let k = 0; k < w; k++) idx.push(bottom, last[k], last[(k + 1) % w]);
  }
  return { pos, idx, smooth: true };
}

function quads(faces) {
  const pos = [];
  const idx = [];
  for (const f of faces) {
    const b = pos.length / 3;
    for (const v of f) pos.push(...v);
    for (let i = 1; i < f.length - 1; i++) idx.push(b, b + i, b + i + 1);
  }
  return { pos, idx, smooth: false };
}

function box([w, h, d]) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  return quads([
    [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]],
    [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]],
    [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]],
    [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]],
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
  ]);
}

function wedge([w, h, d]) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  return quads([
    [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], // bottom
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], // high end (vertical)
    [[-x, -y, -z], [-x, y, z], [x, y, z], [x, -y, -z]], // slope
    [[-x, -y, -z], [-x, -y, z], [-x, y, z]],
    [[x, -y, -z], [x, y, z], [x, -y, z]],
  ]);
}

function cone([rb, rt, h], seg = [8]) {
  const s = seg[0];
  const pos = [];
  const idx = [];
  const ringAt = (r, y) => {
    const row = [];
    for (let k = 0; k < s; k++) {
      const a = (2 * Math.PI * k) / s;
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      row.push(pos.length / 3 - 1);
    }
    return row;
  };
  const bottom = ringAt(rb, -h / 2);
  if (rt > 0) {
    const top = ringAt(rt, h / 2);
    for (let k = 0; k < s; k++) {
      const n = (k + 1) % s;
      idx.push(bottom[k], bottom[n], top[n], bottom[k], top[n], top[k]);
    }
  } else {
    pos.push(0, h / 2, 0);
    const apex = pos.length / 3 - 1;
    for (let k = 0; k < s; k++) idx.push(bottom[k], bottom[(k + 1) % s], apex);
  }
  const caps = [{ y: -h / 2, r: rb }];
  if (rt > 0) caps.push({ y: h / 2, r: rt });
  const flat = [];
  for (const cap of caps) {
    const base = pos.length / 3;
    pos.push(0, cap.y, 0);
    for (let k = 0; k < s; k++) {
      const a = (2 * Math.PI * k) / s;
      pos.push(Math.cos(a) * cap.r, cap.y, Math.sin(a) * cap.r);
    }
    for (let k = 0; k < s; k++) flat.push(base, base + 1 + k, base + 1 + ((k + 1) % s));
  }
  return { pos, idx, flatIdx: flat, smooth: true };
}

const PRIMITIVES = {
  ell: (p) => ellipsoid(p.size, p.n ?? 2, p.seg ?? [10, 6], Boolean(p.half)),
  box: (p) => box(p.size),
  cone: (p) => cone(p.size, p.seg ?? [8]),
  wedge: (p) => wedge(p.size),
};

// Triangle count of a part without building it.
export function partTriangles(p) {
  if (p.s === 'box') return 12;
  if (p.s === 'wedge') return 8;
  if (p.s === 'cone') {
    const s = (p.seg ?? [8])[0];
    return p.size[1] > 0 ? 4 * s : 2 * s;
  }
  const [w, h] = p.seg ?? [10, 6];
  return p.half ? w + 2 * w * (h - 1) : 2 * w * (h - 1);
}

// ---------- Transforms ----------

function eulerMatrix([x, y, z]) {
  const a = Math.cos(x); const b = Math.sin(x);
  const c = Math.cos(y); const d = Math.sin(y);
  const e = Math.cos(z); const f = Math.sin(z);
  // R = Rx * Ry * Rz (Three.js 'XYZ' order).
  return [
    c * e, -c * f, d,
    a * f + b * e * d, a * e - b * f * d, -b * c,
    b * f - a * e * d, b * e + a * f * d, a * c,
  ];
}

// Rotation taking +Y onto `dir` (Rodrigues).
function alignMatrix(dir) {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const dx = dir[0] / l; const dy = dir[1] / l; const dz = dir[2] / l;
  let ax = dz; let az = -dx; // axis = Y x d
  const s = Math.hypot(ax, az);
  const c = dy;
  if (s < 1e-6) return c > 0 ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : [1, 0, 0, 0, -1, 0, 0, 0, -1];
  ax /= s; az /= s;
  const t = 1 - c;
  return [
    t * ax * ax + c, -az * s, t * ax * az,
    az * s, c, -ax * s,
    t * ax * az, ax * s, t * az * az + c,
  ];
}

function matMul(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  }
  return o;
}

const yawMatrix = (y) => eulerMatrix([0, y, 0]);
const mul = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];

const colorCache = new Map();
function linear(hex) {
  let v = colorCache.get(hex);
  if (!v) {
    v = hexToLinear(hex);
    colorCache.set(hex, v);
  }
  return v;
}

export function createAccumulator() {
  return { positions: [], normals: [], colors: [] };
}

// Appends one part to an accumulator.
export function emitPart(part, out) {
  const make = PRIMITIVES[part.s];
  if (!make) throw new Error(`Unknown primitive: ${part.s}`);
  const prim = make(part);
  const sc = part.sc || [1, 1, 1];
  let m = part.dir ? alignMatrix(part.dir) : eulerMatrix(part.r || [0, 0, 0]);
  if (part.yaw) m = matMul(yawMatrix(part.yaw), m);
  const [px, py, pz] = part.p || [0, 0, 0];
  const pos = prim.pos;
  const count = pos.length / 3;
  const world = new Float64Array(pos.length);
  let cx = 0; let cy = 0; let cz = 0;
  for (let i = 0; i < count; i++) {
    const v = mul(m, pos[i * 3] * sc[0], pos[i * 3 + 1] * sc[1], pos[i * 3 + 2] * sc[2]);
    world[i * 3] = v[0] + px;
    world[i * 3 + 1] = v[1] + py;
    world[i * 3 + 2] = v[2] + pz;
    cx += world[i * 3]; cy += world[i * 3 + 1]; cz += world[i * 3 + 2];
  }
  // The vertex mean is inside every (convex) primitive: use it to orient faces outward.
  cx /= count; cy /= count; cz /= count;
  const faceNormal = (a, b, c) => {
    const ux = world[b] - world[a]; const uy = world[b + 1] - world[a + 1]; const uz = world[b + 2] - world[a + 2];
    const vx = world[c] - world[a]; const vy = world[c + 1] - world[a + 1]; const vz = world[c + 2] - world[a + 2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  const fixTris = (list) => {
    for (let t = 0; t < list.length; t += 3) {
      const a = list[t] * 3; const b = list[t + 1] * 3; const c = list[t + 2] * 3;
      const n = faceNormal(a, b, c);
      const mx = (world[a] + world[b] + world[c]) / 3 - cx;
      const my = (world[a + 1] + world[b + 1] + world[c + 1]) / 3 - cy;
      const mz = (world[a + 2] + world[b + 2] + world[c + 2]) / 3 - cz;
      if (n[0] * mx + n[1] * my + n[2] * mz < 0) {
        const tmp = list[t + 1];
        list[t + 1] = list[t + 2];
        list[t + 2] = tmp;
      }
    }
  };
  fixTris(prim.idx);
  if (prim.flatIdx) fixTris(prim.flatIdx);

  const normals = new Float64Array(pos.length);
  if (prim.smooth) {
    for (let t = 0; t < prim.idx.length; t += 3) {
      const a = prim.idx[t]; const b = prim.idx[t + 1]; const c = prim.idx[t + 2];
      const n = faceNormal(a * 3, b * 3, c * 3);
      for (const v of [a, b, c]) {
        normals[v * 3] += n[0];
        normals[v * 3 + 1] += n[1];
        normals[v * 3 + 2] += n[2];
      }
    }
  }
  const rgb = linear(part.c);
  const pushTris = (list, flat) => {
    for (let t = 0; t < list.length; t += 3) {
      const fn = flat ? faceNormal(list[t] * 3, list[t + 1] * 3, list[t + 2] * 3) : null;
      for (let k = 0; k < 3; k++) {
        const v = list[t + k] * 3;
        out.positions.push(world[v], world[v + 1], world[v + 2]);
        let nx; let ny; let nz;
        if (fn) [nx, ny, nz] = fn;
        else { nx = normals[v]; ny = normals[v + 1]; nz = normals[v + 2]; }
        const l = Math.hypot(nx, ny, nz) || 1;
        out.normals.push(nx / l, ny / l, nz / l);
        out.colors.push(rgb[0], rgb[1], rgb[2]);
      }
    }
  };
  pushTris(prim.idx, !prim.smooth);
  if (prim.flatIdx) pushTris(prim.flatIdx, true);
}

export function finalizeAccumulator(acc) {
  return {
    positions: new Float32Array(acc.positions),
    normals: new Float32Array(acc.normals),
    colors: new Float32Array(acc.colors),
    triangles: acc.positions.length / 9,
  };
}

// Merges a flat list of parts.
export function buildParts(parts) {
  const acc = createAccumulator();
  for (const p of parts) emitPart(p, acc);
  return finalizeAccumulator(acc);
}

// Recursively flattens nested part lists (arrays, objects of arrays, nulls).
export function flattenParts(input) {
  const list = [];
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object' && !x.s) Object.values(x).forEach(walk);
    else if (x) list.push(x);
  };
  walk(input);
  return list;
}
