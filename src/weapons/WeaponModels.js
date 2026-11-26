// Builds weapon meshes and HUD icons from the box parts declared in weapons.js.
// One merged, vertex-colored geometry per weapon type, shared by every instance.
import * as THREE from 'three';
import { getWeapon } from '../config/weapons.js';
import { GeometryBuilder } from '../map/GeometryBuilder.js';
import { geometryFromArrays } from '../map/geometryUtils.js';

const geometryCache = new Map();
let sharedMaterial = null;

function material() {
  if (!sharedMaterial) sharedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  return sharedMaterial;
}

export function getWeaponGeometry(id) {
  let g = geometryCache.get(id);
  if (g) return g;
  const { model } = getWeapon(id);
  const b = new GeometryBuilder();
  for (const [x0, y0, z0, x1, y1, z1, key] of model.parts) {
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, 0, model.colors[key] || '#888888');
  }
  g = geometryFromArrays(b.toArrays());
  geometryCache.set(id, g);
  return g;
}

export function createWeaponMesh(id) {
  const mesh = new THREE.Mesh(getWeaponGeometry(id), material());
  mesh.castShadow = true;
  mesh.name = `weapon:${id}`;
  const m = getWeapon(id).model.muzzle;
  mesh.userData.muzzle = new THREE.Vector3(m[0], m[1], m[2]);
  return mesh;
}

// Side view SVG (Z to the right, Y up) drawn from the same parts.
const iconCache = new Map();
export function weaponIconSvg(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const { model } = getWeapon(id);
  let minZ = Infinity; let maxZ = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (const [, y0, z0, , y1, z1] of model.parts) {
    minZ = Math.min(minZ, z0); maxZ = Math.max(maxZ, z1);
    minY = Math.min(minY, y0); maxY = Math.max(maxY, y1);
  }
  const w = maxZ - minZ;
  const h = maxY - minY;
  const pad = Math.max(w, h) * 0.06;
  // Wide parts (crossbow limbs) are drawn last so they stay visible.
  const parts = [...model.parts].sort((a, b) => (a[3] - a[0]) - (b[3] - b[0]));
  const rects = parts.map(([, y0, z0, , y1, z1, key]) => {
    const x = (z0 - minZ + pad).toFixed(4);
    const y = (maxY - y1 + pad).toFixed(4);
    return `<rect x="${x}" y="${y}" width="${(z1 - z0).toFixed(4)}" height="${(y1 - y0).toFixed(4)}" fill="${model.colors[key] || '#888'}"/>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${(w + pad * 2).toFixed(4)} ${(h + pad * 2).toFixed(4)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  iconCache.set(id, svg);
  return svg;
}
