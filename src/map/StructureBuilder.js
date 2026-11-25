// Collects solid shapes (boxes, ramps, roof prisms) in world space with a
// local placement frame. Shapes are later rendered (merged meshes) and turned
// into colliders, so visuals and collisions always match.
export class StructureList {
  constructor() {
    this.shapes = [];
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

  // Box from local min/max corners.
  box(x0, y0, z0, x1, y1, z1, color, { collide = true, material = 'stone', shadow = true } = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return null;
    const [wx, wz] = this.toWorld((x0 + x1) / 2, (z0 + z1) / 2);
    return this.list.add({
      shape: 'box', x: wx, y: this.y + (y0 + y1) / 2, z: wz,
      hx: (x1 - x0) / 2, hy: (y1 - y0) / 2, hz: (z1 - z0) / 2,
      yaw: this.yaw, color, collide, material, shadow,
    });
  }

  // Ramp occupying local box; surface rises toward local +Z when localYaw = 0.
  ramp(x0, y0, z0, x1, y1, z1, color, { localYaw = 0, thickness = Infinity, collide = true, material = 'stone' } = {}) {
    const [wx, wz] = this.toWorld((x0 + x1) / 2, (z0 + z1) / 2);
    const swap = Math.abs(Math.sin(localYaw)) > 0.5;
    const hx = (swap ? z1 - z0 : x1 - x0) / 2;
    const hz = (swap ? x1 - x0 : z1 - z0) / 2;
    return this.list.add({
      shape: 'ramp', x: wx, y: this.y + (y0 + y1) / 2, z: wz,
      hx, hy: (y1 - y0) / 2, hz, yaw: this.yaw + localYaw, thickness, color, collide, material, shadow: true,
    });
  }

  // Gable roof: ridge along local X, base at y0, height h.
  roof(x0, z0, x1, z1, y0, h, color, { material = 'wood' } = {}) {
    const [wx, wz] = this.toWorld((x0 + x1) / 2, (z0 + z1) / 2);
    return this.list.add({
      shape: 'prism', x: wx, y: this.y + y0 + h / 2, z: wz,
      hx: (x1 - x0) / 2, hy: h / 2, hz: (z1 - z0) / 2, yaw: this.yaw, color, collide: true, material, shadow: true,
    });
  }

  // Wall segment along local X (axis 'x') or Z (axis 'z') with openings.
  // openings: [{ center, width, bottom, top }] measured along the wall and from y0.
  wall(axis, fixed, from, to, y0, height, thickness, openings, color, trim, material = 'stone') {
    const sorted = [...openings].sort((a, b) => a.center - b.center);
    const segs = [];
    let cursor = from;
    for (const o of sorted) {
      const a = o.center - o.width / 2;
      const b = o.center + o.width / 2;
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
    if (!trim) return;
    // Decorative frames and sills (no collision).
    for (const o of sorted) {
      const a = o.center - o.width / 2;
      const b = o.center + o.width / 2;
      const deco = { collide: false, shadow: false };
      const e = t + 0.05;
      if (axis === 'x') {
        this.box(a - 0.08, y0 + o.top, fixed - e, b + 0.08, y0 + o.top + 0.12, fixed + e, trim, deco);
        if (o.bottom > 0) this.box(a - 0.1, y0 + o.bottom - 0.1, fixed - e - 0.06, b + 0.1, y0 + o.bottom, fixed + e + 0.06, trim, deco);
      } else {
        this.box(fixed - e, y0 + o.top, a - 0.08, fixed + e, y0 + o.top + 0.12, b + 0.08, trim, deco);
        if (o.bottom > 0) this.box(fixed - e - 0.06, y0 + o.bottom - 0.1, a - 0.1, fixed + e + 0.06, y0 + o.bottom, b + 0.1, trim, deco);
      }
    }
  }

  // Straight solid stairs climbing toward -Z (dir = -1) or +Z (dir = 1).
  stairs(xCenter, width, zStart, dir, y0, totalHeight, color, { rise = 0.25, run = 0.3, material = 'wood' } = {}) {
    const steps = Math.round(totalHeight / rise);
    const r = totalHeight / steps;
    for (let k = 1; k <= steps; k++) {
      const za = zStart + dir * (k - 1) * run;
      const zb = zStart + dir * k * run;
      this.box(xCenter - width / 2, y0, Math.min(za, zb), xCenter + width / 2, y0 + k * r, Math.max(za, zb), color, { material });
    }
    return zStart + dir * steps * run;
  }
}
