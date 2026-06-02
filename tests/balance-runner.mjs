import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'http://127.0.0.1:5173/';
const projectRoot = path.resolve(import.meta.dirname, '..');
const artifactDir = path.join(projectRoot, 'test-results');
const strategies = (process.env.BALANCE_STRATEGIES ?? 'offense,random')
  .split(',')
  .map((strategy) => strategy.trim())
  .filter(Boolean);
const maxRunMs = Number(process.env.BALANCE_MAX_MS ?? 180000);

function loadPlaywright() {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('APPDATA is not set; cannot locate global Playwright install.');
  }
  const playwrightPackage = path.join(appData, 'npm', 'node_modules', 'playwright', 'package.json');
  const require = createRequire(playwrightPackage);
  return require('playwright');
}

async function isServerReady() {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    if (await isServerReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function ensureServer() {
  if (await isServerReady()) {
    return null;
  }

  const { createServer } = await import('vite');
  const server = await createServer({
    root: projectRoot,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    }
  });
  await server.listen();

  if (!(await waitForServer())) {
    await server.close();
    throw new Error('Dev server did not become ready.');
  }

  return server;
}

function scoreWave(wave) {
  const duration = wave.durationMs ?? 0;
  const targetDuration = wave.wave === 10 ? 40000 : 21000;
  const tolerance = wave.wave === 10 ? 18000 : 13000;
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
  const minDuration = wave.wave === 10 ? 30000 : 18000;
  const maxDuration = wave.wave === 10 ? 52000 : 24000;
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
  const upgradeFlowOk = summary.upgradeChoices === 0 || summary.upgradePauseMs / summary.upgradeChoices < 1200;
  return {
    runtimeHealthy,
    upgradeFlowOk,
    completedWaves,
    averageWaveScore,
    verdict: runtimeHealthy && averageWaveScore >= 0.6 ? 'usable baseline' : 'needs attention',
    waves
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function stopServer(server) {
  if (!server) {
    return;
  }
  await server.close();
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
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, `balance-${strategy}-boot-failure.png`) });
      const bodyText = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Test API did not become available for ${strategy}.\nErrors: ${JSON.stringify(errors, null, 2)}\nBody: ${bodyText}\n${error.message}`);
    }
    await page.evaluate((selectedStrategy) => window.__ROOSTER_TEST__.enableBot(selectedStrategy), strategy);

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
      if (frozenPolls >= 4) {
        throw new Error(`Game loop appears frozen for strategy ${strategy}.`);
      }
      lastState = state;
      if (state.gameEnded) {
        break;
      }
    }

    const finalState = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.screenshot({ path: path.join(artifactDir, `balance-${strategy}.png`) });
    const summary = finalState.telemetry;
    return {
      strategy,
      errors,
      finalState,
      summary,
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
    lines.push(`Completed waves: ${result.analysis.completedWaves}`);
    lines.push(`Average wave score: ${result.analysis.averageWaveScore.toFixed(2)}`);
    lines.push(`Shots/Hits/Kills: ${result.summary.shots}/${result.summary.hits}/${result.summary.kills}`);
    lines.push(`Damage taken: ${result.summary.damageTaken}`);
    lines.push(`Level-ups: ${result.summary.levelUps}`);
    lines.push(`Upgrade choices: ${result.summary.upgradeChoices}`);
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
  const server = await ensureServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();

  try {
    const results = [];
    for (const strategy of strategies) {
      results.push(await runOne(browser, strategy));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      target: {
        waveDurationMs: [18000, 24000],
        maxIdleMs: 3000,
        preferredHpEndRatio: [0.35, 0.85],
        maxAverageUpgradePauseMs: 1200
      },
      results
    };
    await fs.writeFile(path.join(artifactDir, 'balance-report.json'), JSON.stringify(report, null, 2));
    const text = renderTextReport(results);
    await fs.writeFile(path.join(artifactDir, 'balance-summary.txt'), text);
    console.log(text);

    const runtimeFailure = results.some((result) => result.errors.length || !result.analysis.runtimeHealthy);
    if (runtimeFailure) {
      process.exitCode = 1;
    }
  } finally {
    await stopServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
