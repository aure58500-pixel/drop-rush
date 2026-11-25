// Pure geometry of build pieces (no Three.js): shapes, colliders, filler under
// floating pieces and the grid "slots" used to detect overlaps.
//
// Grid: cell (gx, gz) spans [gx*G, (gx+1)*G] x [gz*G, (gz+1)*G].
// Vertical: level gy has its floor line at y = by + gy * floorHeight, where `by`
// is the anchor elevation of the cluster (ground height for the first piece).
//   wall     : edge slab standing on the level line. rot 0 = edge along X on the
//              north side of the cell (z = gz*G), rot 1 = edge along Z on the west
//              side (x = gx*G). Edges are canonical, so each edge has one slot.
//   platform : slab whose top is the level line.
//   ramp     : solid 45° wedge starting at the level line and rising one level.
//              rot 0..3 = rise toward north, east, south, west.
import { BUILD_CONFIG } from '../config/buildConfig.js';

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // north (-Z), east, south, west
const RAMP_YAW = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];

export function round2(v) {
  return Math.round(v * 100) / 100;
}

export function levelBase(rec, cfg = BUILD_CONFIG) {
  return rec.by + rec.gy * cfg.floorHeight;
}

export function getPieceShape(rec, cfg = BUILD_CONFIG) {
  const G = cfg.gridSize;
  const yb = levelBase(rec, cfg);
  const x0 = rec.gx * G;
  const z0 = rec.gz * G;
  const def = cfg.pieces[rec.type];
  let s;
  if (rec.type === 'wall') {
    const t = def.thickness;
    const h = def.height;
    s = rec.rot === 0
      ? { kind: 'box', x: x0 + G / 2, y: yb + h / 2, z: z0, hx: G / 2, hy: h / 2, hz: t / 2, yaw: 0 }
      : { kind: 'box', x: x0, y: yb + h / 2, z: z0 + G / 2, hx: t / 2, hy: h / 2, hz: G / 2, yaw: 0 };
  } else if (rec.type === 'platform') {
    const t = def.thickness;
    s = { kind: 'box', x: x0 + G / 2, y: yb - t / 2, z: z0 + G / 2, hx: G / 2, hy: t / 2, hz: G / 2, yaw: 0 };
  } else if (rec.type === 'ramp') {
    const h = def.height;
    s = { kind: 'ramp', x: x0 + G / 2, y: yb + h / 2, z: z0 + G / 2, hx: G / 2, hy: h / 2, hz: G / 2, yaw: RAMP_YAW[rec.rot] };
  } else {
    throw new Error(`Unknown build piece: ${rec.type}`);
  }
  s.scale = [s.hx * 2, s.hy * 2, s.hz * 2];
  s.bottom = s.y - s.hy;
  s.top = s.y + s.hy;
  s.aabb = { minX: s.x - s.hx, maxX: s.x + s.hx, minY: s.bottom, maxY: s.top, minZ: s.z - s.hz, maxZ: s.z + s.hz };
  return s;
}

// Ground samples (x, z) under the footprint of a piece.
function footprintPoints(rec, cfg) {
  const G = cfg.gridSize;
  const x0 = rec.gx * G;
  const z0 = rec.gz * G;
  if (rec.type === 'wall') {
    return rec.rot === 0
      ? [[x0, z0], [x0 + G / 2, z0], [x0 + G, z0]]
      : [[x0, z0], [x0, z0 + G / 2], [x0, z0 + G]];
  }
  return [[x0, z0], [x0 + G, z0], [x0, z0 + G], [x0 + G, z0 + G], [x0 + G / 2, z0 + G / 2]];
}

// Filler box under a piece that floats above sloped ground (null if not needed).
export function getSkirt(rec, shape, terrain, cfg = BUILD_CONFIG) {
  // Only ground-level pieces get filler; upper levels are meant to float.
  if (!terrain || rec.gy !== 0) return null;
  let minH = Infinity;
  for (const [x, z] of footprintPoints(rec, cfg)) minH = Math.min(minH, terrain.getHeight(x, z));
  const gap = shape.bottom - minH;
  if (gap < 0.04 || gap > cfg.maxSkirtDepth) return null;
  const depth = gap + cfg.skirtEmbed;
  const out = {
    kind: 'box', x: shape.x, y: shape.bottom - depth / 2, z: shape.z,
    hx: shape.hx, hy: depth / 2, hz: shape.hz, yaw: 0, depth,
  };
  out.scale = [out.hx * 2, depth, out.hz * 2];
  return out;
}

// One build per slot. A ramp also reserves the floor slot above its cell.
export function slotKeys(rec) {
  const pfx = rec.by.toFixed(2);
  const at = `${rec.gx}|${rec.gy}|${rec.gz}`;
  switch (rec.type) {
    case 'wall': return [`${pfx}|E${rec.rot}|${at}`];
    case 'platform': return [`${pfx}|F|${at}`];
    case 'ramp': return [`${pfx}|C|${at}`, `${pfx}|F|${rec.gx}|${rec.gy + 1}|${rec.gz}`];
    default: return [];
  }
}

export function anchorKey(by) {
  return by.toFixed(2);
}
