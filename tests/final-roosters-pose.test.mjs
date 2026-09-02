import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINAL_ROOSTER_DIRECTIONS,
  FINAL_ROOSTER_SCALE,
  sampleAceFinalPose,
  sampleArtilleryFinalPose,
  sampleStormFinalPose,
} from '../src/final-preview/finalRoosterPoses.js';
import { ACE_GAMEPLAY_IDLE_PERIOD_MS } from '../src/ace-preview/aceGameplayPose.js';
import { ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS } from '../src/artillery-preview/artilleryGameplayPose.js';
import { STORM_GAMEPLAY_IDLE_PERIOD_MS } from '../src/storm-preview/stormGameplayPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const getPart = (pose, key) => pose.parts.find((item) => item.key === key);

function equalWithin(a, b, tolerance = 1e-8) {
  if (typeof a === 'number') close(a, b, tolerance);
  else if (Array.isArray(a)) { assert.equal(a.length, b.length); a.forEach((value, index) => equalWithin(value, b[index], tolerance)); }
  else if (a && typeof a === 'object') { assert.deepEqual(Object.keys(a), Object.keys(b)); for (const key of Object.keys(a)) equalWithin(a[key], b[key], tolerance); }
  else assert.equal(a, b);
}

const rigs = [
  { id: 'ace', sample: sampleAceFinalPose, idle: ACE_GAMEPLAY_IDLE_PERIOD_MS, side: 'west', foot: 'west/foot-near', body: 'west/body' },
  { id: 'artillery', sample: sampleArtilleryFinalPose, idle: ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS, side: 'west', foot: 'west/leg-near', body: 'final/artillery-west-body-v1' },
  { id: 'storm', sample: sampleStormFinalPose, idle: STORM_GAMEPLAY_IDLE_PERIOD_MS, side: 'east', foot: 'east/leg-near', body: 'east/body' },
];

test('all final walk and idle rigs close their loops in four directions', () => {
  for (const rig of rigs) {
    for (const direction of FINAL_ROOSTER_DIRECTIONS) {
      equalWithin(rig.sample({ direction, phase: 0, movement: 1, timeMs: 180 }),
        rig.sample({ direction, phase: 1, movement: 1, timeMs: 180 }));
      equalWithin(rig.sample({ direction, movement: 0, timeMs: 0 }),
        rig.sample({ direction, movement: 0, timeMs: rig.idle }));
    }
  }
});

test('final side strides remain visible after production scaling', () => {
  for (const rig of rigs) {
    const positions = Array.from({ length: 240 }, (_, index) => getPart(
      rig.sample({ direction: rig.side, phase: index / 240, movement: 1 }), rig.foot).x);
    const gameStride = (Math.max(...positions) - Math.min(...positions)) * FINAL_ROOSTER_SCALE[rig.id];
    assert.ok(gameStride >= 9, `${rig.id} side stride ${gameStride.toFixed(2)}px is too subtle`);
  }
});

test('class-specific body lift is readable without making Bummbert hop', () => {
  const lift = (rig) => {
    const positions = Array.from({ length: 240 }, (_, index) => getPart(
      rig.sample({ direction: rig.side, phase: index / 240, movement: 1 }), rig.body).y);
    return (Math.max(...positions) - Math.min(...positions)) * FINAL_ROOSTER_SCALE[rig.id];
  };
  const values = Object.fromEntries(rigs.map((rig) => [rig.id, lift(rig)]));
  assert.ok(values.ace >= 1.9, `Ace lift ${values.ace}`);
  assert.ok(values.storm >= 1.9, `Blitzkamm lift ${values.storm}`);
  assert.ok(values.artillery >= 1.2 && values.artillery <= 1.6, `Bummbert lift ${values.artillery}`);
  assert.ok(values.artillery < values.ace && values.artillery < values.storm);
});

test('Bummbert final fist is rigidly seated in the profile cuff', () => {
  for (const direction of ['west', 'east']) {
    for (let index = 0; index < 32; index += 1) {
      const pose = sampleArtilleryFinalPose({ direction, phase: index / 32, movement: 1 });
      const body = getPart(pose, 'final/artillery-west-body-v1');
      const fist = getPart(pose, 'final/artillery-west-fist-near-v1');
      assert.ok(pose.parts.indexOf(body) < pose.parts.indexOf(fist));
      close(fist.rotation, body.rotation);
      const dx = fist.x - body.x;
      const dy = fist.y - body.y;
      const localX = dx * Math.cos(body.rotation) + dy * Math.sin(body.rotation);
      const localY = -dx * Math.sin(body.rotation) + dy * Math.cos(body.rotation);
      close(localX, direction === 'west' ? 24 : -24);
      close(localY, 55);
      assert.equal(fist.originX, 0.965);
      assert.equal(fist.originY, 0.08);
    }
  }
});

test('lifted final side feet travel forward instead of moonwalking', () => {
  const sampleAt = (sample, direction, phase, key) => getPart(sample({ direction, phase, movement: 1 }), key);
  for (const [sample, direction, key, forward, phases] of [
    [sampleAceFinalPose, 'west', 'west/foot-near', -1, [0.05, 0.25, 0.45]],
    [sampleArtilleryFinalPose, 'west', 'west/leg-near', -1, [0.55, 0.75, 0.95]],
    [sampleStormFinalPose, 'east', 'east/leg-near', 1, [0.55, 0.75, 0.95]],
  ]) {
    const [startPhase, peakPhase, endPhase] = phases;
    const start = sampleAt(sample, direction, startPhase, key);
    const peak = sampleAt(sample, direction, peakPhase, key);
    const end = sampleAt(sample, direction, endPhase, key);
    assert.ok((end.x - start.x) * forward > 0);
    assert.ok(peak.y < start.y && peak.y < end.y);
  }
});

test('final runtime sheets have eight real phases and preserve all rollbacks', () => {
  for (const { id } of rigs) {
    const finalDirectory = path.join(root, 'src', 'assets', 'characters', `${id}-final`);
    const manifest = JSON.parse(fs.readFileSync(path.join(finalDirectory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.clips.walk.columns, 8);
    assert.equal(manifest.clips.idle.columns, 8);
    for (const mode of ['walk', 'idle']) {
      assert.ok(fs.statSync(path.join(finalDirectory, `rooster-${id}-final-${mode}.webp`)).size > 100_000);
      assert.ok(fs.statSync(path.join(root, 'src', 'assets', 'characters', `${id}-gameplay`, `rooster-${id}-gameplay-${mode}.webp`)).size > 100_000);
    }
    assert.ok(fs.existsSync(path.join(root, 'src', 'assets', 'characters', `${id}-next`)));
    const legacy = id === 'ace' ? 'rooster-ace-walk-v2.webp' : `rooster-${id}-walk-v3.webp`;
    assert.ok(fs.statSync(path.join(root, 'src', 'assets', 'characters', legacy)).size > 100_000);
  }
});

test('final query selects eight-frame animation timing for every character', async () => {
  globalThis.window = { location: { search: '?roosterVisual=final' } };
  const config = await import('../src/config/aceVisual.js?final-rooster-test');
  delete globalThis.window;
  assert.deepEqual(config.NEXT_ROOSTER_WALK_FRAME_COUNT, { ace: 8, artillery: 8, storm: 8 });
  assert.equal(config.STORM_VISUAL_VERSION, 'final');
});

test('approved final roosters are the default production visuals', async () => {
  globalThis.window = { location: { search: '' } };
  const config = await import('../src/config/aceVisual.js?final-rooster-default-test');
  delete globalThis.window;
  assert.equal(config.ACE_VISUAL_VERSION, 'final');
  assert.equal(config.ARTILLERY_VISUAL_VERSION, 'final');
  assert.equal(config.STORM_VISUAL_VERSION, 'final');
  assert.deepEqual(config.NEXT_ROOSTER_WALK_FRAME_COUNT, { ace: 8, artillery: 8, storm: 8 });
});

test('global and per-character rollback paths remain available', async () => {
  globalThis.window = { location: { search: '?roosterVisual=legacy' } };
  const legacy = await import('../src/config/aceVisual.js?final-rooster-legacy-rollback-test');
  assert.equal(legacy.ACE_VISUAL_VERSION, 'legacy');
  assert.equal(legacy.ARTILLERY_VISUAL_VERSION, 'legacy');
  assert.equal(legacy.STORM_VISUAL_VERSION, 'legacy');

  globalThis.window = { location: { search: '?artilleryVisual=legacy' } };
  const selective = await import('../src/config/aceVisual.js?final-rooster-selective-rollback-test');
  delete globalThis.window;
  assert.equal(selective.ACE_VISUAL_VERSION, 'final');
  assert.equal(selective.ARTILLERY_VISUAL_VERSION, 'legacy');
  assert.equal(selective.STORM_VISUAL_VERSION, 'final');
});
