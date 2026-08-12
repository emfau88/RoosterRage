import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

async function openGame(browser, serverUrl, viewport, suffix) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=phase-14-${suffix}&profile=average`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getRunReport);
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace');
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.movePlayer(700, 450);
  });
  return { page, errors };
}

async function verifyResponsiveHud(browser, serverUrl) {
  const viewports = [
    { name: 'desktop', width: 960, height: 540, maxHudHeight: 180 },
    { name: 'portrait', width: 390, height: 844, maxHudHeight: 125 },
    { name: 'landscape', width: 844, height: 390, maxHudHeight: 90 }
  ];
  const results = [];
  for (const viewport of viewports) {
    const { page, errors } = await openGame(browser, serverUrl, viewport, viewport.name);
    try {
      await page.evaluate(() => {
        window.__ROOSTER_TEST__.applyUpgradeById('golden-egg');
        window.__ROOSTER_TEST__.applyUpgradeById('max-hp');
      });
      await page.waitForTimeout(80);
      const layout = await page.evaluate(() => {
        const hud = document.querySelector('.hud').getBoundingClientRect();
        const controls = document.querySelector('.hud__controls').getBoundingClientRect();
        const xp = document.querySelector('.hud__xp-row').getBoundingClientRect();
        const time = document.querySelector('[data-time]').getBoundingClientRect();
        const cooldowns = [...document.querySelectorAll('.hud__cooldown')].map((node) => ({
          angle: node.style.getPropertyValue('--cooldown-angle'),
          title: node.title
        }));
        const rankPips = [...document.querySelectorAll('.hud__rank-pips')].map((node) => {
          const rect = node.getBoundingClientRect();
          return { count: node.children.length, left: rect.left, right: rect.right };
        });
        const loadoutRows = [...document.querySelectorAll('.hud__upgrades')].map((node) => ({
          icons: node.querySelectorAll('.hud__upgrade-icon').length,
          open: node.querySelectorAll('.hud__upgrade-icon.is-open').length,
          capacity: node.querySelector('.hud__slot-count')?.textContent ?? ''
        }));
        return {
          hud: { left: hud.left, right: hud.right, top: hud.top, bottom: hud.bottom, height: hud.height },
          controls: { left: controls.left, right: controls.right, top: controls.top, bottom: controls.bottom },
          xpTop: xp.top,
          timeTop: time.top,
          hasTopHp: Boolean(document.querySelector('[data-hp]')),
          hasKills: Boolean(document.querySelector('[data-kills]')),
          hasWaveProgress: Boolean(document.querySelector('[data-wave-fill]')),
          cooldowns,
          rankPips,
          loadoutRows
        };
      });
      assert(layout.hud.height <= viewport.maxHudHeight,
        `${viewport.name} HUD exceeds its vertical budget.`, layout);
      assert(layout.hud.left >= 0 && layout.hud.right <= viewport.width
        && layout.controls.left >= 0 && layout.controls.right <= viewport.width,
      `${viewport.name} HUD exceeds the viewport.`, layout);
      assert(
        layout.xpTop >= layout.hud.top
        && layout.timeTop >= layout.hud.top
        && layout.hasTopHp
        && layout.hasKills
        && layout.hasWaveProgress,
        `${viewport.name} HUD priority is incorrect.`, layout);
      assert(layout.cooldowns.length >= 2 && layout.cooldowns.every((cooldown) => cooldown.angle.endsWith('deg')),
        `${viewport.name} active loadout has no cooldown rings.`, layout.cooldowns);
      assert(
        layout.rankPips.length >= 3
        && layout.rankPips.every((pips) => pips.count >= 3 && pips.left >= 0 && pips.right <= viewport.width),
        `${viewport.name} rank pips are missing or clipped.`,
        layout.rankPips
      );
      assert(
        layout.loadoutRows.length === 2
        && layout.loadoutRows.every((row) => row.open <= 1 && /^\d\/\d$/.test(row.capacity))
        && layout.loadoutRows[0].icons === 3
        && layout.loadoutRows[1].icons === 2,
        `${viewport.name} loadout should show occupied slots plus only one quiet placeholder.`,
        layout.loadoutRows
      );
      assert(errors.length === 0, `Browser errors in ${viewport.name} HUD.`, errors);
      results.push({ name: viewport.name, ...layout });
    } finally {
      await page.close();
    }
  }
  return results;
}

async function verifySettingsAndReport(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, { width: 390, height: 844 }, 'report');
  try {
    await page.click('[data-settings]');
    const settingsOpen = await page.evaluate(() => ({
      buttons: document.querySelectorAll('[data-effect]').length,
      visible: document.querySelector('.settings-panel') !== null,
      privacyVisible: document.querySelector('.settings-privacy [data-analytics-toggle]') !== null,
      settings: window.__ROOSTER_TEST__.getEffectSettings()
    }));
    assert(settingsOpen.visible && settingsOpen.buttons === 4 && settingsOpen.privacyVisible,
      'Settings must expose four effect controls and the privacy toggle.', settingsOpen);
    await page.click('[data-effect="damageNumbers"]');
    const toggled = await page.evaluate(() => window.__ROOSTER_TEST__.getEffectSettings());
    assert(toggled.damageNumbers !== settingsOpen.settings.damageNumbers,
      'Damage-number setting did not toggle independently.', { settingsOpen, toggled });
    await page.click('.settings-close');
    await page.evaluate((enabled) => {
      const api = window.__ROOSTER_TEST__;
      if (api.getEffectSettings().damageNumbers !== enabled) api.toggleEffectSetting('damageNumbers');
      api.applyUpgradeById('golden-egg');
      for (let index = 0; index < 6; index += 1) {
        api.spawnEnemyType('slime', 820 + index * 28, 430 + (index % 2) * 40, {
          hp: 180,
          speed: 0,
          damage: 0,
          xpOverride: 0
        });
      }
    }, settingsOpen.settings.damageNumbers);
    await page.waitForTimeout(1800);
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.setPlayerHp(100);
      api.spawnEnemyType('slime', 700, 450, { hp: 9999, speed: 0, damage: 999 });
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getState().gameEnded);
    const result = await page.evaluate(() => {
      const report = window.__ROOSTER_TEST__.getRunReport();
      const panel = document.querySelector('.run-report').getBoundingClientRect();
      return {
        report,
        tableHeaders: [...document.querySelectorAll('.run-report thead th')].map((cell) => cell.textContent.trim()),
        tableRows: [...document.querySelectorAll('.run-report tbody tr')].map((row) => row.textContent.trim()),
        summaryText: document.querySelector('.run-report__summary')?.textContent ?? '',
        buildText: document.querySelector('.run-report__build')?.textContent ?? '',
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom, height: panel.height },
        standards: window.__ROOSTER_TEST__.getPresentationStandards()
      };
    });
    const damageShare = result.report.combatSources.reduce((sum, source) => sum + source.damageShare, 0);
    assert(result.report.combatSources.length >= 1 && Math.abs(damageShare - 1) < 0.0001,
      'Combat source shares do not use the telemetry total.', result.report.combatSources);
    assert(result.report.combatSources.every((source) => (
      Number.isFinite(source.overkillRatio) && source.usageMs >= 0
    )), 'Combat source report is missing overkill or usage time.', result.report.combatSources);
    assert(result.report.deathCause === 'contact:slime', 'Run report lost the lethal source.', result.report);
    assert(result.tableRows.length === result.report.combatSources.slice(0, 10).length,
      'Rendered source table differs from telemetry source data.', result);
    assert(['Quelle', 'Schaden', 'Share', 'Treffer', 'Kills', 'Overkill', 'Aktiv']
      .every((heading) => result.tableHeaders.includes(heading)),
    'Run report does not expose every required combat metric.', result.tableHeaders);
    assert(result.summaryText.includes('Barnyard Ace') && result.buildText.includes('Target Egg'),
      'Run report does not identify rooster and build.', result);
    assert(result.panel.left >= 0 && result.panel.right <= 390 && result.panel.height <= 812,
      'Run report does not fit the portrait viewport.', result.panel);
    assert(Object.keys(result.standards.colors).length === 5
      && Object.keys(result.standards.audio).length === 5,
    'Color or audio priority language is incomplete.', result.standards);
    assert(errors.length === 0, 'Browser errors in settings/report gate.', errors);
    await page.screenshot({ path: path.join(artifactDir, 'run-report-portrait.png') });
    return {
      effectControls: settingsOpen.buttons,
      sources: result.report.combatSources,
      deathCause: result.report.deathCause,
      build: result.report.build,
      panel: result.panel
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
    const report = {
      generatedAt: new Date().toISOString(),
      layouts: await verifyResponsiveHud(browser, serverState.url),
      report: await verifySettingsAndReport(browser, serverState.url)
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'hud-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster HUD/report gate passed.');
    console.log(JSON.stringify({
      layouts: report.layouts.map((layout) => ({ name: layout.name, height: layout.hud.height })),
      sources: report.report.sources,
      deathCause: report.report.deathCause,
      effectControls: report.report.effectControls
    }, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
