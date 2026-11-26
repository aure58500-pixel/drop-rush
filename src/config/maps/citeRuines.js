// « Cité des Ruines » : cité circulaire de 700 m entourée d'un mur de pierre
// bleu-violet de 6 m (limite de la carte), porte grillagée ouverte au sud,
// route en anneau autour d'une fontaine couronne, ruines à l'ouest.
const ring = (count, radius, offset, make) => Array.from({ length: count }, (_, i) => make(offset + (360 / count) * i, radius, i));

export default {
  id: 'cite-ruines',
  name: 'Cité des Ruines',
  description: 'Cité fortifiée, route en anneau, ruines, héliport et garage à conteneurs.',
  size: 700,
  seed: 7303,

  terrain: {
    radius: 334,
    topY: 0,
    bottomY: -60,
    channels: [],
    paint: {
      base: { color: '#7cc24a', cat: 'grass' },
      rings: [
        { r0: 0, r1: 10, color: '#ddd5c6', cat: 'paved' },
        { r0: 10, r1: 24, color: '#cfc7b8', cat: 'paved' },
        { r0: 24, r1: 26, color: '#9a948a', cat: 'paved' },
        { r0: 26, r1: 38, color: '#3d4048', cat: 'road' },
        { r0: 38, r1: 44, color: '#c8c3bb', cat: 'paved' },
        { r0: 44, r1: 150, color: '#c9c1b2', cat: 'paved' },
        { r0: 326, r1: 334, color: '#8a8f9e', cat: 'paved' },
      ],
      sectors: [
        ...[45, 135, 225, 315].map((angle) => ({ angle, half: 15, r0: 11, r1: 23, color: '#6fb53f', cat: 'garden' })),
        { angle: 270, half: 12, r0: 120, r1: 200, color: '#a39a83', cat: 'ruins' },
      ],
    },
  },
  sea: { level: -14, color: '#2a8fd0' },
  cliff: { style: 'sea', bottom: -22, colors: ['#7f7b8f', '#6a6680', '#575270'] },
  boundary: { radius: 352 },
  buildRadius: 327,

  lighting: {
    sunColor: '#fff0d6', sunIntensity: 2.8, sunDirection: [-0.4, 0.65, 0.5],
    hemiSky: '#c3e2ff', hemiGround: '#857a5c', hemiIntensity: 1.35, fogColor: '#d2e6f2', fogNear: 120,
  },
  sky: { top: '#3d8fe0', horizon: '#d2e6f2', bottom: '#8fc3d9', sun: '#fff3c4', clouds: '#ffffff' },

  structures: [
    { type: 'fountain', x: 0, z: 0, r: 6, crownScale: 1.5, accent: '#3a86ff', name: 'Fontaine couronne' },
    { type: 'ringDashes', r: 32 },
    { type: 'road', angle: 0, r0: 44, r1: 166, width: 10, sidewalk: '#b8b0a2', crosswalk: true },
    { type: 'road', angle: 90, r0: 44, r1: 320, width: 10, sidewalk: '#b8b0a2', crosswalk: true },
    { type: 'road', angle: 180, r0: 44, r1: 330, width: 10, sidewalk: '#b8b0a2', crosswalk: true },
    { type: 'road', angle: 270, r0: 44, r1: 118, width: 10, sidewalk: '#b8b0a2', crosswalk: true },
    // Mur d'enceinte (limite) et porte sud ouverte.
    { type: 'perimeterWall', r: 331, h: 6, segments: 120, gapAngle: 180, gapWidth: 16 },
    { type: 'gate', angle: 180, r: 331, width: 16, causeway: 14, name: 'Porte sud' },
    // Nord-ouest : burger et tour de contrôle avec antenne.
    { type: 'burger', angle: 315, radius: 150, facing: 'center', name: 'Burger' },
    { type: 'tower', angle: 334, radius: 218, facing: 'center', floors: 4, name: 'Tour de contrôle' },
    // Nord : garage à conteneurs, conteneurs empilés et grue.
    { type: 'block', angle: 0, radius: 180, facing: 'center', w: 22, d: 14, floors: 1, door: 8, banner: true, colors: { wall: '#8d99ae', accent: '#ffd166', roof: '#5c677d' }, name: 'Garage' },
    {
      type: 'containers', angle: 20, radius: 205, facing: 'center', name: 'Conteneurs',
      stacks: [[-9, -4, 2, 0], [0, -4, 1, 1], [9, -4, 2, 2], [-4, 4, 1, 4], [4, 4, 2, 3]],
    },
    { type: 'crane', angle: 348, radius: 192, facing: 'center', h: 28, name: 'Grue' },
    // Est : bâtiment moderne gris avec héliport et escalier extérieur.
    { type: 'block', angle: 102, radius: 152, facing: 'center', w: 16, d: 12, floors: 2, roof: 'heliport', exteriorStairs: true, banner: true, colors: { wall: '#6c757d', accent: '#7b2ff7', trim: '#dee2e6' }, name: 'Bâtiment moderne (héliport)' },
    { type: 'block', angle: 56, radius: 140, facing: 'center', w: 14, d: 9, floors: 1, banner: true, colors: { wall: '#f8f9fa', accent: '#7b2ff7', parapet: '#7b2ff7' }, name: 'Magasin violet' },
    // Ouest : ruines.
    { type: 'ruins', angle: 270, radius: 160, facing: 'center', name: 'Ruines' },
    // Autres maisons.
    { type: 'block', angle: 214, radius: 205, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#9d4edd', accent: '#ffd166' }, name: 'Maison sud-ouest' },
    { type: 'block', angle: 158, radius: 212, facing: 'center', w: 12, d: 9, floors: 3, banner: true, colors: { wall: '#4895ef', accent: '#ffd166' }, name: 'Immeuble sud-est' },
    { type: 'block', angle: 130, radius: 245, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#ffd166', accent: '#e63946' }, name: 'Maison est' },
    { type: 'block', angle: 236, radius: 262, facing: 'center', w: 10, d: 8, floors: 1, colors: { wall: '#ef476f', accent: '#ffffff' }, name: 'Maison ouest' },
    { type: 'block', angle: 296, radius: 252, facing: 'center', w: 10, d: 8, floors: 2, colors: { wall: '#f4a261', accent: '#2a9d8f' }, name: 'Maison nord-ouest' },
    // Véhicules garés (décor, sans collision).
    { type: 'vehicle', kind: 'truck', angle: 246, radius: 32, facing: 156, color: '#2d6cdf' },
    { type: 'vehicle', kind: 'van', angle: 68, radius: 116, facing: 'center' },
    { type: 'vehicle', kind: 'truck', angle: 8, radius: 150, facing: 180, color: '#e63946', cargo: '#f1faee' },
    { type: 'vehicle', kind: 'van', angle: 120, radius: 60, facing: 30, color: '#ffd166', stripe: '#3a86ff' },
  ],

  instances: [
    ...ring(12, 42, 15, (angle, radius) => ({ template: 'lamp', angle, radius })),
    ...ring(4, 24, 0, (angle, radius) => ({ template: 'banner', angle, radius: radius + 0.5, yaw: -angle })),
    // Caisses en bois et haies dans les jardins autour de la fontaine.
    ...[45, 135, 225, 315].flatMap((a) => [
      { template: 'crate', angle: a - 8, radius: 17 },
      { template: 'crate', angle: a + 9, radius: 15 },
      { template: 'crate', angle: a + 2, radius: 21 },
      { template: 'hedge', angle: a - 2, radius: 12.5, yaw: -a + 90 },
    ]),
  ],

  vegetation: {
    areas: [
      { x: 0, z: 0, r0: 156, r1: 322, count: 150, kinds: { treePine: 0.45, treeRound: 0.35, treeAutumn: 0.2 }, spacing: 6 },
      { x: 0, z: 0, r0: 156, r1: 322, count: 110, kinds: { bush: 1 }, spacing: 3 },
      ...[45, 135, 225, 315].map((angle) => ({ angle, radius: 17, r: 6, count: 4, kinds: { bush: 0.6, treeRound: 0.4 }, on: 'garden', spacing: 2.5 })),
      { angle: 270, radius: 160, r: 40, count: 14, kinds: { rock: 0.4, bush: 0.6 }, on: 'ruins', spacing: 4 },
    ],
  },

  spawn: { radius: 300, count: 20, offset: 9, minDistance: 80 },
  zone: { center: [0, 0], maxOffset: 120 },
  training: { origin: [-67, 67, 225] },
};
