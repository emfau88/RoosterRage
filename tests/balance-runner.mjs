import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
let gameUrl;
const strategies = (process.env.BALANCE_STRATEGIES ?? 'average')
  .split(',')
  .map((strategy) => strategy.trim())
  .filter(Boolean);
const maxRunMs = Number(process.env.BALANCE_MAX_MS ?? 570000);
const roosterId = process.env.BALANCE_ROOSTER ?? 'ace';
const reportPrefix = process.env.BALANCE_REPORT_PREFIX ?? 'balance';
const seed = process.env.BALANCE_SEED ?? 'rooster-balance-v1';
const strict = process.env.BALANCE_STRICT === '1';
const WAVE_TARGETS = {
  1: { durationMs: 25000, toleranceMs: 10000 },
  2: { durationMs: 25000, toleranceMs: 10000 },
  3: { durationMs: 35000, toleranceMs: 12000 },
  4: { durationMs: 30000, toleranceMs: 11000 },
  5: { durationMs: 35000, toleranceMs: 12000 },
  6: { durationMs: 45000, toleranceMs: 15000 },
  7: { durationMs: 35000, toleranceMs: 12000 },
  8: { durationMs: 40000, toleranceMs: 14000 },
  9: { durationMs: 50000, toleranceMs: 17000 },
  10: { durationMs: 70000, toleranceMs: 22000 }
};

function scoreWave(wave) {
  const duration = wave.durationMs ?? 0;
  const target = WAVE_TARGETS[wave.wave] ?? WAVE_TARGETS[1];
  const targetDuration = target.durationMs;
  const tolerance = target.toleranceMs;
  const durationScore = clamp(1 - Math.abs(duration - targetDuration) / tolerance, 0, 1);
  const survivalScore = clamp((wave.minHpRatio - 0.15) / 0.45, 0, 1);
  const pressureScore = wave.damageTaken > 0 || wave.minHpRatio < 0.85 ? 1 : 0.45;
  const activityScore = wave.kills > 0 && wave.hits > 0 ? 1 : 0;
  const upgradePenalty = wave.upgradeOffers > 1 ? 0.15 * (wave.upgradeOffers - 1) : 0;
  const score = clamp((durationScore + survivalScore + pressureScore + activityScore) / 4 - upgradePenalty, 0, 1);
  return {
    score,
    durationScore,
    survivalScore,
    pressureScore,
    activityScore,
    verdict: score >= 0.72 ? 'playable' : score >= 0.48 ? 'needs tuning' : 'problematic',
    notes: waveNotes(wave)
  };
}

function waveNotes(wave) {
  const notes = [];
  const target = WAVE_TARGETS[wave.wave] ?? WAVE_TARGETS[1];
  const minDuration = target.durationMs - target.toleranceMs;
  const maxDuration = target.durationMs + target.toleranceMs;
  if (wave.durationMs < minDuration) notes.push('too short');
  if (wave.durationMs > maxDuration) notes.push('too long');
  if (wave.minHpRatio > 0.9 && wave.damageTaken === 0) notes.push('too safe');
  if (wave.minHpRatio < 0.25) notes.push('near lethal');
  if (wave.hits === 0) notes.push('no projectile hits');
  if (wave.kills === 0) notes.push('no kills');
  if (wave.upgradeOffers > 1) notes.push('too many upgrade interruptions');
  return notes;
}

function scoreRun(summary) {
  const waves = summary.waves.map((wave) => ({ ...wave, analysis: scoreWave(wave) }));
  const completedWaves = waves.filter((wave) => wave.outcome === 'completed').length;
  const averageWaveScore = waves.length
    ? waves.reduce((total, wave) => total + wave.analysis.score, 0) / waves.length
    : 0;
  const runtimeHealthy = !summary.lastError && summary.frames > 300 && summary.shots > 0 && summary.hits > 0;
  const progression = summary.progression ?? {};
  const recordedPauseMs = (summary.upgradePauseMs ?? 0) + (summary.chestPauseMs ?? 0);
  const expectedSelectionMs = ((summary.upgradeChoices ?? 0) + (summary.chestChoices ?? 0)) * 4000;
  const estimatedHumanElapsedMs = summary.elapsedMs + Math.max(0, expectedSelectionMs - recordedPauseMs);
  const upgradeFlowOk = (summary.upgradeChoices === 0 || summary.upgradePauseMs / summary.upgradeChoices < 1200)
    && (progression.pauseRatio ?? 0) <= 0.18;
  const pacingOk = summary.outcome === 'victory' && (
    estimatedHumanElapsedMs >= 420000
    && estimatedHumanElapsedMs <= 540000
    && summary.upgradeChoices >= 8
    && summary.upgradeChoices <= 11
  );
  return {
    runtimeHealthy,
    upgradeFlowOk,
    pacingOk,
    estimatedHumanElapsedMs,
    completedWaves,
    averageWaveScore,
    verdict: runtimeHealthy && pacingOk && averageWaveScore >= 0.6 ? 'within target' : 'needs attention',
    waves
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function runOne(browser, strategy) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  try {
    const runUrl = new URL(gameUrl);
    runUrl.searchParams.set('seed', seed);
    runUrl.searchParams.set('profile', strategy);
    await page.goto(runUrl.toString(), { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, `balance-${strategy}-boot-failure.png`) });
      const bodyText = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Test API did not become available for ${strategy}.\nErrors: ${JSON.stringify(errors, null, 2)}\nBody: ${bodyText}\n${error.message}`);
    }
    await page.evaluate(({ selectedStrategy, selectedRooster }) => {
      window.__ROOSTER_TEST__.selectRooster(selectedRooster);
      window.__ROOSTER_TEST__.enableBot(selectedStrategy);
    }, { selectedStrategy: strategy, selectedRooster: roosterId });

    const startedAt = Date.now();
    let lastState = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    let frozenPolls = 0;

    while (Date.now() - startedAt < maxRunMs) {
      await page.waitForTimeout(500);
      const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
      if (state.frames === lastState.frames) {
        frozenPolls += 1;
      } else {
        frozenPolls = 0;
      }
      lastState = state;
      if (state.gameEnded) {
        break;
      }
      if (frozenPolls >= 4) {
        const freezeDiagnostic = {
          capturedAt: new Date().toISOString(),
          strategy,
          elapsedRealMs: Date.now() - startedAt,
          state,
          errors
        };
        await fs.writeFile(
          path.join(artifactDir, `${reportPrefix}-${roosterId}-${strategy}-freeze.json`),
          JSON.stringify(freezeDiagnostic, null, 2)
        );
        await page.screenshot({
          path: path.join(artifactDir, `${reportPrefix}-${roosterId}-${strategy}-freeze.png`)
        });
        throw new Error(
          `Game loop appears frozen for strategy ${strategy}; diagnostic artifact written.`
        );
      }
    }

    const finalState = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const runReport = await page.evaluate(() => window.__ROOSTER_TEST__.getRunReport());
    await page.screenshot({
      path: path.join(artifactDir, `${reportPrefix}-${roosterId}-${strategy}.png`)
    });
    const summary = finalState.telemetry;
    return {
      strategy,
      errors,
      finalState,
      summary,
      runReport,
      analysis: scoreRun(summary)
    };
  } finally {
    await page.close();
  }
}

function renderTextReport(results) {
  const lines = ['Rooster Arena Balance Report', ''];
  results.forEach((result) => {
    lines.push(`Strategy: ${result.strategy}`);
    lines.push(`Verdict: ${result.analysis.verdict}`);
    lines.push(`Outcome: ${result.summary.outcome}`);
    lines.push(`Runtime healthy: ${result.analysis.runtimeHealthy ? 'yes' : 'no'}`);
    lines.push(`Pacing target: ${result.analysis.pacingOk ? 'yes' : 'no'}`);
    lines.push(`Completed waves: ${result.analysis.completedWaves}`);
    lines.push(`Average wave score: ${result.analysis.averageWaveScore.toFixed(2)}`);
    lines.push(`Shots/Hits/Kills: ${result.summary.shots}/${result.summary.hits}/${result.summary.kills}`);
    lines.push(`Damage taken: ${result.summary.damageTaken}`);
    lines.push(`Level-ups: ${result.summary.levelUps}`);
    lines.push(`Upgrade choices: ${result.summary.upgradeChoices}`);
    lines.push(`Real run time: ${(result.summary.elapsedMs / 1000).toFixed(1)}s`);
    lines.push(`Estimated human time: ${(result.analysis.estimatedHumanElapsedMs / 1000).toFixed(1)}s`);
    lines.push(`Upgrade pause ratio: ${((result.summary.progression?.pauseRatio ?? 0) * 100).toFixed(1)}%`);
    lines.push(`First upgrade/spectacle: ${((result.summary.progression?.firstUpgradeAtMs ?? 0) / 1000).toFixed(1)}s/${((result.summary.progression?.firstSpectacleAtMs ?? 0) / 1000).toFixed(1)}s`);
    result.analysis.waves.forEach((wave) => {
      const seconds = ((wave.durationMs ?? 0) / 1000).toFixed(1);
      const notes = wave.analysis.notes.length ? ` (${wave.analysis.notes.join(', ')})` : '';
      lines.push(`  Wave ${wave.wave}: ${seconds}s, score ${wave.analysis.score.toFixed(2)}, ${wave.analysis.verdict}${notes}`);
    });
    if (result.errors.length) {
      lines.push(`Errors: ${result.errors.join(' | ')}`);
    }
    lines.push('');
  });
  return lines.join('\n');
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const { server, url } = await ensureTestServer();
  gameUrl = url;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();

  try {
    const results = [];
    for (const strategy of strategies) {
      results.push(await runOne(browser, strategy));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      strict,
      target: {
        waveDurations: WAVE_TARGETS,
        runDurationMs: [420000, 540000],
        regularChoices: [8, 11],
        maxPauseRatio: 0.18,
        maxIdleMs: 3000,
        preferredHpEndRatio: [0.35, 0.85],
        maxAverageUpgradePauseMs: 1200
      },
      results
    };
    await fs.writeFile(
      path.join(artifactDir, `${reportPrefix}-${roosterId}-report.json`),
      JSON.stringify(report, null, 2)
    );
    const text = renderTextReport(results);
    await fs.writeFile(path.join(artifactDir, `${reportPrefix}-${roosterId}-summary.txt`), text);
    console.log(text);

    const runtimeFailure = results.some((result) => result.errors.length || !result.analysis.runtimeHealthy);
    const strictFailure = strict && results.some((result) => {
      const firstUpgradeAtMs = result.summary.progression?.firstUpgradeAtMs;
      return result.summary.outcome !== 'victory'
        || !result.analysis.pacingOk
        || result.analysis.completedWaves !== 10
        || !Number.isFinite(firstUpgradeAtMs)
        || firstUpgradeAtMs < 18000
        || firstUpgradeAtMs > 32000;
    });
    if (runtimeFailure || strictFailure) {
      process.exitCode = 1;
    }
  } finally {
    await stopTestServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
