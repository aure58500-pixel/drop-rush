// Builder for the chibi characters (pure JavaScript, no Three.js).
// A skin is a list of parts (see core/geometry/PartBuilder.js) each attached to
// a joint with `j`. Parts are merged per joint into vertex-colored triangles,
// so a character costs one draw call per joint and the triangle count is exact.
import { createAccumulator, emitPart, finalizeAccumulator, flattenParts as flattenAny } from '../core/geometry/PartBuilder.js';

// Skeleton shared by every skin (meters, rest pose, feet at y = 0, facing +Z).
export const JOINT_LAYOUT = {
  hips: { parent: null, pos: [0, 0.55, 0] },
  spine: { parent: 'hips', pos: [0, 0.05, 0] },
  neck: { parent: 'spine', pos: [0, 0.44, 0] },
  armL: { parent: 'spine', pos: [0.27, 0.36, 0] },
  armR: { parent: 'spine', pos: [-0.27, 0.36, 0] },
  elbowL: { parent: 'armL', pos: [0, -0.17, 0] },
  elbowR: { parent: 'armR', pos: [0, -0.17, 0] },
  legL: { parent: 'hips', pos: [0.1, -0.03, 0] },
  legR: { parent: 'hips', pos: [-0.1, -0.03, 0] },
  kneeL: { parent: 'legL', pos: [0, -0.2, 0] },
  kneeR: { parent: 'legR', pos: [0, -0.2, 0] },
  ankleL: { parent: 'kneeL', pos: [0, -0.205, 0] },
  ankleR: { parent: 'kneeR', pos: [0, -0.205, 0] },
};
export const JOINT_NAMES = Object.keys(JOINT_LAYOUT);

// Weapon socket in the right hand (child of elbowR).
export const HAND_SOCKET = { parent: 'elbowR', pos: [0, -0.2, 0.03] };

// Leg chain used by the animator to keep the feet on the ground when crouching.
export const LEG_DIMS = { offset: 0.03, thigh: 0.2, shin: 0.205, foot: 0.115 };

// Rest-pose world position of a joint (no rotation in the rest pose).
export function jointRestPosition(name) {
  const out = [0, 0, 0];
  for (let j = JOINT_LAYOUT[name]; j; j = JOINT_LAYOUT[j.parent]) {
    out[0] += j.pos[0];
    out[1] += j.pos[1];
    out[2] += j.pos[2];
  }
  return out;
}

export function flattenParts(skin) {
  return flattenAny(skin.parts);
}

/**
 * @returns {{joints: Object<string, {positions:Float32Array, normals:Float32Array, colors:Float32Array, triangles:number}>, triangles:number}}
 */
export function buildCharacterGeometry(skin) {
  const acc = {};
  for (const name of JOINT_NAMES) acc[name] = createAccumulator();
  for (const part of flattenParts(skin)) {
    if (!acc[part.j]) throw new Error(`Unknown joint "${part.j}" in skin ${skin.id}`);
    emitPart(part, acc[part.j]);
  }
  const joints = {};
  let triangles = 0;
  for (const [name, a] of Object.entries(acc)) {
    joints[name] = finalizeAccumulator(a);
    triangles += joints[name].triangles;
  }
  return { joints, triangles };
}
