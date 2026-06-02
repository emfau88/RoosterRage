import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { EnemyProjectile } from '../entities/EnemyProjectile.js';
import { Projectile } from '../entities/Projectile.js';
import { XPOrb } from '../entities/XPOrb.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { Telemetry } from '../systems/Telemetry.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { HUD } from '../ui/HUD.js';
import roosterWalkSheetUrl from '../assets/rooster-walk-sheet.png';
import enemySlimeUrl from '../assets/enemy-slime.png';
import enemyRunnerUrl from '../assets/enemy-runner.png';
import enemyBruteUrl from '../assets/enemy-brute.png';
import enemySpitterUrl from '../assets/enemies/enemy-spitter.png';
import enemyFanSpitterUrl from '../assets/enemies/enemy-fan-spitter.png';
import enemyBomberUrl from '../assets/enemies/enemy-bomber.png';
import enemyEliteRunnerUrl from '../assets/enemies/enemy-elite-runner.png';
import enemyEliteBruteUrl from '../assets/enemies/enemy-elite-brute.png';
import enemyEliteSpitterUrl from '../assets/enemies/enemy-elite-spitter.png';
import enemyBossUrl from '../assets/enemies/enemy-boss.png';
import arenaGroundUrl from '../assets/map/arena-ground.png';

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 900;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.spritesheet('rooster-walk', roosterWalkSheetUrl, {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.image('enemy-slime', enemySlimeUrl);
    this.load.image('enemy-runner', enemyRunnerUrl);
    this.load.image('enemy-brute', enemyBruteUrl);
    this.load.image('enemy-spitter', enemySpitterUrl);
    this.load.image('enemy-fan-spitter', enemyFanSpitterUrl);
    this.load.image('enemy-bomber', enemyBomberUrl);
    this.load.image('enemy-elite-runner', enemyEliteRunnerUrl);
    this.load.image('enemy-elite-brute', enemyEliteBruteUrl);
    this.load.image('enemy-elite-spitter', enemyEliteSpitterUrl);
    this.load.image('enemy-boss', enemyBossUrl);
    this.load.image('arena-ground', arenaGroundUrl);
  }

  create() {
    this.createTextures();
    this.createAnimations();
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    this.addArena();

    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.xpOrbs = [];
    this.gameEnded = false;
    this.isChoosingUpgrade = false;
    this.elapsed = 0;
    this.telemetry = new Telemetry();
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(
      (upgrade) => this.chooseUpgrade(upgrade),
      () => this.scene.restart()
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud?.destroy());

    this.setupTouchInput();
    this.setupPhysics();
    this.installTestApi();
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
      this.checkProjectileHits();
      this.projectiles = this.projectiles.filter((projectile) => projectile.sprite.active);
      this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.sprite.active);
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

  createTextures() {
    const egg = this.make.graphics({ x: 0, y: 0, add: false });
    egg.fillStyle(0xfffbef, 1);
    egg.fillEllipse(10, 10, 18, 13);
    egg.generateTexture('egg', 20, 20);
    egg.clear();
    egg.fillStyle(0xff5b25, 1);
    egg.fillEllipse(10, 10, 19, 14);
    egg.fillStyle(0xffd05c, 1);
    egg.fillEllipse(12, 8, 8, 5);
    egg.generateTexture('fire-egg', 20, 20);
    egg.destroy();

    const xp = this.make.graphics({ x: 0, y: 0, add: false });
    xp.fillStyle(0x4bb7ff, 1);
    xp.fillCircle(9, 9, 7);
    xp.fillStyle(0xffd14a, 1);
    xp.fillCircle(7, 6, 3);
    xp.generateTexture('xp-orb', 18, 18);
    xp.destroy();

    const shot = this.make.graphics({ x: 0, y: 0, add: false });
    shot.fillStyle(0xa7ff64, 1);
    shot.fillCircle(9, 9, 7);
    shot.fillStyle(0xffffff, 0.65);
    shot.fillCircle(6, 5, 3);
    shot.generateTexture('enemy-shot', 18, 18);
    shot.destroy();
  }

  createAnimations() {
    const directions = [
      ['rooster-walk-south', 0],
      ['rooster-walk-west', 4],
      ['rooster-walk-east', 8],
      ['rooster-walk-north', 12]
    ];
    directions.forEach(([key, start]) => {
      if (this.anims.exists(key)) {
        return;
      }
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('rooster-walk', { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1
      });
    });
  }

  addArena() {
    this.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 'arena-ground')
      .setDisplaySize(ARENA_WIDTH, ARENA_HEIGHT)
      .setDepth(0);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x3d4b3f, 0.08);
    for (let x = 0; x <= ARENA_WIDTH; x += 80) {
      grid.lineBetween(x, 0, x, ARENA_HEIGHT);
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += 80) {
      grid.lineBetween(0, y, ARENA_WIDTH, y);
    }
    this.add.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_WIDTH - 8, ARENA_HEIGHT - 8)
      .setStrokeStyle(8, 0x4d3821, 0.65)
      .setDepth(2);
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
      this.debugStats.xpCollected += orb.value;
      this.telemetry.addXp(orb.value, this.time.now, this.waveSystem.currentWave);
      this.removeOrb(orb);
      if (leveled) {
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
    pattern.forEach((shot) => {
      this.spawnProjectile(baseAngle + shot.angleOffset, target, shot.laneOffset);
      this.showShotFeedback(baseAngle, shot.laneOffset);
    });
    this.lastShotAt = time;
    this.debugStats.shots += pattern.length;
    this.debugStats.lastShotAt = time;
    this.telemetry.addShot(pattern.length, time, this.waveSystem.currentWave);
  }

  getShotPattern() {
    if (this.player.shotCount >= 3) {
      return [
        { angleOffset: -0.42, laneOffset: -24 },
        { angleOffset: 0, laneOffset: 0 },
        { angleOffset: 0.42, laneOffset: 24 }
      ];
    }
    if (this.player.shotCount === 2) {
      return [
        { angleOffset: -0.34, laneOffset: -18 },
        { angleOffset: 0.34, laneOffset: 18 }
      ];
    }
    return [{ angleOffset: 0, laneOffset: 0 }];
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

  spawnProjectile(angle, target, laneOffset = 0) {
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
      laneOffset,
      { homing: laneOffset === 0 }
    );
    this.projectiles.push(projectile);
    this.projectileGroup.add(projectile.sprite);
    projectile.setVelocity(angle);
  }

  spawnEnemyProjectile(x, y, angle, config) {
    const projectile = new EnemyProjectile(this, x, y, angle, config);
    this.enemyProjectiles.push(projectile);
    this.enemyProjectileGroup.add(projectile.sprite);
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
    this.showHitFeedback(hitX, hitY, projectile.damage);
    this.debugStats.hits += 1;
    this.debugStats.lastHitAt = this.time.now;
    this.telemetry.addHit(this.time.now, this.waveSystem.currentWave);
    if (enemy.takeDamage(projectile.damage)) {
      this.killEnemy(enemy);
    }
    if (projectile.pierceRemaining > 0) {
      projectile.pierceRemaining -= 1;
    } else {
      projectile.destroy();
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
    this.pendingUpgradeChoices = this.upgradeSystem.getChoices(3);
    this.bot.upgradeReadyAt = this.time.now + 350;
    this.physics.pause();
    this.telemetry.addUpgradeOffer(this.time.now, this.waveSystem.currentWave, this.pendingUpgradeChoices);
    this.hud.showUpgradeChoices(this.pendingUpgradeChoices);
  }

  chooseUpgrade(upgrade) {
    const pauseMs = this.upgradeStartedAt ? this.time.now - this.upgradeStartedAt : 0;
    this.player.applyUpgrade(upgrade);
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

  installTestApi() {
    window.__ROOSTER_TEST__ = {
      getState: () => ({
        frames: this.debugStats.frames,
        elapsed: this.elapsed,
        playerHp: this.player.hp,
        enemies: this.enemies.length,
        projectiles: this.projectiles.length,
        enemyProjectiles: this.enemyProjectiles.length,
        xpOrbs: this.xpOrbs.length,
        wave: this.waveSystem.currentWave,
        shots: this.debugStats.shots,
        hits: this.debugStats.hits,
        kills: this.debugStats.kills,
        xpCollected: this.debugStats.xpCollected,
        levelUps: this.debugStats.levelUps,
        choosingUpgrade: this.isChoosingUpgrade,
        gameEnded: this.gameEnded,
        lastShotAt: this.debugStats.lastShotAt,
        lastHitAt: this.debugStats.lastHitAt,
        lastError: this.debugStats.lastError,
        telemetry: this.telemetry.getSummary(this.time.now),
        player: {
          x: this.player.sprite.x,
          y: this.player.sprite.y,
          rotation: this.player.sprite.rotation
        }
      }),
      getPlayerStats: () => ({
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        speed: this.player.speed,
        fireRate: this.player.fireRate,
        projectileDamage: this.player.projectileDamage,
        shotCount: this.player.shotCount,
        fireEggs: this.player.fireEggs,
        armor: this.player.armor,
        regenPerSecond: this.player.regenPerSecond,
        xpMagnetRadius: this.player.xpMagnetRadius,
        projectilePierce: this.player.projectilePierce,
        projectileSizeBonus: this.player.projectileSizeBonus
      }),
      getProjectileSnapshot: () => this.projectiles.map((projectile) => ({
        x: projectile.sprite.x,
        y: projectile.sprite.y,
        vx: projectile.sprite.body?.velocity.x ?? 0,
        vy: projectile.sprite.body?.velocity.y ?? 0,
        homing: projectile.homing,
        targetOffset: projectile.targetOffset,
        active: projectile.sprite.active
      })),
      applyUpgradeById: (id) => {
        const upgrade = this.upgradeSystem.upgrades.find((item) => item.id === id);
        if (!upgrade) {
          return false;
        }
        this.player.applyUpgrade(upgrade);
        this.updateHud();
        return true;
      },
      setPlayerHp: (hp) => {
        this.player.hp = Phaser.Math.Clamp(hp, 0, this.player.maxHp);
        this.player.updateHealthBar();
        return this.player.hp;
      },
      damagePlayer: (amount) => {
        this.player.invulnerableUntil = 0;
        this.player.damage(amount, this.time.now);
        return this.player.hp;
      },
      clearEnemies: () => {
        this.enemies.forEach((enemy) => enemy.destroy());
        this.enemies = [];
        return true;
      },
      clearProjectiles: () => {
        this.projectiles.forEach((projectile) => projectile.destroy());
        this.projectiles = [];
        this.clearEnemyProjectiles();
        return true;
      },
      spawnEnemyType: (type, x = this.player.sprite.x + 180, y = this.player.sprite.y, overrides = {}) => {
        const makers = {
          slime: () => this.waveSystem.makeSlime(),
          runner: () => this.waveSystem.makeRunner(),
          brute: () => this.waveSystem.makeBrute(),
          spitter: () => this.waveSystem.makeSpitter(),
          'fan-spitter': () => this.waveSystem.makeFanSpitter(),
          bomber: () => this.waveSystem.makeBomber(),
          boss: () => this.waveSystem.makeBoss()
        };
        const config = { ...(makers[type]?.() ?? this.waveSystem.makeSlime()), ...overrides };
        const enemy = new Enemy(this, x, y, config);
        this.enemies.push(enemy);
        this.enemyGroup.add(enemy.sprite);
        return enemy.id;
      },
      damageEnemyById: (id, amount) => {
        const enemy = this.enemies.find((item) => item.id === id);
        if (!enemy) {
          return false;
        }
        if (enemy.takeDamage(amount)) {
          this.killEnemy(enemy);
        }
        return true;
      },
      forceSpawnEnemy: (x = this.player.sprite.x + 170, y = this.player.sprite.y) => {
        this.spawnEnemy({
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
        const enemy = this.enemies[this.enemies.length - 1];
        enemy.sprite.setPosition(x, y);
        return this.enemies.length;
      },
      movePlayer: (x, y) => {
        this.player.sprite.setPosition(x, y);
        this.player.updateHealthBar();
      },
      setShotCount: (count) => {
        this.player.shotCount = Phaser.Math.Clamp(count, 1, 3);
        return this.player.shotCount;
      },
      enableBot: (strategy = 'offense') => {
        this.bot.enabled = true;
        this.bot.strategy = strategy;
        return { enabled: this.bot.enabled, strategy: this.bot.strategy };
      },
      getTelemetry: () => this.telemetry.getSummary(this.time.now),
      resumeIfUpgradeOpen: () => {
        if (!this.isChoosingUpgrade) {
          return false;
        }
        this.chooseUpgrade(this.pendingUpgradeChoices?.[0] ?? this.upgradeSystem.getChoices(1)[0]);
        return true;
      }
    };
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
    if (window.__ROOSTER_TEST__?.getState) {
      delete window.__ROOSTER_TEST__;
    }
    this.hud?.destroy();
  }
}
