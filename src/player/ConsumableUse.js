// Timed use of a consumable. Moving or shooting cancels it.
import { CONSUMABLES } from '../config/consumables.js';

export const UseResult = Object.freeze({
  STARTED: 'started',
  NONE_LEFT: 'Aucun objet de ce type',
  FULL_HEALTH: 'Santé déjà au maximum',
  FULL_SHIELD: 'Bouclier déjà au maximum',
  BUSY: 'Déjà en cours',
});

export class ConsumableUse {
  constructor() {
    this.current = null; // { id, elapsed, duration }
  }

  get active() {
    return this.current !== null;
  }

  get progress() {
    return this.current ? Math.min(1, this.current.elapsed / this.current.duration) : 0;
  }

  get remaining() {
    return this.current ? Math.max(0, this.current.duration - this.current.elapsed) : 0;
  }

  start(id, inventory, health) {
    const c = CONSUMABLES[id];
    if (this.current?.id === id) return UseResult.BUSY;
    if (!inventory.consumables[id]) return UseResult.NONE_LEFT;
    if (!health.canRestore(c.stat, c.cap)) return c.stat === 'shield' ? UseResult.FULL_SHIELD : UseResult.FULL_HEALTH;
    this.current = { id, elapsed: 0, duration: c.useTime };
    return UseResult.STARTED;
  }

  cancel() {
    const was = this.current;
    this.current = null;
    return was;
  }

  /**
   * @returns {null|{type:'cancelled'|'completed', id:string, gained?:number}}
   */
  update(dt, { moving, firing }, inventory, health) {
    if (!this.current) return null;
    if (moving || firing) {
      const { id } = this.cancel();
      return { type: 'cancelled', id };
    }
    this.current.elapsed += dt;
    if (this.current.elapsed < this.current.duration) return null;
    const { id } = this.cancel();
    const c = CONSUMABLES[id];
    if (inventory.consumables[id] <= 0) return { type: 'cancelled', id };
    inventory.consumables[id] -= 1;
    const gained = health.restore(c.stat, c.amount, c.cap);
    return { type: 'completed', id, gained };
  }
}
