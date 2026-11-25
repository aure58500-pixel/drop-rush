// Kinematic capsule (approximated by a vertical cylinder) moving through the
// CollisionWorld with substeps, step climbing, slope snapping and ceilings.
export class CharacterMotor {
  constructor(world, { capsule, movement }, maxSubstep = 1 / 120) {
    this.world = world;
    this.radius = capsule.radius;
    this.standingHeight = capsule.standingHeight;
    this.crouchHeight = capsule.crouchHeight;
    this.height = capsule.standingHeight;
    this.crouched = false;
    this.gravity = movement.gravity;
    this.maxFallSpeed = movement.maxFallSpeed;
    this.stepHeight = movement.stepHeight;
    this.airStepHeight = movement.airStepHeight;
    this.snapDistance = movement.groundSnapDistance;
    this.maxSubstep = maxSubstep;

    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.grounded = false;
    this.groundCollider = null;
    this.landedThisFrame = false;
    this.landingSpeed = 0;
    this._normals = Array.from({ length: 16 }, () => ({ nx: 0, nz: 0 }));
  }

  teleport(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;
    this.height = this.standingHeight;
    this.crouched = false;
    this.grounded = false;
  }

  canStand() {
    const p = this.position;
    const ceiling = this.world.ceilingHeight(p.x, p.z, this.radius * 0.95, p.y + this.crouchHeight * 0.5);
    return ceiling >= p.y + this.standingHeight - 0.01;
  }

  // Returns true if the requested posture is now active.
  setCrouched(wantCrouch) {
    if (wantCrouch === this.crouched) return true;
    if (wantCrouch) {
      this.crouched = true;
      this.height = this.crouchHeight;
      return true;
    }
    if (!this.canStand()) return false;
    this.crouched = false;
    this.height = this.standingHeight;
    return true;
  }

  step(dt) {
    this.landedThisFrame = false;
    let remaining = dt;
    let guard = 0;
    while (remaining > 1e-6 && guard++ < 32) {
      const h = Math.min(remaining, this.maxSubstep);
      this._substep(h);
      remaining -= h;
    }
  }

  _substep(dt) {
    const p = this.position;
    const v = this.velocity;
    const w = this.world;
    const r = this.radius;

    // Horizontal move, then slide along contacts.
    p.x += v.x * dt;
    p.z += v.z * dt;
    const allowance = this.grounded ? this.stepHeight : this.airStepHeight;
    const contacts = w.resolveCylinder(p, r, this.height, allowance, this._normals);
    for (let i = 0; i < contacts; i++) {
      const n = this._normals[i];
      const vn = v.x * n.nx + v.z * n.nz;
      if (vn < 0) {
        v.x -= n.nx * vn;
        v.z -= n.nz * vn;
      }
    }

    // Vertical move. Ground candidates are surfaces below the previous feet
    // (+ allowance), which makes landing tunnel-proof at any fall speed.
    const prevFeet = p.y;
    const wasGrounded = this.grounded;
    v.y = Math.max(v.y - this.gravity * dt, -this.maxFallSpeed);
    let newY = p.y + v.y * dt;
    const ground = w.groundHeight(p.x, p.z, r * 0.9, prevFeet + allowance);
    const groundCollider = w.lastGround;

    if (v.y <= 0) {
      if (newY <= ground || (wasGrounded && ground >= newY - this.snapDistance)) {
        if (!wasGrounded) {
          this.landedThisFrame = true;
          this.landingSpeed = -v.y;
        }
        newY = ground;
        v.y = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    } else {
      this.grounded = false;
      if (newY < ground) newY = ground;
    }

    const ceiling = w.ceilingHeight(p.x, p.z, r * 0.9, prevFeet + this.height - 0.05);
    if (newY + this.height > ceiling) {
      newY = Math.max(ceiling - this.height, Math.min(prevFeet, newY));
      if (v.y > 0) v.y = 0;
    }

    p.y = newY;
    this.groundCollider = this.grounded ? groundCollider : null;
  }
}
