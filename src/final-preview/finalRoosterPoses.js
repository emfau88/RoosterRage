import { sampleAceGameplayPose } from '../ace-preview/aceGameplayPose.js';
import { sampleArtilleryGameplayPose } from '../artillery-preview/artilleryGameplayPose.js';
import { sampleStormGameplayPose } from '../storm-preview/stormGameplayPose.js';

export const FINAL_ROOSTER_DIRECTIONS = ['south', 'west', 'north', 'east'];
export const FINAL_ROOSTER_SCALE = Object.freeze({ ace: 0.25, artillery: 0.275, storm: 0.255 });

const copyPose = (pose) => ({
  ...pose,
  shadow: { ...pose.shadow },
  parts: pose.parts.map((item) => ({ ...item })),
});

const spreadFromCenter = (item, factor, center = 128) => {
  item.x = center + (item.x - center) * factor;
};

export function sampleAceFinalPose(options = {}) {
  const pose = copyPose(sampleAceGameplayPose(options));
  const side = pose.direction === 'west' || pose.direction === 'east';
  const mirrorSign = pose.direction === 'east' ? -1 : 1;

  if (side) {
    // The gameplay source lifted the correct feet but moved both flying arcs
    // backwards. Swapping only their horizontal tracks preserves depth/layer
    // ownership and makes each raised foot travel from behind to ahead.
    const far = pose.parts.find((item) => item.key === 'west/foot-far');
    const near = pose.parts.find((item) => item.key === 'west/foot-near');
    [far.x, near.x] = [near.x, far.x];
  }

  pose.parts.forEach((item) => {
    if (item.key.endsWith('/body') || item.key.includes('shoulder-')) {
      item.scaleX *= 1.055;
    }
    if (item.key.includes('arm-fist') || item.key.includes('wing-')) {
      spreadFromCenter(item, side ? 1.045 : 1.06);
    }
    if (side && (item.key === 'west/foot-far' || item.key === 'west/foot-near')) {
      // The final eight-frame side cycle must still show a roughly ten-pixel
      // stride after the 0.25 production scale is applied.
      spreadFromCenter(item, 1.14);
    }
    if (item.key === 'west/tail') {
      item.key = 'final/ace-west-tail-fan-v1';
      item.x -= mirrorSign * 10;
      item.y += 8;
      item.originX = 0.07;
      item.originY = 0.5;
      item.scaleX = mirrorSign * 0.285;
      item.scaleY = 0.275;
    }
    if (item.key === 'north/tail') {
      item.key = 'final/ace-north-tail-fan-v1';
      item.originX = 0.5;
      item.originY = 0.08;
      item.scaleX = 0.28;
      item.scaleY = 0.24;
    }
  });
  pose.shadow.width *= 1.06;
  return pose;
}

export function sampleArtilleryFinalPose(options = {}) {
  const movement = Math.max(0, Math.min(1, options.movement ?? 0));
  const phase = options.phase ?? 0;
  // Slow the phase around both planted contacts without duplicating frames.
  // Bummbert reads as weighty while all eight samples remain distinct.
  const weightedPhase = movement
    ? phase - Math.sin(phase * Math.PI * 4) * 0.28 / (Math.PI * 4)
    : phase;
  const pose = copyPose(sampleArtilleryGameplayPose({ ...options, phase: weightedPhase }));
  const side = pose.direction === 'west' || pose.direction === 'east';
  const mirrorSign = pose.direction === 'east' ? -1 : 1;
  const passing = (1 - Math.cos(weightedPhase * Math.PI * 4)) / 2;

  pose.parts.forEach((item) => {
    if (item.key === 'west/body-gameplay-v3') {
      item.key = 'final/artillery-west-body-v1';
      item.y -= 1;
      item.scaleX = mirrorSign * 0.315;
      item.scaleY = 0.3;
    } else if (item.key.endsWith('/body')) {
      item.scaleX *= 1.065;
    }
    if (item.key.includes('forearm') || item.key.includes('fist-near')) {
      spreadFromCenter(item, side ? 1.035 : 1.055);
    }
    if (item.key.endsWith('/tail')) {
      item.scaleX *= 1.1;
      item.scaleY *= 1.08;
      item.y += side ? 2 : 4;
    }
    if (movement && (item.key.includes('body') || item.key.includes('forearm')
      || item.key.includes('fist-near') || item.key.endsWith('/tail'))) {
      // Reduce the vertical flight inherited from the lighter gameplay rig;
      // the legs carry the torso instead of the full mass hopping upward.
      item.y += passing * 2 * movement;
    }
  });

  // In profile the body owns the complete upper arm and cuff. Lock the hand's
  // wrist origin directly to the cuff opening so gait counter-motion can never
  // detach the fist or reveal a second forearm.
  if (side) {
    const body = pose.parts.find((item) => item.key === 'final/artillery-west-body-v1');
    const fist = pose.parts.find((item) => item.key === 'west/fist-near-v1');
    if (body && fist) {
      const cuffOffsetX = 24 * mirrorSign;
      const cuffOffsetY = 55;
      const c = Math.cos(body.rotation);
      const s = Math.sin(body.rotation);
      fist.key = 'final/artillery-west-fist-near-v1';
      fist.x = body.x + cuffOffsetX * c - cuffOffsetY * s;
      fist.y = body.y + cuffOffsetX * s + cuffOffsetY * c;
      fist.originX = 0.965;
      fist.originY = 0.08;
      fist.scaleX = mirrorSign * 0.205;
      fist.scaleY = 0.195;
      fist.rotation = body.rotation;
    }
  }
  pose.shadow.width *= 1.07;
  return pose;
}

export function sampleStormFinalPose(options = {}) {
  const pose = copyPose(sampleStormGameplayPose(options));
  const side = pose.direction === 'west' || pose.direction === 'east';
  const movement = Math.max(0, Math.min(1, options.movement ?? 0));
  const phase = options.phase ?? 0;
  const passing = (1 - Math.cos(phase * Math.PI * 4)) / 2;

  pose.parts.forEach((item) => {
    if (item.key.endsWith('/body')) {
      item.scaleX *= 1.1;
    }
    if (item.key.includes('/wing-')) {
      spreadFromCenter(item, side ? 1.09 : 1.14);
      item.scaleX *= 1.08;
    }
    if (item.key.endsWith('/tail')) {
      item.scaleX *= side ? 1.42 : 1.2;
      item.scaleY *= side ? 1.25 : 1.14;
      item.y += side ? 3 : 4;
    }
    if (movement && (item.key.includes('/body') || item.key.includes('/wing-') || item.key.endsWith('/tail'))) {
      // Blitzkamm changes weight quickly; one extra source pixel of lift is
      // enough to survive the 0.255 scale without turning into a pogo motion.
      item.y -= passing * movement;
    }
  });
  pose.shadow.width *= 1.08;
  return pose;
}
