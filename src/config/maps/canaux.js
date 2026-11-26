// « Ville des Canaux » : ville circulaire de 600 m sur un plateau flottant.
// Une fontaine couronne au centre, un canal en anneau franchi par quatre ponts,
// quatre canaux en diagonale, des trampolines et des immeubles colorés.
// L'eau des canaux ralentit de 50 % sans tuer. Tomber du plateau élimine.
const ring = (count, radius, offset, make) => Array.from({ length: count }, (_, i) => make(offset + (360 / count) * i, radius, i));

const WATER = { below: 0.6, slowFactor: 0.5, jumpAllowance: 1.6 };
const COLORS = [
  { wall: '#ffd166', accent: '#7b2ff7' },
  { wall: '#4895ef', accent: '#ffd166' },
  { wall: '#9d4edd', accent: '#ffd166' },
  { wall: '#ef476f', accent: '#ffffff' },
];

export default {
  id: 'canaux',
  name: 'Ville des Canaux',
  description: 'Ville colorée sur un plateau flottant, canaux, ponts et trampolines.',
  size: 600,
  seed: 7202,

  terrain: {
    radius: 300,
    topY: 0,
    bottomY: -400,
    channels: [
      { type: 'ring', r0: 46, r1: 72, depth: 1.8, bank: 2.5, water: WATER },
      ...[45, 135, 225, 315].map((angle) => ({ type: 'sector', angle, half: 3.2, r0: 70, r1: 150, depth: 1.8, bank: 2, water: WATER })),
    ],
    paint: {
      base: { color: '#cfc6d8', cat: 'paved' },
      rings: [
        { r0: 0, r1: 9, color: '#ece5f3', cat: 'paved' },
        { r0: 9, r1: 20, color: '#b9b0cb', cat: 'paved' },
        { r0: 20, r1: 28, color: '#8f63d6', cat: 'paved' },
        { r0: 28, r1: 44, color: '#d9d2e3', cat: 'paved' },
        { r0: 44, r1: 46, color: '#ffc300', cat: 'paved' },
        { r0: 72, r1: 74, color: '#ffc300', cat: 'paved' },
        { r0: 74, r1: 150, color: '#d4cbe0', cat: 'paved' },
        { r0: 150, r1: 162, color: '#4a4658', cat: 'road' },
        { r0: 162, r1: 166, color: '#b0a8c0', cat: 'paved' },
        { r0: 292, r1: 300, color: '#7d7590', cat: 'paved' },
      ],
      sectors: ring(8, 0, 22.5, (angle) => ({ angle, half: 4, r0: 170, r1: 186, color: '#77bd45', cat: 'grass' })),
    },
  },
  sea: null,
  cliff: { style: 'floating', bottom: -70, colors: ['#8b7fa8', '#6f6590', '#5a5078'] },
  boundary: { radius: 302 },
  buildRadius: 296,

  lighting: {
    sunColor: '#fff4dc', sunIntensity: 2.9, sunDirection: [0.45, 0.7, 0.4],
    hemiSky: '#c9e6ff', hemiGround: '#8f86a8', hemiIntensity: 1.4, fogColor: '#d6e9fb', fogNear: 120,
  },
  sky: { top: '#4b9be8', horizon: '#d6e9fb', bottom: '#eaf4ff', sun: '#fff3c4', clouds: '#ffffff' },

  structures: [
    { type: 'fountain', x: 0, z: 0, r: 7, crownScale: 1.6, name: 'Fontaine couronne' },
    { type: 'ringDashes', r: 156 },
    ...[0, 90, 180, 270].flatMap((angle) => [
      { type: 'bridge', angle, r0: 42, r1: 76, width: 8, deckColor: '#5c7cfa', railColor: '#ffc300', banners: true, name: `Pont ${['nord', 'est', 'sud', 'ouest'][angle / 90]}` },
      { type: 'road', angle, r0: 76, r1: 150, width: 8, color: '#5c5a6e' },
      { type: 'road', angle, r0: 166, r1: angle === 0 ? 210 : 290, width: 8, color: '#4a4658', crosswalk: true },
    ]),
    // Trampolines près des canaux (règle de jeu : propulsion à ~4 m).
    ...ring(4, 88, 22, (angle) => ({ type: 'trampoline', angle, radius: 88, height: 4, push: 6 })),
    // Tubes roses et blancs (décor).
    ...ring(4, 112, 67, (angle) => ({ type: 'tubes', angle, radius: 112, facing: angle + 90, length: 9 })),
    // Nord : château d'eau rouge avec couronne et horloge.
    { type: 'block', angle: 0, radius: 222, facing: 'center', w: 14, d: 10, floors: 3, clock: true, waterTower: true, banner: true, colors: { wall: '#e9c46a', accent: '#7b2ff7' }, name: 'Hôtel de ville (horloge)' },
    // Nord-est : héliport.
    { type: 'block', angle: 45, radius: 228, facing: 'center', w: 14, d: 12, floors: 3, roof: 'heliport', banner: true, colors: { wall: '#4895ef', accent: '#ffd166' }, name: 'Héliport' },
    // Immeubles colorés de 2 à 3 étages tout autour.
    ...ring(16, 0, 11.25, (angle, _, i) => ({
      type: 'block', angle, radius: i % 2 ? 238 : 202, facing: 'center',
      w: 10 + (i % 3) * 1.5, d: 8, floors: 2 + (i % 2), banner: i % 3 === 0,
      colors: COLORS[i % 4], name: `Immeuble ${i + 1}`,
    })).filter((b) => Math.abs(((b.angle - 45 + 540) % 360) - 180) > 14),
    // Décor hors d'atteinte : ballon violet au-dessus de la ville, grue sur un rocher flottant.
    { type: 'balloon', angle: 315, radius: 250, altitude: 58 },
    { type: 'rock', angle: 32, radius: 336, y: -1, r: 9, h: 22 },
    { type: 'crane', angle: 32, radius: 336, y: -1, facing: 'center', collide: false, h: 26 },
  ],

  instances: [
    ...ring(24, 168, 7.5, (angle, radius) => ({ template: 'lamp', angle, radius })),
    ...ring(8, 36, 22.5, (angle, radius) => ({ template: 'lamp', angle, radius })),
  ],

  vegetation: {
    areas: ring(8, 178, 22.5, (angle) => ({ angle, radius: 178, r: 10, count: 6, kinds: { treeRound: 0.7, bush: 0.3 }, spacing: 4 })),
  },

  spawn: { radius: 272, count: 20, offset: 4, minDistance: 80 },
  zone: { center: [0, 0], maxOffset: 100 },
  training: { origin: [0, 112, 180] },
};
