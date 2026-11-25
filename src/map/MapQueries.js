// Gameplay queries about the map: water slowdown, boundaries, out-of-map.
export class MapQueries {
  constructor(layout, killHeight) {
    this.terrain = layout.terrain;
    this.half = layout.size / 2;
    this.killHeight = killHeight;
    this.oceanLevel = layout.water.oceanLevel;
    this.oceanSlowFactor = layout.water.oceanSlowFactor;
  }

  // Returns the slowdown factor if the feet are below a water surface, else 1.
  getSpeedMultiplier(x, y, z) {
    if (y < this.oceanLevel - 0.05) return this.oceanSlowFactor;
    const hit = this.terrain.riverAt(x, z);
    if (hit && y < hit.level - 0.05) return hit.river.slowFactor;
    return 1;
  }

  isInWater(x, y, z) {
    return this.getSpeedMultiplier(x, y, z) < 1;
  }

  distanceToBoundary(x, z) {
    return this.half - Math.max(Math.abs(x), Math.abs(z));
  }

  isOutOfBounds(x, y, z) {
    return Math.abs(x) > this.half || Math.abs(z) > this.half || y < this.killHeight;
  }
}
