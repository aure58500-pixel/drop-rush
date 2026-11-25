// Everything the player carries and its vitals: health/shield, five weapon
// slots, consumables, the equipped weapon timing and item use. Pure logic.
import { PLAYER_CONFIG } from '../config/playerConfig.js';
import { CONSUMABLES } from '../config/consumables.js';
import { Health } from '../combat/Health.js';
import { WeaponController } from '../weapons/WeaponController.js';
import { Inventory } from './Inventory.js';
import { ConsumableUse, UseResult } from './ConsumableUse.js';

export class PlayerLoadout {
  constructor() {
    this.health = new Health({ maxHealth: PLAYER_CONFIG.maxHealth, maxShield: PLAYER_CONFIG.maxShield, shield: 0 });
    this.inventory = new Inventory();
    this.weapon = new WeaponController();
    this.use = new ConsumableUse();
  }

  get activeItem() {
    return this.inventory.activeItem;
  }

  get activeWeapon() {
    return this.weapon.weapon;
  }

  reset({ keepItems = false } = {}) {
    this.health.reset(PLAYER_CONFIG.maxHealth, 0);
    this.use.cancel();
    if (!keepItems) this.inventory.clear();
    this.weapon.item = undefined; // force re-equip
    this.syncEquipped();
  }

  // Keeps the weapon controller on the active slot (cancels reload on change).
  syncEquipped() {
    const item = this.inventory.activeItem;
    if (this.weapon.item !== item) this.weapon.equip(item);
  }

  selectSlot(index) {
    if (this.inventory.select(index)) {
      this.use.cancel();
      this.syncEquipped();
      return true;
    }
    return false;
  }

  cycleSlot(step) {
    if (this.inventory.cycle(step)) {
      this.use.cancel();
      this.syncEquipped();
      return true;
    }
    return false;
  }

  pickWeapon(item) {
    const result = this.inventory.addWeapon(item);
    if (result.accepted) this.syncEquipped();
    return result;
  }

  dropActive() {
    const item = this.inventory.removeActive();
    if (item) this.syncEquipped();
    return item;
  }

  startUse(id) {
    const r = this.use.start(id, this.inventory, this.health);
    if (r === UseResult.STARTED) this.weapon.cancelReload();
    return r;
  }

  consumableName(id) {
    return CONSUMABLES[id].name;
  }
}
