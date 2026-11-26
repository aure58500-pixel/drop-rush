// Pirate Noir: black tricorne with gold trim, white skull and red plume, red
// bandana, black ponytail, gold earrings, long black coat with gold trims and
// epaulettes, white jabot, red sash and cuffs, brown boots with gold buckles.
import { body, box, cone, ell, face, HEAD, hairCap, headBand, headZ, limbRing, limbs, pelvisZ, sym, torsoBand, torsoZ } from './kit.js';

const C = {
  black: '#1d1d24', gold: '#e4ab2e', goldDark: '#c18a1c', red: '#c8202f', white: '#f3efe6',
  brown: '#5b3a24', brownDark: '#3e2716', hair: '#1b1715',
};

const HAT_Y = 0.6;

export default {
  id: 'pirate_noir',
  name: 'Pirate Noir',
  ui: { primary: C.black, secondary: C.gold, accent: C.red },
  parts: {
    head: face(),
    hair: [
      hairCap(C.hair, { tilt: -0.4, seg: [8, 3] }), // mostly hidden by the hat and the bandana
      // Ponytail sticking out under the bandana.
      ell('neck', [0.07, 0.1, 0.06], [0, 0.29, headZ(0, 0.29, -1, 0.045)], C.hair, { n: 2.5, seg: [6, 4] }),
      ell('neck', [0.055, 0.12, 0.05], [0, 0.15, headZ(0, 0.2, -1, 0.07)], C.hair, { n: 2.5, seg: [6, 4], r: [0.25, 0, 0] }),
      ell('neck', [0.04, 0.02, 0.04], [0, 0.34, headZ(0, 0.34, -1, 0.04)], C.gold, { n: 2, seg: [6, 3] }),
    ],
    hat: [
      headBand(0.47, 0.05, C.red, 0.02),
      box('neck', [0.09, 0.07, 0.05], [0, 0.45, headZ(0, 0.45, -1, 0.03)], C.red),
      box('neck', [0.06, 0.24, 0.016], [0.05, 0.3, headZ(0.05, 0.3, -1, 0.06)], C.red, { r: [-0.2, 0, 0.18] }),
      box('neck', [0.055, 0.2, 0.016], [-0.03, 0.31, headZ(0.03, 0.31, -1, 0.055)], C.red, { r: [-0.15, 0, -0.15] }),
      // Tricorne: crown, brim with a gold rim, three upturned flaps.
      ell('neck', [0.3, 0.17, 0.28], [0, HAT_Y, HEAD.z], C.black, { n: 3, seg: [10, 4], half: true }),
      ell('neck', [0.46, 0.022, 0.41], [0, HAT_Y - 0.03, HEAD.z], C.gold, { n: 4, seg: [10, 3] }),
      ell('neck', [0.445, 0.034, 0.395], [0, HAT_Y - 0.01, HEAD.z], C.black, { n: 4, seg: [10, 3] }),
      box('neck', [0.56, 0.12, 0.03], [0, HAT_Y + 0.06, -0.33], C.black, { r: [-0.4, 0, 0] }),
      box('neck', [0.56, 0.02, 0.036], [0, HAT_Y + 0.12, -0.355], C.gold, { r: [-0.4, 0, 0] }),
      ...sym(box('neck', [0.46, 0.11, 0.03], [0.2, HAT_Y + 0.055, 0.2], C.black, { r: [0.35, 0.95, 0] })),
      ...sym(box('neck', [0.46, 0.02, 0.036], [0.21, HAT_Y + 0.11, 0.215], C.gold, { r: [0.35, 0.95, 0] })),
      // Skull and crossbones on the front of the crown.
      ell('neck', [0.055, 0.05, 0.03], [0, HAT_Y + 0.08, 0.265], C.white, { n: 2.5, seg: [6, 4] }),
      box('neck', [0.05, 0.03, 0.03], [0, HAT_Y + 0.04, 0.262], C.white),
      ...sym(box('neck', [0.016, 0.018, 0.01], [0.02, HAT_Y + 0.085, 0.293], C.black)),
      ...sym(box('neck', [0.14, 0.022, 0.012], [0, HAT_Y + 0.05, 0.285], C.white, { r: [0, 0, 0.6] })),
      // Red plume.
      cone('neck', [0.05, 0, 0.24], [0.19, HAT_Y + 0.2, -0.06], C.red, { dir: [0.45, 1, -0.35], sc: [1, 1, 0.35], seg: [6] }),
      cone('neck', [0.04, 0, 0.2], [0.24, HAT_Y + 0.16, -0.1], C.red, { dir: [0.9, 1, -0.2], sc: [1, 1, 0.35], seg: [6] }),
    ],
    accessories: [
      ...sym(ell('neck', [0.012, 0.03, 0.03], [0.322, 0.25, 0.04], C.gold, { n: 2, seg: [6, 2] })),
    ],
    torso: [
      // Red waistcoat, gold lapels and buttons, white jabot and collar.
      box('spine', [0.13, 0.22, 0.02], [0, 0.17, torsoZ(0, 0.17, 1, 0.002)], C.red),
      ...sym(box('spine', [0.035, 0.28, 0.022], [0.075, 0.22, torsoZ(0.075, 0.22, 1, 0.004)], C.gold, { r: [0, 0, 0.12] })),
      ...sym(box('spine', [0.022, 0.022, 0.012], [0.12, 0.25, torsoZ(0.12, 0.25, 1, 0.006)], C.gold)),
      ...sym(box('spine', [0.022, 0.022, 0.012], [0.12, 0.13, torsoZ(0.12, 0.13, 1, 0.006)], C.gold)),
      ell('spine', [0.17, 0.03, 0.14], [0, 0.44, 0.02], C.white, { n: 4, seg: [8, 3] }),
      ell('spine', [0.06, 0.05, 0.035], [0, 0.37, torsoZ(0, 0.37, 1, 0.01)], C.white, { n: 2.5, seg: [6, 3] }),
      ell('spine', [0.05, 0.045, 0.03], [0, 0.31, torsoZ(0, 0.31, 1, 0.015)], C.white, { n: 2.5, seg: [6, 3] }),
    ],
    belt: [
      torsoBand(0.04, 0.055, C.red),
      box('spine', [0.075, 0.065, 0.024], [0, 0.04, torsoZ(0, 0.04, 1, 0.022)], C.gold),
      box('spine', [0.04, 0.03, 0.026], [0, 0.04, torsoZ(0, 0.04, 1, 0.024)], C.black),
      box('spine', [0.05, 0.2, 0.02], [0.1, -0.09, torsoZ(0.1, 0.04, 1, 0.022)], C.red, { r: [0, 0, 0.12] }),
      // Long coat tails.
      box('hips', [0.37, 0.34, 0.03], [0, -0.16, pelvisZ(0, -0.01, -1, 0.012)], C.black, { r: [0.1, 0, 0] }),
      box('hips', [0.375, 0.03, 0.034], [0, -0.32, pelvisZ(0, -0.01, -1, 0.03)], C.gold, { r: [0.1, 0, 0] }),
      ...sym(box('hips', [0.03, 0.33, 0.22], [0.2, -0.15, -0.03], C.black)),
      ...sym(box('hips', [0.034, 0.03, 0.222], [0.201, -0.31, -0.03], C.gold)),
      ...sym(box('hips', [0.1, 0.3, 0.026], [0.14, -0.14, pelvisZ(0.14, -0.01, 1, 0.012)], C.black)),
      ...sym(box('hips', [0.022, 0.3, 0.03], [0.095, -0.14, pelvisZ(0.14, -0.01, 1, 0.014)], C.gold)),
    ],
    arms: [
      // Gold epaulettes with fringes, red cuffs with a gold edge.
      ...limbs(ell('arm', [0.1, 0.032, 0.1], [0.02, 0.025, 0], C.gold, { n: 3, seg: [6, 3] })),
      ...limbs(box('arm', [0.1, 0.045, 0.115], [0.05, -0.02, 0], C.goldDark)),
      ...limbRing('elbow', -0.115, 0.087, 0.045, C.red),
      ...limbRing('elbow', -0.07, 0.089, 0.012, C.gold),
    ],
    legs: [
      ...limbRing('knee', -0.015, 0.095, 0.03, C.brownDark),
      ...limbs(box('ankle', [0.05, 0.04, 0.02], [0, -0.025, 0.176], C.gold)),
    ],
    base: body({
      torso: C.black, pelvis: C.black, upperArm: C.black, forearm: C.black,
      thigh: C.black, shin: C.brown, shoe: C.brown, sole: C.brownDark,
    }),
  },
};
