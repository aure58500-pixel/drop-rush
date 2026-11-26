// Sea plane (following the camera) and canal water surfaces.
import * as THREE from 'three';
import { geometryFromArrays } from './geometryUtils.js';

export class Water {
  constructor(layout, canalArrays) {
    this.group = new THREE.Group();
    this.group.name = 'water';
    this.time = 0;
    this.sea = null;
    if (layout.sea) {
      const g = new THREE.PlaneGeometry(4000, 4000, 1, 1);
      g.rotateX(-Math.PI / 2);
      this.seaMaterial = new THREE.MeshLambertMaterial({ color: layout.sea.color });
      this.sea = new THREE.Mesh(g, this.seaMaterial);
      this.sea.position.y = layout.sea.level;
      this.sea.receiveShadow = true;
      this.group.add(this.sea);
    }
    this.canals = null;
    if (canalArrays.triangles) {
      this.canalMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false });
      this.canals = new THREE.Mesh(geometryFromArrays(canalArrays), this.canalMaterial);
      this.canals.renderOrder = 1;
      this.canals.receiveShadow = true;
      this.group.add(this.canals);
    }
  }

  update(dt, cameraPosition) {
    this.time += dt;
    if (this.sea) {
      this.sea.position.x = cameraPosition.x;
      this.sea.position.z = cameraPosition.z;
    }
    if (this.canals) this.canalMaterial.opacity = 0.74 + Math.sin(this.time * 1.4) * 0.04;
  }
}
