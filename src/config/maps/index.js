// Map registry. Each map lives in its own data file, loaded on demand.
// `thumbnail` (relative to the site root) is shown in the map choice when the
// image exists in public/maps/; otherwise the map name is displayed.
export const MAP_REGISTRY = {
  ile: { name: "L'Île", thumbnail: 'maps/carte-ile.png', load: () => import('./ile.js') },
  canaux: { name: 'Ville des Canaux', thumbnail: 'maps/carte-canaux.png', load: () => import('./canaux.js') },
  'cite-ruines': { name: 'Cité des Ruines', thumbnail: 'maps/carte-cite-ruines.png', load: () => import('./citeRuines.js') },
};

export const MAP_IDS = Object.keys(MAP_REGISTRY);
export const DEFAULT_MAP_ID = 'ile';

// Unknown ids (old maps, corrupted or remote data) fall back to the default map.
export function normalizeMapId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MAP_REGISTRY, id) ? id : DEFAULT_MAP_ID;
}

export async function loadMapDefinition(id) {
  const module = await MAP_REGISTRY[normalizeMapId(id)].load();
  return module.default;
}
