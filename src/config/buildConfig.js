// Building system parameters (meters, seconds). Edit values here, not in the systems.
export const BUILD_CONFIG = {
  gridSize: 2, // horizontal grid cell
  floorHeight: 2, // vertical level height
  maxBuilds: 1000, // technical limit per room
  maxLevel: 12, // highest level above the ground anchor
  placeAnimationSeconds: 0.25,
  reach: 14, // max distance between the player and a placed piece
  mapMargin: 1, // keep pieces this far inside the map edge
  repeatDelay: 0.16, // seconds between pieces while the button is held
  wheelCooldown: 0.12, // seconds between two piece changes with the wheel
  groundSnap: 0.05, // pieces anchored on terrain are rounded up to this step
  maxSkirtDepth: 2, // filler under ground-level pieces that float above sloped terrain
  skirtEmbed: 0.2, // filler goes this deep into the ground

  // Shapes. A 45° ramp needs height === gridSize (rise equals run).
  pieces: {
    wall: { id: 'wall', name: 'Mur', height: 2, thickness: 0.25, health: 200, color: '#d9a65f' },
    ramp: { id: 'ramp', name: 'Rampe', height: 2, health: 150, color: '#58b4e0' },
    platform: { id: 'platform', name: 'Plateforme', thickness: 0.25, health: 100, color: '#e8cf6b' },
  },
  pieceOrder: ['wall', 'ramp', 'platform'],

  preview: { valid: '#2ee66b', invalid: '#ff3b4f', opacity: 0.42 },
  debris: { count: 14, lifetime: 0.9, maxParticles: 96 },
};
