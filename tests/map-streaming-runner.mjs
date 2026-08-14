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
  assert(state.activeChunks.every((chunk) => !chunk.groundFlipX && !chunk.groundFlipY),
    'Directional ground art was flipped during chunk recycling.', state.activeChunks);
  if (state.id === 'vertical-run') {
    const leftTextures = new Set(['arena-feed-alley-left', 'arena-feed-alley-left-v2']);
    const rightTextures = new Set(['arena-feed-alley-right', 'arena-feed-alley-right-v2']);
    assert(state.activeChunks.every((chunk) => (
      leftTextures.has(chunk.edgeLeft?.texture)
        && rightTextures.has(chunk.edgeRight?.texture)
        && !chunk.edgeLeft.flipX && !chunk.edgeLeft.flipY
        && !chunk.edgeRight.flipX && !chunk.edgeRight.flipY
    )), 'Feed Alley exterior scenery changed orientation or texture.', state.activeChunks);
    const destructibleProps = state.obstacles.filter((obstacle) => (
      obstacle.active && obstacle.destructible
    ));
    assert(state.activeChunks.every((chunk) => (
      destructibleProps.filter((obstacle) => obstacle.id.startsWith(`${chunk.key}-`)).length <= 1
    )), 'Feed Alley placed more than one destructible obstacle in a chunk.', {
      destructibleProps,
      chunks: state.activeChunks
    });
    const overlaps = destructibleProps.flatMap((first, firstIndex) => (
      destructibleProps.slice(firstIndex + 1).filter((second) => (
        Math.abs(first.x - second.x) < (first.width + second.width) / 2
          && Math.abs(first.y - second.y) < (first.height + second.height) / 2
      )).map((second) => [first.id, second.id])
    ));
    assert(overlaps.length === 0,
      'Feed Alley destructible obstacles overlap.', overlaps);
  }
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
  const landmarkObstacles = activeObstacles.filter((obstacle) => (
    ['barn', 'well'].includes(obstacle.kind)
  ));
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
    assert(!initial.activeChunks.some((chunk) => chunk.landmark === 'landmark-orchard'),
      'Harvest Yard still contains the removed combat-obscuring orchard landmark.', initial.activeChunks);
    const snapshots = [];
    const seenLandmarks = new Set(initial.activeChunks.map((chunk) => chunk.landmark).filter(Boolean));
    const seenEdgeTextures = new Set(initial.activeChunks.flatMap((chunk) => (
      [chunk.edgeLeft?.texture, chunk.edgeRight?.texture].filter(Boolean)
    )));
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
      snapshot.arena.activeChunks.forEach((chunk) => {
        if (chunk.landmark) seenLandmarks.add(chunk.landmark);
        if (chunk.edgeLeft?.texture) seenEdgeTextures.add(chunk.edgeLeft.texture);
        if (chunk.edgeRight?.texture) seenEdgeTextures.add(chunk.edgeRight.texture);
      });
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
    const expectedThemes = arenaId === 'open-yard' ? ['landmark-barn', 'landmark-well'] : [];
    assert(expectedThemes.every((texture) => seenLandmarks.has(texture)),
      'Traversal did not exercise every new themed landmark.', {
        arenaId, expectedThemes, seenLandmarks: [...seenLandmarks]
      });
    if (arenaId === 'vertical-run') {
      assert(seenLandmarks.size === 0,
        'Feed Alley still places large opaque landmarks in the combat lane.', [...seenLandmarks]);
      const expectedEdgeTextures = [
        'arena-feed-alley-left',
        'arena-feed-alley-left-v2',
        'arena-feed-alley-right',
        'arena-feed-alley-right-v2'
      ];
      assert(expectedEdgeTextures.every((texture) => seenEdgeTextures.has(texture)),
        'Feed Alley traversal did not exercise both scenery variants on each side.', {
          expectedEdgeTextures,
          seenEdgeTextures: [...seenEdgeTextures]
        });
    }
    assert(errors.length === 0, `Browser errors in ${arenaId} traversal.`, errors);
    return {
      arenaId,
      chunkPoolSize: finalState.chunkPoolSize,
      recycledChunks: finalState.recycledChunks,
      seenLandmarks: [...seenLandmarks],
      seenEdgeTextures: [...seenEdgeTextures],
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
    assert(result.arena.bounds.x === 85 && result.arena.bounds.y === 45
      && result.arena.bounds.width === 1230 && result.arena.bounds.height === 810,
    'Coop Square does not expose the expanded enclosed bounds.', result.arena.bounds);
    assert(result.northWest.x >= result.arena.bounds.x + 80
      && result.northWest.y >= result.arena.bounds.y + 80
      && result.southEast.x <= result.arena.bounds.x + result.arena.bounds.width - 80
      && result.southEast.y <= result.arena.bounds.y + result.arena.bounds.height - 80,
    'Coop Square no longer clamps to its enclosed bounds.', result);
    const bounds = result.arena.bounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const directions = [
      { id: 'north', start: [centerX, bounds.y + 110], key: 'KeyW' },
      { id: 'south', start: [centerX, bounds.y + bounds.height - 110], key: 'KeyS' },
      { id: 'west', start: [bounds.x + 110, centerY], key: 'KeyA' },
      { id: 'east', start: [bounds.x + bounds.width - 110, centerY], key: 'KeyD' }
    ];
    const stops = [];
    for (const direction of directions) {
      await page.evaluate(([x, y]) => window.__ROOSTER_TEST__.movePlayerTo(x, y), direction.start);
      await page.keyboard.down(direction.key);
      await page.waitForTimeout(1200);
      await page.keyboard.up(direction.key);
      const position = await page.evaluate(() => window.__ROOSTER_TEST__.getState().player);
      stops.push({ id: direction.id, x: position.x, y: position.y });
    }
    const physicalFence = { bounds, stops };
    assert(physicalFence.stops.every(({ x, y }) => (
      x >= bounds.x - 1 && x <= bounds.x + bounds.width + 1
        && y >= bounds.y - 1 && y <= bounds.y + bounds.height + 1
    )), 'Player crossed a physical Coop Square fence collider.', physicalFence);

    const spawnSample = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.movePlayerTo(700, 450);
      api.clearEnemies();
      const spawns = [];
      for (let index = 0; index < 80; index += 1) {
        const spawn = api.spawnSafeEnemyType(index % 2 ? 'kornkrabbler' : 'slime');
        if (spawn) spawns.push(spawn);
      }
      return { bounds: api.getArenaState().bounds, spawns };
    });
    assert(spawnSample.spawns.length === 80, 'Coop Square spawn sample was incomplete.', spawnSample);
    assert(spawnSample.spawns.every(({ x, y }) => (
      x >= spawnSample.bounds.x + 65
        && x <= spawnSample.bounds.x + spawnSample.bounds.width - 65
        && y >= spawnSample.bounds.y + 65
        && y <= spawnSample.bounds.y + spawnSample.bounds.height - 65
    )), 'An enemy spawned outside the Coop Square fence.', spawnSample);
    assert(errors.length === 0, 'Browser errors in Coop Square enclosure check.', errors);
    return { ...result, physicalFence, spawnSample };
  } finally {
    await page.close();
  }
}

async function verifyFeedAlleyResponsiveFraming(browser, serverUrl) {
  const scenarios = [
    { id: 'portrait', viewport: { width: 390, height: 844 }, laneWidth: 560, zoom: 0.54 },
    { id: 'landscape', viewport: { width: 844, height: 390 }, laneWidth: 800, zoom: 1 },
    { id: 'desktop', viewport: { width: 960, height: 540 }, laneWidth: 800, zoom: 1 }
  ];
  const results = [];
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: scenario.viewport });
    try {
      await page.goto(`${serverUrl}?seed=feed-responsive-${scenario.id}&arena=vertical-run`, {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForFunction(() => window.__ROOSTER_TEST__?.getArenaState);
      const state = await page.evaluate(() => ({
        arena: window.__ROOSTER_TEST__.getArenaState(),
        game: window.__ROOSTER_TEST__.getState()
      }));
      assert(state.arena.playableWorldBounds.width === scenario.laneWidth,
        `${scenario.id}: Feed Alley selected the wrong responsive lane width.`, state);
      assert(Math.abs(state.game.cameraZoom - scenario.zoom) < 0.001,
        `${scenario.id}: Feed Alley selected the wrong responsive camera zoom.`, state);
      const visibleWorldWidth = scenario.viewport.width / state.game.cameraZoom;
      assert(scenario.id !== 'portrait' || visibleWorldWidth - scenario.laneWidth >= 160,
        'Portrait Feed Alley does not expose enough exterior scenery.', {
          ...state,
          visibleWorldWidth
        });
      results.push({
        id: scenario.id,
        laneWidth: state.arena.playableWorldBounds.width,
        cameraZoom: state.game.cameraZoom,
        visibleWorldWidth
      });
    } finally {
      await page.close();
    }
  }
  return results;
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
    const feedResponsive = await verifyFeedAlleyResponsiveFraming(browser, serverState.url);
    const report = {
      generatedAt: new Date().toISOString(),
      equivalentRunSeconds: Math.round(distance / 210),
      openYard,
      verticalRun,
      coopSquare: {
        bounds: coopSquare.arena.bounds,
        physicalFenceStops: coopSquare.physicalFence.stops,
        spawnSampleSize: coopSquare.spawnSample.spawns.length
      },
      feedResponsive
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
