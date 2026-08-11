import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const arenaIds = ['open-yard', 'vertical-run', 'square-coop'];

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

async function openArena(browser, serverUrl, arenaId) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=phase-12-${arenaId}&profile=average&arena=${arenaId}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getArenaState);
  await page.evaluate(() => {
    window.__ROOSTER_TEST__.selectRooster('ace');
    window.__ROOSTER_TEST__.pauseWaves();
    window.__ROOSTER_TEST__.clearEnemies();
    window.__ROOSTER_TEST__.clearProjectiles();
  });
  return { page, errors };
}

async function verifyArena(browser, serverUrl, arenaId) {
  const { page, errors } = await openArena(browser, serverUrl, arenaId);
  try {
    const snapshot = await page.evaluate(() => ({
      arena: window.__ROOSTER_TEST__.getArenaState(),
      catalog: window.__ROOSTER_TEST__.getArenaCatalog(),
      safePoints: window.__ROOSTER_TEST__.sampleSafeArenaPoints(40)
    }));
    assert(snapshot.arena.id === arenaId, 'Requested arena was not selected.', snapshot.arena);
    assert(snapshot.arena.obstacles.some((obstacle) => obstacle.destructible),
      'Arena has no destructible cover.', snapshot.arena);
    assert(snapshot.safePoints.every((point) => point.reachable && !point.blocked),
      'Safe point generator produced blocked or unreachable coordinates.', snapshot.safePoints);
    assert(snapshot.catalog.length === 3, 'Arena catalog does not contain all topologies.', snapshot.catalog);
    snapshot.catalog.forEach((arena) => {
      const ratings = Object.values(arena.weaponRatings);
      assert(ratings.length >= 5 && Math.min(...ratings) >= 0.8,
        `${arena.id} creates a mandatory weapon family.`, arena.weaponRatings);
    });
    const preferred = snapshot.catalog.map((arena) => Object.entries(arena.weaponRatings)
      .sort((a, b) => b[1] - a[1])[0][0]);
    assert(new Set(preferred).size === 3, 'Arena topologies do not create distinct weapon preferences.', preferred);

    const destructible = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const initial = api.getArenaState().obstacles.find((obstacle) => obstacle.destructible && obstacle.active);
      api.damageFirstDestructible(initial.maxHp * 0.4);
      const stageOne = api.getArenaState().obstacles.find((obstacle) => obstacle.destructible && obstacle.active);
      api.damageFirstDestructible(initial.maxHp * 0.3);
      const stageTwo = api.getArenaState().obstacles.find((obstacle) => obstacle.destructible && obstacle.active);
      return {
        stageOne: stageOne?.damageStage,
        stageTwo: stageTwo?.damageStage,
        destroyed: api.damageFirstDestructible(),
        arena: api.getArenaState()
      };
    });
    assert(destructible.stageOne === 1 && destructible.stageTwo === 2,
      'Destructible cover did not expose both readable damage states.', destructible);
    assert(destructible.destroyed, 'Destructible cover survived lethal prop damage.', destructible);
    assert(destructible.arena.obstacles.some((obstacle) => obstacle.destructible && !obstacle.active),
      'Destroyed cover remains an active collider.', destructible);
    assert(errors.length === 0, `Browser errors in ${arenaId}.`, errors);
    return {
      id: arenaId,
      topology: snapshot.arena.topology,
      bounds: snapshot.arena.bounds,
      destructibles: snapshot.arena.obstacles.filter((obstacle) => obstacle.destructible).length,
      preferredWeapon: preferred[snapshot.catalog.findIndex((arena) => arena.id === arenaId)]
    };
  } finally {
    await page.close();
  }
}

async function verifyPickups(browser, serverUrl) {
  const { page, errors } = await openArena(browser, serverUrl, 'open-yard');
  try {
    const result = await page.evaluate(async () => {
      const api = window.__ROOSTER_TEST__;
      const beforeFirstPickup = api.advancePickupSchedule(1, 0.59);
      const firstPickup = api.advancePickupSchedule(1, 0.6);
      api.setPlayerHp(40);
      const healed = api.collectPickup('heal');
      const hpAfterHeal = api.getPlayerStats().hp;

      api.spawnXpCluster(8, 3, 1020, 700);
      api.advancePickupSchedule(2, 0.55);
      const magnet = api.collectPickup('magnet');

      const enemyId = api.spawnEnemyType('slime', 880, 450, {
        hp: 80,
        maxHp: 80,
        speed: 0,
        damage: 0,
        xpOverride: 0
      });
      api.advancePickupSchedule(3, 0.55);
      const bomb = api.collectPickup('bomb');
      const enemySurvived = api.getEnemySnapshot().some((enemy) => enemy.id === enemyId);

      api.spawnPickup('elite-chest');
      const chest = api.collectPickup('elite-chest');
      await new Promise((resolve) => setTimeout(resolve, 240));
      const chestAjar = api.getPickupState().openingChestStates[0]?.texture;
      await new Promise((resolve) => setTimeout(resolve, 220));
      const chestOpen = api.getPickupState().openingChestStates[0]?.texture;
      await new Promise((resolve) => setTimeout(resolve, 500));
      const chestSelection = api.getProgressionState();
      const firstChoice = chestSelection.choices?.[0]?.id;
      if (firstChoice) api.resumeIfUpgradeOpen();

      api.spawnPickup('golden-chest');
      const goldenChest = api.collectPickup('golden-chest');
      await new Promise((resolve) => setTimeout(resolve, 820));
      const goldenSelection = api.getProgressionState();
      api.resumeIfUpgradeOpen();

      api.spawnPickup('royal-chest');
      const royalChest = api.collectPickup('royal-chest');
      await new Promise((resolve) => setTimeout(resolve, 820));
      const royalSelection = api.getProgressionState();
      api.resumeIfUpgradeOpen();

      const propDrop = api.forcePropDrop(4);

      api.advancePickupSchedule(5, 0.45);
      api.advancePickupSchedule(6, 0.55);
      api.advancePickupSchedule(7, 0.6);
      api.advancePickupSchedule(9, 0.5);
      for (let index = 0; index < 8; index += 1) api.spawnPickup('heal');
      const pickupState = api.getPickupState();
      return {
        healed,
        hpAfterHeal,
        magnet,
        bomb,
        enemySurvived,
        chest,
        chestAjar,
        chestOpen,
        chestSelection,
        goldenChest,
        goldenSelection,
        royalChest,
        royalSelection,
        propDrop,
        beforeFirstPickup,
        firstPickup,
        pickupState,
        telemetry: api.getTelemetry()
      };
    });
    assert(result.healed && result.hpAfterHeal === 65, 'Heal pickup is not a bounded 25% max-HP heal.', result);
    assert(result.beforeFirstPickup.spawned.heal === 0 && result.firstPickup.spawned.heal === 1,
      'First heal did not respect its Wave 1 progress threshold.', result);
    assert(result.magnet && result.pickupState.magnetActive, 'Temporary XP magnet did not activate.', result);
    assert(result.bomb && !result.enemySurvived, 'Arena bomb did not clear a normal enemy.', result);
    assert(result.chest && result.chestSelection.currentSelection?.type === 'chest',
      'Elite chest did not open the chest reward lane.', result);
    assert(result.chestAjar === 'pickup-elite-chest-ajar'
      && result.chestOpen === 'pickup-elite-chest-open',
    'Elite chest did not pass through its half-open and open animation states.', result);
    assert(result.goldenChest && result.goldenSelection.currentSelection?.kind === 'golden'
      && result.goldenSelection.choices.length === 3
      && result.goldenSelection.choices.some((choice) => choice.rewardPriority !== 'new'),
    'Golden champion chest did not prioritize owned/EVO progression.', result.goldenSelection);
    assert(result.royalChest && result.royalSelection.currentSelection?.kind === 'boss'
      && result.royalSelection.choices.length === 4,
    'Royal boss chest did not provide the four-choice boss reward.', result.royalSelection);
    assert(['heal', 'magnet', 'bomb'].includes(result.propDrop) && result.pickupState.propDrops === 1,
      'Destructible world prop did not release a budgeted world pickup.', result);
    assert(result.pickupState.spawned.heal === result.pickupState.budgets.heal,
      'Heal pickup exceeded or failed to reach its run budget.', result.pickupState);
    assert(result.pickupState.scheduleIndex === result.pickupState.schedule.length
      && result.pickupState.nextScheduled === null,
    'Wave-based pickup schedule did not advance through its seven strategic moments.', result.pickupState);
    assert(result.pickupState.items.every((item) => item.reachable),
      'A pickup spawned outside reachable geometry.', result.pickupState);
    assert(result.telemetry.pickupsCollectedByKind.heal === 1
      && result.telemetry.pickupsCollectedByKind.bomb === 1
      && result.telemetry.pickupsCollectedByKind.magnet === 1
      && result.telemetry.pickupsCollectedByKind['elite-chest'] === 1,
    'Pickup telemetry is incomplete.', result.telemetry);
    assert(errors.length === 0, 'Browser errors in pickup scenario.', errors);
    return {
      hpAfterHeal: result.hpAfterHeal,
      budgets: result.pickupState.budgets,
      collected: result.pickupState.collected,
      magnetRemainingMs: result.pickupState.magnetRemainingMs
    };
  } finally {
    await page.close();
  }
}

async function verifyRewardPresentation(browser, serverUrl) {
  const { page, errors } = await openArena(browser, serverUrl, 'open-yard');
  try {
    const state = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.movePlayerTo(65536, 65536);
      api.spawnEnemyType('champion-charger', 700, 300, { speed: 0, damage: 0, hp: 9999 });
      api.spawnPickup('elite-chest', 600, 600);
      api.spawnPickup('golden-chest', 700, 600);
      api.spawnPickup('royal-chest', 800, 600);
      return api.getPickupState();
    });
    await page.waitForTimeout(180);
    await page.screenshot({ path: path.join(artifactDir, 'reward-tiers-mobile.png') });
    const tiers = ['elite-chest', 'golden-chest', 'royal-chest']
      .map((kind) => state.items.find((item) => item.kind === kind));
    assert(tiers.every(Boolean)
      && tiers[0].displayWidth < tiers[1].displayWidth
      && tiers[1].displayWidth < tiers[2].displayWidth,
    'Chest tiers are not visibly ordered by importance.', tiers);
    assert(errors.length === 0, 'Browser errors in reward-presentation gate.', errors);
    return tiers.map(({ kind, displayWidth, displayHeight }) => ({ kind, displayWidth, displayHeight }));
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const arenas = [];
    for (const arenaId of arenaIds) {
      arenas.push(await verifyArena(browser, serverState.url, arenaId));
    }
    const pickups = await verifyPickups(browser, serverState.url);
    const rewardPresentation = await verifyRewardPresentation(browser, serverState.url);
    const report = { generatedAt: new Date().toISOString(), arenas, pickups, rewardPresentation };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'arena-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster arena/pickup gate passed.');
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
