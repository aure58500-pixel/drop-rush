// Procedural low-poly character (1.8 m) with a joint hierarchy for procedural
// animation. The model faces local +Z, feet at y = 0.
import * as THREE from 'three';
import { faceted } from '../map/geometryUtils.js';

const ROLES = ['primary', 'secondary', 'accent', 'skin', 'hair', 'visor', 'dark'];

function box(w, h, d) {
  return faceted(new THREE.BoxGeometry(w, h, d));
}

export class CharacterModel {
  constructor(skin) {
    this.materials = {};
    for (const role of ROLES) {
      this.materials[role] = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
    }
    this.materials.visor.roughness = 0.2;
    this.materials.visor.emissiveIntensity = 0.6;
    this.materials.dark.color.set('#22232b');

    const root = new THREE.Group();
    root.name = 'character';
    this.root = root;
    this.meshes = [];
    const add = (parent, geometry, role, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, this.materials[role]);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    };
    const joint = (parent, x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    };

    const j = {};
    j.hips = joint(root, 0, 0.92, 0);
    add(j.hips, box(0.36, 0.18, 0.22), 'secondary', 0, 0, 0);
    j.spine = joint(j.hips, 0, 0.08, 0);
    add(j.spine, box(0.42, 0.07, 0.26), 'dark', 0, 0.02, 0);
    add(j.spine, box(0.44, 0.42, 0.26), 'primary', 0, 0.27, 0);
    add(j.spine, box(0.3, 0.14, 0.04), 'accent', 0, 0.33, 0.14);
    add(j.spine, box(0.3, 0.34, 0.14), 'secondary', 0, 0.28, -0.19);
    add(j.spine, box(0.22, 0.06, 0.15), 'accent', 0, 0.46, -0.19);
    j.neck = joint(j.spine, 0, 0.5, 0);
    add(j.neck, box(0.1, 0.06, 0.1), 'skin', 0, 0.02, 0);
    add(j.neck, faceted(new THREE.IcosahedronGeometry(0.15, 1)), 'skin', 0, 0.15, 0.01);
    const hair = faceted(new THREE.SphereGeometry(0.165, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55));
    add(j.neck, hair, 'hair', 0, 0.17, -0.005);
    add(j.neck, box(0.22, 0.06, 0.05), 'visor', 0, 0.17, 0.135);

    for (const side of [1, -1]) {
      const s = side > 0 ? 'L' : 'R';
      const shoulder = joint(j.spine, side * 0.28, 0.45, 0);
      add(shoulder, box(0.13, 0.12, 0.14), 'accent', side * 0.01, 0, 0);
      add(shoulder, box(0.11, 0.28, 0.11), 'primary', 0, -0.16, 0);
      const elbow = joint(shoulder, 0, -0.3, 0);
      add(elbow, box(0.1, 0.24, 0.1), 'secondary', 0, -0.12, 0);
      add(elbow, box(0.09, 0.09, 0.1), 'skin', 0, -0.28, 0.01);
      j[`arm${s}`] = shoulder;
      j[`elbow${s}`] = elbow;

      const leg = joint(j.hips, side * 0.11, -0.02, 0);
      add(leg, box(0.15, 0.42, 0.16), 'secondary', 0, -0.21, 0);
      const knee = joint(leg, 0, -0.42, 0);
      add(knee, box(0.14, 0.12, 0.17), 'accent', 0, 0, 0.01);
      add(knee, box(0.13, 0.36, 0.14), 'dark', 0, -0.2, 0);
      const ankle = joint(knee, 0, -0.4, 0); // 0.92 - 0.02 - 0.42 - 0.40 - 0.08 = 0 (sole on the ground)
      add(ankle, box(0.14, 0.08, 0.26), 'dark', 0, -0.04, 0.05);
      j[`leg${s}`] = leg;
      j[`knee${s}`] = knee;
      j[`ankle${s}`] = ankle;
    }
    this.joints = j;
    this.setSkin(skin);
  }

  setSkin(skin) {
    this.skinId = skin.id;
    for (const role of ROLES) {
      if (skin.colors[role]) this.materials[role].color.set(skin.colors[role]);
    }
    this.materials.visor.emissive.set(skin.colors.visor);
  }

  setVisible(visible) {
    this.root.visible = visible;
  }

  dispose() {
    for (const m of this.meshes) m.geometry.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
    this.root.removeFromParent();
  }
}
