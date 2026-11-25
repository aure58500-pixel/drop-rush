// Small Three.js geometry helpers for the low-poly style.
import * as THREE from 'three';

// Converts to non-indexed with flat normals (faceted look).
export function faceted(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

// Merges geometries (position + normal only) after applying their transforms.
// items: [{ geometry, position?: [x,y,z], rotation?: [x,y,z], scale?: [x,y,z] }]
export function mergeParts(items) {
  const parts = items.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    const g = faceted(geometry);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    g.applyMatrix4(m);
    return g;
  });
  let count = 0;
  for (const p of parts) count += p.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let offset = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, offset * 3);
    nor.set(p.attributes.normal.array, offset * 3);
    offset += p.attributes.position.count;
    p.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  merged.computeBoundingSphere();
  return merged;
}

// Deterministic vertex jitter keyed by position so shared corners stay welded.
export function jitterVertices(geometry, amount, seed = 1) {
  const pos = geometry.attributes.position;
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let o = offsets.get(key);
    if (!o) {
      const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
      const r = h - Math.floor(h);
      const h2 = Math.sin(x * 93.989 + y * 67.345 + z * 11.135 + seed) * 24634.6345;
      const r2 = h2 - Math.floor(h2);
      o = [(r - 0.5) * amount, (r2 - 0.5) * amount, ((r + r2) * 0.5 - 0.5) * amount];
      offsets.set(key, o);
    }
    pos.setXYZ(i, x + o[0], y + o[1], z + o[2]);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function geometryFromArrays({ positions, normals, colors }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (colors) g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}
