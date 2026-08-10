import Phaser from 'phaser';
import { ENCOUNTER_STANDARDS } from '../data/enemyRoleDefinitions.js';
import { AUDIO_PRIORITIES, VISUAL_LANGUAGE } from '../data/presentationStandards.js';

export function shouldInstallTestApi() {
  return import.meta.env.DEV;
}

export function installTestApi(scene) {
  if (!shouldInstallTestApi()) {
    return false;
  }

  window.__ROOSTER_TEST__ = {
    getState: () => ({
      frames: scene.debugStats.frames,
      elapsed: scene.elapsed,
      playerHp: scene.player.hp,
      enemies: scene.enemies.length,
      projectiles: scene.projectiles.length,
      enemyProjectiles: scene.enemyProjectiles.length,
      molotovProjectiles: scene.molotovProjectiles.length,
      rocketProjectiles: scene.rocketProjectiles.length,
      lightningBolts: scene.lightningBolts.length,
      orbitEggs: scene.orbitEggs.length,
      supportChickens: scene.supportChickens.length,
      hazardZones: scene.hazardZones.length,
      voidZones: scene.voidZones.length,
      xpOrbs: scene.xpOrbs.length,
      pickups: scene.pickups.items.length,
      arenaId: scene.arena.id,
      challengeId: scene.challenge.id,
      wave: scene.waveSystem.currentWave,
      waveName: scene.waveSystem.waves[scene.waveSystem.currentWave - 1]?.name ?? null,
      roosterId: scene.player.roosterId,
      shots: scene.debugStats.shots,
      hits: scene.debugStats.hits,
      kills: scene.debugStats.kills,
      xpCollected: scene.debugStats.xpCollected,
      levelUps: scene.debugStats.levelUps,
      specialShots: scene.debugStats.specialShots,
      enemyTelegraphs: scene.combatFeedback.activeTelegraphs,
      cameraZoom: scene.cameras.main.zoom,
      viewport: { width: scene.scale.width, height: scene.scale.height },
      audio: scene.audio.getState(),
      abilitySynergies: {
        rocketFire: scene.rocketEgg.lastSynergyActive,
        orbitLightning: scene.lightningComb.lastSynergyActive,
        molotovVoid: scene.voidNest.lastSynergyActive
      },
      choosingUpgrade: scene.isChoosingUpgrade,
      choosingRooster: scene.isChoosingRooster,
      gameEnded: scene.gameEnded,
      lastShotAt: scene.debugStats.lastShotAt,
      lastHitAt: scene.debugStats.lastHitAt,
      lastError: scene.debugStats.lastError,
      telemetry: scene.telemetry.getSummary(scene.time.now),
      pools: scene.objectPools.getStats(),
      seed: scene.rng.seed,
      profile: scene.bot.strategy,
      player: {
        x: scene.player.sprite.x,
        y: scene.player.sprite.y,
        rotation: scene.player.sprite.rotation
      }
    }),
    getLoadout: () => ({
      ...scene.loadout.getSnapshot(),
      rerollsRemaining: scene.runState.rerollsRemaining
    }),
    getArenaState: () => scene.arena.getState(),
    getArenaCatalog: () => scene.arena.getCatalog(),
    getPickupState: () => scene.pickups.getState(),
    sampleSafeArenaPoints: (count = 20) => Array.from(
      { length: Math.max(1, Math.min(100, count)) },
      () => scene.arena.findSafePoint('test-safe-point', 56)
    ).map((point) => ({
      ...point,
      reachable: scene.arena.isInsidePlayable(point.x, point.y, 40),
      blocked: scene.arena.overlapsObstacle(point.x, point.y, 30)
    })),
    spawnPickup: (kind, x, y) => {
      const pickup = scene.spawnPickup(kind, x, y);
      return pickup ? { kind: pickup.kind, x: pickup.sprite.x, y: pickup.sprite.y } : null;
    },
    collectPickup: (kind) => {
      const pickup = scene.pickups.items.find((item) => item.kind === kind);
      return scene.pickups.collect(pickup);
    },
    damageFirstDestructible: (amount = 9999) => {
      const obstacle = scene.arena.obstacles.find((item) => item.destructible && item.sprite.active);
      if (!obstacle) return false;
      return scene.arena.damageObstacle(obstacle, amount, 'test-api');
    },
    getAbilityState: () => ({
      goldenEgg: { rank: scene.goldenEgg.rank, evolved: scene.goldenEgg.evolved },
      molotovEgg: { rank: scene.molotovEgg.rank, evolved: scene.molotovEgg.evolved },
      lightningComb: { rank: scene.lightningComb.rank, evolved: scene.lightningComb.evolved },
      voidNest: { rank: scene.voidNest.rank, evolved: scene.voidNest.evolved },
      rocketEgg: { rank: scene.rocketEgg.rank, evolved: scene.rocketEgg.evolved },
      laserComb: { rank: scene.laserComb.rank, evolved: scene.laserComb.evolved },
      orbitEggs: {
        rank: scene.activeAbilities.companions.orbitRank,
        evolved: Boolean(scene.activeAbilities.companions.orbitEvolutionId),
        count: scene.orbitEggs.length
      },
      supportChick: {
        rank: scene.activeAbilities.companions.supportRank,
        evolved: Boolean(scene.activeAbilities.companions.supportEvolutionId),
        count: scene.supportChickens.length
      }
    }),
    getPlayerStats: () => ({
      hp: scene.player.hp,
      roosterId: scene.player.roosterId,
      maxHp: scene.player.maxHp,
      speed: scene.player.speed,
      fireRate: scene.player.fireRate,
      projectileDamage: scene.player.projectileDamage,
      shotCount: scene.player.shotCount,
      fireEggs: scene.player.fireEggs,
      armor: scene.player.armor,
      regenPerSecond: scene.player.regenPerSecond,
      xpMagnetRadius: scene.player.xpMagnetRadius,
      projectilePierce: scene.player.projectilePierce,
      projectileSizeBonus: scene.player.projectileSizeBonus,
      projectileSpeedBonus: scene.player.projectileSpeedBonus,
      projectileRicochets: scene.player.projectileRicochets,
      projectileKnockback: scene.player.projectileKnockback,
      critChance: scene.player.critChance,
      critMultiplier: scene.player.critMultiplier,
      primaryEvolution: scene.player.primaryEvolution?.id ?? null,
      secondWindCharges: scene.player.secondWindCharges,
      orbitEggs: scene.orbitEggs.length,
      supportChickens: scene.supportChickens.length,
      goldenEggRank: scene.goldenEgg.rank,
      molotovEggRank: scene.molotovEgg.rank,
      lightningCombRank: scene.lightningComb.rank,
      voidNestRank: scene.voidNest.rank,
      rocketEggRank: scene.rocketEgg.rank,
      laserCombRank: scene.laserComb.rank,
      upgradeRanks: Object.fromEntries(scene.player.upgradeRanks)
    }),
    getProgressionState: () => ({
      level: scene.player.level,
      xp: scene.player.xp,
      xpToNext: scene.player.xpToNext,
      choosingUpgrade: scene.isChoosingUpgrade,
      pendingLevelUps: scene.runState.pendingLevelUps,
      regularChoices: scene.runState.regularChoices,
      queuedRewards: [...scene.runState.rewardQueue],
      currentSelection: scene.runState.currentSelection
        ? { ...scene.runState.currentSelection }
        : null,
      choices: scene.pendingUpgradeChoices?.map((upgrade) => ({
        id: upgrade.id,
        rewardKind: upgrade.rewardKind ?? null,
        rewardPriority: upgrade.rewardPriority ?? null
      })) ?? []
    }),
    getRoosterCatalog: () => scene.roosterClasses.getDefinitions().map((definition) => ({
      id: definition.id,
      name: definition.name,
      role: definition.role,
      stats: { ...definition.stats },
      primary: { ...definition.primary },
      primaryEvolution: { ...definition.primaryEvolution },
      classPassives: [...definition.classPassives],
      archetypes: definition.archetypes.map((archetype) => ({
        ...archetype,
        upgrades: [...archetype.upgrades]
      })),
      upgradeAffinities: { ...definition.upgradeAffinities },
      passive: definition.passive
    })),
    getWaveCatalog: () => scene.waveSystem.getWaveCatalog(),
    getEnemyRoleMatrix: () => scene.waveSystem.getEnemyRoleMatrix(),
    getEncounterStandards: () => ({ ...ENCOUNTER_STANDARDS }),
    getPresentationStandards: () => ({
      colors: structuredClone(VISUAL_LANGUAGE),
      audio: structuredClone(AUDIO_PRIORITIES)
    }),
    getEncounterEvents: () => scene.telemetry.getEventSequence([
      'enemyTelegraphShown',
      'enemyAbilityFired',
      'enemyProjectileSuppressed',
      'bossEntered',
      'bossPhaseStarted',
      'deathExplosionTelegraphed',
      'pickupSpawned'
    ]),
    getDeterminismSnapshot: () => ({
      seed: scene.rng.seed,
      profile: scene.bot.strategy,
      rng: scene.rng.getState(),
      wave: scene.waveSystem.currentWave,
      spawnQueue: scene.waveSystem.spawnQueue.map((enemy) => enemy.type),
      events: scene.telemetry.getEventSequence([
        'waveStarted', 'enemySpawned', 'upgradeOffered', 'upgradeChosen'
      ]).map(({ type, wave, id, source, choices, upgrade }) => ({
        type, wave, id, source, choices, upgrade
      }))
    }),
    getRoosterVisualState: () => ({
      id: scene.player.roosterId,
      scale: scene.player.baseScale,
      tint: scene.player.sprite.tintTopLeft,
      markers: scene.roosterClasses.markers.length,
      primary: { ...scene.player.primaryAttack },
      primaryEvolution: scene.player.primaryEvolution ? { ...scene.player.primaryEvolution } : null,
      upgradeAffinities: { ...scene.player.upgradeAffinities }
    }),
    selectRooster: (id = 'ace') => {
      scene.meta.unlockRoosterForTesting(id);
      return scene.chooseRooster(id);
    },
    getMetaState: () => scene.meta.getState(),
    getMetaHub: () => scene.meta.getHubState(scene.roosterClasses.getDefinitions()),
    resetMetaProgress: () => {
      const state = scene.meta.reset();
      scene.runState.startRoosterSelection(scene.roosterClasses.getDefinitions());
      return state;
    },
    unlockAllMeta: () => {
      const state = scene.meta.unlockAllForTesting();
      scene.runState.startRoosterSelection(scene.roosterClasses.getDefinitions());
      return state;
    },
    recordMetaRun: (overrides = {}) => scene.meta.recordRun({
      outcome: 'victory',
      kills: 180,
      elapsedMs: 480000,
      rooster: { id: 'ace', name: 'Barnyard Ace' },
      arena: { id: 'open-yard', name: 'Open Yard' },
      challenge: { id: 'standard', name: 'Standard Run' },
      build: { active: [], passive: [], evolutions: [] },
      ...overrides
    }),
    selectMetaChallenge: (id) => scene.meta.selectChallenge(id),
    selectMetaCosmetic: (roosterId, cosmeticId) => scene.meta.selectCosmetic(roosterId, cosmeticId),
    getChallengeState: () => scene.challenge.getState(),
    getChallengeCatalog: () => scene.challenge.getCatalog(),
    getChallengeProbe: () => {
      const slime = scene.waveSystem.makeSlime();
      const elite = scene.waveSystem.makeEliteBrute();
      const boss = scene.waveSystem.makeBoss();
      return {
        raw: {
          slime: { hp: slime.hp, speed: slime.speed, damage: slime.damage, xp: slime.xp },
          elite: { hp: elite.hp, speed: elite.speed, damage: elite.damage, xp: elite.xp },
          boss: {
            abilityDamage: boss.ability.damage,
            heavyDamage: boss.heavyProjectile.damage
          }
        },
        modified: {
          slime: scene.challenge.modifyEnemy(slime),
          elite: scene.challenge.modifyEnemy(elite),
          boss: scene.challenge.modifyEnemy(boss),
          wave: scene.challenge.modifyWave({ targetDuration: [25, 35] })
        }
      };
    },
    getProjectileSnapshot: () => scene.projectiles.map((projectile) => ({
      x: projectile.sprite.x,
      y: projectile.sprite.y,
      vx: projectile.sprite.body?.velocity.x ?? 0,
      vy: projectile.sprite.body?.velocity.y ?? 0,
      homing: projectile.homing,
      targetOffset: projectile.targetOffset,
      laneOffset: projectile.laneOffset,
      speed: projectile.speed,
      texture: projectile.sprite.texture?.key,
      source: projectile.source,
      splashRadius: projectile.splashRadius,
      secondaryBlastRatio: projectile.secondaryBlastRatio,
      chainRemaining: projectile.chainRemaining,
      pierceRemaining: projectile.pierceRemaining,
      ricochetRemaining: projectile.ricochetRemaining,
      slowRatio: projectile.slowRatio,
      active: projectile.sprite.active
    })),
    getEnemyProjectileSnapshot: () => scene.enemyProjectiles.map((projectile) => ({
      x: projectile.sprite.x,
      y: projectile.sprite.y,
      vx: projectile.sprite.body?.velocity.x ?? 0,
      vy: projectile.sprite.body?.velocity.y ?? 0,
      texture: projectile.sprite.texture?.key,
      scale: projectile.sprite.scaleX,
      active: projectile.sprite.active
    })),
    getEnemySnapshot: () => scene.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      role: enemy.role,
      name: enemy.displayName,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      x: enemy.sprite.x,
      y: enemy.sprite.y,
      bossPhaseIndex: enemy.bossPhaseIndex,
      aura: enemy.aura ? { ...enemy.aura } : null,
      damageReduction: enemy.damageReduction,
      auraSpeedMultiplier: enemy.auraSpeedMultiplier,
      dashUntil: enemy.dashUntil,
      invulnerableUntil: enemy.invulnerableUntil,
      ability: enemy.ability ? { ...enemy.ability } : null,
      heavyProjectile: enemy.heavyProjectile ? { ...enemy.heavyProjectile } : null,
      knockbackUntil: enemy.knockbackUntil,
      active: enemy.sprite.active
    })),
    applyUpgradeById: (id) => {
      const upgrade = scene.upgradeSystem.upgrades.find((item) => item.id === id);
      if (!upgrade) {
        return false;
      }
      scene.player.applyUpgrade(upgrade, scene);
      scene.updateHud();
      return true;
    },
    getUpgradeChoices: () => scene.upgradeSystem.getChoices(3, scene.player).map((upgrade) => upgrade.id),
    getUpgradeChoiceDetails: () => scene.upgradeSystem.getChoices(3, scene.player).map((upgrade) => ({
      id: upgrade.id,
      category: upgrade.category,
      rarity: upgrade.rarity,
      nextRank: upgrade.nextRank,
      rankLabel: upgrade.rankLabel,
      description: upgrade.description
    })),
    previewUpgradeOverlay: () => {
      const choices = scene.upgradeSystem.getChoices(3, scene.player);
      scene.hud.showUpgradeChoices(choices);
      return choices.map((upgrade) => upgrade.id);
    },
    getUpgradeCatalog: () => scene.upgradeSystem.upgrades.map((upgrade) => ({
      id: upgrade.id,
      category: upgrade.category,
      rarity: upgrade.rarity,
      maxRank: upgrade.maxRank ?? null,
      consumable: upgrade.consumable ?? false,
      minLevel: upgrade.minLevel ?? 1,
      classId: upgrade.classId ?? null,
      evolution: upgrade.evolution ? { ...upgrade.evolution } : null,
      requires: upgrade.requires ?? [],
      excludes: upgrade.excludes ?? []
    })),
    getAvailableUpgradeIds: () => scene.upgradeSystem.upgrades
      .filter((upgrade) => scene.upgradeSystem.isAvailable(upgrade, scene.player))
      .map((upgrade) => upgrade.id),
    shouldGuaranteeSpectacle: () => scene.upgradeSystem.shouldGuaranteeSpectacle(scene.player),
    setPlayerLevel: (level) => {
      scene.player.level = Math.max(1, Math.round(level));
      scene.player.xpToNext = scene.player.getXpRequirement(scene.player.level);
      return scene.player.level;
    },
    grantXp: (amount) => {
      const granted = Math.max(0, Number(amount) || 0);
      const startingLevel = scene.player.level;
      const levelsGained = scene.player.addXp(granted);
      scene.debugStats.xpCollected += granted;
      scene.telemetry.addXp(granted, scene.time.now, scene.waveSystem.currentWave);
      for (let index = 0; index < levelsGained; index += 1) {
        scene.debugStats.levelUps += 1;
        scene.telemetry.addLevelUp(
          scene.time.now,
          scene.waveSystem.currentWave,
          startingLevel + index + 1
        );
      }
      if (levelsGained > 0) {
        scene.startLevelUp(levelsGained);
      }
      scene.updateHud();
      return { levelsGained, ...window.__ROOSTER_TEST__.getProgressionState() };
    },
    startChestReward: (kind = 'elite') => {
      scene.runState.startChestReward(kind);
      return window.__ROOSTER_TEST__.getProgressionState();
    },
    rerollUpgradeChoices: () => scene.rerollUpgradeChoices(),
    setPlayerCombatModifiers: (modifiers = {}) => {
      Object.entries(modifiers).forEach(([key, value]) => {
        if (key in scene.player && Number.isFinite(value)) {
          scene.player[key] = value;
        }
      });
      return true;
    },
    setPlayerHp: (hp) => {
      scene.player.hp = Phaser.Math.Clamp(hp, 0, scene.player.maxHp);
      scene.player.updateHealthBar();
      return scene.player.hp;
    },
    damagePlayer: (amount) => {
      scene.player.invulnerableUntil = 0;
      scene.player.damage(amount, scene.time.now);
      return scene.player.hp;
    },
    clearEnemies: () => {
      scene.enemies.forEach((enemy) => enemy.destroy());
      scene.enemies = [];
      return true;
    },
    clearProjectiles: () => {
      scene.projectiles.forEach((projectile) => projectile.destroy());
      scene.projectiles = [];
      scene.molotovProjectiles.forEach((projectile) => projectile.destroy());
      scene.molotovProjectiles = [];
      scene.rocketProjectiles.forEach((projectile) => projectile.destroy());
      scene.rocketProjectiles = [];
      scene.lightningBolts.forEach((bolt) => bolt.destroy());
      scene.lightningBolts = [];
      scene.orbitEggs.forEach((egg) => egg.destroy());
      scene.orbitEggs = [];
      scene.supportChickens.forEach((chicken) => chicken.destroy());
      scene.supportChickens = [];
      scene.hazardZones.forEach((zone) => zone.destroy());
      scene.hazardZones = [];
      scene.voidZones.forEach((zone) => zone.destroy());
      scene.voidZones = [];
      scene.clearEnemyProjectiles();
      return true;
    },
    resetAutoShotCooldown: () => {
      scene.lastShotAt = scene.time.now;
      return scene.lastShotAt;
    },
    spawnEnemyType: (type, x = scene.player.sprite.x + 180, y = scene.player.sprite.y, overrides = {}) => {
      const makers = {
        slime: () => scene.waveSystem.makeSlime(),
        runner: () => scene.waveSystem.makeRunner(),
        brute: () => scene.waveSystem.makeBrute(),
        spitter: () => scene.waveSystem.makeSpitter(),
        'fan-spitter': () => scene.waveSystem.makeFanSpitter(),
        bomber: () => scene.waveSystem.makeBomber(),
        support: () => scene.waveSystem.makeSupport(),
        summoner: () => scene.waveSystem.makeSummoner(),
        'elite-runner': () => scene.waveSystem.makeEliteRunner(),
        'elite-brute': () => scene.waveSystem.makeEliteBrute(),
        'elite-spitter': () => scene.waveSystem.makeEliteSpitter(),
        boss: () => scene.waveSystem.makeBoss()
      };
      const config = { ...(makers[type]?.() ?? scene.waveSystem.makeSlime()), ...overrides };
      return scene.entities.spawnEnemyAt(config, x, y)?.id ?? null;
    },
    spawnSafeEnemyType: (type = 'slime', overrides = {}) => {
      const config = {
        ...scene.waveSystem.makeEnemyFromSpec({ kind: type }),
        speed: 0,
        damage: 0,
        hp: 9999,
        spawnMinDistance: 280,
        ...overrides
      };
      const enemy = scene.spawnEnemy(config);
      if (!enemy) {
        return null;
      }
      return {
        id: enemy.id,
        x: enemy.sprite.x,
        y: enemy.sprite.y,
        distance: Phaser.Math.Distance.Between(
          scene.arena.getCenter().x,
          scene.arena.getCenter().y,
          enemy.sprite.x,
          enemy.sprite.y
        )
      };
    },
    pauseWaves: () => {
      scene.waveSystem.active = false;
      return true;
    },
    startWave: (waveNumber) => {
      const index = Phaser.Math.Clamp(Math.round(waveNumber) - 1, 0, scene.waveSystem.waves.length - 1);
      const wave = scene.waveSystem.waves[index];
      scene.waveSystem.currentWave = index + 1;
      scene.waveSystem.active = true;
      scene.waveSystem.completed = false;
      scene.waveSystem.spawned = 0;
      scene.waveSystem.waitingForClear = false;
      scene.waveSystem.spawnQueue = scene.waveSystem.buildSpawnQueue(wave);
      scene.waveSystem.director.start(wave, scene.waveSystem.spawnQueue, scene.time.now);
      scene.onWaveStarted?.(index + 1, wave);
      return index + 1;
    },
    getSpawnDirectorState: () => scene.waveSystem.director.getState(),
    getXpSnapshot: () => scene.xpOrbs.map((orb) => ({
      value: orb.value,
      x: orb.sprite.x,
      y: orb.sprite.y,
      scale: orb.sprite.scaleX,
      active: orb.sprite.active
    })),
    spawnXpCluster: (count = 20, value = 3, x = 700, y = 450) => {
      for (let index = 0; index < count; index += 1) {
        scene.spawnXp(x + (index % 4) * 5, y + Math.floor(index / 4) * 5, value);
      }
      return window.__ROOSTER_TEST__.getXpSnapshot();
    },
    damageEnemyById: (id, amount) => {
      const enemy = scene.enemies.find((item) => item.id === id);
      if (!enemy) {
        return false;
      }
      scene.damageEnemy(enemy, amount, enemy.sprite.x, enemy.sprite.y, { source: 'test-api' });
      return true;
    },
    forceSpawnEnemy: (x = scene.player.sprite.x + 170, y = scene.player.sprite.y) => {
      scene.spawnEnemy({
        type: 'test-slime',
        hp: 40,
        speed: 0,
        damage: 0,
        xp: 10,
        texture: 'enemy-slime',
        scale: 0.24,
        radius: 28,
        bodyOffsetX: 100,
        bodyOffsetY: 118,
        hpBarWidth: 42,
        hpBarYOffset: 32
      });
      const enemy = scene.enemies[scene.enemies.length - 1];
      enemy.sprite.setPosition(x, y);
      return scene.enemies.length;
    },
    movePlayer: (x, y) => {
      scene.player.sprite.setPosition(x, y);
      scene.player.updateHealthBar();
    },
    setShotCount: (count) => {
      scene.player.shotCount = Phaser.Math.Clamp(count, 1, 3);
      return scene.player.shotCount;
    },
    enableBot: (strategy = 'average') => {
      scene.bot.enabled = true;
      scene.bot.strategy = strategy;
      scene.telemetry.summary.profile = strategy;
      return { enabled: scene.bot.enabled, strategy: scene.bot.strategy };
    },
    getPoolStats: () => scene.objectPools.getStats(),
    exerciseFxBudget: (count = 140) => {
      const fx = [];
      for (let index = 0; index < count; index += 1) {
        const item = scene.objectPools.createFx(() => scene.add.circle(
          40 + (index % 20) * 4,
          40 + Math.floor(index / 20) * 4,
          2,
          0xffffff,
          0.01
        ));
        if (item) {
          fx.push(item);
        }
      }
      const saturated = scene.objectPools.getStats().fx;
      fx.forEach((item) => item.destroy());
      return { saturated, released: scene.objectPools.getStats().fx };
    },
    spawnLoadScenario: (enemyCount = 100, projectileCount = 240) => {
      scene.waveSystem.active = false;
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      const columns = 20;
      for (let index = 0; index < enemyCount; index += 1) {
        const x = 90 + (index % columns) * 64;
        const y = 90 + Math.floor(index / columns) * 70;
        scene.entities.spawnEnemyAt({
          ...scene.waveSystem.makeSlime(0.6),
          hp: 99999,
          speed: 0,
          damage: 0,
          xpOverride: 0
        }, x, y);
      }
      for (let index = 0; index < projectileCount; index += 1) {
        const target = scene.enemies[index % Math.max(1, scene.enemies.length)];
        if (!target) {
          break;
        }
        const angle = (Math.PI * 2 * index) / Math.max(1, projectileCount);
        const projectile = scene.spawnSpecialProjectileFrom(
          scene.player.sprite.x,
          scene.player.sprite.y,
          angle,
          target,
          {
            damage: 1,
            speed: 42,
            life: 8000,
            homing: false,
            canCrit: false,
            source: 'load-test',
            sfxVolume: 0
          }
        );
        if (projectile) {
          projectile.sprite.setPosition(
            scene.player.sprite.x + Math.cos(angle) * (70 + (index % 8) * 18),
            scene.player.sprite.y + Math.sin(angle) * (70 + (index % 8) * 18)
          );
        }
      }
      return {
        enemies: scene.enemies.length,
        projectiles: scene.projectiles.length,
        pools: scene.objectPools.getStats()
      };
    },
    restart: () => scene.scene.restart(),
    getTelemetry: () => scene.telemetry.getSummary(scene.time.now),
    getRunReport: () => scene.runState.getRunReport(),
    getEffectSettings: () => scene.effects.getState(),
    toggleEffectSetting: (key) => {
      scene.effects.toggle(key);
      return scene.effects.getState();
    },
    resumeIfUpgradeOpen: () => {
      if (!scene.isChoosingUpgrade) {
        return false;
      }
      scene.chooseUpgrade(scene.pendingUpgradeChoices?.[0] ?? scene.upgradeSystem.getChoices(1, scene.player)[0]);
      return true;
    }
  };
  return true;
}

export function removeTestApi() {
  if (window.__ROOSTER_TEST__?.getState) {
    delete window.__ROOSTER_TEST__;
  }
}
