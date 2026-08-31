export const ACE_WALK_PERIOD_MS = 520;
export const ACE_IDLE_PERIOD_MS = 2800;
export const ACE_DIRECTIONS = ['south', 'west', 'north', 'east'];

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const part = (key, x, y, originX, originY, scaleX, scaleY, rotation = 0, alpha = 1) =>
  ({ key, x, y, originX, originY, scaleX, scaleY, rotation, alpha });
const DIRECTION_FOOTPRINT_SCALE = { south: 0.995, west: 1.054, north: 1.069, east: 1.054 };
const FOOTPRINT_ANCHOR = { x: 128, y: 235 };

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

function southPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.6 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 + gait * 1.25 * move;
  const bodyY = 117 + bounce + breathe * 1.1;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? 0 : Math.PI));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? 0 : Math.PI)));
    parts.push(part(`south/foot-${side < 0 ? 'left' : 'right'}`,
      128 + side * 19 + side * step * 1.4 * move,
      190 + step * 5.4 * move - lift * 4.7 * move,
      0.52, 0.18, 0.22, 0.22 * (1 + step * 0.045 * move),
      side * 0.04 + step * 0.065 * move));
  }
  for (const side of [-1, 1]) {
    const wingIdle = Math.sin(idle + (side < 0 ? 0.4 : -0.4)) * 0.026 * (1 - move);
    parts.push(part(`south/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 47, bodyY + 24 + side * gait * 1.25 * move,
      side < 0 ? 0.61 : 0.39, 0.18, 0.20, 0.20,
      side * -0.045 - gait * 0.115 * move + side * wingIdle));
  }
  parts.push(part('south/body', bodyX, bodyY, 0.5, 0.5,
    0.30 * (1 + breathe * 0.006), 0.30 * (1 - breathe * 0.004),
    gait * 0.011 * move + Math.sin(idle) * 0.006 * (1 - move)));
  return { parts, shadow: { x: 128, y: 238, width: 104 - Math.abs(bounce), height: 20 } };
}

function westPose(a, move, idle) {
  const stride = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.7 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 126 - move * 1.5;
  const bodyY = 117 + bounce + breathe * 1.05;
  const nearLift = Math.max(0, -Math.cos(a));
  const farLift = Math.max(0, Math.cos(a));
  const parts = [
    part('west/tail', bodyX + 37, bodyY + 44, 0.18, 0.52, 0.22, 0.22,
      0.045 + stride * 0.075 * move + Math.sin(idle + 0.8) * 0.032 * (1 - move)),
    part('west/foot-far', 134 - stride * 7.2 * move, 189 - farLift * 5.2 * move,
      0.55, 0.18, 0.19, 0.19, -0.025 - stride * 0.075 * move),
    part('west/wing-far', bodyX + 12, bodyY + 19, 0.48, 0.16, 0.17, 0.17,
      -0.03 + stride * 0.11 * move - Math.sin(idle) * 0.022 * (1 - move)),
    part('west/body', bodyX, bodyY, 0.5, 0.5,
      0.31 * (1 + breathe * 0.006), 0.31 * (1 - breathe * 0.004),
      -0.022 - stride * 0.016 * move + Math.sin(idle) * 0.006 * (1 - move)),
    part('west/foot-near', 118 + stride * 9 * move, 191 - nearLift * 5.8 * move,
      0.55, 0.18, 0.20, 0.20, -0.035 + stride * 0.09 * move),
    part('west/wing-near', bodyX + 13, bodyY + 20, 0.48, 0.16, 0.20, 0.20,
      -0.035 - stride * 0.14 * move + Math.sin(idle + 0.5) * 0.024 * (1 - move)),
  ];
  return { parts, shadow: { x: 128, y: 237, width: 112 - Math.abs(bounce), height: 19 } };
}

function northPose(a, move, idle) {
  const gait = Math.sin(a);
  const bounce = (Math.cos(a * 2) - 1) * 1.55 * move;
  const breathe = Math.sin(idle) * (1 - move);
  const bodyX = 128 - gait * 1.2 * move;
  const bodyY = 116 + bounce + breathe * 1.0;
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? Math.PI : 0));
    const lift = Math.max(0, -Math.cos(a + (side < 0 ? Math.PI : 0)));
    const footX = 128 + side * 25 + side * step * 1.0 * move;
    const footY = 218 + step * 3.2 * move - lift * 4.5 * move;
    const footRotation = side * -0.02 + step * 0.045 * move;
    parts.push(part(`north/leg-${side < 0 ? 'left' : 'right'}`,
      footX, footY + 17,
      0.5, 1, 0.12, 0.12, footRotation));
  }
  parts.push(part('north/body', bodyX, bodyY, 0.5, 0.5,
    0.30 * (1 + breathe * 0.006), 0.30 * (1 - breathe * 0.004),
    -gait * 0.01 * move + Math.sin(idle) * 0.006 * (1 - move)));
  parts.push(part('north/tail', bodyX, bodyY + 51, 0.5, 0.18, 0.23, 0.23,
    gait * 0.045 * move + Math.sin(idle + 0.7) * 0.026 * (1 - move)));
  for (const side of [-1, 1]) {
    parts.push(part(`north/wing-${side < 0 ? 'left' : 'right'}`,
      bodyX + side * 44, bodyY + 23 - side * gait * 1.1 * move,
      side < 0 ? 0.60 : 0.40, 0.17, 0.20, 0.20,
      side * -0.04 + gait * 0.105 * move + side * Math.sin(idle) * 0.024 * (1 - move)));
  }
  return { parts, shadow: { x: 128, y: 238, width: 102 - Math.abs(bounce), height: 19 } };
}

function mirrorWest(pose) {
  return {
    shadow: { ...pose.shadow, x: 256 - pose.shadow.x },
    parts: pose.parts.map((item) => ({ ...item, x: 256 - item.x, scaleX: -item.scaleX, rotation: -item.rotation })),
  };
}

export function sampleAcePose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const idle = timeMs / ACE_IDLE_PERIOD_MS * Math.PI * 2;
  if (direction === 'west') return { direction, assetDirection: 'west', ...normalizeFootprint(westPose(a, move, idle), direction) };
  if (direction === 'east') return { direction, assetDirection: 'west', ...normalizeFootprint(mirrorWest(westPose(a, move, idle)), direction) };
  if (direction === 'north') return { direction, assetDirection: 'north', ...normalizeFootprint(northPose(a, move, idle), direction) };
  return { direction: 'south', assetDirection: 'south', ...normalizeFootprint(southPose(a, move, idle), 'south') };
}

export function drawAcePose(context, images, pose, { shadow = true } = {}) {
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
