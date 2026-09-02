import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACE_GAMEPLAY_DIRECTIONS,
  ACE_GAMEPLAY_IDLE_PERIOD_MS,
  sampleAceGameplayPose,
} from '../src/ace-preview/aceGameplayPose.js';

const part = (pose, key) => pose.parts.find((item) => item.key === key);
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
function equalWithin(a, b, tolerance = 1e-9) {
  if (typeof a === 'number') near(a, b, tolerance);
  else if (Array.isArray(a)) {
    assert.equal(a.length, b.length);
    a.forEach((value, index) => equalWithin(value, b[index], tolerance));
  } else if (a && typeof a === 'object') {
    assert.deepEqual(Object.keys(a), Object.keys(b));
    for (const key of Object.keys(a)) equalWithin(a[key], b[key], tolerance);
  } else assert.equal(a, b);
}

test('gameplay profile loops cleanly and mirrors the side view exactly', () => {
  for (const direction of ACE_GAMEPLAY_DIRECTIONS) {
    equalWithin(
      sampleAceGameplayPose({ direction, phase: 0, movement: 1, timeMs: 300 }),
      sampleAceGameplayPose({ direction, phase: 1, movement: 1, timeMs: 300 }),
    );
    equalWithin(
      sampleAceGameplayPose({ direction, movement: 0, timeMs: 0 }),
      sampleAceGameplayPose({ direction, movement: 0, timeMs: ACE_GAMEPLAY_IDLE_PERIOD_MS }),
    );
  }
  for (let frame = 0; frame < 24; frame++) {
    const args = { phase: frame / 24, movement: 1, timeMs: frame * 21 };
    const west = sampleAceGameplayPose({ ...args, direction: 'west' });
    const east = sampleAceGameplayPose({ ...args, direction: 'east' });
    west.parts.forEach((item, index) => {
      const mirrored = east.parts[index];
      assert.equal(item.key, mirrored.key);
      near(item.x + mirrored.x, 256);
      near(item.y, mirrored.y);
      near(item.scaleX, -mirrored.scaleX);
      near(item.rotation, -mirrored.rotation);
    });
  }
});

test('four key poses carry readable body lift and alternating contacts', () => {
  for (const direction of ['south', 'west', 'north']) {
    const poses = [0, 0.25, 0.5, 0.75].map((phase) =>
      sampleAceGameplayPose({ direction, phase, movement: 1 }));
    const bodyKey = `${direction}/body`;
    const contactY = part(poses[0], bodyKey).y;
    const passingY = part(poses[1], bodyKey).y;
    assert.ok(contactY - passingY >= 7.9, `${direction} body lift is too subtle`);
    near(part(poses[0], bodyKey).y, part(poses[2], bodyKey).y);
    near(part(poses[1], bodyKey).y, part(poses[3], bodyKey).y);
  }

  const southLeft = [0, 0.5].map((phase) => part(
    sampleAceGameplayPose({ direction: 'south', phase, movement: 1 }), 'south/foot-left'));
  assert.ok(southLeft[0].y - southLeft[1].y >= 15.9, 'south contacts need a clear depth change');

  const westContact = sampleAceGameplayPose({ direction: 'west', phase: 0, movement: 1 });
  assert.ok(part(westContact, 'west/foot-far').x - part(westContact, 'west/foot-near').x >= 33.9,
    'side contact needs a clear stride');

  const westPassing = sampleAceGameplayPose({ direction: 'west', phase: 0.25, movement: 1 });
  assert.ok(part(westPassing, 'west/foot-far').y - part(westPassing, 'west/foot-near').y >= 14.5,
    'side passing pose needs a visibly raised near foot');
});

test('idle anchors feet while the body breathes visibly', () => {
  const phases = [0, 700, 1400, 2100].map((timeMs) =>
    sampleAceGameplayPose({ direction: 'south', movement: 0, timeMs }));
  for (const key of ['south/foot-left', 'south/foot-right']) {
    const anchor = part(phases[0], key);
    for (const pose of phases.slice(1)) assert.deepEqual(part(pose, key), anchor);
  }
  const bodyYs = phases.map((pose) => part(pose, 'south/body').y);
  assert.ok(Math.max(...bodyYs) - Math.min(...bodyYs) >= 7.9, 'idle breathing needs a two-pixel game-space range');
});

test('gameplay fists use anatomically correct torso and pauldron layers', () => {
  const south = sampleAceGameplayPose({ direction: 'south', phase: 0.2, movement: 1 });
  const southKeys = south.parts.map((item) => item.key);
  const southBody = southKeys.indexOf('south/body');
  const southFists = southKeys.reduce((indices, key, index) => (
    key === 'south/arm-fist-left-v1' ? [...indices, index] : indices
  ), []);
  const southArmor = southKeys.indexOf('south/shoulder-overlays-v1');
  assert.equal(southFists.length, 2);
  assert.ok(southFists.every((index) => southBody < index && index < southArmor),
    'south fists must sit in front of the chest but behind the pauldrons');

  const west = sampleAceGameplayPose({ direction: 'west', phase: 0.2, movement: 1 });
  const westKeys = west.parts.map((item) => item.key);
  assert.ok(westKeys.indexOf('west/body') < westKeys.indexOf('west/arm-fist-near-v2'));
  assert.ok(westKeys.indexOf('west/arm-fist-near-v2') < westKeys.indexOf('west/shoulder-near-overlay-v1'));

  const north = sampleAceGameplayPose({ direction: 'north', phase: 0.2, movement: 1 });
  const northKeys = north.parts.map((item) => item.key);
  const northBody = northKeys.indexOf('north/body');
  assert.equal(northKeys.filter((key) => key === 'north/arm-fist-left-v1').length, 2);
  assert.ok(northKeys.every((key, index) => key !== 'north/arm-fist-left-v1' || index < northBody),
    'rear-view fists must remain on the unseen front side of the torso');
});
