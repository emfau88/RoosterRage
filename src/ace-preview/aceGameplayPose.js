export const ACE_GAMEPLAY_WALK_PERIOD_MS = 520;
export const ACE_GAMEPLAY_IDLE_PERIOD_MS = 2800;
export const ACE_GAMEPLAY_DIRECTIONS = ['south', 'west', 'north', 'east'];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const part = (key, x, y, originX, originY, scaleX, scaleY, rotation = 0, alpha = 1) =>
  ({ key, x, y, originX, originY, scaleX, scaleY, rotation, alpha });
const FOOTPRINT_ANCHOR = { x: 128, y: 235 };
const DIRECTION_FOOTPRINT_SCALE = { south: 0.995, west: 1.054, north: 1.069, east: 1.054 };

function normalizeFootprint(pose, direction) {
  const scale = DIRECTION_FOOTPRINT_SCALE[direction];
  return {
    shadow: {
      ...pose.shadow,
      x: FOOTPRINT_ANCHOR.x + (pose.shadow.x - FOOTPRINT_ANCHOR.x) * scale,
      y: FOOTPRINT_ANCHOR.y + (pose.shadow.y - FOOTPRINT_ANCHOR.y) * scale,
      width: pose.shadow.width * scale,
      height: pose.shadow.height * scale,
    },
    parts: pose.parts.map((item) => ({
      ...item,
      x: FOOTPRINT_ANCHOR.x + (item.x - FOOTPRINT_ANCHOR.x) * scale,
      y: FOOTPRINT_ANCHOR.y + (item.y - FOOTPRINT_ANCHOR.y) * scale,
      scaleX: item.scaleX * scale,
      scaleY: item.scaleY * scale,
    })),
  };
}

function cycle(a) {
  return {
    contact: Math.cos(a),
    passing: (1 - Math.cos(a * 2)) / 2,
    transfer: Math.sin(a),
  };
}

function southPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 + contact * 2.35 * move;
  const bodyY = 119 - passing * 8 * move + breathe * 4;
  const leftLift = Math.max(0, -transfer) * 8 * move;
  const rightLift = Math.max(0, transfer) * 8 * move;
  const bodyScaleX = 0.345 * (1 + breathe * 0.006);
  const bodyScaleY = 0.305 * (1 - breathe * 0.004);
  const bodyRotation = contact * 0.022 * move + Math.sin(idle) * 0.004 * (1 - move);
  const parts = [
    part('south/foot-left', 108 - contact * 1.8 * move, 190 + contact * 8 * move - leftLift,
      0.52, 0.18, 0.235, 0.225, -0.035 + contact * 0.075 * move),
    part('south/foot-right', 148 + contact * 1.8 * move, 190 - contact * 8 * move - rightLift,
      0.52, 0.18, 0.235, 0.225, 0.035 - contact * 0.075 * move),
    part('south/body', bodyX, bodyY, 0.5, 0.5, bodyScaleX, bodyScaleY, bodyRotation),
  ];
  for (const side of [-1, 1]) {
    const counter = -side * contact;
    const idleLag = Math.sin(idle - side * 0.32) * (1 - move);
    parts.push(part('south/arm-fist-left-v1',
      bodyX + side * 58,
      bodyY + 8 + counter * 2.5 * move - breathe * 1.25,
      0.5, 0.09, side < 0 ? 0.074 : -0.074, 0.074,
      side * -0.075 + counter * 0.12 * move + side * idleLag * 0.03));
  }
  // Arms sit in front of the chest. Only the exact original pauldron pixels
  // return above them, preserving a clean shoulder attachment.
  parts.push(part('south/shoulder-overlays-v1', bodyX, bodyY, 0.5, 0.5,
    bodyScaleX, bodyScaleY, bodyRotation));
  return { parts, shadow: { x: 128, y: 238, width: 116 - passing * 4, height: 20 } };
}

function westPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 126 - contact * 1.8 * move;
  const bodyY = 119 - passing * 8 * move + breathe * 4;
  // Side-on feet need a wider arc than the front/back views: at the runtime
  // scale a small fore/aft offset collapses into a single orange shape.
  const nearLift = Math.max(0, transfer) * 15 * move;
  const farLift = Math.max(0, -transfer) * 15 * move;
  const delayedTail = Math.cos(a - 0.55);
  const bodyScaleX = 0.35 * (1 + breathe * 0.006);
  const bodyScaleY = 0.305 * (1 - breathe * 0.004);
  const bodyRotation = -0.022 - contact * 0.026 * move + Math.sin(idle) * 0.004 * (1 - move);
  return {
    parts: [
      part('west/tail', bodyX + 40, bodyY + 47 + passing * 2.3 * move - breathe * 1.6,
        0.18, 0.52, 0.245, 0.235,
        0.045 + delayedTail * 0.085 * move + Math.sin(idle - 0.6) * 0.035 * (1 - move)),
      part('west/foot-far', 128 + contact * 17, 190 - farLift,
        0.55, 0.18, 0.205, 0.195, -0.045 + contact * 0.12 * move),
      part('west/wing-far', bodyX + 12, bodyY + 19 + contact * 2.2 * move - breathe * 1.25,
        0.48, 0.16, 0.185, 0.18,
        -0.03 - contact * 0.13 * move + Math.sin(idle - 0.35) * 0.028 * (1 - move)),
      part('west/body', bodyX, bodyY, 0.5, 0.5,
        bodyScaleX, bodyScaleY, bodyRotation),
      part('west/foot-near', 128 - contact * 17, 191 - nearLift,
        0.55, 0.18, 0.215, 0.205, -0.045 - contact * 0.14 * move),
      // The pauldron and fist share one foreground part. Drawing it after the
      // torso makes the armor cap sit over the upper arm instead of inside it.
      part('west/arm-fist-near-v2', bodyX + 30,
        bodyY + 8 - contact * 2.4 * move - breathe * 1.2,
        0.76, 0.10, 0.075, 0.075,
        -0.08 + contact * 0.13 * move + Math.sin(idle - 0.5) * 0.026 * (1 - move)),
      part('west/shoulder-near-overlay-v1', bodyX, bodyY, 0.5, 0.5,
        bodyScaleX, bodyScaleY, bodyRotation),
    ],
    shadow: { x: 128, y: 237, width: 122 - passing * 4, height: 19 },
  };
}

function northPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - contact * 2.2 * move;
  const bodyY = 118 - passing * 8 * move + breathe * 4;
  const leftLift = Math.max(0, -transfer) * 8 * move;
  const rightLift = Math.max(0, transfer) * 8 * move;
  const parts = [
    part('north/leg-left', 104 - contact * 1.5 * move, 235 + contact * 7 * move - leftLift,
      0.5, 1, 0.13, 0.125, 0.018 + contact * 0.055 * move),
    part('north/leg-right', 152 + contact * 1.5 * move, 235 - contact * 7 * move - rightLift,
      0.5, 1, 0.13, 0.125, -0.018 - contact * 0.055 * move),
  ];
  for (const side of [-1, 1]) {
    const counter = side * contact;
    parts.push(part('north/arm-fist-left-v1',
      bodyX + side * 58,
      bodyY + 10 + counter * 2.5 * move - breathe * 1.2,
      0.5, 0.09, side < 0 ? 0.072 : -0.072, 0.072,
      side * -0.07 + counter * 0.12 * move + side * Math.sin(idle - 0.4) * 0.028 * (1 - move)));
  }
  // Rear-view armor belongs above the upper arms; the fists remain visible at
  // the sides while the torso covers their attachment seam.
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.345 * (1 + breathe * 0.006), 0.305 * (1 - breathe * 0.004),
    -contact * 0.02 * move + Math.sin(idle) * 0.004 * (1 - move)));
  parts.push(part('north/tail', bodyX, bodyY + 52 + passing * 2.2 * move - breathe * 1.5,
    0.5, 0.18, 0.245, 0.235,
    Math.cos(a - 0.55) * 0.075 * move + Math.sin(idle - 0.6) * 0.035 * (1 - move)));
  return { parts, shadow: { x: 128, y: 238, width: 114 - passing * 4, height: 19 } };
}

function mirrorWest(pose) {
  return {
    shadow: { ...pose.shadow, x: 256 - pose.shadow.x },
    parts: pose.parts.map((item) => ({
      ...item,
      x: 256 - item.x,
      scaleX: -item.scaleX,
      rotation: -item.rotation,
    })),
  };
}

export function sampleAceGameplayPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / ACE_GAMEPLAY_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'west') return { direction, assetDirection: 'west', ...normalizeFootprint(westPose(a, move, idle), direction) };
  if (direction === 'east') return { direction, assetDirection: 'west', ...normalizeFootprint(mirrorWest(westPose(a, move, idle)), direction) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...normalizeFootprint(northPose(a, move, idle), direction) };
  return { direction: 'south', assetDirection: 'south', ...normalizeFootprint(southPose(a, move, idle), 'south') };
}
