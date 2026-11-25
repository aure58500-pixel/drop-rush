// Third-person camera parameters. Angles in degrees unless suffixed by Rad.
export const CAMERA_CONFIG = {
  fov: 75, // vertical field of view
  aimFov: 60,
  aimTransitionSpeed: 12, // 1/s
  near: 0.1,
  distance: 3.4, // meters behind the pivot
  aimDistance: 1.9,
  shoulderOffset: 0.55, // meters to the right
  aimShoulderOffset: 0.65,
  minPitchRad: -1.35,
  maxPitchRad: 1.2,
  collisionMargin: 0.3, // keep the camera this far from walls
  minDistance: 0.35,
  zoomOutSpeed: 5, // 1/s, recovery after a collision
  pivotVerticalSmoothing: 16, // 1/s, smooths stairs and crouch
  hideCharacterDistance: 0.7, // hide own model when the camera is that close
};
