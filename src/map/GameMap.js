// Assembles a playable map: layout (terrain, colliders, content), plateau and
// cliff meshes, structures, instanced props, water, sky, fog and lighting.
import * as THREE from 'three';
import { generateMap } from './MapLayout.js';
import { MapQueries } from './MapQueries.js';
import { buildPlateauArrays } from './PlateauMesh.js';
import { createStructureMeshes } from './StructureMeshes.js';
import { InstancedProps } from './InstancedProps.js';
import { Water } from './Water.js';
import { SkyDome } from './SkyDome.js';
import { Lighting } from './Lighting.js';
import { geometryFromArrays } from './geometryUtils.js';
import { deriveSeed } from '../core/utils/random.js';

export class GameMap {
  constructor(def, { scene, killHeight, seed }) {
    const t0 = performance.now();
    this.def = def;
    this.scene = scene;
    this.layout = generateMap(def, { seed });
    this.world = this.layout.world;
    this.queries = new MapQueries(this.layout, killHeight);

    this.root = new THREE.Group();
    this.root.name = `map:${def.id}`;
    scene.add(this.root);

    this.lighting = new Lighting(scene, def.lighting);
    this.sky = new SkyDome(def.sky, def.lighting.sunDirection, deriveSeed(def.seed, 'sky'));
    this.root.add(this.sky.group);
    scene.background = new THREE.Color(def.sky.horizon);
    scene.fog = new THREE.Fog(def.lighting.fogColor, def.lighting.fogNear, 450);

    const plateau = buildPlateauArrays(this.layout.terrain, def);
    const groundMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    const top = new THREE.Mesh(geometryFromArrays(plateau.top), groundMaterial);
    top.receiveShadow = true;
    top.name = 'plateau';
    const cliff = new THREE.Mesh(geometryFromArrays(plateau.cliff), groundMaterial);
    cliff.name = 'cliff';
    this.root.add(top, cliff);

    this.structures = createStructureMeshes(this.layout.structures);
    this.root.add(this.structures);
    this.props = new InstancedProps(this.layout.instances);
    this.root.add(this.props.group);
    this.water = new Water(this.layout, plateau.water);
    this.root.add(this.water.group);

    this.stats = {
      buildMs: performance.now() - t0,
      triangles: plateau.top.triangles + plateau.cliff.triangles + plateau.water.triangles
        + this.structures.userData.triangles + this.props.triangles,
    };
  }

  get spawnPoints() {
    return this.layout.spawnPoints;
  }

  applyQuality(preset) {
    this.lighting.setQuality(preset);
    this.props.setDensity(preset.vegetationDensity);
    this.scene.fog.far = preset.viewDistance + 60;
    this.scene.fog.near = Math.min(this.def.lighting.fogNear, preset.viewDistance * 0.4);
    this.sky.setRadius(preset.viewDistance + 40);
  }

  update(dt, camera, focus) {
    this.sky.update(dt, camera.position);
    this.water.update(dt, camera.position);
    this.lighting.update(focus);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    this.props.dispose();
    this.scene.remove(this.root);
    this.scene.remove(this.lighting.hemi, this.lighting.sun, this.lighting.sun.target);
    this.lighting.sun.shadow.map?.dispose();
  }
}
