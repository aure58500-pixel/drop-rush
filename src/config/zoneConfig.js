// Safe zone phases. start / duration in seconds from the match start,
// radiusFactor is relative to half the map size, damage in HP per second outside.
export const ZONE_CONFIG = {
  matchDuration: 15 * 60,
  centerEdgeMargin: 0.25, // the center stays at least 25 % of the map size from the edge
  phases: [
    { start: 120, duration: 60, radiusFactor: 0.7, damage: 1 },
    { start: 240, duration: 60, radiusFactor: 0.45, damage: 2 },
    { start: 390, duration: 60, radiusFactor: 0.25, damage: 4 },
    { start: 510, duration: 60, radiusFactor: 0.12, damage: 6 },
    { start: 630, duration: 45, radiusFactor: 0.05, damage: 10 },
    { start: 750, duration: 30, radiusFactor: 0, damage: 20 },
  ],
};
