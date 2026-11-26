// Procedural animation: idle, walk, run, jump/fall, crouch, aim, landing.
// Every joint target is computed from the movement state, then damped.
import { clamp, damp, lerp } from '../core/utils/math.js';

// Crouch pose (radians). The hip height that keeps the feet on the ground is
// derived from these angles and the leg lengths of the model.
const CROUCH = { leg: -1.2, knee: 2.1, spine: 1.0, neck: 0.15, hipsBack: 0.13 };
// Rest-pose stride lengths for a leg of REFERENCE_LEG meters (thigh + shin).
const REFERENCE_LEG = 0.82;

const JOINT_KEYS = [
  'hipsY', 'hipsZ', 'spineX', 'neckX',
  'legL', 'legR', 'kneeL', 'kneeR',
  'armLx', 'armRx', 'armLz', 'armRz', 'elbowL', 'elbowR',
];

export class CharacterAnimator {
  constructor(model, { walkSpeed = 5, sprintSpeed = 7.5 } = {}) {
    this.model = model;
    this.walkSpeed = walkSpeed;
    this.sprintSpeed = sprintSpeed;
    this.phase = 0;
    this.time = 0;
    this.landImpulse = 0;
    this.onFootstep = null;
    const legs = model.legDims;
    this.standHip = model.hipHeight;
    // _apply() subtracts 30 % of the spine pitch from the legs.
    const a = CROUCH.leg - CROUCH.spine * 0.3;
    this.crouchHip = legs.offset + legs.thigh * Math.cos(a) + legs.shin * Math.cos(a + CROUCH.knee) + legs.foot;
    this.bodyScale = this.standHip / 0.92; // bob and landing amplitudes were tuned for 0.92 m hips
    this.strideScale = (legs.thigh + legs.shin) / REFERENCE_LEG;
    this.pose = Object.fromEntries(JOINT_KEYS.map((k) => [k, 0]));
    this.pose.hipsY = this.standHip;
    this.target = { ...this.pose };
  }

  land(speed) {
    this.landImpulse = clamp(speed / 12, 0.2, 1);
  }

  /**
   * @param {{speed:number, grounded:boolean, vy:number, crouched:boolean, aiming:boolean, pitch:number}} s
   */
  update(dt, s) {
    this.time += dt;
    const t = this.target;
    const walkT = clamp(s.speed / this.walkSpeed, 0, 1);
    const runT = clamp((s.speed - this.walkSpeed) / (this.sprintSpeed - this.walkSpeed), 0, 1);
    const stride = (s.crouched ? 1.1 : lerp(1.5, 2.4, runT)) * this.strideScale;
    const H = this.standHip;
    const k = this.bodyScale;

    const prevPhase = this.phase;
    if (s.grounded) this.phase += (s.speed * dt * Math.PI * 2) / stride;
    if (s.grounded && s.speed > 1 && Math.floor(prevPhase / Math.PI) !== Math.floor(this.phase / Math.PI)) {
      this.onFootstep?.(runT);
    }
    const p = this.phase;
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);

    if (!s.grounded) {
      const rising = s.vy > 0;
      t.hipsY = H;
      t.legL = rising ? -0.75 : -0.35;
      t.legR = rising ? -0.1 : -0.2;
      t.kneeL = rising ? 1.1 : 0.5;
      t.kneeR = rising ? 0.45 : 0.4;
      t.armLx = -0.3;
      t.armRx = -0.3;
      t.armLz = 0.55;
      t.armRz = -0.55;
      t.elbowL = -0.4;
      t.elbowR = -0.4;
      t.spineX = 0.08;
    } else if (s.crouched) {
      const swing = 0.35 * walkT;
      t.hipsY = this.crouchHip;
      t.hipsZ = -CROUCH.hipsBack; // sit back so the leaning head stays above the feet
      t.legL = CROUCH.leg - sinP * swing;
      t.legR = CROUCH.leg + sinP * swing;
      t.kneeL = CROUCH.knee + Math.max(0, cosP) * swing;
      t.kneeR = CROUCH.knee + Math.max(0, -cosP) * swing;
      t.spineX = CROUCH.spine;
      t.armLx = -0.5 + sinP * 0.2 * walkT;
      t.armRx = -0.5 - sinP * 0.2 * walkT;
      t.armLz = 0.12;
      t.armRz = -0.12;
      t.elbowL = -0.6;
      t.elbowR = -0.6;
    } else {
      const legAmp = (0.5 + 0.4 * runT) * walkT;
      const kneeAmp = (0.5 + 0.8 * runT) * walkT;
      const armAmp = (0.35 + 0.5 * runT) * walkT;
      t.hipsY = H - (Math.abs(sinP) * 0.05 * walkT + runT * 0.03 - Math.sin(this.time * 2) * 0.004 * (1 - walkT)) * k;
      t.legL = -sinP * legAmp;
      t.legR = sinP * legAmp;
      t.kneeL = 0.08 + Math.max(0, cosP) * kneeAmp;
      t.kneeR = 0.08 + Math.max(0, -cosP) * kneeAmp;
      t.armLx = sinP * armAmp;
      t.armRx = -sinP * armAmp;
      t.armLz = 0.1 + 0.05 * runT;
      t.armRz = -0.1 - 0.05 * runT;
      t.elbowL = -(0.25 + 0.95 * runT) - 0.05 * Math.sin(this.time * 2);
      t.elbowR = -(0.25 + 0.95 * runT);
      t.spineX = 0.04 + runT * 0.28 + Math.sin(this.time * 2) * 0.012 * (1 - walkT);
    }

    if (!s.grounded || !s.crouched) t.hipsZ = 0;
    this._weaponPose(t, s, runT);
    // Crouched, the big head leans forward so it stays low (tunnels, cover).
    t.neckX = -clamp(s.pitch, -1, 1) * (s.crouched ? 0.15 : 0.35) + (s.crouched ? CROUCH.neck : 0) - runT * 0.15;

    this.landImpulse = Math.max(0, this.landImpulse - dt * 5);
    t.hipsY -= this.landImpulse * 0.14 * k;

    const rate = s.grounded ? 16 : 10;
    for (const k of JOINT_KEYS) this.pose[k] = damp(this.pose[k], t[k], rate, dt);
    this._apply();
  }

  // Arms with a weapon. s.hold: 'rifle' | 'pistol' | 'shoulder' | null,
  // s.stance: aiming or just fired (weapon along the camera direction),
  // s.reload: 0..1 progress or -1, s.recoil: 0..1 kick.
  _weaponPose(t, s, runT) {
    const pitch = clamp(s.pitch, -1.2, 1.2);
    const stance = s.aiming || s.stance;
    if (!s.hold) {
      if (stance) {
        t.armRx = -1.5 - pitch;
        t.armRz = 0.05;
        t.elbowR = -0.15;
      }
      return;
    }
    const twoHands = s.hold !== 'pistol';
    if (s.reload >= 0) {
      const k = s.reload;
      t.armRx = -0.75;
      t.armRz = 0.15;
      t.elbowR = -0.7;
      t.armLx = -0.7 + Math.sin(k * Math.PI * 3) * 0.35;
      t.armLz = -0.55;
      t.elbowL = -1.1;
      this.weaponRoll = Math.sin(k * Math.PI) * 0.7;
      return;
    }
    this.weaponRoll = 0;
    if (stance) {
      t.armRx = -Math.PI / 2 - pitch;
      t.armRz = 0.14;
      t.elbowR = 0;
      if (twoHands) {
        t.armLx = -1.3 - pitch;
        t.armLz = -0.62;
        t.elbowL = -0.55;
      } else {
        t.armLx = -1.45 - pitch;
        t.armLz = -0.42;
        t.elbowL = -0.1;
      }
      t.armRx -= s.recoil * 0.22;
      t.armLx -= s.recoil * 0.15;
      t.spineX -= s.recoil * 0.05;
      return;
    }
    if (s.sprinting && twoHands) {
      // Weapon held across the chest while sprinting.
      t.armRx = -0.35;
      t.armRz = 0.2;
      t.elbowR = -1.25;
      t.armLx = -0.85;
      t.armLz = -0.65;
      t.elbowL = -1.0;
      return;
    }
    if (twoHands) {
      t.armRx = -0.55 - runT * 0.1;
      t.armRz = 0.12;
      t.elbowR = -0.85;
      t.armLx = -0.95;
      t.armLz = -0.6;
      t.elbowL = -0.8;
    } else {
      t.armRx = -0.35;
      t.armRz = 0.05;
      t.elbowR = -0.45;
    }
  }

  _apply() {
    const j = this.model.joints;
    const q = this.pose;
    j.hips.position.y = q.hipsY;
    j.hips.position.z = q.hipsZ;
    j.spine.rotation.x = q.spineX;
    j.neck.rotation.x = q.neckX - q.spineX * 0.6;
    j.legL.rotation.x = q.legL - q.spineX * 0.3;
    j.legR.rotation.x = q.legR - q.spineX * 0.3;
    j.kneeL.rotation.x = q.kneeL;
    j.kneeR.rotation.x = q.kneeR;
    // Keep feet roughly flat on the ground.
    j.ankleL.rotation.x = -(j.legL.rotation.x + q.kneeL) * 0.85;
    j.ankleR.rotation.x = -(j.legR.rotation.x + q.kneeR) * 0.85;
    j.armL.rotation.x = q.armLx;
    j.armR.rotation.x = q.armRx;
    j.armL.rotation.z = q.armLz;
    j.armR.rotation.z = q.armRz;
    j.elbowL.rotation.x = q.elbowL;
    j.elbowR.rotation.x = q.elbowR;
    if (j.hand) {
      this.roll = (this.roll || 0) + ((this.weaponRoll || 0) - (this.roll || 0)) * 0.25;
      j.hand.rotation.z = this.roll;
    }
  }
}
