export const ARTILLERY_GAMEPLAY_WALK_PERIOD_MS = 650;
export const ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS = 3200;
export const ARTILLERY_GAMEPLAY_DIRECTIONS = ['south', 'west', 'north', 'east'];

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
  const bodyX = 128 + contact * 1.8 * move;
  const bodyY = 112 - passing * 7 * move + breathe * 3;
  const leftLift = Math.max(0, -transfer) * 8 * move;
  const rightLift = Math.max(0, transfer) * 8 * move;
  const bodyScaleX = 0.35 * (1 + breathe * 0.006);
  const bodyScaleY = 0.295 * (1 - breathe * 0.004);
  const bodyRotation = contact * 0.016 * move + Math.sin(idle) * 0.004 * (1 - move);
  const parts = [
    part('south/leg-left', 108 - contact * 2 * move, 221 + contact * 7 * move - leftLift,
      0.5, 0.90, 0.20, 0.15, -0.025 + contact * 0.055 * move),
    part('south/leg-right', 148 + contact * 2 * move, 221 - contact * 7 * move - rightLift,
      0.5, 0.90, 0.20, 0.15, 0.025 - contact * 0.055 * move),
    part('south/body', bodyX, bodyY, 0.5, 0.5, bodyScaleX, bodyScaleY, bodyRotation),
  ];
  for (const side of [-1, 1]) {
    const counter = -side * contact;
    const idleLag = Math.sin(idle - side * 0.35) * (1 - move);
    parts.push(part(`south/forearm-fist-${side < 0 ? 'left' : 'right'}-v1`,
      bodyX + side * 51,
      bodyY - 2 + counter * 2.2 * move - breathe,
      0.5, 0.10, 0.205, 0.19,
      side * -0.025 + counter * 0.07 * move + side * idleLag * 0.018));
  }
  return { parts, shadow: { x: 128, y: 239, width: 128 - passing * 4, height: 21 } };
}

function westPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 123 - contact * 1.5 * move;
  const bodyY = 112 - passing * 7 * move + breathe * 3;
  // Facing west: a lifted foot must travel from screen-right (behind) to
  // screen-left (ahead). The previous phase assignment did the inverse and
  // made the in-place cycle read as backwards walking.
  const farLift = Math.max(0, transfer) * 14 * move;
  const nearLift = Math.max(0, -transfer) * 14 * move;
  // Preserve Bummbert's weight without stretching his belly far ahead of a
  // much narrower pelvis.  A slightly taller torso and fuller thighs form one
  // continuous load-bearing profile.
  const bodyScaleX = 0.325 * (1 + breathe * 0.006);
  const bodyScaleY = 0.31 * (1 - breathe * 0.004);
  const bodyRotation = -0.018 - contact * 0.022 * move + Math.sin(idle) * 0.004 * (1 - move);
  return {
    parts: [
      part('west/tail', bodyX + 40, bodyY + 53 + passing * 2 * move - breathe * 1.2,
        0.15, 0.50, 0.205, 0.195,
        0.035 + Math.cos(a - 0.55) * 0.075 * move + Math.sin(idle - 0.6) * 0.03 * (1 - move)),
      // The authored far leg points right while the near leg points left.
      // West is canonical here, so mirror only the far source part. Mirroring
      // the complete pose then makes both feet point east in the derived view.
      part('west/leg-far', 103 + contact * 19 * move, 229 - farLift,
        0.52, 0.91, -0.185, 0.155, 0.015 + contact * 0.035 * move),
      part('west/leg-near', 103 - contact * 19 * move, 229 - nearLift,
        0.52, 0.91, 0.20, 0.16, -0.02 - contact * 0.04 * move),
      // Both leg roots disappear cleanly below the skirt. The body already
      // owns the complete upper arm and gauntlet in profile.
      part('west/body-gameplay-v3', bodyX, bodyY, 0.5, 0.5, bodyScaleX, bodyScaleY, bodyRotation),
      part('west/fist-near-v1', bodyX + 15, bodyY + 5 - contact * 2 * move - breathe,
        0.5, 0.10, 0.225, 0.215,
        -0.025 + contact * 0.055 * move + Math.sin(idle - 0.5) * 0.018 * (1 - move)),
    ],
    shadow: { x: 128, y: 239, width: 132 - passing * 4, height: 20 },
  };
}

function northPose(a, move, idle) {
  const { contact, passing, transfer } = cycle(a);
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - contact * 1.8 * move;
  const bodyY = 112 - passing * 7 * move + breathe * 3;
  const leftLift = Math.max(0, -transfer) * 8 * move;
  const rightLift = Math.max(0, transfer) * 8 * move;
  const parts = [
    part('north/leg-left', 111 - contact * 1.5 * move, 234 + contact * 6 * move - leftLift,
      0.5, 0.97, 0.12, 0.095, 0.015 + contact * 0.04 * move),
    part('north/leg-right', 151 + contact * 1.5 * move, 234 - contact * 6 * move - rightLift,
      0.5, 0.97, 0.12, 0.095, -0.015 - contact * 0.04 * move),
  ];
  // From behind, only the lower forearms are separate. The torso already
  // contains one clean pair of shoulders and masks the hidden attachments.
  for (const side of [-1, 1]) {
    const counter = side * contact;
    parts.push(part(`north/forearm-${side < 0 ? 'left' : 'right'}-v1`,
      bodyX + side * 50,
      bodyY - 1 + counter * 2.2 * move - breathe,
      0.5, 0.10, 0.195, 0.185,
      side * -0.02 + counter * 0.07 * move + side * Math.sin(idle - 0.4) * 0.018 * (1 - move)));
  }
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.35 * (1 + breathe * 0.006), 0.295 * (1 - breathe * 0.004),
    -contact * 0.016 * move + Math.sin(idle) * 0.004 * (1 - move)));
  parts.push(part('north/tail', bodyX + 3, bodyY + 58 + passing * 2 * move - breathe * 1.2,
    0.5, 0.20, 0.21, 0.20,
    Math.cos(a - 0.55) * 0.065 * move + Math.sin(idle - 0.6) * 0.03 * (1 - move)));
  return { parts, shadow: { x: 128, y: 239, width: 126 - passing * 4, height: 20 } };
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

export function sampleArtilleryGameplayPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'west') return { direction, assetDirection: 'west', ...westPose(a, move, idle) };
  if (direction === 'east') return { direction, assetDirection: 'west', ...mirrorWest(westPose(a, move, idle)) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...northPose(a, move, idle) };
  return { direction: 'south', assetDirection: 'south', ...southPose(a, move, idle) };
}
