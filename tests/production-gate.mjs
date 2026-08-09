import { loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';

async function run() {
  const { preview } = await import('vite');
  const server = await preview({
    root: projectRoot,
    logLevel: 'silent',
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: false
    }
  });

  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?testApi=1`, { waitUntil: 'networkidle' });
    const testApiInstalled = await page.evaluate(() => typeof window.__ROOSTER_TEST__ !== 'undefined');

    if (errors.length) {
      throw new Error(`Production build reported browser errors.\n${JSON.stringify(errors, null, 2)}`);
    }
    if (testApiInstalled) {
      throw new Error('Production build exposed window.__ROOSTER_TEST__.');
    }

    console.log('Rooster production gate passed. Test API is not exposed.');
  } finally {
    await page.close();
    await browser.close();
    await server.httpServer.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
