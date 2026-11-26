// Samouraï Rouge: black kabuto with gold brim, golden horns and red crest,
// red and gold cheek guards, red mask, black armor with red plates and gold
// trims, red scarf with a white emblem on the back.
import { body, box, cone, ell, face, HEAD, headBand, headZ, limbRing, limbs, lowerMask, pelvisZ, sym, torsoBand, torsoZ } from './kit.js';

const C = {
  black: '#1c1c23', red: '#c9212c', redDark: '#8e1620', gold: '#e3a72b', white: '#f6f4ee',
};

// Golden horn curving outward then up: two cone segments.
function horn(side) {
  const base = [0.07 * side, 0.64, 0.2];
  const d1 = [0.55 * side, 1, 0.25];
  const l1 = Math.hypot(...d1);
  const u1 = d1.map((v) => v / l1);
  const end1 = base.map((v, i) => v + u1[i] * 0.16);
  const d2 = [0.12 * side, 1, -0.15];
  const l2 = Math.hypot(...d2);
  const u2 = d2.map((v) => v / l2);
  return [
    cone('neck', [0.04, 0.026, 0.17], base.map((v, i) => v + u1[i] * 0.08), C.gold, { dir: d1, seg: [6] }),
    cone('neck', [0.026, 0.004, 0.15], end1.map((v, i) => v + u2[i] * 0.07), C.gold, { dir: d2, seg: [6] }),
  ];
}

export default {
  id: 'samourai_rouge',
  name: 'Samouraï Rouge',
  ui: { primary: C.red, secondary: C.black, accent: C.gold },
  parts: {
    head: face(),
    hat: [
      // Helmet dome, tilted back so the eyes stay visible.
      ell('neck', [0.345, 0.31, 0.33], [0, HEAD.y + 0.05, HEAD.z - 0.01], C.black, { n: 3, seg: [10, 5], half: true, r: [-0.35, 0, 0] }),
      headBand(0.49, 0.032, C.gold, 0.03),
      // Neck guard (shikoro): red layers with a gold line, flaring on the sides and the back.
      ell('neck', [0.4, 0.12, 0.33], [0, 0.31, HEAD.z - 0.1], C.red, { n: 4, seg: [10, 3] }),
      ell('neck', [0.408, 0.022, 0.338], [0, 0.23, HEAD.z - 0.1], C.gold, { n: 4, seg: [10, 3] }),
      ell('neck', [0.415, 0.06, 0.34], [0, 0.17, HEAD.z - 0.11], C.redDark, { n: 4, seg: [10, 3] }),
      // Crest and horns.
      box('neck', [0.15, 0.085, 0.03], [0, 0.6, 0.27], C.gold, { r: [-0.35, 0, 0] }),
      ell('neck', [0.045, 0.045, 0.03], [0, 0.6, 0.29], C.red, { n: 2, seg: [6, 3] }),
      ...horn(1),
      ...horn(-1),
      // Cheek guards with a gold frame and motif.
      ...sym(box('neck', [0.055, 0.19, 0.165], [0.358, 0.31, 0.06], C.gold)),
      ...sym(box('neck', [0.05, 0.17, 0.15], [0.37, 0.31, 0.065], C.red)),
      ...sym(box('neck', [0.012, 0.05, 0.05], [0.397, 0.33, 0.07], C.gold, { r: [Math.PI / 4, 0, 0] })),
    ],
    mask: [lowerMask(C.red)],
    torso: [
      // Scarf around the neck, hanging on the back with a white emblem.
      ell('spine', [0.21, 0.06, 0.17], [0, 0.43, 0], C.red, { n: 4, seg: [10, 3] }),
      box('spine', [0.2, 0.06, 0.03], [0, 0.39, torsoZ(0, 0.39, 1, 0.01)], C.red),
      box('spine', [0.17, 0.3, 0.022], [0, 0.25, torsoZ(0, 0.25, -1, 0.02)], C.red),
      box('spine', [0.025, 0.09, 0.012], [0, 0.25, torsoZ(0, 0.25, -1, 0.035)], C.white),
      ...sym(box('spine', [0.02, 0.07, 0.012], [0.03, 0.235, torsoZ(0, 0.25, -1, 0.035)], C.white, { r: [0, 0, -0.65] })),
      // Gold V collar and red chest plate.
      ...sym(box('spine', [0.03, 0.18, 0.02], [0.06, 0.31, torsoZ(0.06, 0.31)], C.gold, { r: [0, 0, -0.5] })),
      box('spine', [0.33, 0.15, 0.024], [0, 0.13, torsoZ(0, 0.13, 1, 0.002)], C.gold),
      box('spine', [0.3, 0.12, 0.03], [0, 0.13, torsoZ(0, 0.13, 1, 0.008)], C.red),
    ],
    belt: [
      torsoBand(0.03, 0.05, C.red),
      box('spine', [0.07, 0.045, 0.02], [0, 0.03, torsoZ(0, 0.03, 1, 0.02)], C.gold),
      ...sym(box('spine', [0.05, 0.16, 0.02], [0.05, -0.07, torsoZ(0, 0.03, 1, 0.022)], C.red, { r: [0, 0, -0.08] })),
      // Tassets (kusazuri) around the hips.
      ...sym(box('hips', [0.12, 0.15, 0.026], [0.1, -0.07, pelvisZ(0.1, -0.07, 1, 0.012)], C.red)),
      ...sym(box('hips', [0.122, 0.02, 0.03], [0.1, -0.15, pelvisZ(0.1, -0.07, 1, 0.014)], C.gold)),
      ...sym(box('hips', [0.026, 0.15, 0.13], [0.212, -0.07, 0], C.red)),
      ...sym(box('hips', [0.03, 0.02, 0.132], [0.214, -0.15, 0], C.gold)),
    ],
    arms: [
      // Shoulder guards (sode): two red plates with gold edges.
      ...limbs(box('arm', [0.165, 0.022, 0.205], [0.06, -0.012, 0], C.gold, { r: [0, 0, -0.35] })),
      ...limbs(box('arm', [0.16, 0.05, 0.2], [0.045, 0.02, 0], C.red, { r: [0, 0, -0.35] })),
      ...limbs(box('arm', [0.15, 0.045, 0.19], [0.075, -0.045, 0], C.red, { r: [0, 0, -0.55] })),
      ...limbRing('elbow', 0.0, 0.077, 0.02, C.gold),
      ...limbRing('elbow', -0.1, 0.076, 0.03, C.red),
    ],
    legs: [
      ...limbRing('knee', -0.04, 0.087, 0.018, C.gold),
      ...limbRing('knee', -0.13, 0.087, 0.018, C.gold),
      ...limbs(box('ankle', [0.05, 0.03, 0.02], [0, -0.03, 0.18], C.gold)),
    ],
    base: body({
      torso: C.black, pelvis: C.black, upperArm: C.black, forearm: C.black,
      thigh: C.black, shin: C.black, shoe: C.black, sole: C.gold,
    }),
  },
};
