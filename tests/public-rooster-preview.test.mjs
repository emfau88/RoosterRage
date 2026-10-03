import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicRoosterPreview } from '../src/config/publicRoosterPreview.js';
import { MetaProgressionSystem } from '../src/systems/MetaProgressionSystem.js';

test('immediate rooster availability is limited to the public portal preview', () => {
  for (const suffix of ['', 'index.html', '?seed=preview']) {
    assert.equal(isPublicRoosterPreview(new URL(`https://emfau88.github.io/RoosterRage/kongregate/${suffix}`)), true);
  }
  for (const url of [
    'https://emfau88.github.io/RoosterRage/',
    'https://emfau88.github.io/RoosterRage/kongregate/other/',
    'https://www.kongregate.com/RoosterRage/kongregate/',
    'http://127.0.0.1:5173/'
  ]) assert.equal(isPublicRoosterPreview(new URL(url)), false);
  assert.equal(isPublicRoosterPreview(null), false);
});

test('preview selection works for fresh and reset saves without granting progression', (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete globalThis.location;
  });
  globalThis.location = new URL('https://emfau88.github.io/RoosterRage/kongregate/');
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const meta = new MetaProgressionSystem(storage);
  for (const id of ['ace', 'artillery', 'storm']) assert.equal(meta.isRoosterUnlocked(id), true);
  assert.equal(meta.isRoosterUnlocked('unknown'), false);
  meta.reset();
  assert.deepEqual(meta.state.unlockedRoosters, ['ace']);
  assert.equal(meta.state.kernels, 0);
  assert.equal(meta.state.victories, 0);
  for (const saved of values.values()) assert.deepEqual(JSON.parse(saved).unlockedRoosters, ['ace']);
  globalThis.location = new URL('https://emfau88.github.io/RoosterRage/');
  const normal = new MetaProgressionSystem(storage);
  assert.equal(normal.isRoosterUnlocked('ace'), true);
  assert.equal(normal.isRoosterUnlocked('artillery'), false);
  assert.equal(normal.isRoosterUnlocked('storm'), false);
  normal.state.totalKills = 75;
  normal.evaluateUnlocks();
  assert.equal(normal.isRoosterUnlocked('artillery'), true);
  assert.equal(normal.isRoosterUnlocked('storm'), false);
});
