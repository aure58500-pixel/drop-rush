export const TAU = Math.PI * 2;
export const DEG2RAD = Math.PI / 180;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Frame-rate independent exponential smoothing.
export function damp(current, target, rate, dt) {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function dampAngle(current, target, rate, dt) {
  const delta = wrapAngle(target - current);
  return current + delta * (1 - Math.exp(-rate * dt));
}

export function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz;
  let t = len2 > 0 ? ((px - ax) * abx + (pz - az) * abz) / len2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t - px;
  const cz = az + abz * t - pz;
  return Math.sqrt(cx * cx + cz * cz);
}

// Closest point on a polyline: { distance, index (segment), t (0..1 on segment) }.
export function closestOnPolyline2D(px, pz, points, out = { distance: 0, index: 0, t: 0 }) {
  out.distance = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i][0];
    const az = points[i][1];
    const abx = points[i + 1][0] - ax;
    const abz = points[i + 1][1] - az;
    const len2 = abx * abx + abz * abz;
    const t = len2 > 0 ? clamp(((px - ax) * abx + (pz - az) * abz) / len2, 0, 1) : 0;
    const d = Math.hypot(ax + abx * t - px, az + abz * t - pz);
    if (d < out.distance) {
      out.distance = d;
      out.index = i;
      out.t = t;
    }
  }
  return out;
}

export function distanceToPolyline2D(px, pz, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distanceToSegment2D(px, pz, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

function channelToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// '#rrggbb' (sRGB) -> [r, g, b] in linear space, as expected by vertex colors.
export function hexToLinear(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [
    channelToLinear(((n >> 16) & 255) / 255),
    channelToLinear(((n >> 8) & 255) / 255),
    channelToLinear((n & 255) / 255),
  ];
}
