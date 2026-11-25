// Weapon catalogue. Add an entry to create a new weapon: no system code changes needed.
//
// Units: damage in HP, fireRate in rounds per minute, reloadTime / equipTime in
// seconds, range in meters (Infinity = whole map), spread in degrees (half-angle
// of the shot cone), recoil in degrees of camera kick per shot.
// fireMode: 'semi' (one shot per click), 'auto' (hold), 'burst' (burstCount shots per click).
// pellets: projectiles per shot (shotgun). projectile: physical projectile
// instead of a hitscan ray. explosion: area damage (linear falloff to 0 at radius).
//
// model.parts: low-poly boxes [x0, y0, z0, x1, y1, z1, colorKey] in meters.
// Weapon frame: hand grip at the origin, barrel toward +Z, +Y up.
// sound: parameters of the synthesized shot (see audio/SoundSynth.js).

export const WEAPON_CATEGORIES = {
  pistol: { name: 'Pistolet', color: '#9aa5b1' },
  smg: { name: 'Mitraillette', color: '#4cc9f0' },
  rifle: { name: 'Fusil', color: '#80ed99' },
  shotgun: { name: 'Fusil à pompe', color: '#f4a261' },
  sniper: { name: 'Précision', color: '#c77dff' },
  heavy: { name: 'Lourde', color: '#ffd166' },
};

const PISTOL_MODEL = {
  colors: { body: '#3d4451', dark: '#1f232b', accent: '#f4a261' },
  parts: [
    [-0.022, -0.11, -0.035, 0.022, 0.0, 0.015, 'dark'],
    [-0.025, 0.0, -0.05, 0.025, 0.055, 0.15, 'body'],
    [-0.012, 0.055, 0.12, 0.012, 0.07, 0.14, 'accent'],
    [-0.01, -0.03, 0.01, 0.01, 0.0, 0.05, 'dark'],
  ],
  muzzle: [0, 0.03, 0.16],
};

export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'Pistolet léger', category: 'pistol', icon: 'pistol',
    damage: 18, fireRate: 240, magazine: 12, reloadTime: 1.4, range: 60, spread: 1.2,
    fireMode: 'semi', pellets: 1, reserveAmmo: 48, equipTime: 0.25,
    canFireWhileSprinting: true, headshotMultiplier: 2,
    recoil: 0.8, hold: 'pistol',
    model: PISTOL_MODEL,
    sound: { duration: 0.32, body: 210, bodyDecay: 28, crack: 0.9, crackDecay: 70, tail: 9, lowpass: 0.35, gain: 0.55, seed: 101 },
  },

  revolver: {
    id: 'revolver', name: 'Revolver', category: 'pistol', icon: 'revolver',
    damage: 45, fireRate: 90, magazine: 6, reloadTime: 2.2, range: 80, spread: 0.8,
    fireMode: 'semi', pellets: 1, reserveAmmo: 24, equipTime: 0.3,
    canFireWhileSprinting: true, headshotMultiplier: 2,
    recoil: 2.6, hold: 'pistol',
    model: {
      colors: { body: '#8d99ae', dark: '#2b2d42', wood: '#8a5a32', accent: '#d9b44a' },
      parts: [
        [-0.024, -0.12, -0.05, 0.024, -0.005, 0.0, 'wood'],
        [-0.026, -0.01, -0.04, 0.026, 0.06, 0.04, 'body'],
        [-0.036, -0.005, 0.0, 0.036, 0.055, 0.075, 'dark'],
        [-0.016, 0.01, 0.075, 0.016, 0.045, 0.27, 'body'],
        [-0.006, 0.045, 0.24, 0.006, 0.065, 0.26, 'accent'],
        [-0.008, -0.04, 0.0, 0.008, -0.01, 0.04, 'dark'],
      ],
      muzzle: [0, 0.028, 0.28],
    },
    sound: { duration: 0.6, body: 120, bodyDecay: 14, crack: 1, crackDecay: 45, tail: 5, lowpass: 0.25, gain: 0.8, seed: 102 },
  },

  burstSmg: {
    id: 'burstSmg', name: 'SMG rafale', category: 'smg', icon: 'smg',
    damage: 16, fireRate: 900, magazine: 30, reloadTime: 1.8, range: 45, spread: 2.5,
    fireMode: 'burst', burstCount: 3, burstDelay: 0.22, pellets: 1, reserveAmmo: 120, equipTime: 0.3,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 0.55, hold: 'rifle',
    model: {
      colors: { body: '#2f3e46', dark: '#161a1d', accent: '#4cc9f0' },
      parts: [
        [-0.03, -0.02, -0.14, 0.03, 0.07, 0.22, 'body'],
        [-0.022, -0.17, 0.04, 0.022, -0.02, 0.09, 'dark'],
        [-0.02, -0.11, -0.04, 0.02, -0.02, 0.0, 'dark'],
        [-0.014, 0.01, 0.22, 0.014, 0.04, 0.33, 'dark'],
        [-0.025, 0.0, -0.3, 0.025, 0.05, -0.14, 'dark'],
        [-0.032, 0.07, -0.02, 0.032, 0.09, 0.12, 'accent'],
      ],
      muzzle: [0, 0.025, 0.34],
    },
    sound: { duration: 0.22, body: 260, bodyDecay: 40, crack: 0.8, crackDecay: 90, tail: 14, lowpass: 0.45, gain: 0.45, seed: 103 },
  },

  compactSmg: {
    id: 'compactSmg', name: 'SMG compacte', category: 'smg', icon: 'smg',
    damage: 14, fireRate: 1100, magazine: 35, reloadTime: 2.0, range: 35, spread: 3.0,
    fireMode: 'auto', pellets: 1, reserveAmmo: 140, equipTime: 0.25,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 0.45, hold: 'rifle',
    model: {
      colors: { body: '#5a189a', dark: '#1b1b1e', accent: '#ff4ecd' },
      parts: [
        [-0.028, -0.02, -0.08, 0.028, 0.065, 0.17, 'body'],
        [-0.02, -0.2, -0.01, 0.02, -0.02, 0.035, 'dark'],
        [-0.012, 0.01, 0.17, 0.012, 0.035, 0.24, 'dark'],
        [-0.03, 0.065, 0.0, 0.03, 0.08, 0.1, 'accent'],
        [-0.02, 0.0, -0.16, 0.02, 0.03, -0.08, 'dark'],
      ],
      muzzle: [0, 0.022, 0.25],
    },
    sound: { duration: 0.18, body: 300, bodyDecay: 50, crack: 0.7, crackDecay: 110, tail: 18, lowpass: 0.55, gain: 0.4, seed: 104 },
  },

  assaultRifle: {
    id: 'assaultRifle', name: "Fusil d'assaut", category: 'rifle', icon: 'rifle',
    damage: 30, fireRate: 600, magazine: 30, reloadTime: 2.4, range: 150, spread: 1.8,
    fireMode: 'auto', pellets: 1, reserveAmmo: 120, equipTime: 0.35,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 0.75, hold: 'rifle',
    model: {
      colors: { body: '#495057', dark: '#212529', accent: '#80ed99' },
      parts: [
        [-0.032, -0.03, -0.16, 0.032, 0.075, 0.34, 'body'],
        [-0.03, -0.01, -0.46, 0.03, 0.06, -0.16, 'dark'],
        [-0.032, -0.06, -0.46, 0.032, 0.06, -0.4, 'dark'],
        [-0.024, -0.19, 0.06, 0.024, -0.03, 0.12, 'dark'],
        [-0.02, -0.12, -0.05, 0.02, -0.03, -0.01, 'dark'],
        [-0.014, 0.012, 0.34, 0.014, 0.04, 0.58, 'dark'],
        [-0.022, 0.075, 0.02, 0.022, 0.11, 0.14, 'accent'],
      ],
      muzzle: [0, 0.026, 0.6],
    },
    sound: { duration: 0.38, body: 170, bodyDecay: 26, crack: 1, crackDecay: 65, tail: 8, lowpass: 0.38, gain: 0.55, seed: 105 },
  },

  heavyRifle: {
    id: 'heavyRifle', name: "Fusil d'assaut lourd", category: 'rifle', icon: 'rifle',
    damage: 38, fireRate: 480, magazine: 25, reloadTime: 2.6, range: 160, spread: 1.6,
    fireMode: 'auto', pellets: 1, reserveAmmo: 100, equipTime: 0.4,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 1.1, hold: 'rifle',
    model: {
      colors: { body: '#6c584c', dark: '#1e1e1e', accent: '#ffd166' },
      parts: [
        [-0.04, -0.04, -0.17, 0.04, 0.09, 0.36, 'body'],
        [-0.036, -0.02, -0.5, 0.036, 0.07, -0.17, 'body'],
        [-0.036, -0.08, -0.5, 0.036, 0.07, -0.44, 'dark'],
        [-0.03, -0.21, 0.04, 0.03, -0.04, 0.13, 'dark'],
        [-0.022, -0.13, -0.06, 0.022, -0.04, -0.01, 'dark'],
        [-0.02, 0.015, 0.36, 0.02, 0.055, 0.64, 'dark'],
        [-0.03, 0.015, 0.6, 0.03, 0.065, 0.66, 'dark'],
        [-0.03, 0.09, -0.04, 0.03, 0.135, 0.18, 'accent'],
      ],
      muzzle: [0, 0.04, 0.68],
    },
    sound: { duration: 0.45, body: 130, bodyDecay: 20, crack: 1, crackDecay: 55, tail: 6.5, lowpass: 0.3, gain: 0.65, seed: 106 },
  },

  shotgun: {
    id: 'shotgun', name: 'Fusil à pompe', category: 'shotgun', icon: 'shotgun',
    damage: 12, pellets: 8, fireRate: 70, magazine: 6, reloadTime: 3.0, range: 25, spread: 6,
    fireMode: 'semi', reserveAmmo: 24, equipTime: 0.45,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 4.5, hold: 'rifle',
    model: {
      colors: { body: '#3a3a3a', dark: '#1a1a1a', wood: '#9c6644', accent: '#f4a261' },
      parts: [
        [-0.032, -0.03, -0.12, 0.032, 0.06, 0.14, 'body'],
        [-0.028, -0.05, -0.48, 0.028, 0.05, -0.12, 'wood'],
        [-0.02, -0.11, -0.06, 0.02, -0.03, -0.02, 'dark'],
        [-0.02, 0.02, 0.14, 0.02, 0.06, 0.62, 'dark'],
        [-0.017, -0.02, 0.14, 0.017, 0.015, 0.56, 'dark'],
        [-0.032, -0.045, 0.26, 0.032, 0.025, 0.44, 'wood'],
        [-0.006, 0.06, 0.58, 0.006, 0.075, 0.6, 'accent'],
      ],
      muzzle: [0, 0.04, 0.63],
    },
    sound: { duration: 0.7, body: 90, bodyDecay: 11, crack: 1, crackDecay: 30, tail: 4.5, lowpass: 0.22, gain: 0.85, seed: 107 },
  },

  sniper: {
    id: 'sniper', name: 'Fusil de précision', category: 'sniper', icon: 'sniper',
    damage: 90, fireRate: 45, magazine: 5, reloadTime: 3.0, range: 400, spread: 0.2,
    fireMode: 'semi', pellets: 1, reserveAmmo: 20, equipTime: 0.55,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 5, hold: 'rifle', aimFov: 30,
    model: {
      colors: { body: '#344e41', dark: '#14181b', wood: '#7f5539', accent: '#c77dff' },
      parts: [
        [-0.032, -0.03, -0.14, 0.032, 0.06, 0.3, 'body'],
        [-0.03, -0.07, -0.6, 0.03, 0.05, -0.14, 'wood'],
        [-0.02, -0.12, -0.05, 0.02, -0.03, -0.01, 'dark'],
        [-0.022, -0.12, 0.08, 0.022, -0.03, 0.15, 'dark'],
        [-0.013, 0.008, 0.3, 0.013, 0.035, 0.95, 'dark'],
        [-0.025, 0.08, -0.06, 0.025, 0.13, 0.22, 'dark'],
        [-0.03, 0.075, 0.2, 0.03, 0.135, 0.25, 'accent'],
        [-0.01, 0.06, 0.02, 0.01, 0.08, 0.12, 'dark'],
      ],
      muzzle: [0, 0.022, 0.97],
    },
    sound: { duration: 0.95, body: 80, bodyDecay: 9, crack: 1, crackDecay: 120, tail: 3, lowpass: 0.3, gain: 0.95, seed: 108 },
  },

  carbine: {
    id: 'carbine', name: 'Carabine semi-automatique', category: 'rifle', icon: 'rifle',
    damage: 35, fireRate: 180, magazine: 15, reloadTime: 2.2, range: 200, spread: 0.6,
    fireMode: 'semi', pellets: 1, reserveAmmo: 60, equipTime: 0.4,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 1.4, hold: 'rifle', aimFov: 45,
    model: {
      colors: { body: '#5e503f', dark: '#22223b', wood: '#a47148', accent: '#80ed99' },
      parts: [
        [-0.03, -0.03, -0.14, 0.03, 0.06, 0.3, 'body'],
        [-0.028, -0.06, -0.5, 0.028, 0.05, -0.14, 'wood'],
        [-0.028, -0.06, 0.08, 0.028, 0.0, 0.36, 'wood'],
        [-0.022, -0.13, 0.04, 0.022, -0.03, 0.1, 'dark'],
        [-0.012, 0.01, 0.3, 0.012, 0.035, 0.66, 'dark'],
        [-0.018, 0.07, -0.02, 0.018, 0.105, 0.16, 'dark'],
        [-0.022, 0.065, 0.14, 0.022, 0.11, 0.17, 'accent'],
      ],
      muzzle: [0, 0.022, 0.68],
    },
    sound: { duration: 0.5, body: 150, bodyDecay: 18, crack: 1, crackDecay: 80, tail: 6, lowpass: 0.33, gain: 0.65, seed: 109 },
  },

  crossbow: {
    id: 'crossbow', name: 'Arbalète', category: 'sniper', icon: 'crossbow',
    damage: 80, fireRate: 40, magazine: 1, reloadTime: 2.5, range: 120, spread: 0.3,
    fireMode: 'semi', pellets: 1, reserveAmmo: 15, equipTime: 0.45,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 1.5, hold: 'rifle',
    projectile: { kind: 'arrow', speed: 60, gravity: 4, radius: 0.03, stickSeconds: 10 },
    model: {
      colors: { body: '#7f5539', dark: '#2b2118', metal: '#adb5bd', accent: '#c77dff' },
      parts: [
        [-0.03, -0.035, -0.42, 0.03, 0.04, 0.32, 'body'],
        [-0.02, -0.12, -0.06, 0.02, -0.035, -0.01, 'dark'],
        [-0.28, 0.0, 0.26, 0.28, 0.03, 0.3, 'dark'],
        [-0.3, 0.0, 0.2, -0.26, 0.03, 0.27, 'dark'],
        [0.26, 0.0, 0.2, 0.3, 0.03, 0.27, 'dark'],
        [-0.27, 0.02, 0.08, 0.27, 0.026, 0.1, 'metal'],
        [-0.008, 0.04, -0.12, 0.008, 0.055, 0.36, 'accent'],
      ],
      muzzle: [0, 0.05, 0.36],
    },
    sound: { kind: 'bow', duration: 0.35, body: 420, bodyDecay: 22, crack: 0.25, crackDecay: 120, tail: 10, lowpass: 0.5, gain: 0.6, seed: 110 },
  },

  lmg: {
    id: 'lmg', name: 'Mitrailleuse légère', category: 'heavy', icon: 'lmg',
    damage: 22, fireRate: 750, magazine: 75, reloadTime: 4.5, range: 120, spread: 3.5,
    fireMode: 'auto', pellets: 1, reserveAmmo: 150, equipTime: 0.6,
    canFireWhileSprinting: false, headshotMultiplier: 2,
    recoil: 0.65, hold: 'rifle',
    model: {
      colors: { body: '#4a4e69', dark: '#16161d', accent: '#ffd166', metal: '#9a8c98' },
      parts: [
        [-0.045, -0.04, -0.2, 0.045, 0.1, 0.38, 'body'],
        [-0.038, -0.02, -0.52, 0.038, 0.07, -0.2, 'dark'],
        [-0.06, -0.2, -0.02, 0.06, -0.04, 0.14, 'accent'],
        [-0.022, -0.13, -0.08, 0.022, -0.04, -0.03, 'dark'],
        [-0.022, 0.02, 0.38, 0.022, 0.06, 0.75, 'dark'],
        [-0.034, 0.0, 0.38, 0.034, 0.08, 0.5, 'metal'],
        [-0.05, -0.16, 0.6, -0.035, 0.02, 0.62, 'dark'],
        [0.035, -0.16, 0.6, 0.05, 0.02, 0.62, 'dark'],
        [-0.03, 0.1, -0.05, 0.03, 0.13, 0.2, 'dark'],
      ],
      muzzle: [0, 0.04, 0.77],
    },
    sound: { duration: 0.34, body: 140, bodyDecay: 24, crack: 0.95, crackDecay: 60, tail: 9, lowpass: 0.32, gain: 0.55, seed: 111 },
  },

  rocketLauncher: {
    id: 'rocketLauncher', name: 'Lance-roquettes', category: 'heavy', icon: 'rocket',
    damage: 100, fireRate: 30, magazine: 1, reloadTime: 3.5, range: Infinity, spread: 0,
    fireMode: 'semi', pellets: 1, reserveAmmo: 6, equipTime: 0.6,
    canFireWhileSprinting: false, headshotMultiplier: 1, // no headshot bonus
    damageFalloff: false,
    recoil: 4, hold: 'shoulder',
    projectile: { kind: 'rocket', speed: 40, gravity: 0, radius: 0.08 },
    explosion: { radius: 4, damage: 60, selfDamage: false },
    model: {
      colors: { body: '#606c38', dark: '#283618', accent: '#e63946', metal: '#adb5bd' },
      parts: [
        [-0.075, -0.0, -0.55, 0.075, 0.15, 0.55, 'body'],
        [-0.085, -0.01, 0.5, 0.085, 0.16, 0.62, 'dark'],
        [-0.085, -0.01, -0.62, 0.085, 0.16, -0.5, 'dark'],
        [-0.02, -0.12, -0.04, 0.02, 0.0, 0.01, 'dark'],
        [-0.02, -0.12, 0.2, 0.02, 0.0, 0.25, 'dark'],
        [-0.05, 0.15, -0.06, 0.05, 0.2, 0.12, 'metal'],
        [-0.08, 0.05, 0.3, 0.08, 0.1, 0.4, 'accent'],
      ],
      muzzle: [0, 0.075, 0.64],
    },
    sound: { kind: 'rocket', duration: 0.9, body: 70, bodyDecay: 5, crack: 0.6, crackDecay: 18, tail: 3, lowpass: 0.12, gain: 0.8, seed: 112 },
  },
};

export const WEAPON_ORDER = [
  'pistol', 'revolver', 'burstSmg', 'compactSmg', 'assaultRifle', 'heavyRifle',
  'shotgun', 'sniper', 'carbine', 'crossbow', 'lmg', 'rocketLauncher',
];

export function getWeapon(id) {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Arme inconnue : ${id}`);
  return w;
}
