import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details, null, 2)}`);
}

async function toggleAnalyticsFromArchive(page) {
  await page.locator('[data-hub-tab="archive"]').click();
  const toggle = page.locator('[data-analytics-toggle]:visible');
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${serverState.url}?seed=product-analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getProductAnalytics);
    const initial = await page.evaluate(() => window.__ROOSTER_TEST__.getProductAnalytics());
    assert(!initial.enabled && !initial.endpointConfigured && initial.capturedEvents.length === 0,
      'Analytics was not private-by-default.', initial);

    await toggleAnalyticsFromArchive(page);
    const optedIn = await page.evaluate(() => window.__ROOSTER_TEST__.getProductAnalytics());
    assert(optedIn.enabled && optedIn.capturedEvents.map((entry) => entry.event).includes('consent_granted'),
      'Visible consent did not enable anonymous analytics.', optedIn);
    await fs.mkdir(path.join(projectRoot, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(projectRoot, 'test-results', 'product-analytics-consent.png') });

    await page.evaluate(() => window.__ROOSTER_TEST__.selectRooster('ace'));
    const active = await page.evaluate(() => window.__ROOSTER_TEST__.getProductAnalytics());
    const activeEvents = active.capturedEvents.map((entry) => entry.event);
    assert(activeEvents.includes('rooster_selected') && activeEvents.includes('run_started'),
      'Opted-in run funnel was not captured.', active);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getProductAnalytics);
    const persisted = await page.evaluate(() => window.__ROOSTER_TEST__.getProductAnalytics());
    assert(persisted.enabled, 'Consent preference did not persist across reload.', persisted);
    await toggleAnalyticsFromArchive(page);
    await page.evaluate(() => window.__ROOSTER_TEST__.selectRooster('ace'));
    const optedOut = await page.evaluate(() => window.__ROOSTER_TEST__.getProductAnalytics());
    assert(!optedOut.enabled
      && optedOut.capturedEvents.some((entry) => entry.event === 'consent_revoked')
      && !optedOut.capturedEvents.some((entry) => entry.event === 'run_started'),
    'Opt-out did not stop subsequent funnel collection.', optedOut);
    assert(errors.length === 0, 'Browser errors in product analytics gate.', errors);
    console.log('Rooster privacy-safe product analytics gate passed.');
    console.log(JSON.stringify({ initial, optedIn, activeEvents, persisted, optedOut }, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
