import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleAceSouthPose } from '../src/character-lab/aceSouthPose.js';

function equalWithin(a, b, tolerance = 1e-9) {
  if (typeof a === 'number') assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
  else if (Array.isArray(a)) { assert.equal(a.length, b.length); a.forEach((value, i) => equalWithin(value, b[i], tolerance)); }
  else if (a && typeof a === 'object') { assert.deepEqual(Object.keys(a), Object.keys(b)); for (const key of Object.keys(a)) equalWithin(a[key], b[key], tolerance); }
  else assert.equal(a, b);
}

test('walk joins exactly at the loop seam; idle joins at its own period', () => {
  equalWithin(sampleAceSouthPose({ phase: 0, movement: 1 }), sampleAceSouthPose({ phase: 1, movement: 1 }));
  equalWithin(sampleAceSouthPose({ timeMs: 0 }), sampleAceSouthPose({ timeMs: 2400 }));
});

test('shooting and hurt preserve the complete foot cycle', () => {
  for (let i = 0; i < 24; i++) {
    const args = { phase: i / 24, movement: 1, timeMs: i * 20 };
    const feet = (pose) => pose.parts.filter((part) => part.key.startsWith('foot-'));
    equalWithin(feet(sampleAceSouthPose(args)), feet(sampleAceSouthPose({ ...args, shotAgeMs: i * 10, hurtAgeMs: i * 10 })));
  }
});

test('the visual has no late action residue, no mutated sampler state, and no invalid transforms', () => {
  const resting = sampleAceSouthPose();
  sampleAceSouthPose({ movement: 1, shotAgeMs: 0, hurtAgeMs: 15 });
  equalWithin(resting, sampleAceSouthPose({ shotAgeMs: 500, hurtAgeMs: 500 }));
  for (let i = 0; i < 240; i++) {
    const pose = sampleAceSouthPose({ phase: i / 240, movement: 1, shotAgeMs: i, hurtAgeMs: i });
    assert.equal(pose.parts.filter((part) => part.key === 'body').length, 1);
    for (const part of pose.parts) {
      for (const value of Object.values(part)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
      assert.ok(part.alpha >= 0 && part.alpha <= 1);
      assert.ok(Math.abs(part.scaleX) > 0 && part.scaleY > 0);
    }
  }
});
