// Deterministic pseudo-random tools shared by every client (same seed => same world).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit hash, used to derive independent seeds from one root seed.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function deriveSeed(seed, salt) {
  return hashString(`${seed}:${salt}`);
}

export class SeededRandom {
  constructor(seed) {
    this.next = mulberry32(seed);
  }

  float() {
    return this.next();
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(probability) {
    return this.next() < probability;
  }

  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

// 2D value noise with fractal sum, output in [0, 1].
export function createValueNoise2D(seed) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const values = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) values[i] = rng();

  const lattice = (ix, iz) => values[perm[(perm[ix & 255] + (iz & 255)) & 511]];

  function noise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  function fbm(x, z, octaves = 4, lacunarity = 2, gain = 0.5) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let freq = 1;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * freq, z * freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise, fbm };
}
