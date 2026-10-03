// Fixed drawings and rigid transforms only: no frame-specific artwork or morphs.
export const ACE_MASCOT_FRAME_SIZE = 256;
export const ACE_MASCOT_WALK_PERIOD_MS = 520;
export const ACE_MASCOT_IDLE_PERIOD_MS = 2800;
export const ACE_MASCOT_DIRECTIONS = ['south', 'west', 'east', 'north'];
const TAU = Math.PI * 2;
const part = (key, x, y, width, height, originX = 0.5, originY = 0.5, rotation = 0) =>
  ({ key, x, y, width, height, originX, originY, rotation });

function authoredPose(direction, phase, movement, timeMs) {
  const angle = phase * TAU;
  const breathe = Math.sin(timeMs / ACE_MASCOT_IDLE_PERIOD_MS * TAU) * (1 - movement);
  const contact = Math.cos(angle);
  const passing = (1 - Math.cos(angle * 2)) / 2;
  const side = direction === 'west';
  const north = direction === 'north';
  const bob = -passing * 5 * movement + breathe * 1.6;
  const sway = contact * 1.1 * movement + Math.cos(timeMs / ACE_MASCOT_IDLE_PERIOD_MS * TAU) * 0.55 * (1 - movement);
  const bodyX = 128 + sway;
  const bodyY = 187 + bob;
  const headX = bodyX + (side ? -9 : 0);
  const headY = 110 + bob - Math.sin(angle * 2) * 0.8 * movement;
  const headTilt = Math.sin(angle) * 0.009 * movement + breathe * 0.004;
  const combLag = Math.sin(angle - 0.45) * 0.023 * movement + breathe * 0.009;
  const tailLag = Math.sin(angle - 0.7) * 0.055 * movement + breathe * 0.022;
  const p = (name, ...args) => part(`${direction}/${name}`, ...args);
  const parts = [];

  // A broad rump root overlaps the torso; feather tips grow upward from it.
  if (!north) parts.push(p('tail', bodyX + (side ? 25 : 0), bodyY + 26,
    side ? 94 : 132, side ? 116 : 98, side ? 0.18 : 0.5, 0.95, tailLag));

  const feet = [-1, 1].map((sign, index) => {
    const footPhase = angle + (index ? Math.PI : 0);
    const lift = Math.max(0, Math.sin(footPhase)) * (side ? 10 : 6) * movement;
    // In profile each raised foot swings from behind (right) to ahead (left).
    const x = side ? 123 + Math.cos(footPhase) * 16 * movement
      : 128 + sign * 24 + sign * contact * 0.8 * movement;
    const y = 239 - lift + (side ? 0 : Math.cos(footPhase) * (north ? -3 : 3) * movement);
    return p(index ? 'foot-right' : 'foot-left', x, y, side ? 45 : 44, 40,
      0.5, 1, side ? -Math.sin(footPhase) * 0.07 * movement : sign * 0.025 + Math.cos(footPhase) * 0.025 * movement);
  });
  parts.push(...feet);
  if (side) parts.push(p('wing-right', bodyX - 17, bodyY - 22, 37, 54, 0.5, 0.15,
    -Math.sin(angle) * 0.06 * movement));
  parts.push(p('body', bodyX, bodyY, side ? 103 : 116, 70));
  for (const sign of side ? [1] : [-1, 1]) {
    parts.push(p(sign < 0 ? 'wing-left' : side ? 'wing-left' : 'wing-right',
      bodyX + (side ? 27 : sign * 54), bodyY - 28,
      side ? 43 : 42, 61, 0.5, 0.15,
      -sign * 0.06 + sign * contact * 0.08 * movement + breathe * sign * 0.018));
  }
  parts.push(p('head', headX, headY, side ? 138 : 145, north ? 98 : 101,
    0.5, 0.5, headTilt));
  // Rear view: the raised fan is nearest the viewer and covers the lower back.
  if (north) parts.push(p('tail', bodyX, bodyY + 37, 126, 100, 0.5, 0.95, tailLag));
  // The root overlaps the crown in front, keeping the whole red comb readable.
  // Classic rounded lobes; profile attaches at its forward root, not its center.
  parts.push(p('comb', headX + (side ? -17 : 1), headY - (side ? 30 : 34),
    side ? 92 : 78, side ? 70 : 68, side ? 0.3 : 0.5, 0.88, headTilt + combLag));
  return parts;
}

export function sampleAceMascotPose({ direction = 'south', phase = 0, movement = 0, timeMs = 0 } = {}) {
  if (!ACE_MASCOT_DIRECTIONS.includes(direction)) throw new Error(`Invalid Ace direction: ${direction}`);
  const move = Math.max(0, Math.min(1, movement));
  const sourceDirection = direction === 'east' ? 'west' : direction;
  let parts = authoredPose(sourceDirection, phase, move, timeMs);
  if (direction === 'east') parts = parts.map(p => ({...p, x:256-p.x, width:-p.width, rotation:-p.rotation}));
  return { direction, sourceDirection, frameSize:256, origin:[0.5,0.5], parts };
}
