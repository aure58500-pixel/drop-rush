// Test map ("Terrain d'essai"): small island used to validate movement,
// collisions, camera and rendering. Coordinates in meters, Y up, map centered on 0.
export default {
  id: 'test',
  name: "Terrain d'essai",
  description: 'Île de 200 m pour tester les déplacements et les collisions.',
  size: 200,
  seed: 1337,

  terrain: {
    cellSize: 2,
    baseHeight: 1.6,
    layers: [
      { amplitude: 9, frequency: 0.012, octaves: 3 },
      { amplitude: 1.6, frequency: 0.07, octaves: 2 },
    ],
    edgeFalloff: 16,
    edgeHeight: -7,
  },

  water: {
    oceanLevel: -1.0,
    oceanSlowFactor: 0.7,
    rivers: [
      {
        points: [[-82, 48], [-50, 40], [-20, 52], [10, 44], [40, 56], [82, 46]],
        width: 9,
        bank: 4,
        surfaceDrop: 1.3, // water surface below the natural ground
        depth: 1.0, // water depth at the channel center
        slowFactor: 0.7, // 30 % slower in the water
      },
    ],
  },

  palette: {
    grass: ['#7cb342', '#8bc34a', '#9ccc65'],
    dryGrass: '#c9b458',
    sand: '#e9d29a',
    rock: '#9e9a91',
    dirt: '#b08a5a',
    underwater: '#6d9c8c',
    water: '#3ab7d8',
    ocean: '#2a8fb8',
    foliage: ['#4caf50', '#5fbf3a', '#3e8e41', '#83c341'],
    pine: ['#2e7d4f', '#357a38', '#24704a'],
    trunk: '#7a5230',
    bush: ['#5aa83a', '#6dbb45', '#4e9a33'],
    rocks: ['#a8a39a', '#8f8b84', '#b9b2a6'],
    grassBlade: ['#86c34a', '#9bd157', '#74b33e'],
    flowers: ['#ffd23f', '#ff6b9e', '#ffffff', '#b28dff'],
  },

  lighting: {
    sunColor: '#fff1d0',
    sunIntensity: 2.8,
    sunDirection: [0.55, 0.62, 0.38],
    hemiSky: '#bfe3ff',
    hemiGround: '#8a7a52',
    hemiIntensity: 1.35,
    fogColor: '#cfe6f2',
    fogNear: 60,
  },

  sky: {
    top: '#3d8fe0',
    horizon: '#cfe6f2',
    bottom: '#8fc3d9',
    sun: '#fff3c4',
    clouds: '#ffffff',
  },

  buildings: [
    { type: 'house', x: -38, z: -42, rotation: 0, width: 10, depth: 8, floors: 2 },
    { type: 'house', x: 36, z: -46, rotation: 90, width: 9, depth: 8, floors: 1, colors: { wall: '#f2cc8f', roof: '#3d5a80' } },
    { type: 'house', x: -62, z: 2, rotation: 270, width: 10, depth: 9, floors: 3, roof: 'flat', colors: { wall: '#d8e2dc', trim: '#ffffff', floor: '#9c8c7a' } },
    { type: 'hangar', x: 52, z: 8, rotation: 180, width: 24, depth: 16 },
    { type: 'bridge', x: -2, z: 48, rotation: 0, width: 4, length: 20 },
  ],

  areas: [
    {
      id: 'training',
      x: 0,
      z: 0,
      width: 44,
      depth: 40,
      margin: 10,
      groundColor: '#cdb58a',
      props: [
        // Step height tests: 0.30 / 0.45 climb automatically, 0.60 needs a jump.
        { type: 'box', x: -14, z: -12, w: 2.5, h: 0.3, d: 2.5, color: '#ffd166' },
        { type: 'box', x: -10, z: -12, w: 2.5, h: 0.45, d: 2.5, color: '#f4a261' },
        { type: 'box', x: -6, z: -12, w: 2.5, h: 0.6, d: 2.5, color: '#e76f51' },
        { type: 'crate', x: -2, z: -12, w: 2.5, h: 1.3, d: 2.5, color: '#d4a373', material: 'wood' },
        { type: 'box', x: 2, z: -12, w: 2.5, h: 2.2, d: 2.5, color: '#e63946' },
        { type: 'wall', x: 10, z: -12, w: 8, h: 3, d: 0.3, color: '#8ecae6' },
        { type: 'wall', x: 14, z: -6, w: 0.3, h: 3, d: 12, color: '#8ecae6', rotation: 0 },
        // 45° ramp (4 m) leading to a 4 m high platform.
        { type: 'ramp', x: -12, z: 8, w: 4, h: 4, d: 4, platform: 4, color: '#90be6d', platformColor: '#43aa8b' },
        // Stairs to a 3 m platform.
        { type: 'stairs', x: -4, z: 10, w: 2, h: 3, d: 3.6, color: '#bc8a5f', material: 'wood' },
        { type: 'box', x: -4, z: 6.2, y: 0, w: 4, h: 3, d: 4, color: '#a98467' },
        // Crouch tunnel (1.25 m clearance).
        { type: 'tunnel', x: 6, z: 8, length: 8, width: 2.4, height: 1.25, color: '#577590', roofColor: '#4d908e' },
        // Pillars for camera collision tests.
        { type: 'pillar', x: 14, z: 6, r: 0.6, h: 5, color: '#f9c74f' },
        { type: 'pillar', x: 17, z: 10, r: 0.6, h: 5, color: '#f9844a' },
        { type: 'pillar', x: 14, z: 14, r: 0.6, h: 5, color: '#f94144' },
        { type: 'fence', x: 0, z: 18, length: 16, color: '#8d6e63' },
      ],
    },
  ],

  props: [
    { type: 'crate', x: -30, z: -32, w: 1.2, h: 1.2, d: 1.2, color: '#d4a373', material: 'wood' },
    { type: 'crate', x: -28.6, z: -32.3, w: 1.2, h: 1.2, d: 1.2, color: '#c58b5a', material: 'wood', rotation: 90 },
    { type: 'fence', x: 36, z: -36, length: 12, color: '#8d6e63' },
    { type: 'fence', x: -50, z: -42, length: 12, rotation: 90, color: '#8d6e63' },
  ],

  vegetation: {
    trees: 170,
    pineRatio: 0.5,
    rocks: 55,
    bushes: 240,
    grass: 5000,
    flowers: 700,
    exclusions: [{ x: 0, z: 0, radius: 6 }],
  },

  spawnPoints: [
    { x: 0, z: 4, yaw: 0 },
  ],
};
