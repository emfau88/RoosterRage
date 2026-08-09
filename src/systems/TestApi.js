import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';

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
      wave: scene.waveSystem.currentWave,
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
      player: {
        x: scene.player.sprite.x,
        y: scene.player.sprite.y,
        rotation: scene.player.sprite.rotation
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
    getRoosterCatalog: () => scene.roosterClasses.getDefinitions().map((definition) => ({
      id: definition.id,
      name: definition.name,
      role: definition.role,
      stats: { ...definition.stats },
      primary: { ...definition.primary },
      passive: definition.passive
    })),
    getRoosterVisualState: () => ({
      id: scene.player.roosterId,
      scale: scene.player.baseScale,
      tint: scene.player.sprite.tintTopLeft,
      markers: scene.roosterClasses.markers.length,
      primary: { ...scene.player.primaryAttack },
      upgradeAffinities: { ...scene.player.upgradeAffinities }
    }),
    selectRooster: (id = 'ace') => scene.chooseRooster(id),
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
      splashRadius: projectile.splashRadius,
      chainRemaining: projectile.chainRemaining,
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
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      x: enemy.sprite.x,
      y: enemy.sprite.y,
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
      requires: upgrade.requires ?? [],
      excludes: upgrade.excludes ?? []
    })),
    getAvailableUpgradeIds: () => scene.upgradeSystem.upgrades
      .filter((upgrade) => scene.upgradeSystem.isAvailable(upgrade, scene.player))
      .map((upgrade) => upgrade.id),
    shouldGuaranteeSpectacle: () => scene.upgradeSystem.shouldGuaranteeSpectacle(scene.player),
    setPlayerLevel: (level) => {
      scene.player.level = Math.max(1, Math.round(level));
      return scene.player.level;
    },
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
        boss: () => scene.waveSystem.makeBoss()
      };
      const config = { ...(makers[type]?.() ?? scene.waveSystem.makeSlime()), ...overrides };
      const enemy = new Enemy(scene, x, y, config);
      scene.enemies.push(enemy);
      scene.enemyGroup.add(enemy.sprite);
      return enemy.id;
    },
    damageEnemyById: (id, amount) => {
      const enemy = scene.enemies.find((item) => item.id === id);
      if (!enemy) {
        return false;
      }
      if (enemy.takeDamage(amount)) {
        scene.killEnemy(enemy);
      }
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
    enableBot: (strategy = 'offense') => {
      scene.bot.enabled = true;
      scene.bot.strategy = strategy;
      return { enabled: scene.bot.enabled, strategy: scene.bot.strategy };
    },
    restart: () => scene.scene.restart(),
    getTelemetry: () => scene.telemetry.getSummary(scene.time.now),
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
