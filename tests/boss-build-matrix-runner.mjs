import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const builds = [
  {
    id: 'ace-deadeye',
    rooster: 'ace',
    upgrades: ['primary-ace-rank', 'primary-ace-rank', 'primary-ace-rank',
      'critical-yolk', 'critical-yolk', 'critical-yolk', 'ricochet-eggs', 'ricochet-eggs',
      'golden-egg', 'golden-egg', 'golden-egg', 'golden-egg', 'armor', 'armor', 'regen']
  },
  {
    id: 'ace-orbit-chain',
    rooster: 'ace',
    upgrades: ['primary-ace-rank', 'primary-ace-rank', 'primary-ace-rank',
      'orbit-eggs', 'orbit-eggs', 'orbit-eggs', 'orbit-eggs',
      'lightning-comb', 'lightning-comb', 'lightning-comb', 'lightning-comb',
      'armor', 'armor', 'max-hp', 'max-hp']
  },
  {
    id: 'artillery-broodstorm',
    rooster: 'artillery',
    upgrades: ['primary-artillery-rank', 'primary-artillery-rank', 'primary-artillery-rank',
      'rocket-egg', 'rocket-egg', 'rocket-egg', 'rocket-egg',
      'molotov-egg', 'molotov-egg', 'molotov-egg', 'molotov-egg',
      'fire-eggs', 'fire-eggs', 'armor', 'armor']
  },
  {
    id: 'artillery-laser-line',
    rooster: 'artillery',
    upgrades: ['primary-artillery-rank', 'primary-artillery-rank', 'primary-artillery-rank',
      'laser-comb', 'laser-comb', 'laser-comb', 'laser-comb',
      'golden-egg', 'golden-egg', 'golden-egg', 'golden-egg',
      'piercing-eggs', 'piercing-eggs', 'regen']
  },
  {
    id: 'storm-chain-halo',
    rooster: 'storm',
    upgrades: ['primary-storm-rank', 'primary-storm-rank', 'primary-storm-rank',
      'lightning-comb', 'lightning-comb', 'lightning-comb', 'lightning-comb',
      'orbit-eggs', 'orbit-eggs', 'orbit-eggs', 'orbit-eggs',
      'faster-eggs', 'faster-eggs', 'faster-eggs', 'armor']
  },
  {
    id: 'storm-control-flock',
    rooster: 'storm',
    upgrades: ['primary-storm-rank', 'primary-storm-rank', 'primary-storm-rank',
      'void-nest', 'void-nest', 'void-nest', 'void-nest',
      'support-chick', 'support-chick', 'support-chick', 'support-chick',
      'laser-comb', 'laser-comb', 'laser-comb', 'laser-comb', 'regen', 'regen']
  }
];

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

async function runBuild(browser, serverUrl, build) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${serverUrl}?seed=phase-d-${build.id}&profile=average`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.startWave);
    await page.evaluate(({ rooster, upgrades }) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(rooster);
      api.enableBot('average');
      api.clearEnemies();
      api.clearProjectiles();
      upgrades.forEach((upgrade) => api.applyUpgradeById(upgrade));
      api.startWave(10);
    }, build);

    const startedAt = Date.now();
    while (Date.now() - startedAt < 85000) {
      await page.waitForTimeout(500);
      if (await page.evaluate(() => window.__ROOSTER_TEST__.getState().gameEnded)) break;
    }
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const result = {
      id: build.id,
      rooster: build.rooster,
      outcome: state.telemetry.outcome,
      bossTtkMs: state.telemetry.ttkByEnemyType.boss?.averageMs ?? null,
      damageTaken: state.telemetry.damageTaken,
      deathCause: state.telemetry.deathCause,
      averageEnemyProjectiles: state.telemetry.averageEnemyProjectiles,
      peakEnemyProjectiles: state.telemetry.peakEnemyProjectiles,
      maxEnemiesAlive: state.telemetry.maxEnemiesAlive,
      damageShare: state.telemetry.combatSources.slice(0, 5).map((source) => ({
        source: source.source,
        share: source.damageShare
      })),
      errors
    };
    assert(!state.lastError && errors.length === 0, `${build.id} had a runtime error.`, result);
    assert(result.maxEnemiesAlive <= 7, `${build.id} exceeded the six-add encounter cap.`, result);
    await page.screenshot({ path: path.join(artifactDir, `phase-d-${build.id}.png`) });
    return result;
  } finally {
    await page.close();
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const results = await Promise.all(builds.map((build) => runBuild(browser, serverState.url, build)));
    const report = { generatedAt: new Date().toISOString(), results };
    await fs.writeFile(
      path.join(artifactDir, 'phase-d-boss-build-matrix.json'),
      JSON.stringify(report, null, 2)
    );
    assert(results.every((result) => result.outcome === 'victory' && result.bossTtkMs <= 85000),
      'At least one representative build could not defeat the sequenced boss in 85 seconds.', results);
    assert(results.filter((result) => result.bossTtkMs <= 75000).length >= 5,
      'Fewer than five representative builds reached the 75-second boss target.', results);
    console.log('Phase D boss build matrix passed.');
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
