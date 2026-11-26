// Translucent wall of the safe zone.
import * as THREE from 'three';

export class ZoneMesh {
  constructor(scene) {
    this.scene = scene;
    const g = new THREE.CylinderGeometry(1, 1, 1, 96, 1, true);
    g.translate(0, 0.5, 0);
    this.material = new THREE.MeshBasicMaterial({
      color: '#5ad1ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.renderOrder = 6;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.time = 0;
  }

  update(dt, center, radius, bottom, height) {
    this.time += dt;
    const r = Math.max(0.5, radius);
    this.mesh.visible = true;
    this.mesh.position.set(center.x, bottom, center.z);
    this.mesh.scale.set(r, height, r);
    this.material.opacity = 0.2 + Math.sin(this.time * 2) * 0.04;
  }

  hide() {
    this.mesh.visible = false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
