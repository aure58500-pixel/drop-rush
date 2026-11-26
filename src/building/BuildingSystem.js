// Build mode controller: aim -> candidate -> validation -> preview -> placement.
// Wires BuildingState (logic) to BuildMeshes / BuildDebris (rendering) and audio.
import { BUILD_CONFIG } from '../config/buildConfig.js';
import { BuildingState, BuildReason } from './BuildingState.js';
import { BuildMeshes } from './BuildMeshes.js';
import { BuildDebris } from './BuildDebris.js';
import { resolveTarget } from './BuildTargeting.js';
import { getPieceShape } from './BuildGeometry.js';

export class BuildingSystem {
  constructor({ scene, world, terrain, mapRadius, audio, events, ownerId = 'local', config = BUILD_CONFIG }) {
    this.cfg = config;
    this.world = world;
    this.terrain = terrain;
    this.audio = audio;
    this.events = events;
    this.ownerId = ownerId;

    this.meshes = new BuildMeshes(scene, config);
    this.debris = new BuildDebris(scene, terrain, config);
    this.state = new BuildingState({
      world,
      terrain,
      mapRadius,
      config,
      hooks: {
        onAdded: (b, opts) => this.meshes.add(b, opts),
        onRemoved: (b) => this.meshes.remove(b),
        onDamaged: (b) => this.meshes.refreshColor(b),
        onDestroyed: (b) => this._onDestroyed(b),
      },
    });

    this.active = false;
    this.pieceIndex = 0;
    this.rotation = 0;
    this.candidate = null;
    this.ghost = { valid: false, reason: BuildReason.NO_TARGET };
    this.cooldown = 0;
    this.others = []; // other players' capsules (multiplayer): {x, y, z, radius, height}
  }

  get pieceType() {
    return this.cfg.pieceOrder[this.pieceIndex];
  }

  get count() {
    return this.state.count;
  }

  setActive(active) {
    if (active === this.active) return;
    this.active = active;
    if (!active) {
      this.meshes.hideGhost();
      this.candidate = null;
    }
    this.events?.emit('build:mode', { active });
  }

  toggle() {
    this.setActive(!this.active);
  }

  selectPiece(index) {
    const n = this.cfg.pieceOrder.length;
    if (index < 0 || index >= n || index === this.pieceIndex) return;
    this.pieceIndex = index;
    this.audio?.play('hover', { volume: 0.5 });
  }

  cyclePiece(step) {
    const n = this.cfg.pieceOrder.length;
    this.pieceIndex = (this.pieceIndex + step + n) % n;
    this.audio?.play('hover', { volume: 0.5 });
  }

  rotate() {
    this.rotation = (this.rotation + 1) % 4;
    this.audio?.play('hover', { volume: 0.5 });
  }

  /**
   * @param {number} dt
   * @param {{cam:{x,y,z}, forward:{x,y,z}, yaw:number, player:{x,y,z,radius,height}, eyeHeight:number}} view
   */
  update(dt, view) {
    this.meshes.update(dt);
    this.debris.update(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.active || !view) return;

    const { cam, forward: f, player: p } = view;
    const eye = { x: p.x, y: p.y + view.eyeHeight, z: p.z };
    const camToEye = Math.hypot(cam.x - eye.x, cam.y - eye.y, cam.z - eye.z);
    const maxDist = camToEye + this.cfg.reach;
    const hit = this.world.raycast(cam.x, cam.y, cam.z, f.x, f.y, f.z, maxDist);
    const aimDist = camToEye + this.cfg.reach * 0.6;
    const aimPoint = { x: cam.x + f.x * aimDist, y: cam.y + f.y * aimDist, z: cam.z + f.z * aimDist };

    const type = this.pieceType;
    this.candidate = resolveTarget({
      type, rotation: this.rotation, hit, aimPoint, yaw: view.yaw, terrain: this.terrain, cfg: this.cfg,
    });
    const result = this.state.validate(this.candidate, { player: p, others: this.others, eye });
    this.ghost = { valid: result.ok, reason: result.reason };
    const shape = this.candidate ? (result.shape || getPieceShape(this.candidate, this.cfg)) : null;
    this.meshes.showGhost(type, shape, result.ok);
  }

  // Places the previewed piece. Returns { ok, reason }.
  tryPlace() {
    if (!this.active) return { ok: false, reason: null };
    if (this.cooldown > 0) return { ok: false, reason: null };
    if (!this.candidate || !this.ghost.valid) {
      this.audio?.play('buildFail', { volume: 0.6 });
      return { ok: false, reason: this.ghost.reason };
    }
    const rec = this.state.createRecord(this.candidate, this.ownerId);
    const b = this.state.add(rec);
    if (!b) return { ok: false, reason: BuildReason.OCCUPIED };
    this.cooldown = this.cfg.repeatDelay;
    this.audio?.play('buildPlace', { volume: 0.8, pitchVariance: 0.06 });
    this.events?.emit('build:placed', { record: this.state.toRecord(b), id: b.id });
    return { ok: true, reason: null, build: b };
  }

  // Remote or replayed build (network layer, later).
  addRecord(rec, opts) {
    return this.state.add(rec, opts);
  }

  removeBuild(id) {
    return this.state.remove(id);
  }

  damageBuild(id, amount) {
    return this.state.damage(id, amount);
  }

  damageFromHit(hit, amount) {
    return this.state.damageFromHit(hit, amount);
  }

  explode(x, y, z, radius, damage) {
    return this.state.explode(x, y, z, radius, damage);
  }

  clear() {
    this.state.clear();
  }

  dispose() {
    this.setActive(false);
    this.meshes.dispose();
    this.debris.dispose();
  }

  _onDestroyed(b) {
    const s = b.shape;
    this.debris.burst(s.x, s.y, s.z, this.cfg.pieces[b.type].color, Math.max(s.hx, s.hz));
    this.audio?.play('buildBreak', { volume: 0.9, pitchVariance: 0.1 });
    this.events?.emit('build:destroyed', { id: b.id });
  }

  // Data for the build bar.
  getUiState() {
    return {
      active: this.active,
      pieceIndex: this.pieceIndex,
      pieces: this.cfg.pieceOrder.map((id) => ({ id, name: this.cfg.pieces[id].name })),
      rotation: this.rotation,
      valid: this.ghost.valid,
      reason: this.ghost.reason,
      count: this.state.count,
      max: this.cfg.maxBuilds,
    };
  }
}
