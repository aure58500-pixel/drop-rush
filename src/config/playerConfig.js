// Character characteristics and movement physics (SI units: meters, seconds).
export const PLAYER_CONFIG = {
  maxHealth: 100,
  maxShield: 100,
  movement: {
    walkSpeed: 5,
    sprintSpeed: 7.5,
    crouchSpeed: 2.5,
    groundAcceleration: 40,
    groundDeceleration: 30,
    airAcceleration: 12,
    jumpVelocity: 7.5,
    gravity: 20,
    maxFallSpeed: 55,
    coyoteTime: 0.1, // jump still allowed shortly after leaving a ledge
    jumpBuffer: 0.12, // jump pressed shortly before landing is kept
    stepHeight: 0.45, // max obstacle climbed automatically on ground
    airStepHeight: 0.15, // ledge assist while airborne
    groundSnapDistance: 0.35, // stick to slopes/stairs when walking down
    sprintForwardThreshold: 0.3, // forward input required to sprint
    turnSpeed: 12, // model rotation damping (1/s)
  },
  capsule: {
    standingHeight: 1.8,
    crouchHeight: 1.0,
    radius: 0.35,
  },
  eyeHeight: {
    standing: 1.6,
    crouching: 0.95,
  },
};
