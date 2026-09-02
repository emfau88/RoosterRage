export const STORM_GAMEPLAY_WALK_PERIOD_MS = 480;
export const STORM_GAMEPLAY_IDLE_PERIOD_MS = 2400;
export const STORM_GAMEPLAY_DIRECTIONS = ['south', 'west', 'north', 'east'];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const part = (key, x, y, originX, originY, scaleX, scaleY, rotation = 0, alpha = 1) =>
  ({ key, x, y, originX, originY, scaleX, scaleY, rotation, alpha });

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
  const bodyX = 128 + contact * 2.1 * move;
  const bodyY = 111 - passing * 7 * move + breathe * 3;
  const leftLift = Math.max(0, -transfer) * 9 * move;
  const rightLift = Math.max(0, transfer) * 9 * move;
  const bodyScaleX = 0.355 * (1 + breathe * 0.006);
  const bodyScaleY = 0.335 * (1 - breathe * 0.004);
  const bodyRotation = contact * 0.022 * move + Math.sin(idle) * 0.005 * (1 - move);
  const parts = [
    // The authored feet point inward in their named slots. Crossing the two
    // immutable leg assets gives Blitzkamm a stable, outward athletic stance.
    part('south/leg-right', 111 - contact * 2 * move, 221 + contact * 7 * move - leftLift,
      0.5, 0.91, 0.175, 0.155, -0.025 + contact * 0.06 * move),
    part('south/leg-left', 145 + contact * 2 * move, 221 - contact * 7 * move - rightLift,
      0.5, 0.91, 0.175, 0.155, 0.025 - contact * 0.06 * move),
    part('south/body', bodyX, bodyY, 0.5, 0.5, bodyScaleX, bodyScaleY, bodyRotation),
  ];
  for (const side of [-1, 1]) {
    const counter = -side * contact;
    parts.push(part(`south/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 36,
      bodyY + 15 + counter * 2.7 * move - breathe,
      0.5, 0.10, 0.18, 0.18,
      side * -0.04 + counter * 0.135 * move + side * Math.sin(idle - side * 0.35) * 0.03 * (1 - move)));
  }
  return { parts, shadow: { x: 128, y: 239, width: 106 - passing * 4, height: 18 } };
}

function eastPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 130 + contact * 1.7 * move;
  const bodyY = 114 - passing * 7 * move + breathe * 3;
  // Facing east: each lifted foot travels from screen-left (behind) to
  // screen-right (ahead). West inherits the correct inverse by mirroring.
  const farLift = Math.max(0, transfer) * 15 * move;
  const nearLift = Math.max(0, -transfer) * 15 * move;
  const bodyScaleX = 0.34 * (1 + breathe * 0.006);
  const bodyScaleY = 0.34 * (1 - breathe * 0.004);
  const bodyRotation = 0.016 + contact * 0.026 * move - Math.sin(idle) * 0.005 * (1 - move);
  return {
    parts: [
      part('east/tail', bodyX - 31, bodyY + 53 + passing * 2 * move - breathe * 1.2,
        0.82, 0.53, 0.20, 0.19,
        -0.03 - Math.cos(a - 0.55) * 0.085 * move - Math.sin(idle - 0.6) * 0.035 * (1 - move)),
      // Blitzkamm's far source foot points left and the near source foot
      // points right. East is canonical, therefore only the far asset is
      // mirrored before the complete west view is derived from this pose.
      part('east/leg-far', 128 - contact * 19 * move, 221 - farLift,
        0.48, 0.91, -0.18, 0.15, -0.018 - contact * 0.035 * move),
      part('east/leg-near', 132 + contact * 19 * move, 221 - nearLift,
        0.48, 0.91, 0.19, 0.155, 0.02 + contact * 0.04 * move),
      part('east/wing-far', bodyX - 8, bodyY + 11 - contact * 2.2 * move - breathe,
        0.5, 0.10, 0.14, 0.14,
        0.025 + contact * 0.12 * move + Math.sin(idle - 0.35) * 0.025 * (1 - move)),
      part('east/body', bodyX, bodyY, 0.5, 0.5, bodyScaleX, bodyScaleY, bodyRotation),
      // Foreground fist and shoulder sit above the thigh and torso.
      part('east/wing-near', bodyX - 1, bodyY + 20 + contact * 2.7 * move - breathe,
        0.5, 0.10, 0.18, 0.18,
        0.035 - contact * 0.145 * move - Math.sin(idle - 0.5) * 0.03 * (1 - move)),
    ],
    shadow: { x: 128, y: 239, width: 112 - passing * 4, height: 18 },
  };
}

function northPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - contact * 2 * move;
  const bodyY = 112 - passing * 7 * move + breathe * 3;
  const leftLift = Math.max(0, -transfer) * 9 * move;
  const rightLift = Math.max(0, transfer) * 9 * move;
  const parts = [
    part('north/leg-left', 108 - contact * 1.5 * move, 228 + contact * 6 * move - leftLift,
      0.5, 0.97, 0.165, 0.14, 0.015 + contact * 0.045 * move),
    part('north/leg-right', 148 + contact * 1.5 * move, 228 - contact * 6 * move - rightLift,
      0.5, 0.97, 0.165, 0.14, -0.015 - contact * 0.045 * move),
  ];
  // The back torso masks the shoulder roots because both arms hang from the
  // character's hidden front side in this view.
  for (const side of [-1, 1]) {
    const counter = side * contact;
    parts.push(part(`north/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 35,
      bodyY + 17 + counter * 2.7 * move - breathe,
      0.5, 0.10, 0.17, 0.17,
      side * -0.03 + counter * 0.13 * move + side * Math.sin(idle - 0.4) * 0.03 * (1 - move)));
  }
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.355 * (1 + breathe * 0.006), 0.335 * (1 - breathe * 0.004),
    -contact * 0.02 * move + Math.sin(idle) * 0.005 * (1 - move)));
  parts.push(part('north/tail', bodyX, bodyY + 58 + passing * 2 * move - breathe * 1.2,
    0.5, 0.18, 0.20, 0.19,
    Math.cos(a - 0.55) * 0.08 * move + Math.sin(idle - 0.6) * 0.035 * (1 - move)));
  return { parts, shadow: { x: 128, y: 239, width: 104 - passing * 4, height: 18 } };
}

function mirrorEast(pose) {
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

export function sampleStormGameplayPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / STORM_GAMEPLAY_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'east') return { direction, assetDirection: 'east', ...eastPose(a, move, idle) };
  if (direction === 'west') return { direction, assetDirection: 'east', ...mirrorEast(eastPose(a, move, idle)) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...northPose(a, move, idle) };
  return { direction: 'south', assetDirection: 'south', ...southPose(a, move, idle) };
}
