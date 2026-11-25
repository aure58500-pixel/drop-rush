// Builds the full deterministic layout of a map (terrain, structures,
// vegetation, spawn points) from its data file. Pure JavaScript.
import { TerrainData } from './TerrainData.js';
import { StructureList } from './StructureBuilder.js';
import { BUILDING_GENERATORS, createProp, footprintOf } from './BuildingFactory.js';
import { SeededRandom, deriveSeed } from '../core/utils/random.js';
import { distanceToPolyline2D } from '../core/utils/math.js';

const PAD_MARGIN = 6;

export function generateLayout(def) {
  const pads = [];
  for (const b of def.buildings || []) {
    const fp = footprintOf(b);
    pads.push({ x: b.x, z: b.z, halfX: fp.halfX + 1.5, halfZ: fp.halfZ + 1.5, margin: PAD_MARGIN, kind: b.type });
  }
  for (const a of def.areas || []) {
    pads.push({ x: a.x, z: a.z, halfX: a.width / 2, halfZ: a.depth / 2, margin: a.margin ?? 8, kind: 'area', color: a.groundColor });
  }

  const terrain = new TerrainData(def, pads);
  const structures = new StructureList();

  (def.buildings || []).forEach((b, i) => {
    const generator = BUILDING_GENERATORS[b.type];
    if (!generator) throw new Error(`Unknown building type: ${b.type}`);
    generator(structures, b, terrain.pads[i].height);
  });

  for (const a of def.areas || []) {
    const pad = terrain.pads.find((p) => p.kind === 'area' && p.x === a.x && p.z === a.z);
    for (const prop of a.props || []) {
      createProp(structures, { ...prop, x: a.x + prop.x, z: a.z + prop.z }, pad.height);
    }
  }
  for (const prop of def.props || []) {
    createProp(structures, prop, terrain.getHeight(prop.x, prop.z) - (prop.sink ?? 0.05));
  }

  const blockers = {
    pads: terrain.pads,
    rivers: def.water?.rivers || [],
    exclusions: def.vegetation?.exclusions || [],
    half: def.size / 2 - (def.terrain.edgeFalloff + 2),
    minHeight: (def.water?.oceanLevel ?? -1) + 1.2,
  };
  const vegetation = scatterVegetation(def, terrain, blockers);

  const spawnPoints = (def.spawnPoints || []).map((s) => ({
    x: s.x, z: s.z, yaw: s.yaw || 0, y: terrain.getHeight(s.x, s.z),
  }));

  return {
    def,
    size: def.size,
    terrain,
    structures: structures.shapes,
    vegetation,
    spawnPoints,
    water: {
      oceanLevel: def.water?.oceanLevel ?? -1,
      oceanSlowFactor: def.water?.oceanSlowFactor ?? 0.7,
      rivers: terrain.rivers, // includes per-point water levels
    },
  };
}

function isBlocked(x, z, margin, terrain, b) {
  if (Math.abs(x) > b.half || Math.abs(z) > b.half) return true;
  for (const p of b.pads) {
    if (Math.abs(x - p.x) < p.halfX + margin && Math.abs(z - p.z) < p.halfZ + margin) return true;
  }
  for (const r of b.rivers) {
    if (distanceToPolyline2D(x, z, r.points) < r.width / 2 + r.bank + margin) return true;
  }
  for (const e of b.exclusions) {
    if (Math.hypot(x - e.x, z - e.z) < e.radius + margin) return true;
  }
  return terrain.getHeight(x, z) < b.minHeight;
}

// Poisson-like scatter with a coarse grid to enforce a minimum distance.
function scatter(rng, count, minDist, margin, terrain, b, attemptsFactor = 12) {
  const out = [];
  const cell = Math.max(minDist, 1);
  const grid = new Map();
  const key = (ix, iz) => ix * 100003 + iz;
  const range = b.half;
  for (let a = 0; a < count * attemptsFactor && out.length < count; a++) {
    const x = rng.range(-range, range);
    const z = rng.range(-range, range);
    if (isBlocked(x, z, margin, terrain, b)) continue;
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    let ok = true;
    for (let i = -1; i <= 1 && ok; i++) {
      for (let j = -1; j <= 1 && ok; j++) {
        for (const q of grid.get(key(ix + i, iz + j)) || []) {
          if ((q.x - x) ** 2 + (q.z - z) ** 2 < minDist * minDist) {
            ok = false;
            break;
          }
        }
      }
    }
    if (!ok) continue;
    const item = { x, z, y: terrain.getHeight(x, z) };
    out.push(item);
    const k = key(ix, iz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(item);
  }
  return out;
}

function scatterVegetation(def, terrain, blockers) {
  const v = def.vegetation || {};
  const rng = new SeededRandom(deriveSeed(def.seed, 'vegetation'));
  const trees = scatter(rng, v.trees ?? 0, 4, 1.5, terrain, blockers).map((t) => ({
    ...t, kind: rng.chance(v.pineRatio ?? 0.55) ? 'pine' : 'round', scale: rng.range(0.8, 1.35), rotation: rng.range(0, Math.PI * 2), tint: rng.float(),
  }));
  const rocks = scatter(rng, v.rocks ?? 0, 3, 1, terrain, blockers).map((r) => ({
    ...r, scale: rng.range(0.5, 2.0), rotation: rng.range(0, Math.PI * 2), tint: rng.float(),
  }));
  const bushes = scatter(rng, v.bushes ?? 0, 1.8, 0.5, terrain, blockers).map((b) => ({
    ...b, scale: rng.range(0.6, 1.3), rotation: rng.range(0, Math.PI * 2), tint: rng.float(),
  }));
  const decorBlockers = { ...blockers, pads: blockers.pads.map((p) => ({ ...p, halfX: p.halfX - 1, halfZ: p.halfZ - 1 })) };
  const grass = scatter(rng, v.grass ?? 0, 0.6, 0, terrain, decorBlockers, 3).map((g) => ({
    ...g, scale: rng.range(0.7, 1.4), rotation: rng.range(0, Math.PI * 2), tint: rng.float(),
  }));
  const flowers = scatter(rng, v.flowers ?? 0, 0.8, 0, terrain, decorBlockers, 3).map((f) => ({
    ...f, scale: rng.range(0.7, 1.2), rotation: 0, tint: rng.float(),
  }));
  return { trees, rocks, bushes, grass, flowers };
}

// Registers every collidable shape and vegetation collider into the world.
export function registerColliders(layout, world) {
  world.setTerrain(layout.terrain);
  for (const s of layout.structures) {
    if (!s.collide) continue;
    const tag = s.material;
    if (s.shape === 'box') {
      world.addBox({ x: s.x, y: s.y, z: s.z, hx: s.hx, hy: s.hy, hz: s.hz, yaw: s.yaw, tag });
    } else if (s.shape === 'ramp') {
      world.addRamp({ x: s.x, y: s.y, z: s.z, hx: s.hx, hy: s.hy, hz: s.hz, yaw: s.yaw, thickness: s.thickness, tag });
    } else if (s.shape === 'prism') {
      // Two solid half-roofs meeting at the ridge (local z = 0).
      const cos = Math.cos(s.yaw);
      const sin = Math.sin(s.yaw);
      for (const side of [-1, 1]) {
        const lz = (side * s.hz) / 2;
        world.addRamp({
          x: s.x + lz * sin, y: s.y, z: s.z + lz * cos,
          hx: s.hx, hy: s.hy, hz: s.hz / 2, yaw: s.yaw + (side < 0 ? 0 : Math.PI), tag,
        });
      }
    }
  }
  for (const t of layout.vegetation.trees) {
    world.addCylinder({ x: t.x, z: t.z, radius: 0.28 * t.scale, y0: t.y - 0.5, y1: t.y + 2.6 * t.scale, tag: 'wood' });
  }
  for (const r of layout.vegetation.rocks) {
    world.addCylinder({ x: r.x, z: r.z, radius: 0.85 * r.scale, y0: r.y - 0.5, y1: r.y + 0.95 * r.scale, tag: 'stone' });
  }
}
