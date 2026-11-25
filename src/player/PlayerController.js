// Converts player intent (input + camera yaw) into motor velocity.
// Pure logic: no rendering, no DOM.
export class PlayerController {
  constructor(movementConfig) {
    this.cfg = movementConfig;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.state = {
      sprinting: false,
      jumped: false,
      moving: false,
      horizontalSpeed: 0,
      speedMultiplier: 1,
    };
  }

  /**
   * @param {number} dt
   * @param {{moveX:number, moveY:number, sprint:boolean, crouch:boolean, jumpPressed:boolean, aiming:boolean, yaw:number}} intent
   *        moveX: right (+) / left (-), moveY: forward (+) / backward (-), yaw: camera yaw.
   * @param {import('./CharacterMotor.js').CharacterMotor} motor
   * @param {number} speedMultiplier environment factor (river = 0.7)
   */
  update(dt, intent, motor, speedMultiplier = 1) {
    const cfg = this.cfg;
    const v = motor.velocity;
    this.state.jumped = false;

    if (intent.crouch !== motor.crouched) motor.setCrouched(intent.crouch);

    this.coyoteTimer = motor.grounded ? cfg.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    if (intent.jumpPressed) this.jumpBufferTimer = cfg.jumpBuffer;
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      const canJump = !motor.crouched || motor.setCrouched(false);
      if (canJump) {
        v.y = cfg.jumpVelocity;
        motor.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.state.jumped = true;
      }
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    let mx = intent.moveX;
    let my = intent.moveY;
    let len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
      len = 1;
    }

    // Camera-relative directions (camera looks toward -Z at yaw 0).
    const sin = Math.sin(intent.yaw);
    const cos = Math.cos(intent.yaw);
    let dirX = -sin * my + cos * mx;
    let dirZ = -cos * my - sin * mx;
    const dirLen = Math.hypot(dirX, dirZ);
    if (dirLen > 1e-6) {
      dirX /= dirLen;
      dirZ /= dirLen;
    }

    const sprinting = intent.sprint && !motor.crouched && !intent.aiming
      && my > cfg.sprintForwardThreshold && len > 0.1;
    let targetSpeed = motor.crouched ? cfg.crouchSpeed : sprinting ? cfg.sprintSpeed : cfg.walkSpeed;
    targetSpeed *= speedMultiplier * len;

    const hasInput = len > 0.01;
    const tx = dirX * targetSpeed;
    const tz = dirZ * targetSpeed;
    if (motor.grounded) {
      if (hasInput) {
        this._approach(v, tx, tz, cfg.groundAcceleration * dt);
      } else {
        const speed = Math.hypot(v.x, v.z);
        const next = Math.max(0, speed - cfg.groundDeceleration * dt);
        const k = speed > 1e-6 ? next / speed : 0;
        v.x *= k;
        v.z *= k;
      }
    } else if (hasInput) {
      this._approach(v, tx, tz, cfg.airAcceleration * dt);
    }

    motor.step(dt);

    this.state.sprinting = sprinting && motor.grounded;
    this.state.horizontalSpeed = Math.hypot(v.x, v.z);
    this.state.moving = this.state.horizontalSpeed > 0.3;
    this.state.speedMultiplier = speedMultiplier;
    return this.state;
  }

  _approach(v, tx, tz, maxDelta) {
    const dx = tx - v.x;
    const dz = tz - v.z;
    const d = Math.hypot(dx, dz);
    if (d <= maxDelta || d < 1e-9) {
      v.x = tx;
      v.z = tz;
    } else {
      v.x += (dx / d) * maxDelta;
      v.z += (dz / d) * maxDelta;
    }
  }
}
