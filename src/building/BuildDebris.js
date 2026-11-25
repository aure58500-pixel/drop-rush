// Small pooled shard particles shown when a build is destroyed (one draw call).
import * as THREE from 'three';
import { BUILD_CONFIG } from '../config/buildConfig.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

export class BuildDebris {
  constructor(scene, terrain, cfg = BUILD_CONFIG) {
    this.cfg = cfg.debris;
    this.terrain = terrain;
    this.scene = scene;
    const max = this.cfg.maxParticles;
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      max,
    );
    this.mesh.setColorAt(0, _c.set('#ffffff'));
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    scene.add(this.mesh);
    this.particles = [];
  }

  burst(x, y, z, color, spread = 1) {
    const n = this.cfg.count;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= this.cfg.maxParticles) this.particles.shift();
      this.particles.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        z: z + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 6,
        rx: Math.random() * 6, ry: Math.random() * 6,
        life: 0,
        max: this.cfg.lifetime * (0.6 + Math.random() * 0.6),
        color: new THREE.Color(color).multiplyScalar(0.6 + Math.random() * 0.5),
      });
    }
  }

  update(dt) {
    const list = this.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.max) {
        list.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const ground = this.terrain ? this.terrain.getHeight(p.x, p.z) + 0.08 : -Infinity;
      if (p.y < ground) {
        p.y = ground;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      p.rx += dt * 8;
      p.ry += dt * 6;
    }
    this.mesh.count = list.length;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const k = Math.max(0.05, 1 - (p.life / p.max) ** 2);
      _p.set(p.x, p.y, p.z);
      _e.set(p.rx, p.ry, 0);
      _q.setFromEuler(_e);
      _s.set(k, k, k);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, p.color);
    }
    if (list.length) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.scene.remove(this.mesh);
  }
}
