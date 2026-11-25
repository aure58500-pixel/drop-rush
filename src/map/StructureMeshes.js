// Merges all static structures into chunked meshes (one draw call per chunk)
// so distant chunks can be frustum culled.
import * as THREE from 'three';
import { GeometryBuilder } from './GeometryBuilder.js';
import { geometryFromArrays } from './geometryUtils.js';

const CHUNK_SIZE = 64;

export function createStructureMeshes(shapes) {
  const builders = new Map();
  const decorBuilders = new Map();
  for (const s of shapes) {
    const key = `${Math.floor(s.x / CHUNK_SIZE)}:${Math.floor(s.z / CHUNK_SIZE)}`;
    const target = s.shadow ? builders : decorBuilders;
    if (!target.has(key)) target.set(key, new GeometryBuilder());
    target.get(key).shape(s);
  }
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
  const group = new THREE.Group();
  group.name = 'structures';
  for (const [map, shadow] of [[builders, true], [decorBuilders, false]]) {
    for (const builder of map.values()) {
      if (builder.triangleCount === 0) continue;
      const mesh = new THREE.Mesh(geometryFromArrays(builder.toArrays()), material);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
  }
  return group;
}
