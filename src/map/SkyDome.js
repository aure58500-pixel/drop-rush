// Gradient sky dome with sun glow + slowly drifting low-poly clouds.
import * as THREE from 'three';
import { RENDER_SETTINGS } from '../config/graphicsConfig.js';
import { SeededRandom } from '../core/utils/random.js';
import { jitterVertices } from './geometryUtils.js';

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 bottomColor;
uniform vec3 sunColor;
uniform vec3 sunDirection;
varying vec3 vDirection;
void main() {
  vec3 d = normalize(vDirection);
  float h = d.y;
  vec3 col = h > 0.0
    ? mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
    : mix(horizonColor, bottomColor, pow(clamp(-h, 0.0, 1.0), 0.45));
  float s = max(dot(d, normalize(sunDirection)), 0.0);
  col += sunColor * (pow(s, 900.0) * 3.0 + pow(s, 10.0) * 0.28);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class SkyDome {
  constructor(skyDef, sunDirection, seed) {
    this.group = new THREE.Group();
    this.group.name = 'sky';
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(skyDef.top) },
        horizonColor: { value: new THREE.Color(skyDef.horizon) },
        bottomColor: { value: new THREE.Color(skyDef.bottom) },
        sunColor: { value: new THREE.Color(skyDef.sun) },
        sunDirection: { value: new THREE.Vector3(...sunDirection).normalize() },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.material);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // Clouds: clusters of faceted blobs in one InstancedMesh.
    const rng = new SeededRandom(seed);
    const blob = jitterVertices(new THREE.IcosahedronGeometry(1, 0), 0.25, 4);
    const blobsPerCloud = 4;
    const count = RENDER_SETTINGS.cloudCount * blobsPerCloud;
    this.clouds = new THREE.InstancedMesh(blob, new THREE.MeshLambertMaterial({
      color: skyDef.clouds, emissive: skyDef.clouds, emissiveIntensity: 0.35, fog: false,
    }), count);
    this.clouds.frustumCulled = false;
    this.cloudLayout = [];
    for (let c = 0; c < RENDER_SETTINGS.cloudCount; c++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(0.25, 0.85);
      const height = rng.range(0.28, 0.42);
      const size = rng.range(0.035, 0.06);
      for (let b = 0; b < blobsPerCloud; b++) {
        this.cloudLayout.push({
          angle, dist, height,
          ox: (b - 1.5) * size * 1.2, oy: rng.range(-0.2, 0.3) * size, oz: rng.range(-0.5, 0.5) * size,
          s: size * rng.range(0.7, 1.2),
        });
      }
    }
    this.group.add(this.clouds);
    this.radius = 400;
    this.rotation = 0;
    this._m = new THREE.Matrix4();
    this._layoutClouds();
  }

  setRadius(radius) {
    this.radius = radius;
    this.dome.scale.setScalar(radius * 0.95);
    this._layoutClouds();
  }

  _layoutClouds() {
    const R = this.radius * 0.9;
    this.cloudLayout.forEach((c, i) => {
      const x = Math.cos(c.angle) * c.dist * R + c.ox * R;
      const z = Math.sin(c.angle) * c.dist * R + c.oz * R;
      const y = c.height * R + c.oy * R;
      const s = c.s * R;
      this._m.makeScale(s * 1.6, s, s);
      this._m.setPosition(x, y, z);
      this.clouds.setMatrixAt(i, this._m);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  update(dt, cameraPosition) {
    this.dome.position.copy(cameraPosition);
    this.rotation += dt * 0.004;
    this.clouds.position.set(cameraPosition.x, 0, cameraPosition.z);
    this.clouds.rotation.y = this.rotation;
  }
}
