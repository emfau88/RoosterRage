export const ARTILLERY_WALK_PERIOD_MS = 650;
export const ARTILLERY_IDLE_PERIOD_MS = 3200;
export const ARTILLERY_DIRECTIONS = ['south', 'west', 'north', 'east'];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const part = (key, x, y, originX, originY, scaleX, scaleY, rotation = 0, alpha = 1) =>
  ({ key, x, y, originX, originY, scaleX, scaleY, rotation, alpha });

function southPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 2.15 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 + gait * 1.15 * move;
  const bodyY = 104 + bounce + breathe * 1.15;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? 0 : Math.PI));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? 0 : Math.PI)));
    parts.push(part(`south/leg-${side < 0 ? 'left' : 'right'}`,
      128 + side * 23 + side * step * 1.5 * move,
      229 + step * 5.2 * move - lift * 5.8 * move,
      0.5, 0.90, 0.22, 0.22,
      side * 0.025 + step * 0.052 * move));
  }
  parts.push(part('south/body', bodyX, bodyY, 0.5, 0.5,
    0.285 * (1 + breathe * 0.006), 0.285 * (1 - breathe * 0.004),
    gait * 0.009 * move + Math.sin(idle) * 0.004 * (1 - move)));
  for (const side of [-1, 1]) {
    const idleSwing = Math.sin(idle + (side < 0 ? 0.4 : -0.4)) * 0.018 * (1 - move);
    parts.push(part(`south/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 49, bodyY - 10 + side * gait * 1.2 * move,
      0.5, 0.10, 0.205, 0.205,
      side * -0.045 - gait * 0.105 * move + side * idleSwing));
  }
  return { parts, shadow: { x: 128, y: 239, width: 118 - Math.abs(bounce), height: 21 } };
}

function westPose(a, move, idle) {
  const stride = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 2.2 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 116 - move * 1.3;
  const bodyY = 108 + bounce + breathe * 1.1;
  const nearLift = Math.max(0, -Math.cos(a));
  const farLift = Math.max(0, Math.cos(a));
  return {
    parts: [
      part('west/tail', bodyX + 39, bodyY + 37, 0.15, 0.50, 0.21, 0.21,
        0.025 + stride * 0.055 * move + Math.sin(idle + 0.7) * 0.024 * (1 - move)),
      part('west/leg-far', 136 - stride * 6.2 * move, 230 - farLift * 5.4 * move,
        0.52, 0.91, 0.205, 0.205, -0.015 - stride * 0.06 * move),
      part('west/wing-far', bodyX + 15, bodyY - 14, 0.5, 0.10, 0.175, 0.175,
        -0.025 + stride * 0.085 * move - Math.sin(idle) * 0.015 * (1 - move)),
      part('west/body', bodyX, bodyY, 0.5, 0.5,
        0.30 * (1 + breathe * 0.006), 0.30 * (1 - breathe * 0.004),
        -0.018 - stride * 0.012 * move + Math.sin(idle) * 0.004 * (1 - move)),
      part('west/leg-near', 111 + stride * 7.4 * move, 230 - nearLift * 6.2 * move,
        0.52, 0.91, 0.22, 0.22, -0.02 + stride * 0.072 * move),
      part('west/wing-near', bodyX + 18, bodyY - 12, 0.5, 0.10, 0.195, 0.195,
        -0.035 - stride * 0.11 * move + Math.sin(idle + 0.5) * 0.018 * (1 - move)),
    ],
    shadow: { x: 128, y: 239, width: 121 - Math.abs(bounce), height: 20 },
  };
}

function northPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 2.05 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - gait * 1.1 * move;
  const bodyY = 104 + bounce + breathe * 1.05;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? Math.PI : 0));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? Math.PI : 0)));
    parts.push(part(`north/leg-${side < 0 ? 'left' : 'right'}`,
      128 + side * 22 + side * step * 1.1 * move,
      231 + step * 3.8 * move - lift * 5.6 * move,
      0.5, 0.97, 0.13, 0.13,
      side * -0.015 + step * 0.038 * move));
  }
  // In the back view the wing roots sit on the hidden front/side of the
  // torso. Draw them behind the body so only the hanging outer arms emerge
  // beside the hips instead of appearing attached to the shoulder blades.
  for (const side of [-1, 1]) {
    parts.push(part(`north/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 43, bodyY + 5 - side * gait * 1.1 * move,
      0.5, 0.10, 0.205, 0.205,
      side * -0.025 + gait * 0.09 * move + side * Math.sin(idle) * 0.018 * (1 - move)));
  }
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.285 * (1 + breathe * 0.006), 0.285 * (1 - breathe * 0.004),
    -gait * 0.008 * move + Math.sin(idle) * 0.004 * (1 - move)));
  parts.push(part('north/tail', bodyX, bodyY + 60, 0.5, 0.20, 0.20, 0.20,
    gait * 0.04 * move + Math.sin(idle + 0.7) * 0.022 * (1 - move)));
  return { parts, shadow: { x: 128, y: 239, width: 114 - Math.abs(bounce), height: 20 } };
}

function mirrorWest(pose) {
  return {
    shadow: { ...pose.shadow, x: 256 - pose.shadow.x },
    parts: pose.parts.map((item) => ({ ...item, x: 256 - item.x, scaleX: -item.scaleX, rotation: -item.rotation })),
  };
}

export function sampleArtilleryPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / ARTILLERY_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'west') return { direction, assetDirection: 'west', ...westPose(a, move, idle) };
  if (direction === 'east') return { direction, assetDirection: 'west', ...mirrorWest(westPose(a, move, idle)) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...northPose(a, move, idle) };
  return { direction: 'south', assetDirection: 'south', ...southPose(a, move, idle) };
}

export function drawArtilleryPose(context, images, pose, { shadow = true } = {}) {
  if (shadow) {
    context.save();
    context.fillStyle = 'rgba(255,255,255,.13)';
    context.beginPath();
    context.ellipse(pose.shadow.x, pose.shadow.y, pose.shadow.width / 2, pose.shadow.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  for (const item of pose.parts) {
    const image = images[item.key];
    if (!image) continue;
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.scale(item.scaleX, item.scaleY);
    context.globalAlpha *= item.alpha;
    context.drawImage(image, -image.width * item.originX, -image.height * item.originY);
    context.restore();
  }
}
