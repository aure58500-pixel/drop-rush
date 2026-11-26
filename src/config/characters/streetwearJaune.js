// Streetwear Jaune: white spiky hair, black headband with a yellow logo,
// open black hoodie with a yellow hood and trims over a white t-shirt, silver
// chain and tag, yellow "R" on the back, black cargo shorts, sneakers.
import { body, box, cone, ell, face, hairCap, headBand, headZ, limbRing, limbs, spike, sym, torsoZ } from './kit.js';

const C = {
  black: '#1d1d23', blackSoft: '#2d2d35', yellow: '#f7c41c', white: '#f3f3f3',
  silver: '#c7ccd4', hair: '#e8e8ee',
};

export default {
  id: 'streetwear_jaune',
  name: 'Streetwear Jaune',
  ui: { primary: C.yellow, secondary: C.black, accent: C.white },
  parts: {
    head: face(),
    hair: [
      hairCap(C.hair),
      spike(C.hair, 0.3, 0.3, 0.24, 0.09),
      spike(C.hair, 0.35, -0.6, 0.22, 0.085),
      spike(C.hair, 0.6, 2.2, 0.22, 0.085),
      spike(C.hair, 0.55, -2.4, 0.2, 0.085),
      spike(C.hair, 0.75, 1.3, 0.22, 0.085),
      spike(C.hair, 0.75, -1.3, 0.2, 0.08),
      spike(C.hair, 0.95, 0.3, 0.22, 0.085),
      spike(C.hair, 0.95, -0.5, 0.2, 0.08),
      spike(C.hair, 0.2, 2.9, 0.2, 0.08),
    ],
    hat: [
      headBand(0.49, 0.046, C.black),
      cone('neck', [0.045, 0, 0.075], [0, 0.49, headZ(0, 0.49, 1, 0.018)], C.yellow, { seg: [3], sc: [1, 1, 0.3] }),
      box('neck', [0.03, 0.012, 0.01], [0, 0.47, headZ(0, 0.47, 1, 0.026)], C.white),
      // Knot and tails falling on one side of the nape.
      box('neck', [0.09, 0.07, 0.05], [0.04, 0.49, headZ(0.04, 0.49, -1, 0.025)], C.black),
      box('neck', [0.07, 0.26, 0.016], [0.1, 0.35, headZ(0.1, 0.35, -1, 0.05)], C.black, { r: [-0.25, 0, 0.35] }),
      box('neck', [0.06, 0.22, 0.016], [0.04, 0.36, headZ(0.04, 0.36, -1, 0.045)], C.black, { r: [-0.2, 0, 0.05] }),
    ],
    torso: [
      // Open hoodie: white t-shirt, yellow zip edges and panels.
      box('spine', [0.14, 0.3, 0.02], [0, 0.2, torsoZ(0, 0.2, 1, 0.002)], C.white),
      ...sym(box('spine', [0.03, 0.32, 0.024], [0.085, 0.2, torsoZ(0.085, 0.2, 1, 0.004)], C.yellow)),
      ...sym(box('spine', [0.06, 0.1, 0.02], [0.165, 0.12, torsoZ(0.165, 0.12, 1, 0.002)], C.yellow, { r: [0, 0.45, 0] })),
      // Hood (yellow) behind the neck and yellow collar.
      ell('spine', [0.22, 0.09, 0.12], [0, 0.46, -0.1], C.yellow, { n: 3, seg: [8, 4] }),
      ell('spine', [0.2, 0.035, 0.155], [0, 0.43, 0.015], C.yellow, { n: 4, seg: [10, 3] }),
      ell('spine', [0.235, 0.026, 0.165], [0, -0.03, 0], C.yellow, { n: 6, seg: [10, 3] }),
      // Silver chain and tag.
      ...sym(box('spine', [0.012, 0.12, 0.012], [0.04, 0.35, torsoZ(0.04, 0.35, 1, 0.02)], C.silver, { r: [0, 0, -0.4] })),
      box('spine', [0.04, 0.055, 0.012], [0, 0.27, torsoZ(0, 0.27, 1, 0.02)], C.silver),
      // Yellow "R" on the back.
      box('spine', [0.028, 0.15, 0.012], [-0.04, 0.24, torsoZ(0.04, 0.24, -1, 0.004)], C.yellow),
      box('spine', [0.08, 0.026, 0.012], [0, 0.305, torsoZ(0, 0.305, -1, 0.004)], C.yellow),
      box('spine', [0.07, 0.026, 0.012], [-0.005, 0.24, torsoZ(0, 0.24, -1, 0.004)], C.yellow),
      box('spine', [0.026, 0.07, 0.012], [0.04, 0.272, torsoZ(0.04, 0.272, -1, 0.004)], C.yellow),
      box('spine', [0.026, 0.09, 0.012], [0.025, 0.2, torsoZ(0.025, 0.2, -1, 0.004)], C.yellow, { r: [0, 0, 0.55] }),
    ],
    arms: [
      ...limbs(box('arm', [0.022, 0.13, 0.12], [0.072, -0.07, 0], C.yellow)),
      ...limbRing('elbow', -0.11, 0.078, 0.035, C.black),
      ...limbRing('elbow', -0.11, 0.08, 0.012, C.yellow),
    ],
    legs: [
      // Cargo shorts: wider thighs, pockets with yellow trims and hems.
      ...limbs(box('leg', [0.032, 0.08, 0.08], [0.105, -0.11, 0], C.blackSoft)),
      ...limbs(box('leg', [0.034, 0.012, 0.082], [0.106, -0.068, 0], C.yellow)),
      ...limbRing('leg', -0.205, 0.106, 0.016, C.yellow),
      // Knee pads.
      ...limbs(box('knee', [0.11, 0.07, 0.04], [0, -0.025, 0.08], C.black)),
      ...limbs(box('knee', [0.112, 0.015, 0.042], [0, -0.025, 0.082], C.yellow)),
      // Sneaker details.
      ...limbs(box('ankle', [0.15, 0.022, 0.12], [0, -0.005, 0.07], C.black)),
      ...limbs(box('ankle', [0.205, 0.035, 0.12], [0, -0.06, -0.05], C.black)),
    ],
    base: body({
      torso: C.black, pelvis: C.black, upperArm: C.black, forearm: C.black,
      thigh: C.black, thighSize: [0.105, 0.13, 0.108], shin: C.blackSoft, shoe: C.white, sole: C.yellow,
    }),
  },
};
