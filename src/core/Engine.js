// Three.js renderer, scene and camera ownership + resize handling.
import * as THREE from 'three';
import { CAMERA_CONFIG } from '../config/cameraConfig.js';
import { RENDER_SETTINGS } from '../config/graphicsConfig.js';

export class Engine {
  constructor(canvas, { antialias = true } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDER_SETTINGS.toneMappingExposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.fov, 1, CAMERA_CONFIG.near, 1000);
    this.scene.add(this.camera);

    this.pixelRatioCap = 2;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.visualViewport?.addEventListener('resize', this._onResize);
    this.resize();
  }

  setPixelRatioCap(cap) {
    this.pixelRatioCap = cap;
    this.resize();
  }

  setViewDistance(distance) {
    this.camera.far = distance + 50;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.pixelRatioCap));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  get drawCalls() {
    return this.renderer.info.render.calls;
  }

  get triangles() {
    return this.renderer.info.render.triangles;
  }
}
