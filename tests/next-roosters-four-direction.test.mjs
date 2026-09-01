import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTILLERY_DIRECTIONS,
  ARTILLERY_IDLE_PERIOD_MS,
  sampleArtilleryPose
} from '../src/artillery-preview/artilleryFourDirectionPose.js';
import {
  STORM_DIRECTIONS,
  STORM_IDLE_PERIOD_MS,
  sampleStormPose
} from '../src/storm-preview/stormFourDirectionPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function equalWithin(a, b, tolerance = 1e-9) {
  if (typeof a === 'number') assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
  else if (Array.isArray(a)) { assert.equal(a.length, b.length); a.forEach((value, index) => equalWithin(value, b[index], tolerance)); }
  else if (a && typeof a === 'object') { assert.deepEqual(Object.keys(a), Object.keys(b)); for (const key of Object.keys(a)) equalWithin(a[key], b[key], tolerance); }
  else assert.equal(a, b);
}

function verifyRig(directions, sample, idlePeriod) {
  for (const direction of directions) {
    equalWithin(sample({ direction, phase: 0, movement: 1, timeMs: 250 }),
      sample({ direction, phase: 1, movement: 1, timeMs: 250 }));
    equalWithin(sample({ direction, movement: 0, timeMs: 0 }),
      sample({ direction, movement: 0, timeMs: idlePeriod }));
    for (let frame = 0; frame < 120; frame += 1) {
      const pose = sample({ direction, phase: frame / 120, movement: frame % 2, timeMs: frame * 19 });
      assert.ok(pose.parts.length >= 5);
      assert.ok(pose.parts.some((part) => part.key.endsWith('/body')));
      for (const item of pose.parts) {
        assert.ok(item.key.startsWith(`${pose.assetDirection}/`));
        for (const value of Object.values(item)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
        assert.ok(Math.abs(item.scaleX) > 0 && item.scaleY > 0);
      }
    }
  }
}

test('Bummbert and Blitzkamm have seamless four-direction walk and idle rigs', () => {
  verifyRig(ARTILLERY_DIRECTIONS, sampleArtilleryPose, ARTILLERY_IDLE_PERIOD_MS);
  verifyRig(STORM_DIRECTIONS, sampleStormPose, STORM_IDLE_PERIOD_MS);
});

test('side views are exact mirrors of their canonical authored directions', () => {
  for (let frame = 0; frame < 24; frame += 1) {
    const args = { phase: frame / 24, movement: 1, timeMs: frame * 23 };
    const artilleryWest = sampleArtilleryPose({ ...args, direction: 'west' });
    const artilleryEast = sampleArtilleryPose({ ...args, direction: 'east' });
    artilleryWest.parts.forEach((item, index) => {
      const mirrored = artilleryEast.parts[index];
      assert.equal(item.key, mirrored.key);
      equalWithin(item.x + mirrored.x, 256);
      equalWithin(item.y, mirrored.y);
      equalWithin(item.scaleX, -mirrored.scaleX);
      equalWithin(item.rotation, -mirrored.rotation);
    });

    const stormEast = sampleStormPose({ ...args, direction: 'east' });
    const stormWest = sampleStormPose({ ...args, direction: 'west' });
    stormEast.parts.forEach((item, index) => {
      const mirrored = stormWest.parts[index];
      assert.equal(item.key, mirrored.key);
      equalWithin(item.x + mirrored.x, 256);
      equalWithin(item.y, mirrored.y);
      equalWithin(item.scaleX, -mirrored.scaleX);
      equalWithin(item.rotation, -mirrored.rotation);
    });
  }
});

test('arms and complete north legs preserve the required anatomy and layer order', () => {
  const artillerySideKeys = sampleArtilleryPose({ direction: 'west', phase: 0.25, movement: 1 }).parts.map((item) => item.key);
  assert.ok(artillerySideKeys.indexOf('west/leg-near') < artillerySideKeys.indexOf('west/wing-near'));
  const stormSideKeys = sampleStormPose({ direction: 'east', phase: 0.25, movement: 1 }).parts.map((item) => item.key);
  assert.ok(stormSideKeys.indexOf('east/leg-near') < stormSideKeys.indexOf('east/wing-near'));

  for (const [name, pose] of [
    ['Bummbert', sampleArtilleryPose({ direction: 'north', phase: 0.25, movement: 1 })],
    ['Blitzkamm', sampleStormPose({ direction: 'north', phase: 0.25, movement: 1 })]
  ]) {
    const keys = pose.parts.map((item) => item.key);
    assert.ok(keys.indexOf('north/wing-left') < keys.indexOf('north/body'), `${name} left arm root must be hidden behind the back body`);
    assert.ok(keys.indexOf('north/wing-right') < keys.indexOf('north/body'), `${name} right arm root must be hidden behind the back body`);
    assert.ok(keys.indexOf('north/tail') > keys.indexOf('north/body'), `${name} tail must attach over the low rump`);
    for (const side of ['left', 'right']) {
      assert.ok(keys.includes(`north/leg-${side}`));
      assert.equal(keys.some((key) => key === `north/shin-${side}` || key === `north/foot-${side}`), false);
    }
  }
});

test('runtime atlases and rollback manifests are present for both roosters', () => {
  for (const id of ['artillery', 'storm']) {
    const directory = path.join(root, 'src', 'assets', 'characters', `${id}-next`);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.frameWidth, 256);
    assert.equal(manifest.frameHeight, 256);
    assert.equal(manifest.clips.walk.columns, 4);
    assert.equal(manifest.clips.idle.columns, 8);
    for (const mode of ['walk', 'idle']) {
      const asset = path.join(directory, `rooster-${id}-next-${mode}.webp`);
      assert.ok(fs.statSync(asset).size > 100_000, `${asset} is unexpectedly small`);
    }
    assert.ok(fs.statSync(path.join(root, 'src', 'assets', 'characters', `rooster-${id}-walk-v3.webp`)).size > 100_000);
  }
});
