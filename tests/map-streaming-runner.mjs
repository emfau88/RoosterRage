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
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

function validateChunkCoverage(state, expectedPool) {
  assert(state.streaming, 'Pseudo-infinite arena is not marked as streaming.', state);
  assert(state.chunkPoolSize === expectedPool && state.activeChunks.length === expectedPool,
    'Chunk pool grew, shrank, or left an inactive gap.', state);
  assert(new Set(state.activeChunks.map((chunk) => chunk.key)).size === expectedPool,
    'Chunk keys are duplicated.', state.activeChunks);
  const playerX = state.bounds.x + state.bounds.width / 2;
  const playerY = state.bounds.y + state.bounds.height / 2;
  assert(state.activeChunks.some((chunk) => (
    Math.abs(playerX - chunk.x) <= chunk.width / 2
      && Math.abs(playerY - chunk.y) <= chunk.height / 2
  )), 'The active window center falls into a chunk gap.', { playerX, playerY, state });
  const activeObstacles = state.obstacles.filter((obstacle) => obstacle.active);
  assert(activeObstacles.every((obstacle) => state.activeChunks.some((chunk) => (
    Math.abs(obstacle.x - chunk.x) <= chunk.width / 2 + 48
      && Math.abs(obstacle.y - chunk.y) <= chunk.height / 2 + 48
  ))), 'A recycled collider remained outside the active chunks.', { activeObstacles, chunks: state.activeChunks });
  const landmarkChunks = state.activeChunks.filter((chunk) => chunk.landmark);
  assert(landmarkChunks.every((chunk) => chunk.landmarkCollider),
    'A visible landmark is missing its recycled collision footprint.', landmarkChunks);
  assert(landmarkChunks.every((chunk) => (
    chunk.landmarkCollider.width >= 70
      && chunk.landmarkCollider.height >= 50
      && ['barn', 'well'].includes(chunk.landmarkCollider.kind)
  )), 'A landmark collision footprint is too small or has the wrong type.', landmarkChunks);
  const landmarkObstacles = activeObstacles.filter((obstacle) => ['barn', 'well'].includes(obstacle.kind));
  assert(landmarkObstacles.length === landmarkChunks.length
    && landmarkObstacles.every((obstacle) => !obstacle.destructible),
  'Landmark colliders are not one-to-one solid bodies.', { landmarkChunks, landmarkObstacles });
}

async function openArena(browser, serverUrl, arenaId) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=phase-e-${arenaId}&profile=manual&arena=${arenaId}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.movePlayerTo);
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace');
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
  });
  return { page, errors };
}

async function traverse(browser, serverUrl, arenaId, routes, expectedPool) {
  const { page, errors } = await openArena(browser, serverUrl, arenaId);
  try {
    const initial = await page.evaluate(() => window.__ROOSTER_TEST__.getArenaState());
    validateChunkCoverage(initial, expectedPool);
    const snapshots = [];
    for (const route of routes) {
      const snapshot = await page.evaluate(({ x, y }) => {
        const api = window.__ROOSTER_TEST__;
        const player = api.movePlayerTo(x, y);
        const safePoints = api.sampleSafeArenaPoints(32);
        const pickup = api.spawnPickup('heal');
        return {
          player,
          arena: api.getArenaState(),
          safePoints,
          pickupState: api.getPickupState(),
          pickup
        };
      }, route);
      validateChunkCoverage(snapshot.arena, expectedPool);
      assert(snapshot.safePoints.every((point) => point.reachable && !point.blocked),
        'Streaming safe-point generation produced invalid geometry.', snapshot);
      assert(snapshot.pickupState.items.every((pickup) => pickup.reachable),
        'A pickup became unreachable after chunk recycling.', snapshot.pickupState);
      snapshots.push({
        player: snapshot.player,
        anchor: snapshot.arena.chunkAnchor,
        recycledChunks: snapshot.arena.recycledChunks,
        landmarks: snapshot.arena.activeChunks.filter((chunk) => chunk.landmark).length
      });
    }
    const finalState = await page.evaluate(() => window.__ROOSTER_TEST__.getArenaState());
    assert(finalState.recycledChunks >= expectedPool,
      'Traversal did not recycle a meaningful number of chunks.', finalState);
    assert(errors.length === 0, `Browser errors in ${arenaId} traversal.`, errors);
    return {
      arenaId,
      chunkPoolSize: finalState.chunkPoolSize,
      recycledChunks: finalState.recycledChunks,
      routes: snapshots
    };
  } finally {
    await page.close();
  }
}

async function verifySquareRemainsEnclosed(browser, serverUrl) {
  const { page, errors } = await openArena(browser, serverUrl, 'square-coop');
  try {
    const result = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const northWest = api.movePlayerTo(-5000, -5000);
      const southEast = api.movePlayerTo(5000, 5000);
      return { northWest, southEast, arena: api.getArenaState() };
    });
    assert(!result.arena.streaming, 'Coop Square was accidentally converted to streaming.', result);
    assert(result.northWest.x >= result.arena.bounds.x + 80
      && result.northWest.y >= result.arena.bounds.y + 80
      && result.southEast.x <= result.arena.bounds.x + result.arena.bounds.width - 80
      && result.southEast.y <= result.arena.bounds.y + result.arena.bounds.height - 80,
    'Coop Square no longer clamps to its enclosed bounds.', result);
    assert(errors.length === 0, 'Browser errors in Coop Square enclosure check.', errors);
    return result;
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const start = 65536;
    const distance = 27000;
    const openYard = await traverse(browser, serverState.url, 'open-yard', [
      { x: start + distance, y: start },
      { x: start - distance, y: start },
      { x: start, y: start + distance },
      { x: start, y: start - distance },
      { x: start + distance * 0.7, y: start + distance * 0.7 }
    ], 25);
    const verticalRun = await traverse(browser, serverState.url, 'vertical-run', [
      { x: start, y: start + distance },
      { x: start, y: start - distance },
      { x: start, y: start + distance * 0.5 }
    ], 5);
    const coopSquare = await verifySquareRemainsEnclosed(browser, serverState.url);
    const report = {
      generatedAt: new Date().toISOString(),
      equivalentRunSeconds: Math.round(distance / 210),
      openYard,
      verticalRun,
      coopSquare: { bounds: coopSquare.arena.bounds }
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(
      path.join(artifactDir, 'phase-e-map-streaming.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Phase E map streaming gate passed.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
