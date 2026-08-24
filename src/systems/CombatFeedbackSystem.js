import Phaser from 'phaser';
import { getCombatFeedbackProfile, getMultiKillTier } from '../data/combatFeedbackProfiles.js';

export class CombatFeedbackSystem {
  constructor(scene) {
    this.scene = scene;
    this.lastDamageTextAt = new WeakMap();
    this.lastShakeAt = -Infinity;
    this.activeTelegraphs = 0;
    this.activeHitVisuals = new Set();
    this.activeDamageTexts = new Set();
    this.activeDeathEchoes = new Set();
    this.hitBurstWindowAt = -Infinity;
    this.hitBurstsByProfile = new Map();
    this.killChain = { count: 0, lastAt: -Infinity, announced: 0, source: null };
    this.lastMultiKill = null;
  }

  showHit(x, y, damage, enemy = null, options = {}) {
    const critical = options.critical ?? false;
    const profile = getCombatFeedbackProfile(options.source);
    const now = this.scene.time.now;
    if (now - this.hitBurstWindowAt > 70) {
      this.hitBurstWindowAt = now;
      this.hitBurstsByProfile.clear();
    }
    const profileBurstLimit = ['explosive', 'void', 'fire'].includes(profile.id) ? 4 : 8;
    const profileBursts = this.hitBurstsByProfile.get(profile.id) ?? 0;
    const heavy = Boolean(
      options.heavy
      || critical
      || (enemy?.maxHp > 0 && damage >= enemy.maxHp * 0.32)
    );
    let burst = null;
    if (this.activeHitVisuals.size < 12 && profileBursts < profileBurstLimit) {
      this.hitBurstsByProfile.set(profile.id, profileBursts + 1);
      burst = this.scene.add.ellipse(
        x,
        y + 4,
        heavy ? 42 : 28,
        heavy ? 24 : 17,
        critical ? 0xffd35c : profile.color,
        critical ? 0.88 : 0.68
      )
        .setStrokeStyle(heavy ? 3 : 2, profile.flash, heavy ? 0.9 : 0.68)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(9);
      this.activeHitVisuals.add(burst);
    }
    const lastTextAt = enemy ? this.lastDamageTextAt.get(enemy) ?? -Infinity : -Infinity;
    const showText = this.scene.effects.enabled('damageNumbers')
      && now - lastTextAt >= 170
      && this.activeDamageTexts.size < 6;
    if (enemy && showText) {
      this.lastDamageTextAt.set(enemy, now);
    }
    let text = null;
    if (showText) {
      text = this.scene.add.text(x, y - 30, `-${damage}`, {
        fontFamily: 'Arial',
        fontSize: critical ? '20px' : '15px',
        fontStyle: '700',
        color: critical ? '#ffd35c' : profile.text,
        stroke: '#2b1114',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(10);
      this.activeDamageTexts.add(text);
    }
    if (burst) {
      this.scene.tweens.add({
        targets: burst,
        alpha: 0,
        scaleX: heavy ? 2.05 : 1.65,
        scaleY: heavy ? 1.65 : 1.42,
        duration: heavy ? 180 : 125,
        ease: 'Cubic.Out',
        onComplete: () => {
          this.activeHitVisuals.delete(burst);
          burst.destroy();
        }
      });
    }
    if (text) {
      this.scene.tweens.add({
        targets: text,
        y: y - 48,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          this.activeDamageTexts.delete(text);
          text.destroy();
        }
      });
    }
    if (heavy && ['explosive', 'laser', 'void'].includes(profile.id)) {
      this.shake(95, critical ? 0.0032 : 0.0024, 190);
    }
  }

  showEnemyDeath(enemy, source = 'base-egg') {
    if (!enemy?.sprite?.active || this.activeDeathEchoes.size >= 18) {
      return null;
    }
    const profile = getCombatFeedbackProfile(source);
    this.lastDeathFeedback = { source, profile: profile.id, style: profile.death, at: this.scene.time.now };
    const sprite = enemy.sprite;
    const echo = this.scene.add.image(
      sprite.x,
      sprite.y,
      sprite.texture.key,
      sprite.frame.name
    )
      .setDisplaySize(sprite.displayWidth, sprite.displayHeight)
      .setFlipX(sprite.flipX)
      .setRotation(sprite.rotation)
      .setDepth(8)
      .setAlpha(0.9);
    const eliteScale = enemy.boss ? 1.1 : enemy.elite || enemy.champion ? 1.04 : 1;
    const angle = Phaser.Math.Angle.Between(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y,
      sprite.x,
      sprite.y
    );
    const target = {
      x: echo.x,
      y: echo.y - 8,
      scaleX: echo.scaleX * 0.72,
      scaleY: echo.scaleY * 0.72,
      rotation: echo.rotation,
      duration: 230
    };
    if (profile.death === 'blast') {
      target.x += Math.cos(angle) * 28 * eliteScale;
      target.y += Math.sin(angle) * 16 - 8;
      target.rotation += (enemy.id % 2 ? 0.24 : -0.24);
      target.scaleX = echo.scaleX * 0.58;
      target.scaleY = echo.scaleY * 0.58;
      target.duration = 270;
      echo.setTint(profile.flash);
    } else if (profile.death === 'burn') {
      target.y -= 22;
      target.scaleX = echo.scaleX * 0.78;
      target.scaleY = echo.scaleY * 1.04;
      target.duration = 300;
      echo.setTint(0xff8b39);
    } else if (profile.death === 'shock') {
      target.x += enemy.id % 2 ? 9 : -9;
      target.scaleX = echo.scaleX * 1.08;
      target.scaleY = echo.scaleY * 0.58;
      target.duration = 190;
      echo.setTint(0xbdf8ff);
    } else if (profile.death === 'collapse') {
      target.scaleX = echo.scaleX * 0.08;
      target.scaleY = echo.scaleY * 0.08;
      target.rotation += 0.32;
      target.duration = 260;
      echo.setTint(0x8f57d8);
    } else if (profile.death === 'sear') {
      target.scaleX = echo.scaleX * 0.12;
      target.scaleY = echo.scaleY * 1.08;
      target.duration = 210;
      echo.setTint(0xffcf8a);
    } else {
      target.scaleX = echo.scaleX * 1.12;
      target.scaleY = echo.scaleY * 0.42;
      target.duration = 210;
      echo.setTint(profile.flash);
    }
    this.activeDeathEchoes.add(echo);
    this.scene.tweens.add({
      targets: echo,
      x: target.x,
      y: target.y,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      rotation: target.rotation,
      alpha: 0,
      duration: target.duration,
      ease: profile.death === 'blast' ? 'Quad.Out' : 'Cubic.In',
      onComplete: () => {
        this.activeDeathEchoes.delete(echo);
        echo.destroy();
      }
    });
    return echo;
  }

  recordKill(enemy, source = 'base-egg') {
    const now = this.scene.time.now;
    if (now - this.killChain.lastAt > 520) {
      this.killChain.count = 0;
      this.killChain.announced = 0;
    }
    this.killChain.count += 1;
    this.killChain.lastAt = now;
    this.killChain.source = source;
    const tier = getMultiKillTier(this.killChain.count);
    if (!tier || tier.threshold <= this.killChain.announced) {
      if (tier && this.killChain.announced >= 15 && this.lastMultiKill) {
        this.lastMultiKill.count = this.killChain.count;
        this.scene.hud.updateMultiKillCount(this.killChain.count);
      }
      return;
    }
    this.killChain.announced = tier.threshold;
    const profile = getCombatFeedbackProfile(source);
    this.lastMultiKill = {
      count: this.killChain.count,
      threshold: tier.threshold,
      label: tier.label,
      source,
      profile: profile.id,
      at: now
    };
    this.scene.hud.showMultiKill(this.lastMultiKill, profile.color);
    this.scene.audio.play('enemy-pop', {
      cooldown: 0,
      cooldownKey: `multi-kill-${tier.threshold}`,
      voiceKey: 'multi-kill',
      maxVoices: 2,
      priority: true,
      volume: tier.threshold >= 15 ? 0.28 : 0.21,
      rate: tier.threshold >= 15 ? 0.72 : tier.threshold >= 8 ? 0.84 : 0.96,
      rateJitter: 0
    });
    if (tier.threshold >= 8) {
      this.shake(tier.threshold >= 15 ? 145 : 105, tier.threshold >= 15 ? 0.0042 : 0.0028, 260);
    }
    if (tier.threshold >= 15 && this.scene.effects.enabled('screenFlash')) {
      this.scene.cameras.main.flash(75, 255, 221, 126, false);
    }
    this.scene.telemetry.record('multiKillReached', now, {
      wave: this.scene.waveSystem.currentWave,
      count: this.killChain.count,
      threshold: tier.threshold,
      source,
      enemyType: enemy?.type ?? null
    });
  }

  getState() {
    return {
      activeHitVisuals: this.activeHitVisuals.size,
      activeDamageTexts: this.activeDamageTexts.size,
      activeDeathEchoes: this.activeDeathEchoes.size,
      killChain: { ...this.killChain },
      lastMultiKill: this.lastMultiKill ? { ...this.lastMultiKill } : null,
      lastDeathFeedback: this.lastDeathFeedback ? { ...this.lastDeathFeedback } : null,
      limits: { hits: 12, damageTexts: 6, deathEchoes: 18, areaBurstsPerWindow: 4 }
    };
  }

  showShot(angle, laneOffset = 0) {
    const muzzle = this.scene.player.getMuzzlePosition(44);
    const sideX = -Math.sin(this.scene.player.aimAngle) * laneOffset;
    const sideY = Math.cos(this.scene.player.aimAngle) * laneOffset;
    const flash = this.scene.add.circle(
      muzzle.x + sideX,
      muzzle.y + sideY,
      this.scene.player.fireEggs ? 9 : 7,
      this.scene.player.fireEggs ? 0xff6a28 : 0xfff3b0,
      0.9
    ).setDepth(6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 110,
      onComplete: () => flash.destroy()
    });
  }

  showEnemyTelegraph(enemy, player, config = {}, options = {}) {
    this.activeTelegraphs += 1;
    const duration = options.duration ?? 220;
    const count = options.count ?? 1;
    const spread = options.spread ?? 0;
    const heavy = options.heavy ?? false;
    const radial = options.radial ?? false;
    const dangerColor = heavy ? 0xff3048 : 0xff5268;
    const accentColor = config.color ?? 0xffd35c;
    const angle = Math.atan2(player.sprite.y - enemy.sprite.y, player.sprite.x - enemy.sprite.x);
    const graphics = this.scene.add.graphics().setDepth(12);
    if (radial) {
      this.scene.enemyDangerZones.push({
        x: enemy.sprite.x,
        y: enemy.sprite.y,
        radius: options.radius ?? 150,
        expiresAt: this.scene.time.now + duration,
        source: `telegraph:${enemy.type}`
      });
      graphics.lineStyle(5, dangerColor, 0.68);
      graphics.strokeCircle(enemy.sprite.x, enemy.sprite.y, options.radius ?? 150);
      graphics.fillStyle(dangerColor, 0.08);
      graphics.fillCircle(enemy.sprite.x, enemy.sprite.y, options.radius ?? 150);
    } else {
      if (config.kind === 'dash') {
        this.scene.enemyDangerZones.push({
          kind: 'line',
          x: enemy.sprite.x,
          y: enemy.sprite.y,
          targetX: enemy.sprite.x + Math.cos(angle) * 320,
          targetY: enemy.sprite.y + Math.sin(angle) * 320,
          radius: 52,
          expiresAt: this.scene.time.now + duration + (config.duration ?? 0),
          source: `telegraph:${enemy.type}:dash`
        });
      }
      for (let index = 0; index < count; index += 1) {
        const progress = count === 1 ? 0.5 : index / (count - 1);
        const shotAngle = angle - spread / 2 + spread * progress;
        const length = heavy ? 360 : 250;
        graphics.lineStyle(heavy ? 4 : 2, dangerColor, heavy ? 0.62 : 0.42);
        graphics.lineBetween(
          enemy.sprite.x,
          enemy.sprite.y,
          enemy.sprite.x + Math.cos(shotAngle) * length,
          enemy.sprite.y + Math.sin(shotAngle) * length
        );
      }
    }
    const charge = this.scene.add.circle(
      enemy.sprite.x,
      enemy.sprite.y,
      heavy ? 34 : 22,
      accentColor,
      0.12
    ).setStrokeStyle(heavy ? 5 : 3, dangerColor, 0.95).setDepth(13);
    this.scene.tweens.add({
      targets: [graphics, charge],
      alpha: { from: 0.28, to: 1 },
      duration: Math.max(80, duration - 35),
      onComplete: () => {
        this.activeTelegraphs = Math.max(0, this.activeTelegraphs - 1);
        graphics.destroy();
        charge.destroy();
      }
    });
    this.scene.tweens.add({
      targets: charge,
      scale: { from: heavy ? 1.5 : 1.35, to: 0.42 },
      duration: Math.max(80, duration - 35)
    });
    this.scene.telemetry.record('enemyTelegraphShown', this.scene.time.now, {
      wave: this.scene.waveSystem.currentWave,
      enemyType: enemy.type,
      duration,
      heavy,
      radial
    });
  }

  showPlayerDamage(x, y, amount, projectile = null) {
    const color = projectile?.color ?? 0xff4058;
    const impact = this.scene.add.circle(x, y, projectile?.heavy ? 28 : 19, color, 0.2)
      .setStrokeStyle(projectile?.heavy ? 5 : 3, 0xffe4d6, 0.86)
      .setDepth(18);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: projectile?.heavy ? 2.3 : 1.7,
      duration: projectile?.heavy ? 260 : 170,
      onComplete: () => impact.destroy()
    });
    if (this.scene.effects.enabled('screenFlash')) {
      this.scene.cameras.main.flash(projectile?.heavy ? 110 : 70, 130, 18, 30, false);
    }
    if (this.scene.effects.enabled('vibration')) {
      globalThis.navigator?.vibrate?.(projectile?.heavy ? 45 : 24);
    }
    this.shake(projectile?.heavy ? 110 : 80, projectile?.heavy ? 0.005 : 0.0035);
  }

  shake(duration, intensity, cooldown = 90) {
    if (!this.scene.effects.enabled('screenShake')) {
      return;
    }
    const now = this.scene.time.now;
    if (now - this.lastShakeAt < cooldown) {
      return;
    }
    this.lastShakeAt = now;
    this.scene.cameras.main.shake(duration, intensity);
  }

  destroy() {
    [this.activeHitVisuals, this.activeDamageTexts, this.activeDeathEchoes].forEach((collection) => {
      collection.forEach((visual) => visual.destroy());
      collection.clear();
    });
  }
}
