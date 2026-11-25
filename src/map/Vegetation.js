// Instanced vegetation: trees (pine / round), rocks, bushes, grass tufts, flowers.
// Decor without collisions (bushes, grass, flowers) follows the density setting.
import * as THREE from 'three';
import { faceted, jitterVertices, mergeParts } from './geometryUtils.js';

function makeInstanced(geometry, material, items, colors, transform, { castShadow = true, receiveShadow = true } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  items.forEach((it, i) => {
    const t = transform(it);
    p.set(t.x, t.y, t.z);
    e.set(0, t.rotation, 0);
    q.setFromEuler(e);
    s.set(t.sx, t.sy, t.sz);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    color.set(colors[Math.floor(it.tint * colors.length) % colors.length]);
    mesh.setColorAt(i, color);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.computeBoundingSphere();
  return mesh;
}

export class Vegetation {
  constructor(vegetation, palette) {
    this.group = new THREE.Group();
    this.group.name = 'vegetation';
    this.decor = []; // { mesh, total }
    const lambert = () => new THREE.MeshLambertMaterial({ color: 0xffffff });

    const pines = vegetation.trees.filter((t) => t.kind === 'pine');
    const rounds = vegetation.trees.filter((t) => t.kind === 'round');
    const treeT = (t) => ({ x: t.x, y: t.y - 0.1, z: t.z, rotation: t.rotation, sx: t.scale, sy: t.scale, sz: t.scale });

    const trunk = mergeParts([{ geometry: new THREE.CylinderGeometry(0.16, 0.28, 2.6, 5), position: [0, 1.3, 0] }]);
    const pineCrown = mergeParts([
      { geometry: new THREE.ConeGeometry(1.7, 2.4, 6), position: [0, 2.6, 0] },
      { geometry: new THREE.ConeGeometry(1.35, 2.1, 6), position: [0, 3.8, 0], rotation: [0, 0.5, 0] },
      { geometry: new THREE.ConeGeometry(0.9, 1.8, 6), position: [0, 4.9, 0], rotation: [0, 1.0, 0] },
    ]);
    const roundCrown = mergeParts([
      { geometry: jitterVertices(new THREE.IcosahedronGeometry(1.6, 0), 0.35, 3), position: [0, 3.4, 0] },
      { geometry: jitterVertices(new THREE.IcosahedronGeometry(1.1, 0), 0.3, 7), position: [0.9, 2.9, 0.4] },
      { geometry: jitterVertices(new THREE.IcosahedronGeometry(1.0, 0), 0.3, 11), position: [-0.8, 3.0, -0.5] },
    ]);
    const trunkColors = [palette.trunk];
    if (vegetation.trees.length) {
      this.group.add(makeInstanced(trunk, lambert(), vegetation.trees, trunkColors, treeT));
    }
    if (pines.length) this.group.add(makeInstanced(pineCrown, lambert(), pines, palette.pine, treeT));
    if (rounds.length) this.group.add(makeInstanced(roundCrown, lambert(), rounds, palette.foliage, treeT));

    if (vegetation.rocks.length) {
      const rock = jitterVertices(faceted(new THREE.DodecahedronGeometry(1, 0)), 0.35, 5);
      this.group.add(makeInstanced(rock, lambert(), vegetation.rocks, palette.rocks, (r) => ({
        x: r.x, y: r.y + 0.25 * r.scale, z: r.z, rotation: r.rotation, sx: r.scale, sy: r.scale * 0.75, sz: r.scale * 1.1,
      })));
    }

    const bush = mergeParts([
      { geometry: jitterVertices(new THREE.IcosahedronGeometry(0.7, 0), 0.2, 2), position: [0, 0.45, 0], scale: [1, 0.8, 1] },
      { geometry: jitterVertices(new THREE.IcosahedronGeometry(0.5, 0), 0.15, 9), position: [0.55, 0.35, 0.2], scale: [1, 0.8, 1] },
    ]);
    this._addDecor(makeInstanced(bush, lambert(), vegetation.bushes, palette.bush, (b) => ({
      x: b.x, y: b.y - 0.05, z: b.z, rotation: b.rotation, sx: b.scale, sy: b.scale, sz: b.scale,
    })), vegetation.bushes.length, 'vegetation');

    const tuft = mergeParts([
      { geometry: new THREE.ConeGeometry(0.06, 0.5, 3, 1, true), position: [0, 0.25, 0], rotation: [0.15, 0, 0.1] },
      { geometry: new THREE.ConeGeometry(0.05, 0.42, 3, 1, true), position: [0.09, 0.2, 0.04], rotation: [-0.1, 0, -0.35] },
      { geometry: new THREE.ConeGeometry(0.05, 0.38, 3, 1, true), position: [-0.08, 0.18, -0.05], rotation: [0.2, 0, 0.35] },
    ]);
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this._addDecor(makeInstanced(tuft, grassMaterial, vegetation.grass, palette.grassBlade, (g) => ({
      x: g.x, y: g.y - 0.03, z: g.z, rotation: g.rotation, sx: g.scale, sy: g.scale, sz: g.scale,
    }), { castShadow: false }), vegetation.grass.length, 'grass');

    const flower = mergeParts([
      { geometry: new THREE.CylinderGeometry(0.015, 0.015, 0.3, 3), position: [0, 0.15, 0] },
      { geometry: new THREE.OctahedronGeometry(0.07, 0), position: [0, 0.32, 0] },
    ]);
    this._addDecor(makeInstanced(flower, lambert(), vegetation.flowers, palette.flowers, (f) => ({
      x: f.x, y: f.y - 0.02, z: f.z, rotation: f.rotation, sx: f.scale, sy: f.scale, sz: f.scale,
    }), { castShadow: false }), vegetation.flowers.length, 'vegetation');
  }

  _addDecor(mesh, total, kind) {
    this.decor.push({ mesh, total, kind });
    this.group.add(mesh);
  }

  // density in [0, 1]; instances are already in random order, so truncating keeps an even spread.
  setDensity(vegetationDensity, grassDensity) {
    for (const d of this.decor) {
      const density = d.kind === 'grass' ? grassDensity : vegetationDensity;
      d.mesh.count = Math.floor(d.total * density);
      d.mesh.visible = d.mesh.count > 0;
    }
  }
}
