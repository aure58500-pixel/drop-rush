// Collects map shapes in world space from a local placement frame.
// Shape kinds (all rendered with PartBuilder, colliders built from the same data):
//   box  : { shape: 'box', x, y, z, hx, hy, hz, yaw, color, collide, material }
//   ramp : { shape: 'ramp', x, y, z, hx, hy, hz, yaw, color, collide }   (solid, rises toward local +Z)
//   cyl  : { shape: 'cyl', x, z, radius, y0, y1, collide, userData }       (collider only, drawn with parts)
//   part : { shape: 'part', part, water? }                                   (decor, never collides)
// Generators also report loot spots, walking routes (accessibility checks),
// instanced props and trampolines through the shared context.
export class StructureList {
  constructor() {
    this.shapes = [];
    this.instances = []; // { template, x, y, z, yaw, scale }
    this.lootSpots = []; // { x, y, z, indoor }
    this.routes = []; // { name, points: [[x, y, z], ...], target: y }
    this.labels = []; // { name, type } for reports
  }

  add(shape) {
    this.shapes.push(shape);
    return shape;
  }
}

// Local frame: origin (x, y, z), rotation yaw around Y (Three.js convention).
export class Placement {
  constructor(list, x, y, z, yaw = 0) {
    this.list = list;
    this.x = x;
    this.y = y;
    this.z = z;
    this.yaw = yaw;
    this.cos = Math.cos(yaw);
    this.sin = Math.sin(yaw);
  }

  toWorld(lx, lz) {
    return [this.x + lx * this.cos + lz * this.sin, this.z - lx * this.sin + lz * this.cos];
  }

  point(lx, ly, lz) {
    const [x, z] = this.toWorld(lx, lz);
    return [x, this.y + ly, z];
  }

  // Box from local min/max corners.
  box(x0, y0, z0, x1, y1, z1, color, { collide = true, material = 'stone' } = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return null;
    const [wx, wz] = this.toWorld((x0 + x1) / 2, (z0 + z1) / 2);
    return this.list.add({
      shape: 'box', x: wx, y: this.y + (y0 + y1) / 2, z: wz,
      hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: (z1 - z0) / 2,
      yaw: this.yaw, color, collide, material,
    });
  }

  // Solid ramp in the local box; rises toward local -Z (dir = -1) or +Z (dir = 1).
  ramp(x0, y0, z0, x1, y1, z1, color, { dir = -1, collide = true, material = 'stone' } = {}) {
    const [wx, wz] = this.toWorld((x0 + x1) / 2, (z0 + z1) / 2);
    return this.list.add({
      shape: 'ramp', x: wx, y: this.y + (y0 + y1) / 2, z: wz,
      hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: (z1 - z0) / 2,
      yaw: this.yaw + (dir < 0 ? Math.PI : 0), color, collide, material,
    });
  }

  // Decorative part given in local coordinates (PartBuilder spec, no collision).
  part(spec, { water = false } = {}) {
    const [lx = 0, ly = 0, lz = 0] = spec.p || [];
    const [wx, wz] = this.toWorld(lx, lz);
    const part = { ...spec, p: [wx, this.y + ly, wz], yaw: (spec.yaw || 0) + this.yaw };
    return this.list.add({ shape: 'part', part, water });
  }

  // Vertical cylinder collider (drawn separately with parts).
  cyl(lx, lz, radius, y0, y1, { userData = null, material = 'stone' } = {}) {
    const [x, z] = this.toWorld(lx, lz);
    return this.list.add({ shape: 'cyl', x, z, radius, y0: this.y + y0, y1: this.y + y1, collide: true, userData, material });
  }

  instance(template, lx, ly, lz, yaw = 0, scale = 1) {
    const [x, z] = this.toWorld(lx, lz);
    this.list.instances.push({ template, x, y: this.y + ly, z, yaw: yaw + this.yaw, scale });
  }

  loot(lx, ly, lz, indoor = true) {
    const [x, z] = this.toWorld(lx, lz);
    this.list.lootSpots.push({ x, y: this.y + ly, z, indoor });
  }

  route(name, localPoints, targetY) {
    this.list.routes.push({ name, points: localPoints.map(([lx, ly, lz]) => this.point(lx, ly, lz)), target: this.y + targetY });
  }

  // Wall segment along local X (axis 'x') or Z (axis 'z') with openings.
  // openings: [{ center, width, bottom, top }] measured along the wall and from y0.
  wall(axis, fixed, from, to, y0, height, thickness, openings, color, material = 'stone') {
    const sorted = [...openings].sort((a, b) => a.center - b.center);
    const segs = [];
    let cursor = from;
    for (const o of sorted) {
      const a = Math.max(from, o.center - o.width / 2);
      const b = Math.min(to, o.center + o.width / 2);
      if (a > cursor) segs.push([cursor, a, 0, height]);
      if (o.bottom > 0) segs.push([a, b, 0, o.bottom]);
      if (o.top < height) segs.push([a, b, o.top, height]);
      cursor = b;
    }
    if (cursor < to) segs.push([cursor, to, 0, height]);
    const t = thickness / 2;
    for (const [a, b, s0, s1] of segs) {
      if (axis === 'x') this.box(a, y0 + s0, fixed - t, b, y0 + s1, fixed + t, color, { material });
      else this.box(fixed - t, y0 + s0, a, fixed + t, y0 + s1, b, color, { material });
    }
  }

  // Straight solid stairs climbing toward -Z (dir = -1) or +Z (dir = 1). Returns the end z.
  stairs(xCenter, width, zStart, dir, y0, totalHeight, color, { rise = 0.25, run = 0.3, material = 'stone' } = {}) {
    const steps = Math.round(totalHeight / rise);
    const r = totalHeight / steps;
    for (let k = 1; k <= steps; k++) {
      const za = zStart + dir * (k - 1) * run;
      const zb = zStart + dir * k * run;
      this.box(xCenter - width / 2, y0, Math.min(za, zb), xCenter + width / 2, y0 + k * r, Math.max(za, zb), color, { material });
    }
    return zStart + dir * steps * run;
  }

  // Stairs climbing toward -X (dir = -1) or +X (dir = 1) along a local line z = zCenter.
  stairsX(zCenter, width, xStart, dir, y0, totalHeight, color, { rise = 0.25, run = 0.3, material = 'stone' } = {}) {
    const steps = Math.round(totalHeight / rise);
    const r = totalHeight / steps;
    for (let k = 1; k <= steps; k++) {
      const xa = xStart + dir * (k - 1) * run;
      const xb = xStart + dir * k * run;
      this.box(Math.min(xa, xb), y0, zCenter - width / 2, Math.max(xa, xb), y0 + k * r, zCenter + width / 2, color, { material });
    }
    return xStart + dir * steps * run;
  }
}
