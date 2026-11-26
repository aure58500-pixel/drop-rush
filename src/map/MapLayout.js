// Builds the complete, deterministic content of a map from its data file:
// terrain, structures, colliders, instanced props, vegetation, spawn points,
// training area and the 150 loot points. Pure JavaScript (no Three.js), so it
// runs the same in the browser and in Node checks.
import { CollisionWorld } from '../core/physics/CollisionWorld.js';
import { SeededRandom, deriveSeed } from '../core/utils/random.js';
import { WEAPONS } from '../config/weapons.js';
import { LOOT_CONFIG, TRAINING_LAYOUT } from '../config/lootConfig.js';
import { PlateauTerrain, polarToXZ } from './PlateauTerrain.js';
import { StructureList } from './StructureBuilder.js';
import { GENERATORS } from './BuildingFactory.js';
import { PROP_TEMPLATES } from './PropTemplates.js';

const DEG = Math.PI / 180;

function registerShape(world, s) {
  if (!s.collide) return;
  const tag = s.material;
  if (s.shape === 'box') world.addBox({ x: s.x, y: s.y, z: s.z, hx: s.hx, hy: s.hy, hz: s.hz, yaw: s.yaw, tag });
  else if (s.shape === 'ramp') world.addRamp({ x: s.x, y: s.y, z: s.z, hx: s.hx, hy: s.hy, hz: s.hz, yaw: s.yaw, tag });
  else if (s.shape === 'cyl') world.addCylinder({ x: s.x, z: s.z, radius: s.radius, y0: s.y0, y1: s.y1, tag, userData: s.userData });
}

function registerInstance(world, inst) {
  const t = PROP_TEMPLATES[inst.template];
  if (!t) throw new Error(`Unknown prop template: ${inst.template}`);
  const c = t.collider;
  if (!c) return;
  const k = inst.scale ?? 1;
  if (c.type === 'cyl') {
    world.addCylinder({ x: inst.x, z: inst.z, radius: c.r * k, y0: inst.y - 0.3, y1: inst.y + c.h * k, tag: 'wood' });
  } else {
    world.addBox({ x: inst.x, y: inst.y + c.hy * k, z: inst.z, hx: c.hx * k, hy: c.hy * k, hz: c.hz * k, yaw: inst.yaw, tag: 'wood' });
  }
}

/**
 * True if a standing character fits at (x, z) with its feet near `y`.
 * Returns the ground height, or null when blocked, unsupported or in water.
 */
export function freeSpot(world, terrain, x, z, y, { radius = 0.4, height = 1.7, allowWater = false } = {}) {
  if (x * x + z * z > (terrain.radius - 3) ** 2) return null;
  const ground = world.groundHeight(x, z, radius * 0.8, y + 0.6);
  if (!Number.isFinite(ground) || Math.abs(ground - y) > 0.7) return null;
  if (!allowWater && terrain.waterAt(x, z) && ground < terrain.topY - 0.2) return null;
  const pos = { x, y: ground + 0.02, z };
  world.resolveCylinder(pos, radius, height, 0.3, null);
  if (Math.hypot(pos.x - x, pos.z - z) > 0.01) return null;
  return ground;
}

function weighted(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng.float() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

function scatterVegetation(def, terrain, world, instances, exclusions, seed) {
  const rng = new SeededRandom(deriveSeed(seed, 'vegetation'));
  const placed = [];
  for (const area of def.vegetation?.areas || []) {
    const [cx, cz] = area.angle !== undefined ? polarToXZ(area.angle, area.radius) : [area.x ?? 0, area.z ?? 0];
    const kinds = area.kinds || { treeRound: 1 };
    let left = area.count;
    for (let attempt = 0; attempt < area.count * 25 && left > 0; attempt++) {
      // Uniform in a disc or a ring (r0 .. r1 around the area center).
      const a = rng.range(0, Math.PI * 2);
      const r0 = area.r0 ?? 0;
      const r1 = area.r1 ?? area.r;
      const rr = Math.sqrt(rng.range((r0 * r0) / (r1 * r1), 1)) * r1;
      const x = cx + Math.sin(a) * rr;
      const z = cz - Math.cos(a) * rr;
      if (x * x + z * z > (terrain.radius - 5) ** 2) continue;
      if (terrain.paintAt(x, z).cat !== (area.on || 'grass')) continue;
      if (terrain.depression(x, z).depth > 0) continue;
      if (exclusions.some((e) => (e.x - x) ** 2 + (e.z - z) ** 2 < e.r * e.r)) continue;
      const spacing = area.spacing ?? 4.5;
      if (placed.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < spacing * spacing)) continue;
      const y = terrain.getHeight(x, z);
      if (freeSpot(world, terrain, x, z, y, { radius: 1.6, height: 4 }) === null) continue;
      const template = weighted(rng, kinds);
      const inst = { template, x, y, z, yaw: rng.range(0, Math.PI * 2), scale: rng.range(0.85, 1.25) };
      instances.push(inst);
      registerInstance(world, inst);
      placed.push({ x, z });
      left--;
    }
  }
}

function computeSpawns(def, terrain, world) {
  const s = def.spawn;
  const out = [];
  for (let i = 0; i < s.count; i++) {
    const baseA = (s.offset ?? 0) + (360 / s.count) * i;
    let found = null;
    for (const da of [0, 2, -2, 4, -4, 6, -6]) {
      for (const dr of [0, -6, 6, -12, 12]) {
        const [x, z] = polarToXZ(baseA + da, s.radius + dr);
        const y = freeSpot(world, terrain, x, z, terrain.topY, { radius: 1.2 });
        if (y === null) continue;
        if (out.some((q) => Math.hypot(q.x - x, q.z - z) < (s.minDistance ?? 80))) continue;
        found = { x, y, z, yaw: Math.atan2(x, z) }; // camera yaw looking at the map center
        break;
      }
      if (found) break;
    }
    if (found) out.push(found);
  }
  return out;
}

function computeTraining(def, terrain, world) {
  const [ox, oz, facing = 0] = def.training.origin;
  const yaw = -facing * DEG; // local -Z = forward (toward `facing`), local +Z = back
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const toWorld = ([lx, lz]) => [ox + lx * c + lz * sn, oz - lx * sn + lz * c];
  const at = (local) => {
    const [x, z] = toWorld(local);
    const y = freeSpot(world, terrain, x, z, terrain.getHeight(x, z));
    return y === null ? null : { x, y, z };
  };
  const L = TRAINING_LAYOUT;
  const player = at(L.player);
  const rack = L.rack.map(at);
  const consumables = L.consumables.map((k) => ({ ...k, pos: at(k.at) }));
  const dummies = L.dummies.map((d) => ({ ...d, pos: at(d.at) })).filter((d) => d.pos);
  return {
    origin: { x: ox, z: oz },
    facing,
    // Camera yaw: yaw 0 looks toward -Z (north), so facing azimuth f -> yaw = -f.
    player: player && { ...player, yaw: -facing * DEG },
    loot: [
      ...rack.map((pos, i) => pos && { weapon: Object.keys(WEAPONS)[i], x: pos.x, z: pos.z, y: pos.y }).filter(Boolean),
      ...consumables.filter((k) => k.pos).map((k) => ({ consumable: k.consumable, count: k.count, x: k.pos.x, z: k.pos.z, y: k.pos.y })),
    ],
    dummies: dummies.map((d) => ({
      kind: d.kind, shield: d.shield, x: d.pos.x, z: d.pos.z,
      yaw: Math.atan2(ox - d.pos.x, oz - d.pos.z) / DEG, // face the training origin
    })),
    valid: { player: Boolean(player), rack: rack.filter(Boolean).length, consumables: consumables.filter((k) => k.pos).length, dummies: dummies.length },
  };
}

function generateLoot(def, terrain, world, spots, seed) {
  const cfg = { ...LOOT_CONFIG, ...def.loot };
  const rng = new SeededRandom(deriveSeed(seed, 'loot'));
  const chosen = [];
  const farEnough = (x, y, z) => chosen.every((q) => (q.x - x) ** 2 + (q.z - z) ** 2 + ((q.y - y) * 3) ** 2 >= cfg.minSpacing ** 2);
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng.float() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const indoorMax = Math.round(cfg.count * cfg.indoorShare);
  for (const s of shuffle(spots.slice())) {
    if (chosen.length >= indoorMax) break;
    const y = freeSpot(world, terrain, s.x, s.z, s.y, { radius: 0.35 });
    if (y === null || !farEnough(s.x, y, s.z)) continue;
    chosen.push({ x: s.x, y, z: s.z, indoor: s.indoor });
  }
  for (let i = 0; i < cfg.groundSamples && chosen.length < cfg.count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.float()) * (terrain.radius - 12);
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    const y0 = terrain.getHeight(x, z);
    if (y0 < terrain.topY - 0.2) continue; // no loot in canals or chasms
    const y = freeSpot(world, terrain, x, z, y0, { radius: 0.35 });
    if (y === null || !farEnough(x, y, z)) continue;
    chosen.push({ x, y, z, indoor: false });
  }
  const nW = Math.round(chosen.length * cfg.ratios.weapons);
  const nH = Math.round(chosen.length * cfg.ratios.heals);
  const kinds = shuffle([...Array(nW).fill('weapon'), ...Array(nH).fill('heal'), ...Array(chosen.length - nW - nH).fill('shield')]);
  return chosen.map((p, i) => {
    const base = { id: `${def.id}-${i}`, x: p.x, y: p.y, z: p.z, indoor: p.indoor, category: kinds[i] };
    if (kinds[i] === 'weapon') return { ...base, weapon: weighted(rng, cfg.weaponWeights) };
    const consumable = weighted(rng, kinds[i] === 'heal' ? cfg.healWeights : cfg.shieldWeights);
    return { ...base, consumable, count: 1 };
  });
}

/**
 * @param {object} def map data file
 * @param {{seed?: number}} [options] match seed (loot); the map seed is used by default
 */
export function generateMap(def, { seed = def.seed } = {}) {
  const terrain = new PlateauTerrain(def);
  const list = new StructureList();
  const ctx = { terrain, def };
  for (const e of def.structures || []) {
    const gen = GENERATORS[e.type];
    if (!gen) throw new Error(`Unknown structure type "${e.type}" in map ${def.id}`);
    gen(list, e, ctx);
  }
  for (const inst of def.instances || []) {
    const [x, z] = inst.angle !== undefined ? polarToXZ(inst.angle, inst.radius) : [inst.x, inst.z];
    list.instances.push({ template: inst.template, x, z, y: inst.y ?? terrain.getHeight(x, z), yaw: (inst.yaw ?? 0) * DEG, scale: inst.scale ?? 1 });
  }

  const world = new CollisionWorld({ cellSize: 8 });
  world.setTerrain(terrain);
  for (const s of list.shapes) registerShape(world, s);
  for (const inst of list.instances) registerInstance(world, inst);

  const spawnPoints = computeSpawns(def, terrain, world);
  const training = computeTraining(def, terrain, world);
  const exclusions = [
    { x: training.origin.x, z: training.origin.z, r: TRAINING_LAYOUT.clearRadius },
    ...spawnPoints.map((p) => ({ x: p.x, z: p.z, r: 4 })),
  ];
  scatterVegetation(def, terrain, world, list.instances, exclusions, def.seed);
  const loot = generateLoot(def, terrain, world, list.lootSpots, seed);

  return {
    def,
    size: def.size,
    radius: terrain.radius,
    boundary: def.boundary,
    buildRadius: def.buildRadius ?? terrain.radius - 2,
    terrain,
    world,
    structures: list.shapes,
    instances: list.instances,
    routes: list.routes,
    labels: list.labels,
    lootSpots: list.lootSpots,
    loot,
    spawnPoints,
    training,
    sea: def.sea || null,
  };
}
