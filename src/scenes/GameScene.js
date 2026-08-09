import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { ActiveAbilitySystem } from '../systems/ActiveAbilitySystem.js';
import {
  addArena,
  createGameAnimations,
  createGeneratedTextures,
  playSceneFx,
  preloadGameAssets
} from '../systems/AssetSetup.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CombatFeedbackSystem } from '../systems/CombatFeedbackSystem.js';
import { EnemyAttackSystem } from '../systems/EnemyAttackSystem.js';
import { EntitySystem } from '../systems/EntitySystem.js';
import { PlayerInputSystem } from '../systems/PlayerInputSystem.js';
import { ProjectileLifecycleSystem } from '../systems/ProjectileLifecycleSystem.js';
import { RunStateSystem } from '../systems/RunStateSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { Telemetry } from '../systems/Telemetry.js';
import { installTestApi, removeTestApi } from '../systems/TestApi.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { HUD } from '../ui/HUD.js';

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 900;
const ARENA_RENDER_PADDING_Y = 100;
const PORTRAIT_MOBILE_MAX_WIDTH = 600;
const PORTRAIT_MOBILE_ZOOM = 0.85;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    preloadGameAssets(this);
  }

  create() {
    if (this.assetLoadErrors?.length) {
      return;
    }
    createGeneratedTextures(this);
    createGameAnimations(this);
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(
      0,
      -ARENA_RENDER_PADDING_Y,
      ARENA_WIDTH,
      ARENA_HEIGHT + ARENA_RENDER_PADDING_Y * 2
    );

    addArena(this, ARENA_WIDTH, ARENA_HEIGHT, ARENA_RENDER_PADDING_Y);

    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.molotovProjectiles = [];
    this.rocketProjectiles = [];
    this.lightningBolts = [];
    this.orbitEggs = [];
    this.supportChickens = [];
    this.hazardZones = [];
    this.voidZones = [];
    this.xpOrbs = [];
    this.activeAbilities = new ActiveAbilitySystem(this);
    this.goldenEgg = this.activeAbilities.goldenEgg;
    this.molotovEgg = this.activeAbilities.molotovEgg;
    this.lightningComb = this.activeAbilities.lightningComb;
    this.voidNest = this.activeAbilities.voidNest;
    this.rocketEgg = this.activeAbilities.rocketEgg;
    this.laserComb = this.activeAbilities.laserComb;
    this.elapsed = 0;
    this.telemetry = new Telemetry();
    this.audio = new AudioSystem(this);
    this.bot = {
      enabled: false,
      strategy: 'offense',
      upgradeReadyAt: 0,
      target: new Phaser.Math.Vector2(ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
    };
    this.debugStats = {
      frames: 0,
      shots: 0,
      hits: 0,
      kills: 0,
      xpCollected: 0,
      levelUps: 0,
      specialShots: 0,
      lastShotAt: 0,
      lastHitAt: 0,
      lastError: null
    };
    this.lastShotAt = -9999;
    this.player = new Player(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    this.combat = new CombatSystem(this);
    this.combatFeedback = new CombatFeedbackSystem(this);
    this.collisions = new CollisionSystem(this);
    this.enemyAttacks = new EnemyAttackSystem(this);
    this.entities = new EntitySystem(this, ARENA_WIDTH, ARENA_HEIGHT);
    this.projectileLifecycle = new ProjectileLifecycleSystem(this);
    this.playerInput = new PlayerInputSystem(this, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.applyResponsiveCameraZoom(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyResponsiveCameraZoom, this);

    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem(this);
    this.runState = new RunStateSystem(this);
    this.hud = new HUD(
      (upgrade) => this.chooseUpgrade(upgrade),
      () => this.scene.restart(),
      () => this.toggleFullscreen()
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

    this.setupTouchInput();
    this.setupPhysics();
    installTestApi(this);
    this.waveSystem.start();
    document.body.dataset.roosterLoadState = 'ready';
  }

  update(time, delta) {
    if (this.gameEnded) {
      return;
    }

    if (this.isChoosingUpgrade) {
      this.maybeChooseBotUpgrade(time);
      return;
    }

    try {
      this.debugStats.frames += 1;
      this.elapsed += delta / 1000;
      this.player.update(this.getMovementVector());
      this.enemies.forEach((enemy) => enemy.update(this.player));
      this.projectileLifecycle.update(delta);
      this.activeAbilities.update(time);
      this.checkProjectileHits();
      this.projectileLifecycle.cleanup();
      this.xpOrbs.forEach((orb) => orb.update(this.player));
      this.waveSystem.update(time, this.enemies.length);
      this.autoShoot(time);
      this.telemetry.sample(time, this.getTelemetrySample());
      this.updateHud();

      if (this.player.hp <= 0) {
        this.gameOver();
      }
    } catch (error) {
      this.debugStats.lastError = error instanceof Error ? error.stack : String(error);
      this.telemetry.summary.lastError = this.debugStats.lastError;
      throw error;
    }
  }

  get gameEnded() {
    return this.runState?.gameEnded ?? false;
  }

  get isChoosingUpgrade() {
    return this.runState?.choosingUpgrade ?? false;
  }

  get pendingUpgradeChoices() {
    return this.runState?.pendingUpgradeChoices ?? null;
  }

  playFx(key, x, y, options = {}) {
    return playSceneFx(this, key, x, y, options);
  }

  setupPhysics() {
    return this.collisions.setup();
  }

  setupTouchInput() {
    return this.playerInput.setupTouchInput();
  }

  toggleFullscreen() {
    const root = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    root.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {});
  }

  applyResponsiveCameraZoom(gameSize) {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    const isPortraitMobile = width <= PORTRAIT_MOBILE_MAX_WIDTH && height > width;
    if (!isPortraitMobile) {
      this.cameras.main.setZoom(1);
      return;
    }

    const renderHeight = ARENA_HEIGHT + ARENA_RENDER_PADDING_Y * 2;
    const minimumCoverZoom = Math.max(width / ARENA_WIDTH, height / renderHeight);
    this.cameras.main.setZoom(Math.max(PORTRAIT_MOBILE_ZOOM, minimumCoverZoom));
  }

  updatePointerVector(pointer) {
    return this.playerInput.updatePointerVector(pointer);
  }

  getMovementVector() {
    return this.playerInput.getMovementVector();
  }

  getBotMovementVector() {
    return this.playerInput.getBotMovementVector();
  }

  autoShoot(time) {
    return this.combat.autoShoot(time);
  }

  getShotPattern() {
    return this.combat.getShotPattern();
  }

  getShotTargets(count, fallbackTarget) {
    return this.combat.getShotTargets(count, fallbackTarget);
  }

  findNearestEnemy() {
    return this.combat.findNearestEnemy();
  }

  findNearestEnemyFrom(x, y) {
    return this.combat.findNearestEnemyFrom(x, y);
  }

  findNearestXpOrb() {
    return this.playerInput.findNearestXpOrb();
  }

  spawnProjectile(angle, target, laneOffset = 0, options = {}) {
    return this.combat.spawnProjectile(angle, target, laneOffset, options);
  }

  spawnSpecialProjectile(angle, target, options = {}) {
    return this.combat.spawnSpecialProjectile(angle, target, options);
  }

  spawnSpecialProjectileFrom(x, y, angle, target, options = {}) {
    return this.combat.spawnSpecialProjectileFrom(x, y, angle, target, options);
  }

  updateActiveAbilities(time) {
    this.activeAbilities.update(time);
  }

  createRocketExplosion(x, y, damage, radius) {
    this.activeAbilities.createRocketExplosion(x, y, damage, radius);
  }

  createMolotovImpact(x, y) {
    this.activeAbilities.createMolotovImpact(x, y);
  }

  setOrbitEggRank(rank) {
    this.activeAbilities.setOrbitEggRank(rank);
  }

  setSupportChickenRank(rank) {
    this.activeAbilities.setSupportChickenRank(rank);
  }

  unlockGoldenEgg(rank) {
    this.activeAbilities.unlockGoldenEgg(rank);
  }

  unlockMolotovEgg(rank) {
    this.activeAbilities.unlockMolotovEgg(rank);
  }

  unlockLightningComb(rank) {
    this.activeAbilities.unlockLightningComb(rank);
  }

  unlockVoidNest(rank) {
    this.activeAbilities.unlockVoidNest(rank);
  }

  unlockRocketEgg(rank) {
    this.activeAbilities.unlockRocketEgg(rank);
  }

  unlockLaserComb(rank) {
    this.activeAbilities.unlockLaserComb(rank);
  }
  spawnEnemyProjectile(x, y, angle, config) {
    return this.enemyAttacks.spawnProjectile(x, y, angle, config);
  }

  spawnBossFireball(x, y, angle, config = {}) {
    return this.enemyAttacks.spawnBossFireball(x, y, angle, config);
  }

  showEnemyMuzzleFlash(x, y, angle, config = {}, burstCount = 1) {
    return this.enemyAttacks.showMuzzleFlash(x, y, angle, config, burstCount);
  }

  checkProjectileHits() {
    return this.combat.checkProjectileHits();
  }

  hitEnemy(projectile, enemy) {
    return this.combat.hitEnemy(projectile, enemy);
  }

  damageEnemy(enemy, damage, x = enemy.sprite.x, y = enemy.sprite.y) {
    return this.combat.damageEnemy(enemy, damage, x, y);
  }

  showHitFeedback(x, y, damage, enemy = null) {
    return this.combatFeedback.showHit(x, y, damage, enemy);
  }

  showShotFeedback(angle, laneOffset = 0) {
    return this.combatFeedback.showShot(angle, laneOffset);
  }

  spawnEnemy(waveConfig) {
    return this.entities.spawnEnemy(waveConfig);
  }

  spawnAddsNear(x, y, count) {
    return this.enemyAttacks.spawnAddsNear(x, y, count);
  }

  killEnemy(enemy) {
    return this.entities.killEnemy(enemy);
  }

  explodeEnemy(enemy) {
    return this.enemyAttacks.explodeEnemy(enemy);
  }

  clearEnemyProjectiles() {
    return this.projectileLifecycle.clearEnemyProjectiles();
  }

  spawnXp(x, y, value) {
    return this.entities.spawnXp(x, y, value);
  }

  removeOrb(orb) {
    return this.entities.removeOrb(orb);
  }

  startLevelUp() {
    return this.runState.startLevelUp();
  }

  chooseUpgrade(upgrade) {
    return this.runState.chooseUpgrade(upgrade);
  }

  maybeChooseBotUpgrade(time) {
    return this.runState.maybeChooseBotUpgrade(time);
  }

  pickBotUpgrade(choices) {
    return this.runState.pickBotUpgrade(choices);
  }

  updateHud() {
    this.hud.update({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      level: this.player.level,
      xpPercent: this.player.xp / this.player.xpToNext,
      wave: this.waveSystem.currentWave,
      elapsed: this.elapsed,
      upgrades: this.player.upgrades
    });
  }

  gameOver() {
    return this.runState.gameOver();
  }

  victory() {
    return this.runState.victory();
  }

  onWaveStarted(wave, config) {
    this.telemetry.record('waveStarted', this.time.now, { wave, type: config.type });
  }

  onWaveCompleted(wave) {
    this.telemetry.record('waveCompleted', this.time.now, { wave });
  }

  getTelemetrySample() {
    const nearestEnemy = this.findNearestEnemy();
    const nearestEnemyDistance = nearestEnemy
      ? Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, nearestEnemy.sprite.x, nearestEnemy.sprite.y)
      : Infinity;
    return {
      wave: this.waveSystem.currentWave,
      enemiesAlive: this.enemies.length,
      projectilesAlive: this.projectiles.length,
      hpRatio: this.player.hp / this.player.maxHp,
      nearestEnemyDistance
    };
  }

  shutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.applyResponsiveCameraZoom, this);
    this.playerInput?.destroy();
    removeTestApi();
    this.hud?.destroy();
  }
}
