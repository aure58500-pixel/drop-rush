// Graphics quality presets and adaptive quality parameters.
export const QUALITY_LEVELS = ['high', 'medium', 'low'];

export const QUALITY_PRESETS = {
  high: {
    label: 'Élevée',
    pixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    shadowRadius: 45,
    viewDistance: 420,
    vegetationDensity: 1, // bushes, flowers (decor without collision)
    grassDensity: 1,
  },
  medium: {
    label: 'Moyenne',
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    shadowRadius: 32,
    viewDistance: 300,
    vegetationDensity: 0.7,
    grassDensity: 0.45,
  },
  low: {
    label: 'Basse',
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    shadowRadius: 25,
    viewDistance: 200,
    vegetationDensity: 0.4,
    grassDensity: 0,
  },
};

export const ADAPTIVE_QUALITY = {
  fpsThreshold: 45,
  sampleWindow: 2.5, // seconds averaged before deciding
  cooldown: 4, // seconds between two downgrades
  warmup: 3, // seconds ignored after a quality change or game start
};

export const RENDER_SETTINGS = {
  maxDynamicLights: 3,
  toneMappingExposure: 1.0,
  cloudCount: 22,
};
