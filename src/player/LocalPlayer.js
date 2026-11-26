// The locally controlled character: input intent -> controller -> motor,
// plus model orientation, animation, footsteps, vitals, the held weapon and
// out-of-map detection.
import { PLAYER_CONFIG } from '../config/playerConfig.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { getSkin } from '../config/skins.js';
import { damp, dampAngle } from '../core/utils/math.js';
import { CharacterMotor } from './CharacterMotor.js';
import { PlayerController } from './PlayerController.js';
import { CharacterModel } from './CharacterModel.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { PlayerLoadout } from './PlayerLoadout.js';
import { createWeaponMesh } from '../weapons/WeaponModels.js';
import { TrampolineRule } from './Trampoline.js';

export const LOCAL_PLAYER_ID = 'local';

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
    this.loadout = new PlayerLoadout();
    this.trampoline = new TrampolineRule(PLAYER_CONFIG.movement.gravity);
    this.weaponMeshes = new Map();

    this.alive = true;
    this.aiming = false;
    this.stanceTimer = 0;
    this.recoil = 0;
    this.facingYaw = 0;
    this.visualY = 0;
    this.eyeHeight = PLAYER_CONFIG.eyeHeight.standing;
    this.inWater = false;
    this.status = 'idle';
    this.killedBy = null;

    // Hit target used by the combat system (training turrets, later other players).
    this.target = {
      id: LOCAL_PLAYER_ID,
      kind: 'player',
      x: 0, y: 0, z: 0,
      radius: PLAYER_CONFIG.capsule.radius,
      height: PLAYER_CONFIG.capsule.standingHeight,
      headRadius: 0.16,
      alive: true,
      applyDamage: (amount, info) => this.applyDamage(amount, info),
    };
  }

  get position() {
    return this.motor.position;
  }

  // Moves the character to another map (new collision world and rules).
  setWorld(world, queries) {
    this.world = world;
    this.queries = queries;
    this.motor.world = world;
  }

  get health() {
    return this.loadout.health;
  }

  setSkin(skinId) {
    this.model.setSkin(getSkin(skinId));
  }

  spawn(point, { keepItems = false } = {}) {
    this.motor.teleport(point.x, point.y + 0.05, point.z);
    this.facingYaw = point.yaw + Math.PI;
    this.visualY = point.y;
    this.loadout.reset({ keepItems });
    this.alive = true;
    this.target.alive = true;
    this.killedBy = null;
    this.stanceTimer = 0;
    this.model.setVisible(true);
    this._syncModel();
  }

  applyDamage(amount, info = {}) {
    if (!this.alive) return { total: 0, died: false };
    const r = this.loadout.health.applyDamage(amount);
    if (r.total > 0) {
      this.loadout.use.cancel();
      this.events.emit('player:damaged', { amount: r.total, result: r, info });
    }
    if (r.died) {
      this.killedBy = info.ownerName || info.weapon?.name || null;
      this.eliminate('killed');
    }
    return r;
  }

  eliminate(reason) {
    if (!this.alive) return;
    this.alive = false;
    this.target.alive = false;
    this.loadout.health.health = 0;
    this.model.setVisible(false);
    this.motor.velocity.x = 0;
    this.motor.velocity.z = 0;
    this.events.emit('player:eliminated', { reason, by: this.killedBy });
  }

  // Called after a shot: face the aim direction for a moment and kick the arms.
  onShot() {
    this.stanceTimer = COMBAT_CONFIG.combatStanceTime;
    this.recoil = 1;
  }

  // World position of the muzzle of the held weapon.
  getMuzzle(out) {
    const mesh = this.model.weaponMesh;
    if (!mesh) {
      out.set(this.motor.position.x, this.motor.position.y + this.eyeHeight, this.motor.position.z);
      return out;
    }
    this.model.root.updateMatrixWorld(true);
    return out.copy(mesh.userData.muzzle).applyMatrix4(mesh.matrixWorld);
  }

  _syncWeaponMesh() {
    const item = this.loadout.activeItem;
    if (!item) {
      this.model.setWeaponMesh(null);
      return;
    }
    let mesh = this.weaponMeshes.get(item.id);
    if (!mesh) {
      mesh = createWeaponMesh(item.id);
      this.weaponMeshes.set(item.id, mesh);
    }
    this.model.setWeaponMesh(mesh);
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
    this.inWater = this.queries.isInWater(p.x, p.y, p.z);
    const wasGrounded = motor.grounded;
    const state = this.controller.update(dt, { ...intent, yaw: cameraRig.yaw }, motor, speedMultiplier);
    if (this.trampoline.update(dt, motor, this.controller, cameraRig.yaw)) {
      this.audio?.play('jump', { volume: 0.8, pitch: 0.7 });
      this.events.emit('player:trampoline', {});
    }

    if (state.jumped) this.audio?.play('jump', { volume: 0.5, pitchVariance: 0.08 });
    if (motor.landedThisFrame && !wasGrounded) {
      this.animator.land(motor.landingSpeed);
      if (motor.landingSpeed > 3) this.audio?.play(this.inWater ? 'splash' : 'land', { volume: Math.min(1, motor.landingSpeed / 12) });
    }

    this.stanceTimer = Math.max(0, this.stanceTimer - dt);
    this.recoil = Math.max(0, this.recoil - dt * 9);
    const stance = this.aiming || this.stanceTimer > 0;

    // Facing: camera direction when aiming or shooting, else movement direction.
    if (stance) {
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

    this._syncWeaponMesh();
    const weapon = this.loadout.activeWeapon;
    const wc = this.loadout.weapon;
    this.animator.update(dt, {
      speed: state.horizontalSpeed,
      grounded: motor.grounded,
      vy: motor.velocity.y,
      crouched: motor.crouched,
      aiming: this.aiming,
      pitch: cameraRig.pitch,
      hold: weapon ? weapon.hold : null,
      stance: this.stanceTimer > 0,
      reload: wc.reloading ? wc.reloadProgress : -1,
      recoil: this.recoil,
      sprinting: state.sprinting,
    });
    this._syncModel();

    this.status = !motor.grounded ? 'air' : motor.crouched ? 'crouch' : state.sprinting ? 'sprint' : state.moving ? 'walk' : 'idle';

    if (this.queries.isOutOfBounds(p.x, p.y, p.z)) this.eliminate('outOfBounds');
  }

  _syncModel() {
    const root = this.model.root;
    root.position.set(this.motor.position.x, this.visualY, this.motor.position.z);
    root.rotation.y = this.facingYaw;
    const t = this.target;
    t.x = this.motor.position.x;
    t.y = this.motor.position.y;
    t.z = this.motor.position.z;
    t.height = this.motor.height;
  }

  _footstep(runT) {
    if (!this.audio) return;
    const tag = this.motor.groundCollider?.tag;
    const sound = this.inWater ? 'splash' : tag === 'wood' ? 'stepWood' : tag === 'metal' ? 'stepMetal' : tag === 'stone' ? 'stepStone' : 'stepGrass';
    this.audio.play(sound, { volume: (this.motor.crouched ? 0.2 : 0.35 + 0.25 * runT), pitchVariance: 0.12 });
  }
}
