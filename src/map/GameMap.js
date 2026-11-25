// Assembles a playable map: layout, colliders, terrain, structures, water,
// vegetation, sky, fog and lighting.
import * as THREE from 'three';
import { generateLayout, registerColliders } from './MapLayout.js';
import { MapQueries } from './MapQueries.js';
import { createTerrainMesh } from './TerrainMesh.js';
import { createStructureMeshes } from './StructureMeshes.js';
import { Water } from './Water.js';
import { Vegetation } from './Vegetation.js';
import { SkyDome } from './SkyDome.js';
import { Lighting } from './Lighting.js';
import { deriveSeed } from '../core/utils/random.js';

export class GameMap {
  constructor(def, { scene, world, killHeight }) {
    this.def = def;
    this.scene = scene;
    this.layout = generateLayout(def);
    registerColliders(this.layout, world);
    this.queries = new MapQueries(this.layout, killHeight);

    this.root = new THREE.Group();
    this.root.name = `map:${def.id}`;
    scene.add(this.root);

    this.lighting = new Lighting(scene, def.lighting);
    this.sky = new SkyDome(def.sky, def.lighting.sunDirection, deriveSeed(def.seed, 'sky'));
    this.root.add(this.sky.group);

    scene.background = new THREE.Color(def.sky.horizon);
    scene.fog = new THREE.Fog(def.lighting.fogColor, def.lighting.fogNear, 400);

    this.root.add(createTerrainMesh(this.layout));
    this.root.add(createStructureMeshes(this.layout.structures));
    this.water = new Water(this.layout);
    this.root.add(this.water.group);
    this.vegetation = new Vegetation(this.layout.vegetation, def.palette);
    this.root.add(this.vegetation.group);
  }

  get spawnPoints() {
    return this.layout.spawnPoints;
  }

  applyQuality(preset) {
    this.lighting.setQuality(preset);
    this.vegetation.setDensity(preset.vegetationDensity, preset.grassDensity);
    this.scene.fog.far = preset.viewDistance;
    this.scene.fog.near = Math.min(this.def.lighting.fogNear, preset.viewDistance * 0.4);
    this.sky.setRadius(preset.viewDistance);
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
    this.scene.remove(this.root);
    this.scene.remove(this.lighting.hemi, this.lighting.sun, this.lighting.sun.target);
    this.lighting.sun.shadow.map?.dispose();
  }
}
