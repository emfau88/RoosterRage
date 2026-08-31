import test from 'node:test';
import assert from 'node:assert/strict';
import { ACE_DIRECTIONS, sampleAcePose } from '../src/ace-preview/aceFourDirectionPose.js';

function equalWithin(a, b, tolerance = 1e-9) {
  if (typeof a === 'number') assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
  else if (Array.isArray(a)) { assert.equal(a.length, b.length); a.forEach((value, index) => equalWithin(value, b[index], tolerance)); }
  else if (a && typeof a === 'object') { assert.deepEqual(Object.keys(a), Object.keys(b)); for (const key of Object.keys(a)) equalWithin(a[key], b[key], tolerance); }
  else assert.equal(a, b);
}

test('all four directions have seamless walk and idle loops with valid transforms', () => {
  for (const direction of ACE_DIRECTIONS) {
    equalWithin(sampleAcePose({ direction, phase: 0, movement: 1, timeMs: 250 }),
      sampleAcePose({ direction, phase: 1, movement: 1, timeMs: 250 }));
    equalWithin(sampleAcePose({ direction, movement: 0, timeMs: 0 }),
      sampleAcePose({ direction, movement: 0, timeMs: 2800 }));
    for (let frame = 0; frame < 240; frame++) {
      const pose = sampleAcePose({ direction, phase: frame / 240, movement: frame % 2, timeMs: frame * 11.5 });
      assert.ok(pose.parts.length >= 5);
      assert.ok(pose.parts.some((part) => part.key.endsWith('/body')));
      for (const part of pose.parts) {
        assert.ok(part.key.startsWith(`${pose.assetDirection}/`));
        for (const value of Object.values(part)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
        assert.ok(Math.abs(part.scaleX) > 0 && part.scaleY > 0);
      }
    }
  }
});

test('east is an exact geometric mirror of the authored west view', () => {
  for (let frame = 0; frame < 24; frame++) {
    const args = { phase: frame / 24, movement: 1, timeMs: frame * 23 };
    const west = sampleAcePose({ ...args, direction: 'west' });
    const east = sampleAcePose({ ...args, direction: 'east' });
    assert.equal(west.parts.length, east.parts.length);
    west.parts.forEach((part, index) => {
      const mirrored = east.parts[index];
      assert.equal(part.key, mirrored.key);
      equalWithin(part.x + mirrored.x, 256);
      equalWithin(part.y, mirrored.y);
      equalWithin(part.scaleX, -mirrored.scaleX);
      equalWithin(part.scaleY, mirrored.scaleY);
      equalWithin(part.rotation, -mirrored.rotation);
    });
  }
});

test('sampling one direction never mutates another direction or retains movement', () => {
  const resting = ACE_DIRECTIONS.map((direction) => sampleAcePose({ direction, movement: 0, timeMs: 731 }));
  for (const direction of ACE_DIRECTIONS) sampleAcePose({ direction, phase: 0.73, movement: 1, timeMs: 1222 });
  ACE_DIRECTIONS.forEach((direction, index) => equalWithin(resting[index], sampleAcePose({ direction, movement: 0, timeMs: 731 })));
});

test('side-view arms stay in front of the near thigh and north uses seamless complete rear legs', () => {
  for (const direction of ['west', 'east']) {
    const pose = sampleAcePose({ direction, phase: 0.25, movement: 1 });
    const keys = pose.parts.map((part) => part.key);
    assert.ok(keys.indexOf('west/foot-near') < keys.indexOf('west/wing-near'));
    const body = pose.parts.find((part) => part.key === 'west/body');
    const tail = pose.parts.find((part) => part.key === 'west/tail');
    assert.ok(tail.y - body.y >= 40, 'side-view tail must attach at the lower rear body');
  }
  const northKeys = sampleAcePose({ direction: 'north', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  for (const side of ['left', 'right']) {
    assert.ok(northKeys.includes(`north/leg-${side}`));
    assert.equal(northKeys.some((key) => key === `north/shin-${side}` || key === `north/foot-${side}`), false);
  }
});
