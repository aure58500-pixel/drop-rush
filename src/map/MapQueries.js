// Gameplay rules tied to the map: water slowdown, circular boundary, sea and void.
export class MapQueries {
  constructor(layout, killHeight) {
    this.terrain = layout.terrain;
    this.boundaryRadius = layout.boundary.radius;
    this.killHeight = killHeight;
    this.seaLevel = layout.sea ? layout.sea.level : null;
  }

  // Canal water: slows the player while over the channel and below the water
  // surface + jump allowance, so jumping inside a canal does not avoid the slowdown.
  getSpeedMultiplier(x, y, z) {
    const w = this.terrain.waterAt(x, z);
    if (w && y < w.level + w.jumpAllowance) return w.slowFactor;
    return 1;
  }

  // Feet below the water surface (splash sounds).
  isInWater(x, y, z) {
    const w = this.terrain.waterAt(x, z);
    return Boolean(w && y < w.level);
  }

  distanceToBoundary(x, z) {
    return this.boundaryRadius - Math.hypot(x, z);
  }

  // Leaving the map, falling into the sea or into the void eliminates the player.
  isOutOfBounds(x, y, z) {
    if (x * x + z * z > this.boundaryRadius * this.boundaryRadius) return true;
    if (this.seaLevel !== null && y < this.seaLevel) return true;
    return y < this.killHeight;
  }
}
