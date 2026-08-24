import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const recipes = [
  { id: 'evo-sunshot-array', base: 'primary-ace-rank', rank: 3, passive: 'ace-deadeye-drill', primary: true, rooster: 'ace' },
  { id: 'evo-siegebreaker-shell', base: 'primary-artillery-rank', rank: 3, passive: 'artillery-reinforced-breech', primary: true, rooster: 'artillery' },
  { id: 'evo-tempest-crown', base: 'primary-storm-rank', rank: 3, passive: 'storm-static-plumage', primary: true, rooster: 'storm' },
  { id: 'evo-solar-scramble', base: 'golden-egg', rank: 4, passive: 'fire-eggs', ability: 'goldenEgg' },
  { id: 'evo-thunder-roost', base: 'lightning-comb', rank: 4, passive: 'critical-yolk', ability: 'lightningComb', textures: ['evo-thunder-roost-impact'] },
  { id: 'evo-shell-halo', base: 'orbit-eggs', rank: 4, passive: 'armor', ability: 'orbitEggs', count: 6, textures: ['evo-shell-halo-projectile', 'evo-shell-halo-impact'], activeTextures: 'orbitTextures' },
  { id: 'evo-broodstorm', base: 'rocket-egg', rank: 4, passive: 'bigger-eggs', ability: 'rocketEgg' },
  { id: 'evo-singularity-nest', base: 'void-nest', rank: 4, passive: 'xp-magnet', ability: 'voidNest', zones: 'voidZones', textures: ['evo-singularity-nest-zone'], activeTextures: 'voidZoneTextures' },
  { id: 'evo-phoenix-pan', base: 'molotov-egg', rank: 4, passive: 'regen', ability: 'molotovEgg', zones: 'hazardZones', textures: ['molotov-egg-evo', 'molotov-ground-evo'] },
  { id: 'evo-dawn-laser', base: 'laser-comb', rank: 4, passive: 'swift-shells', ability: 'laserComb', textures: ['evo-dawn-laser-emitter', 'evo-dawn-laser-impact'] },
  { id: 'evo-chick-squadron', base: 'support-chick', rank: 5, passive: 'faster-eggs', ability: 'supportChick', count: 4, textures: ['support-chick-evo-sheet', 'evo-chick-squadron-projectile', 'evo-chick-squadron-impact'], activeTextures: 'supportTextures' }
];

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

async function openGame(browser, serverUrl, seed, rooster = 'ace') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=${seed}&profile=average`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getLoadout);
  await page.evaluate((roosterId) => {
    window.__ROOSTER_TEST__.selectRooster(roosterId);
    window.__ROOSTER_TEST__.pauseWaves();
    window.__ROOSTER_TEST__.clearEnemies();
    window.__ROOSTER_TEST__.clearProjectiles();
    window.__ROOSTER_TEST__.setPlayerLevel(20);
  }, rooster);
  return { page, errors };
}

async function testSlotsAndReroll(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'phase-11-slots');
  try {
    await page.evaluate(() => {
      ['golden-egg', 'molotov-egg', 'lightning-comb', 'void-nest'].forEach((id) => (
        window.__ROOSTER_TEST__.applyUpgradeById(id)
      ));
      ['max-hp', 'move-speed', 'armor', 'regen'].forEach((id) => (
        window.__ROOSTER_TEST__.applyUpgradeById(id)
      ));
    });
    const filled = await page.evaluate(() => ({
      loadout: window.__ROOSTER_TEST__.getLoadout(),
      available: window.__ROOSTER_TEST__.getAvailableUpgradeIds()
    }));
    assert(filled.loadout.active.length === 5 && filled.loadout.activeFree === 0,
      'Active slots do not include start weapon plus four abilities.', filled);
    assert(filled.loadout.passive.length === 4 && filled.loadout.passiveFree === 0,
      'Passive slot cap is not four.', filled);
    assert(!filled.available.includes('rocket-egg'), 'A new active was offered with no active slot.', filled);
    assert(!filled.available.includes('xp-magnet'), 'A new passive was offered with no passive slot.', filled);
    assert(filled.available.includes('golden-egg') && filled.available.includes('max-hp'),
      'Owned rank-ups were blocked by full slots.', filled);

    await page.evaluate(() => window.__ROOSTER_TEST__.grantXp(2000));
    const rerolled = await page.evaluate(() => ({
      first: window.__ROOSTER_TEST__.rerollUpgradeChoices(),
      second: window.__ROOSTER_TEST__.rerollUpgradeChoices(),
      loadout: window.__ROOSTER_TEST__.getLoadout()
    }));
    assert(rerolled.first && !rerolled.second && rerolled.loadout.rerollsRemaining === 0,
      'One-per-run reroll was not enforced.', rerolled);
    assert(errors.length === 0, 'Browser errors in slot/reroll scenario.', errors);
    return { filled, rerolled };
  } finally {
    await page.close();
  }
}

async function testRecipe(browser, serverUrl, recipe) {
  const { page, errors } = await openGame(browser, serverUrl, recipe.id, recipe.rooster ?? 'ace');
  try {
    const before = await page.evaluate((id) => window.__ROOSTER_TEST__.getAvailableUpgradeIds().includes(id), recipe.id);
    assert(!before, `${recipe.id} was available before its recipe.`, { recipe });
    await page.evaluate(({ base, rank, passive, passiveRank = 1 }) => {
      for (let index = 0; index < rank; index += 1) {
        window.__ROOSTER_TEST__.applyUpgradeById(base);
      }
      for (let index = 0; index < passiveRank; index += 1) {
        window.__ROOSTER_TEST__.applyUpgradeById(passive);
      }
    }, recipe);
    const ready = await page.evaluate((id) => window.__ROOSTER_TEST__.getAvailableUpgradeIds().includes(id), recipe.id);
    assert(ready, `${recipe.id} was not available with a complete recipe.`, { recipe });
    await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), recipe.id);
    await page.evaluate(() => {
      const centerX = 700;
      const centerY = 450;
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12;
        window.__ROOSTER_TEST__.spawnEnemyType(
          'slime',
          centerX + Math.cos(angle) * (105 + (index % 3) * 34),
          centerY + Math.sin(angle) * (105 + (index % 3) * 34),
          { hp: 9999, speed: 0, damage: 0, xpOverride: 0 }
        );
      }
    });
    await page.waitForTimeout(1700);
    const result = await page.evaluate(() => ({
      loadout: window.__ROOSTER_TEST__.getLoadout(),
      abilities: window.__ROOSTER_TEST__.getAbilityState(),
      player: window.__ROOSTER_TEST__.getPlayerStats(),
      state: window.__ROOSTER_TEST__.getState(),
      telemetry: window.__ROOSTER_TEST__.getTelemetry(),
      visuals: window.__ROOSTER_TEST__.getEvolutionVisualState()
    }));
    assert(result.loadout.evolutions.some((evolution) => evolution.id === recipe.id),
      `${recipe.id} is absent from loadout.`, result);
    if (recipe.primary) {
      assert(result.player.primaryEvolution === recipe.id,
        `${recipe.id} did not evolve its class start weapon.`, result);
    } else {
      assert(result.abilities[recipe.ability]?.evolved, `${recipe.id} did not evolve runtime behavior.`, result);
    }
    if (recipe.count) {
      assert(result.abilities[recipe.ability].count === recipe.count,
        `${recipe.id} did not create ${recipe.count} companions.`, result);
    }
    if (recipe.zones) {
      assert(result.state[recipe.zones] >= 2, `${recipe.id} did not create two zones.`, result);
    }
    if (recipe.textures) {
      assert(recipe.textures.every((texture) => result.visuals.loadedTextures.includes(texture)),
        `${recipe.id} did not load all dedicated visual assets.`, result.visuals);
    }
    if (recipe.activeTextures) {
      assert(result.visuals[recipe.activeTextures].every((texture) => recipe.textures.includes(texture)),
        `${recipe.id} did not use its dedicated runtime texture.`, result.visuals);
    }
    assert((result.telemetry.effectiveDamageBySource[recipe.id] ?? 0) > 0,
      `${recipe.id} produced no attributed combat damage.`, result.telemetry);
    assert(errors.length === 0, `Browser errors in ${recipe.id}.`, errors);
    return {
      id: recipe.id,
      damage: result.telemetry.effectiveDamageBySource[recipe.id],
      ability: recipe.primary ? { primaryEvolution: result.player.primaryEvolution } : result.abilities[recipe.ability],
      peakObjects: result.telemetry.peakObjects
    };
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const slots = await testSlotsAndReroll(browser, serverState.url);
    const evolutions = [];
    for (const recipe of recipes) {
      evolutions.push(await testRecipe(browser, serverState.url, recipe));
    }
    const report = { generatedAt: new Date().toISOString(), slots, evolutions };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'evolution-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster loadout/EVO gate passed.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
