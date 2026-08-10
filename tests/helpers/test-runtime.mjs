import { createRequire } from 'node:module';
import path from 'node:path';

export const projectRoot = path.resolve(import.meta.dirname, '..', '..');

const defaultUrl = process.env.ROOSTER_TEST_URL ?? 'http://127.0.0.1:5173/';

export function loadPlaywright() {
  const require = createRequire(import.meta.url);

  try {
    return require('playwright');
  } catch (localError) {
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error(
        `Playwright is not installed in this project. Run npm install before testing.\n${localError.message}`
      );
    }

    try {
      const packagePath = path.join(appData, 'npm', 'node_modules', 'playwright', 'package.json');
      return createRequire(packagePath)('playwright');
    } catch {
      throw new Error(
        `Playwright is not installed in this project or globally. Run npm install before testing.\n${localError.message}`
      );
    }
  }
}

async function isRoosterServerReady(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }
    const html = await response.text();
    return html.includes('<title>Rooster Rage');
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isRoosterServerReady(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Dev server did not become ready at ${url}.`);
}

export async function ensureTestServer() {
  if (await isRoosterServerReady(defaultUrl)) {
    return { server: null, url: defaultUrl, reused: true };
  }

  const requestedUrl = new URL(defaultUrl);
  const preferredPort = Number(requestedUrl.port || 5173);
  const { createServer } = await import('vite');
  const server = await createServer({
    root: projectRoot,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: preferredPort,
      strictPort: false
    }
  });

  await server.listen();
  const address = server.httpServer?.address();
  const actualPort = typeof address === 'object' && address ? address.port : preferredPort;
  const url = `http://127.0.0.1:${actualPort}/`;

  try {
    await waitForServer(url);
  } catch (error) {
    await server.close();
    throw error;
  }

  return { server, url, reused: false };
}

export async function stopTestServer(server) {
  await server?.close();
}
