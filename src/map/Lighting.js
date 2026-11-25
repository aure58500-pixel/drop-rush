// Two dynamic lights per scene (hemisphere + sun). Shadow camera follows the player.
import * as THREE from 'three';

export class Lighting {
  constructor(scene, def) {
    this.sunDirection = new THREE.Vector3(...def.sunDirection).normalize();
    this.hemi = new THREE.HemisphereLight(def.hemiSky, def.hemiGround, def.hemiIntensity);
    this.sun = new THREE.DirectionalLight(def.sunColor, def.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.shadowRadius = 40;
    scene.add(this.hemi, this.sun, this.sun.target);
    this._focus = new THREE.Vector3();
  }

  setQuality(preset) {
    this.sun.castShadow = preset.shadows;
    this.shadowRadius = preset.shadowRadius;
    const cam = this.sun.shadow.camera;
    cam.left = -this.shadowRadius;
    cam.right = this.shadowRadius;
    cam.top = this.shadowRadius;
    cam.bottom = -this.shadowRadius;
    cam.near = 1;
    cam.far = 260;
    cam.updateProjectionMatrix();
    if (this.sun.shadow.mapSize.x !== preset.shadowMapSize) {
      this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
  }

  // Snap the shadow focus to texel increments to avoid shimmering.
  update(focus) {
    const texel = (this.shadowRadius * 2) / this.sun.shadow.mapSize.x;
    this._focus.set(
      Math.round(focus.x / texel) * texel,
      Math.round(focus.y / texel) * texel,
      Math.round(focus.z / texel) * texel,
    );
    this.sun.target.position.copy(this._focus);
    this.sun.position.copy(this._focus).addScaledVector(this.sunDirection, 120);
  }
}
