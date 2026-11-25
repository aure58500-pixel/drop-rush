// River ribbons (following per-point water levels) and an infinite ocean plane.
import * as THREE from 'three';

export class Water {
  constructor(layout) {
    const pal = layout.def.palette;
    this.group = new THREE.Group();
    this.group.name = 'water';
    this.time = 0;

    this.riverMaterial = new THREE.MeshStandardMaterial({
      color: pal.water, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.78, flatShading: true,
    });
    this.rivers = layout.water.rivers.map((river) => {
      const geometry = this._buildRibbon(river);
      const mesh = new THREE.Mesh(geometry, this.riverMaterial);
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      this.group.add(mesh);
      return { mesh, baseY: Float32Array.from(geometry.attributes.position.array.filter((_, i) => i % 3 === 1)) };
    });

    const oceanGeometry = new THREE.PlaneGeometry(3000, 3000, 1, 1);
    oceanGeometry.rotateX(-Math.PI / 2);
    this.ocean = new THREE.Mesh(oceanGeometry, new THREE.MeshStandardMaterial({ color: pal.ocean, roughness: 0.25, metalness: 0.05 }));
    this.ocean.position.y = layout.water.oceanLevel;
    this.ocean.receiveShadow = true;
    this.group.add(this.ocean);
  }

  _buildRibbon(river) {
    const pts = [];
    // Resample the polyline every ~3 m for a smooth low-poly ribbon.
    for (let i = 0; i < river.points.length - 1; i++) {
      const [ax, az] = river.points[i];
      const [bx, bz] = river.points[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        pts.push([ax + (bx - ax) * t, az + (bz - az) * t, river.levels[i] + (river.levels[i + 1] - river.levels[i]) * t]);
      }
    }
    const last = river.points[river.points.length - 1];
    pts.push([last[0], last[1], river.levels[river.levels.length - 1]]);
    const halfW = river.width / 2 + river.bank * 0.6;
    const positions = [];
    const indices = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      let tx = next[0] - prev[0];
      let tz = next[1] - prev[1];
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      const nx = -tz;
      const nz = tx;
      positions.push(pts[i][0] + nx * halfW, pts[i][2], pts[i][1] + nz * halfW);
      positions.push(pts[i][0], pts[i][2], pts[i][1]);
      positions.push(pts[i][0] - nx * halfW, pts[i][2], pts[i][1] - nz * halfW);
      if (i > 0) {
        const b = (i - 1) * 3;
        const c = i * 3;
        for (let k = 0; k < 2; k++) {
          indices.push(b + k, c + k, b + k + 1, b + k + 1, c + k, c + k + 1);
        }
      }
    }
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry = geometry.toNonIndexed();
    geometry.computeVertexNormals();
    // Make sure faces point up regardless of the polyline direction.
    const n = geometry.attributes.normal;
    if (n.getY(0) < 0) {
      const p = geometry.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, x, y, z);
      }
      geometry.computeVertexNormals();
    }
    geometry.computeBoundingSphere();
    return geometry;
  }

  update(dt, cameraPosition) {
    this.time += dt;
    this.ocean.position.x = cameraPosition.x;
    this.ocean.position.z = cameraPosition.z;
    for (const r of this.rivers) {
      const p = r.mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        p.setY(i, r.baseY[i] + Math.sin(this.time * 1.6 + x * 0.35 + z * 0.22) * 0.05);
      }
      p.needsUpdate = true;
      r.mesh.geometry.computeVertexNormals();
    }
  }
}
