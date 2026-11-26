// « L'Île » : plateau circulaire de 700 m bordé de falaises et entouré par la mer.
// Le centre (rond-point et couronne) est séparé du reste de l'île par une
// crevasse que l'on traverse par quatre ponts violets.
// Angles en degrés : 0 = nord (-Z), 90 = est (+X). Distances en mètres depuis le centre.
const ring = (count, radius, offset, make) => Array.from({ length: count }, (_, i) => make(offset + (360 / count) * i, radius, i));

export default {
  id: 'ile',
  name: "L'Île",
  description: 'Île flottante, falaises, ponts violets, grue et tour de contrôle.',
  size: 700,
  seed: 7101,

  terrain: {
    radius: 350,
    topY: 0,
    bottomY: -60,
    channels: [
      // Crevasse autour du centre : la mer au fond élimine le joueur.
      { type: 'ring', r0: 112, r1: 136, depth: 70, bank: 1 },
    ],
    paint: {
      base: { color: '#79c043', cat: 'grass' },
      rings: [
        { r0: 0, r1: 18, color: '#ddd5c6', cat: 'paved' },
        { r0: 18, r1: 22, color: '#b8b0a2', cat: 'paved' },
        { r0: 22, r1: 34, color: '#3d4048', cat: 'road' },
        { r0: 34, r1: 40, color: '#c8c3bb', cat: 'paved' },
        { r0: 40, r1: 108, color: '#d6cfc0', cat: 'paved' },
        { r0: 108, r1: 112, color: '#8d8a83', cat: 'paved' },
        { r0: 136, r1: 140, color: '#8d8a83', cat: 'paved' },
        { r0: 140, r1: 176, color: '#d6cfc0', cat: 'paved' },
        { r0: 176, r1: 188, color: '#3d4048', cat: 'road' },
        { r0: 188, r1: 194, color: '#c8c3bb', cat: 'paved' },
        { r0: 338, r1: 350, color: '#b49a6c', cat: 'rock' },
      ],
      sectors: [
        ...[45, 135, 225, 315].map((angle) => ({ angle, half: 24, r0: 54, r1: 100, color: '#86c94f', cat: 'grass' })),
        { angle: 45, half: 18, r0: 194, r1: 285, color: '#cdc5b5', cat: 'paved' },
        { angle: 108, half: 20, r0: 194, r1: 278, color: '#cdc5b5', cat: 'paved' },
        { angle: 318, half: 22, r0: 194, r1: 292, color: '#b9b2a5', cat: 'paved' },
      ],
    },
  },
  sea: { level: -14, color: '#2a8fd0' },
  cliff: { style: 'sea', bottom: -22, colors: ['#9b7b5b', '#80654c', '#6e5641'] },
  boundary: { radius: 352 },
  buildRadius: 346,

  lighting: {
    sunColor: '#fff1d0', sunIntensity: 2.8, sunDirection: [0.55, 0.62, 0.38],
    hemiSky: '#bfe3ff', hemiGround: '#8a7a52', hemiIntensity: 1.35, fogColor: '#cfe6f2', fogNear: 120,
  },
  sky: { top: '#3d8fe0', horizon: '#cfe6f2', bottom: '#8fc3d9', sun: '#fff3c4', clouds: '#ffffff' },

  structures: [
    // Centre : couronne dorée sur son socle, rond-point, quatre routes vers les ponts.
    { type: 'crown', x: 0, z: 0, name: 'Couronne' },
    { type: 'ringDashes', r: 28 },
    { type: 'ringDashes', r: 182 },
    ...[0, 90, 180, 270].flatMap((angle) => [
      { type: 'road', angle, r0: 40, r1: 108, width: 8 },
      { type: 'road', angle, r0: 140, r1: 176, width: 8 },
      { type: 'road', angle, r0: 194, r1: 330, width: 8, crosswalk: true },
      { type: 'bridge', angle, r0: 104, r1: 144, width: 8, banners: true, piers: true, name: `Pont ${['nord', 'est', 'sud', 'ouest'][angle / 90]}` },
    ]),
    // Quatre immeubles autour du rond-point.
    { type: 'block', angle: 45, radius: 76, facing: 'center', w: 10, d: 8, floors: 2, banner: true, colors: { wall: '#9d4edd', accent: '#ffd166' }, name: 'Immeuble centre nord-est' },
    { type: 'block', angle: 135, radius: 76, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#ffd166', accent: '#7b2ff7' }, name: 'Immeuble centre sud-est' },
    { type: 'block', angle: 225, radius: 76, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#4895ef', accent: '#ffd166' }, name: 'Immeuble centre sud-ouest' },
    { type: 'block', angle: 315, radius: 76, facing: 'center', w: 10, d: 8, floors: 2, banner: true, colors: { wall: '#ef476f', accent: '#ffffff' }, name: 'Immeuble centre nord-ouest' },
    // Nord-est : tour de contrôle et grue jaune.
    { type: 'tower', angle: 38, radius: 236, facing: 'center', floors: 4, name: 'Tour de contrôle' },
    { type: 'crane', angle: 56, radius: 262, facing: 'center', h: 30, name: 'Grue' },
    { type: 'block', angle: 22, radius: 250, facing: 'center', w: 12, d: 9, floors: 2, banner: true, colors: { wall: '#8d99ae', accent: '#7b2ff7' }, name: 'Bureaux nord-est' },
    // Est : restaurant burger et immeuble avec héliport.
    { type: 'burger', angle: 98, radius: 228, facing: 'center', name: 'Burger' },
    { type: 'block', angle: 122, radius: 236, facing: 'center', w: 14, d: 12, floors: 3, roof: 'heliport', banner: true, colors: { wall: '#3a86ff', accent: '#ffd166' }, name: 'Héliport' },
    { type: 'block', angle: 78, radius: 256, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#ffd166', accent: '#e63946' }, name: 'Boutique est' },
    // Nord-ouest : hangar rouge et conteneurs.
    { type: 'hangar', angle: 304, radius: 236, facing: 'center', banner: true, name: 'Hangar' },
    {
      type: 'containers', angle: 332, radius: 262, facing: 'center', name: 'Conteneurs',
      stacks: [[-9, -4, 2, 0], [0, -4, 1, 1], [9, -4, 2, 2], [-4, 4, 1, 3], [4, 4, 1, 4]],
    },
    // Sud : deux cascades sur les falaises.
    { type: 'waterfall', angle: 168, r: 350, width: 8 },
    { type: 'waterfall', angle: 194, r: 350, width: 10 },
    { type: 'block', angle: 158, radius: 252, facing: 'center', w: 10, d: 8, floors: 1, colors: { wall: '#f4a261', accent: '#2a9d8f' }, name: 'Maison sud-est' },
    { type: 'block', angle: 204, radius: 252, facing: 'center', w: 10, d: 8, floors: 2, banner: true, colors: { wall: '#9d4edd', accent: '#ffd166' }, name: 'Maison sud-ouest' },
    // Ouest.
    { type: 'block', angle: 248, radius: 240, facing: 'center', w: 12, d: 10, floors: 3, banner: true, colors: { wall: '#7b2ff7', accent: '#ffd166' }, name: 'Immeuble ouest' },
    { type: 'block', angle: 278, radius: 222, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#ffd166', accent: '#3a86ff' }, name: 'Maison ouest' },
    { type: 'block', angle: 350, radius: 232, facing: 'center', w: 10, d: 8, floors: 1, colors: { wall: '#ef476f', accent: '#ffffff' }, name: 'Maison nord' },
  ],

  instances: [
    ...ring(24, 196, 7.5, (angle, radius) => ({ template: 'lamp', angle, radius })),
    ...ring(8, 42, 22.5, (angle, radius) => ({ template: 'lamp', angle, radius })),
    ...ring(4, 20, 45, (angle, radius) => ({ template: 'banner', angle, radius, yaw: -angle })),
  ],

  vegetation: {
    areas: [
      { x: 0, z: 0, r0: 200, r1: 340, count: 170, kinds: { treePine: 0.45, treeRound: 0.4, treeAutumn: 0.15 }, spacing: 6 },
      { x: 0, z: 0, r0: 200, r1: 340, count: 140, kinds: { bush: 1 }, spacing: 3 },
      ...[45, 135, 225, 315].map((angle) => ({ angle, radius: 78, r: 26, count: 10, kinds: { treeRound: 0.6, bush: 0.4 }, spacing: 5 })),
    ],
  },

  spawn: { radius: 315, count: 21, offset: 8, minDistance: 80 },
  zone: { center: [0, 0], maxOffset: 120 },
  training: { origin: [-92, 131, 215] },
};
