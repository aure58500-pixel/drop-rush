// Accumulates flat-shaded, vertex-colored triangles in plain typed arrays.
// Used to merge hundreds of shapes into a few draw calls. No Three.js dependency.
import { hexToLinear } from '../core/utils/math.js';

const colorCache = new Map();
function linearColor(hex) {
  let c = colorCache.get(hex);
  if (!c) {
    c = hexToLinear(hex);
    colorCache.set(hex, c);
  }
  return c;
}

export class GeometryBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
  }

  get triangleCount() {
    return this.positions.length / 9;
  }

  // Convex planar polygon; winding is fixed so the normal points away from `inside`.
  polygon(verts, inside, rgb, shade = 1) {
    const [a, b, c] = verts;
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-10) return;
    nx /= len; ny /= len; nz /= len;
    let cx = 0, cy = 0, cz = 0;
    for (const v of verts) { cx += v[0]; cy += v[1]; cz += v[2]; }
    cx /= verts.length; cy /= verts.length; cz /= verts.length;
    let list = verts;
    if ((cx - inside[0]) * nx + (cy - inside[1]) * ny + (cz - inside[2]) * nz < 0) {
      list = [...verts].reverse();
      nx = -nx; ny = -ny; nz = -nz;
    }
    // Top faces slightly brighter, bottom faces darker: readable low-poly volumes.
    const s = shade * (ny > 0.5 ? 1.08 : ny < -0.5 ? 0.7 : 0.94);
    const r = rgb[0] * s, g = rgb[1] * s, bl = rgb[2] * s;
    for (let i = 1; i < list.length - 1; i++) {
      for (const v of [list[0], list[i], list[i + 1]]) {
        this.positions.push(v[0], v[1], v[2]);
        this.normals.push(nx, ny, nz);
        this.colors.push(r, g, bl);
      }
    }
  }

  // Transform local corner list with yaw + translation.
  static transform(local, x, y, z, yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return local.map(([lx, ly, lz]) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c]);
  }

  box(x, y, z, hx, hy, hz, yaw, hex, shade = 1) {
    const v = GeometryBuilder.transform([
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
      [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz],
    ], x, y, z, yaw);
    const inside = [x, y, z];
    const rgb = linearColor(hex);
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
    for (const f of faces) this.polygon(f.map((i) => v[i]), inside, rgb, shade);
  }

  // Ramp rising toward local +Z. thickness Infinity => solid wedge.
  ramp(x, y, z, hx, hy, hz, yaw, thickness, hex, shade = 1) {
    const rgb = linearColor(hex);
    if (!Number.isFinite(thickness) || thickness >= 2 * hy) {
      const v = GeometryBuilder.transform([
        [-hx, -hy, -hz], [hx, -hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz],
      ], x, y, z, yaw);
      const inside = GeometryBuilder.transform([[0, -hy * 0.33, hz * 0.33]], x, y, z, yaw)[0];
      const faces = [[0, 1, 3, 2], [2, 3, 5, 4], [0, 1, 5, 4], [0, 2, 4], [1, 3, 5]];
      for (const f of faces) this.polygon(f.map((i) => v[i]), inside, rgb, shade);
      return;
    }
    const t = thickness;
    const v = GeometryBuilder.transform([
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, hz], [-hx, hy, hz],
      [-hx, -hy - t, -hz], [hx, -hy - t, -hz], [hx, hy - t, hz], [-hx, hy - t, hz],
    ], x, y, z, yaw);
    const inside = GeometryBuilder.transform([[0, -t / 2, 0]], x, y, z, yaw)[0];
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
    for (const f of faces) this.polygon(f.map((i) => v[i]), inside, rgb, shade);
  }

  // Gable roof prism, ridge along local X at the top.
  prism(x, y, z, hx, hy, hz, yaw, hex, shade = 1) {
    const v = GeometryBuilder.transform([
      [-hx, -hy, -hz], [hx, -hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [-hx, hy, 0], [hx, hy, 0],
    ], x, y, z, yaw);
    const inside = [x, y - hy * 0.5, z];
    const rgb = linearColor(hex);
    const faces = [[0, 1, 5, 4], [2, 3, 5, 4], [0, 2, 4], [1, 3, 5], [0, 1, 3, 2]];
    for (const f of faces) this.polygon(f.map((i) => v[i]), inside, rgb, shade);
  }

  shape(s, shade = 1) {
    if (s.shape === 'box') this.box(s.x, s.y, s.z, s.hx, s.hy, s.hz, s.yaw, s.color, shade);
    else if (s.shape === 'ramp') this.ramp(s.x, s.y, s.z, s.hx, s.hy, s.hz, s.yaw, s.thickness, s.color, shade);
    else if (s.shape === 'prism') this.prism(s.x, s.y, s.z, s.hx, s.hy, s.hz, s.yaw, s.color, shade);
  }

  toArrays() {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
    };
  }
}
