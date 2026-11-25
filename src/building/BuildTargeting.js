// Converts "what the player aims at" into a grid candidate for the selected
// piece. Pure logic: used by the ghost preview and, later, by the network layer.
import { BUILD_CONFIG } from '../config/buildConfig.js';
import { DIRS, round2 } from './BuildGeometry.js';

function dirIndex(dx, dz) {
  return Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 1 : 3) : (dz >= 0 ? 2 : 0);
}

// Cardinal direction the camera looks toward (yaw 0 looks north, -Z).
export function facingIndex(yaw) {
  return dirIndex(-Math.sin(yaw), -Math.cos(yaw));
}

// 0 north, 1 east, 2 south, 3 west: edge of the cell closest to the point.
function nearestEdge(px, pz, gx, gz, G) {
  const d = [pz - gz * G, (gx + 1) * G - px, (gz + 1) * G - pz, px - gx * G];
  let best = 0;
  for (let i = 1; i < 4; i++) if (d[i] < d[best]) best = i;
  return best;
}

// Edge of a cell -> canonical wall (north edge = rot 0, west edge = rot 1).
function canonicalWall(edge, gx, gz) {
  switch (edge) {
    case 0: return { gx, gz, rot: 0 };
    case 1: return { gx: gx + 1, gz, rot: 1 };
    case 2: return { gx, gz: gz + 1, rot: 0 };
    default: return { gx, gz, rot: 1 };
  }
}

function wallMid(rec, G) {
  return rec.rot === 0 ? [rec.gx * G + G / 2, rec.gz * G] : [rec.gx * G, rec.gz * G + G / 2];
}

function groundAnchor(terrain, x, z, cfg) {
  const h = terrain.getHeight(x, z);
  return round2(Math.ceil(h / cfg.groundSnap - 1e-9) * cfg.groundSnap);
}

function onGround(type, rotation, P, hit, yaw, terrain, cfg) {
  const G = cfg.gridSize;
  let qx = P.x;
  let qz = P.z;
  // Vertical surface (house wall, rock...): work in the cell in front of it.
  if (hit && !hit.terrain && Math.abs(hit.ny) < 0.5) {
    const l = Math.hypot(hit.nx, hit.nz) || 1;
    qx += (hit.nx / l) * G * 0.5;
    qz += (hit.nz / l) * G * 0.5;
  }
  const gx = Math.floor(qx / G);
  const gz = Math.floor(qz / G);
  let rec;
  if (type === 'wall') rec = canonicalWall((nearestEdge(qx, qz, gx, gz, G) + rotation) % 4, gx, gz);
  else if (type === 'ramp') rec = { gx, gz, rot: (facingIndex(yaw) + rotation) % 4 };
  else rec = { gx, gz, rot: 0 };
  rec.type = type;

  if (hit && !hit.terrain && hit.ny > 0.5) {
    rec.by = round2(hit.y); // flat top of a static structure
    rec.gy = 0;
  } else {
    const [sx, sz] = type === 'wall' ? wallMid(rec, G) : [(rec.gx + 0.5) * G, (rec.gz + 0.5) * G];
    rec.by = groundAnchor(terrain, sx, sz, cfg);
    rec.gy = Math.max(0, Math.floor((P.y - rec.by) / cfg.floorHeight + 0.25));
  }
  return rec;
}

function onBuild(type, rotation, hb, P, hit, yaw, cfg) {
  const G = cfg.gridSize;
  const H = cfg.floorHeight;
  const nl = Math.hypot(hit.nx, hit.nz);
  const nh = nl > 0.3 ? [hit.nx / nl, hit.nz / nl] : null; // horizontal normal (side hit)
  const vertical = Math.abs(hit.ny) > 0.7;
  const by = hb.by;
  const yb = by + hb.gy * H;
  const face = DIRS[facingIndex(yaw)];
  const toViewer = nh || [-face[0], -face[1]];
  const mk = (r) => ({ type, by, ...r });
  const neighbor = (d, gy) => mk({ gx: hb.gx + DIRS[d][0], gy, gz: hb.gz + DIRS[d][1], rot: 0 });
  const cellInFront = () => [Math.floor((P.x + toViewer[0] * G * 0.5) / G), Math.floor((P.z + toViewer[1] * G * 0.5) / G)];
  const rampRot = (facingIndex(yaw) + rotation) % 4;
  const cx = (hb.gx + 0.5) * G;
  const cz = (hb.gz + 0.5) * G;

  if (type === 'platform') {
    if (hb.type === 'platform') {
      const d = vertical || !nh ? dirIndex(P.x - cx, P.z - cz) : dirIndex(nh[0], nh[1]);
      return neighbor(d, hb.gy);
    }
    if (hb.type === 'wall') {
      const [gx, gz] = cellInFront();
      return mk({ gx, gy: P.y > yb + H * 0.6 ? hb.gy + 1 : hb.gy, gz, rot: 0 });
    }
    return neighbor(hb.rot, hb.gy + 1); // platform at the top of a ramp
  }

  if (type === 'ramp') {
    if (hb.type === 'platform') {
      if (vertical && hit.ny > 0) return mk({ gx: hb.gx, gy: hb.gy, gz: hb.gz, rot: rampRot });
      const d = nh ? dirIndex(nh[0], nh[1]) : facingIndex(yaw);
      return { ...neighbor(d, hb.gy), rot: rampRot };
    }
    if (hb.type === 'wall') {
      const [gx, gz] = cellInFront();
      return mk({ gx, gy: hb.gy, gz, rot: rampRot });
    }
    return { ...neighbor(hb.rot, hb.gy + 1), rot: rampRot }; // chained ramp
  }

  // wall
  if (hb.type === 'wall') {
    if (vertical || P.y >= yb + H * 0.5) return mk({ gx: hb.gx, gy: hb.gy + 1, gz: hb.gz, rot: hb.rot }); // stack
    if (hb.rot === 0) return mk({ gx: hb.gx + (P.x >= cx ? 1 : -1), gy: hb.gy, gz: hb.gz, rot: 0 }); // extend sideways
    return mk({ gx: hb.gx, gy: hb.gy, gz: hb.gz + (P.z >= cz ? 1 : -1), rot: 1 });
  }
  const edge = (nearestEdge(P.x, P.z, hb.gx, hb.gz, G) + rotation) % 4;
  return mk({ ...canonicalWall(edge, hb.gx, hb.gz), gy: hb.gy });
}

/**
 * @param {object} p
 * @param {'wall'|'ramp'|'platform'} p.type selected piece
 * @param {number} p.rotation user rotation steps (0..3), changed with the X key
 * @param {object|null} p.hit world raycast hit ({x,y,z,nx,ny,nz,collider,terrain})
 * @param {{x:number,y:number,z:number}|null} p.aimPoint point used when nothing is hit
 * @param {number} p.yaw camera yaw
 * @param {object} p.terrain terrain with getHeight(x, z)
 * @returns {{type:string,gx:number,gy:number,gz:number,rot:number,by:number}|null}
 */
export function resolveTarget({ type, rotation, hit, aimPoint, yaw, terrain, cfg = BUILD_CONFIG }) {
  const P = hit || aimPoint;
  if (!P) return null;
  const hb = hit?.collider?.userData?.build || null;
  return hb ? onBuild(type, rotation, hb, P, hit, yaw, cfg) : onGround(type, rotation, P, hit, yaw, terrain, cfg);
}
