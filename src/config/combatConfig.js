// Shared combat rules. Weapon-specific values live in weapons.js.
export const COMBAT_CONFIG = {
  // Damage falls to `falloffMultiplier` beyond `falloffStart` x range.
  falloffStart: 0.75,
  falloffMultiplier: 0.6,

  // Spread (bloom): +bloomPerShot degrees per consecutive shot, back to the base
  // value after `bloomResetTime` seconds without shooting.
  bloomPerShot: 0.15,
  bloomResetTime: 0.4,
  maxBloom: 4, // degrees added at most (technical cap, not in the specification)
  spreadMultipliers: { sprint: 1.5, airborne: 2, crouch: 0.7, aim: 0.5 },

  recoilRecovery: 7, // 1/s, camera kick returns toward the aim point
  combatStanceTime: 0.7, // seconds the character keeps facing the aim after a shot

  tracerLifetime: 0.05, // seconds
  hitscanMaxDistance: 1200, // used for weapons with infinite range
  projectileMaxLifetime: 12, // seconds before an unexploded projectile is removed

  pickupRadius: 2.2, // meters
  dropDistance: 1.4, // drop in front of the player
  maxDamageNumbers: 24,

  // Shots from the camera must not hit things between the camera and the player.
  // Damage indicator arc duration.
  damageIndicatorTime: 1.4,
};

export const TRAINING_CONFIG = {
  dummyHealth: 100,
  dummyRespawnDelay: 3,
  lootRespawnDelay: 6,
  turret: {
    damage: 6,
    interval: 1.6, // seconds between shots
    range: 35,
    spread: 2.2, // degrees
    windup: 0.6, // seconds after acquiring the target
  },
};
