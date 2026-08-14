import fs from 'node:fs/promises';
import path from 'node:path';
import { UPGRADE_DEFINITIONS } from '../src/data/upgradeDefinitions.js';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results', 'weapon-progression');

const weapons = [
  {
    id: 'primary-ace-rank',
    base: 'primary-ace',
    rooster: 'ace',
    normalRanks: 4,
    evolution: 'evo-sunshot-array',
    passive: 'ace-deadeye-drill',
    source: 'base-egg',
    primary: true
  },
  {
    id: 'primary-artillery-rank',
    base: 'primary-artillery',
    rooster: 'artillery',
    normalRanks: 4,
    evolution: 'evo-siegebreaker-shell',
    passive: 'artillery-reinforced-breech',
    source: 'base-egg',
    primary: true
  },
  {
    id: 'primary-storm-rank',
    base: 'primary-storm',
    rooster: 'storm',
    normalRanks: 4,
    evolution: 'evo-tempest-crown',
    passive: 'storm-static-plumage',
    source: 'base-egg',
    primary: true
  },
  { id: 'golden-egg', normalRanks: 4, evolution: 'evo-solar-scramble', passive: 'fire-eggs' },
  { id: 'orbit-eggs', normalRanks: 4, evolution: 'evo-shell-halo', passive: 'armor', companion: true },
  { id: 'molotov-egg', normalRanks: 4, evolution: 'evo-phoenix-pan', passive: 'regen' },
  { id: 'lightning-comb', normalRanks: 4, evolution: 'evo-thunder-roost', passive: 'critical-yolk' },
  { id: 'support-chick', normalRanks: 5, evolution: 'evo-chick-squadron', passive: 'faster-eggs', companion: true },
  { id: 'rocket-egg', normalRanks: 4, evolution: 'evo-broodstorm', passive: 'bigger-eggs' },
  { id: 'void-nest', normalRanks: 4, evolution: 'evo-singularity-nest', passive: 'xp-magnet' },
  { id: 'laser-comb', normalRanks: 4, evolution: 'evo-dawn-laser', passive: 'swift-shells' }
].map((weapon) => ({
  rooster: 'ace',
  base: weapon.id,
  source: weapon.id,
  ...weapon
}));

function assert(condition, message, details = null) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

function sourceDamage(telemetry, source) {
  return Object.entries(telemetry.effectiveDamageBySource ?? {})
    .filter(([candidate]) => candidate === source || candidate.startsWith(`${source}:`))
    .reduce((total, [, damage]) => total + damage, 0);
}

function validateDefinitions() {
  for (const weapon of weapons) {
    const definition = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === weapon.id);
    assert(definition, `Missing progression definition for ${weapon.id}.`);
    const expectedPicks = weapon.primary ? weapon.normalRanks - 1 : weapon.normalRanks;
    assert(definition.maxRank === expectedPicks, `${weapon.id} has the wrong normal-rank count.`, definition);
    assert(
      definition.rankDescriptions?.length === expectedPicks,
      `${weapon.id} does not describe every normal rank.`,
      definition.rankDescriptions
    );
    const evolution = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === weapon.evolution);
    assert(evolution?.evolution?.base === weapon.base, `${weapon.id} has no matching EVO recipe.`, evolution);
  }
  const fireEggs = UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === 'fire-eggs');
  assert(fireEggs?.maxRank === 3, 'Fire Eggs must expose all three ranks.', fireEggs);
  assert(fireEggs.rankDescriptions?.length === 3, 'Fire Eggs does not describe every rank.', fireEggs);
}

async function openWeapon(browser, serverUrl, weapon) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=weapon-${weapon.id}&profile=average`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.triggerActiveAbility);
  await page.evaluate((rooster) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster(rooster);
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.setPlayerLevel(20);
    api.movePlayer(700, 450);
  }, weapon.rooster);
  return { page, errors };
}

async function spawnTargetsAndTrigger(page, weapon, stage) {
  return page.evaluate(({ id, primary, companion, stageName }) => {
    const api = window.__ROOSTER_TEST__;
    api.clearEnemies();
    if (!companion) api.clearProjectiles();
    api.movePlayer(700, 450);
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const showcaseProjectile = ['primary-ace-rank', 'golden-egg'].includes(id);
      const nearRadius = showcaseProjectile ? 170 : 82;
      const farRadius = showcaseProjectile ? 245 : 145;
      const radius = index < 6 ? nearRadius : farRadius + (index % 3) * 34;
      api.spawnEnemyType(
        'slime',
        700 + Math.cos(angle) * radius,
        450 + Math.sin(angle) * radius,
        { hp: 9999, speed: 0, damage: 0, xpOverride: 0 }
      );
    }
    const before = api.getTelemetry();
    if (primary) {
      const targetEggSequence = id === 'primary-ace-rank'
        ? { r1: 0, r2: 1, r3: 3, r4: 0, evo: 0 }[stageName]
        : null;
      api.triggerPrimaryAttack(targetEggSequence);
    } else if (!companion) {
      api.triggerActiveAbility(id);
    }
    return before;
  }, { ...weapon, stageName: stage });
}

async function captureStage(page, weapon, stage, expectedRank, source) {
  const before = await spawnTargetsAndTrigger(page, weapon, stage);
  const visualDelay = weapon.primary ? 45
    : ['lightning-comb', 'laser-comb'].includes(weapon.id) ? 55
      : weapon.id === 'golden-egg' ? 90
        : weapon.id === 'rocket-egg' ? 360
          : weapon.id === 'molotov-egg' ? 520
            : 180;
  await page.waitForTimeout(visualDelay);
  const projectiles = await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot()
    .filter((projectile) => projectile.active));
  const orbitVisuals = weapon.id === 'orbit-eggs'
    ? await page.evaluate(() => window.__ROOSTER_TEST__.getOrbitVisualState())
    : [];
  const screenshot = `${weapon.id}-${stage}.png`;
  let upgradeScreenshot;
  let impactScreenshot;
  let remainingDelay = 1050 - visualDelay;
  if (weapon.id === 'orbit-eggs') {
    upgradeScreenshot = `${weapon.id}-${stage}-upgrade.png`;
    await page.screenshot({ path: path.join(artifactDir, upgradeScreenshot) });
    const steadyStateDelay = 520;
    await page.waitForTimeout(steadyStateDelay);
    remainingDelay -= steadyStateDelay;
  }
  await page.screenshot({ path: path.join(artifactDir, screenshot) });
  if (weapon.id === 'golden-egg') {
    const impactDelay = 285;
    await page.waitForTimeout(impactDelay);
    impactScreenshot = `${weapon.id}-${stage}-impact.png`;
    await page.screenshot({ path: path.join(artifactDir, impactScreenshot) });
    remainingDelay -= impactDelay;
  }
  if (weapon.id === 'primary-ace-rank') {
    const visualExpectations = {
      r1: { count: 1, texture: 'egg', rank: 1, scale: 1, line: [0, 1, 0], tint: 0xffffff, critical: false },
      r2: { count: 2, texture: 'egg', rank: 2, scale: 1.14, line: [10, 1, 0.06], tint: 0xfff3c4, critical: false },
      r3: { count: 2, texture: 'egg', rank: 3, scale: 1.397, line: [20, 1.7, 0.17], tint: 0xffffff, critical: true },
      r4: { count: 2, texture: 'egg', rank: 4, scale: 1.42, line: [18, 1.4, 0.12], tint: 0xffcf72, critical: false },
      evo: {
        count: 3,
        texture: 'evo-sunshot-array-projectile',
        rank: 'EVO',
        scale: 1.16,
        line: [0, 1, 0],
        tint: 0xffffff,
        critical: false
      }
    };
    const expected = visualExpectations[stage];
    assert(projectiles.length === expected.count, `Target Egg ${stage} has the wrong salvo size.`, {
      expected,
      projectiles
    });
    assert(projectiles.every((projectile) => (
      projectile.texture === expected.texture
      && projectile.visualRank === expected.rank
      && Math.abs(projectile.scale - expected.scale) < 0.001
      && projectile.trailVisible === false
      && projectile.lineTrailLength === expected.line[0]
      && Math.abs(projectile.lineTrailWidth - expected.line[1]) < 0.001
      && Math.abs(projectile.lineTrailAlpha - expected.line[2]) < 0.001
      && projectile.lineTrailVisible === (expected.line[0] > 0)
      && projectile.tint === expected.tint
      && projectile.criticalVisual === expected.critical
    )), `Target Egg ${stage} has the wrong visual profile.`, { expected, projectiles });
  }
  await page.waitForTimeout(remainingDelay);
  const after = await page.evaluate(() => ({
    telemetry: window.__ROOSTER_TEST__.getTelemetry(),
    loadout: window.__ROOSTER_TEST__.getLoadout(),
    abilities: window.__ROOSTER_TEST__.getAbilityState(),
    player: window.__ROOSTER_TEST__.getRoosterVisualState(),
    state: window.__ROOSTER_TEST__.getState()
  }));
  const entry = after.loadout.active.find((item) => item.id === weapon.base || item.sourceId === weapon.id);
  const damageBefore = sourceDamage(before, source);
  const damageAfter = sourceDamage(after.telemetry, source);
  const damage = damageAfter - damageBefore;
  assert(entry, `${weapon.id} is missing from the active loadout at ${stage}.`, after.loadout);
  if (stage !== 'evo') {
    assert(entry.rank === expectedRank, `${weapon.id} loadout rank mismatch at ${stage}.`, entry);
  } else {
    assert(entry.rank === 'EVO' && entry.evolved, `${weapon.id} did not become an EVO.`, entry);
  }
  assert(damage > 0, `${weapon.id} produced no isolated damage at ${stage}.`, {
    source,
    before: damageBefore,
    after: damageAfter,
    state: after.state
  });
  if (weapon.id === 'golden-egg') {
    const visualExpectations = {
      r1: { texture: 'golden-egg', count: 1, displayWidth: 40.64, trailRadius: 16 },
      r2: { texture: 'golden-egg-r2', count: 1, displayWidth: 47.26, trailRadius: 19 },
      r3: { texture: 'golden-egg-r3', count: 1, displayWidth: 54.36, trailRadius: 23 },
      r4: { texture: 'golden-egg-r4', count: 2, displayWidth: 65.2, trailRadius: 28 },
      evo: { texture: 'evo-solar-scramble-projectile', count: 3, displayWidth: 68.4, trailRadius: 29 }
    };
    const expected = visualExpectations[stage];
    const matchingProjectiles = projectiles.filter((projectile) => projectile.texture === expected.texture);
    assert(
      matchingProjectiles.length === expected.count,
      `Golden Egg ${stage} did not use its expected projectile texture.`,
      { expected, projectiles }
    );
    assert(
      matchingProjectiles.every((projectile) => (
        Math.abs(projectile.displayWidth - expected.displayWidth) < 0.01
        && projectile.trailRadius === expected.trailRadius
      )),
      `Golden Egg ${stage} did not use its expected visual size and trail.`,
      { expected, matchingProjectiles }
    );
  }
  if (weapon.id === 'orbit-eggs') {
    const visualExpectations = {
      r1: { count: 1, texture: 'egg', radii: [80], perRing: [1], scale: 1.25 },
      r2: { count: 2, texture: 'egg', radii: [90], perRing: [2], scale: 1.34 },
      r3: { count: 3, texture: 'egg', radii: [100], perRing: [3], scale: 1.43 },
      r4: { count: 4, texture: 'egg', radii: [104, 130], perRing: [2, 2], scale: 1.54 },
      evo: {
        count: 6,
        texture: 'evo-shell-halo-projectile',
        radii: [116, 146],
        perRing: [3, 3],
        scale: 1.08,
        breathAmount: 16
      }
    };
    const expected = visualExpectations[stage];
    assert(orbitVisuals.length === expected.count, `Orbit Eggs ${stage} has the wrong count.`, {
      expected,
      orbitVisuals
    });
    expected.radii.forEach((radius, ringIndex) => {
      const ring = orbitVisuals.filter((egg) => egg.ringIndex === ringIndex);
      assert(ring.length === expected.perRing[ringIndex], `Orbit Eggs ${stage} has the wrong ring split.`, {
        expected,
        ringIndex,
        orbitVisuals
      });
      assert(ring.every((egg) => (
        egg.texture === expected.texture
        && egg.baseRadius === radius
        && Math.abs(egg.scale - expected.scale) < 0.001
        && egg.radius >= radius - 0.01
        && egg.radius <= radius + (expected.breathAmount ?? 0) + 0.01
      )), `Orbit Eggs ${stage} has the wrong visual profile.`, { expected, ring });
    });
    if (stage === 'evo') {
      assert(
        JSON.stringify(orbitVisuals[0].breathSamples) === JSON.stringify([0, 16, 16, 0, 0]),
        'Shell Halo did not expand, hold, contract and rest at the expected radii.',
        orbitVisuals[0]
      );
    }
  }
  return {
    stage,
    rank: entry.rank,
    damage,
    screenshot,
    upgradeScreenshot,
    impactScreenshot,
    ability: weapon.primary ? after.player.primary : after.abilities[
      weapon.id === 'orbit-eggs' ? 'orbitEggs'
        : weapon.id === 'support-chick' ? 'supportChick'
          : weapon.id.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
    ],
    visuals: ['primary-ace-rank', 'golden-egg'].includes(weapon.id)
      ? projectiles
      : weapon.id === 'orbit-eggs' ? orbitVisuals : undefined,
    peakObjects: after.telemetry.peakObjects
  };
}

async function testWeapon(browser, serverUrl, weapon) {
  const { page, errors } = await openWeapon(browser, serverUrl, weapon);
  try {
    if (!weapon.primary) {
      const applied = await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), weapon.id);
      assert(applied, `Could not apply ${weapon.id} R1.`);
    }
    const r1 = await captureStage(page, weapon, 'r1', 1, weapon.source);

    const intermediate = [];
    for (let rank = 2; rank <= weapon.normalRanks; rank += 1) {
      const applied = await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), weapon.id);
      assert(applied, `Could not advance ${weapon.id} to rank ${rank}.`, { rank });
      if (['primary-ace-rank', 'golden-egg', 'orbit-eggs'].includes(weapon.id) && rank < weapon.normalRanks) {
        intermediate.push(await captureStage(page, weapon, `r${rank}`, rank, weapon.source));
      }
    }
    const final = await captureStage(
      page,
      weapon,
      `r${weapon.normalRanks}`,
      weapon.normalRanks,
      weapon.source
    );

    await page.evaluate((passive) => window.__ROOSTER_TEST__.applyUpgradeById(passive), weapon.passive);
    const ready = await page.evaluate((id) => window.__ROOSTER_TEST__.getAvailableUpgradeIds().includes(id), weapon.evolution);
    assert(ready, `${weapon.evolution} was not offered after the full recipe.`);
    await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), weapon.evolution);
    const evolved = await captureStage(page, weapon, 'evo', 'EVO', weapon.evolution);
    assert(errors.length === 0, `Browser errors while testing ${weapon.id}.`, errors);
    return { id: weapon.id, r1, intermediate, final, evolved };
  } finally {
    await page.close();
  }
}

async function testFireEggProgression(browser, serverUrl) {
  const { page, errors } = await openWeapon(browser, serverUrl, { rooster: 'ace' });
  const expectations = {
    1: {
      texture: 'fire-egg', baseScale: 1, pulseX: 0.008, pulseY: 0.024,
      pulseMs: 270, flicker: 0.018
    },
    2: {
      texture: 'fire-egg', baseScale: 1.12, pulseX: 0.014, pulseY: 0.04,
      pulseMs: 235, flicker: 0.028
    },
    3: {
      texture: 'fire-egg-r3', baseScale: 1.1, pulseX: 0.02, pulseY: 0.055,
      pulseMs: 205, flicker: 0.04
    }
  };
  const stages = [];
  try {
    for (let rank = 1; rank <= 3; rank += 1) {
      const applied = await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('fire-eggs'));
      assert(applied, `Could not apply Fire Eggs R${rank}.`);
      await page.evaluate((shotCount) => {
        const api = window.__ROOSTER_TEST__;
        api.clearEnemies();
        api.clearProjectiles();
        api.movePlayer(700, 450);
        api.setShotCount(shotCount);
        api.spawnEnemyType('slime', 1040, 450, {
          hp: 9999,
          speed: 0,
          damage: 0,
          xpOverride: 0
        });
        api.triggerPrimaryAttack(0);
      }, rank);
      await page.waitForTimeout(35);
      const samples = [];
      for (let sampleIndex = 0; sampleIndex < 5; sampleIndex += 1) {
        samples.push(await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot()
          .filter((projectile) => projectile.active && projectile.source === 'fire-eggs')));
        if (sampleIndex < 4) await page.waitForTimeout(20);
      }
      const projectiles = samples[0];
      const expected = expectations[rank];
      assert(projectiles.length === rank, `Fire Eggs R${rank} has the wrong salvo size.`, {
        expected: rank,
        projectiles
      });
      assert(projectiles.every((projectile) => (
        projectile.texture === expected.texture
        && projectile.fireVisualRank === rank
        && Math.abs(projectile.spriteBaseScale - expected.baseScale) < 0.001
        && Math.abs(projectile.spritePulseX - expected.pulseX) < 0.001
        && Math.abs(projectile.spritePulseY - expected.pulseY) < 0.001
        && projectile.spritePulseMs === expected.pulseMs
        && Math.abs(projectile.spriteFlickerAlpha - expected.flicker) < 0.001
        && projectile.trailVisible === false
        && projectile.lineTrailVisible === false
      )), `Fire Eggs R${rank} has the wrong visual profile.`, { expected, projectiles });
      const firstProjectileScaleSamples = samples
        .map((sample) => sample[0]?.scaleY)
        .filter(Number.isFinite);
      const uniqueScaleSamples = new Set(firstProjectileScaleSamples.map((value) => value.toFixed(4)));
      const largestStep = Math.max(...firstProjectileScaleSamples.slice(1).map((value, index) => (
        Math.abs(value - firstProjectileScaleSamples[index])
      )));
      assert(uniqueScaleSamples.size >= 3, `Fire Eggs R${rank} does not animate continuously.`, {
        firstProjectileScaleSamples
      });
      assert(largestStep < 0.08, `Fire Eggs R${rank} flicker changes too abruptly.`, {
        largestStep,
        firstProjectileScaleSamples
      });
      const screenshot = `fire-eggs-r${rank}.png`;
      await page.screenshot({ path: path.join(artifactDir, screenshot) });
      const state = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());
      assert(state.upgradeRanks['fire-eggs'] === rank, `Fire Eggs R${rank} rank state mismatch.`, state);
      stages.push({ rank, screenshot, projectiles, scaleSamples: firstProjectileScaleSamples });
    }
    assert(errors.length === 0, 'Browser errors while testing Fire Eggs.', errors);
    return { id: 'fire-eggs', stages };
  } finally {
    await page.close();
  }
}

async function run() {
  validateDefinitions();
  await fs.mkdir(artifactDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const weapon of weapons) {
      results.push(await testWeapon(browser, serverState.url, weapon));
    }
    results.push(await testFireEggProgression(browser, serverState.url));
    const report = { generatedAt: new Date().toISOString(), results };
    await fs.writeFile(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log('Weapon progression gate passed.');
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
