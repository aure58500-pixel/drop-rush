// Draws repeated props with InstancedMesh: one mesh per template and per
// 128 m area (so off-screen areas are culled). Templates come from PropTemplates.
import * as THREE from 'three';
import { buildParts } from '../core/geometry/PartBuilder.js';
import { geometryFromArrays } from './geometryUtils.js';
import { PROP_TEMPLATES } from './PropTemplates.js';

const AREA = 128;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class InstancedProps {
  constructor(instances) {
    this.group = new THREE.Group();
    this.group.name = 'props';
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.geometries = new Map();
    this.decor = [];
    this.triangles = 0;
    const buckets = new Map();
    for (const inst of instances) {
      const key = `${inst.template}|${Math.floor(inst.x / AREA)}:${Math.floor(inst.z / AREA)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(inst);
    }
    for (const [key, list] of buckets) {
      const id = key.split('|')[0];
      const t = PROP_TEMPLATES[id];
      const geometry = this._geometry(id);
      const mesh = new THREE.InstancedMesh(geometry, this.material, list.length);
      list.forEach((inst, i) => {
        _p.set(inst.x, inst.y, inst.z);
        _q.setFromAxisAngle(UP, inst.yaw || 0);
        const k = inst.scale ?? 1;
        _s.set(k, k, k);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = t.shadow !== false;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
      this.triangles += geometry.userData.triangles * list.length;
      if (t.density) this.decor.push({ mesh, total: list.length });
    }
  }

  _geometry(id) {
    let g = this.geometries.get(id);
    if (!g) {
      const arrays = buildParts(PROP_TEMPLATES[id].parts);
      g = geometryFromArrays(arrays);
      g.userData.triangles = arrays.triangles;
      this.geometries.set(id, g);
    }
    return g;
  }

  // Thins out pure decor (bushes, terrace tables) for the adaptive quality.
  setDensity(density) {
    for (const d of this.decor) {
      d.mesh.count = Math.floor(d.total * density);
      d.mesh.visible = d.mesh.count > 0;
    }
  }

  dispose() {
    for (const g of this.geometries.values()) g.dispose();
    this.material.dispose();
    for (const m of this.group.children) m.dispose?.();
  }
}
