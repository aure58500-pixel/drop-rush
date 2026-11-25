// The locally controlled character: input intent -> controller -> motor,
// plus model orientation, animation, footsteps and out-of-map detection.
import { PLAYER_CONFIG } from '../config/playerConfig.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { getSkin } from '../config/skins.js';
import { damp, dampAngle } from '../core/utils/math.js';
import { CharacterMotor } from './CharacterMotor.js';
import { PlayerController } from './PlayerController.js';
import { CharacterModel } from './CharacterModel.js';
import { CharacterAnimator } from './CharacterAnimator.js';

export class LocalPlayer {
  constructor({ world, queries, scene, skinId, audio, events }) {
    this.world = world;
    this.queries = queries;
    this.audio = audio;
    this.events = events;
    this.motor = new CharacterMotor(world, PLAYER_CONFIG, GAME_CONFIG.physicsMaxSubstep);
    this.controller = new PlayerController(PLAYER_CONFIG.movement);
    this.model = new CharacterModel(getSkin(skinId));
    scene.add(this.model.root);
    this.animator = new CharacterAnimator(this.model, PLAYER_CONFIG.movement);
    this.animator.onFootstep = (runT) => this._footstep(runT);

    this.health = PLAYER_CONFIG.maxHealth;
    this.shield = 0;
    this.alive = true;
    this.aiming = false;
    this.facingYaw = 0;
    this.visualY = 0;
    this.eyeHeight = PLAYER_CONFIG.eyeHeight.standing;
    this.inWater = false;
    this.status = 'idle';
  }

  get position() {
    return this.motor.position;
  }

  setSkin(skinId) {
    this.model.setSkin(getSkin(skinId));
  }

  spawn(point) {
    this.motor.teleport(point.x, point.y + 0.05, point.z);
    this.facingYaw = point.yaw + Math.PI;
    this.visualY = point.y;
    this.health = PLAYER_CONFIG.maxHealth;
    this.shield = 0;
    this.alive = true;
    this.model.setVisible(true);
    this._syncModel();
  }

  eliminate(reason) {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    this.model.setVisible(false);
    this.motor.velocity.x = 0;
    this.motor.velocity.z = 0;
    this.events.emit('player:eliminated', { reason });
  }

  /**
   * @param {number} dt
   * @param {{moveX:number, moveY:number, sprint:boolean, crouch:boolean, jumpPressed:boolean, aiming:boolean}} intent
   * @param {import('./ThirdPersonCamera.js').ThirdPersonCamera} cameraRig
   */
  update(dt, intent, cameraRig) {
    if (!this.alive) return;
    const motor = this.motor;
    const p = motor.position;
    this.aiming = intent.aiming;

    const speedMultiplier = this.queries.getSpeedMultiplier(p.x, p.y, p.z);
    this.inWater = speedMultiplier < 1;
    const wasGrounded = motor.grounded;
    const state = this.controller.update(dt, { ...intent, yaw: cameraRig.yaw }, motor, speedMultiplier);

    if (state.jumped) this.audio?.play('jump', { volume: 0.5, pitchVariance: 0.08 });
    if (motor.landedThisFrame && !wasGrounded) {
      this.animator.land(motor.landingSpeed);
      if (motor.landingSpeed > 3) this.audio?.play(this.inWater ? 'splash' : 'land', { volume: Math.min(1, motor.landingSpeed / 12) });
    }

    // Facing: camera direction when aiming, else movement direction.
    if (this.aiming) {
      this.facingYaw = dampAngle(this.facingYaw, cameraRig.yaw + Math.PI, 25, dt);
    } else if (state.horizontalSpeed > 0.5) {
      const target = Math.atan2(motor.velocity.x, motor.velocity.z);
      this.facingYaw = dampAngle(this.facingYaw, target, PLAYER_CONFIG.movement.turnSpeed, dt);
    }

    const eyeTarget = motor.crouched ? PLAYER_CONFIG.eyeHeight.crouching : PLAYER_CONFIG.eyeHeight.standing;
    this.eyeHeight = damp(this.eyeHeight, eyeTarget, 12, dt);

    // Smooth small step-ups visually; the physics position stays exact.
    const dy = p.y - this.visualY;
    this.visualY = motor.grounded && dy > 0 && dy < 0.5 ? damp(this.visualY, p.y, 22, dt) : p.y;

    this.animator.update(dt, {
      speed: state.horizontalSpeed,
      grounded: motor.grounded,
      vy: motor.velocity.y,
      crouched: motor.crouched,
      aiming: this.aiming,
      pitch: cameraRig.pitch,
    });
    this._syncModel();

    this.status = !motor.grounded ? 'air' : motor.crouched ? 'crouch' : state.sprinting ? 'sprint' : state.moving ? 'walk' : 'idle';

    if (this.queries.isOutOfBounds(p.x, p.y, p.z)) this.eliminate('outOfBounds');
  }

  _syncModel() {
    const root = this.model.root;
    root.position.set(this.motor.position.x, this.visualY, this.motor.position.z);
    root.rotation.y = this.facingYaw;
  }

  _footstep(runT) {
    if (!this.audio) return;
    const tag = this.motor.groundCollider?.tag;
    const sound = this.inWater ? 'splash' : tag === 'wood' ? 'stepWood' : tag === 'metal' ? 'stepMetal' : tag === 'stone' ? 'stepStone' : 'stepGrass';
    this.audio.play(sound, { volume: (this.motor.crouched ? 0.2 : 0.35 + 0.25 * runT), pitchVariance: 0.12 });
  }
}
