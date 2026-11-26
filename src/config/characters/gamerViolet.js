// Gamer Violet: brown spiky hair, purple goggles on the forehead, black
// headphones with purple "X" cups, black mask with a white triangle, white
// hoodie under a black and purple jacket, white "V" on the back.
import { body, box, cone, ell, face, hairCap, headBand, headZ, limbRing, limbs, lowerMask, spike, sym, torsoBand, torsoZ } from './kit.js';

const C = {
  brown: '#6e4226', purple: '#8a2be2', violet: '#b65cff', lens: '#a24dff', light: '#e6c4ff',
  black: '#1c1b24', white: '#ecebf2',
};

export default {
  id: 'gamer_violet',
  name: 'Gamer Violet',
  ui: { primary: C.purple, secondary: C.black, accent: C.white },
  parts: {
    head: face(),
    hair: [
      hairCap(C.brown),
      spike(C.brown, 0.35, 0.2, 0.2, 0.09),
      spike(C.brown, 0.5, -0.7, 0.2, 0.085),
      spike(C.brown, 0.45, 2.7, 0.18, 0.085),
      spike(C.brown, 0.5, -2.6, 0.17, 0.08),
      spike(C.brown, 0.85, 0.2, 0.2, 0.085),
      spike(C.brown, 0.85, 1.2, 0.17, 0.08),
      spike(C.brown, 0.85, -1.2, 0.17, 0.08),
    ],
    hat: [
      // Goggles on the forehead.
      headBand(0.53, 0.034, C.black, 0.024),
      ell('neck', [0.225, 0.074, 0.05], [0, 0.535, headZ(0, 0.535, 1, 0.012)], C.black, { n: 6, seg: [8, 3] }),
      ell('neck', [0.205, 0.058, 0.05], [0, 0.535, headZ(0, 0.535, 1, 0.026)], C.lens, { n: 6, seg: [8, 3] }),
      // Headphones: band over the head and two cups with an "X".
      box('neck', [0.3, 0.04, 0.07], [0, 0.735, -0.01], C.black),
      ...sym(box('neck', [0.04, 0.36, 0.07], [0.255, 0.575, -0.01], C.black, { r: [0, 0, 0.56] })),
      ...sym(ell('neck', [0.06, 0.105, 0.1], [0.335, 0.37, 0], C.black, { n: 3, seg: [6, 4] })),
      ...sym(ell('neck', [0.022, 0.08, 0.08], [0.39, 0.37, 0], C.purple, { n: 2, seg: [6, 3] })),
      ...sym(box('neck', [0.01, 0.1, 0.022], [0.413, 0.37, 0], C.light, { r: [Math.PI / 4, 0, 0] })),
      ...sym(box('neck', [0.01, 0.1, 0.022], [0.413, 0.37, 0], C.light, { r: [-Math.PI / 4, 0, 0] })),
    ],
    mask: [
      lowerMask(C.black),
      cone('neck', [0.04, 0, 0.065], [0, 0.2, headZ(0, 0.2, 1, 0.026)], C.white, { seg: [3], sc: [1, 1, 0.25], r: [0, 0, Math.PI] }),
    ],
    torso: [
      // White hoodie front and hood, purple stripes on the jacket.
      box('spine', [0.13, 0.3, 0.02], [0, 0.2, torsoZ(0, 0.2, 1, 0.002)], C.white),
      ell('spine', [0.25, 0.1, 0.14], [0, 0.47, -0.08], C.white, { n: 3, seg: [8, 4] }),
      ...sym(box('spine', [0.025, 0.3, 0.022], [0.078, 0.2, torsoZ(0.078, 0.2, 1, 0.004)], C.purple)),
      ...sym(box('spine', [0.08, 0.018, 0.02], [0.15, 0.32, torsoZ(0.15, 0.32, 1, 0.004)], C.violet, { r: [0, 0.5, 0.25] })),
      ...sym(box('spine', [0.022, 0.3, 0.06], [0.232, 0.2, 0], C.purple)),
      torsoBand(-0.02, 0.03, C.purple),
      // White "V" on the back.
      ...sym(box('spine', [0.035, 0.17, 0.012], [0.045, 0.27, torsoZ(0.045, 0.27, -1, 0.004)], C.white, { r: [0, 0, 0.45] })),
    ],
    arms: [
      ...limbRing('arm', -0.06, 0.079, 0.014, C.violet),
      ...limbRing('arm', -0.1, 0.079, 0.014, C.violet),
      ...limbRing('elbow', -0.12, 0.076, 0.028, C.purple),
    ],
    legs: [
      ...limbs(box('leg', [0.03, 0.08, 0.08], [0.095, -0.11, 0], C.black)),
      ...limbs(box('leg', [0.032, 0.014, 0.082], [0.096, -0.07, 0], C.violet)),
      ...limbRing('knee', -0.17, 0.088, 0.02, C.purple),
      ...limbs(box('ankle', [0.15, 0.022, 0.12], [0, -0.005, 0.07], C.purple)),
      ...limbs(box('ankle', [0.205, 0.035, 0.12], [0, -0.06, -0.05], C.purple)),
    ],
    base: body({
      torso: C.black, pelvis: C.black, upperArm: C.black, forearm: C.black,
      thigh: C.black, shin: C.black, shoe: C.white, sole: C.purple,
    }),
  },
};
