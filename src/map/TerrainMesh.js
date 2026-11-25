// Faceted terrain mesh using the exact TerrainData triangulation, with
// per-triangle colors (grass variations, dry patches, sand, rock, pads).
import * as THREE from 'three';
import { hexToLinear, smoothstep } from '../core/utils/math.js';
import { createValueNoise2D, deriveSeed } from '../core/utils/random.js';
import { geometryFromArrays } from './geometryUtils.js';

export function createTerrainMesh(layout) {
  const terrain = layout.terrain;
  const def = layout.def;
  const pal = def.palette;
  const n = terrain.resolution;
  const cs = terrain.cellSize;
  const half = terrain.half;
  const noise = createValueNoise2D(deriveSeed(def.seed, 'terrain-colors'));
  const grass = pal.grass.map(hexToLinear);
  const dry = hexToLinear(pal.dryGrass);
  const sand = hexToLinear(pal.sand);
  const rock = hexToLinear(pal.rock);
  const under = hexToLinear(pal.underwater);
  const pads = terrain.pads.map((p) => ({ ...p, rgb: hexToLinear(p.color || pal.dirt) }));
  const oceanLevel = layout.water.oceanLevel;

  const triCount = n * n * 2;
  const positions = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 9);
  const colors = new Float32Array(triCount * 9);
  let o = 0;

  const color = [0, 0, 0];
  const pick = (x, y, z, ny) => {
    // Base grass blend.
    const g = noise.fbm(x * 0.03, z * 0.03, 2);
    const gi = Math.min(grass.length - 1, Math.floor(g * grass.length));
    let r = grass[gi][0], gg = grass[gi][1], b = grass[gi][2];
    const dryT = smoothstep(0.55, 0.7, noise.fbm(x * 0.012 + 40, z * 0.012 - 13, 2));
    r += (dry[0] - r) * dryT; gg += (dry[1] - gg) * dryT; b += (dry[2] - b) * dryT;
    // Water edges.
    const river = terrain.riverAt(x, z);
    const waterLevel = river ? river.level : oceanLevel;
    const above = y - waterLevel;
    if (above < 0.6) {
      const t = above < 0 ? 1 : 1 - above / 0.6;
      const target = above < -0.3 ? under : sand;
      r += (target[0] - r) * t; gg += (target[1] - gg) * t; b += (target[2] - b) * t;
    }
    // Steep slopes are rocky.
    const rockT = smoothstep(0.82, 0.7, ny);
    r += (rock[0] - r) * rockT; gg += (rock[1] - gg) * rockT; b += (rock[2] - b) * rockT;
    // Flattened pads (building lots, training area).
    for (const p of pads) {
      const dx = Math.max(Math.abs(x - p.x) - p.halfX, 0);
      const dz = Math.max(Math.abs(z - p.z) - p.halfZ, 0);
      if (dx + dz < 1.5) {
        const t = 1 - (dx + dz) / 1.5;
        r += (p.rgb[0] - r) * t; gg += (p.rgb[1] - gg) * t; b += (p.rgb[2] - b) * t;
      }
    }
    const v = 0.94 + noise.noise(x * 0.7, z * 0.7) * 0.12;
    color[0] = r * v; color[1] = gg * v; color[2] = b * v;
    return color;
  };

  const pushTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const c = pick((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3, ny);
    const verts = [ax, ay, az, bx, by, bz, cx, cy, cz];
    for (let k = 0; k < 3; k++) {
      positions[o + k * 3] = verts[k * 3];
      positions[o + k * 3 + 1] = verts[k * 3 + 1];
      positions[o + k * 3 + 2] = verts[k * 3 + 2];
      normals[o + k * 3] = nx; normals[o + k * 3 + 1] = ny; normals[o + k * 3 + 2] = nz;
      colors[o + k * 3] = c[0]; colors[o + k * 3 + 1] = c[1]; colors[o + k * 3 + 2] = c[2];
    }
    o += 9;
  };

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x0 = -half + i * cs, x1 = x0 + cs;
      const z0 = -half + j * cs, z1 = z0 + cs;
      const a = terrain.vertexHeight(i, j);
      const b = terrain.vertexHeight(i + 1, j);
      const c = terrain.vertexHeight(i, j + 1);
      const d = terrain.vertexHeight(i + 1, j + 1);
      // Same split as TerrainData.getHeight: triangles (a, c, b) and (b, c, d).
      pushTri(x0, a, z0, x0, c, z1, x1, b, z0);
      pushTri(x1, b, z0, x0, c, z1, x1, d, z1);
    }
  }

  const geometry = geometryFromArrays({ positions, normals, colors });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
