// Pixel coordinates in a 256 px art frame. This module has no engine dependency:
// the Phaser rig, canvas comparison, and offline exports sample the same poses.
export const ACE_WALK_PERIOD_MS = 480;
export const ACE_IDLE_PERIOD_MS = 2400;
export const ACE_SHOT_DURATION_MS = 260;
export const ACE_HURT_DURATION_MS = 240;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOut = (value) => 1 - (1 - value) ** 3;
const envelope = (age, duration, peak) => {
  if (age < 0 || age >= duration) return 0;
  const t = age / duration;
  return t < peak ? easeOut(t / peak) : (1 - (t - peak) / (1 - peak)) ** 2;
};

export function sampleAceSouthPose({
  phase = 0, movement = 0, timeMs = 0, shotAgeMs = Infinity,
  hurtAgeMs = Infinity, shotSide = 1
} = {}) {
  const move = clamp01(movement);
  const a = phase * Math.PI * 2;
  const gait = Math.sin(a);
  const bob = (Math.cos(a * 2) - 1) * 1.7 * move;
  const breath = Math.sin(timeMs / ACE_IDLE_PERIOD_MS * Math.PI * 2) * (1 - move);
  const hurt = envelope(hurtAgeMs, ACE_HURT_DURATION_MS, 0.16);
  // The shot event means a projectile was already released. Recoil is immediate;
  // the visual must never delay or duplicate a gameplay projectile.
  const shot = envelope(shotAgeMs + 22, ACE_SHOT_DURATION_MS + 22, 0.08) * (1 - hurt);
  const bodyX = 128 + gait * 1.7 * move - hurt * 3;
  const bodyY = 117 + bob + breath * 0.7 - shot * 2 + hurt * 3;
  const bodyAngle = (gait * 0.012 * move - hurt * 0.08 - shot * 0.018);
  const parts = [];
  for (const side of [-1, 1]) {
    const step = Math.sin(a + (side < 0 ? 0 : Math.PI));
    const lift = Math.max(0, Math.cos(a + (side < 0 ? 0 : Math.PI)));
    parts.push({
      key: side < 0 ? 'foot-left' : 'foot-right',
      x: 128 + side * 19 + side * step * 1.2 * move,
      y: 190 + step * 6 * move - lift * 5 * move,
      originX: 0.52, originY: 0.18, scaleX: 0.22,
      scaleY: 0.22 * (1 + step * 0.055 * move),
      rotation: side * 0.045 + step * 0.075 * move, alpha: 1
    });
  }
  for (const side of [-1, 1]) {
    const isThrowing = side === shotSide;
    parts.push({
      key: side < 0 ? 'wing-left' : 'wing-right',
      x: bodyX + side * 47, y: bodyY + 24 + side * gait * 1.4 * move,
      originX: side < 0 ? 0.61 : 0.39, originY: 0.18,
      scaleX: 0.20, scaleY: 0.20,
      rotation: side * -0.045 - gait * 0.10 * move + side * (hurt * 0.34 + (isThrowing ? shot * 0.34 : -shot * 0.10)),
      alpha: isThrowing ? 1 - shot : 1
    });
  }
  parts.push({
    key: 'body', x: bodyX, y: bodyY,
    originX: 0.5, originY: 0.5,
    scaleX: 0.30 * (1 + breath * 0.002 + hurt * 0.025),
    scaleY: 0.30 * (1 - breath * 0.002 - hurt * 0.018),
    rotation: bodyAngle, alpha: 1
  });
  if (shot > 0.001) {
    parts.push({
      key: 'wing-throw', x: bodyX + shotSide * (47 - shot * 6), y: bodyY + 24 - shot * 5,
      originX: 0.18, originY: 0.18,
      scaleX: shotSide * 0.20, scaleY: 0.20,
      rotation: shotSide * (0.12 - shot * 0.28), alpha: shot
    });
  }
  return { parts, shadow: { x: 128, y: 238, width: 104 - Math.abs(bob) * 1.5, height: 20 }, hurt, shot };
}

export function drawAceSouth(context, images, pose, { shadow = true } = {}) {
  if (shadow) {
    context.save();
    context.fillStyle = 'rgba(16, 13, 9, .24)';
    context.beginPath();
    context.ellipse(pose.shadow.x, pose.shadow.y, pose.shadow.width / 2, pose.shadow.height / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  for (const part of pose.parts) {
    const image = images[part.key];
    if (!image) continue;
    context.save();
    context.translate(part.x, part.y);
    context.rotate(part.rotation);
    context.scale(part.scaleX, part.scaleY);
    context.globalAlpha *= part.alpha;
    context.drawImage(image, -image.width * part.originX, -image.height * part.originY);
    context.restore();
  }
}
