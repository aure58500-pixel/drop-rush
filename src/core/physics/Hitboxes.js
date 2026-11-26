// Analytic ray tests for character hitboxes (vertical capsule body + head sphere).
// Directions must be normalized. Functions return the entry distance or -1.

export function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = ox - cx;
  const ly = oy - cy;
  const lz = oz - cz;
  const b = lx * dx + ly * dy + lz * dz;
  const c = lx * lx + ly * ly + lz * lz - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? 0 : t;
}

// Vertical capsule: segment from (x, y0 + r, z) to (x, y1 - r, z) with radius r.
export function rayVerticalCapsule(ox, oy, oz, dx, dy, dz, x, y0, y1, z, r) {
  const a = y0 + r;
  const b = Math.max(a, y1 - r);
  let best = Infinity;
  // Cylinder part.
  const px = ox - x;
  const pz = oz - z;
  const qa = dx * dx + dz * dz;
  if (qa > 1e-12) {
    const qb = 2 * (px * dx + pz * dz);
    const qc = px * px + pz * pz - r * r;
    const disc = qb * qb - 4 * qa * qc;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      for (const t of [(-qb - s) / (2 * qa), (-qb + s) / (2 * qa)]) {
        if (t < 0) continue;
        const y = oy + dy * t;
        if (y >= a && y <= b && t < best) {
          best = t;
          break;
        }
      }
      if (qc <= 0) {
        const y = oy;
        if (y >= a && y <= b) best = 0; // origin inside the cylinder part
      }
    }
  }
  for (const cy of [a, b]) {
    const t = raySphere(ox, oy, oz, dx, dy, dz, x, cy, z, r);
    if (t >= 0 && t < best) best = t;
  }
  return Number.isFinite(best) ? best : -1;
}

// Distance from a point to a vertical capsule surface (0 if inside).
export function distanceToVerticalCapsule(px, py, pz, x, y0, y1, z, r) {
  const a = y0 + r;
  const b = Math.max(a, y1 - r);
  const cy = Math.min(Math.max(py, a), b);
  return Math.max(0, Math.hypot(px - x, py - cy, pz - z) - r);
}
