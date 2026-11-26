// Visual effects of combat, all pooled: tracers (0.05 s), muzzle flashes,
// impact particles colored by surface, explosions, flying and stuck projectiles.
// Uses at most one extra dynamic light (muzzle flash) -> 3 lights per scene.
import * as THREE from 'three';
import { COMBAT_CONFIG } from '../config/combatConfig.js';

const SURFACE_COLORS = {
  terrain: ['#6d8f3a', '#8a7048', '#a58c5c'],
  wood: ['#a0703f', '#c8955c', '#7f5539'],
  stone: ['#b9b2a6', '#8f8b84', '#d6d0c4'],
  metal: ['#ffe28a', '#ffd166', '#ffffff'],
  build: ['#e0b070', '#c8955c', '#f2d29b'],
  flesh: ['#ffe8c2', '#ff9f1c', '#ffffff'],
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

export class CombatEffects {
  constructor(scene, terrain, cfg = COMBAT_CONFIG) {
    this.scene = scene;
    this.terrain = terrain;
    this.cfg = cfg;
    this.group = new THREE.Group();
    this.group.name = 'combat-fx';
    scene.add(this.group);
    this.onShake = null;

    // Tracers: stretched unit boxes along +Z.
    this.maxTracers = 64;
    this.tracerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      this.maxTracers,
    );
    this.tracerMesh.count = 0;
    this.tracerMesh.frustumCulled = false;
    this.group.add(this.tracerMesh);
    this.tracers = [];

    // Particles.
    this.maxParticles = 360;
    this.particleMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.09),
      new THREE.MeshBasicMaterial({ color: '#ffffff', fog: true }),
      this.maxParticles,
    );
    this.particleMesh.setColorAt(0, _c.set('#ffffff'));
    this.particleMesh.count = 0;
    this.particleMesh.frustumCulled = false;
    this.group.add(this.particleMesh);
    this.particles = [];

    // Muzzle flashes.
    this.flashMaterial = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.flashGeometry = new THREE.OctahedronGeometry(1, 0).scale(1, 1, 1.8);
    this.flashes = Array.from({ length: 10 }, () => {
      const m = new THREE.Mesh(this.flashGeometry, this.flashMaterial);
      m.visible = false;
      m.frustumCulled = false;
      this.group.add(m);
      return { mesh: m, life: 0, max: 0.05 };
    });
    this.flashIndex = 0;
    this.light = new THREE.PointLight('#ffb347', 0, 9, 2);
    this.lightLife = 0;
    this.group.add(this.light);

    // Explosions.
    this.explosionGeometry = new THREE.IcosahedronGeometry(1, 1);
    this.explosions = Array.from({ length: 6 }, () => {
      const mat = new THREE.MeshBasicMaterial({ color: '#ff9f1c', transparent: true, depthWrite: false, fog: false });
      const m = new THREE.Mesh(this.explosionGeometry, mat);
      m.visible = false;
      this.group.add(m);
      return { mesh: m, life: 0, max: 0.45, radius: 1 };
    });
    this.explosionIndex = 0;

    // Projectiles.
    this.rocketGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6).rotateX(Math.PI / 2);
    this.rocketMaterial = new THREE.MeshLambertMaterial({ color: '#e63946', emissive: '#ff6b35', emissiveIntensity: 0.6 });
    this.arrowGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.75).translate(0, 0, -0.32);
    this.arrowMaterial = new THREE.MeshLambertMaterial({ color: '#c77dff' });
    this.flying = new Map();
    this.stuck = [];
    this.maxStuck = 40;
    this.smokeTimer = 0;
  }

  tracer(from, to) {
    _a.set(from.x, from.y, from.z);
    _b.set(to.x, to.y, to.z);
    const len = _a.distanceTo(_b);
    if (len < 0.3) return;
    if (this.tracers.length >= this.maxTracers) this.tracers.shift();
    // Start a bit ahead of the muzzle so the line does not cover the weapon.
    _p.subVectors(_b, _a).normalize();
    _q.setFromUnitVectors(Z, _p);
    const start = _a.clone().addScaledVector(_p, Math.min(0.6, len * 0.2));
    this.tracers.push({ start, quat: _q.clone(), len: len - Math.min(0.6, len * 0.2), life: 0 });
  }

  muzzleFlash(pos, dir, scale = 1) {
    const f = this.flashes[this.flashIndex];
    this.flashIndex = (this.flashIndex + 1) % this.flashes.length;
    f.mesh.position.set(pos.x, pos.y, pos.z);
    _p.set(dir.x, dir.y, dir.z);
    f.mesh.quaternion.setFromUnitVectors(Z, _p);
    f.mesh.rotateZ(Math.random() * Math.PI);
    f.mesh.scale.setScalar(0.1 * scale);
    f.mesh.visible = true;
    f.life = 0;
    f.scale = scale;
    this.light.position.set(pos.x + dir.x * 0.3, pos.y + dir.y * 0.3, pos.z + dir.z * 0.3);
    this.light.intensity = 6 * scale;
    this.lightLife = 0.06;
  }

  impact(point, normal, surface, count = 7) {
    const colors = SURFACE_COLORS[surface] || SURFACE_COLORS.stone;
    const speed = surface === 'metal' ? 7 : 4;
    for (let i = 0; i < count; i++) {
      this._particle(point, {
        vx: normal.x * speed * (0.4 + Math.random()) + (Math.random() - 0.5) * 3,
        vy: normal.y * speed * (0.4 + Math.random()) + Math.random() * 2.5,
        vz: normal.z * speed * (0.4 + Math.random()) + (Math.random() - 0.5) * 3,
        color: colors[i % colors.length],
        life: surface === 'metal' ? 0.25 : 0.45,
        size: surface === 'metal' ? 0.6 : 1,
        gravity: surface === 'metal' ? 6 : 14,
      });
    }
  }

  explosion(center, radius) {
    const e = this.explosions[this.explosionIndex];
    this.explosionIndex = (this.explosionIndex + 1) % this.explosions.length;
    e.mesh.position.set(center.x, center.y, center.z);
    e.mesh.visible = true;
    e.life = 0;
    e.radius = radius;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const s = 5 + Math.random() * 7;
      this._particle(center, {
        vx: Math.cos(a) * s * (1 - up * 0.5), vy: up * s, vz: Math.sin(a) * s * (1 - up * 0.5),
        color: i % 3 === 0 ? '#3d3d3d' : i % 3 === 1 ? '#ff9f1c' : '#ffd166',
        life: 0.6 + Math.random() * 0.5, size: 1.8, gravity: 9,
      });
    }
    this.light.position.set(center.x, center.y + 0.5, center.z);
    this.light.intensity = 30;
    this.lightLife = 0.25;
    this.onShake?.(center, radius);
  }

  projectileSpawned(p) {
    const mesh = new THREE.Mesh(p.kind === 'rocket' ? this.rocketGeometry : this.arrowGeometry, p.kind === 'rocket' ? this.rocketMaterial : this.arrowMaterial);
    mesh.castShadow = false;
    mesh.position.set(p.visual.x, p.visual.y, p.visual.z);
    this.group.add(mesh);
    this.flying.set(p.id, { mesh, p });
  }

  projectileEnded(p) {
    const f = this.flying.get(p.id);
    if (!f) return;
    this.group.remove(f.mesh);
    this.flying.delete(p.id);
  }

  arrowStuck(point, dir, { buildId }) {
    const mesh = new THREE.Mesh(this.arrowGeometry, this.arrowMaterial);
    // Arrow tip slightly inside the surface.
    mesh.position.set(point.x + dir.x * 0.1, point.y + dir.y * 0.1, point.z + dir.z * 0.1);
    _p.set(dir.x, dir.y, dir.z);
    // The tip is at local +Z and the shaft extends toward -Z, i.e. back out of the surface.
    mesh.quaternion.setFromUnitVectors(Z, _p);
    this.group.add(mesh);
    if (this.stuck.length >= this.maxStuck) this._removeStuck(0);
    this.stuck.push({ mesh, life: 0, buildId });
  }

  // Arrows planted in a destroyed build fall away with it.
  removeArrowsOnBuild(buildId) {
    for (let i = this.stuck.length - 1; i >= 0; i--) if (this.stuck[i].buildId === buildId) this._removeStuck(i);
  }

  _removeStuck(i) {
    this.group.remove(this.stuck[i].mesh);
    this.stuck.splice(i, 1);
  }

  _particle(pos, o) {
    if (this.particles.length >= this.maxParticles) this.particles.shift();
    this.particles.push({
      x: pos.x, y: pos.y, z: pos.z, vx: o.vx, vy: o.vy, vz: o.vz,
      life: 0, max: o.life * (0.7 + Math.random() * 0.6), size: o.size, gravity: o.gravity,
      color: new THREE.Color(o.color),
    });
  }

  update(dt, stickSeconds) {
    // Tracers.
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life += dt;
      if (this.tracers[i].life > this.cfg.tracerLifetime) this.tracers.splice(i, 1);
    }
    this.tracerMesh.count = this.tracers.length;
    this.tracers.forEach((t, i) => {
      _s.set(0.028, 0.028, t.len);
      _m.compose(t.start, t.quat, _s);
      this.tracerMesh.setMatrixAt(i, _m);
    });
    if (this.tracers.length) this.tracerMesh.instanceMatrix.needsUpdate = true;

    // Particles.
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) {
        ps.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const g = this.terrain.getHeight(p.x, p.z) + 0.05;
      if (p.y < g) {
        p.y = g;
        p.vy *= -0.25;
        p.vx *= 0.5;
        p.vz *= 0.5;
      }
    }
    this.particleMesh.count = ps.length;
    _q.identity();
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const k = p.size * Math.max(0.1, 1 - p.life / p.max);
      _p.set(p.x, p.y, p.z);
      _s.set(k, k, k);
      _m.compose(_p, _q, _s);
      this.particleMesh.setMatrixAt(i, _m);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (ps.length) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      this.particleMesh.instanceColor.needsUpdate = true;
    }

    // Flashes and light.
    for (const f of this.flashes) {
      if (!f.mesh.visible) continue;
      f.life += dt;
      if (f.life > f.max) f.mesh.visible = false;
      else f.mesh.scale.setScalar(0.12 * f.scale * (1 + f.life / f.max));
    }
    if (this.lightLife > 0) {
      this.lightLife -= dt;
      if (this.lightLife <= 0) this.light.intensity = 0;
      else this.light.intensity *= Math.exp(-dt * 30);
    }

    // Explosions: fireball grows to the radius and fades.
    for (const e of this.explosions) {
      if (!e.mesh.visible) continue;
      e.life += dt;
      const k = e.life / e.max;
      if (k >= 1) {
        e.mesh.visible = false;
        continue;
      }
      e.mesh.scale.setScalar(e.radius * (0.25 + 0.75 * Math.sqrt(k)));
      e.mesh.material.opacity = 0.9 * (1 - k);
      e.mesh.material.color.setHSL(0.09 - 0.06 * k, 1, 0.6 - 0.3 * k);
    }

    // Flying projectiles (and rocket smoke).
    this.smokeTimer -= dt;
    const smoke = this.smokeTimer <= 0;
    if (smoke) this.smokeTimer = 0.03;
    for (const { mesh, p } of this.flying.values()) {
      mesh.position.set(p.visual.x, p.visual.y, p.visual.z);
      _p.set(p.vx, p.vy, p.vz).normalize();
      mesh.quaternion.setFromUnitVectors(Z, _p);
      if (p.kind === 'rocket' && smoke) {
        this._particle(p.visual, { vx: (Math.random() - 0.5), vy: 0.6, vz: (Math.random() - 0.5), color: Math.random() < 0.3 ? '#ffb347' : '#cfcfcf', life: 0.5, size: 1.6, gravity: -1 });
      }
    }

    // Stuck arrows disappear after `stickSeconds`.
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      this.stuck[i].life += dt;
      if (this.stuck[i].life > stickSeconds) this._removeStuck(i);
    }
  }

  clear() {
    this.tracers.length = 0;
    this.particles.length = 0;
    for (const f of this.flying.values()) this.group.remove(f.mesh);
    this.flying.clear();
    while (this.stuck.length) this._removeStuck(0);
    for (const e of this.explosions) e.mesh.visible = false;
    for (const f of this.flashes) f.mesh.visible = false;
    this.light.intensity = 0;
  }
}
