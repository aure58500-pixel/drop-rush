// Merges every structure shape into chunked meshes (one draw call per 64 m
// chunk) built with PartBuilder, so distant chunks are frustum culled.
// Water decor (fountains, waterfalls) goes into separate translucent meshes.
import * as THREE from 'three';
import { createAccumulator, emitPart, finalizeAccumulator } from '../core/geometry/PartBuilder.js';
import { geometryFromArrays } from './geometryUtils.js';

const CHUNK = 64;

function shapeToPart(s) {
  if (s.shape === 'box') return { s: 'box', size: [s.hx * 2, s.hy * 2, s.hz * 2], p: [s.x, s.y, s.z], yaw: s.yaw, c: s.color };
  if (s.shape === 'ramp') return { s: 'wedge', size: [s.hx * 2, s.hy * 2, s.hz * 2], p: [s.x, s.y, s.z], yaw: s.yaw, c: s.color };
  if (s.shape === 'part') return s.part;
  return null; // cylinders are colliders only (drawn with parts)
}

export function createStructureMeshes(shapes) {
  const solid = new Map();
  const water = new Map();
  for (const s of shapes) {
    const part = shapeToPart(s);
    if (!part) continue;
    const key = `${Math.floor(part.p[0] / CHUNK)}:${Math.floor(part.p[2] / CHUNK)}`;
    const target = s.water ? water : solid;
    if (!target.has(key)) target.set(key, createAccumulator());
    emitPart(part, target.get(key));
  }
  const group = new THREE.Group();
  group.name = 'structures';
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const waterMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
  let triangles = 0;
  for (const [map, mat, isWater] of [[solid, material, false], [water, waterMaterial, true]]) {
    for (const acc of map.values()) {
      const arrays = finalizeAccumulator(acc);
      if (!arrays.triangles) continue;
      triangles += arrays.triangles;
      const mesh = new THREE.Mesh(geometryFromArrays(arrays), mat);
      mesh.castShadow = !isWater;
      mesh.receiveShadow = !isWater;
      mesh.renderOrder = isWater ? 2 : 0;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
  }
  group.userData.triangles = triangles;
  return group;
}
