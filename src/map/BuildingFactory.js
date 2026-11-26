// Procedural generators for every map structure. A generator receives the
// shared StructureList, its data entry and a context ({ terrain }), and writes
// shapes (colliders = what is drawn), decor parts, instanced props, loot spots
// and walking routes (used to check that every roof and floor can be reached).
//
// Placement: entry { x, z } in meters, or { angle, radius } (azimuth in degrees,
// 0 = north). Orientation: `facing` = azimuth (degrees) the front faces, or
// 'center' to face the map center. The front of a structure is its local +Z.
import { Placement } from './StructureBuilder.js';
import { azimuth, polarToXZ } from './PlateauTerrain.js';

const DEG = Math.PI / 180;
const FLOOR = 3;
const SLAB = 0.25;
const BASE = 0.15; // foundation top above the ground
const WALL = 0.3;
const STAIR_W = 1.3;
const STAIR_RUN = (FLOOR / 0.25) * 0.3; // 3.6 m per flight

export function entryPosition(e) {
  if (e.radius !== undefined) return polarToXZ(e.angle ?? 0, e.radius);
  return [e.x ?? 0, e.z ?? 0];
}

export function entryYaw(e, x, z) {
  if (e.facing === 'center') return -azimuth(x, z);
  if (e.facing === 'out') return Math.PI - azimuth(x, z);
  if (typeof e.facing === 'number') return Math.PI - e.facing * DEG;
  return 0;
}

function placementFor(list, e, ctx, yOffset = 0) {
  const [x, z] = entryPosition(e);
  const base = e.y ?? ctx.terrain.getHeight(x, z);
  return new Placement(list, x, base + yOffset, z, entryYaw(e, x, z));
}

// ---------- Decorative parts (PartBuilder specs) ----------
const ell = (size, p, c, o = {}) => ({ s: 'ell', size, p, c, ...o });
const box = (size, p, c, o = {}) => ({ s: 'box', size, p, c, ...o });
const cone = (size, p, c, o = {}) => ({ s: 'cone', size, p, c, ...o });

export function crownParts(scale, y, { gold = '#f5b82e', gem = '#e63946', gem2 = '#4cc9f0' } = {}) {
  const s = scale;
  const parts = [
    cone([1.0 * s, 1.1 * s, 0.7 * s], [0, y + 0.35 * s, 0], gold, { seg: [10] }),
    cone([1.12 * s, 1.12 * s, 0.14 * s], [0, y + 0.07 * s, 0], '#d99a1e', { seg: [10] }),
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const px = Math.sin(a) * 1.0 * s;
    const pz = Math.cos(a) * 1.0 * s;
    parts.push(cone([0.3 * s, 0, 0.75 * s], [px, y + 1.05 * s, pz], gold, { seg: [4] }));
    parts.push(ell([0.13 * s, 0.13 * s, 0.13 * s], [px, y + 1.45 * s, pz], gold, { seg: [6, 3] }));
    parts.push(ell([0.13 * s, 0.15 * s, 0.08 * s], [Math.sin(a) * 1.07 * s, y + 0.38 * s, Math.cos(a) * 1.07 * s], k % 2 ? gem2 : gem, { seg: [6, 3], yaw: a }));
  }
  return parts;
}

function clockParts(y, z, r) {
  return [
    cone([r * 1.15, r * 1.15, 0.12], [0, y, z], '#3d2c1e', { seg: [12], r: [Math.PI / 2, 0, 0] }),
    cone([r, r, 0.16], [0, y, z + 0.02], '#fdfaf0', { seg: [12], r: [Math.PI / 2, 0, 0] }),
    box([0.12, r * 0.75, 0.05], [0, y + r * 0.3, z + 0.12], '#222222'),
    box([r * 0.55, 0.1, 0.05], [r * 0.22, y, z + 0.12], '#222222'),
  ];
}

function wallBanner(p, x, y, z, color = '#7b2ff7') {
  p.part(box([1.3, 2.4, 0.06], [x, y, z], color));
  p.part(box([0.7, 0.16, 0.08], [x, y - 0.1, z + 0.01], '#ffffff'));
  for (const dx of [-0.25, 0, 0.25]) p.part(cone([0.1, 0, 0.3], [x + dx, y + 0.1, z + 0.01], '#ffffff', { seg: [3], sc: [1, 1, 0.4] }));
}

// ---------- Buildings ----------

const BLOCK_COLORS = {
  wall: '#f2cc8f', trim: '#f8f4e3', roof: '#6c757d', floor: '#a47148', stairs: '#8d6e63',
  foundation: '#8d8a83', accent: '#3d5a80', parapet: '#e9e2d0',
};

/**
 * City building: `floors` levels of 3 m, interior stairs between every floor
 * and up to the flat roof, real door and window openings.
 * Options: w, d (>= 7), floors, colors, roof ('flat' | 'heliport' | 'none'),
 * door (width), banner, clock, waterTower, sign, ac (rooftop units).
 */
export function createBlock(list, e, ctx) {
  const c = { ...BLOCK_COLORS, ...e.colors };
  const W = Math.max(7, e.w ?? 10);
  const D = Math.max(7, e.d ?? 8);
  const floors = e.floors ?? 2;
  const hw = W / 2;
  const hd = D / 2;
  const t = WALL;
  const p = placementFor(list, e, ctx);
  const doorW = e.door ?? 1.8;

  p.box(-hw - 0.25, -0.8, -hd - 0.25, hw + 0.25, BASE, hd + 0.25, c.foundation);
  const zStart = hd - t - 1.2;
  const zEnd = zStart - STAIR_RUN;
  const col = (k) => (k % 2 === 0 ? -hw + t + STAIR_W / 2 : hw - t - STAIR_W / 2);
  const yTop = BASE + floors * FLOOR;

  // Window openings and their instanced frames.
  const windowsAlong = (length, exclude) => {
    const n = Math.max(1, Math.floor((length - 1.5) / 3));
    const out = [];
    for (let i = 0; i < n; i++) {
      const cpos = -length / 2 + (length / n) * (i + 0.5);
      if (exclude && Math.abs(cpos) < exclude) continue;
      out.push(cpos);
    }
    return out;
  };
  const win = (center) => ({ center, width: 1.2, bottom: 1.0, top: 2.2 });

  for (let f = 0; f < floors; f++) {
    const y0 = BASE + f * FLOOR;
    const front = windowsAlong(W, f === 0 ? doorW / 2 + 1.0 : 0);
    const back = windowsAlong(W, 0);
    const side = windowsAlong(D - 2 * t, 0);
    const frontOpen = front.map(win);
    if (f === 0) frontOpen.push({ center: 0, width: doorW, bottom: 0, top: 2.5 });
    p.wall('x', hd - t / 2, -hw, hw, y0, FLOOR, t, frontOpen, c.wall);
    p.wall('x', -hd + t / 2, -hw, hw, y0, FLOOR, t, back.map(win), c.wall);
    p.wall('z', -hw + t / 2, -hd + t, hd - t, y0, FLOOR, t, side.map(win), c.wall);
    p.wall('z', hw - t / 2, -hd + t, hd - t, y0, FLOOR, t, side.map(win), c.wall);
    for (const cx of front) p.instance('window', cx, y0 + 1.6, hd + 0.02, 0);
    for (const cx of back) p.instance('window', cx, y0 + 1.6, -hd - 0.02, Math.PI);
    for (const cz of side) {
      p.instance('window', hw + 0.02, y0 + 1.6, cz, Math.PI / 2);
      p.instance('window', -hw - 0.02, y0 + 1.6, cz, -Math.PI / 2);
    }
    // Floor trim band between levels.
    if (f > 0) p.box(-hw - 0.06, y0 - 0.18, -hd - 0.06, hw + 0.06, y0, hd + 0.06, c.trim, { collide: false });

    if (f > 0) slabWithHole(p, hw, hd, t, y0, col(f - 1), zStart, zEnd, c);
    else p.box(-hw + t, BASE - 0.02, -hd + t, hw - t, BASE + 0.01, hd - t, c.floor, { collide: false });
    p.stairs(col(f), STAIR_W, zStart, -1, y0, FLOOR, c.stairs, { material: 'wood' });
    p.loot(hw * 0.35, y0 + 0.05, -hd + t + 1.1);
  }

  // Roof with the last stairwell, parapet and rooftop details.
  slabWithHole(p, hw, hd, t, yTop, col(floors - 1), zStart, zEnd, { ...c, floor: c.roof });
  // Optional exterior stairs along the +X side, from the ground to the roof.
  let ext = null;
  if (e.exteriorStairs) {
    const sx = hw + 0.25 + 0.75;
    const zs = hd - 0.4;
    const ze = p.stairs(sx, 1.5, zs, -1, 0, yTop, c.stairs, { material: 'metal' });
    p.box(sx - 0.75, 0, ze - 1.4, sx + 0.75, yTop, ze, c.stairs, { material: 'metal' });
    p.box(sx + 0.7, yTop, ze - 1.4, sx + 0.8, yTop + 1.0, zs, c.trim, { material: 'metal' });
    ext = { sx, zs, ze, z0: ze - 1.4 };
  }
  if (e.roof !== 'none') {
    const ph = 0.7;
    p.box(-hw, yTop, hd - 0.25, hw, yTop + ph, hd, c.parapet);
    p.box(-hw, yTop, -hd, hw, yTop + ph, -hd + 0.25, c.parapet);
    p.box(-hw, yTop, -hd + 0.25, -hw + 0.25, yTop + ph, hd - 0.25, c.parapet);
    if (ext) {
      // Opening in the +X parapet where the exterior stairs arrive.
      p.box(hw - 0.25, yTop, -hd + 0.25, hw, yTop + ph, ext.z0, c.parapet);
      p.box(hw - 0.25, yTop, ext.ze, hw, yTop + ph, hd - 0.25, c.parapet);
    } else {
      p.box(hw - 0.25, yTop, -hd + 0.25, hw, yTop + ph, hd - 0.25, c.parapet);
    }
  }
  if (e.roof === 'heliport') {
    const r = Math.min(hw, hd) - 0.9;
    p.part(cone([r, r, 0.04], [hw * 0.2, yTop + 0.02, -hd * 0.15], '#ffd166', { seg: [20] }));
    p.part(cone([r - 0.4, r - 0.4, 0.05], [hw * 0.2, yTop + 0.025, -hd * 0.15], '#3b3f4a', { seg: [20] }));
    const hx = hw * 0.2;
    const hz = -hd * 0.15;
    p.part(box([0.4, 0.03, r * 0.9], [hx - r * 0.3, yTop + 0.05, hz], '#ffffff'));
    p.part(box([0.4, 0.03, r * 0.9], [hx + r * 0.3, yTop + 0.05, hz], '#ffffff'));
    p.part(box([r * 0.6, 0.03, 0.4], [hx, yTop + 0.05, hz], '#ffffff'));
  } else if (e.ac !== false && e.roof !== 'none') {
    p.box(hw - 2.0, yTop, -hd + 0.6, hw - 0.6, yTop + 0.9, -hd + 2.0, '#cfd4da', { material: 'metal' });
    p.part(cone([0.45, 0.45, 0.06], [hw - 1.3, yTop + 0.93, -hd + 1.3], '#6c757d', { seg: [8] }));
  }
  if (e.roof !== 'none') p.loot(hw * 0.3, yTop + 0.05, hd * 0.25, false);

  // Front details.
  if (e.awning !== false) p.part(box([doorW + 1.2, 0.12, 1.2], [0, 2.75, hd + 0.6], c.accent));
  if (e.banner) wallBanner(p, -hw * 0.55, yTop - 1.8, hd + 0.06, e.banner === true ? '#7b2ff7' : e.banner);
  if (e.clock) for (const part of clockParts(yTop - 1.3, hd + 0.08, 1.0)) p.part(part);
  if (e.waterTower) waterTower(p, hw * 0.25, yTop, -hd * 0.3);

  // Walking route: door -> every flight -> roof.
  const pts = [[0, 0, hd + 2.5], [0, BASE, hd - 1.0]];
  for (let f = 0; f < floors; f++) {
    const y = BASE + f * FLOOR;
    if (f > 0) pts.push([0, y, zEnd - 0.45], [0, y, zStart + 0.5]);
    pts.push([col(f), y, zStart + 0.5], [col(f), y + FLOOR, zEnd - 0.45]);
  }
  pts.push([0, yTop, zEnd - 0.45]);
  p.route(`${e.name || e.type}`, pts, yTop);
  if (ext) {
    const zm = (ext.z0 + ext.ze) / 2;
    p.route(`${e.name || e.type} (escalier extérieur)`, [[ext.sx, 0, hd + 2], [ext.sx, 0, ext.zs + 0.5], [ext.sx, yTop, zm], [hw - 1.5, yTop, zm]], yTop);
  }
  list.labels.push({ name: e.name || e.type, type: 'building', floors });
  return { p, hw, hd, yTop };
}

// Floor slab at height y (top) with the stairwell opening above the stairs in column cx.
function slabWithHole(p, hw, hd, t, y, cx, zStart, zEnd, c) {
  const left = cx < 0;
  const extra = 0.6;
  const hx0 = cx - STAIR_W / 2 - (left ? 0 : extra);
  const hx1 = cx + STAIR_W / 2 + (left ? extra : 0);
  const hz0 = zEnd;
  const hz1 = zStart - 0.2;
  const ix0 = -hw + t; const ix1 = hw - t; const iz0 = -hd + t; const iz1 = hd - t;
  const sy = y - SLAB;
  p.box(ix0, sy, iz0, ix1, y, hz0, c.floor, { material: 'wood' });
  p.box(ix0, sy, hz1, ix1, y, iz1, c.floor, { material: 'wood' });
  p.box(ix0, sy, hz0, hx0, y, hz1, c.floor, { material: 'wood' });
  p.box(hx1, sy, hz0, ix1, y, hz1, c.floor, { material: 'wood' });
  // Rail along the open side of the stairwell.
  const railX = left ? hx1 : hx0;
  p.box(railX - 0.05, y, hz0, railX + 0.05, y + 1.0, hz1, c.trim, { material: 'wood' });
}

function waterTower(p, x, y, z) {
  const h = 3.6;
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
    p.box(x + dx - 0.15, y, z + dz - 0.15, x + dx + 0.15, y + h, z + dz + 0.15, '#6b3b2a', { material: 'wood' });
  }
  p.part(box([3.6, 0.15, 0.15], [x, y + 1.8, z - 1.6], '#6b3b2a'));
  p.part(box([3.6, 0.15, 0.15], [x, y + 1.8, z + 1.6], '#6b3b2a'));
  p.part(cone([2.6, 2.6, 3.4], [x, y + h + 1.7, z], '#d62828', { seg: [12] }));
  p.part(cone([2.7, 2.7, 0.2], [x, y + h + 0.6, z], '#a4161a', { seg: [12] }));
  p.part(cone([2.7, 2.7, 0.2], [x, y + h + 2.8, z], '#a4161a', { seg: [12] }));
  p.part(cone([2.8, 0.3, 1.2], [x, y + h + 4.0, z], '#a4161a', { seg: [12] }));
  // White crown painted on the tank (front).
  p.part(box([1.6, 0.35, 0.06], [x, y + h + 1.3, z + 2.62], '#ffffff'));
  for (const dx of [-0.6, 0, 0.6]) p.part(cone([0.25, 0, 0.6], [x + dx, y + h + 1.75, z + 2.62], '#ffffff', { seg: [3], sc: [1, 1, 0.2] }));
  p.cyl(x, z, 2.6, y + h, y + h + 3.4);
}

export function createTower(list, e, ctx) {
  const floors = e.floors ?? 4;
  const res = createBlock(list, {
    ...e, w: 7, d: 7, floors, roof: 'none', ac: false, awning: false,
    colors: { wall: '#e5e5e5', trim: '#9aa5b1', roof: '#adb5bd', ...e.colors },
  }, ctx);
  const { p, hw, hd, yTop } = res;
  // Control cabin: overhanging deck, railing, glass band, canopy (canopy = decor roof) and antenna.
  const o = 1.4;
  // Overhanging deck around the shaft (the roof slab already covers the shaft itself).
  for (const [x0, z0, x1, z1] of [[-hw - o, hd, hw + o, hd + o], [-hw - o, -hd - o, hw + o, -hd], [-hw - o, -hd, -hw, hd], [hw, -hd, hw + o, hd]]) {
    p.box(x0, yTop - 0.35, z0, x1, yTop, z1, '#adb5bd', { material: 'metal' });
  }
  const g = '#7fd1ff';
  p.box(-hw - o, yTop, hd + o - 0.15, hw + o, yTop + 1.1, hd + o, g, { material: 'metal' });
  p.box(-hw - o, yTop, -hd - o, hw + o, yTop + 1.1, -hd - o + 0.15, g, { material: 'metal' });
  p.box(-hw - o, yTop, -hd - o + 0.15, -hw - o + 0.15, yTop + 1.1, hd + o - 0.15, g, { material: 'metal' });
  p.box(hw + o - 0.15, yTop, -hd - o + 0.15, hw + o, yTop + 1.1, hd + o - 0.15, g, { material: 'metal' });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (hw + o - 0.25);
    const z = sz * (hd + o - 0.25);
    p.box(x - 0.15, yTop, z - 0.15, x + 0.15, yTop + 3.0, z + 0.15, '#495057', { material: 'metal' });
  }
  p.part(box([2 * (hw + o) + 0.6, 0.4, 2 * (hd + o) + 0.6], [0, yTop + 3.2, 0], '#343a40'));
  p.part(box([0.25, 4.5, 0.25], [1.2, yTop + 5.6, -0.8], '#adb5bd'));
  p.part(ell([0.9, 0.2, 0.9], [-1.4, yTop + 3.7, 1.0], '#dee2e6', { seg: [8, 3], r: [0.6, 0, 0] }));
  wallBanner(p, 0, yTop - 3.2, hd + 0.06);
  list.labels[list.labels.length - 1].type = 'tower';
  return res;
}

export function createBurger(list, e, ctx) {
  const res = createBlock(list, {
    ...e, w: e.w ?? 14, d: e.d ?? 10, floors: 1, door: 3, ac: false, awning: false,
    colors: { wall: '#f8f1e5', trim: '#e63946', roof: '#c9ada7', floor: '#b08968', accent: '#e63946', parapet: '#e63946', ...e.colors },
  }, ctx);
  const { p, hw, hd, yTop } = res;
  // Striped awning over the front.
  for (let i = 0; i < 8; i++) {
    const x = -hw + (W8(hw) * (i + 0.5));
    p.part(box([W8(hw), 0.12, 1.6], [x, 2.85, hd + 0.8], i % 2 ? '#ffffff' : '#e63946', { r: [0.25, 0, 0] }));
  }
  // Counter and stools inside.
  p.box(-hw + 2.5, BASE, -hd + 1.2, hw - 1.2, BASE + 1.1, -hd + 2.0, '#e63946');
  p.box(-hw + 2.5, BASE + 1.1, -hd + 1.1, hw - 1.2, BASE + 1.2, -hd + 2.1, '#f8f1e5');
  for (const x of [-1.5, 1.5, 4.0]) p.box(x - 0.6, BASE, 0.4, x + 0.6, BASE + 0.75, 1.6, '#8d6e63', { material: 'wood' });
  // Giant burger on the roof (solid).
  const bx = hw * 0.4;
  const bz = -hd * 0.1;
  const y = yTop;
  p.part(ell([2.6, 0.55, 2.6], [bx, y + 0.55, bz], '#d4892f', { n: 2.4, seg: [12, 4] }));
  p.part(cone([2.8, 2.8, 0.25], [bx, y + 1.15, bz], '#5ab031', { seg: [12] }));
  p.part(cone([2.65, 2.65, 0.55], [bx, y + 1.5, bz], '#6d3b22', { seg: [12] }));
  p.part(box([4.6, 0.12, 4.6], [bx, y + 1.85, bz], '#ffc93c', { yaw: 0.5 }));
  p.part(ell([2.7, 1.1, 2.7], [bx, y + 2.0, bz], '#e09a3e', { n: 2.2, seg: [12, 5], half: true }));
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05;
    p.part(ell([0.12, 0.05, 0.2], [bx + Math.sin(a) * 1.4, y + 2.85, bz + Math.cos(a) * 1.4], '#fff3d6', { seg: [5, 2], yaw: a }));
  }
  p.cyl(bx, bz, 2.6, y, y + 3.1);
  // Terrace tables with parasols (decor).
  for (let i = -2; i <= 2; i++) p.instance('parasolTable', i * 2.8, 0, hd + 4.5, 0);
  list.labels[list.labels.length - 1].type = 'burger';
  return res;
}

function W8(hw) {
  return (2 * hw) / 8;
}

export function createHangar(list, e, ctx) {
  const W = e.w ?? 24;
  const D = e.d ?? 16;
  const H = e.h ?? 8;
  const hw = W / 2;
  const hd = D / 2;
  const t = 0.4;
  const c = { wall: '#c0392b', trim: '#f2f2f2', roof: '#7a2a22', floor: '#9a9a92', metal: '#6c757d', ...e.colors };
  const p = placementFor(list, e, ctx);
  p.box(-hw - 0.3, -0.8, -hd - 0.3, hw + 0.3, BASE, hd + 0.3, c.floor);
  const y0 = BASE;
  const high = (center) => ({ center, width: 2.2, bottom: 4.6, top: 6.2 });
  p.wall('x', hd - t / 2, -hw, hw, y0, H, t, [{ center: 0, width: 10, bottom: 0, top: 6 }, high(-hw + 3), high(hw - 3)], c.wall, 'metal');
  p.wall('x', -hd + t / 2, -hw, hw, y0, H, t, [{ center: -hw + 3, width: 1.6, bottom: 0, top: 2.5 }, high(-3), high(3)], c.wall, 'metal');
  p.wall('z', -hw + t / 2, -hd + t, hd - t, y0, H, t, [high(2), high(-3)], c.wall, 'metal');
  p.wall('z', hw - t / 2, -hd + t, hd - t, y0, H, t, [high(-3)], c.wall, 'metal');
  // White frame around the big door.
  p.part(box([10.6, 0.5, 0.5], [0, y0 + 6.25, hd + 0.05], c.trim));
  p.part(box([0.5, 6, 0.5], [-5.25, y0 + 3, hd + 0.05], c.trim));
  p.part(box([0.5, 6, 0.5], [5.25, y0 + 3, hd + 0.05], c.trim));
  // Flat roof with parapet (gap at the stair landing).
  const yTop = y0 + H + 0.3;
  p.box(-hw - 0.3, y0 + H, -hd - 0.3, hw + 0.3, yTop, hd + 0.3, c.roof, { material: 'metal' });
  p.box(-hw - 0.3, yTop, hd, hw + 0.3, yTop + 0.7, hd + 0.3, c.trim);
  p.box(-hw - 0.3, yTop, -hd - 0.3, hw + 0.3, yTop + 0.7, -hd, c.trim);
  p.box(-hw - 0.3, yTop, -hd, -hw, yTop + 0.7, hd, c.trim);
  // Exterior stairs along the +X side up to the roof.
  const sx = hw + 0.3 + 0.8;
  const zStart = hd - 0.6;
  const zEnd = p.stairs(sx, 1.6, zStart, -1, 0, yTop, c.metal, { material: 'metal' });
  p.box(sx - 0.8, 0, zEnd - 1.6, sx + 0.8, yTop, zEnd, c.metal, { material: 'metal' });
  p.box(hw, yTop, -hd, hw + 0.3, yTop + 0.7, zEnd - 1.6, c.trim);
  p.box(hw, yTop, zEnd, hw + 0.3, yTop + 0.7, hd, c.trim);
  // Satellite dish and crates.
  p.part(ell([1.4, 0.35, 1.4], [-hw + 3, yTop + 1.6, -hd + 3], '#dee2e6', { seg: [10, 3], r: [0.7, 0, 0] }));
  p.box(-hw + 2.7, yTop, -hd + 2.7, -hw + 3.3, yTop + 1.2, -hd + 3.3, '#6c757d', { material: 'metal' });
  p.instance('crate', -hw + 3, BASE, -hd + 3);
  p.instance('crate', -hw + 4.4, BASE, -hd + 3.2, 0.3);
  p.instance('crate', -hw + 3.6, BASE + 1.2, -hd + 3.1, 0.6);
  p.box(4, BASE, -3, 10.1, BASE + 2.6, -0.56, '#2a9d8f', { material: 'metal' });
  p.loot(0, BASE + 0.05, 0);
  p.loot(-6, BASE + 0.05, 4);
  p.loot(-2, yTop + 0.05, 0, false);
  if (e.banner) wallBanner(p, hw * 0.65, 5, hd + 0.08);
  p.route(e.name || 'hangar', [[sx, 0, hd + 2], [sx, 0, zStart + 0.5], [sx, yTop, zEnd - 0.8], [hw - 2, yTop, zEnd - 0.8], [0, yTop, 0]], yTop);
  list.labels.push({ name: e.name || 'hangar', type: 'hangar' });
}

const CONTAINER_COLORS = ['#2d6cdf', '#e63946', '#f4a261', '#2a9d8f', '#8338ec', '#6c757d'];

// Stacks of shipping containers. Every stack has metal stairs up to its top.
export function createContainers(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const L = 6.1;
  const H = 2.6;
  const Wd = 2.44;
  (e.stacks || []).forEach(([dx, dz, levels, colorIndex], i) => {
    for (let l = 0; l < levels; l++) {
      const color = CONTAINER_COLORS[(colorIndex + l) % CONTAINER_COLORS.length];
      p.box(dx - L / 2, l * H, dz - Wd / 2, dx + L / 2, (l + 1) * H, dz + Wd / 2, color, { material: 'metal' });
      for (const s of [-1, 1]) p.part(box([L - 0.6, 0.12, 0.05], [dx, l * H + H - 0.3, dz + s * (Wd / 2 + 0.02)], '#f1f1f1'));
      p.part(box([0.05, H - 0.2, Wd - 0.2], [dx + L / 2 + 0.02, l * H + H / 2, dz], '#d9d9d9'));
    }
    // Stairs along the +Z side, climbing toward -X.
    const zc = dz + Wd / 2 + 0.75;
    const top = levels * H;
    const xEnd = p.stairsX(zc, 1.5, dx + L / 2 + 0.2, -1, 0, top, '#495057', { material: 'metal' });
    p.box(xEnd - 1.0, 0, zc - 0.75, xEnd, top, zc + 0.75, '#495057', { material: 'metal' });
    p.loot(dx, top + 0.05, dz, false);
    p.route(`${e.name || 'conteneurs'} ${i + 1}`, [[dx + L / 2 + 0.6, 0, zc + 2.2], [dx + L / 2 + 0.6, 0, zc], [xEnd - 0.5, top, zc], [xEnd + 0.6, top, dz], [dx, top, dz]], top);
  });
  list.labels.push({ name: e.name || 'conteneurs', type: 'containers' });
}

export function createCrane(list, e, ctx) {
  const p = placementFor(list, e, ctx, e.yOffset ?? 0);
  const H = e.h ?? 28;
  const collide = e.collide !== false;
  const yellow = '#ffc300';
  if (collide) {
    p.box(-2, 0, -2, 2, 1, 2, '#8d8a83');
    p.box(-0.8, 1, -0.8, 0.8, H, 0.8, yellow, { material: 'metal' });
  } else {
    p.part(box([4, 1, 4], [0, 0.5, 0], '#8d8a83'));
    p.part(box([1.6, H - 1, 1.6], [0, (H + 1) / 2, 0], yellow));
  }
  // Lattice stripes, cab, jib, counter-jib, trolley, cable and container (decor).
  for (let y = 2; y < H - 1; y += 2.2) p.part(box([1.7, 0.12, 1.7], [0, y, 0], '#c79a00', { r: [0, 0, 0.6] }));
  p.part(box([2.2, 2, 2.2], [0, H + 1, 0], yellow));
  p.part(box([1.6, 1.2, 0.1], [0, H + 1.2, 1.12], '#7fd1ff'));
  p.part(box([1.2, 1.0, 24], [0, H + 2.4, 10], yellow));
  p.part(box([1.2, 1.0, 9], [0, H + 2.4, -5.5], yellow));
  p.part(box([2.2, 2.0, 2.4], [0, H + 1.6, -9.0], '#6c757d'));
  p.part(cone([0.1, 0.3, 4.5], [0, H + 4.8, 0], '#c79a00', { seg: [4] }));
  p.part(box([0.08, 9, 0.08], [0, H - 2.4, 18], '#222222'));
  p.part(box([2.44, 2.6, 6.1], [0, H - 8.2, 18], e.cargoColor || '#2d6cdf'));
  list.labels.push({ name: e.name || 'grue', type: 'crane' });
}

// ---------- Plazas, monuments, bridges ----------

export function createFountain(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const R = e.r ?? 7;
  const segs = 20;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const len = ((2 * Math.PI * R) / segs) * 1.05;
    const q = new Placement(list, ...p.point(Math.sin(a) * R, 0, Math.cos(a) * R), a + p.yaw);
    q.box(-len / 2, 0, -0.3, len / 2, 0.65, 0.3, e.stone || '#c8c3bb');
  }
  p.part(cone([R - 0.2, R - 0.2, 0.08], [0, 0.42, 0], '#3fa9f5', { seg: [20] }), { water: true });
  p.part(cone([1.3, 0.9, 2.4], [0, 1.2, 0], e.stone || '#c8c3bb', { seg: [10] }));
  p.part(cone([2.3, 2.3, 0.3], [0, 2.45, 0], e.accent || '#7b2ff7', { seg: [12] }));
  p.cyl(0, 0, 1.3, 0, 2.6);
  for (const part of crownParts(e.crownScale ?? 1.4, 2.6)) p.part(part);
  // Water jets around the crown.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    p.part(cone([0.12, 0.05, 1.4], [Math.sin(a) * 3.2, 1.1, Math.cos(a) * 3.2], '#bde9ff', { seg: [5], dir: [Math.sin(a) * 0.3, 1, Math.cos(a) * 0.3] }), { water: true });
  }
  p.loot(R + 2.0, 0.05, 0, false);
  list.labels.push({ name: e.name || 'fontaine', type: 'fountain' });
}

export function createCrownPlinth(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  p.cyl(0, 0, 5.2, 0, 0.4);
  p.cyl(0, 0, 3.6, 0, 1.6);
  p.part(cone([5.2, 5.2, 0.4], [0, 0.2, 0], '#d6d0c4', { seg: [18] }));
  p.part(cone([3.6, 3.6, 1.2], [0, 1.0, 0], '#7b2ff7', { seg: [16] }));
  p.part(cone([3.8, 3.8, 0.12], [0, 1.62, 0], '#f5b82e', { seg: [16] }));
  for (const part of crownParts(1.9, 1.6)) p.part(part);
  p.cyl(0, 0, 2.2, 1.6, 4.8);
  list.labels.push({ name: e.name || 'couronne', type: 'monument' });
}

/**
 * Straight bridge along a radius: angle (deg), r0, r1 (meters from the map center).
 * Options: width, deckColor, railColor, banners, arrows, piers.
 */
export function createBridge(list, e, ctx) {
  const rm = (e.r0 + e.r1) / 2;
  const L = e.r1 - e.r0;
  const [x, z] = polarToXZ(e.angle, rm);
  const yaw = Math.PI - e.angle * DEG; // local +Z points away from the center
  const top = (e.deckTop ?? 0.3) + ctx.terrain.topY;
  const p = new Placement(list, x, top, z, yaw);
  const w = e.width ?? 7;
  const deck = e.deckColor || '#7b2ff7';
  const rail = e.railColor || '#ffc300';
  p.box(-w / 2, -0.6, -L / 2, w / 2, 0, L / 2, deck);
  p.box(-w / 2, 0, -L / 2, -w / 2 + 0.25, 1.0, L / 2, rail, { material: 'metal' });
  p.box(w / 2 - 0.25, 0, -L / 2, w / 2, 1.0, L / 2, rail, { material: 'metal' });
  p.part(box([w + 0.2, 0.25, L], [0, -0.7, 0], '#4a1d96'));
  if (e.arrows !== false) for (let s = -L / 2 + 3; s <= L / 2 - 3; s += 5) p.instance('arrow', 0, 0, s, 0);
  if (e.banners) for (let s = -L / 2 + 2; s <= L / 2 - 2; s += 8) {
    p.instance('banner', -w / 2 - 0.35, -0.6, s, Math.PI);
    p.instance('banner', w / 2 + 0.35, -0.6, s, 0);
  }
  if (e.piers) for (const s of [-L / 4, L / 4]) p.part(box([w * 0.6, 40, 2.2], [0, -20.6, s], '#5a4a7a'));
  p.route(e.name || 'pont', [[0, -top, -L / 2 - 3], [0, 0, 0], [0, -top, L / 2 + 3]], 0);
  list.routes[list.routes.length - 1].mode = 'reach';
  list.labels.push({ name: e.name || 'pont', type: 'bridge' });
}

// Ancient ruins: two platforms reached by stairs and a wooden ramp, arches, columns, broken walls.
export function createRuins(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const stone = '#a7a29a';
  const dark = '#8f8a82';
  const moss = '#6a994e';
  // Platform A (3 m) with front stairs and a wooden ramp.
  p.box(-5, 0, -4, 5, 3, 4, stone);
  p.part(box([10.2, 0.2, 8.2], [0, 3.05, 0], moss));
  p.stairs(-3, 2, 7.6, -1, 0, 3, dark);
  p.ramp(1.5, 0, 4, 4.5, 3, 10, '#b5793d', { dir: -1, material: 'wood' });
  // Platform B (6 m) reached from A by stairs over a support wall.
  p.box(2.5, 0, -12.6, 7.5, 6, -7.6, stone);
  p.part(box([5.2, 0.2, 5.2], [5, 6.05, -10.1], moss));
  p.box(3.5, 0, -7.6, 5.5, 3, -4, dark);
  p.stairs(4.5, 2, -4, -1, 3, 3, dark);
  // Arches.
  for (const az of [6, -2]) {
    p.box(-11.6 - 0.5, 0, az - 0.5, -11.6 + 0.5, 5, az + 0.5, stone);
    p.box(-8.4 - 0.5, 0, az - 0.5, -8.4 + 0.5, 5, az + 0.5, stone);
    p.box(-12.2, 5, az - 0.55, -7.8, 6, az + 0.55, dark);
  }
  // Columns (some broken) and broken walls.
  [[-15, 9, 4.5], [-15, 3, 2.2], [-15, -3, 3.6], [-15, -9, 1.6], [-5, 11, 3.2], [8, 9, 2.0]].forEach(([cx, cz, h]) => {
    p.box(cx - 0.55, 0, cz - 0.55, cx + 0.55, h, cz + 0.55, stone);
    p.part(box([1.3, 0.3, 1.3], [cx, h + 0.15, cz], dark));
  });
  [[-4, -14, 2.8], [-2, -14, 1.8], [0, -14, 3.4], [-6, -14, 2.2], [-8, -14, 1.2]].forEach(([wx, wz, h]) => {
    p.box(wx - 1, 0, wz - 0.4, wx + 1, h, wz + 0.4, stone);
  });
  [[10, -2, 2.5], [10, 0, 1.4], [10, 2, 3.0]].forEach(([wx, wz, h]) => p.box(wx - 0.4, 0, wz - 1, wx + 0.4, h, wz + 1, stone));
  // Scattered blocks (instanced).
  [[-6, 14], [3, 13], [12, 6], [12, -9], [-12, -12], [-18, 0], [0, -17], [-9, 13], [14, 12], [6, 15]].forEach(([bx, bz], i) => p.instance('ruinBlock', bx, 0, bz, i * 0.7));
  p.loot(0, 3.05, 0, false);
  p.loot(5, 6.05, -10.1, false);
  p.loot(-10, 0.05, 2, false);
  p.route(`${e.name || 'ruines'} escalier`, [[-3, 0, 10], [-3, 0, 8.0], [-3, 3, 3.4], [3.5, 3, 0], [4.5, 3, -3.5], [4.5, 6, -8.2], [5, 6, -10]], 6);
  p.route(`${e.name || 'ruines'} rampe`, [[3, 0, 12], [3, 0, 10.4], [3, 3, 3.4], [0, 3, 0]], 3);
  list.labels.push({ name: e.name || 'ruines', type: 'ruins' });
}

// Ring wall (map limit) with a gap for the south gate.
export function createPerimeterWall(list, e, ctx) {
  const R = e.r;
  const segs = e.segments ?? 120;
  const gap = (e.gapWidth ?? 16) / R / 2;
  const gapA = (e.gapAngle ?? 180) * DEG;
  const top = ctx.terrain.topY;
  const len = ((2 * Math.PI * R) / segs) * 1.03;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    let d = Math.abs(a - gapA) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < gap) continue;
    const [x, z] = polarToXZ(a / DEG, R);
    const p = new Placement(list, x, top, z, -a);
    p.box(-len / 2, -0.5, -1, len / 2, e.h ?? 6, 1, e.color || '#5b5d9e');
    p.part(box([len, 0.5, 2.4], [0, (e.h ?? 6) + 0.25, 0], e.capColor || '#7a7cc0'));
    if (i % 2 === 0) p.instance('wallLight', 0, 3, 1.06, 0);
  }
  list.labels.push({ name: 'mur d’enceinte', type: 'wall' });
}

// Open gate (yellow and black) on the south gap, with a short causeway outside.
export function createGate(list, e, ctx) {
  const [x, z] = polarToXZ(e.angle ?? 180, e.r);
  const p = new Placement(list, x, ctx.terrain.topY, z, Math.PI - (e.angle ?? 180) * DEG);
  const half = (e.width ?? 16) / 2;
  const y = '#ffc300';
  const k = '#1b1b1b';
  for (const s of [-1, 1]) {
    const px = s * (half - 0.8);
    p.box(px - 0.8, 0, -1.2, px + 0.8, 7.2, 1.2, y, { material: 'metal' });
    for (let h = 0.6; h < 7; h += 1.2) p.part(box([1.66, 0.4, 2.46], [px, h, 0], k));
    // Open grille door folded against the wall (inside).
    p.box(px - s * 0.8 - (s > 0 ? 5 : 0), 0, -1.6, px - s * 0.8 + (s > 0 ? 0 : 5), 5, -1.45, '#3a3a3a', { material: 'metal' });
    p.part(box([1.3, 2.6, 0.06], [px - s * 2.2, 5.2, 1.3], '#7b2ff7'));
    p.part(box([0.7, 0.16, 0.08], [px - s * 2.2, 5.3, 1.34], '#ffffff'));
  }
  p.part(box([2 * half, 0.9, 1.6], [0, 7.6, 0], k));
  for (let xx = -half + 1; xx < half; xx += 2) p.part(box([1, 0.92, 1.62], [xx, 7.6, 0], y));
  // Causeway outside the wall, ending with a railing above the cliff.
  const L = e.causeway ?? 14;
  p.box(-half + 1.6, -0.6, 1.2, half - 1.6, 0.05, 1.2 + L, '#9a8f86');
  p.box(-half + 1.6, 0.05, 1.2, -half + 1.85, 1.1, 1.2 + L, y, { material: 'metal' });
  p.box(half - 1.85, 0.05, 1.2, half - 1.6, 1.1, 1.2 + L, y, { material: 'metal' });
  p.box(-half + 1.6, 0.05, 1.2 + L - 0.25, half - 1.6, 1.1, 1.2 + L, y, { material: 'metal' });
  p.route(e.name || 'porte', [[0, 0, -6], [0, 0, 0], [0, 0.05, 1.2 + L - 1.5]], 0.05);
  list.routes[list.routes.length - 1].mode = 'reach';
  list.labels.push({ name: e.name || 'porte', type: 'gate' });
}

// Trampoline: walking onto it launches the player (see LocalPlayer).
export function createTrampoline(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const R = e.r ?? 2.2;
  p.cyl(0, 0, R, 0, 0.4, { userData: { trampoline: { height: e.height ?? 4, push: e.push ?? 6 } } });
  p.part(ell([R, 0.22, R], [0, 0.2, 0], e.color || '#b44dff', { n: 6, seg: [16, 3] }));
  p.part(cone([R - 0.35, R - 0.35, 0.06], [0, 0.41, 0], '#2b1d4a', { seg: [16] }));
  p.part(cone([R - 0.9, R - 0.9, 0.07], [0, 0.415, 0], '#5a2ea6', { seg: [16] }));
  list.labels.push({ name: 'trampoline', type: 'trampoline' });
}

// Pink and white striped tube lying on the ground (decor, no collision).
export function createTubes(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const n = e.segments ?? 8;
  const L = e.length ?? 8;
  const r = e.r ?? 0.65;
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (L / n) * (i + 0.5);
    p.part(cone([r, r, L / n + 0.01], [x, r, 0], i % 2 ? '#ffffff' : '#ff5fa2', { seg: [10], r: [0, 0, Math.PI / 2] }));
  }
  list.labels.push({ name: 'tube', type: 'decor' });
}

// Vehicles: decor only (no collision), as requested.
export function createVehicle(list, e, ctx) {
  const p = placementFor(list, e, ctx);
  const truck = e.kind !== 'van';
  const body = e.color || (truck ? '#2d6cdf' : '#f8f9fa');
  const wheel = (x, z) => p.part(cone([0.5, 0.5, 0.35], [x, 0.5, z], '#212529', { seg: [8], r: [0, 0, Math.PI / 2] }));
  if (truck) {
    p.part(box([2.4, 2.2, 2.2], [0, 1.5, 3.2], body));
    p.part(box([2.2, 0.8, 0.1], [0, 2.0, 4.31], '#7fd1ff'));
    p.part(box([2.5, 2.8, 5.4], [0, 1.9, -0.8], e.cargo || '#f1faee'));
    for (const z of [3.2, -0.5, -2.6]) { wheel(-1.2, z); wheel(1.2, z); }
  } else {
    p.part(box([2.1, 1.9, 4.8], [0, 1.35, 0], body));
    p.part(box([1.9, 0.7, 0.1], [0, 1.8, 2.41], '#7fd1ff'));
    p.part(box([2.12, 0.3, 4.82], [0, 1.0, 0], e.stripe || '#7b2ff7'));
    for (const z of [1.6, -1.6]) { wheel(-1.05, z); wheel(1.05, z); }
  }
  list.labels.push({ name: truck ? 'camion' : 'fourgon', type: 'vehicle' });
}

export function createBalloon(list, e, ctx) {
  const p = placementFor(list, e, ctx, e.altitude ?? 45);
  p.part(ell([6, 7, 6], [0, 7, 0], e.color || '#9d4edd', { n: 2.1, seg: [12, 7] }));
  for (let k = 0; k < 6; k++) p.part(ell([6.05, 6.9, 0.6], [0, 7, 0], '#ffffff', { seg: [12, 6], yaw: (k * Math.PI) / 3, sc: [1, 1, 0.2] }));
  p.part(box([2.2, 1.4, 2.2], [0, -2.5, 0], '#8d6e63'));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.part(box([0.06, 3.2, 0.06], [dx, -0.4, dz], '#3a3a3a'));
  list.labels.push({ name: 'ballon', type: 'decor' });
}

export function createWaterfall(list, e, ctx) {
  const [x, z] = polarToXZ(e.angle, e.r);
  const p = new Placement(list, x, ctx.terrain.topY, z, Math.PI - e.angle * DEG);
  const w = e.width ?? 8;
  const drop = e.drop ?? 14;
  p.part(box([w, 0.05, 18], [0, 0.03, -8], '#3fa9f5'), { water: true });
  p.part(box([w, drop, 0.6], [0, -drop / 2, 1.0], '#7fd3ff'), { water: true });
  p.part(box([w * 0.7, drop * 0.9, 0.3], [0, -drop / 2, 1.5], '#d9f3ff'), { water: true });
  p.part(ell([w * 0.8, 1.2, 3], [0, -drop + 0.2, 2.5], '#f1fbff', { seg: [8, 3] }), { water: true });
  list.labels.push({ name: 'cascade', type: 'decor' });
}

// Floating rock (outside the map, e.g. under the canal city's crane).
export function createRock(list, e, ctx) {
  const [x, z] = entryPosition(e);
  const p = new Placement(list, x, e.y ?? 0, z, 0);
  p.part(cone([e.r ?? 8, 1, e.h ?? 16], [0, -(e.h ?? 16) / 2, 0], '#8a7f74', { seg: [7] }));
  p.part(ell([(e.r ?? 8) * 1.05, 0.8, (e.r ?? 8) * 1.05], [0, 0, 0], '#6a994e', { seg: [8, 3] }));
  list.labels.push({ name: 'rocher', type: 'decor' });
}

// Straight road decal with lane dashes (no collision).
export function createRoad(list, e, ctx) {
  const [x0, z0] = e.from ? e.from : polarToXZ(e.angle, e.r0);
  const [x1, z1] = e.to ? e.to : polarToXZ(e.angle, e.r1);
  const L = Math.hypot(x1 - x0, z1 - z0);
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  const p = new Placement(list, (x0 + x1) / 2, ctx.terrain.topY, (z0 + z1) / 2, yaw);
  const w = e.width ?? 10;
  p.part(box([w, 0.03, L], [0, 0.015, 0], e.color || '#3d4048'));
  if (e.sidewalk) for (const s of [-1, 1]) p.part(box([1.6, 0.05, L], [s * (w / 2 + 0.8), 0.025, 0], e.sidewalk));
  if (e.dashes !== false) for (let s = -L / 2 + 3; s < L / 2 - 2; s += 6) p.instance('roadDash', 0, 0.02, s, 0);
  if (e.crosswalk) p.instance('crosswalk', 0, 0.02, -L / 2 + 3, Math.PI / 2);
}

// Lane dashes along a ring road (the asphalt itself is terrain paint).
export function createRingDashes(list, e, ctx) {
  const n = Math.round((2 * Math.PI * e.r) / 6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    const [x, z] = polarToXZ(a, e.r);
    list.instances.push({ template: 'roadDash', x, y: ctx.terrain.topY + 0.02, z, yaw: -a * DEG + Math.PI / 2, scale: 1 });
  }
}

export const GENERATORS = {
  block: createBlock,
  tower: createTower,
  burger: createBurger,
  hangar: createHangar,
  containers: createContainers,
  crane: createCrane,
  fountain: createFountain,
  crown: createCrownPlinth,
  bridge: createBridge,
  ruins: createRuins,
  perimeterWall: createPerimeterWall,
  gate: createGate,
  trampoline: createTrampoline,
  tubes: createTubes,
  vehicle: createVehicle,
  balloon: createBalloon,
  waterfall: createWaterfall,
  rock: createRock,
  road: createRoad,
  ringDashes: createRingDashes,
};
