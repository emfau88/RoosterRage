import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { EnemyProjectile } from '../entities/EnemyProjectile.js';
import { Projectile } from '../entities/Projectile.js';
import { XPOrb } from '../entities/XPOrb.js';
import { ActiveAbilitySystem } from '../systems/ActiveAbilitySystem.js';
import {
  addArena,
  createGameAnimations,
  createGeneratedTextures,
  playSceneFx,
  preloadGameAssets
} from '../systems/AssetSetup.js';
import { AudioSystem } from '../systems/AudioSystem.js';
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
    this.gameEnded = false;
    this.isChoosingUpgrade = false;
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
    this.pointerVector = new Phaser.Math.Vector2(0, 0);
    this.activePointerId = null;
    this.touchOrigin = null;

    this.player = new Player(this, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.applyResponsiveCameraZoom(this.scale.gameSize);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyResponsiveCameraZoom, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(
      (upgrade) => this.chooseUpgrade(upgrade),
      () => this.scene.restart(),
      () => this.toggleFullscreen()
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyResponsiveCameraZoom, this);
      this.hud?.destroy();
    });

    this.setupTouchInput();
    this.setupPhysics();
    installTestApi(this);
    this.waveSystem.start();
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
      this.projectiles.forEach((projectile) => projectile.update(delta));
      this.enemyProjectiles.forEach((projectile) => projectile.update(delta));
      this.molotovProjectiles.forEach((projectile) => projectile.update(delta));
      this.rocketProjectiles.forEach((projectile) => projectile.update(delta));
      this.lightningBolts.forEach((bolt) => bolt.update(delta));
      this.orbitEggs.forEach((egg) => egg.update(delta));
      this.supportChickens.forEach((chicken) => chicken.update(delta));
      this.hazardZones.forEach((zone) => zone.update(delta));
      this.voidZones.forEach((zone) => zone.update(delta));
      this.activeAbilities.update(time);
      this.checkProjectileHits();
      this.projectiles = this.projectiles.filter((projectile) => projectile.sprite.active);
      this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.sprite.active);
      this.molotovProjectiles = this.molotovProjectiles.filter((projectile) => projectile.active);
      this.rocketProjectiles = this.rocketProjectiles.filter((projectile) => projectile.active);
      this.lightningBolts = this.lightningBolts.filter((bolt) => bolt.active);
      this.orbitEggs = this.orbitEggs.filter((egg) => egg.sprite.active);
      this.supportChickens = this.supportChickens.filter((chicken) => chicken.sprite.active);
      this.hazardZones = this.hazardZones.filter((zone) => zone.active);
      this.voidZones = this.voidZones.filter((zone) => zone.active);
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

  playFx(key, x, y, options = {}) {
    return playSceneFx(this, key, x, y, options);
  }

  setupPhysics() {
    this.enemyGroup = this.physics.add.group();
    this.projectileGroup = this.physics.add.group();
    this.enemyProjectileGroup = this.physics.add.group();
    this.xpGroup = this.physics.add.group();

    this.physics.add.overlap(this.projectileGroup, this.enemyGroup, (projectileSprite, enemySprite) => {
      const projectile = projectileSprite.entity;
      const enemy = enemySprite.entity;
      if (!projectile || !enemy) {
        return;
      }
      this.hitEnemy(projectile, enemy);
    });

    this.physics.add.overlap(this.player.sprite, this.enemyGroup, (_playerSprite, enemySprite) => {
      const enemy = enemySprite.entity;
      if (enemy && this.player.damage(enemy.damage, this.time.now)) {
        this.audio.play('player-hit');
        this.telemetry.addDamageTaken(enemy.damage, this.time.now, this.waveSystem.currentWave);
        this.cameras.main.shake(90, 0.004);
      }
    });

    this.physics.add.overlap(this.player.sprite, this.enemyProjectileGroup, (_playerSprite, projectileSprite) => {
      const projectile = projectileSprite.entity;
      if (!projectile) {
        return;
      }
      if (this.player.damage(projectile.damage, this.time.now)) {
        this.audio.play('player-hit');
        this.telemetry.addDamageTaken(projectile.damage, this.time.now, this.waveSystem.currentWave);
        this.cameras.main.shake(70, 0.003);
      }
      projectile.destroy();
    });

    this.physics.add.overlap(this.player.sprite, this.xpGroup, (_playerSprite, orbSprite) => {
      const orb = orbSprite.entity;
      if (!orb) {
        return;
      }
      const leveled = this.player.addXp(orb.value);
      this.audio.play('xp-pickup');
      this.debugStats.xpCollected += orb.value;
      this.telemetry.addXp(orb.value, this.time.now, this.waveSystem.currentWave);
      this.removeOrb(orb);
      if (leveled) {
        this.audio.play('level-up');
        this.debugStats.levelUps += 1;
        this.telemetry.addLevelUp(this.time.now, this.waveSystem.currentWave, this.player.level);
        this.startLevelUp();
      }
    });
  }

  setupTouchInput() {
    this.input.on('pointerdown', (pointer) => {
      if (this.isChoosingUpgrade || pointer.x > this.scale.width * 0.58) {
        return;
      }
      this.activePointerId = pointer.id;
      this.touchOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
      this.updatePointerVector(pointer);
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id === this.activePointerId) {
        this.updatePointerVector(pointer);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id === this.activePointerId) {
        this.activePointerId = null;
        this.touchOrigin = null;
        this.pointerVector.set(0, 0);
        this.hud.setJoystick(this.pointerVector);
      }
    });
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
    const current = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const vector = current.subtract(this.touchOrigin);
    if (vector.length() > 46) {
      vector.setLength(46);
    }
    this.pointerVector.set(vector.x / 46, vector.y / 46);
    this.hud.setJoystick(this.pointerVector);
  }

  getMovementVector() {
    const vector = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.keys.A.isDown) vector.x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) vector.x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vector.y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) vector.y += 1;
    if (vector.lengthSq() === 0) {
      vector.copy(this.pointerVector);
    }
    if (this.bot.enabled) {
      return this.getBotMovementVector();
    }
    return vector;
  }

  getBotMovementVector() {
    const movement = new Phaser.Math.Vector2(0, 0);
    const playerPosition = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y);
    const nearestEnemy = this.findNearestEnemy();
    const nearestDistance = nearestEnemy
      ? Phaser.Math.Distance.Between(playerPosition.x, playerPosition.y, nearestEnemy.sprite.x, nearestEnemy.sprite.y)
      : Infinity;

    if (nearestEnemy && nearestDistance < 220) {
      movement.add(playerPosition.clone().subtract(new Phaser.Math.Vector2(nearestEnemy.sprite.x, nearestEnemy.sprite.y)).normalize().scale(1.35));
    }

    const nearestOrb = this.findNearestXpOrb();
    if (nearestOrb && nearestDistance > 145) {
      movement.add(new Phaser.Math.Vector2(nearestOrb.sprite.x, nearestOrb.sprite.y).subtract(playerPosition).normalize().scale(0.9));
    } else if (!nearestEnemy) {
      movement.add(this.bot.target.clone().subtract(playerPosition).normalize());
      if (Phaser.Math.Distance.Between(playerPosition.x, playerPosition.y, this.bot.target.x, this.bot.target.y) < 80) {
        this.bot.target.set(Phaser.Math.Between(260, ARENA_WIDTH - 260), Phaser.Math.Between(200, ARENA_HEIGHT - 200));
      }
    }

    const edgePadding = 150;
    if (playerPosition.x < edgePadding) movement.x += 0.9;
    if (playerPosition.x > ARENA_WIDTH - edgePadding) movement.x -= 0.9;
    if (playerPosition.y < edgePadding) movement.y += 0.9;
    if (playerPosition.y > ARENA_HEIGHT - edgePadding) movement.y -= 0.9;

    if (movement.lengthSq() > 1) {
      movement.normalize();
    }
    return movement;
  }

  autoShoot(time) {
    if (time - this.lastShotAt < this.player.fireRate || this.enemies.length === 0) {
      return;
    }

    const target = this.findNearestEnemy();
    if (!target) {
      return;
    }

    const baseAngle = Phaser.Math.Angle.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      target.sprite.x,
      target.sprite.y
    );
    this.player.aimAt(baseAngle);
    const pattern = this.getShotPattern();
    const targets = this.getShotTargets(pattern.length, target);
    pattern.forEach((shot, index) => {
      const shotTarget = targets[index] ?? target;
      const angle = Phaser.Math.Angle.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        shotTarget.sprite.x,
        shotTarget.sprite.y
      );
      this.spawnProjectile(angle, shotTarget, shot.laneOffset, {
        homing: true,
        maxTurnRate: shot.maxTurnRate ?? 0.08,
        targetOffset: 0,
        laneOffset: shot.laneOffset
      });
      this.showShotFeedback(angle, shot.laneOffset);
    });
    this.lastShotAt = time;
    this.audio.play('egg-shot');
    this.debugStats.shots += pattern.length;
    this.debugStats.lastShotAt = time;
    this.telemetry.addShot(pattern.length, time, this.waveSystem.currentWave);
  }

  getShotPattern() {
    if (this.player.shotCount >= 3) {
      return [
        { laneOffset: -24, maxTurnRate: 0.095 },
        { laneOffset: 0, maxTurnRate: 0.09 },
        { laneOffset: 24, maxTurnRate: 0.095 }
      ];
    }
    if (this.player.shotCount === 2) {
      return [
        { laneOffset: -18, maxTurnRate: 0.095 },
        { laneOffset: 18, maxTurnRate: 0.095 }
      ];
    }
    return [{ angleOffset: 0, laneOffset: 0 }];
  }

  getShotTargets(count, fallbackTarget) {
    const sorted = [...this.enemies]
      .filter((enemy) => enemy.sprite.active)
      .sort((a, b) => Phaser.Math.Distance.Squared(this.player.sprite.x, this.player.sprite.y, a.sprite.x, a.sprite.y)
        - Phaser.Math.Distance.Squared(this.player.sprite.x, this.player.sprite.y, b.sprite.x, b.sprite.y));
    if (!sorted.length) {
      return Array(count).fill(fallbackTarget);
    }
    const targets = [];
    for (let i = 0; i < count; i += 1) {
      targets.push(sorted[i] ?? fallbackTarget);
    }
    return targets;
  }

  findNearestEnemy() {
    let nearest = null;
    let nearestDistance = Infinity;
    this.enemies.forEach((enemy) => {
      const distance = Phaser.Math.Distance.Squared(
        this.player.sprite.x,
        this.player.sprite.y,
        enemy.sprite.x,
        enemy.sprite.y
      );
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  findNearestEnemyFrom(x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    this.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Squared(x, y, enemy.sprite.x, enemy.sprite.y);
      if (distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  findNearestXpOrb() {
    let nearest = null;
    let nearestDistance = Infinity;
    this.xpOrbs.forEach((orb) => {
      const distance = Phaser.Math.Distance.Squared(
        this.player.sprite.x,
        this.player.sprite.y,
        orb.sprite.x,
        orb.sprite.y
      );
      if (distance < nearestDistance) {
        nearest = orb;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  spawnProjectile(angle, target, laneOffset = 0, options = {}) {
    const muzzle = this.player.getMuzzlePosition(42);
    const sideX = -Math.sin(this.player.aimAngle) * laneOffset;
    const sideY = Math.cos(this.player.aimAngle) * laneOffset;
    const projectile = new Projectile(
      this,
      muzzle.x + sideX,
      muzzle.y + sideY,
      angle,
      this.player.projectileDamage,
      this.player.fireEggs,
      target,
      options.targetOffset ?? laneOffset,
      options
    );
    this.projectiles.push(projectile);
    this.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
  }

  spawnSpecialProjectile(angle, target, options = {}) {
    const muzzle = this.player.getMuzzlePosition(options.muzzleDistance ?? 48);
    return this.spawnSpecialProjectileFrom(muzzle.x, muzzle.y, angle, target, options);
  }

  spawnSpecialProjectileFrom(x, y, angle, target, options = {}) {
    const projectile = new Projectile(
      this,
      x,
      y,
      angle,
      options.damage ?? this.player.projectileDamage,
      options.isFireEgg ?? false,
      target,
      0,
      options
    );
    this.projectiles.push(projectile);
    this.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
    this.showShotFeedback(angle, 0);
    this.audio.play(options.sfx ?? 'egg-shot', { volume: options.sfxVolume });
    this.debugStats.specialShots += 1;
    this.telemetry.addShot(1, this.time.now, this.waveSystem.currentWave);
    return projectile;
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
    const muzzleDistance = config.muzzleDistance ?? 30;
    const projectile = new EnemyProjectile(
      this,
      x + Math.cos(angle) * muzzleDistance,
      y + Math.sin(angle) * muzzleDistance,
      angle,
      config
    );
    this.enemyProjectiles.push(projectile);
    this.enemyProjectileGroup.add(projectile.sprite);
  }

  spawnBossFireball(x, y, angle, config = {}) {
    const fireballConfig = {
      texture: 'boss-fireball',
      radius: 19,
      speed: 238,
      damage: 22,
      life: 4200,
      color: 0xff6a28,
      trailColor: 0xff3322,
      trailAlpha: 0.44,
      scale: 1.55,
      depth: 8,
      muzzleDistance: 82,
      pulse: true,
      tint: false,
      ...config
    };
    this.showEnemyMuzzleFlash(x, y, angle, fireballConfig, 3);
    this.spawnEnemyProjectile(x, y, angle, fireballConfig);
  }

  showEnemyMuzzleFlash(x, y, angle, config = {}, burstCount = 1) {
    const color = config.color ?? 0xa7ff64;
    const distance = burstCount > 1 ? 28 : 22;
    const flashX = x + Math.cos(angle) * distance;
    const flashY = y + Math.sin(angle) * distance;
    const flash = this.add.circle(flashX, flashY, burstCount > 1 ? 18 : 13, color, 0.42)
      .setStrokeStyle(2, color, 0.85)
      .setDepth(6);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: burstCount > 1 ? 2.2 : 1.7,
      duration: 150,
      onComplete: () => flash.destroy()
    });
  }

  checkProjectileHits() {
    this.projectiles.forEach((projectile) => {
      if (!projectile.sprite.active) {
        return;
      }
      const enemy = this.enemies.find((candidate) => (
        candidate.sprite.active &&
        !projectile.hitEnemies.has(candidate.id) &&
        Phaser.Math.Distance.Between(
          projectile.sprite.x,
          projectile.sprite.y,
          candidate.sprite.x,
          candidate.sprite.y
        ) <= projectile.hitRadius
      ));
      if (enemy) {
        this.hitEnemy(projectile, enemy);
      }
    });
  }

  hitEnemy(projectile, enemy) {
    if (!projectile.sprite.active || !enemy.sprite.active) {
      return;
    }
    const hitX = enemy.sprite.x;
    const hitY = enemy.sprite.y;
    projectile.hitEnemies.add(enemy.id);
    this.damageEnemy(enemy, projectile.damage, hitX, hitY);
    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
    } else {
      projectile.destroy();
    }
  }

  damageEnemy(enemy, damage, x = enemy.sprite.x, y = enemy.sprite.y) {
    if (!enemy.sprite.active) {
      return;
    }
    this.showHitFeedback(x, y, damage);
    this.audio.play('enemy-hit');
    this.debugStats.hits += 1;
    this.debugStats.lastHitAt = this.time.now;
    this.telemetry.addHit(this.time.now, this.waveSystem.currentWave);
    if (enemy.takeDamage(damage)) {
      this.killEnemy(enemy);
    }
  }

  showHitFeedback(x, y, damage) {
    const burst = this.add.circle(x, y, 18, 0xffffff, 0.8).setDepth(9);
    const text = this.add.text(x, y - 30, `-${damage}`, {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#2b1114',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.8,
      duration: 120,
      onComplete: () => burst.destroy()
    });
    this.tweens.add({
      targets: text,
      y: y - 48,
      alpha: 0,
      duration: 420,
      onComplete: () => text.destroy()
    });
  }

  showShotFeedback(angle, laneOffset = 0) {
    const muzzle = this.player.getMuzzlePosition(44);
    const sideX = -Math.sin(this.player.aimAngle) * laneOffset;
    const sideY = Math.cos(this.player.aimAngle) * laneOffset;
    const flash = this.add.circle(
      muzzle.x + sideX,
      muzzle.y + sideY,
      this.player.fireEggs ? 9 : 7,
      this.player.fireEggs ? 0xff6a28 : 0xfff3b0,
      0.9
    );
    flash.setDepth(6);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 110,
      onComplete: () => flash.destroy()
    });
  }

  spawnEnemy(waveConfig) {
    const edge = Phaser.Math.Between(0, 3);
    const margin = 36;
    let x = Phaser.Math.Between(margin, ARENA_WIDTH - margin);
    let y = Phaser.Math.Between(margin, ARENA_HEIGHT - margin);
    if (edge === 0) y = margin;
    if (edge === 1) x = ARENA_WIDTH - margin;
    if (edge === 2) y = ARENA_HEIGHT - margin;
    if (edge === 3) x = margin;

    const enemy = new Enemy(this, x, y, waveConfig);
    this.enemies.push(enemy);
    this.enemyGroup.add(enemy.sprite);
    this.telemetry.summary.enemiesSpawned += 1;
    this.telemetry.record('enemySpawned', this.time.now, {
      wave: this.waveSystem.currentWave,
      type: waveConfig.type ?? 'unknown'
    });
  }

  spawnAddsNear(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const config = this.waveSystem.makeSlime(0.8);
      const enemy = new Enemy(this, x + Math.cos(angle) * 80, y + Math.sin(angle) * 80, config);
      this.enemies.push(enemy);
      this.enemyGroup.add(enemy.sprite);
    }
  }

  killEnemy(enemy) {
    this.enemies = this.enemies.filter((item) => item !== enemy);
    if (enemy.type === 'boss') {
      this.clearEnemyProjectiles();
    }
    if (enemy.explodeOnDeath) {
      this.explodeEnemy(enemy);
    } else {
      this.audio.play(enemy.type === 'boss' ? 'rocket-explosion' : 'enemy-pop');
    }
    this.spawnXp(enemy.sprite.x, enemy.sprite.y, enemy.xpValue);
    this.debugStats.kills += 1;
    this.telemetry.addKill(this.time.now, this.waveSystem.currentWave, enemy.type);
    enemy.destroy();
  }

  explodeEnemy(enemy) {
    const radius = enemy.explosionRadius ?? 86;
    const damage = enemy.explosionDamage ?? 18;
    const x = enemy.sprite.x;
    const y = enemy.sprite.y;
    const core = this.add.circle(x, y, 22, 0xfff08a, 0.55).setDepth(10);
    this.audio.play('rocket-explosion');
    const ring = this.add.circle(x, y, radius, 0xff6a28, 0.24).setStrokeStyle(4, 0xffd35c, 0.9).setDepth(9);
    this.tweens.add({
      targets: core,
      alpha: 0,
      scale: 3.4,
      duration: 180,
      onComplete: () => core.destroy()
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.18,
      duration: 280,
      onComplete: () => ring.destroy()
    });
    if (Phaser.Math.Distance.Between(x, y, this.player.sprite.x, this.player.sprite.y) <= radius) {
      if (this.player.damage(damage, this.time.now)) {
        this.telemetry.addDamageTaken(damage, this.time.now, this.waveSystem.currentWave);
      }
    }
  }

  clearEnemyProjectiles() {
    this.enemyProjectiles.forEach((projectile) => projectile.destroy());
    this.enemyProjectiles = [];
  }

  spawnXp(x, y, value) {
    const orb = new XPOrb(this, x, y, value);
    this.xpOrbs.push(orb);
    this.xpGroup.add(orb.sprite);
  }

  removeOrb(orb) {
    this.xpOrbs = this.xpOrbs.filter((item) => item !== orb);
    orb.destroy();
  }

  startLevelUp() {
    this.isChoosingUpgrade = true;
    this.upgradeStartedAt = this.time.now;
    this.pendingUpgradeChoices = this.upgradeSystem.getChoices(3, this.player);
    this.bot.upgradeReadyAt = this.time.now + 350;
    this.physics.pause();
    this.telemetry.addUpgradeOffer(this.time.now, this.waveSystem.currentWave, this.pendingUpgradeChoices);
    this.hud.showUpgradeChoices(this.pendingUpgradeChoices);
  }

  chooseUpgrade(upgrade) {
    const pauseMs = this.upgradeStartedAt ? this.time.now - this.upgradeStartedAt : 0;
    this.player.applyUpgrade(upgrade, this);
    this.telemetry.addUpgradeChoice(this.time.now, this.waveSystem.currentWave, upgrade, pauseMs);
    this.hud.hideOverlay();
    this.physics.resume();
    this.isChoosingUpgrade = false;
    this.pendingUpgradeChoices = null;
    this.updateHud();
  }

  maybeChooseBotUpgrade(time) {
    if (!this.bot.enabled || time < this.bot.upgradeReadyAt || !this.pendingUpgradeChoices) {
      return;
    }
    this.chooseUpgrade(this.pickBotUpgrade(this.pendingUpgradeChoices));
  }

  pickBotUpgrade(choices) {
    const priorities = {
      offense: ['faster-eggs', 'fire-eggs', 'triple-shot', 'piercing-eggs', 'bigger-eggs', 'double-shot', 'move-speed', 'max-hp', 'heal'],
      defense: ['max-hp', 'armor', 'regen', 'heal', 'move-speed', 'faster-eggs', 'fire-eggs'],
      random: [],
      'bad-but-valid': ['heal', 'xp-magnet', 'double-shot', 'max-hp', 'bigger-eggs', 'triple-shot', 'fire-eggs', 'faster-eggs']
    };
    if (this.bot.strategy === 'random') {
      return Phaser.Utils.Array.GetRandom(choices);
    }
    const list = priorities[this.bot.strategy] ?? priorities.offense;
    const rank = (id) => {
      const index = list.indexOf(id);
      return index === -1 ? 999 : index;
    };
    return [...choices].sort((a, b) => rank(a.id) - rank(b.id))[0];
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
    this.gameEnded = true;
    this.physics.pause();
    this.telemetry.finish(this.time.now, 'gameOver');
    this.hud.showEndScreen('Game Over', 'Der Hahn wurde ueberrannt.');
  }

  victory() {
    this.gameEnded = true;
    this.physics.pause();
    this.telemetry.finish(this.time.now, 'victory');
    this.hud.showEndScreen('Victory', 'Alle 3 Wellen sind ueberstanden.');
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
    removeTestApi();
    this.hud?.destroy();
  }
}
