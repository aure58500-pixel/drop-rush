// Items lying in the world (weapons and consumables). Pure logic.
// `take` is the single entry point that removes an item, so the network layer
// can later replace it with an atomic Firebase transaction.
import { TRAINING_CONFIG } from '../config/combatConfig.js';
import { createWeaponItem } from '../weapons/WeaponController.js';

let lootCounter = 0;

export class LootSystem {
  constructor({ hooks = {}, respawnDelay = TRAINING_CONFIG.lootRespawnDelay } = {}) {
    this.items = new Map();
    this.spawns = []; // map-defined spawns that come back after being taken (training)
    this.hooks = hooks;
    this.respawnDelay = respawnDelay;
  }

  _add(item) {
    this.items.set(item.id, item);
    this.hooks.onAdded?.(item);
    return item;
  }

  // Map-defined item. `respawn` = true in training.
  addSpawn(def, y, { respawn = true } = {}) {
    const spawn = { def, y, timer: 0, itemId: null, respawn };
    this.spawns.push(spawn);
    this._spawn(spawn);
    return spawn;
  }

  _spawn(spawn) {
    const { def } = spawn;
    lootCounter += 1;
    const item = def.weapon
      ? { id: `loot-${lootCounter}`, kind: 'weapon', weapon: createWeaponItem(def.weapon), x: def.x, y: spawn.y, z: def.z }
      : { id: `loot-${lootCounter}`, kind: 'consumable', consumable: def.consumable, count: def.count || 1, x: def.x, y: spawn.y, z: def.z };
    item.spawn = spawn;
    spawn.itemId = item.id;
    this._add(item);
  }

  dropWeapon(weaponItem, x, y, z) {
    lootCounter += 1;
    return this._add({ id: `loot-${lootCounter}`, kind: 'weapon', weapon: weaponItem, x, y, z, dropped: true });
  }

  dropConsumable(id, count, x, y, z) {
    lootCounter += 1;
    return this._add({ id: `loot-${lootCounter}`, kind: 'consumable', consumable: id, count, x, y, z, dropped: true });
  }

  // Nearest item within radius (horizontal distance, small vertical tolerance).
  nearest(x, y, z, radius) {
    let best = null;
    let bestD = radius;
    for (const it of this.items.values()) {
      if (Math.abs(it.y - y) > 1.6) continue;
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  // Removes the item; returns it, or null if somebody already took it.
  take(id) {
    const it = this.items.get(id);
    if (!it) return null;
    this.items.delete(id);
    this.hooks.onRemoved?.(it);
    if (it.spawn?.respawn) {
      it.spawn.itemId = null;
      it.spawn.timer = this.respawnDelay;
    }
    return it;
  }

  // Partial pickup of a consumable stack.
  reduce(id, remaining) {
    const it = this.items.get(id);
    if (!it) return;
    it.count = remaining;
    this.hooks.onChanged?.(it);
  }

  update(dt) {
    for (const s of this.spawns) {
      if (s.itemId || !s.respawn) continue;
      s.timer -= dt;
      if (s.timer <= 0) this._spawn(s);
    }
  }

  // Removes every item and restores the map spawns.
  reset() {
    for (const id of [...this.items.keys()]) {
      const it = this.items.get(id);
      this.items.delete(id);
      this.hooks.onRemoved?.(it);
    }
    for (const s of this.spawns) {
      s.itemId = null;
      this._spawn(s);
    }
  }
}
