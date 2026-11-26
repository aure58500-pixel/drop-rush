// Global gameplay and engine parameters. Edit values here, not in the systems.
export const GAME_CONFIG = {
  title: 'Drop Rush',
  maxDeltaTime: 0.05, // seconds, main loop delta cap (50 ms)
  physicsMaxSubstep: 1 / 120, // seconds, max physics substep
  killHeight: -25, // falling below this Y eliminates the player
  boundaryWarningDistance: 12, // meters from the map edge before warning
  trainingRespawnDelay: 3, // seconds (training mode only)
  defaultMapId: 'ile',
  storageKeys: {
    settings: 'dropRush.settings.v1',
    profile: 'dropRush.profile.v1',
  },
};
