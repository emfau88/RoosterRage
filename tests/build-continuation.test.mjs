import test from 'node:test';
import assert from 'node:assert/strict';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';
import { LoadoutSystem } from '../src/systems/LoadoutSystem.js';
import { RandomSystem } from '../src/systems/RandomSystem.js';

function fixture(seed = 'build-continuation', roosterId = 'ace') {
  const ranks = new Map();
  const player = { roosterId, level: 12, hp: 100, maxHp: 100,
    getUpgradeRank: (id) => ranks.get(id) ?? 0 };
  const scene = { player, time: { now: 0 } };
  player.scene = scene;
  scene.loadout = new LoadoutSystem(scene);
  scene.loadout.initializeStartWeapon({ id: roosterId, primary: { name: 'Starting weapon' } });
  const system = new UpgradeSystem(undefined, new RandomSystem(seed));
  const acquire = (id) => {
    const upgrade = system.upgrades.find((item) => item.id === id);
    assert(system.isAvailable(upgrade, player), `Invalid fixture pick: ${id}`);
    ranks.set(id, player.getUpgradeRank(id) + 1);
    scene.loadout.onUpgradeApplied(upgrade, player);
  };
  return { player, scene, system, acquire };
}

test('early choices retain starting-weapon progress and introduce an ability', () => {
  for (const rooster of ['ace', 'artillery', 'storm']) {
    for (let seed = 0; seed < 80; seed++) {
      const { system, player } = fixture(seed, rooster);
      player.level = 2;
      const choices = system.getChoices(3, player);
      assert(choices.some((item) => item.id === `primary-${rooster}-rank`));
      assert(choices.some((item) => ['active', 'orbit', 'summon'].includes(item.category)));
      assert.equal(new Set(choices.map((item) => item.id)).size, 3);
    }
  }
});

test('an acquired secondary ability has a reliable continuation across seeds', () => {
  const alternatives = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const { system, player, acquire } = fixture(seed);
    acquire('support-chick');
    const choices = system.getChoices(3, player);
    assert(choices.some((item) => item.id === 'support-chick'));
    choices.filter((item) => item.id !== 'support-chick').forEach((item) => alternatives.add(item.id));
  }
  assert(alternatives.size > 10, 'Build support removed meaningful alternatives');
});

test('a maxed rocket is offered its missing EVO ingredient, then its EVO', () => {
  for (let seed = 0; seed < 80; seed++) {
    const { system, player, acquire } = fixture(seed);
    for (let rank = 0; rank < 4; rank++) acquire('rocket-egg');
    acquire('fire-eggs'); // The rocket/fire synergy is already complete.
    assert(system.getChoices(3, player).some((item) => item.id === 'bigger-eggs'));
    acquire('bigger-eggs');
    assert(system.getChoices(3, player).some((item) => item.id === 'evo-broodstorm'));
  }
});

test('ready EVO, starting rank and secondary rank cannot displace each other', () => {
  for (let seed = 0; seed < 100; seed++) {
    const { system, player, acquire } = fixture(seed);
    for (let rank = 0; rank < 4; rank++) acquire('rocket-egg');
    acquire('bigger-eggs');
    acquire('support-chick');
    const ids = system.getChoices(3, player).map((item) => item.id).sort();
    assert.deepEqual(ids, ['evo-broodstorm', 'primary-ace-rank', 'support-chick']);
    assert.equal(system.getChoices(1, player)[0].id, 'evo-broodstorm');
    assert.equal(system.getChoices(0, player).length, 0);
  }
});

test('build support respects full slots, maximum ranks, level and class restrictions', () => {
  const { system, player, acquire } = fixture();
  ['rocket-egg', 'molotov-egg', 'lightning-comb', 'support-chick',
    'armor', 'max-hp', 'regen', 'move-speed'].forEach(acquire);
  const unavailable = new Set(['bigger-eggs', 'fire-eggs', 'orbit-eggs', 'void-nest', 'golden-egg']);
  for (let i = 0; i < 100; i++) {
    const choices = system.getChoices(3, player);
    assert(choices.some((item) => ['rocket-egg', 'molotov-egg', 'lightning-comb', 'support-chick'].includes(item.id)));
    assert(choices.every((item) => !unavailable.has(item.id) && system.isAvailable(item, player)));
    assert(choices.every((item) => !item.classId || item.classId === 'ace'));
  }
  for (let rank = 1; rank < 5; rank++) acquire('support-chick');
  player.level = 2;
  for (let i = 0; i < 30; i++) {
    const ids = system.getChoices(3, player).map((item) => item.id);
    assert(!ids.includes('support-chick'));
    assert(!ids.includes('rocket-egg'));
  }
});

test('natural build choices remain seeded, unique and legal over full pick sequences', () => {
  for (let seed = 0; seed < 50; seed++) {
    const a = fixture(seed), b = fixture(seed);
    for (let level = 2; level <= 16; level++) {
      a.player.level = b.player.level = level;
      const ac = a.system.getChoices(3, a.player);
      const bc = b.system.getChoices(3, b.player);
      assert.deepEqual(ac.map((item) => item.id), bc.map((item) => item.id));
      assert.equal(new Set(ac.map((item) => item.id)).size, ac.length);
      assert(ac.every((item) => a.system.isAvailable(item, a.player)));
      const pick = ac[(seed + level) % ac.length];
      if (pick) { a.acquire(pick.id); b.acquire(pick.id); }
    }
  }
});
