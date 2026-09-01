export const STORM_WALK_PERIOD_MS = 440;
export const STORM_IDLE_PERIOD_MS = 2400;
export const STORM_DIRECTIONS = ['south', 'west', 'north', 'east'];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const part = (key, x, y, originX, originY, scaleX, scaleY, rotation = 0, alpha = 1) =>
  ({ key, x, y, originX, originY, scaleX, scaleY, rotation, alpha });

function southPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.55 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 + gait * 1.45 * move;
  const bodyY = 105 + bounce + breathe * 0.95;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? 0 : Math.PI));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? 0 : Math.PI)));
    parts.push(part(`south/leg-${side < 0 ? 'left' : 'right'}`,
      128 + side * 17 + side * step * 1.8 * move,
      230 + step * 7.2 * move - lift * 7.0 * move,
      0.5, 0.91, 0.19, 0.19,
      side * 0.03 + step * 0.08 * move));
  }
  parts.push(part('south/body', bodyX, bodyY, 0.5, 0.5,
    0.30 * (1 + breathe * 0.006), 0.30 * (1 - breathe * 0.004),
    gait * 0.014 * move + Math.sin(idle) * 0.005 * (1 - move)));
  for (const side of [-1, 1]) {
    parts.push(part(`south/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 35, bodyY + 2 + side * gait * 1.6 * move,
      0.5, 0.10, 0.19, 0.19,
      side * -0.035 - gait * 0.15 * move + side * Math.sin(idle) * 0.025 * (1 - move)));
  }
  return { parts, shadow: { x: 128, y: 239, width: 92 - Math.abs(bounce), height: 18 } };
}

function eastPose(a, move, idle) {
  const stride = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.65 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 132 + move * 1.5;
  const bodyY = 107 + bounce + breathe * 0.95;
  const nearLift = Math.max(0, -Math.cos(a));
  const farLift = Math.max(0, Math.cos(a));
  return {
    parts: [
      part('east/tail', bodyX - 30, bodyY + 48, 0.82, 0.53, 0.19, 0.19,
        -0.02 - stride * 0.08 * move - Math.sin(idle + 0.8) * 0.03 * (1 - move)),
      part('east/leg-far', 119 - stride * 8.0 * move, 230 - farLift * 6.8 * move,
        0.48, 0.91, 0.18, 0.18, 0.02 - stride * 0.08 * move),
      part('east/wing-far', bodyX - 9, bodyY - 1, 0.5, 0.10, 0.16, 0.16,
        0.025 - stride * 0.12 * move + Math.sin(idle) * 0.02 * (1 - move)),
      part('east/body', bodyX, bodyY, 0.5, 0.5,
        0.31 * (1 + breathe * 0.006), 0.31 * (1 - breathe * 0.004),
        0.016 + stride * 0.018 * move - Math.sin(idle) * 0.005 * (1 - move)),
      part('east/leg-near', 143 + stride * 9.5 * move, 230 - nearLift * 7.6 * move,
        0.48, 0.91, 0.195, 0.195, 0.025 + stride * 0.1 * move),
      part('east/wing-near', bodyX - 4, bodyY + 1, 0.5, 0.10, 0.19, 0.19,
        0.03 + stride * 0.16 * move - Math.sin(idle + 0.5) * 0.025 * (1 - move)),
    ],
    shadow: { x: 128, y: 239, width: 101 - Math.abs(bounce), height: 18 },
  };
}

function northPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.5 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - gait * 1.35 * move;
  const bodyY = 105 + bounce + breathe * 0.9;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? Math.PI : 0));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? Math.PI : 0)));
    parts.push(part(`north/leg-${side < 0 ? 'left' : 'right'}`,
      128 + side * 17 + side * step * 1.2 * move,
      232 + step * 4.8 * move - lift * 7.0 * move,
      0.5, 0.97, 0.17, 0.17,
      side * -0.02 + step * 0.055 * move));
  }
  // The roots sit on the hidden front/side; the torso masks them from behind.
  for (const side of [-1, 1]) {
    parts.push(part(`north/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 34, bodyY + 7 - side * gait * 1.4 * move,
      0.5, 0.10, 0.18, 0.18,
      side * -0.02 + gait * 0.13 * move + side * Math.sin(idle) * 0.022 * (1 - move)));
  }
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.30 * (1 + breathe * 0.006), 0.30 * (1 - breathe * 0.004),
    -gait * 0.012 * move + Math.sin(idle) * 0.005 * (1 - move)));
  parts.push(part('north/tail', bodyX, bodyY + 63, 0.5, 0.18, 0.19, 0.19,
    gait * 0.065 * move + Math.sin(idle + 0.7) * 0.028 * (1 - move)));
  return { parts, shadow: { x: 128, y: 239, width: 91 - Math.abs(bounce), height: 18 } };
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

export function sampleStormPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / STORM_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'east') return { direction, assetDirection: 'east', ...eastPose(a, move, idle) };
  if (direction === 'west') return { direction, assetDirection: 'east', ...mirrorEast(eastPose(a, move, idle)) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...northPose(a, move, idle) };
  return { direction: 'south', assetDirection: 'south', ...southPose(a, move, idle) };
}

export function drawStormPose(context, images, pose, { shadow = true } = {}) {
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
