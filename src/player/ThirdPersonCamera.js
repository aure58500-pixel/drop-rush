// Over-the-shoulder third-person camera with collision avoidance (raycasts
// against the CollisionWorld), aim zoom (FOV 75 -> 60) and smoothing.
import { CAMERA_CONFIG } from '../config/cameraConfig.js';
import { clamp, damp, lerp } from '../core/utils/math.js';

export class ThirdPersonCamera {
  constructor(camera, world, config = CAMERA_CONFIG) {
    this.camera = camera;
    this.world = world;
    this.cfg = config;
    this.yaw = 0;
    this.pitch = -0.15;
    this.aimT = 0;
    this.currentDistance = config.distance;
    this.pivotY = null;
    this.distanceToPivot = config.distance;
    this.forward = { x: 0, y: 0, z: -1 };
    this.position = { x: 0, y: 0, z: 0 }; // plain numbers, usable by gameplay code
    this.recoilPitch = 0;
    this.recoilYaw = 0;
  }

  // Camera kick of a shot, in degrees. It recovers over time (see update).
  addRecoil(degrees) {
    this.recoilPitch += (degrees * Math.PI) / 180;
    this.recoilYaw += ((Math.random() - 0.5) * degrees * 0.35 * Math.PI) / 180;
  }

  applyLook(dx, dy, sensitivity, invertY = false) {
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity * (invertY ? -1 : 1);
    this.pitch = clamp(this.pitch, this.cfg.minPitchRad, this.cfg.maxPitchRad);
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    else if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }

  snap() {
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.pivotY = null;
    this.currentDistance = this.cfg.distance;
  }

  /**
   * @param {number} dt
   * @param {{x:number,y:number,z:number}} feet target feet position
   * @param {number} eyeHeight
   * @param {boolean} aiming
   */
  update(dt, feet, eyeHeight, aiming, aimFov = this.cfg.aimFov, recoilRecovery = 7) {
    const cfg = this.cfg;
    const recover = Math.exp(-recoilRecovery * dt);
    this.recoilPitch *= recover;
    this.recoilYaw *= recover;
    const viewPitch = clamp(this.pitch + this.recoilPitch, cfg.minPitchRad, cfg.maxPitchRad);
    const viewYaw = this.yaw + this.recoilYaw;
    this.aimT = damp(this.aimT, aiming ? 1 : 0, cfg.aimTransitionSpeed, dt);

    const targetPivotY = feet.y + eyeHeight;
    this.pivotY = this.pivotY === null ? targetPivotY : damp(this.pivotY, targetPivotY, cfg.pivotVerticalSmoothing, dt);
    const px = feet.x;
    const py = this.pivotY;
    const pz = feet.z;

    const cp = Math.cos(viewPitch);
    const fx = -Math.sin(viewYaw) * cp;
    const fy = Math.sin(viewPitch);
    const fz = -Math.cos(viewYaw) * cp;
    this.forward.x = fx;
    this.forward.y = fy;
    this.forward.z = fz;
    const rx = Math.cos(viewYaw);
    const rz = -Math.sin(viewYaw);

    // 1) Shoulder offset, shortened if a wall is beside the player.
    let shoulder = lerp(cfg.shoulderOffset, cfg.aimShoulderOffset, this.aimT);
    const sideHit = this.world.raycast(px, py, pz, rx, 0, rz, shoulder + cfg.collisionMargin);
    if (sideHit) shoulder = Math.max(0, sideHit.distance - cfg.collisionMargin);
    const sx = px + rx * shoulder;
    const sz = pz + rz * shoulder;

    // 2) Boom behind the shoulder point.
    const wanted = lerp(cfg.distance, cfg.aimDistance, this.aimT);
    let allowed = wanted;
    const hit = this.world.raycast(sx, py, sz, -fx, -fy, -fz, wanted + cfg.collisionMargin);
    if (hit) allowed = Math.max(cfg.minDistance, hit.distance - cfg.collisionMargin);
    if (allowed < this.currentDistance) this.currentDistance = allowed;
    else this.currentDistance = damp(this.currentDistance, allowed, cfg.zoomOutSpeed, dt);

    let cx = sx - fx * this.currentDistance;
    let cy = py - fy * this.currentDistance;
    let cz = sz - fz * this.currentDistance;
    const ground = this.world.terrain ? this.world.terrain.getHeight(cx, cz) + 0.3 : -Infinity;
    if (cy < ground) cy = ground;

    const cam = this.camera;
    this.position.x = cx;
    this.position.y = cy;
    this.position.z = cz;
    cam.position.set(cx, cy, cz);
    cam.lookAt(cx + fx, cy + fy, cz + fz);
    const fov = lerp(cfg.fov, aimFov, this.aimT);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    this.distanceToPivot = Math.hypot(cx - px, cy - py, cz - pz);
  }
}
