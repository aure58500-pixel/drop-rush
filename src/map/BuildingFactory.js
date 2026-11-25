// Procedural building and prop generators driven by map data entries.
// Every generator writes shapes into a Placement (local frame of the entry).
import { Placement } from './StructureBuilder.js';

const FLOOR_HEIGHT = 3;
const SLAB = 0.25;
const BASE = 0.15; // foundation top above the pad

const DEFAULT_COLORS = {
  wall: '#e9d8a6', trim: '#f8f4e3', roof: '#bb3e03', floor: '#a47148',
  foundation: '#8d8a83', stairs: '#9c6644', metal: '#7d8597', accent: '#2a9d8f',
};

export function rotationToYaw(rotation = 0) {
  return (rotation * Math.PI) / 180;
}

// Axis-aligned footprint half sizes in world space (rotations are multiples of 90°).
export function footprintOf(entry) {
  const size = BUILDING_SIZES[entry.type]?.(entry) || { w: entry.w || 2, d: entry.d || 2 };
  const odd = Math.round((entry.rotation || 0) / 90) % 2 !== 0;
  return { halfX: (odd ? size.d : size.w) / 2, halfZ: (odd ? size.w : size.d) / 2 };
}

const BUILDING_SIZES = {
  house: (e) => ({ w: e.width ?? 10, d: e.depth ?? 8 }),
  hangar: (e) => ({ w: e.width ?? 24, d: e.depth ?? 16 }),
  bridge: (e) => ({ w: e.width ?? 4, d: e.length ?? 16 }),
};

export function createHouse(list, e, baseY) {
  const c = { ...DEFAULT_COLORS, ...e.colors };
  const W = e.width ?? 10;
  const D = e.depth ?? 8;
  const floors = e.floors ?? 1;
  const t = 0.3;
  const p = new Placement(list, e.x, baseY, e.z, rotationToYaw(e.rotation));
  const hw = W / 2;
  const hd = D / 2;

  p.box(-hw - 0.25, -0.8, -hd - 0.25, hw + 0.25, BASE, hd + 0.25, c.foundation);

  const stairW = 1.3;
  const zStart = hd - t - 1.4;
  const stairRun = (FLOOR_HEIGHT / 0.25) * 0.3;
  const zEnd = zStart - stairRun;
  const columnX = (f) => (f % 2 === 0 ? -hw + t + stairW / 2 : hw - t - stairW / 2);

  for (let f = 0; f < floors; f++) {
    const y0 = BASE + f * FLOOR_HEIGHT;
    const win = (center) => ({ center, width: 1.4, bottom: 1.0, top: 2.1 });
    const front = f === 0
      ? [{ center: 0, width: 1.6, bottom: 0, top: 2.4 }, win(-W / 4 - 0.4), win(W / 4 + 0.4)]
      : [win(-W / 4), win(0), win(W / 4)];
    const back = f === 0 ? [{ center: W / 4, width: 1.2, bottom: 0, top: 2.3 }, win(-W / 4)] : [win(-W / 4), win(W / 4)];
    const side = [win(-0.6)];
    p.wall('x', hd - t / 2, -hw, hw, y0, FLOOR_HEIGHT, t, front, c.wall, c.trim);
    p.wall('x', -hd + t / 2, -hw, hw, y0, FLOOR_HEIGHT, t, back, c.wall, c.trim);
    p.wall('z', -hw + t / 2, -hd + t, hd - t, y0, FLOOR_HEIGHT, t, side, c.wall, c.trim);
    p.wall('z', hw - t / 2, -hd + t, hd - t, y0, FLOOR_HEIGHT, t, side, c.wall, c.trim);

    if (f > 0) {
      // Floor slab with a stairwell hole above the stairs coming from below.
      const cx = columnX(f - 1);
      const leftColumn = f - 1 === 0 || (f - 1) % 2 === 0;
      // Opening wider than the stairs on the room side so off-center climbers keep head room.
      const extra = 0.6;
      const hx0 = cx - stairW / 2 - (leftColumn ? 0 : extra);
      const hx1 = cx + stairW / 2 + (leftColumn ? extra : 0);
      const hz0 = zEnd;
      const hz1 = zStart - 0.2;
      const ix0 = -hw + t;
      const ix1 = hw - t;
      const iz0 = -hd + t;
      const iz1 = hd - t;
      const sy0 = y0 - SLAB;
      p.box(ix0, sy0, iz0, ix1, y0, hz0, c.floor, { material: 'wood' });
      p.box(ix0, sy0, hz1, ix1, y0, iz1, c.floor, { material: 'wood' });
      p.box(ix0, sy0, hz0, hx0, y0, hz1, c.floor, { material: 'wood' });
      p.box(hx1, sy0, hz0, ix1, y0, hz1, c.floor, { material: 'wood' });
      // Guard rail around the stairwell hole (inner side).
      const railX = leftColumn ? hx1 : hx0;
      p.box(railX - 0.05, y0, hz0, railX + 0.05, y0 + 1.0, hz1, c.trim, { material: 'wood' });
    } else {
      // Visual floor 1 cm above the foundation to avoid coplanar faces.
      p.box(-hw + t, BASE - 0.02, -hd + t, hw - t, BASE + 0.01, hd - t, c.floor, { collide: false, shadow: false });
    }

    if (f < floors - 1) {
      p.stairs(columnX(f), stairW, zStart, -1, y0, FLOOR_HEIGHT, c.stairs);
    }
  }

  const yTop = BASE + floors * FLOOR_HEIGHT;
  // Ceiling/roof slab fitted inside the walls (no overlapping coplanar faces).
  p.box(-hw + t, yTop - SLAB, -hd + t, hw - t, yTop, hd - t, c.floor, { material: 'wood' });
  if (e.roof === 'flat') {
    p.box(-hw, yTop, -hd, hw, yTop + 0.6, -hd + 0.2, c.wall);
    p.box(-hw, yTop, hd - 0.2, hw, yTop + 0.6, hd, c.wall);
    p.box(-hw, yTop, -hd + 0.2, -hw + 0.2, yTop + 0.6, hd - 0.2, c.wall);
    p.box(hw - 0.2, yTop, -hd + 0.2, hw, yTop + 0.6, hd - 0.2, c.wall);
  } else {
    const roofH = Math.min(W, D) * 0.32;
    p.roof(-hw - 0.4, -hd - 0.5, hw + 0.4, hd + 0.5, yTop, roofH, c.roof);
    p.box(hw * 0.45, yTop, -hd * 0.3, hw * 0.45 + 0.7, yTop + roofH + 0.5, -hd * 0.3 + 0.7, c.foundation);
  }
}

export function createHangar(list, e, baseY) {
  const c = { ...DEFAULT_COLORS, wall: '#8ea4b5', trim: '#d9e2ec', roof: '#5c6b7a', floor: '#9a9a92', ...e.colors };
  const W = e.width ?? 24;
  const D = e.depth ?? 16;
  const H = e.height ?? 8;
  const t = 0.4;
  const hw = W / 2;
  const hd = D / 2;
  const p = new Placement(list, e.x, baseY, e.z, rotationToYaw(e.rotation));

  p.box(-hw - 0.3, -0.8, -hd - 0.3, hw + 0.3, BASE, hd + 0.3, c.floor);
  const y0 = BASE;
  const high = (center) => ({ center, width: 2.2, bottom: 4.6, top: 6.2 });
  p.wall('x', hd - t / 2, -hw, hw, y0, H, t, [{ center: 0, width: 10, bottom: 0, top: 6 }, high(-hw + 3), high(hw - 3)], c.wall, c.trim, 'metal');
  p.wall('x', -hd + t / 2, -hw, hw, y0, H, t, [{ center: hw - 4, width: 1.6, bottom: 0, top: 2.5 }, high(-4), high(4)], c.wall, c.trim, 'metal');
  p.wall('z', -hw + t / 2, -hd + t, hd - t, y0, H, t, [high(2), high(-3)], c.wall, c.trim, 'metal');
  p.wall('z', hw - t / 2, -hd + t, hd - t, y0, H, t, [{ center: 3, width: 1.6, bottom: 0, top: 2.5 }, high(-3)], c.wall, c.trim, 'metal');

  // Catwalk along the back wall, reached by stairs on the left side.
  const catY = y0 + 4;
  const catZ1 = -hd + t + 3;
  p.box(-hw + t, catY - SLAB, -hd + t, hw - t, catY, catZ1, c.metal, { material: 'metal' });
  const stairX = -hw + t + 0.65;
  p.stairs(stairX, 1.3, catZ1 + 4.8, -1, y0, 4, c.metal, { material: 'metal' });
  p.box(-hw + t + 1.3, catY, catZ1 - 0.08, hw - t, catY + 1.0, catZ1, c.accent, { material: 'metal' });

  // Roof with a raised central section.
  p.box(-hw - 0.3, y0 + H, -hd - 0.3, hw + 0.3, y0 + H + 0.3, hd + 0.3, c.roof, { material: 'metal' });
  p.roof(-hw, -hd * 0.6, hw, hd * 0.6, y0 + H + 0.3, 1.6, c.roof, { material: 'metal' });

  // Cargo inside.
  p.box(4, y0, -2, 6.4, y0 + 2.4, 3, c.accent, { material: 'metal' });
  p.box(7, y0, 1, 8.5, y0 + 1.5, 2.5, '#d4a373', { material: 'wood' });
  p.box(7.2, y0 + 1.5, 1.2, 8.3, y0 + 2.6, 2.3, '#d4a373', { material: 'wood' });
  p.box(-6, y0, 3, -4.6, y0 + 1.4, 4.4, '#e76f51', { material: 'metal' });
}

export function createBridge(list, e, baseY) {
  const W = e.width ?? 4;
  const L = e.length ?? 16;
  const p = new Placement(list, e.x, baseY, e.z, rotationToYaw(e.rotation));
  const wood = e.color || '#a0703f';
  p.box(-W / 2, BASE - 0.3, -L / 2, W / 2, BASE + 0.05, L / 2, wood, { material: 'wood' });
  for (const s of [-1, 1]) {
    p.box(s * W / 2 - 0.12, BASE + 0.05, -L / 2, s * W / 2 + 0.12, BASE + 1.0, L / 2, '#7f5539', { material: 'wood' });
    for (let z = -L / 2 + 1; z < L / 2; z += 3.5) {
      p.box(s * W / 2 - 0.2, -2.5, z - 0.2, s * W / 2 + 0.2, BASE - 0.3, z + 0.2, '#6b4f3a', { material: 'wood' });
    }
  }
}

// Simple props for test courses and decoration (base at baseY).
export function createProp(list, e, baseY) {
  const p = new Placement(list, e.x, baseY, e.z, rotationToYaw(e.rotation));
  const color = e.color || '#f4a261';
  const material = e.material || 'stone';
  switch (e.type) {
    case 'box':
    case 'wall':
    case 'crate': {
      const w = e.w ?? 1;
      const h = e.h ?? 1;
      const d = e.d ?? 1;
      const y = e.y ?? 0;
      p.box(-w / 2, y, -d / 2, w / 2, y + h, d / 2, color, { material });
      if (e.type === 'crate') {
        const deco = { collide: false, shadow: false };
        p.box(-w / 2 - 0.02, y + h * 0.42, -d / 2 - 0.02, w / 2 + 0.02, y + h * 0.58, d / 2 + 0.02, e.trim || '#7f5539', deco);
      }
      break;
    }
    case 'ramp': {
      // Ramp climbing toward local -Z, followed by an optional platform.
      const w = e.w ?? 4;
      const h = e.h ?? 4;
      const d = e.d ?? 4;
      p.ramp(-w / 2, 0, -d / 2, w / 2, h, d / 2, color, { localYaw: Math.PI, material });
      if (e.platform) p.box(-w / 2, 0, -d / 2 - e.platform, w / 2, h, -d / 2, e.platformColor || color, { material });
      break;
    }
    case 'stairs': {
      const w = e.w ?? 2;
      p.stairs(0, w, (e.d ?? 3.6) / 2, -1, 0, e.h ?? 3, color, { material });
      break;
    }
    case 'tunnel': {
      const L = e.length ?? 6;
      const W = e.width ?? 2.4;
      const H = e.height ?? 1.25;
      p.box(-W / 2 - 0.4, 0, -L / 2, -W / 2, H + 0.4, L / 2, color, { material });
      p.box(W / 2, 0, -L / 2, W / 2 + 0.4, H + 0.4, L / 2, color, { material });
      p.box(-W / 2 - 0.4, H, -L / 2, W / 2 + 0.4, H + 0.4, L / 2, e.roofColor || color, { material });
      break;
    }
    case 'fence': {
      const L = e.length ?? 8;
      for (let x = -L / 2; x <= L / 2 + 1e-6; x += 2) p.box(x - 0.08, 0, -0.08, x + 0.08, 1.1, 0.08, color, { material: 'wood' });
      p.box(-L / 2, 0.45, -0.04, L / 2, 0.6, 0.04, color, { material: 'wood' });
      p.box(-L / 2, 0.85, -0.04, L / 2, 1.0, 0.04, color, { material: 'wood' });
      break;
    }
    case 'pillar': {
      const r = e.r ?? 0.5;
      p.box(-r, 0, -r, r, e.h ?? 4, r, color, { material });
      break;
    }
    default:
      throw new Error(`Unknown prop type: ${e.type}`);
  }
}

export const BUILDING_GENERATORS = {
  house: createHouse,
  hangar: createHangar,
  bridge: createBridge,
};
