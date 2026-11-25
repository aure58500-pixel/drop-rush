// Map registry. Each map lives in its own data file and is loaded on demand.
export const MAP_REGISTRY = {
  test: { name: "Terrain d'essai", load: () => import('./testMap.js') },
};

export async function loadMapDefinition(id) {
  const entry = MAP_REGISTRY[id];
  if (!entry) throw new Error(`Carte inconnue : ${id}`);
  const module = await entry.load();
  return module.default;
}
