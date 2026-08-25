import Phaser from 'phaser';
import { getCombatFeedbackProfile, getMultiKillTier } from '../data/combatFeedbackProfiles.js';
import { getSceneViewport } from './DisplayResolutionSystem.js';

const DEATH_BURST_LIMIT = 24;
const PRIORITY_DEATH_BURST_LIMIT = 28;
const DEATH_BURST_WINDOW_MS = 140;

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
    this.deathBurstWindowAt = -Infinity;
    this.deathsInBurstWindow = 0;
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
    const profile = getCombatFeedbackProfile(source);
    if (!enemy?.sprite?.active) {
      return null;
    }
    const now = this.scene.time.now;
    if (now - this.deathBurstWindowAt > DEATH_BURST_WINDOW_MS) {
      this.deathBurstWindowAt = now;
      this.deathsInBurstWindow = 0;
    }
    this.deathsInBurstWindow += 1;
    const priority = Boolean(enemy.boss || enemy.elite || enemy.champion);
    const detail = priority || this.deathsInBurstWindow <= 6
      ? 'full'
      : this.deathsInBurstWindow <= 16
        ? 'reduced'
        : 'compact';
    const aggregateSample = detail !== 'compact' || this.deathsInBurstWindow % 3 === 0;
    const burstLimit = priority ? PRIORITY_DEATH_BURST_LIMIT : DEATH_BURST_LIMIT;
    const canRender = aggregateSample && this.activeDeathEchoes.size < burstLimit;
    const weight = this.getDeathWeight(enemy);
    const particleCount = canRender ? this.getDeathParticleCount(weight, detail) : 0;
    this.lastDeathFeedback = {
      source,
      profile: profile.id,
      style: profile.death,
      detail,
      intensity: weight.id,
      particleCount,
      rendered: canRender,
      at: now
    };
    if (!canRender) {
      return null;
    }

    const sprite = enemy.sprite;
    const record = { visuals: new Set(), cleanupTimer: null };
    this.activeDeathEchoes.add(record);
    const playerSprite = this.scene.player?.sprite;
    const impactAngle = playerSprite?.active
      ? Phaser.Math.Angle.Between(playerSprite.x, playerSprite.y, sprite.x, sprite.y)
      : ((enemy.id ?? 0) % 12) / 12 * Math.PI * 2;
    const duration = Math.round(weight.duration * (detail === 'full' ? 1 : detail === 'reduced' ? 0.86 : 0.72));
    const bodyDuration = Math.min(
      duration,
      weight.id === 'boss'
        ? 600
        : weight.id === 'elite'
          ? 320
          : weight.id === 'heavy'
            ? 220
            : weight.id === 'fodder'
              ? 145
              : 160
    );

    this.createDeathGroundPulse(record, sprite, profile, weight, duration, detail);
    this.createDeathParticles(
      record,
      sprite.x,
      sprite.y,
      impactAngle,
      profile,
      particleCount,
      weight,
      duration,
      enemy.id ?? 0
    );

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
      .setAlpha(0.96)
      .setTintFill(profile.flash);
    this.addDeathVisual(record, echo);
    const recoil = (profile.death === 'blast' ? 15 : 8) * weight.scale;
    const turn = ((enemy.id ?? 0) % 2 ? 1 : -1) * (profile.death === 'blast' ? 0.16 : 0.07);
    const originalScaleX = echo.scaleX;
    const originalScaleY = echo.scaleY;
    this.scene.tweens.add({
      targets: echo,
      x: echo.x + Math.cos(impactAngle) * recoil,
      y: echo.y + Math.sin(impactAngle) * recoil * 0.45 - 3 * weight.scale,
      scaleX: originalScaleX * 1.04,
      scaleY: originalScaleY * 0.96,
      rotation: echo.rotation + turn,
      duration: Math.min(90, Math.round(bodyDuration * 0.34)),
      ease: 'Quad.Out',
      onComplete: () => {
        if (!echo.active) return;
        echo.setTintFill(profile.color);
        const collapse = profile.death === 'collapse' ? 0.16 : profile.death === 'sear' ? 0.48 : 0.72;
        this.scene.tweens.add({
          targets: echo,
          y: echo.y - (profile.death === 'burn' ? 14 : 3),
          scaleX: originalScaleX * collapse,
          scaleY: originalScaleY * collapse,
          rotation: echo.rotation + (profile.death === 'collapse' ? 0.42 : turn),
          alpha: 0,
          duration: Math.max(90, bodyDuration - Math.min(90, Math.round(bodyDuration * 0.34))),
          ease: profile.death === 'collapse' ? 'Cubic.In' : 'Quad.Out'
        });
      }
    });

    record.cleanupTimer = this.scene.time.delayedCall(duration + 80, () => this.destroyDeathBurst(record));
    return echo;
  }

  getDeathWeight(enemy) {
    if (enemy.boss) return { id: 'boss', scale: 2.1, particles: 2.35, duration: 950 };
    if (enemy.elite || enemy.champion) return { id: 'elite', scale: 1.45, particles: 1.65, duration: 520 };
    if (enemy.type === 'brute' || enemy.type === 'summoner') {
      return { id: 'heavy', scale: 1.22, particles: 1.3, duration: 380 };
    }
    if (enemy.microFodder) return { id: 'fodder', scale: 0.72, particles: 0.62, duration: 210 };
    return { id: 'normal', scale: 1, particles: 1, duration: 290 };
  }

  getDeathParticleCount(weight, detail) {
    const detailCount = detail === 'full' ? 11 : detail === 'reduced' ? 7 : 4;
    const viewport = getSceneViewport(this.scene);
    const mobileScale = Math.min(viewport.width, viewport.height) <= 600 ? 0.8 : 1;
    return Phaser.Math.Clamp(Math.round(detailCount * weight.particles * mobileScale), 3, 30);
  }

  addDeathVisual(record, visual) {
    record.visuals.add(visual);
    return visual;
  }

  createDeathGroundPulse(record, sprite, profile, weight, duration, detail) {
    const y = sprite.y + sprite.displayHeight * 0.28;
    const width = Math.max(26, sprite.displayWidth * 0.62) * weight.scale;
    const shadow = this.addDeathVisual(record, this.scene.add.ellipse(
      sprite.x,
      y,
      width,
      Math.max(8, width * 0.28),
      0x160e18,
      0.3
    ).setDepth(3));
    this.scene.tweens.add({
      targets: shadow,
      alpha: 0,
      scaleX: 1.28,
      scaleY: 0.7,
      duration: Math.min(duration, 330),
      ease: 'Quad.Out'
    });

    const ring = this.addDeathVisual(record, this.scene.add.ellipse(
      sprite.x,
      y,
      Math.max(18, width * 0.44),
      Math.max(6, width * 0.13),
      profile.color,
      detail === 'compact' ? 0.12 : 0.2
    )
      .setStrokeStyle(detail === 'full' ? 2 : 1, profile.flash, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(7));
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: profile.death === 'blast' ? 3.1 : 2.25,
      scaleY: profile.death === 'blast' ? 2.2 : 1.72,
      duration: Math.min(duration, profile.death === 'blast' ? 290 : 230),
      ease: 'Cubic.Out'
    });

    const core = this.addDeathVisual(record, this.scene.add.circle(
      sprite.x,
      sprite.y,
      Math.max(7, Math.min(18, sprite.displayWidth * 0.14)) * weight.scale,
      profile.flash,
      detail === 'compact' ? 0.48 : 0.68
    )
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9)
      .setScale(0.48));
    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scale: profile.death === 'blast' ? 2.9 : 2.35,
      duration: profile.death === 'shock' ? 105 : 155,
      ease: 'Quad.Out'
    });
  }

  createDeathParticles(record, x, y, impactAngle, profile, count, weight, duration, seed) {
    const config = profile.deathFx;
    for (let index = 0; index < count; index += 1) {
      const randomA = this.seededDeathValue(seed, index, 17);
      const randomB = this.seededDeathValue(seed, index, 43);
      const randomC = this.seededDeathValue(seed, index, 79);
      const color = config.colors[index % config.colors.length];
      const size = (3.2 + randomB * 4.2) * weight.scale;
      const shape = config.shape === 'shard' && index % 4 === 0 ? 'ember' : config.shape;
      const particle = this.createDeathParticleShape(shape, x, y, size, color);
      this.addDeathVisual(record, particle);
      const life = Math.round(duration * (0.68 + randomC * 0.34));
      const progress = { value: 0 };
      const spreadAngle = impactAngle + (randomA - 0.5) * config.spread;
      const speed = config.speed * weight.scale * (0.62 + randomB * 0.68);
      const velocityX = Math.cos(spreadAngle) * speed;
      const velocityY = Math.sin(spreadAngle) * speed - (18 + randomC * 42) * weight.scale;
      const startRotation = spreadAngle + randomC;
      const rotationSpeed = (randomA - 0.5) * 9;
      const startRadius = (9 + randomB * 18) * weight.scale;
      const orbitAngle = randomA * Math.PI * 2;
      let originX = x + Math.cos(orbitAngle) * (3 + randomC * 5) * weight.scale;
      let originY = y + Math.sin(orbitAngle) * (2 + randomC * 3) * weight.scale;
      particle.setRotation(startRotation);
      if (profile.death === 'collapse') {
        originX = x + Math.cos(orbitAngle) * startRadius;
        originY = y + Math.sin(orbitAngle) * startRadius * 0.58;
      }
      particle.setPosition(originX, originY);
      this.scene.tweens.add({
        targets: progress,
        value: 1,
        duration: life,
        ease: 'Linear',
        onUpdate: () => {
          if (!particle.active) return;
          const t = progress.value;
          if (profile.death === 'collapse') {
            const radius = startRadius * (1 - t);
            const angle = orbitAngle + t * 2.8;
            particle.setPosition(
              x + Math.cos(angle) * radius,
              y + Math.sin(angle) * radius * 0.58
            );
          } else {
            const seconds = t * life / 1000;
            particle.setPosition(
              originX + velocityX * seconds,
              originY + velocityY * seconds + 0.5 * config.gravity * seconds * seconds
            );
          }
          particle.setRotation(startRotation + rotationSpeed * t);
          particle.setAlpha(Math.min(1, (1 - t) * 1.65));
          particle.setScale(1 - t * 0.38);
        }
      });
    }
  }

  createDeathParticleShape(shape, x, y, size, color) {
    if (shape === 'feather') {
      return this.scene.add.ellipse(x, y, size * 2.05, size * 0.72, color, 0.94)
        .setStrokeStyle(1, 0x4b2b1d, 0.42)
        .setDepth(10);
    }
    if (shape === 'spark') {
      return this.scene.add.rectangle(x, y, size * 0.5, size * 2.8, color, 0.96)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(10);
    }
    if (shape === 'ember') {
      return this.scene.add.circle(x, y, size * 0.62, color, 0.94)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(10);
    }
    return this.scene.add.triangle(
      x,
      y,
      -size,
      size * 0.72,
      0,
      -size,
      size,
      size * 0.72,
      color,
      0.94
    ).setDepth(10);
  }

  seededDeathValue(seed, index, salt) {
    const value = Math.sin((seed + 1) * 91.731 + (index + 1) * 47.117 + salt * 13.37) * 43758.5453;
    return value - Math.floor(value);
  }

  destroyDeathBurst(record) {
    if (!this.activeDeathEchoes.has(record)) return;
    record.cleanupTimer?.remove(false);
    record.visuals.forEach((visual) => {
      this.scene.tweens.killTweensOf(visual);
      visual.destroy();
    });
    record.visuals.clear();
    this.activeDeathEchoes.delete(record);
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
      deathBurstWindow: this.deathsInBurstWindow,
      limits: { hits: 12, damageTexts: 6, deathEchoes: DEATH_BURST_LIMIT, priorityDeathEchoes: PRIORITY_DEATH_BURST_LIMIT, areaBurstsPerWindow: 4 }
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
    [this.activeHitVisuals, this.activeDamageTexts].forEach((collection) => {
      collection.forEach((visual) => visual.destroy());
      collection.clear();
    });
    [...this.activeDeathEchoes].forEach((record) => this.destroyDeathBurst(record));
  }
}
