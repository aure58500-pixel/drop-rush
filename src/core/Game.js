// Game orchestrator: owns systems, game states (menu / playing / paused),
// the main loop and the wiring between gameplay, rendering and UI.
import { GAME_CONFIG } from '../config/gameConfig.js';
import { loadMapDefinition } from '../config/maps/index.js';
import { QUALITY_PRESETS } from '../config/graphicsConfig.js';
import { TOUCH_SETTINGS } from '../config/controlsConfig.js';
import { PLAYER_CONFIG } from '../config/playerConfig.js';
import { Engine } from './Engine.js';
import { GameLoop } from './GameLoop.js';
import { EventBus } from './EventBus.js';
import { Settings } from './Settings.js';
import { Profile } from './Profile.js';
import { QualityManager } from './QualityManager.js';
import { Input } from './input/Input.js';
import { TouchControls } from './input/TouchControls.js';
import { initKeyLabels, isTouchDevice } from './input/keyLabels.js';
import { CollisionWorld } from './physics/CollisionWorld.js';
import { GameMap } from '../map/GameMap.js';
import { LocalPlayer } from '../player/LocalPlayer.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { AudioManager } from '../audio/AudioManager.js';
import { MainMenu } from '../ui/MainMenu.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { HUD } from '../ui/HUD.js';
import { BuildBar } from '../ui/BuildBar.js';
import { BuildingSystem } from '../building/BuildingSystem.js';
import { BUILD_CONFIG } from '../config/buildConfig.js';
import { computeMenuFraming } from '../ui/menuFraming.js';
import { CombatHUD } from '../ui/CombatHUD.js';
import { COMBAT_CONFIG } from '../config/combatConfig.js';
import { WEAPONS } from '../config/weapons.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { TargetRegistry } from '../combat/TargetRegistry.js';
import { CombatEffects } from '../combat/CombatEffects.js';
import { TrainingDummies } from '../combat/TrainingDummies.js';
import { PlayerCombat } from '../combat/PlayerCombat.js';
import { LootSystem } from '../loot/LootSystem.js';
import { LootMeshes } from '../loot/LootMeshes.js';
import * as THREE from 'three';

export const GameState = Object.freeze({ MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused' });

export class Game {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.state = GameState.MENU;
    this.events = new EventBus();
    this.menuOrbit = 0;
    this.respawnTimer = 0;
    this.crouchToggled = false;
  }

  async init(onProgress = () => {}) {
    onProgress(0.05, 'Initialisation…');
    await initKeyLabels();
    this.isTouch = isTouchDevice();
    document.body.classList.toggle('is-touch', this.isTouch);

    this.settings = new Settings(this.events);
    this.profile = new Profile();
    this.engine = new Engine(this.canvas, { antialias: !this.isTouch });
    this.input = new Input(this.canvas);
    this.audio = new AudioManager(this.settings.get('volume'));

    onProgress(0.2, 'Chargement de la carte…');
    await this.loadMap(GAME_CONFIG.defaultMapId);
    onProgress(0.75, 'Préparation du personnage…');

    this.player = new LocalPlayer({
      world: this.world,
      queries: this.map.queries,
      scene: this.engine.scene,
      skinId: this.profile.skinId,
      audio: this.audio,
      events: this.events,
    });
    this.cameraRig = new ThirdPersonCamera(this.engine.camera, this.world);
    this.building = new BuildingSystem({
      scene: this.engine.scene,
      world: this.world,
      terrain: this.map.layout.terrain,
      mapSize: this.map.layout.size,
      audio: this.audio,
      events: this.events,
    });
    this.createCombat();
    this.spawnPlayer();

    this.quality = new QualityManager({
      settings: this.settings,
      isTouch: this.isTouch,
      apply: (preset) => this.applyQuality(preset),
    });
    this.quality.refresh();

    this.createUI();
    this.bindEvents();

    onProgress(1, 'Prêt !');
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.engine.render(),
      maxDeltaTime: GAME_CONFIG.maxDeltaTime,
    });
    this.loop.start();
  }

  async loadMap(id) {
    const def = await loadMapDefinition(id);
    this.world = new CollisionWorld({ cellSize: 8 });
    this.map = new GameMap(def, { scene: this.engine.scene, world: this.world, killHeight: GAME_CONFIG.killHeight });
  }

  // Combat: targets, hit resolution, effects, loot and training targets.
  createCombat() {
    const terrain = this.map.layout.terrain;
    const scene = this.engine.scene;
    this.targets = new TargetRegistry();
    this.targets.add(this.player.target);
    this.effects = new CombatEffects(scene, terrain);
    this.effects.onShake = (center, radius) => {
      const p = this.player.position;
      const d = Math.hypot(center.x - p.x, center.y - p.y, center.z - p.z);
      if (d < radius * 4) this.cameraRig.addRecoil((Math.random() - 0.3) * 3 * (1 - d / (radius * 4)));
    };
    this.combat = new CombatSystem({
      world: this.world,
      targets: this.targets,
      building: this.building,
      mapHalf: this.map.layout.size / 2,
      hooks: {
        onTracer: (from, to) => this.effects.tracer(from, to),
        onImpact: (point, normal, surface) => this.onImpact(point, normal, surface),
        onTargetHit: (target, result, info) => this.onTargetHit(target, result, info),
        onExplosion: (center, radius) => {
          this.effects.explosion(center, radius);
          this.audio.play('explosion', { volume: 1, position: center });
        },
        onProjectileSpawn: (proj) => this.effects.projectileSpawned(proj),
        onProjectileEnd: (proj) => this.effects.projectileEnded(proj),
        onArrowStuck: (point, dir, attach) => {
          this.effects.arrowStuck(point, dir, attach);
          this.audio.play('impactWood', { volume: 0.6, position: point });
        },
        onShot: ({ weapon, muzzle, dir }) => {
          this.effects.muzzleFlash(muzzle, dir, 0.8);
          this.audio.play(`shot:${weapon.id}`, { volume: 0.6, position: muzzle });
        },
      },
    });
    this.lootMeshes = new LootMeshes(scene);
    this.loot = new LootSystem({
      hooks: {
        onAdded: (item) => this.lootMeshes.add(item),
        onRemoved: (item) => this.lootMeshes.remove(item),
      },
    });
    const training = this.map.def.training || {};
    for (const def of training.loot || []) this.loot.addSpawn(def, terrain.getHeight(def.x, def.z));
    this.dummies = new TrainingDummies(training.dummies, {
      scene, world: this.world, terrain, targets: this.targets, combat: this.combat, audio: this.audio,
    });
    this._projector = new THREE.Vector3();
  }

  onImpact(point, normal, surface) {
    this.effects.impact(point, normal, surface);
    const sound = surface === 'metal' ? 'impactMetal' : surface === 'wood' || surface === 'build' ? 'impactWood'
      : surface === 'terrain' ? 'impactDirt' : surface === 'flesh' ? 'impactFlesh' : 'impactStone';
    this.audio.play(sound, { volume: 0.45, pitchVariance: 0.15, position: point });
  }

  onTargetHit(target, result, info) {
    const mine = info.ownerId === this.player.target.id;
    if (mine && result.total > 0) {
      this.combatHud.hitmarker({ headshot: info.headshot, kill: result.died });
      this.audio.play(result.died ? 'kill' : info.headshot ? 'headshot' : 'hitmarker', { volume: result.died ? 0.8 : 0.55 });
      if (result.shieldBroken) this.audio.play('shieldBreak', { volume: 0.5 });
      const v = this._projector.set(info.point.x, info.point.y + 0.3, info.point.z).project(this.engine.camera);
      if (v.z < 1) {
        const { width, height } = this.engine.viewSize;
        this.combatHud.damageNumber((v.x + 1) / 2 * width, (1 - v.y) / 2 * height, result.total, {
          headshot: info.headshot, shield: result.shieldDamage > 0 && result.healthDamage === 0,
        });
      }
    }
    if (result.died && target !== this.player.target) {
      const killer = mine ? 'Vous' : 'Tourelle';
      const weaponName = info.weapon?.name || '';
      this.combatHud.killfeed(`<b>${killer}</b> <i>${weaponName}${info.headshot ? ' · tête' : ''}</i> <b>${target.name || 'Cible'}</b>`);
    }
  }

  resetTraining() {
    this.building.setActive(false);
    this.building.clear();
    this.combat.clear();
    this.effects.clear();
    this.loot.reset();
    this.dummies.reset();
    this.combatHud?.clearTransient();
  }

  spawnPlayer({ keepItems = false } = {}) {
    const spawn = this.map.spawnPoints[0];
    this.player.spawn(spawn, { keepItems });
    this.cameraRig.yaw = spawn.yaw;
    this.cameraRig.pitch = -0.12;
    this.cameraRig.snap();
    this.crouchToggled = false;
  }

  applyQuality(preset) {
    this.engine.setPixelRatioCap(preset.pixelRatio);
    this.engine.setViewDistance(preset.viewDistance);
    this.map.applyQuality(preset);
  }

  createUI() {
    const fullscreen = () => this.toggleFullscreen();
    this.mainMenu = new MainMenu(this.uiRoot, {
      profile: this.profile,
      settings: this.settings,
      isTouch: this.isTouch,
      onPlay: () => this.startTraining(),
      onSkinChange: (id) => this.player.setSkin(id),
      onFullscreen: fullscreen,
      onUiSound: () => {
        this.audio.unlock();
        this.audio.play('click', { volume: 0.4 });
      },
    });
    this.hud = new HUD(this.uiRoot, { isTouch: this.isTouch });
    this.pauseMenu = new PauseMenu(this.uiRoot, {
      settings: this.settings,
      isTouch: this.isTouch,
      onResume: () => this.resume(),
      onQuit: () => this.quitToMenu(),
      onFullscreen: fullscreen,
    });
    this.combatHud = new CombatHUD(this.uiRoot, {
      isTouch: this.isTouch,
      onSlot: (i) => this.playerCombat.selectSlot(i),
      onConsumable: (id) => this.playerCombat.useConsumable(id),
      onPickup: () => this.playerCombat.pickup(),
    });
    this.playerCombat = new PlayerCombat({
      player: this.player,
      combat: this.combat,
      targets: this.targets,
      loot: this.loot,
      world: this.world,
      effects: this.effects,
      audio: this.audio,
      hud: this.combatHud,
      events: this.events,
    });
    this.buildBar = new BuildBar(this.uiRoot, {
      isTouch: this.isTouch,
      pieces: BUILD_CONFIG.pieceOrder.map((id) => ({ id, name: BUILD_CONFIG.pieces[id].name })),
      onSelect: (index) => this.building.selectPiece(index),
    });
    if (this.isTouch) {
      this.touch = new TouchControls(this.uiRoot, this.input, { onPause: () => this.pause() });
    }
  }

  bindEvents() {
    this.events.on('settings:changed', ({ key, value }) => {
      if (key === 'volume') this.audio.setVolume(value);
      if (key === 'quality') this.quality.refresh();
    });
    this.events.on('build:mode', ({ active }) => {
      this.buildBar.setVisible(active && this.state === GameState.PLAYING);
      this.touch?.setBuildMode(active);
      this.combatHud.setBuildMode(active);
    });
    this.events.on('build:destroyed', ({ id }) => this.effects.removeArrowsOnBuild(id));
    this.events.on('player:damaged', ({ amount, result, info }) => {
      this.combatHud.hurt(Math.min(0.6, 0.15 + amount / 60));
      this.audio.play(result.shieldDamage > 0 && result.healthDamage === 0 ? 'impactMetal' : 'hurt', { volume: 0.6 });
      if (result.shieldBroken) this.audio.play('shieldBreak', { volume: 0.7 });
      const src = info.source;
      if (src) {
        const p = this.player.position;
        this.combatHud.damageFrom(Math.atan2(-(src.x - p.x), -(src.z - p.z)));
      }
    });
    this.events.on('player:eliminated', ({ reason, by }) => {
      this.building.setActive(false);
      this.respawnTimer = GAME_CONFIG.trainingRespawnDelay;
      this.eliminationText = reason === 'outOfBounds' ? 'Vous êtes sorti de la carte.'
        : by ? `Vous avez été éliminé par ${by}.` : 'Vous avez été éliminé.';
      this.hud.showElimination(this.eliminationText, this.respawnTimer);
    });
    this.input.onPointerLockChange = (locked) => {
      if (this.state === GameState.PLAYING && !locked && !this.isTouch) this.pause();
      if (locked) this.hud.setLockHint(false);
    };
    this.canvas.addEventListener('click', () => {
      if (this.state === GameState.PLAYING && !this.isTouch && !this.input.pointerLocked) {
        this.input.requestPointerLock();
      }
    });
    window.addEventListener('beforeunload', (e) => {
      // Protects against Ctrl+W (crouch + forward on AZERTY) closing the tab mid-game.
      if (this.state !== GameState.MENU) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        // Keyboard Lock (Chrome/Edge, fullscreen only) lets the game receive Ctrl+W etc.
        await navigator.keyboard?.lock?.().catch(() => {});
      } else {
        navigator.keyboard?.unlock?.();
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen refused (iOS Safari on iPhone does not support it).
    }
  }

  startTraining() {
    this.audio.unlock();
    this.mainMenu.hide();
    this.engine.camera.clearViewOffset();
    this.menuFrame = null;
    this.hud.show();
    this.touch?.setVisible(true);
    this.state = GameState.PLAYING;
    this.input.gameActive = true;
    this.input.reset();
    this.resetTraining();
    this.spawnPlayer();
    this.hud.hideElimination();
    this.combatHud.show();
    if (!this.isTouch) {
      this.input.requestPointerLock().then((ok) => this.hud.setLockHint(!ok));
    }
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.building.setActive(false);
    this.input.reset();
    this.touch?.setVisible(false);
    this.pauseMenu.show();
    this.input.exitPointerLock();
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.pauseMenu.hide();
    this.state = GameState.PLAYING;
    this.input.reset();
    this.touch?.setVisible(true);
    if (!this.isTouch) {
      this.input.requestPointerLock().then((ok) => this.hud.setLockHint(!ok));
    }
  }

  quitToMenu() {
    this.pauseMenu.hide();
    this.hud.hide();
    this.hud.hideElimination();
    this.touch?.setVisible(false);
    this.input.exitPointerLock();
    this.input.gameActive = false;
    this.state = GameState.MENU;
    this.resetTraining();
    this.combatHud.hide();
    this.spawnPlayer();
    this.mainMenu.show();
  }

  buildIntent() {
    const move = this.input.getMove();
    let crouch;
    if (this.isTouch) crouch = this.touch.crouch;
    else if (this.settings.get('crouchToggle')) {
      if (this.input.wasPressed('crouch')) this.crouchToggled = !this.crouchToggled;
      crouch = this.crouchToggled;
    } else crouch = this.input.isDown('crouch');
    return {
      moveX: move.x,
      moveY: move.y,
      sprint: this.input.isDown('sprint') || move.analogSprint,
      crouch,
      jumpPressed: this.input.wasPressed('jump'),
      aiming: !this.building.active && !this.suppressAim && (this.isTouch ? this.touch.aim : this.input.isDown('aim')),
    };
  }

  // Build mode input: B toggles, wheel / 1-3 pick the piece, X rotates,
  // left click places (hold to repeat), right click cancels.
  handleBuildInput(dt, wheel) {
    // Returns the wheel steps left for the weapon slots.
    const input = this.input;
    const building = this.building;
    this.wheelCooldown = Math.max(0, (this.wheelCooldown || 0) - dt);
    if (this.suppressAim && !input.isDown('aim')) this.suppressAim = false;

    if (!this.player.alive) {
      building.setActive(false);
      return 0;
    }
    if (input.wasPressed('build')) building.toggle();
    if (!building.active) return wheel;

    if (wheel !== 0 && this.wheelCooldown <= 0) {
      building.cyclePiece(wheel > 0 ? 1 : -1);
      this.wheelCooldown = BUILD_CONFIG.wheelCooldown;
    }
    BUILD_CONFIG.pieceOrder.forEach((_, i) => {
      if (input.wasPressed(`slot${i + 1}`)) building.selectPiece(i);
    });
    if (input.wasPressed('cyclePiece')) building.cyclePiece(1);
    if (input.wasPressed('rotateBuild')) building.rotate();

    if (input.wasPressed('aim') || input.wasPressed('cancelBuild')) {
      building.setActive(false);
      this.suppressAim = input.isDown('aim'); // no zoom while the cancel click is still held
      this.suppressFire = input.isDown('fire');
      return 0;
    }
    // Left click places pieces: shooting is disabled for the whole build mode.
    if (input.wasPressed('fire') || input.isDown('fire')) building.tryPlace();
    return 0;
  }

  update(dt) {
    const input = this.input;
    this.quality.update(dt, this.state === GameState.PLAYING);

    if (this.state === GameState.PLAYING) {
      if (input.wasPressed('pause')) this.pause();
      if (input.wasPressed('toggleHelp')) this.hud.toggleHelp();

      const look = input.consumeLook();
      this.cameraRig.applyLook(look.x, look.y, this.settings.get('mouseSensitivity'), this.settings.get('invertY'));
      this.cameraRig.applyLook(look.touchX, look.touchY, TOUCH_SETTINGS.lookSensitivity, this.settings.get('invertY'));

      const wheel = this.handleBuildInput(dt, input.consumeWheel());
      const intent = this.buildIntent();
      const building = this.building.active;
      // A click that closed the build mode must not also fire.
      if (this.suppressFire && !input.isDown('fire')) this.suppressFire = false;
      if (this.player.alive) {
        this.playerCombat.adjustIntent(intent, input, building);
        this.player.update(dt, intent, this.cameraRig);
      } else {
        this.respawnTimer -= dt;
        this.hud.showElimination(this.eliminationText, this.respawnTimer);
        if (this.respawnTimer <= 0) {
          this.spawnPlayer({ keepItems: true });
          this.hud.hideElimination();
        }
      }
      const p = this.player.position;
      const weapon = this.player.loadout.activeWeapon;
      this.cameraRig.update(dt, p, this.player.eyeHeight, intent.aiming && this.player.alive,
        weapon?.aimFov ?? undefined, COMBAT_CONFIG.recoilRecovery);
      this.player.model.setVisible(this.player.alive && this.cameraRig.distanceToPivot > 0.7);

      if (this.player.alive) {
        this.playerCombat.update(dt, {
          input: this.suppressFire ? this.blockFireInput(input) : input,
          intent,
          building,
          cameraRig: this.cameraRig,
          camera: this.engine.camera,
          wheel,
        });
      }
      this.combat.update(dt);
      this.dummies.update(dt, this.engine.camera, this.player.target);
      this.loot.update(dt);
      this.lootMeshes.setFocus(this.playerCombat.focus?.id ?? null);
      this.combatHud.update(dt, { loadout: this.player.loadout, pickup: this.playerCombat.prompt, camYaw: this.cameraRig.yaw });

      this.building.update(dt, {
        cam: this.cameraRig.position,
        forward: this.cameraRig.forward,
        yaw: this.cameraRig.yaw,
        player: { x: p.x, y: p.y, z: p.z, radius: PLAYER_CONFIG.capsule.radius, height: this.player.motor.height },
        eyeHeight: this.player.eyeHeight,
      });
      if (this.building.active) this.buildBar.update(this.building.getUiState());

      const showPerf = this.settings.get('showFps');
      this.hud.update(dt, {
        player: this.player,
        aiming: intent.aiming,
        boundaryDistance: this.map.queries.distanceToBoundary(p.x, p.z),
        warningDistance: GAME_CONFIG.boundaryWarningDistance,
        spreadPx: building ? null : this.playerCombat.spreadPx,
        crosshair: weapon && !building ? (weapon.pellets > 1 ? 'shotgun' : 'default') : 'default',
        perf: showPerf ? {
          fps: this.quality.fps,
          quality: QUALITY_PRESETS[this.quality.level].label,
          calls: this.engine.drawCalls,
          triangles: this.engine.triangles,
        } : null,
      });
    } else if (this.state === GameState.MENU) {
      this.building.update(dt, null);
      this.updateMenuCamera(dt);
    } else if (this.state === GameState.PAUSED) {
      this.building.update(dt, null);
      input.consumeWheel();
      input.consumeLook();
      if (input.wasPressed('pause') && !this.isTouch) this.resume();
    }

    this.effects.update(dt, WEAPONS.crossbow.projectile.stickSeconds);
    this.lootMeshes.update(dt);
    const cam = this.engine.camera.position;
    this.audio.setListener(cam.x, cam.y, cam.z, this.cameraRig.yaw);
    this.map.update(dt, this.engine.camera, this.player.position);
    input.endFrame();
  }

  // Input view with the fire button released (used right after leaving build mode).
  blockFireInput(input) {
    return {
      isDown: (a) => (a === 'fire' ? false : input.isDown(a)),
      wasPressed: (a) => (a === 'fire' ? false : input.wasPressed(a)),
    };
  }

  // Slow orbit around the idle character behind the main menu.
  updateMenuCamera(dt) {
    this.menuOrbit += dt * 0.12;
    const p = this.player.position;
    this.player.animator.update(dt, { speed: 0, grounded: true, vy: 0, crouched: false, aiming: false, pitch: 0 });
    const cam = this.engine.camera;
    const { width: W, height: H } = this.engine.viewSize;
    const MENU_FOV = 50;

    // Frame the character inside the free area (measured at most twice a second).
    this.menuFrameTimer = (this.menuFrameTimer ?? 0) - dt;
    if (!this.menuFrame || this.menuFrameTimer <= 0 || this.menuFrameSize !== `${W}x${H}`) {
      this.menuFrameTimer = 0.5;
      this.menuFrameSize = `${W}x${H}`;
      this.menuFrameTarget = computeMenuFraming(this.mainMenu.getFreeRect(), W, H, MENU_FOV);
      if (!this.menuFrame) this.menuFrame = { ...this.menuFrameTarget };
    }
    const f = this.menuFrame;
    const t = this.menuFrameTarget;
    const k = 1 - Math.exp(-6 * dt);
    f.distance += (t.distance - f.distance) * k;
    f.shiftX += (t.shiftX - f.shiftX) * k;
    f.shiftY += (t.shiftY - f.shiftY) * k;

    const yaw = this.player.facingYaw + 0.5 + Math.sin(this.menuOrbit) * 0.5;
    const focusY = p.y + 0.95;
    cam.position.set(p.x + Math.sin(yaw) * f.distance, focusY + 0.35, p.z + Math.cos(yaw) * f.distance);
    cam.lookAt(p.x, focusY, p.z);
    if (cam.fov !== MENU_FOV) cam.fov = MENU_FOV;
    // Sliding the render window moves the character on screen without moving the camera.
    cam.setViewOffset(W, H, -f.shiftX, -f.shiftY, W, H);
    cam.updateProjectionMatrix();
    this.player.model.setVisible(true);
  }
}
