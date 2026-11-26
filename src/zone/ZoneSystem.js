// Shrinking safe zone (pure). Same seed + same match time = same circle on every client.
import { ZONE_CONFIG } from '../config/zoneConfig.js';
import { SeededRandom, deriveSeed } from '../core/utils/random.js';

export class ZoneSystem {
  /**
   * @param {{size:number, zone?:{center?:[number, number], maxOffset?:number}}} mapDef
   * @param {number} seed match seed
   */
  constructor(mapDef, seed, cfg = ZONE_CONFIG) {
    this.cfg = cfg;
    this.half = mapDef.size / 2;
    const anchor = mapDef.zone?.center || [0, 0];
    // Allowed area: the center must stay >= margin x size from the circular edge.
    const allowed = Math.max(0, this.half - cfg.centerEdgeMargin * mapDef.size);
    const rng = new SeededRandom(deriveSeed(seed, 'zone'));
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.float()) * Math.min(mapDef.zone?.maxOffset ?? allowed, allowed);
    let cx = anchor[0] + Math.sin(a) * r;
    let cz = anchor[1] - Math.cos(a) * r;
    const d = Math.hypot(cx, cz);
    if (d > allowed && d > 0) {
      cx *= allowed / d;
      cz *= allowed / d;
    }
    this.center = { x: cx, z: cz };
    // Initial circle covers the whole map.
    this.initialRadius = this.half + Math.hypot(cx, cz);
    this.radii = [this.initialRadius, ...cfg.phases.map((p) => p.radiusFactor * this.half)];
  }

  /**
   * State at match time t (seconds).
   * @returns {{radius:number, phase:number, shrinking:boolean, damage:number, next:null|{index:number, in:number}, ended:boolean}}
   */
  stateAt(t) {
    const phases = this.cfg.phases;
    let radius = this.initialRadius;
    let phase = -1;
    let shrinking = false;
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (t < p.start) break;
      phase = i;
      const k = Math.min(1, (t - p.start) / p.duration);
      radius = this.radii[i] + (this.radii[i + 1] - this.radii[i]) * k;
      shrinking = k < 1;
    }
    const nextIndex = phase + 1;
    const next = nextIndex < phases.length ? { index: nextIndex, in: phases[nextIndex].start - t } : null;
    return {
      radius,
      phase,
      shrinking,
      damage: phase >= 0 ? phases[phase].damage : 0,
      next,
      ended: t >= this.cfg.matchDuration,
    };
  }

  isOutside(x, z, radius) {
    return Math.hypot(x - this.center.x, z - this.center.z) > radius;
  }
}
