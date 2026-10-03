import test from 'node:test';
import assert from 'node:assert/strict';
import { MetaProgressionSystem } from '../src/systems/MetaProgressionSystem.js';

test('saved second skins stay owned but cannot tint or appear in the release hub', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const meta = new MetaProgressionSystem(storage);
  const skins = { ace: 'ace-sunrise', artillery: 'artillery-ironclad', storm: 'storm-violet' };
  meta.state.unlockedCosmetics = Object.values(skins);
  meta.state.selectedCosmetics = { ...skins };
  meta.save();
  const restored = new MetaProgressionSystem(storage);
  for (const [rooster, skin] of Object.entries(skins)) {
    assert.equal(restored.getSelectedCosmetic(rooster), null);
    assert.equal(restored.selectCosmetic(rooster, skin), false);
  }
  const hub = restored.getHubState(Object.keys(skins).map(id => ({ id })));
  assert(hub.roosters.every(rooster => rooster.selectedCosmetic === null && rooster.cosmetics.length === 0));
  restored.state.totalKills = 999;
  restored.state.roosterWins = { artillery: 10, storm: 10 };
  restored.evaluateUnlocks();
  assert.deepEqual(restored.state.unlockedCosmetics, Object.values(skins));
  assert.deepEqual(restored.state.selectedCosmetics, skins);
});
