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
    { name: 'portrait', width: 390, height: 844, maxHudHeight: 82 },
    { name: 'landscape', width: 844, height: 390, maxHudHeight: 90 }
  ];
  const results = [];
  for (const viewport of viewports) {
    const { page, errors } = await openGame(browser, serverUrl, viewport, viewport.name);
    try {
      await page.evaluate(() => {
        window.__ROOSTER_TEST__.applyUpgradeById('golden-egg');
        window.__ROOSTER_TEST__.applyUpgradeById('max-hp');
        window.__ROOSTER_TEST__.setHudProbe({ elapsed: 569, kills: 109, wave: 2 });
      });
      await page.waitForTimeout(80);
      const layout = await page.evaluate(() => {
        const metric = (selector) => {
          const value = document.querySelector(`${selector} [data-value]`);
          const full = value.querySelector('[data-value-full]');
          const compact = value.querySelector('[data-value-compact]');
          const visible = getComputedStyle(compact).display !== 'none' ? compact : full;
          return {
            full: full.textContent,
            compact: compact.textContent,
            visible: visible.textContent,
            fullDisplay: getComputedStyle(full).display,
            compactDisplay: getComputedStyle(compact).display,
            clientWidth: value.clientWidth,
            scrollWidth: value.scrollWidth,
            ariaLabel: value.getAttribute('aria-label')
          };
        };
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
        const mutations = [];
        const observer = new MutationObserver((records) => mutations.push(...records));
        document.querySelectorAll('.hud__item [data-value]').forEach((node) => observer.observe(node, {
          attributes: true,
          characterData: true,
          childList: true,
          subtree: true
        }));
        window.__ROOSTER_TEST__.setHudProbe({ elapsed: 569, kills: 109, wave: 2 });
        observer.disconnect();
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
          loadoutRows,
          metrics: {
            time: metric('[data-time]'),
            wave: metric('[data-wave]'),
            kills: metric('[data-kills]')
          },
          stableMetricMutations: mutations.length
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
        && layout.loadoutRows.every((row) => row.open === 0 && /^\d\/\d$/.test(row.capacity))
        && layout.loadoutRows[0].icons === 2
        && layout.loadoutRows[1].icons === 1,
        `${viewport.name} loadout should show occupied slots without empty placeholders.`,
        layout.loadoutRows
      );
      const expected = viewport.width <= 760
        ? { time: '09:29', wave: '2/10', kills: '109', compact: true }
        : { time: '09:29', wave: 'Wave 2/10', kills: '109 kills', compact: false };
      assert(layout.metrics.time.visible === expected.time
        && layout.metrics.wave.visible === expected.wave
        && layout.metrics.kills.visible === expected.kills,
      `${viewport.name} HUD did not select the intended metric labels.`, layout.metrics);
      assert(Object.values(layout.metrics).every((metricValue) => (
        metricValue.scrollWidth <= metricValue.clientWidth + 1
        && metricValue.ariaLabel
      )), `${viewport.name} HUD metric is clipped or lacks an accessible full label.`, layout.metrics);
      assert(Object.values(layout.metrics).every((metricValue) => (
        expected.compact
          ? metricValue.compactDisplay !== 'none' && metricValue.fullDisplay === 'none'
          : metricValue.compactDisplay === 'none' && metricValue.fullDisplay !== 'none'
      )), `${viewport.name} HUD uses the wrong responsive metric variant.`, layout.metrics);
      assert(layout.stableMetricMutations === 0,
        `${viewport.name} HUD rewrites unchanged metric text.`, layout.stableMetricMutations);
      assert(errors.length === 0, `Browser errors in ${viewport.name} HUD.`, errors);
      results.push({ name: viewport.name, ...layout });
    } finally {
      await page.close();
    }
  }
  return results;
}

async function verifyShortMobileHubScrolling(browser, serverUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${serverUrl}?seed=short-mobile-hub&profile=average`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.henhouse-panel');
    await page.click('[data-hub-tab="roosters"]');
    const roosters = page.locator('[data-hub-view="roosters"]');
    const before = await roosters.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      overflowX: getComputedStyle(element).overflowX,
      overflowY: getComputedStyle(element).overflowY
    }));
    await roosters.hover();
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const after = await roosters.evaluate((element) => ({ scrollTop: element.scrollTop }));
    assert(
      before.scrollHeight > before.clientHeight
      && before.overflowX === 'hidden'
      && before.overflowY === 'auto'
      && after.scrollTop > 0,
      'Short mobile rooster view must retain native vertical scrolling.',
      { before, after }
    );
    const secondaryViews = {};
    for (const view of ['training', 'archive']) {
      await page.click(`[data-hub-tab="${view}"]`);
      secondaryViews[view] = await page.locator(`[data-hub-view="${view}"]`).evaluate((element) => ({
        overflowX: getComputedStyle(element).overflowX,
        overflowY: getComputedStyle(element).overflowY
      }));
    }
    assert(
      Object.values(secondaryViews).every((view) => view.overflowX === 'hidden' && view.overflowY === 'auto'),
      'Short mobile secondary hub views must remain vertically scrollable.',
      secondaryViews
    );
    assert(errors.length === 0, 'Browser errors in short mobile hub scrolling.', errors);
    return { before, after, secondaryViews };
  } finally {
    await page.close();
  }
}

async function verifyArenaPresentation(browser, serverUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${serverUrl}?seed=arena-presentation&profile=average`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-arena-preview]');
    await page.locator('[data-arena-preview]').evaluate((image) => image.complete
      ? undefined
      : new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', reject, { once: true });
      }));
    const layout = await page.evaluate(() => {
      const view = document.querySelector('[data-hub-view="play"]');
      const showcase = document.querySelector('[data-arena-showcase]');
      const preview = document.querySelector('[data-arena-preview]');
      const start = document.querySelector('[data-run-start]');
      const panel = document.querySelector('.henhouse-panel');
      const previewRect = preview.getBoundingClientRect();
      const startRect = start.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      return {
        arena: showcase.dataset.arena,
        naturalWidth: preview.naturalWidth,
        naturalHeight: preview.naturalHeight,
        objectFit: getComputedStyle(preview).objectFit,
        previewWidth: previewRect.width,
        previewHeight: previewRect.height,
        playClientHeight: view.clientHeight,
        playScrollHeight: view.scrollHeight,
        startInsidePanel: startRect.bottom <= panelRect.bottom + 1
      };
    });
    assert(
      layout.arena === 'open-yard'
      && layout.naturalWidth === 1536
      && layout.naturalHeight === 1024
      && layout.objectFit === 'cover'
      && layout.previewWidth >= 300
      && layout.previewHeight >= 120,
      'The mobile hub must show the selected arena as a large poster composition.',
      layout
    );
    assert(
      layout.playScrollHeight <= layout.playClientHeight + 1 && layout.startInsidePanel,
      'The arena overview must not push the primary start action outside the mobile hub.',
      layout
    );
    assert(errors.length === 0, 'Browser errors in arena presentation.', errors);
    return layout;
  } finally {
    await page.close();
  }
}

async function verifySettingsAndReport(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, { width: 390, height: 844 }, 'report');
  try {
    await page.click('[data-settings]');
    const settingsOpen = await page.evaluate(() => ({
      buttons: document.querySelectorAll('[data-effect]').length,
      visible: document.querySelector('.settings-panel') !== null,
      privacyVisible: document.querySelector('.settings-privacy [data-analytics-toggle]') !== null,
      fullscreenVisible: document.querySelector('[data-settings-fullscreen]') !== null,
      returnToHubVisible: document.querySelector('[data-return-hub]') !== null,
      settings: window.__ROOSTER_TEST__.getEffectSettings()
    }));
    assert(settingsOpen.visible && settingsOpen.buttons === 4 && settingsOpen.privacyVisible
      && settingsOpen.fullscreenVisible
      && settingsOpen.returnToHubVisible,
    'In-run settings must expose effects, fullscreen, privacy and the main-menu action.', settingsOpen);
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
    assert(['Source', 'Damage', 'Share', 'Hits', 'Kills', 'Overkill', 'Active']
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

async function verifyReturnToHub(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, { width: 390, height: 844 }, 'return-hub');
  try {
    await page.click('[data-settings]');
    await page.click('[data-return-hub]');
    const confirmation = await page.evaluate(() => ({
      visible: document.querySelector('.return-hub-panel') !== null,
      confirmLabel: document.querySelector('[data-return-confirm]')?.textContent.trim(),
      cancelLabel: document.querySelector('[data-return-cancel]')?.textContent.trim()
    }));
    assert(confirmation.visible
      && confirmation.confirmLabel === 'Leave run'
      && confirmation.cancelLabel === 'Keep fighting',
    'Returning to the hub lacks a clear confirmation step.', confirmation);

    await page.click('[data-return-cancel]');
    assert(await page.locator('.settings-panel').count() === 1,
      'Cancelling the return-to-hub confirmation did not restore settings.');

    await page.click('[data-return-hub]');
    await page.click('[data-return-confirm]');
    await page.waitForSelector('.henhouse-panel');
    const result = await page.evaluate(() => ({
      hubVisible: document.querySelector('.henhouse-panel') !== null,
      runActionHidden: document.querySelector('[data-return-hub]') === null,
      choosingRooster: window.__ROOSTER_TEST__.getState().choosingRooster
    }));
    assert(result.hubVisible && result.runActionHidden && result.choosingRooster,
      'Confirmed return did not restart safely in the Henhouse.', result);
    assert(errors.length === 0, 'Browser errors in return-to-hub flow.', errors);
    return { confirmation, result };
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
      arenaPresentation: await verifyArenaPresentation(browser, serverState.url),
      shortMobileHub: await verifyShortMobileHubScrolling(browser, serverState.url),
      report: await verifySettingsAndReport(browser, serverState.url),
      returnToHub: await verifyReturnToHub(browser, serverState.url)
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'hud-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster HUD/report gate passed.');
    console.log(JSON.stringify({
      layouts: report.layouts.map((layout) => ({ name: layout.name, height: layout.hud.height })),
      sources: report.report.sources,
      deathCause: report.report.deathCause,
      effectControls: report.report.effectControls,
      returnToHub: report.returnToHub.result
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
