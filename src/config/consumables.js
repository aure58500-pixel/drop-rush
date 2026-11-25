// Consumables. `heal` restores health, `shield` restores shield.
// `cap`: the value cannot go above it with this item (health or shield).
// Using an item takes `useTime` seconds; moving or shooting cancels it.
export const CONSUMABLES = {
  smallHeal: { id: 'smallHeal', name: 'Petit soin', short: 'Soin', stat: 'health', amount: 25, cap: 100, useTime: 2, color: '#ef476f', key: 'useItem1' },
  bigHeal: { id: 'bigHeal', name: 'Grand soin', short: 'Soin +', stat: 'health', amount: 100, cap: 100, useTime: 5, color: '#ff006e', key: 'useItem2' },
  smallShield: { id: 'smallShield', name: 'Petit bouclier', short: 'Bouclier', stat: 'shield', amount: 25, cap: 100, useTime: 2, color: '#4cc9f0', key: 'useItem3' },
  bigShield: { id: 'bigShield', name: 'Grand bouclier', short: 'Bouclier +', stat: 'shield', amount: 50, cap: 100, useTime: 4, color: '#4361ee', key: 'useItem4' },
};

export const CONSUMABLE_ORDER = ['smallHeal', 'bigHeal', 'smallShield', 'bigShield'];
export const MAX_CONSUMABLE_STACK = 5;
