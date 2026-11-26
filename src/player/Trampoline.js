// Trampoline rule (pure): a grounded character standing on a trampoline
// collider is launched to `height` meters above it and pushed forward.
export class TrampolineRule {
  constructor(gravity) {
    this.gravity = gravity;
    this.cooldown = 0;
  }

  /**
   * Call after the motor step. Returns the trampoline data when a launch happened.
   * @param {number} dt
   * @param {import('./CharacterMotor.js').CharacterMotor} motor
   * @param {import('./PlayerController.js').PlayerController} controller
   * @param {number} yaw camera yaw, used as forward when the character stands still
   */
  update(dt, motor, controller, yaw) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const t = motor.grounded ? motor.groundCollider?.userData?.trampoline : null;
    if (!t || this.cooldown > 0) return null;
    const v = motor.velocity;
    v.y = Math.sqrt(2 * this.gravity * t.height);
    let hx = v.x;
    let hz = v.z;
    const speed = Math.hypot(hx, hz);
    if (speed < 0.5) {
      hx = -Math.sin(yaw);
      hz = -Math.cos(yaw);
    } else {
      hx /= speed;
      hz /= speed;
    }
    const push = Math.max(speed, t.push);
    v.x = hx * push;
    v.z = hz * push;
    motor.grounded = false;
    controller.coyoteTimer = 0; // no extra jump right after the launch
    controller.jumpBufferTimer = 0;
    this.cooldown = 0.3;
    return t;
  }
}
