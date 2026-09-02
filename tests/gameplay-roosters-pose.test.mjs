import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTILLERY_GAMEPLAY_DIRECTIONS,
  ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS,
  sampleArtilleryGameplayPose,
} from '../src/artillery-preview/artilleryGameplayPose.js';
import {
  STORM_GAMEPLAY_DIRECTIONS,
  STORM_GAMEPLAY_IDLE_PERIOD_MS,
  sampleStormGameplayPose,
} from '../src/storm-preview/stormGameplayPose.js';

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
      for (const item of pose.parts) {
        assert.ok(item.key.startsWith(`${pose.assetDirection}/`));
        for (const value of Object.values(item)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
        assert.ok(Math.abs(item.scaleX) > 0 && item.scaleY > 0);
      }
    }
  }
}

test('compact gameplay rigs loop in all directions and include idle motion', () => {
  verifyRig(ARTILLERY_GAMEPLAY_DIRECTIONS, sampleArtilleryGameplayPose, ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS);
  verifyRig(STORM_GAMEPLAY_DIRECTIONS, sampleStormGameplayPose, STORM_GAMEPLAY_IDLE_PERIOD_MS);
});

test('Bummbert owns one upper-arm pair and only layers lower arms separately', () => {
  const south = sampleArtilleryGameplayPose({ direction: 'south', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.equal(south.some((key) => key.includes('/wing-')), false);
  assert.ok(south.indexOf('south/body') < south.indexOf('south/forearm-fist-left-v1'));
  assert.ok(south.indexOf('south/body') < south.indexOf('south/forearm-fist-right-v1'));

  const west = sampleArtilleryGameplayPose({ direction: 'west', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.equal(west.some((key) => key.includes('/wing-')), false);
  assert.ok(west.indexOf('west/leg-near') < west.indexOf('west/body-gameplay-v3'));
  assert.ok(west.indexOf('west/body-gameplay-v3') < west.indexOf('west/fist-near-v1'));

  const north = sampleArtilleryGameplayPose({ direction: 'north', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.ok(north.indexOf('north/forearm-left-v1') < north.indexOf('north/body'));
  assert.ok(north.indexOf('north/forearm-right-v1') < north.indexOf('north/body'));
});

test('Bummbert north lower body follows the visible torso center', () => {
  const parts = sampleArtilleryGameplayPose({ direction: 'north', movement: 0, timeMs: 0 }).parts;
  const body = parts.find((part) => part.key === 'north/body');
  const tail = parts.find((part) => part.key === 'north/tail');
  const left = parts.find((part) => part.key === 'north/leg-left');
  const right = parts.find((part) => part.key === 'north/leg-right');
  const lowerCenter = (left.x + right.x) / 2;

  // The painted torso mass sits about three rendered pixels right of the
  // source canvas midpoint.  Tail and legs must follow that visible center.
  assert.equal(lowerCenter - body.x, 3);
  assert.equal(tail.x - body.x, 3);
});

test('Blitzkamm keeps hip joins masked and front arms above the torso', () => {
  const south = sampleStormGameplayPose({ direction: 'south', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.equal(south[0], 'south/leg-right');
  assert.equal(south[1], 'south/leg-left');
  assert.ok(south.indexOf('south/leg-right') < south.indexOf('south/body'));
  assert.ok(south.indexOf('south/body') < south.indexOf('south/wing-left'));

  const east = sampleStormGameplayPose({ direction: 'east', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.ok(east.indexOf('east/leg-near') < east.indexOf('east/body'));
  assert.ok(east.indexOf('east/body') < east.indexOf('east/wing-near'));

  const north = sampleStormGameplayPose({ direction: 'north', phase: 0.25, movement: 1 }).parts.map((part) => part.key);
  assert.ok(north.indexOf('north/wing-left') < north.indexOf('north/body'));
  assert.ok(north.indexOf('north/wing-right') < north.indexOf('north/body'));
});

test('side walk contacts have a clearly readable fore-aft range', () => {
  for (const [name, sample, direction, keys] of [
    ['Bummbert', sampleArtilleryGameplayPose, 'west', ['west/leg-far', 'west/leg-near']],
    ['Blitzkamm', sampleStormGameplayPose, 'east', ['east/leg-far', 'east/leg-near']],
  ]) {
    for (const key of keys) {
      const positions = Array.from({ length: 48 }, (_, index) =>
        sample({ direction, phase: index / 48, movement: 1 }).parts.find((part) => part.key === key).x);
      assert.ok(Math.max(...positions) - Math.min(...positions) >= 37, `${name} ${key} stride is too small`);
    }
  }
});

test('both side feet point in the travel direction before and after mirroring', () => {
  const artilleryWest = sampleArtilleryGameplayPose({ direction: 'west', phase: 0.2, movement: 1 }).parts;
  const artilleryEast = sampleArtilleryGameplayPose({ direction: 'east', phase: 0.2, movement: 1 }).parts;
  assert.ok(artilleryWest.find((part) => part.key === 'west/leg-far').scaleX < 0,
    'Bummbert far source leg must be mirrored to face west');
  assert.ok(artilleryWest.find((part) => part.key === 'west/leg-near').scaleX > 0,
    'Bummbert near source leg already faces west');
  assert.ok(artilleryEast.find((part) => part.key === 'west/leg-far').scaleX > 0,
    'Bummbert mirrored far leg must face east');
  assert.ok(artilleryEast.find((part) => part.key === 'west/leg-near').scaleX < 0,
    'Bummbert mirrored near leg must face east');

  const stormEast = sampleStormGameplayPose({ direction: 'east', phase: 0.2, movement: 1 }).parts;
  const stormWest = sampleStormGameplayPose({ direction: 'west', phase: 0.2, movement: 1 }).parts;
  assert.ok(stormEast.find((part) => part.key === 'east/leg-far').scaleX < 0,
    'Blitzkamm far source leg must be mirrored to face east');
  assert.ok(stormEast.find((part) => part.key === 'east/leg-near').scaleX > 0,
    'Blitzkamm near source leg already faces east');
  assert.ok(stormWest.find((part) => part.key === 'east/leg-far').scaleX > 0,
    'Blitzkamm mirrored far leg must face west');
  assert.ok(stormWest.find((part) => part.key === 'east/leg-near').scaleX < 0,
    'Blitzkamm mirrored near leg must face west');
});

test('lifted side feet swing forward instead of producing a backwards walk', () => {
  const position = (sample, direction, phase, key) => {
    const part = sample({ direction, phase, movement: 1 }).parts.find((item) => item.key === key);
    return { x: part.x, y: part.y };
  };

  // Bummbert faces west: forward is decreasing X. His far foot flies during
  // the first half-cycle and the near foot during the second half-cycle.
  const artilleryFarStart = position(sampleArtilleryGameplayPose, 'west', 0.05, 'west/leg-far');
  const artilleryFarPeak = position(sampleArtilleryGameplayPose, 'west', 0.25, 'west/leg-far');
  const artilleryFarEnd = position(sampleArtilleryGameplayPose, 'west', 0.45, 'west/leg-far');
  assert.ok(artilleryFarEnd.x < artilleryFarStart.x);
  assert.ok(artilleryFarPeak.y < artilleryFarStart.y && artilleryFarPeak.y < artilleryFarEnd.y);
  const artilleryNearStart = position(sampleArtilleryGameplayPose, 'west', 0.55, 'west/leg-near');
  const artilleryNearPeak = position(sampleArtilleryGameplayPose, 'west', 0.75, 'west/leg-near');
  const artilleryNearEnd = position(sampleArtilleryGameplayPose, 'west', 0.95, 'west/leg-near');
  assert.ok(artilleryNearEnd.x < artilleryNearStart.x);
  assert.ok(artilleryNearPeak.y < artilleryNearStart.y && artilleryNearPeak.y < artilleryNearEnd.y);

  // Blitzkamm faces east: forward is increasing X.
  const stormFarStart = position(sampleStormGameplayPose, 'east', 0.05, 'east/leg-far');
  const stormFarPeak = position(sampleStormGameplayPose, 'east', 0.25, 'east/leg-far');
  const stormFarEnd = position(sampleStormGameplayPose, 'east', 0.45, 'east/leg-far');
  assert.ok(stormFarEnd.x > stormFarStart.x);
  assert.ok(stormFarPeak.y < stormFarStart.y && stormFarPeak.y < stormFarEnd.y);
  const stormNearStart = position(sampleStormGameplayPose, 'east', 0.55, 'east/leg-near');
  const stormNearPeak = position(sampleStormGameplayPose, 'east', 0.75, 'east/leg-near');
  const stormNearEnd = position(sampleStormGameplayPose, 'east', 0.95, 'east/leg-near');
  assert.ok(stormNearEnd.x > stormNearStart.x);
  assert.ok(stormNearPeak.y < stormNearStart.y && stormNearPeak.y < stormNearEnd.y);
});

test('gameplay runtime sheets use eight walk and idle phases without replacing rollback assets', () => {
  for (const id of ['artillery', 'storm']) {
    const directory = path.join(root, 'src', 'assets', 'characters', `${id}-gameplay`);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.clips.walk.columns, 8);
    assert.equal(manifest.clips.idle.columns, 8);
    for (const mode of ['walk', 'idle']) {
      const asset = path.join(directory, `rooster-${id}-gameplay-${mode}.webp`);
      assert.ok(fs.statSync(asset).size > 100_000, `${asset} is unexpectedly small`);
    }
    assert.ok(fs.statSync(path.join(root, 'src', 'assets', 'characters', `${id}-next`, `rooster-${id}-next-walk.webp`)).size > 100_000);
    assert.ok(fs.statSync(path.join(root, 'src', 'assets', 'characters', `rooster-${id}-walk-v3.webp`)).size > 100_000);
  }
});
