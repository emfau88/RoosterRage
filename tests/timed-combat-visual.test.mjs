import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { runCombatVisual } from '../src/systems/TimedCombatVisual.js';

test('a slow frame cannot expire a laser ahead of its damage timer', () => {
  const events = new EventEmitter(), timers = [], frames = [];
  const scene = { events, time: { now: 100, addEvent: config => {
    const timer = { ...config, elapsed: 0, removed: false, remove() { this.removed = true; } };
    timers.push(timer); return timer;
  } } };
  let destroyed = 0, notified = 0;
  const record = runCombatVisual(scene, { destroy: () => destroyed++ }, 500, age => frames.push(age), () => notified++);
  const hit = { removed: false, remove() { this.removed = true; } }; record.timers.push(hit);
  scene.time.now = 2100; // Long render/startup stall; the capped timer delta is 16ms.
  timers[0].elapsed = 16; events.emit('postupdate');
  assert.equal(record.active, true); assert.equal(hit.removed, false); assert.equal(frames.at(-1), 16);
  events.emit('postupdate'); assert.equal(frames.at(-1), 16, 'paused timer must hold the frame');
  timers[0].elapsed = 500; events.emit('postupdate'); record.destroy();
  assert.equal(destroyed, 1); assert.equal(notified, 1); assert(hit.removed);
  assert.equal(events.listenerCount('postupdate'), 0); assert.equal(events.listenerCount('shutdown'), 0);
});

test('scene shutdown cancels pending hits and removes drawing listeners', () => {
  const events = new EventEmitter(); let removed = 0, destroyed = 0;
  const scene = { events, time: { addEvent: () => ({ elapsed: 0, remove: () => removed++ }) } };
  const record = runCombatVisual(scene, { destroy: () => destroyed++ }, 600, () => {});
  record.timers.push({ remove: () => removed++ }); events.emit('shutdown');
  assert.equal(removed, 2); assert.equal(destroyed, 1); assert.equal(record.active, false);
  assert.equal(events.listenerCount('postupdate'), 0);
});
