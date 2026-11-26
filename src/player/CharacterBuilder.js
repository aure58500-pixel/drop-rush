// Pure JavaScript (no Three.js) builder for the chibi characters.
// A skin is a list of parts; each part is a primitive attached to a joint.
// The builder merges parts per joint into vertex-colored triangle arrays,
// so a character costs one draw call per joint and the triangle count is exact.
//
// Part spec:
//   { j: joint, s: 'ell' | 'box' | 'cone', size, p: [x, y, z], c: '#hex',
//     r?: [rx, ry, rz] (Euler XYZ), dir?: [x, y, z] (aligns the local +Y axis),
//     sc?: [sx, sy, sz] (scale before rotation), n?: roundness, seg?: [w, h], half?: true }
//   ell : superellipsoid, size = radii. n = 2 sphere, 3-4 rounded box, 6 boxy.
//         half = upper half only (caps, helmets). seg = [around, rings].
//   box : size = full [w, h, d], flat shaded.
//   cone: size = [bottomRadius, topRadius, height] along +Y, seg = [around].
import { hexToLinear } from '../core/utils/math.js';

// Skeleton shared by every skin (meters, rest pose, feet at y = 0, facing +Z).
export const JOINT_LAYOUT = {
  hips: { parent: null, pos: [0, 0.55, 0] },
  spine: { parent: 'hips', pos: [0, 0.05, 0] },
  neck: { parent: 'spine', pos: [0, 0.44, 0] },
  armL: { parent: 'spine', pos: [0.27, 0.36, 0] },
  armR: { parent: 'spine', pos: [-0.27, 0.36, 0] },
  elbowL: { parent: 'armL', pos: [0, -0.17, 0] },
  elbowR: { parent: 'armR', pos: [0, -0.17, 0] },
  legL: { parent: 'hips', pos: [0.1, -0.03, 0] },
  legR: { parent: 'hips', pos: [-0.1, -0.03, 0] },
  kneeL: { parent: 'legL', pos: [0, -0.2, 0] },
  kneeR: { parent: 'legR', pos: [0, -0.2, 0] },
  ankleL: { parent: 'kneeL', pos: [0, -0.205, 0] },
  ankleR: { parent: 'kneeR', pos: [0, -0.205, 0] },
};
export const JOINT_NAMES = Object.keys(JOINT_LAYOUT);

// Weapon socket in the right hand (child of elbowR).
export const HAND_SOCKET = { parent: 'elbowR', pos: [0, -0.2, 0.03] };

// Leg chain used by the animator to keep the feet on the ground when crouching.
export const LEG_DIMS = { offset: 0.03, thigh: 0.2, shin: 0.205, foot: 0.115 };

// Rest-pose world position of a joint (no rotation in the rest pose).
export function jointRestPosition(name) {
  const out = [0, 0, 0];
  for (let j = JOINT_LAYOUT[name]; j; j = JOINT_LAYOUT[j.parent]) {
    out[0] += j.pos[0];
    out[1] += j.pos[1];
    out[2] += j.pos[2];
  }
  return out;
}

// ---------- Primitives (indexed, local space, centered on the origin) ----------

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

function box([w, h, d]) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const faces = [
    [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]],
    [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]],
    [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]],
    [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]],
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
  ];
  const pos = [];
  const idx = [];
  for (const f of faces) {
    const b = pos.length / 3;
    for (const v of f) pos.push(...v);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { pos, idx, smooth: false };
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
  // Flat caps use their own vertices so the side stays smooth and the cap flat.
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

// Appends one part to the joint buffers.
function emitPart(part, out) {
  let prim;
  if (part.s === 'ell') prim = ellipsoid(part.size, part.n ?? 2, part.seg ?? [10, 6], Boolean(part.half));
  else if (part.s === 'box') prim = box(part.size);
  else if (part.s === 'cone') prim = cone(part.size, part.seg ?? [8]);
  else throw new Error(`Unknown character primitive: ${part.s}`);

  const sc = part.sc || [1, 1, 1];
  const m = part.dir ? alignMatrix(part.dir) : eulerMatrix(part.r || [0, 0, 0]);
  const [px, py, pz] = part.p || [0, 0, 0];
  const pos = prim.pos;
  const count = pos.length / 3;
  const world = new Float64Array(pos.length);
  for (let i = 0; i < count; i++) {
    const v = mul(m, pos[i * 3] * sc[0], pos[i * 3 + 1] * sc[1], pos[i * 3 + 2] * sc[2]);
    world[i * 3] = v[0] + px;
    world[i * 3 + 1] = v[1] + py;
    world[i * 3 + 2] = v[2] + pz;
  }

  // Outward winding (every primitive is convex around its own center).
  const fixTris = (list) => {
    for (let t = 0; t < list.length; t += 3) {
      const a = list[t] * 3; const b = list[t + 1] * 3; const c = list[t + 2] * 3;
      const ux = world[b] - world[a]; const uy = world[b + 1] - world[a + 1]; const uz = world[b + 2] - world[a + 2];
      const vx = world[c] - world[a]; const vy = world[c + 1] - world[a + 1]; const vz = world[c + 2] - world[a + 2];
      const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx;
      const cx = (world[a] + world[b] + world[c]) / 3 - px;
      const cy = (world[a + 1] + world[b + 1] + world[c + 1]) / 3 - py;
      const cz = (world[a + 2] + world[b + 2] + world[c + 2]) / 3 - pz;
      if (nx * cx + ny * cy + nz * cz < 0) {
        const tmp = list[t + 1];
        list[t + 1] = list[t + 2];
        list[t + 2] = tmp;
      }
    }
  };
  fixTris(prim.idx);
  if (prim.flatIdx) fixTris(prim.flatIdx);

  // Smooth normals: average face normals on shared vertices.
  const normals = new Float64Array(pos.length);
  const faceNormal = (a, b, c) => {
    const ux = world[b] - world[a]; const uy = world[b + 1] - world[a + 1]; const uz = world[b + 2] - world[a + 2];
    const vx = world[c] - world[a]; const vy = world[c + 1] - world[a + 1]; const vz = world[c + 2] - world[a + 2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
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

export function flattenParts(skin) {
  const groups = Array.isArray(skin.parts) ? [skin.parts] : Object.values(skin.parts);
  const list = [];
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x) list.push(x);
  };
  walk(groups);
  return list;
}

/**
 * @returns {{joints: Object<string, {positions:Float32Array, normals:Float32Array, colors:Float32Array, triangles:number}>, triangles:number}}
 */
export function buildCharacterGeometry(skin) {
  const acc = {};
  for (const name of JOINT_NAMES) acc[name] = { positions: [], normals: [], colors: [] };
  for (const part of flattenParts(skin)) {
    if (!acc[part.j]) throw new Error(`Unknown joint "${part.j}" in skin ${skin.id}`);
    emitPart(part, acc[part.j]);
  }
  const joints = {};
  let triangles = 0;
  for (const [name, a] of Object.entries(acc)) {
    const tri = a.positions.length / 9;
    triangles += tri;
    joints[name] = {
      positions: new Float32Array(a.positions),
      normals: new Float32Array(a.normals),
      colors: new Float32Array(a.colors),
      triangles: tri,
    };
  }
  return { joints, triangles };
}
