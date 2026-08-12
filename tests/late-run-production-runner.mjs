import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const allViewports = [
  { id: 'desktop', width: 960, height: 540 },
  { id: 'portrait', width: 390, height: 844 }
];
const requestedViewports = (process.env.LATE_RUN_VIEWPORTS ?? 'desktop,portrait').split(',');
const viewports = allViewports.filter((viewport) => requestedViewports.includes(viewport.id));
const enemyCounts = (process.env.LATE_RUN_COUNTS ?? '75,110,150')
  .split(',')
  .map(Number)
  .filter((count) => Number.isFinite(count) && count > 0);

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openScenario(browser, serverUrl, viewport, enemyCount) {
  const page = await browser.newPage({ viewport });
  const errors = trackErrors(page);
  const url = new URL(serverUrl);
  url.searchParams.set('seed', `phase-7-late-${viewport.id}-${enemyCount}`);
  url.searchParams.set('profile', 'average');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.spawnEnemyType, null, { timeout: 5000 });
  return { page, errors };
}

async function prepareLateBuild(page, enemyCount) {
  return page.evaluate((count) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('artillery');
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.clearXpOrbs();
    api.setPlayerCombatModifiers({ armor: 1000, regenPerSecond: 30 });
    api.enableBot('average');

    const upgrades = [
      'primary-artillery-rank', 'primary-artillery-rank', 'primary-artillery-rank',
      'artillery-reinforced-breech', 'evo-siegebreaker-shell',
      'molotov-egg', 'molotov-egg', 'molotov-egg', 'molotov-egg', 'regen', 'evo-phoenix-pan',
      'void-nest', 'void-nest', 'void-nest', 'void-nest', 'xp-magnet', 'evo-singularity-nest',
      'laser-comb', 'laser-comb', 'laser-comb', 'laser-comb', 'swift-shells', 'evo-dawn-laser',
      'support-chick', 'support-chick', 'support-chick', 'support-chick', 'faster-eggs', 'evo-chick-squadron'
    ];
    upgrades.forEach((id) => api.applyUpgradeById(id));

    const state = api.getState();
    const center = state.player;
    const mix = [
      'kornkrabbler', 'kornkrabbler', 'kornkrabbler', 'kornkrabbler', 'kornkrabbler',
      'slime', 'slime', 'runner', 'brute', 'spitter', 'fan-spitter', 'bomber', 'support', 'summoner'
    ];
    const ids = [];
    for (let index = 0; index < count; index += 1) {
      const ring = 260 + (index % 7) * 82;
      const angle = (Math.PI * 2 * index) / count + (index % 5) * 0.07;
      const type = mix[index % mix.length];
      const id = api.spawnEnemyType(
        type,
        center.x + Math.cos(angle) * ring,
        center.y + Math.sin(angle) * ring,
        {
          hp: type === 'kornkrabbler' ? 24 : type === 'slime' ? 90 : 230,
          damage: 0,
          xpOverride: type === 'kornkrabbler' ? 0.2 : 3
        }
      );
      if (id !== null) ids.push(id);
    }
    const xp = api.spawnXpField(120, 2);
    api.resetFrameTelemetry();
    return {
      requestedEnemies: count,
      spawnedEnemies: ids.length,
      killProbeIds: ids.slice(0, Math.min(24, Math.floor(ids.length / 4))),
      xp,
      loadout: api.getLoadout(),
      state: api.getState()
    };
  }, enemyCount);
}

async function runScenario(browser, serverUrl, viewport, enemyCount) {
  const { page, errors } = await openScenario(browser, serverUrl, viewport, enemyCount);
  try {
    const prepared = await prepareLateBuild(page, enemyCount);
    assert(prepared.spawnedEnemies === enemyCount,
      `${viewport.id}/${enemyCount}: mixed horde did not fully spawn.`, prepared);
    assert(prepared.loadout.evolutions.length >= 5,
      `${viewport.id}/${enemyCount}: late build is missing EVOs.`, prepared.loadout);

    const samples = [];
    const startedAt = Date.now();
    let deathProbeTriggered = false;
    while (Date.now() - startedAt < 12000) {
      await page.waitForTimeout(1000);
      if (!deathProbeTriggered && Date.now() - startedAt >= 3500) {
        await page.evaluate((ids) => {
          const api = window.__ROOSTER_TEST__;
          ids.forEach((id) => api.damageEnemyById(id, 99999));
        }, prepared.killProbeIds);
        deathProbeTriggered = true;
      }
      samples.push(await page.evaluate(() => {
        const state = window.__ROOSTER_TEST__.getState();
        return {
          frames: state.frames,
          enemies: state.enemies,
          projectiles: state.projectiles,
          enemyProjectiles: state.enemyProjectiles,
          xpOrbs: state.xpOrbs,
          hazards: state.hazardZones + state.voidZones,
          fx: state.telemetry.peakObjects.fx,
          frameTimes: state.telemetry.frameTimes,
          peakObjects: state.telemetry.peakObjects,
          pools: state.pools,
          lastError: state.lastError
        };
      }));
    }

    const final = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const peaks = samples.reduce((result, sample) => ({
      enemies: Math.max(result.enemies, sample.peakObjects.enemies),
      projectiles: Math.max(result.projectiles, sample.peakObjects.projectiles),
      enemyProjectiles: Math.max(result.enemyProjectiles, sample.peakObjects.enemyProjectiles),
      xpOrbs: Math.max(result.xpOrbs, sample.peakObjects.xpOrbs),
      abilities: Math.max(result.abilities, sample.peakObjects.abilities),
      fx: Math.max(result.fx, sample.peakObjects.fx),
      total: Math.max(result.total, sample.peakObjects.total)
    }), { enemies: 0, projectiles: 0, enemyProjectiles: 0, xpOrbs: 0, abilities: 0, fx: 0, total: 0 });
    const report = {
      viewport: viewport.id,
      enemyCount,
      durationMs: Date.now() - startedAt,
      loadout: prepared.loadout,
      initialXp: prepared.xp,
      final: {
        enemies: final.enemies,
        kills: final.kills,
        xpOrbs: final.xpOrbs,
        enemyProjectiles: final.enemyProjectiles,
        hazards: final.hazardZones + final.voidZones,
        frameTimes: final.telemetry.frameTimes,
        pools: final.pools,
        lastError: final.lastError
      },
      peaks,
      errors
    };
    assert(!final.lastError && errors.length === 0,
      `${viewport.id}/${enemyCount}: late-run scenario had runtime errors.`, report);
    assert(final.telemetry.frameTimes.p95Ms <= 34,
      `${viewport.id}/${enemyCount}: late-run p95 exceeded 34 ms.`, report);
    assert(peaks.xpOrbs >= (viewport.id === 'portrait' ? 48 : 72)
      && peaks.abilities >= 4 && peaks.fx > 0,
    `${viewport.id}/${enemyCount}: late-run object mix was incomplete.`, report);
    await fs.mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, `phase-7-late-${viewport.id}-${enemyCount}.png`) });
    return report;
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
    const results = [];
    for (const viewport of viewports) {
      for (const enemyCount of enemyCounts) {
        results.push(await runScenario(browser, serverState.url, viewport, enemyCount));
      }
    }
    const report = { generatedAt: new Date().toISOString(), results };
    await fs.writeFile(
      path.join(artifactDir, 'phase-7-late-run-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Phase 7 realistic late-run performance gate passed.');
    console.log(JSON.stringify(results.map((result) => ({
      viewport: result.viewport,
      enemies: result.enemyCount,
      p95Ms: result.final.frameTimes.p95Ms,
      p99Ms: result.final.frameTimes.p99Ms,
      peaks: result.peaks,
      drops: result.final.pools.total.dropped
    })), null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
