// Building blocks shared by every character: the common chibi base (head,
// face, body, hands, legs, shoes) and helpers that place pieces on its surface.
// Coordinates are local to the joints of JOINT_LAYOUT (player/CharacterBuilder.js).

export const SKIN_TONE = '#f2bd8e';
export const EYE_COLOR = '#1a1a20';

export const ell = (j, size, p, c, o = {}) => ({ s: 'ell', j, size, p, c, ...o });
export const box = (j, size, p, c, o = {}) => ({ s: 'box', j, size, p, c, ...o });
export const cone = (j, size, p, c, o = {}) => ({ s: 'cone', j, size, p, c, ...o });

// Mirror a spec across X (same joint, or L -> R for limb joints).
function mirrored(spec, joint) {
  const [x = 0, y = 0, z = 0] = spec.p || [];
  const m = { ...spec, j: joint, p: [-x, y, z] };
  if (spec.r) m.r = [spec.r[0], -spec.r[1], -spec.r[2]];
  if (spec.dir) m.dir = [-spec.dir[0], spec.dir[1], spec.dir[2]];
  return m;
}

// Symmetric pair on a central joint (head, spine, hips).
export const sym = (spec) => [spec, mirrored(spec, spec.j)];

// Same piece on both limbs. `spec.j` is 'arm' | 'elbow' | 'leg' | 'knee' | 'ankle';
// x > 0 points outward (away from the body) on both sides.
export const limbs = (spec) => [{ ...spec, j: `${spec.j}L` }, mirrored(spec, `${spec.j}R`)];

// ---------- Head ----------
export const HEAD = { y: 0.34, z: 0.01, r: [0.31, 0.3, 0.28], n: 4 };

const superRoot = (v, n) => Math.max(0, 1 - v) ** (1 / n);

// Horizontal radii of the head at local height y (plus `grow`).
export function headSection(y, grow = 0) {
  const f = superRoot((Math.abs(y - HEAD.y) / HEAD.r[1]) ** HEAD.n, HEAD.n);
  return [HEAD.r[0] * f + grow, HEAD.r[2] * f + grow];
}

// Z of the front (+1) or back (-1) surface of the head at (x, y).
export function headZ(x, y, side = 1, out = 0) {
  const [rx, rz] = headSection(y);
  return HEAD.z + side * (rz * superRoot((Math.abs(x) / rx) ** HEAD.n, HEAD.n) + out);
}

// Ring around the head (bandanas, headbands, brims).
export function headBand(y, h, color, grow = 0.014) {
  const [rx, rz] = headSection(y, grow);
  return ell('neck', [rx, h, rz], [0, y, HEAD.z], color, { n: 6, seg: [12, 3] });
}

// Hair cap tilted back so the forehead stays visible.
export function hairCap(color, { tilt = -0.55, grow = 0.02, seg = [10, 5] } = {}) {
  return ell('neck', [HEAD.r[0] + grow, HEAD.r[1] + grow * 0.5, HEAD.r[2] + grow], [0, HEAD.y + 0.03, HEAD.z - 0.01], color, {
    n: 4, seg, half: true, r: [tilt, 0, 0],
  });
}

// Hair spike: theta = angle from vertical, phi = 0 at the back, +-PI at the front, > 0 toward +X.
export function spike(color, theta, phi, len = 0.2, radius = 0.08, flat = 0.55) {
  const d = [Math.sin(theta) * Math.sin(phi), Math.cos(theta), -Math.sin(theta) * Math.cos(phi)];
  const base = 0.27;
  const k = base + len * 0.5;
  return cone('neck', [radius, 0, len], [d[0] * k, HEAD.y + 0.04 + d[1] * k, HEAD.z - 0.01 + d[2] * k], color, {
    dir: d, sc: [1, 1, flat], seg: [6],
  });
}

export function lowerMask(color) {
  const [rx, rz] = headSection(0.2, 0.012);
  return ell('neck', [rx, 0.14, rz], [0, 0.18, HEAD.z + 0.004], color, { n: 4, seg: [12, 4] });
}

export function face({ skin = SKIN_TONE, eyes = EYE_COLOR, brows = true } = {}) {
  const parts = [
    ell('neck', HEAD.r, [0, HEAD.y, HEAD.z], skin, { n: HEAD.n, seg: [12, 8] }),
    ...sym(box('neck', [0.055, 0.085, 0.03], [0.1, 0.36, headZ(0.1, 0.36, 1, -0.006)], eyes)),
  ];
  if (brows) parts.push(...sym(box('neck', [0.1, 0.028, 0.04], [0.1, 0.44, headZ(0.1, 0.44, 1, -0.008)], eyes, { r: [0, 0, 0.32] })));
  return parts;
}

// ---------- Torso and hips ----------
export const TORSO = { y: 0.2, r: [0.23, 0.25, 0.16], n: 4 };
export const PELVIS = { y: -0.01, r: [0.2, 0.1, 0.145], n: 4 };

function bodySection(shape, y, grow = 0) {
  const f = superRoot((Math.abs(y - shape.y) / shape.r[1]) ** shape.n, shape.n);
  return [shape.r[0] * f + grow, shape.r[2] * f + grow];
}

// Z of the torso surface at (x, y): side = 1 front, -1 back.
export function torsoZ(x, y, side = 1, out = 0.004) {
  const [rx, rz] = bodySection(TORSO, y);
  return side * (rz * superRoot((Math.abs(x) / rx) ** TORSO.n, TORSO.n) + out);
}

export function pelvisZ(x, y, side = 1, out = 0.004) {
  const [rx, rz] = bodySection(PELVIS, y);
  return side * (rz * superRoot((Math.abs(x) / rx) ** PELVIS.n, PELVIS.n) + out);
}

// Ring around the torso (belts, sashes, hems).
export function torsoBand(y, h, color, grow = 0.016) {
  const [rx, rz] = bodySection(TORSO, y, grow);
  return ell('spine', [rx, h, rz], [0, y, 0], color, { n: 6, seg: [10, 3] });
}

// Ring around a limb joint at local y.
export function limbRing(j, y, radius, h, color) {
  return limbs(ell(j, [radius, h, radius], [0, y, 0], color, { n: 3, seg: [6, 3] }));
}

/**
 * Common body. Colors: torso, pelvis, upperArm, forearm, hands, thigh, shin, shoe, sole.
 * Optional: thighSize (radii) for wide shorts or coats.
 */
export function body(c) {
  return [
    ell('spine', TORSO.r, [0, TORSO.y, 0], c.torso, { n: TORSO.n, seg: [10, 5] }),
    ell('hips', PELVIS.r, [0, PELVIS.y, 0], c.pelvis, { n: PELVIS.n, seg: [8, 4] }),
    ...limbs(ell('arm', [0.075, 0.11, 0.075], [0, -0.075, 0], c.upperArm, { n: 3, seg: [6, 4] })),
    ...limbs(ell('elbow', [0.07, 0.1, 0.07], [0, -0.08, 0], c.forearm, { n: 3, seg: [6, 4] })),
    ...limbs(ell('elbow', [0.08, 0.08, 0.075], [0, -0.2, 0.01], c.hands || SKIN_TONE, { n: 2.4, seg: [6, 4] })),
    ...limbs(ell('leg', c.thighSize || [0.09, 0.12, 0.095], [0, -0.09, 0], c.thigh, { n: 3, seg: [6, 4] })),
    ...limbs(ell('knee', [0.08, 0.115, 0.085], [0, -0.1, 0], c.shin, { n: 3, seg: [6, 4] })),
    ...limbs(ell('ankle', [0.1, 0.065, 0.15], [0, -0.055, 0.035], c.shoe, { n: 3, seg: [6, 4] })),
    ...limbs(box('ankle', [0.19, 0.03, 0.29], [0, -0.1, 0.035], c.sole)),
  ];
}
