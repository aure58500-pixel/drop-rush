// Heightfield terrain shared by rendering and collisions. Heights are sampled
// with the exact triangulation used by the terrain mesh (diagonal b-c).
import { createValueNoise2D, deriveSeed } from '../core/utils/random.js';
import { closestOnPolyline2D, lerp, smoothstep } from '../core/utils/math.js';

export class TerrainData {
  /**
   * @param {object} mapDef map definition (size, seed, terrain, water)
   * @param {Array<{x:number,z:number,halfX:number,halfZ:number,margin:number}>} pads flattened areas
   */
  constructor(mapDef, pads = []) {
    const t = mapDef.terrain;
    this.size = mapDef.size;
    this.half = mapDef.size / 2;
    this.cellSize = t.cellSize;
    this.resolution = Math.round(this.size / this.cellSize);
    this.vertsPerSide = this.resolution + 1;
    this.heights = new Float32Array(this.vertsPerSide * this.vertsPerSide);
    this.noise = createValueNoise2D(deriveSeed(mapDef.seed, 'terrain'));
    this.def = t;
    // Rivers: water surface follows the smoothed raw terrain along the polyline.
    this.rivers = (mapDef.water?.rivers || []).map((r) => {
      const raw = r.points.map(([x, z]) => this.rawHeight(x, z) - (r.surfaceDrop ?? 1.2));
      const levels = raw.map((_, i) => {
        const a = raw[Math.max(0, i - 1)];
        const b = raw[Math.min(raw.length - 1, i + 1)];
        return (a + raw[i] * 2 + b) / 4;
      });
      return { ...r, levels };
    });
    this._closest = { distance: 0, index: 0, t: 0 };

    // Pad target height = raw terrain height at the pad center.
    this.pads = pads.map((p) => ({ ...p, height: p.height ?? this.rawHeight(p.x, p.z) }));

    for (let j = 0; j < this.vertsPerSide; j++) {
      for (let i = 0; i < this.vertsPerSide; i++) {
        const x = -this.half + i * this.cellSize;
        const z = -this.half + j * this.cellSize;
        this.heights[j * this.vertsPerSide + i] = this.computeHeight(x, z);
      }
    }
  }

  rawHeight(x, z) {
    const t = this.def;
    let h = t.baseHeight;
    for (const layer of t.layers) {
      h += layer.amplitude * this.noise.fbm(x * layer.frequency + 17.3, z * layer.frequency - 4.1, layer.octaves || 1);
    }
    return h;
  }

  computeHeight(x, z) {
    let h = this.rawHeight(x, z);
    for (const p of this.pads) {
      const dx = Math.max(Math.abs(x - p.x) - p.halfX, 0);
      const dz = Math.max(Math.abs(z - p.z) - p.halfZ, 0);
      const d = Math.hypot(dx, dz);
      h = lerp(p.height, h, smoothstep(0, p.margin, d));
    }
    for (const river of this.rivers) {
      const c = closestOnPolyline2D(x, z, river.points, this._closest);
      const halfWidth = river.width / 2;
      if (c.distance < halfWidth + river.bank) {
        const level = lerp(river.levels[c.index], river.levels[c.index + 1], c.t);
        const bed = level - river.depth;
        h = Math.min(h, lerp(bed, h, smoothstep(halfWidth * 0.55, halfWidth + river.bank, c.distance)));
      }
    }
    const edge = this.half - Math.max(Math.abs(x), Math.abs(z));
    h = lerp(this.def.edgeHeight, h, smoothstep(0, this.def.edgeFalloff, edge));
    return h;
  }

  // Water surface height at (x, z) if inside a river channel, otherwise null.
  riverAt(x, z) {
    for (const river of this.rivers) {
      const c = closestOnPolyline2D(x, z, river.points, this._closest);
      if (c.distance <= river.width / 2 + river.bank) {
        return { river, level: lerp(river.levels[c.index], river.levels[c.index + 1], c.t) };
      }
    }
    return null;
  }

  vertexHeight(i, j) {
    const n = this.vertsPerSide - 1;
    i = i < 0 ? 0 : i > n ? n : i;
    j = j < 0 ? 0 : j > n ? n : j;
    return this.heights[j * this.vertsPerSide + i];
  }

  getHeight(x, z) {
    const gx = (x + this.half) / this.cellSize;
    const gz = (z + this.half) / this.cellSize;
    let i = Math.floor(gx);
    let j = Math.floor(gz);
    const max = this.resolution - 1;
    if (i < 0) i = 0; else if (i > max) i = max;
    if (j < 0) j = 0; else if (j > max) j = max;
    let fx = gx - i;
    let fz = gz - j;
    fx = fx < 0 ? 0 : fx > 1 ? 1 : fx;
    fz = fz < 0 ? 0 : fz > 1 ? 1 : fz;
    const a = this.vertexHeight(i, j);
    const b = this.vertexHeight(i + 1, j);
    const c = this.vertexHeight(i, j + 1);
    const d = this.vertexHeight(i + 1, j + 1);
    if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
    return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  }

  getNormal(x, z) {
    const e = this.cellSize * 0.5;
    const hl = this.getHeight(x - e, z);
    const hr = this.getHeight(x + e, z);
    const hd = this.getHeight(x, z - e);
    const hu = this.getHeight(x, z + e);
    const nx = hl - hr;
    const ny = 2 * e;
    const nz = hd - hu;
    const len = Math.hypot(nx, ny, nz);
    return [nx / len, ny / len, nz / len];
  }
}
