// Ninja Bleu: black spiky hair, navy headband with a shuriken and long tails,
// navy mask, sleeveless vest with light grey trims, knotted belt, wrapped shins.
import { body, box, ell, face, hairCap, headBand, headZ, limbRing, lowerMask, spike, sym, torsoBand, torsoZ } from './kit.js';

const C = {
  navy: '#2b3fc4', navyDark: '#1f2b85', belt: '#3a55e6', black: '#1d1e24',
  grey: '#c9ccd6', greyDark: '#8e919c', white: '#f6f6f8',
};

export default {
  id: 'ninja_bleu',
  name: 'Ninja Bleu',
  ui: { primary: C.navy, secondary: C.black, accent: C.grey },
  parts: {
    head: face(),
    hair: [
      hairCap(C.black),
      spike(C.black, 0.15, 0, 0.2, 0.085),
      spike(C.black, 0.55, 0.5, 0.22, 0.085),
      spike(C.black, 0.55, -0.5, 0.22, 0.085),
      spike(C.black, 0.85, 1.45, 0.2, 0.08),
      spike(C.black, 0.85, -1.45, 0.2, 0.08),
      spike(C.black, 0.9, 0, 0.24, 0.09),
      spike(C.black, 1.0, 0.85, 0.2, 0.08),
      spike(C.black, 1.0, -0.85, 0.2, 0.08),
      spike(C.black, 0.45, 2.5, 0.18, 0.075),
      spike(C.black, 0.45, -2.5, 0.18, 0.075),
    ],
    hat: [
      headBand(0.5, 0.048, C.navy),
      // Shuriken emblem.
      box('neck', [0.12, 0.026, 0.012], [0, 0.5, headZ(0, 0.5, 1, 0.022)], C.white),
      box('neck', [0.026, 0.12, 0.012], [0, 0.5, headZ(0, 0.5, 1, 0.022)], C.white),
      box('neck', [0.05, 0.05, 0.014], [0, 0.5, headZ(0, 0.5, 1, 0.024)], C.white, { r: [0, 0, Math.PI / 4] }),
      // Knot and the two long tails on the nape.
      box('neck', [0.1, 0.075, 0.05], [0, 0.5, headZ(0, 0.5, -1, 0.03)], C.navy),
      box('neck', [0.075, 0.36, 0.018], [0.05, 0.3, headZ(0, 0.3, -1, 0.06)], C.navy, { r: [-0.2, 0, 0.22] }),
      box('neck', [0.07, 0.3, 0.018], [-0.03, 0.32, headZ(0, 0.32, -1, 0.05)], C.navy, { r: [-0.15, 0, -0.12] }),
    ],
    mask: [lowerMask(C.navy)],
    torso: [
      // V collar and shoulder trims of the vest.
      ...sym(box('spine', [0.035, 0.22, 0.02], [0.06, 0.31, torsoZ(0.06, 0.31)], C.grey, { r: [0, 0, -0.45] })),
      ...sym(box('spine', [0.07, 0.03, 0.22], [0.18, 0.43, 0], C.grey)),
      ...sym(box('spine', [0.035, 0.24, 0.02], [0.06, 0.3, torsoZ(0.06, 0.3, -1)], C.grey, { r: [0, 0, 0.3] })),
    ],
    belt: [
      torsoBand(0.03, 0.05, C.belt),
      box('spine', [0.09, 0.075, 0.05], [0.11, 0.03, torsoZ(0.11, 0.03, 1, 0.025)], C.belt),
      box('spine', [0.05, 0.18, 0.016], [0.13, -0.09, torsoZ(0.11, 0.03, 1, 0.025)], C.belt, { r: [0.1, 0, 0.15] }),
      box('spine', [0.05, 0.15, 0.016], [0.07, -0.08, torsoZ(0.11, 0.03, 1, 0.03)], C.belt, { r: [0.1, 0, -0.18] }),
      // Vest hem below the belt.
      ell('hips', [0.208, 0.022, 0.152], [0, -0.07, 0], C.grey, { n: 6, seg: [12, 3] }),
    ],
    arms: [
      ...limbRing('elbow', 0.0, 0.079, 0.026, C.grey),
      ...limbRing('elbow', -0.12, 0.074, 0.02, C.greyDark),
    ],
    legs: [
      ...limbRing('knee', -0.06, 0.087, 0.026, C.grey),
      ...limbRing('knee', -0.12, 0.087, 0.026, C.greyDark),
    ],
    base: body({
      torso: C.navy, pelvis: C.navyDark, upperArm: C.black, forearm: C.black,
      thigh: C.navyDark, shin: C.grey, shoe: C.navyDark, sole: C.greyDark,
    }),
  },
};
