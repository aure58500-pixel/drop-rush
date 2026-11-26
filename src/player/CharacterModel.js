// Chibi character rendered from a skin definition: a fixed joint hierarchy
// (shared by every skin, see CharacterBuilder.JOINT_LAYOUT) with one merged,
// vertex-colored mesh per joint. Changing skin only swaps geometries.
// The model faces local +Z, feet at y = 0. Collisions and hitboxes never
// depend on it: they use PLAYER_CONFIG only.
import * as THREE from 'three';
import { buildCharacterGeometry, HAND_SOCKET, JOINT_LAYOUT, JOINT_NAMES, LEG_DIMS } from './CharacterBuilder.js';
import { geometryFromArrays } from '../map/geometryUtils.js';

let sharedMaterial = null;
const geometryCache = new Map(); // skin id -> { joint: BufferGeometry }

function material() {
  if (!sharedMaterial) sharedMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  return sharedMaterial;
}

function geometriesFor(skin) {
  let set = geometryCache.get(skin.id);
  if (!set) {
    const built = buildCharacterGeometry(skin);
    set = {};
    for (const name of JOINT_NAMES) {
      const j = built.joints[name];
      set[name] = j.triangles ? geometryFromArrays(j) : null;
    }
    set.triangles = built.triangles;
    geometryCache.set(skin.id, set);
  }
  return set;
}

export class CharacterModel {
  constructor(skin) {
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.joints = {};
    this.meshes = [];
    for (const name of JOINT_NAMES) {
      const def = JOINT_LAYOUT[name];
      const g = new THREE.Group();
      g.name = name;
      g.position.set(def.pos[0], def.pos[1], def.pos[2]);
      (def.parent ? this.joints[def.parent] : this.root).add(g);
      this.joints[name] = g;
      const mesh = new THREE.Mesh(undefined, material());
      mesh.castShadow = true;
      mesh.visible = false;
      g.add(mesh);
      this.meshes.push(mesh);
    }
    // Weapon socket: rotated so the weapon's +Z follows the forearm (-Y).
    const hand = new THREE.Group();
    hand.position.set(HAND_SOCKET.pos[0], HAND_SOCKET.pos[1], HAND_SOCKET.pos[2]);
    hand.rotation.x = Math.PI / 2;
    this.joints[HAND_SOCKET.parent].add(hand);
    this.joints.hand = hand;

    this.hipHeight = JOINT_LAYOUT.hips.pos[1];
    this.legDims = LEG_DIMS;
    this.skinId = null;
    this.setSkin(skin);
  }

  setSkin(skin) {
    if (skin.id === this.skinId) return;
    this.skinId = skin.id;
    const set = geometriesFor(skin);
    this.triangles = set.triangles;
    JOINT_NAMES.forEach((name, i) => {
      const mesh = this.meshes[i];
      mesh.geometry = set[name] || undefined;
      mesh.visible = Boolean(set[name]);
    });
  }

  setVisible(visible) {
    this.root.visible = visible;
  }

  // Shows `mesh` (or nothing) in the right hand.
  setWeaponMesh(mesh) {
    if (this.weaponMesh === mesh) return;
    if (this.weaponMesh) this.joints.hand.remove(this.weaponMesh);
    this.weaponMesh = mesh;
    if (mesh) this.joints.hand.add(mesh);
  }

  // Geometries are shared between characters with the same skin: only detach.
  dispose() {
    this.root.removeFromParent();
  }
}
