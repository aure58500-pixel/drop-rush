// Rendering of items lying in the world: floating, spinning models above a
// glowing ring colored by category.
import * as THREE from 'three';
import { getWeapon, WEAPON_CATEGORIES } from '../config/weapons.js';
import { CONSUMABLES } from '../config/consumables.js';
import { createWeaponMesh } from '../weapons/WeaponModels.js';
import { faceted } from '../map/geometryUtils.js';

const ringGeometry = new THREE.RingGeometry(0.32, 0.46, 20).rotateX(-Math.PI / 2);
const ringMaterials = new Map();

function ringMaterial(color) {
  let m = ringMaterials.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, depthWrite: false, side: THREE.DoubleSide });
    ringMaterials.set(color, m);
  }
  return m;
}

const consumableCache = new Map();
function consumableModel(id) {
  if (!consumableCache.has(id)) {
    const c = CONSUMABLES[id];
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: c.color });
    const white = new THREE.MeshLambertMaterial({ color: '#ffffff' });
    if (c.stat === 'health') {
      const big = id === 'bigHeal';
      const w = big ? 0.42 : 0.26;
      const body = new THREE.Mesh(faceted(new THREE.BoxGeometry(w, w * 0.7, w * 0.45)), big ? white : mat);
      g.add(body);
      const crossMat = big ? mat : white;
      const a = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, w * 0.15, w * 0.47), crossMat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, w * 0.5, w * 0.47), crossMat);
      g.add(a, b);
    } else {
      const big = id === 'bigShield';
      const r = big ? 0.16 : 0.1;
      const body = new THREE.Mesh(faceted(new THREE.CylinderGeometry(r, r * 1.1, r * 2.4, 7)), mat);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.45, r * 0.8, 6), white);
      neck.position.y = r * 1.5;
      g.add(body, neck);
    }
    g.traverse((o) => { o.castShadow = true; });
    consumableCache.set(id, g);
  }
  return consumableCache.get(id).clone();
}

export class LootMeshes {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'loot';
    scene.add(this.group);
    this.entries = new Map();
    this.time = 0;
  }

  add(item) {
    const root = new THREE.Group();
    root.position.set(item.x, item.y, item.z);
    let model;
    let color;
    if (item.kind === 'weapon') {
      const w = getWeapon(item.weapon.id);
      model = createWeaponMesh(w.id);
      color = WEAPON_CATEGORIES[w.category]?.color || '#ffffff';
      model.rotation.y = Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(model);
      model = holder;
    } else {
      model = consumableModel(item.consumable);
      color = CONSUMABLES[item.consumable].color;
    }
    model.position.y = 0.6;
    root.add(model);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial(color));
    ring.position.y = 0.03;
    root.add(ring);
    this.group.add(root);
    this.entries.set(item.id, { root, model, phase: Math.random() * Math.PI * 2 });
  }

  remove(item) {
    const e = this.entries.get(item.id);
    if (!e) return;
    this.group.remove(e.root);
    this.entries.delete(item.id);
  }

  // Highlights the item that can be picked up.
  setFocus(id) {
    for (const [key, e] of this.entries) e.root.scale.setScalar(key === id ? 1.15 : 1);
  }

  update(dt) {
    this.time += dt;
    for (const e of this.entries.values()) {
      e.model.rotation.y = this.time * 1.4 + e.phase;
      e.model.position.y = 0.6 + Math.sin(this.time * 2.2 + e.phase) * 0.08;
    }
  }
}
