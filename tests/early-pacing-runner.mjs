import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const scenarios = [
  { id: 'ace-desktop-a', rooster: 'ace', seed: 'early-ace-a', viewport: { width: 960, height: 540 } },
  { id: 'ace-portrait-b', rooster: 'ace', seed: 'early-ace-b', viewport: { width: 390, height: 844 } },
  { id: 'artillery-desktop-a', rooster: 'artillery', seed: 'early-artillery-a', viewport: { width: 960, height: 540 } },
  { id: 'artillery-portrait-b', rooster: 'artillery', seed: 'early-artillery-b', viewport: { width: 390, height: 844 } },
  { id: 'storm-portrait-guard', rooster: 'storm', seed: 'early-storm-guard', viewport: { width: 390, height: 844 } }
];

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

async function runScenario(browser, serverUrl, scenario) {
  const page = await browser.newPage({ viewport: scenario.viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    const url = new URL(serverUrl);
    url.searchParams.set('seed', scenario.seed);
    url.searchParams.set('profile', 'average');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.unlockAllMeta();
      api.selectMetaChallenge('standard');
      api.restart();
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getChallengeState().id === 'standard');
    await page.evaluate((rooster) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(rooster);
      api.enableBot('average');
    }, scenario.rooster);
    await page.waitForFunction(() => (
      Number.isFinite(window.__ROOSTER_TEST__?.getTelemetry().progression.firstUpgradeAtMs)
      || window.__ROOSTER_TEST__?.getState().gameEnded
    ), null, { timeout: 50000 });
    const result = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const state = api.getState();
      return {
        firstUpgradeAtMs: state.telemetry.progression.firstUpgradeAtMs,
        wave: state.wave,
        kills: state.kills,
        xpCollected: state.xpCollected,
        outcome: state.telemetry.outcome,
        waveOne: api.getWaveCatalog()[0]
      };
    });
    assert(Number.isFinite(result.firstUpgradeAtMs),
      `${scenario.id} did not reach its first upgrade.`, result);
    assert(result.wave === 1, `${scenario.id} reached the first upgrade after wave one.`, result);
    assert(Math.abs(result.waveOne.allocatedXp - 90) < 0.001
      && JSON.stringify(result.waveOne.xpCurve.segmentShares) === JSON.stringify([0.3, 0.44, 0.1, 0.16]),
    `${scenario.id} changed the wave-one XP total or lost the frontload curve.`, result.waveOne);
    assert(errors.length === 0, `${scenario.id} reported browser errors.`, errors);
    return { ...scenario, ...result };
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
    for (let index = 0; index < scenarios.length; index += 2) {
      results.push(...await Promise.all(
        scenarios.slice(index, index + 2).map((scenario) => runScenario(browser, serverState.url, scenario))
      ));
    }
    const report = { generatedAt: new Date().toISOString(), results };
    await fs.writeFile(path.join(artifactDir, 'early-pacing-report.json'), JSON.stringify(report, null, 2));
    results.forEach((result) => {
      assert(result.firstUpgradeAtMs >= 18000 && result.firstUpgradeAtMs <= 35000,
        `${result.id} first upgrade is outside the 18-35 second production window.`, result);
    });
    console.log('Rooster early-upgrade pacing gate passed.');
    console.log(JSON.stringify(results.map((result) => ({
      id: result.id,
      firstUpgradeSeconds: Number((result.firstUpgradeAtMs / 1000).toFixed(1)),
      kills: result.kills,
      xpCollected: Number(result.xpCollected.toFixed(1))
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
