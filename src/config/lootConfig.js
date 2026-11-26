// Loot generation rules (shared by every map).
export const LOOT_CONFIG = {
  count: 150,
  // Share of each category: weapons / healing / shields.
  ratios: { weapons: 0.4, heals: 0.4, shields: 0.2 },
  weaponWeights: {
    pistol: 3, revolver: 2, burstSmg: 2, compactSmg: 2, assaultRifle: 3, heavyRifle: 1.5,
    shotgun: 3, sniper: 1, carbine: 2, crossbow: 1, lmg: 1, rocketLauncher: 0.7,
  },
  healWeights: { smallHeal: 2, bigHeal: 1 },
  shieldWeights: { smallShield: 2, bigShield: 1 },
  minSpacing: 6, // meters between two loot points
  indoorShare: 0.65, // at most this share comes from building spots
  groundSamples: 2500,
};

// Training spot layout around the map's training origin (local frame,
// forward = -Z, meters). Items in the rack respawn after being taken.
export const TRAINING_LAYOUT = {
  player: [0, 2],
  rack: [-11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11].map((x) => [x, -6]),
  consumables: [
    { consumable: 'smallHeal', count: 2, at: [-4.5, -2.5] },
    { consumable: 'bigHeal', count: 1, at: [-1.5, -2.5] },
    { consumable: 'smallShield', count: 2, at: [1.5, -2.5] },
    { consumable: 'bigShield', count: 1, at: [4.5, -2.5] },
  ],
  dummies: [
    { at: [-8, -14] }, { at: [-4, -16], shield: 50 }, { at: [0, -14], shield: 100 }, { at: [5, -16] },
    { at: [0, -24], shield: 50 }, { at: [-6, -30], shield: 100 },
    { at: [20, -24], kind: 'turret' }, // out of range from the respawn point, in range of the rack
  ],
  clearRadius: 34, // vegetation is kept out of this circle
};
