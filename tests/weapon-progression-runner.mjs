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
      const showcaseProjectile = [
        'primary-ace-rank',
        'primary-artillery-rank',
        'primary-storm-rank',
        'golden-egg',
        'rocket-egg'
      ].includes(id);
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
    : weapon.id === 'lightning-comb' ? 25
      : weapon.id === 'laser-comb' ? 55
      : weapon.id === 'golden-egg' ? 90
        : weapon.id === 'rocket-egg' ? 60
          : weapon.id === 'molotov-egg' ? 300
            : 180;
  await page.waitForTimeout(visualDelay);
  const projectiles = await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot()
    .filter((projectile) => projectile.active));
  const orbitVisuals = weapon.id === 'orbit-eggs'
    ? await page.evaluate(() => window.__ROOSTER_TEST__.getOrbitVisualState())
    : [];
  const supportVisuals = weapon.id === 'support-chick'
    ? await page.evaluate(() => window.__ROOSTER_TEST__.getSupportVisualState())
    : [];
  const lightningVisuals = weapon.id === 'lightning-comb'
    ? await page.evaluate(() => window.__ROOSTER_TEST__.getLightningVisualState())
    : [];
  const areaAtFlight = ['molotov-egg', 'rocket-egg', 'void-nest'].includes(weapon.id)
    ? await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState())
    : null;
  const screenshot = `${weapon.id}-${stage}.png`;
  let upgradeScreenshot;
  let impactScreenshot;
  let fieldScreenshot;
  let supportMotion;
  let molotovVisuals;
  let rocketVisuals;
  let voidVisuals;
  let remainingDelay = 1050 - visualDelay;
  if (weapon.id === 'orbit-eggs') {
    upgradeScreenshot = `${weapon.id}-${stage}-upgrade.png`;
    await page.screenshot({ path: path.join(artifactDir, upgradeScreenshot) });
    const steadyStateDelay = 520;
    await page.waitForTimeout(steadyStateDelay);
    remainingDelay -= steadyStateDelay;
  }
  if (weapon.id === 'support-chick') {
    const visualExpectations = {
      r1: { count: 1, texture: 'support-chick-r1-sheet', rank: 1, scale: 0.225 },
      r2: { count: 1, texture: 'support-chick-r2-sheet', rank: 2, scale: 0.225 },
      r3: { count: 1, texture: 'support-chick-r3-sheet', rank: 3, scale: 0.225 },
      r4: { count: 2, texture: 'support-chick-r4-sheet', rank: 4, scale: 0.225 },
      r5: { count: 3, texture: 'support-chick-r5-sheet', rank: 5, scale: 0.225 },
      evo: { count: 4, texture: 'support-chick-evo-sheet', rank: 5, scale: 0.248 }
    };
    const expected = visualExpectations[stage];
    assert(supportVisuals.length === expected.count, `Support Chick ${stage} has the wrong squad size.`, {
      expected,
      supportVisuals
    });
    assert(supportVisuals.every((chick) => (
      chick.texture === expected.texture
      && chick.rank === expected.rank
      && chick.evolved === (stage === 'evo')
      && chick.textureSize.width === 1024
      && chick.textureSize.height === 1024
      && chick.frameSize.width === 256
      && chick.frameSize.height === 256
      && chick.frameTotal === 17
      && Math.abs(chick.scale - expected.scale) < 0.001
      && chick.rotation === 0
      && chick.distanceToPlayer >= 25
      && chick.distanceToPlayer <= 100
      && chick.targetError < 10
      && chick.animation?.includes('-walk-')
      && chick.shadow.visible
      && chick.shadow.alpha <= 0.25
    )), `Support Chick ${stage} has the wrong grounded follower profile.`, {
      expected,
      supportVisuals
    });
    const formationPositions = new Set(supportVisuals.map((chick) => (
      `${chick.target.x.toFixed(1)},${chick.target.y.toFixed(1)}`
    )));
    assert(formationPositions.size === expected.count, `Support Chick ${stage} formation overlaps.`, supportVisuals);
  }
  await page.screenshot({ path: path.join(artifactDir, screenshot) });
  if (weapon.id === 'molotov-egg') {
    const visualExpectations = {
      r1: { count: 1, texture: 'molotov-egg-r1', size: 28, fields: 1, radius: 90, detail: 1 },
      r2: { count: 1, texture: 'molotov-egg-r2', size: 32, fields: 1, radius: 108, detail: 2 },
      r3: { count: 1, texture: 'molotov-egg-r3', size: 36, fields: 1, radius: 124, detail: 3 },
      r4: { count: 2, texture: 'molotov-egg-r4', size: 40, fields: 2, radius: 112, detail: 3 },
      evo: { count: 2, texture: 'molotov-egg-evo', size: 44, fields: 2, radius: 136, detail: 4 }
    };
    const expected = visualExpectations[stage];
    assert(areaAtFlight.molotovFlights.length === expected.count
      && areaAtFlight.molotovFlights.every((flight) => (
        flight.texture === expected.texture
        && Math.abs(flight.width - expected.size) < 0.01
        && Math.abs(flight.height - expected.size) < 0.01
        && flight.trailTexture === 'molotov-embers'
      )), `Molotov ${stage} has the wrong modular flight presentation.`, {
      expected,
      areaAtFlight
    });
    await page.waitForFunction((fieldCount) => (
      window.__ROOSTER_TEST__.getAreaEffectState().hazards.length >= fieldCount
    ), expected.fields, { timeout: 1800 });
    const fieldState = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(fieldState.hazards.length === expected.fields
      && fieldState.hazards.every((zone) => (
        zone.renderStyle === 'simple-burn-field'
        && zone.texture === null
        && zone.flameCount === 0
        && zone.lobeCount === expected.detail
        && zone.heatSpotCount === expected.detail
        && zone.radius === expected.radius
        && zone.groundWidth > zone.groundHeight * 1.5
        && zone.rimAlpha <= 0.6
        && zone.emberAlpha <= 0.3
      )), `Molotov ${stage} has the wrong perspective-correct ground field.`, {
      expected,
      fieldState
    });
    fieldScreenshot = `${weapon.id}-${stage}-field.png`;
    await page.screenshot({ path: path.join(artifactDir, fieldScreenshot) });
    await page.waitForTimeout(60);
    const motionState = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(fieldState.hazards.every((zone, zoneIndex) => {
      const after = motionState.hazards[zoneIndex];
      return Math.abs(zone.groundWidth - after.groundWidth) < 4
        && Math.abs(zone.groundHeight - after.groundHeight) < 3
        && after.rimAlpha <= 0.6
        && after.emberAlpha <= 0.3;
    }), `Molotov ${stage} ground field moved or flickered between samples.`, { fieldState, motionState });
    molotovVisuals = { flight: areaAtFlight.molotovFlights, field: fieldState.hazards };
    remainingDelay -= 490;
  }
  if (weapon.id === 'rocket-egg') {
    const visualExpectations = {
      r1: { count: 1, texture: 'rocket-egg-r1', impact: 'rocket-impact-r1', size: [48, 30], trail: 40, damage: 48, radius: 82 },
      r2: { count: 1, texture: 'rocket-egg-r2', impact: 'rocket-impact-r2', size: [56, 34], trail: 46, damage: 64, radius: 100 },
      r3: { count: 1, texture: 'rocket-egg-r3', impact: 'rocket-impact-r3', size: [66, 42], trail: 52, damage: 80, radius: 118 },
      r4: { count: 2, texture: 'rocket-egg-r4', impact: 'rocket-impact-r4', size: [72, 44], trail: 58, damage: 96, radius: 132 },
      evo: { count: 3, texture: 'rocket-egg-evo', impact: 'rocket-impact-evo', size: [84, 52], trail: 70, damage: 112, radius: 158 }
    };
    const expected = visualExpectations[stage];
    assert(areaAtFlight.rocketFlights.length === 1
      && areaAtFlight.rocketFlights[0].texture === expected.texture,
    `Rocket Egg ${stage} did not begin with its dedicated lead rocket.`, { expected, areaAtFlight });
    await page.waitForFunction((flightCount) => (
      window.__ROOSTER_TEST__.getAreaEffectState().rocketFlights.length >= flightCount
    ), expected.count, { timeout: 700 });
    const flightState = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(flightState.rocketFlights.length === expected.count
      && flightState.rocketFlights.every((flight) => (
        flight.texture === expected.texture
        && Math.abs(flight.width - expected.size[0]) < 0.01
        && Math.abs(flight.height - expected.size[1]) < 0.01
        && flight.trailTexture === 'rocket-exhaust'
        && Math.abs(flight.trailWidth - expected.trail) < 0.01
        && flight.damage === expected.damage
        && flight.radius === expected.radius
      )), `Rocket Egg ${stage} has the wrong staged flight profile.`, { expected, flightState });
    await page.waitForFunction((impactTexture) => (
      window.__ROOSTER_TEST__.getAreaEffectState().rocketImpacts
        .some((impact) => impact.texture === impactTexture)
    ), expected.impact, { timeout: 1400 });
    const impactState = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(impactState.rocketImpacts.some((impact) => (
      impact.texture === expected.impact
      && impact.width > impact.height * 1.5
    )), `Rocket Egg ${stage} did not use its perspective-correct impact asset.`, {
      expected,
      impactState
    });
    impactScreenshot = `${weapon.id}-${stage}-impact.png`;
    await page.screenshot({ path: path.join(artifactDir, impactScreenshot) });
    rocketVisuals = { flight: flightState.rocketFlights, impact: impactState.rocketImpacts };
    remainingDelay -= 240;
  }
  if (weapon.id === 'void-nest') {
    const visualExpectations = {
      r1: { zones: 1, radius: 132, life: 4200, motes: 4, rings: 0 },
      r2: { zones: 1, radius: 150, life: 4800, motes: 5, rings: 1 },
      r3: { zones: 1, radius: 170, life: 5400, motes: 6, rings: 1 },
      r4: { zones: 1, radius: 190, life: 6000, motes: 7, rings: 2 },
      evo: { zones: 1, radius: 225, life: 7200, motes: 8, rings: 2 }
    };
    const expected = visualExpectations[stage];
    assert(areaAtFlight.voids.length === expected.zones
      && areaAtFlight.voids.every((zone) => (
        zone.renderStyle === 'gravity-field'
        && zone.radius === expected.radius
        && zone.maxLife === expected.life
        && zone.moteCount === expected.motes
        && zone.accentRingCount === expected.rings
        && zone.fieldWidth > zone.fieldHeight * 1.55
        && zone.portalWidth > zone.portalHeight * 1.55
        && zone.portalWidth < zone.fieldWidth * 0.4
        && zone.coreWidth < zone.fieldWidth * 0.25
        && zone.pullSamples.outer < zone.pullSamples.middle
        && zone.pullSamples.middle < zone.pullSamples.inner
      )), `Void Nest ${stage} has the wrong perspective or distance-scaled pull profile.`, {
      expected,
      areaAtFlight
    });
    voidVisuals = areaAtFlight.voids;
  }
  if (weapon.id === 'support-chick') {
    const beforeMotion = supportVisuals.map(({ x, y }) => ({ x, y }));
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.previewRoosterDirection('east');
      api.movePlayer(820, 450);
    });
    await page.waitForTimeout(90);
    const duringMotion = await page.evaluate(() => window.__ROOSTER_TEST__.getSupportVisualState());
    assert(duringMotion.every((chick, index) => (
      Math.hypot(
        chick.x - beforeMotion[index].x,
        chick.y - beforeMotion[index].y
      ) > 12
      && chick.animationPlaying
      && chick.animation?.includes('-walk-')
      && chick.targetError > 1
      && chick.targetError < 100
    )), `Support Chick ${stage} did not visibly run into its new formation.`, {
      beforeMotion,
      duringMotion
    });
    supportMotion = { before: beforeMotion, during: duringMotion };
    remainingDelay -= 90;
  }
  if (['golden-egg', 'primary-artillery-rank', 'primary-storm-rank'].includes(weapon.id)) {
    const impactDelay = weapon.id === 'primary-storm-rank' ? 185 : 285;
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
  if (weapon.id === 'primary-artillery-rank') {
    const visualExpectations = {
      r1: { count: 1, texture: 'heavy-egg', rank: 1, scale: 1.34, tint: 0xffffff, line: [10, 1.8, 0.1], impact: 'blast-shell' },
      r2: { count: 1, texture: 'heavy-egg', rank: 2, scale: 1.5, tint: 0xffe2b8, line: [14, 2.2, 0.13], impact: 'blast-shell' },
      r3: { count: 1, texture: 'heavy-egg', rank: 3, scale: 1.58, tint: 0xffc975, line: [18, 2.5, 0.16], impact: 'blast-shell' },
      r4: { count: 1, texture: 'heavy-egg', rank: 4, scale: 1.74, tint: 0xfff1c4, line: [24, 3, 0.2], impact: 'blast-shell' },
      evo: {
        count: 1,
        texture: 'evo-siegebreaker-shell-projectile',
        rank: 'EVO',
        scale: 1.68,
        tint: 0xffffff,
        line: [28, 3.4, 0.2],
        impact: 'blast-shell-evo'
      }
    };
    const expected = visualExpectations[stage];
    assert(projectiles.length === expected.count, `Blast Shell ${stage} has the wrong salvo size.`, {
      expected,
      projectiles
    });
    assert(projectiles.every((projectile) => (
      projectile.texture === expected.texture
      && projectile.visualRank === expected.rank
      && Math.abs(projectile.spriteBaseScale - expected.scale) < 0.001
      && projectile.trailVisible === false
      && projectile.lineTrailVisible
      && projectile.lineTrailLength === expected.line[0]
      && Math.abs(projectile.lineTrailWidth - expected.line[1]) < 0.001
      && Math.abs(projectile.lineTrailAlpha - expected.line[2]) < 0.001
      && projectile.tint === expected.tint
      && projectile.impactStyle === expected.impact
    )), `Blast Shell ${stage} has the wrong visual profile.`, { expected, projectiles });
  }
  if (weapon.id === 'primary-storm-rank') {
    const visualExpectations = {
      r1: { count: 1, texture: 'storm-egg', rank: 1, scale: 0.94, tint: 0xffffff, line: [8, 1, 0.08], chain: [4, 1.6, 125] },
      r2: { count: 1, texture: 'storm-egg', rank: 2, scale: 1.04, tint: 0xe9ffff, line: [11, 1.2, 0.11], chain: [4.5, 1.8, 140] },
      r3: { count: 2, texture: 'storm-egg', rank: 3, scale: 1.12, tint: 0xcffbff, line: [14, 1.45, 0.14], chain: [5, 2.2, 155] },
      r4: { count: 2, texture: 'storm-egg', rank: 4, scale: 1.22, tint: 0xf5ffff, line: [18, 1.8, 0.18], chain: [6, 2.6, 175] },
      evo: {
        count: 2,
        texture: 'evo-tempest-crown-projectile',
        rank: 'EVO',
        scale: 1.18,
        tint: 0xffffff,
        line: [22, 2.2, 0.2],
        chain: [7, 3, 190]
      }
    };
    const expected = visualExpectations[stage];
    assert(projectiles.length === expected.count, `Storm Egg ${stage} has the wrong salvo size.`, {
      expected,
      projectiles
    });
    assert(projectiles.every((projectile) => (
      projectile.texture === expected.texture
      && projectile.visualRank === expected.rank
      && Math.abs(projectile.spriteBaseScale - expected.scale) < 0.001
      && projectile.trailVisible === false
      && projectile.lineTrailVisible
      && projectile.lineTrailLength === expected.line[0]
      && Math.abs(projectile.lineTrailWidth - expected.line[1]) < 0.001
      && Math.abs(projectile.lineTrailAlpha - expected.line[2]) < 0.001
      && projectile.tint === expected.tint
      && Math.abs(projectile.chainOuterWidth - expected.chain[0]) < 0.001
      && Math.abs(projectile.chainInnerWidth - expected.chain[1]) < 0.001
      && projectile.chainLife === expected.chain[2]
    )), `Storm Egg ${stage} has the wrong visual profile.`, { expected, projectiles });
  }
  if (weapon.id === 'lightning-comb') {
    const visualExpectations = {
      r1: { rank: 1, life: 145, main: 3, branches: 0, layers: 6, widths: [4, 1.35], impactScale: 0.34 },
      r2: { rank: 2, life: 165, main: 4, branches: 4, layers: 8, widths: [5, 1.7], impactScale: 0.4 },
      r3: { rank: 3, life: 190, main: 5, branches: 6, layers: 12, widths: [6.2, 2.15], impactScale: 0.47 },
      r4: { rank: 4, life: 220, main: 6, branches: 7, layers: 14, widths: [7.4, 2.65], impactScale: 0.55 },
      evo: { rank: 'EVO', life: 245, main: 10, branches: 10, layers: 20, widths: [9, 3.2], impactScale: 0.62 }
    };
    const expected = visualExpectations[stage];
    assert(lightningVisuals.length === 1, `Lightning Comb ${stage} has no active visual.`, {
      expected,
      lightningVisuals
    });
    const visual = lightningVisuals[0];
    assert(
      visual.rank === expected.rank
      && visual.life === expected.life
      && visual.mainSegmentCount === expected.main
      && visual.branchSegmentCount === expected.branches
      && visual.layerCount === expected.layers
      && Math.abs(visual.outerWidth - expected.widths[0]) < 0.001
      && Math.abs(visual.coreWidth - expected.widths[1]) < 0.001
      && Math.abs(visual.impactScale - expected.impactScale) < 0.001
      && visual.fluidFlicker,
      `Lightning Comb ${stage} has the wrong layered visual profile.`,
      { expected, visual }
    );
  }
  await page.waitForTimeout(Math.max(0, remainingDelay));
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
    fieldScreenshot,
    supportMotion,
    ability: weapon.primary ? after.player.primary : after.abilities[
      weapon.id === 'orbit-eggs' ? 'orbitEggs'
        : weapon.id === 'support-chick' ? 'supportChick'
          : weapon.id.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
    ],
    visuals: [
      'primary-ace-rank',
      'primary-artillery-rank',
      'primary-storm-rank',
      'golden-egg'
    ].includes(weapon.id)
      ? projectiles
      : weapon.id === 'orbit-eggs' ? orbitVisuals
        : weapon.id === 'support-chick' ? supportVisuals
          : weapon.id === 'molotov-egg' ? molotovVisuals
            : weapon.id === 'rocket-egg' ? rocketVisuals
            : weapon.id === 'void-nest' ? voidVisuals
          : weapon.id === 'lightning-comb' ? lightningVisuals : undefined,
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
      if ([
        'primary-ace-rank',
        'primary-artillery-rank',
        'primary-storm-rank',
        'golden-egg',
        'orbit-eggs',
        'lightning-comb',
        'support-chick',
        'molotov-egg',
        'rocket-egg',
        'void-nest'
      ].includes(weapon.id) && rank < weapon.normalRanks) {
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

async function testModifierFeedback(browser, serverUrl) {
  const { page, errors } = await openWeapon(browser, serverUrl, { rooster: 'ace' });
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      api.movePlayer(700, 450);
      api.applyUpgradeById('piercing-eggs');
      api.applyUpgradeById('ricochet-eggs');
      api.applyUpgradeById('shell-shock');
      api.spawnEnemyType('slime', 820, 450, { hp: 9999, speed: 0, damage: 0, xpOverride: 0 });
      api.spawnEnemyType('slime', 880, 450, { hp: 9999, speed: 0, damage: 0, xpOverride: 0 });
      api.spawnEnemyType('slime', 940, 450, { hp: 9999, speed: 0, damage: 0, xpOverride: 0 });
      api.triggerPrimaryAttack();
    });
    let active = { active: [], recent: [] };
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await page.waitForTimeout(20);
      active = await page.evaluate(() => window.__ROOSTER_TEST__.getModifierVisualState());
      if (
        active.active.some((impact) => impact.type === 'pierce')
        && active.active.some((impact) => impact.type === 'shell-shock')
      ) {
        break;
      }
    }
    const screenshot = 'modifier-feedback-stacked.png';
    await page.screenshot({ path: path.join(artifactDir, screenshot) });
    await page.waitForTimeout(420);
    const settled = await page.evaluate(() => window.__ROOSTER_TEST__.getModifierVisualState());
    const types = new Set(settled.recent.map((impact) => impact.type));
    assert(
      active.active.some((impact) => impact.type === 'pierce')
      && active.active.some((impact) => impact.type === 'shell-shock'),
      'Pierce and Shell Shock did not stack on the first impact.',
      active
    );
    assert(
      ['pierce', 'ricochet', 'shell-shock'].every((type) => types.has(type)),
      'Not every projectile modifier emitted its own impact feedback.',
      settled
    );
    assert(errors.length === 0, 'Browser errors while testing modifier feedback.', errors);
    return { id: 'modifier-feedback', screenshot, active, recent: settled.recent };
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
    results.push(await testModifierFeedback(browser, serverState.url));
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
