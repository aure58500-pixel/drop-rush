// Rendering of builds: one InstancedMesh per piece kind (4 draw calls for up to
// 1000 builds), placement animation, damage tint and the translucent preview.
import * as THREE from 'three';
import { BUILD_CONFIG } from '../config/buildConfig.js';
import { GeometryBuilder } from '../map/GeometryBuilder.js';
import { geometryFromArrays } from '../map/geometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const WHITE = new THREE.Color(1, 1, 1);

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function unitBox() {
  const g = new GeometryBuilder();
  g.box(0, 0, 0, 0.5, 0.5, 0.5, 0, '#ffffff');
  return geometryFromArrays(g.toArrays());
}

// Unit wedge rising toward local +Z (same orientation as the ramp collider).
function unitWedge() {
  const g = new GeometryBuilder();
  g.ramp(0, 0, 0, 0.5, 0.5, 0.5, 0, Infinity, '#ffffff');
  return geometryFromArrays(g.toArrays());
}

export class BuildMeshes {
  constructor(scene, cfg = BUILD_CONFIG) {
    this.scene = scene;
    this.cfg = cfg;
    this.group = new THREE.Group();
    this.group.name = 'builds';
    scene.add(this.group);

    const box = unitBox();
    const wedge = unitWedge();
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.layers = {
      wall: this._layer(box),
      platform: this._layer(box),
      ramp: this._layer(wedge),
      skirt: this._layer(box),
    };
    this.animating = [];

    // Preview (ghost): one translucent mesh per piece kind, only one shown.
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: cfg.preview.valid, transparent: true, opacity: cfg.preview.opacity, depthWrite: false,
    });
    this.ghosts = {
      wall: new THREE.Mesh(box, this.ghostMaterial),
      platform: new THREE.Mesh(box, this.ghostMaterial),
      ramp: new THREE.Mesh(wedge, this.ghostMaterial),
    };
    for (const g of Object.values(this.ghosts)) {
      g.visible = false;
      g.renderOrder = 5;
      g.frustumCulled = false;
      this.group.add(g);
    }
    this.ghostTime = 0;
  }

  _layer(geometry) {
    const max = this.cfg.maxBuilds;
    const mesh = new THREE.InstancedMesh(geometry, this.material, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, WHITE); // allocates the color buffer before the first render
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return { mesh, owners: [] };
  }

  _color(b, out) {
    out.set(this.cfg.pieces[b.type].color);
    out.offsetHSL(0, 0, 0.015 * Math.min(b.gy, 8));
    const hp = b.health / b.maxHealth;
    out.multiplyScalar(0.5 + 0.5 * hp); // darker when damaged
    return out;
  }

  _push(layerKey, build, kind) {
    const layer = this.layers[layerKey];
    const index = layer.mesh.count;
    layer.owners[index] = { build, kind };
    layer.mesh.count += 1;
    return index;
  }

  _pop(layerKey, index) {
    const layer = this.layers[layerKey];
    const last = layer.mesh.count - 1;
    if (index !== last) {
      layer.mesh.getMatrixAt(last, _m);
      layer.mesh.setMatrixAt(index, _m);
      layer.mesh.getColorAt(last, _c);
      layer.mesh.setColorAt(index, _c);
      const moved = layer.owners[last];
      layer.owners[index] = moved;
      moved.build.render[moved.kind] = index;
    }
    layer.owners.length = last;
    layer.mesh.count = last;
    layer.mesh.instanceMatrix.needsUpdate = true;
    layer.mesh.instanceColor.needsUpdate = true;
  }

  _setBodyMatrix(build, s) {
    const sh = build.shape;
    // Scale around the bottom center so pieces grow out of the ground.
    _p.set(sh.x, sh.bottom + (sh.y - sh.bottom) * s, sh.z);
    _e.set(0, sh.yaw, 0);
    _q.setFromEuler(_e);
    _s.set(sh.scale[0] * s, sh.scale[1] * s, sh.scale[2] * s);
    _m.compose(_p, _q, _s);
    const layer = this.layers[build.type];
    layer.mesh.setMatrixAt(build.render.body, _m);
    layer.mesh.instanceMatrix.needsUpdate = true;
  }

  add(build, { animate = true } = {}) {
    build.render = { body: this._push(build.type, build, 'body'), skirt: -1, t: 0 };
    const layer = this.layers[build.type];
    layer.mesh.setColorAt(build.render.body, this._color(build, _c));
    layer.mesh.instanceColor.needsUpdate = true;

    if (build.skirt) {
      const sk = build.skirt;
      build.render.skirt = this._push('skirt', build, 'skirt');
      _p.set(sk.x, sk.y, sk.z);
      _q.identity();
      _s.set(sk.scale[0], sk.scale[1], sk.scale[2]);
      _m.compose(_p, _q, _s);
      const sl = this.layers.skirt;
      sl.mesh.setMatrixAt(build.render.skirt, _m);
      sl.mesh.setColorAt(build.render.skirt, this._color(build, _c).multiplyScalar(0.8));
      sl.mesh.instanceMatrix.needsUpdate = true;
      sl.mesh.instanceColor.needsUpdate = true;
    }

    if (animate && this.cfg.placeAnimationSeconds > 0) {
      this._setBodyMatrix(build, 0.01);
      this.animating.push(build);
    } else {
      this._setBodyMatrix(build, 1);
    }
  }

  remove(build) {
    const i = this.animating.indexOf(build);
    if (i >= 0) this.animating.splice(i, 1);
    if (!build.render) return;
    // Remove the skirt first: popping the body may move another build's skirt index.
    if (build.render.skirt >= 0) this._pop('skirt', build.render.skirt);
    this._pop(build.type, build.render.body);
    build.render = null;
  }

  refreshColor(build) {
    if (!build.render) return;
    const layer = this.layers[build.type];
    layer.mesh.setColorAt(build.render.body, this._color(build, _c));
    layer.mesh.instanceColor.needsUpdate = true;
    if (build.render.skirt >= 0) {
      this.layers.skirt.mesh.setColorAt(build.render.skirt, this._color(build, _c).multiplyScalar(0.8));
      this.layers.skirt.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    const dur = this.cfg.placeAnimationSeconds;
    for (let i = this.animating.length - 1; i >= 0; i--) {
      const b = this.animating[i];
      b.render.t += dt;
      const k = Math.min(1, b.render.t / dur);
      this._setBodyMatrix(b, k >= 1 ? 1 : Math.max(0.01, easeOutBack(k)));
      if (k >= 1) this.animating.splice(i, 1);
    }
    this.ghostTime += dt;
    this.ghostMaterial.opacity = this.cfg.preview.opacity * (0.85 + 0.15 * Math.sin(this.ghostTime * 6));
  }

  showGhost(type, shape, valid) {
    for (const [key, mesh] of Object.entries(this.ghosts)) mesh.visible = key === type && !!shape;
    if (!shape) return;
    const g = this.ghosts[type];
    g.position.set(shape.x, shape.y, shape.z);
    g.rotation.set(0, shape.yaw, 0);
    // Slightly larger than the real piece so it never z-fights with neighbours.
    g.scale.set(shape.scale[0] + 0.02, shape.scale[1] + 0.02, shape.scale[2] + 0.02);
    this.ghostMaterial.color.set(valid ? this.cfg.preview.valid : this.cfg.preview.invalid);
  }

  hideGhost() {
    for (const mesh of Object.values(this.ghosts)) mesh.visible = false;
  }

  dispose() {
    for (const layer of Object.values(this.layers)) layer.mesh.dispose();
    this.material.dispose();
    this.ghostMaterial.dispose();
    this.scene.remove(this.group);
  }
}
