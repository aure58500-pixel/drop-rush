// Static collision world: yaw-oriented boxes, ramps (sloped boxes), vertical
// cylinders and a heightfield terrain. Colliders are stored in a uniform XZ grid.
// Pure JavaScript (no Three.js) so it can be reused by gameplay and tooling.
import { clamp } from '../utils/math.js';

export const ColliderType = Object.freeze({ BOX: 1, RAMP: 2, CYLINDER: 3 });

const EPS = 1e-7;
const HALF_PI = Math.PI / 2;
const TAU = Math.PI * 2;

const _hit = { nx: 0, nz: 0, depth: 0, lz: 0 };
const _span = { bottom: 0, top: 0 };

function circleVsCollider(c, px, pz, r, out) {
  if (c.type === ColliderType.CYLINDER) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const rr = r + c.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return false;
    const d = Math.sqrt(d2);
    if (d > EPS) {
      out.nx = dx / d;
      out.nz = dz / d;
    } else {
      out.nx = 1;
      out.nz = 0;
    }
    out.depth = rr - d;
    out.lz = 0;
    return true;
  }
  const dx = px - c.x;
  const dz = pz - c.z;
  const lx = dx * c.cos - dz * c.sin;
  const lz = dx * c.sin + dz * c.cos;
  const qx = clamp(lx, -c.hx, c.hx);
  const qz = clamp(lz, -c.hz, c.hz);
  const ex = lx - qx;
  const ez = lz - qz;
  const d2 = ex * ex + ez * ez;
  if (d2 >= r * r) return false;
  let nlx;
  let nlz;
  let depth;
  if (d2 > EPS) {
    const d = Math.sqrt(d2);
    nlx = ex / d;
    nlz = ez / d;
    depth = r - d;
  } else {
    // Center inside the footprint: leave through the closest face.
    let m = c.hx - lx;
    nlx = 1;
    nlz = 0;
    if (lx + c.hx < m) { m = lx + c.hx; nlx = -1; nlz = 0; }
    if (c.hz - lz < m) { m = c.hz - lz; nlx = 0; nlz = 1; }
    if (lz + c.hz < m) { m = lz + c.hz; nlx = 0; nlz = -1; }
    depth = m + r;
  }
  out.nx = nlx * c.cos + nlz * c.sin;
  out.nz = -nlx * c.sin + nlz * c.cos;
  out.depth = depth;
  out.lz = qz;
  return true;
}

function rampSurface(c, lz) {
  return c.y + clamp(lz, -c.hz, c.hz) * c.k;
}

// Vertical extent of a collider at local z (only matters for ramps).
function verticalSpan(c, lz, out) {
  if (c.type === ColliderType.BOX) {
    out.bottom = c.y - c.hy;
    out.top = c.y + c.hy;
  } else if (c.type === ColliderType.CYLINDER) {
    out.bottom = c.y0;
    out.top = c.y1;
  } else {
    const top = rampSurface(c, lz);
    out.top = top;
    out.bottom = Number.isFinite(c.thickness) ? Math.max(c.y - c.hy, top - c.thickness) : c.y - c.hy;
  }
  return out;
}

// Convex clipping state for ray tests.
let _tEnter = 0;
let _tExit = 0;
let _nx = 0;
let _ny = 0;
let _nz = 0;

function clipPlane(nx, ny, nz, d, ox, oy, oz, dx, dy, dz) {
  const denom = nx * dx + ny * dy + nz * dz;
  const dist = nx * ox + ny * oy + nz * oz - d;
  if (Math.abs(denom) < EPS) return dist <= 0;
  const t = -dist / denom;
  if (denom < 0) {
    if (t > _tEnter) {
      _tEnter = t;
      _nx = nx;
      _ny = ny;
      _nz = nz;
    }
  } else if (t < _tExit) {
    _tExit = t;
  }
  return _tEnter <= _tExit;
}

export class CollisionWorld {
  constructor({ cellSize = 8 } = {}) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.colliders = new Map();
    this.terrain = null;
    this.lastGround = null;
    this._nextId = 1;
    this._stamp = 0;
    this._result = [];
  }

  setTerrain(terrain) {
    this.terrain = terrain;
  }

  // Box centered on (x, y, z) with half extents, rotated by yaw around Y.
  addBox({ x, y, z, hx, hy, hz, yaw = 0, tag = 'stone', userData = null }) {
    let a = ((yaw % TAU) + TAU) % TAU;
    const quarter = a / HALF_PI;
    const rounded = Math.round(quarter);
    if (Math.abs(quarter - rounded) < 1e-4) {
      if (rounded % 2 === 1) [hx, hz] = [hz, hx];
      a = 0; // axis aligned fast path
    }
    return this._insert({ type: ColliderType.BOX, x, y, z, hx, hy, hz, yaw: a, cos: Math.cos(a), sin: Math.sin(a), tag, userData });
  }

  // Ramp: box volume whose top surface rises along local +Z from y-hy to y+hy.
  // thickness = Infinity makes a solid wedge, a finite value a sloped slab.
  addRamp({ x, y, z, hx, hy, hz, yaw = 0, thickness = Infinity, tag = 'stone', userData = null }) {
    return this._insert({
      type: ColliderType.RAMP, x, y, z, hx, hy, hz, yaw, cos: Math.cos(yaw), sin: Math.sin(yaw),
      k: hy / hz, thickness, tag, userData,
    });
  }

  addCylinder({ x, z, radius, y0, y1, tag = 'wood', userData = null }) {
    return this._insert({ type: ColliderType.CYLINDER, x, z, radius, y0, y1, tag, userData });
  }

  _insert(c) {
    c.id = this._nextId++;
    c._stamp = 0;
    if (c.type === ColliderType.CYLINDER) {
      c.minX = c.x - c.radius; c.maxX = c.x + c.radius;
      c.minZ = c.z - c.radius; c.maxZ = c.z + c.radius;
      c.minY = c.y0; c.maxY = c.y1;
    } else {
      const ac = Math.abs(c.cos);
      const as = Math.abs(c.sin);
      const ex = ac * c.hx + as * c.hz;
      const ez = as * c.hx + ac * c.hz;
      c.minX = c.x - ex; c.maxX = c.x + ex;
      c.minZ = c.z - ez; c.maxZ = c.z + ez;
      c.minY = c.y - c.hy; c.maxY = c.y + c.hy;
    }
    const cs = this.cellSize;
    c._cells = [];
    for (let ix = Math.floor(c.minX / cs); ix <= Math.floor(c.maxX / cs); ix++) {
      for (let iz = Math.floor(c.minZ / cs); iz <= Math.floor(c.maxZ / cs); iz++) {
        const key = this._key(ix, iz);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(c);
        c._cells.push(key);
      }
    }
    this.colliders.set(c.id, c);
    return c;
  }

  remove(c) {
    if (!c || !this.colliders.has(c.id)) return;
    for (const key of c._cells) {
      const cell = this.cells.get(key);
      if (!cell) continue;
      const i = cell.indexOf(c);
      if (i >= 0) {
        cell[i] = cell[cell.length - 1];
        cell.pop();
      }
    }
    this.colliders.delete(c.id);
  }

  _key(ix, iz) {
    return (ix + 32768) * 65536 + (iz + 32768);
  }

  // Colliders whose XZ bounds touch the rectangle. The returned array is reused.
  query(minX, minZ, maxX, maxZ) {
    const out = this._result;
    out.length = 0;
    const stamp = ++this._stamp;
    const cs = this.cellSize;
    const x1 = Math.floor(maxX / cs);
    const z1 = Math.floor(maxZ / cs);
    for (let ix = Math.floor(minX / cs); ix <= x1; ix++) {
      for (let iz = Math.floor(minZ / cs); iz <= z1; iz++) {
        const cell = this.cells.get(this._key(ix, iz));
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const c = cell[i];
          if (c._stamp === stamp) continue;
          c._stamp = stamp;
          if (c.maxX < minX || c.minX > maxX || c.maxZ < minZ || c.minZ > maxZ) continue;
          out.push(c);
        }
      }
    }
    return out;
  }

  // Pushes a vertical cylinder (feet at pos.y) out of solids. Obstacles whose top
  // is under feetY + stepAllowance are ignored (they are climbed by ground snap).
  // Writes contact normals in normalsOut and returns their count.
  resolveCylinder(pos, radius, height, stepAllowance, normalsOut) {
    const feetY = pos.y;
    const headY = feetY + height;
    let count = 0;
    for (let iter = 0; iter < 4; iter++) {
      let pushed = false;
      const list = this.query(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.maxY <= feetY + stepAllowance || c.minY >= headY) continue;
        if (!circleVsCollider(c, pos.x, pos.z, radius, _hit)) continue;
        verticalSpan(c, _hit.lz, _span);
        if (_span.top <= feetY + stepAllowance || _span.bottom >= headY) continue;
        pos.x += _hit.nx * (_hit.depth + 1e-4);
        pos.z += _hit.nz * (_hit.depth + 1e-4);
        if (normalsOut && count < normalsOut.length) {
          normalsOut[count].nx = _hit.nx;
          normalsOut[count].nz = _hit.nz;
          count++;
        }
        pushed = true;
      }
      if (!pushed) break;
    }
    return count;
  }

  // Highest walkable surface under the circle whose top is <= maxTop (terrain always counts).
  groundHeight(x, z, r, maxTop) {
    let best = this.terrain ? this.terrain.getHeight(x, z) : -Infinity;
    let bestCollider = null;
    const list = this.query(x - r, z - r, x + r, z + r);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.minY > maxTop) continue;
      if (!circleVsCollider(c, x, z, r, _hit)) continue;
      const top = verticalSpan(c, _hit.lz, _span).top;
      if (top <= maxTop && top > best) {
        best = top;
        bestCollider = c;
      }
    }
    this.lastGround = bestCollider;
    return best;
  }

  // Lowest underside above minBottom overlapping the circle (Infinity if none).
  ceilingHeight(x, z, r, minBottom) {
    let best = Infinity;
    const list = this.query(x - r, z - r, x + r, z + r);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.maxY < minBottom) continue;
      if (!circleVsCollider(c, x, z, r, _hit)) continue;
      const bottom = verticalSpan(c, _hit.lz, _span).bottom;
      if (bottom >= minBottom && bottom < best) best = bottom;
    }
    return best;
  }

  // Ray against colliders and terrain. Direction must be normalized.
  // Returns { distance, x, y, z, nx, ny, nz, collider, terrain } or null.
  raycast(ox, oy, oz, dx, dy, dz, maxDistance, { ignoreTerrain = false, filter = null } = {}) {
    let bestT = maxDistance;
    let best = null;
    let bnx = 0;
    let bny = 1;
    let bnz = 0;

    const cs = this.cellSize;
    let ix = Math.floor(ox / cs);
    let iz = Math.floor(oz / cs);
    const stepX = dx > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const adx = Math.abs(dx);
    const adz = Math.abs(dz);
    const tDeltaX = adx > EPS ? cs / adx : Infinity;
    const tDeltaZ = adz > EPS ? cs / adz : Infinity;
    let tMaxX = adx > EPS ? (dx > 0 ? (ix + 1) * cs - ox : ox - ix * cs) / adx : Infinity;
    let tMaxZ = adz > EPS ? (dz > 0 ? (iz + 1) * cs - oz : oz - iz * cs) / adz : Infinity;
    const stamp = ++this._stamp;
    let tCell = 0;
    let guard = Math.ceil(maxDistance / cs) * 2 + 4;

    while (tCell <= bestT && guard-- > 0) {
      const cell = this.cells.get(this._key(ix, iz));
      if (cell) {
        for (let i = 0; i < cell.length; i++) {
          const c = cell[i];
          if (c._stamp === stamp) continue;
          c._stamp = stamp;
          if (filter && !filter(c)) continue;
          const t = this._rayCollider(c, ox, oy, oz, dx, dy, dz);
          if (t >= 0 && t < bestT) {
            bestT = t;
            best = c;
            bnx = _nx;
            bny = _ny;
            bnz = _nz;
          }
        }
      }
      if (tMaxX < tMaxZ) {
        tCell = tMaxX;
        tMaxX += tDeltaX;
        ix += stepX;
      } else {
        tCell = tMaxZ;
        tMaxZ += tDeltaZ;
        iz += stepZ;
      }
      if (!Number.isFinite(tCell)) break;
    }

    let hitTerrain = false;
    if (this.terrain && !ignoreTerrain) {
      const t = this._rayTerrain(ox, oy, oz, dx, dy, dz, bestT);
      if (t < bestT) {
        bestT = t;
        best = null;
        hitTerrain = true;
      }
    }
    if (!best && !hitTerrain) return null;

    const x = ox + dx * bestT;
    const y = oy + dy * bestT;
    const z = oz + dz * bestT;
    if (hitTerrain) {
      const n = this.terrain.getNormal(x, z);
      bnx = n[0];
      bny = n[1];
      bnz = n[2];
    }
    return { distance: bestT, x, y, z, nx: bnx, ny: bny, nz: bnz, collider: best, terrain: hitTerrain };
  }

  // Returns entry distance (>= 0) or -1. Sets _nx/_ny/_nz to the world normal.
  _rayCollider(c, ox, oy, oz, dx, dy, dz) {
    if (c.type === ColliderType.CYLINDER) return this._rayCylinder(c, ox, oy, oz, dx, dy, dz);
    const rx = ox - c.x;
    const rz = oz - c.z;
    const lox = rx * c.cos - rz * c.sin;
    const loz = rx * c.sin + rz * c.cos;
    const loy = oy - c.y;
    const ldx = dx * c.cos - dz * c.sin;
    const ldz = dx * c.sin + dz * c.cos;
    const ldy = dy;
    _tEnter = -Infinity;
    _tExit = Infinity;
    _nx = 0; _ny = 0; _nz = 0;
    const { hx, hy, hz } = c;
    if (!clipPlane(1, 0, 0, hx, lox, loy, loz, ldx, ldy, ldz)) return -1;
    if (!clipPlane(-1, 0, 0, hx, lox, loy, loz, ldx, ldy, ldz)) return -1;
    if (!clipPlane(0, 0, 1, hz, lox, loy, loz, ldx, ldy, ldz)) return -1;
    if (!clipPlane(0, 0, -1, hz, lox, loy, loz, ldx, ldy, ldz)) return -1;
    if (!clipPlane(0, -1, 0, hy, lox, loy, loz, ldx, ldy, ldz)) return -1;
    if (c.type === ColliderType.BOX) {
      if (!clipPlane(0, 1, 0, hy, lox, loy, loz, ldx, ldy, ldz)) return -1;
    } else {
      // Sloped top: y - k * z <= 0, optional underside: -(y - k * z) <= thickness.
      if (!clipPlane(0, 1, -c.k, 0, lox, loy, loz, ldx, ldy, ldz)) return -1;
      if (Number.isFinite(c.thickness) && !clipPlane(0, -1, c.k, c.thickness, lox, loy, loz, ldx, ldy, ldz)) return -1;
    }
    if (_tExit < 0 || _tEnter < 0) return -1; // behind, or origin inside
    const len = Math.hypot(_nx, _ny, _nz) || 1;
    const nlx = _nx / len;
    const nly = _ny / len;
    const nlz = _nz / len;
    _nx = nlx * c.cos + nlz * c.sin;
    _ny = nly;
    _nz = -nlx * c.sin + nlz * c.cos;
    return _tEnter;
  }

  _rayCylinder(c, ox, oy, oz, dx, dy, dz) {
    let best = Infinity;
    const px = ox - c.x;
    const pz = oz - c.z;
    const a = dx * dx + dz * dz;
    if (a > EPS) {
      const b = 2 * (px * dx + pz * dz);
      const cc = px * px + pz * pz - c.radius * c.radius;
      const disc = b * b - 4 * a * cc;
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        const y = oy + dy * t;
        if (t >= 0 && y >= c.y0 && y <= c.y1) {
          best = t;
          _nx = (px + dx * t) / c.radius;
          _ny = 0;
          _nz = (pz + dz * t) / c.radius;
        }
      }
    }
    const capY = dy < -EPS ? c.y1 : dy > EPS ? c.y0 : null;
    if (capY !== null) {
      const t = (capY - oy) / dy;
      if (t >= 0 && t < best) {
        const hx = px + dx * t;
        const hz = pz + dz * t;
        if (hx * hx + hz * hz <= c.radius * c.radius) {
          best = t;
          _nx = 0;
          _ny = dy < 0 ? 1 : -1;
          _nz = 0;
        }
      }
    }
    return Number.isFinite(best) ? best : -1;
  }

  _rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
    const terrain = this.terrain;
    if (oy - terrain.getHeight(ox, oz) < 0) return 0;
    const step = Math.max(0.25, terrain.cellSize * 0.5);
    let t0 = 0;
    for (let t = step; ; t += step) {
      const tt = Math.min(t, maxT);
      const diff = oy + dy * tt - terrain.getHeight(ox + dx * tt, oz + dz * tt);
      if (diff < 0) {
        let lo = t0;
        let hi = tt;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) * 0.5;
          const d = oy + dy * mid - terrain.getHeight(ox + dx * mid, oz + dz * mid);
          if (d < 0) hi = mid;
          else lo = mid;
        }
        return hi;
      }
      if (tt >= maxT) return Infinity;
      t0 = tt;
    }
  }
}
