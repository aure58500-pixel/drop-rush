// Repeated props drawn with InstancedMesh. Each template is a list of
// PartBuilder parts (local frame, ground at y = 0, front toward +Z), an
// optional collider registered for every instance, and render flags.
//   collider: { type: 'cyl', r, h } | { type: 'box', hx, hy, hz }
//   density : true -> thinned out by the adaptive quality (pure decor)
const ell = (size, p, c, o = {}) => ({ s: 'ell', size, p, c, ...o });
const box = (size, p, c, o = {}) => ({ s: 'box', size, p, c, ...o });
const cone = (size, p, c, o = {}) => ({ s: 'cone', size, p, c, ...o });

const CROWN_WHITE = '#ffffff';

export const PROP_TEMPLATES = {
  treeRound: {
    parts: [
      cone([0.22, 0.17, 2.4], [0, 1.2, 0], '#7a5230', { seg: [6] }),
      ell([1.6, 1.35, 1.6], [0, 3.2, 0], '#4caf50', { n: 2.2, seg: [8, 5] }),
      ell([1.05, 0.9, 1.05], [0.85, 2.7, 0.35], '#5fbf3a', { n: 2.2, seg: [6, 4] }),
    ],
    collider: { type: 'cyl', r: 0.3, h: 2.6 },
  },
  treePine: {
    parts: [
      cone([0.2, 0.15, 1.6], [0, 0.8, 0], '#6b4a2b', { seg: [6] }),
      cone([1.6, 0, 2.6], [0, 2.4, 0], '#2e7d4f', { seg: [7] }),
      cone([1.25, 0, 2.2], [0, 3.6, 0], '#357a38', { seg: [7] }),
      cone([0.85, 0, 1.8], [0, 4.7, 0], '#3c8c44', { seg: [7] }),
    ],
    collider: { type: 'cyl', r: 0.28, h: 2.4 },
  },
  treeAutumn: {
    parts: [
      cone([0.22, 0.17, 2.2], [0, 1.1, 0], '#7a5230', { seg: [6] }),
      ell([1.5, 1.3, 1.5], [0, 3.0, 0], '#f08a2c', { n: 2.2, seg: [8, 5] }),
    ],
    collider: { type: 'cyl', r: 0.3, h: 2.4 },
  },
  bush: {
    parts: [ell([0.8, 0.55, 0.8], [0, 0.4, 0], '#5aa83a', { n: 2.4, seg: [7, 4] }), ell([0.55, 0.4, 0.55], [0.6, 0.3, 0.2], '#6dbb45', { n: 2.4, seg: [6, 3] })],
    shadow: false,
    density: true,
  },
  hedge: {
    parts: [box([3, 0.9, 0.9], [0, 0.45, 0], '#4e9a33')],
    collider: { type: 'box', hx: 1.5, hy: 0.45, hz: 0.45 },
  },
  crate: {
    parts: [
      box([1.2, 1.2, 1.2], [0, 0.6, 0], '#c58b4f'),
      box([1.24, 0.14, 1.24], [0, 0.6, 0], '#7f5539'),
      box([0.14, 1.24, 1.24], [0, 0.6, 0], '#8f6240'),
    ],
    collider: { type: 'box', hx: 0.6, hy: 0.6, hz: 0.6 },
  },
  ruinBlock: {
    parts: [box([1.6, 1.0, 1.2], [0, 0.5, 0], '#a7a29a'), box([0.9, 0.5, 0.8], [0.2, 1.25, 0.1], '#b9b2a6', { r: [0, 0.4, 0] })],
    collider: { type: 'box', hx: 0.8, hy: 0.5, hz: 0.6 },
  },
  banner: {
    // Purple banner with a white crown on a pole (decor).
    parts: [
      cone([0.07, 0.06, 4.2], [0, 2.1, 0], '#3a3a48', { seg: [5] }),
      box([1.1, 0.08, 0.08], [0.45, 4.0, 0], '#3a3a48'),
      box([0.9, 1.7, 0.05], [0.5, 3.05, 0], '#7b2ff7'),
      box([0.5, 0.12, 0.06], [0.5, 2.95, 0], CROWN_WHITE),
      ...[-0.18, 0, 0.18].map((dx) => cone([0.07, 0, 0.22], [0.5 + dx, 3.12, 0], CROWN_WHITE, { seg: [3], sc: [1, 1, 0.4] })),
    ],
  },
  lamp: {
    parts: [
      cone([0.09, 0.07, 3.6], [0, 1.8, 0], '#2b2d42', { seg: [5] }),
      box([0.3, 0.35, 0.3], [0, 3.75, 0], '#2b2d42'),
      box([0.22, 0.24, 0.22], [0, 3.72, 0], '#ffe9a8'),
    ],
    shadow: false,
  },
  parasolTable: {
    parts: [
      cone([0.5, 0.5, 0.06], [0, 0.75, 0], '#ffffff', { seg: [8] }),
      cone([0.06, 0.06, 0.75], [0, 0.37, 0], '#6c757d', { seg: [4] }),
      cone([0.04, 0.04, 2.2], [0, 1.1, 0], '#6c757d', { seg: [4] }),
      cone([1.3, 0.05, 0.45], [0, 2.3, 0], '#e63946', { seg: [8] }),
      ...[0, 1].map((k) => box([0.45, 0.06, 0.45], [k ? 0.85 : -0.85, 0.45, 0], '#8d6e63')),
    ],
    shadow: false,
    density: true,
  },
  window: {
    // Frame around a 1.2 x 1.2 m opening; origin at the opening center, outer face toward +Z.
    parts: [
      box([1.44, 0.12, 0.08], [0, 0.66, 0], '#f8f4e3'),
      box([1.56, 0.12, 0.2], [0, -0.66, 0.05], '#f8f4e3'),
      box([0.12, 1.2, 0.08], [-0.66, 0, 0], '#f8f4e3'),
      box([0.12, 1.2, 0.08], [0.66, 0, 0], '#f8f4e3'),
    ],
    shadow: false,
  },
  roadDash: {
    parts: [box([0.3, 0.02, 2.4], [0, 0.012, 0], '#f6f2e6')],
    shadow: false,
  },
  crosswalk: {
    parts: [-2.4, -1.2, 0, 1.2, 2.4].map((dx) => box([0.6, 0.02, 3.2], [dx, 0.012, 0], '#f6f2e6')),
    shadow: false,
  },
  arrow: {
    // White chevron painted on a deck, pointing toward local -Z.
    parts: [
      box([0.35, 0.02, 1.7], [-0.55, 0.012, 0], '#ffffff', { r: [0, -0.6, 0] }),
      box([0.35, 0.02, 1.7], [0.55, 0.012, 0], '#ffffff', { r: [0, 0.6, 0] }),
    ],
    shadow: false,
  },
  wallLight: {
    parts: [box([0.9, 0.9, 0.12], [0, 0, 0], '#ffd54a')],
    shadow: false,
  },
  rock: {
    parts: [ell([1.3, 0.9, 1.1], [0, 0.45, 0], '#9e9a91', { n: 2.2, seg: [6, 4] })],
    collider: { type: 'cyl', r: 1.0, h: 1.2 },
  },
};
