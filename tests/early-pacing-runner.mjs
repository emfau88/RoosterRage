import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const seedCount = Math.max(1, Math.floor(Number(process.env.EARLY_PACING_SEEDS ?? 5)));
const concurrency = Math.max(1, Math.floor(Number(process.env.EARLY_PACING_CONCURRENCY ?? 1)));
const roosters = (process.env.EARLY_PACING_ROOSTERS ?? 'ace,artillery,storm')
  .split(',')
  .map((rooster) => rooster.trim())
  .filter(Boolean);
const arenas = (process.env.EARLY_PACING_ARENAS ?? 'open-yard,vertical-run,square-coop')
  .split(',')
  .map((arena) => arena.trim())
  .filter(Boolean);
const requestedViewports = (process.env.EARLY_PACING_VIEWPORTS ?? 'desktop,portrait')
  .split(',')
  .map((viewport) => viewport.trim())
  .filter(Boolean);
const viewports = [
  { id: 'desktop', width: 960, height: 540 },
  { id: 'portrait', width: 390, height: 844 }
].filter((viewport) => requestedViewports.includes(viewport.id));
const scenarios = arenas.flatMap((arena) => roosters.flatMap((rooster) => viewports.flatMap((viewport) => (
  Array.from({ length: seedCount }, (_, index) => ({
    id: `${arena}/${rooster}/${viewport.id}/${index + 1}`,
    arena,
    rooster,
    seed: `early-${arena}-${rooster}-${viewport.id}-${index + 1}`,
    viewport: { ...viewport }
  }))
))));
const FIRST_PICK_WINDOW_MS = [25000, 35000];
// Browser scheduling and the final orb path can move a real-time sample by a
// fraction of a second. Keep 25-35 s as the production target, but do not turn
// sub-second measurement noise into a balance rewrite.
const FIRST_PICK_TOLERANCE_MS = 2000;

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? null;
}

function summarize(results) {
  return Object.values(results.reduce((groups, result) => {
    const key = `${result.arena}/${result.rooster}/${result.viewport.id}`;
    const group = groups[key] ?? {
      arena: result.arena,
      rooster: result.rooster,
      viewport: result.viewport.id,
      results: []
    };
    group.results.push(result);
    groups[key] = group;
    return groups;
  }, {})).map((group) => {
    const values = group.results.map((result) => result.firstUpgradeAtMs);
    return {
      rooster: group.rooster,
      arena: group.arena,
      viewport: group.viewport,
      samples: values.length,
      minMs: Math.min(...values),
      medianMs: percentile(values, 0.5),
      p90Ms: percentile(values, 0.9),
      maxMs: Math.max(...values),
      outsideProductionWindow: group.results.filter((result) => (
        result.firstUpgradeAtMs < FIRST_PICK_WINDOW_MS[0] || result.firstUpgradeAtMs > FIRST_PICK_WINDOW_MS[1]
      )).map((result) => result.id)
    };
  });
}

async function runScenario(browser, serverUrl, scenario) {
  const page = await browser.newPage({
    viewport: { width: scenario.viewport.width, height: scenario.viewport.height }
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    const url = new URL(serverUrl);
    url.searchParams.set('seed', scenario.seed);
    url.searchParams.set('profile', 'average');
    url.searchParams.set('arena', scenario.arena);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.unlockAllMeta();
      api.selectMetaChallenge('standard');
      window.__previousPacingApi = api;
      api.restart();
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__ !== window.__previousPacingApi
      && window.__ROOSTER_TEST__?.getChallengeState().id === 'standard');
    await page.evaluate((rooster) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(rooster);
      api.enableBot('average');
    }, scenario.rooster);
    try {
      await page.waitForFunction(() => (
        Number.isFinite(window.__ROOSTER_TEST__?.getTelemetry().progression.firstUpgradeAtMs)
        || window.__ROOSTER_TEST__?.getState().gameEnded
      ), null, { timeout: 50000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const api = window.__ROOSTER_TEST__;
        return { state: api?.getState?.() ?? null, telemetry: api?.getTelemetry?.() ?? null };
      });
      throw new Error(`${scenario.id} timed out waiting for its first upgrade.\n${JSON.stringify({
        scenario,
        errors,
        diagnostic
      }, null, 2)}\n${error.message}`);
    }
    const result = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const state = api.getState();
      const telemetry = api.getTelemetry();
      return {
        firstUpgradeAtMs: telemetry.progression.firstUpgradeAtMs,
        waveOneDurationMs: telemetry.waves.find((wave) => wave.wave === 1)?.durationMs ?? null,
        wave: state.wave,
        kills: state.kills,
        xpCollected: state.xpCollected,
        outcome: state.telemetry.outcome,
        waveOne: api.getWaveCatalog()[0]
      };
    });
    assert(Number.isFinite(result.firstUpgradeAtMs),
      `${scenario.id} did not reach its first upgrade.`, result);
    assert(result.wave <= 2, `${scenario.id} reached the first upgrade after wave two.`, result);
    assert(Math.abs(result.waveOne.allocatedXp - 44) < 0.001
      && JSON.stringify(result.waveOne.xpCurve.segmentShares) === JSON.stringify([0.4, 0.34, 0.1, 0.16]),
    `${scenario.id} changed the wave-one XP pacing budget or lost the frontload curve.`, result.waveOne);
    assert(errors.length === 0, `${scenario.id} reported browser errors.`, errors);
    return { ...scenario, ...result };
  } finally {
    await page.close();
  }
}

async function captureScenario(browser, serverUrl, scenario) {
  try {
    return { status: 'fulfilled', value: await runScenario(browser, serverUrl, scenario) };
  } catch (error) {
    return {
      status: 'rejected',
      scenario,
      error: error.stack ?? error.message
    };
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=NetworkChangeNotifierWin'] });
  try {
    const results = [];
    const failures = [];
    for (let index = 0; index < scenarios.length; index += concurrency) {
      const batch = await Promise.all(
        scenarios.slice(index, index + concurrency)
          .map((scenario) => captureScenario(browser, serverState.url, scenario))
      );
      batch.forEach((outcome) => {
        if (outcome.status === 'fulfilled') results.push(outcome.value);
        else failures.push({ scenario: outcome.scenario, error: outcome.error });
      });
    }
    const groups = summarize(results);
    const report = {
      generatedAt: new Date().toISOString(),
      seedCount,
      concurrency,
      arenas,
      roosters,
      productionWindowMs: FIRST_PICK_WINDOW_MS,
      groups,
      results,
      failures
    };
    await fs.writeFile(path.join(artifactDir, 'early-pacing-report.json'), JSON.stringify(report, null, 2));
    assert(failures.length === 0,
      `${failures.length} early-pacing scenario(s) failed before producing a result.`, failures);
    results.forEach((result) => {
      assert(result.firstUpgradeAtMs >= FIRST_PICK_WINDOW_MS[0] - FIRST_PICK_TOLERANCE_MS
        && result.firstUpgradeAtMs <= FIRST_PICK_WINDOW_MS[1] + FIRST_PICK_TOLERANCE_MS,
      `${result.id} first upgrade exceeds the tolerance around the 25-35 second pacing window.`, result);
    });
    console.log('Rooster early-upgrade pacing gate passed.');
    console.log(JSON.stringify(groups.map((group) => ({
      ...group,
      minSeconds: Number((group.minMs / 1000).toFixed(1)),
      medianSeconds: Number((group.medianMs / 1000).toFixed(1)),
      p90Seconds: Number((group.p90Ms / 1000).toFixed(1)),
      maxSeconds: Number((group.maxMs / 1000).toFixed(1))
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
