// Computes where the menu camera must place the character so it sits inside
// the free screen area (not behind the menu cards). Pure function, no DOM.
const CHARACTER_HEIGHT = 1.9; // meters, including a margin above the head
const CHARACTER_WIDTH = 1.3; // meters, arms included
const MIN_DISTANCE = 2.2;
const MAX_DISTANCE = 7;

/**
 * @param {{x0:number,y0:number,x1:number,y1:number}} free free rectangle in pixels
 * @param {number} width viewport width
 * @param {number} height viewport height
 * @param {number} fovDeg vertical field of view
 * @returns {{distance:number, shiftX:number, shiftY:number, centerX:number, centerY:number, pixelsPerMeter:number}}
 */
export function computeMenuFraming(free, width, height, fovDeg) {
  const freeW = Math.max(60, free.x1 - free.x0);
  const freeH = Math.max(60, free.y1 - free.y0);
  const centerX = (free.x0 + free.x1) / 2;
  const centerY = (free.y0 + free.y1) / 2;
  const pixelsPerMeter = Math.min((0.82 * freeH) / CHARACTER_HEIGHT, (0.9 * freeW) / CHARACTER_WIDTH);
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  const distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, height / (2 * tan * pixelsPerMeter)));
  return {
    distance,
    shiftX: centerX - width / 2,
    shiftY: centerY - height / 2,
    centerX,
    centerY,
    pixelsPerMeter: height / (2 * tan * distance),
  };
}
