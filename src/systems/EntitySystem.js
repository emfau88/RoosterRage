import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { EnemyAuraVisual, getEnemyAuraGround } from './EnemyAuraVisual.js';
import { XPOrb } from '../entities/XPOrb.js';
import { DEFAULT_TARGET_ACQUISITION_MARGIN } from './CombatSystem.js';
import { getSceneViewport } from './DisplayResolutionSystem.js';

const XP_ORB_SOFT_CAP = Object.freeze({ desktop: 72, mobile: 48 });

export class EntitySystem {
  constructor(scene, arenaWidth, arenaHeight) {
    this.scene = scene;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.microXpBank = 0;
  }

  spawnEnemy(waveConfig) {
    const point = this.findSafeCameraSpawn(waveConfig.spawnMinDistance ?? 260, {
      targetBuffer: waveConfig.spawnTargetBuffer
    });
    return this.spawnEnemyAt(waveConfig, point.x, point.y);
  }

  findSafeEdgeSpawn(minDistance) {
    const bounds = this.scene.arena?.combatBounds ?? {
      x: 0,
      y: 0,
      width: this.arenaWidth,
      height: this.arenaHeight
    };
    const margin = 66;
    const player = this.scene.player?.sprite;
    let farthest = null;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const edge = this.scene.rng.int(0, 3, 'enemy-spawn');
      let x = this.scene.rng.int(bounds.x + margin, bounds.x + bounds.width - margin, 'enemy-spawn');
      let y = this.scene.rng.int(bounds.y + margin, bounds.y + bounds.height - margin, 'enemy-spawn');
      if (edge === 0) y = bounds.y + margin;
      if (edge === 1) x = bounds.x + bounds.width - margin;
      if (edge === 2) y = bounds.y + bounds.height - margin;
      if (edge === 3) x = bounds.x + margin;

      if (this.scene.arena?.overlapsObstacle(x, y, 38)) {
        continue;
      }

      const distance = player
        ? Phaser.Math.Distance.Between(player.x, player.y, x, y)
        : Infinity;
      const candidate = { x, y, distance };
      if (!farthest || distance > farthest.distance) {
        farthest = candidate;
      }
      if (distance >= minDistance) {
        return candidate;
      }
    }

    const fallback = this.scene.arena?.findSafePoint('enemy-spawn', margin)
      ?? { x: margin, y: margin };
    return farthest ?? { ...fallback, distance: Infinity };
  }

  findSafeCameraSpawn(minDistance, {
    sideOffset = 0,
    formationIndex = null,
    formationCount = 1,
    spacing = 58,
    targetBuffer = 48,
    preferPlayerVelocity = false,
    approachDistance: requestedApproachDistance = null
  } = {}) {
    const bounds = this.scene.arena?.combatBounds ?? {
      x: 0,
      y: 0,
      width: this.arenaWidth,
      height: this.arenaHeight
    };
    const view = this.scene.cameras.main.worldView;
    const player = this.scene.player?.sprite;
    const padding = 48;
    const targetMargin = this.scene.targetAcquisitionMargin ?? DEFAULT_TARGET_ACQUISITION_MARGIN;
    // Use the short viewport axis first. On portrait this avoids repeatedly
    // launching slow early-wave enemies from the far top/bottom camera edges.
    const defaultSides = view.height > view.width ? [1, 3, 0, 2] : [0, 2, 1, 3];
    const velocity = player?.body?.velocity;
    const leadingSide = preferPlayerVelocity && velocity
      ? Math.abs(velocity.x) >= Math.abs(velocity.y)
        ? (velocity.x >= 0 ? 1 : 3)
        : (velocity.y >= 0 ? 2 : 0)
      : null;
    const sides = leadingSide === null
      ? defaultSides
      : [leadingSide, ...defaultSides.filter((side) => side !== leadingSide)];

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const side = sides[(sideOffset + attempt) % sides.length];
      const horizontal = side === 0 || side === 2;
      const targetMarginDistance = (horizontal ? view.height : view.width) * targetMargin;
      const approachDistance = Number.isFinite(requestedApproachDistance)
        ? Phaser.Math.Clamp(requestedApproachDistance, 64, 260)
        : Phaser.Math.Clamp(
          Math.max(minDistance * 0.15, targetMarginDistance + targetBuffer),
          96,
          260
        );
      const alongStart = horizontal ? view.x + padding : view.y + padding;
      const alongEnd = horizontal
        ? view.x + view.width - padding
        : view.y + view.height - padding;
      const formationOffset = formationIndex === null
        ? null
        : (formationIndex - (formationCount - 1) / 2) * spacing;
      const along = formationOffset === null
        ? this.scene.rng.int(alongStart, alongEnd, 'camera-spawn')
        : Phaser.Math.Clamp((alongStart + alongEnd) / 2 + formationOffset, alongStart, alongEnd);
      const point = horizontal
        ? { x: along, y: side === 0 ? view.y - approachDistance : view.y + view.height + approachDistance }
        : { x: side === 1 ? view.x + view.width + approachDistance : view.x - approachDistance, y: along };
      const insideView = point.x >= view.x - padding
        && point.x <= view.x + view.width + padding
        && point.y >= view.y - padding
        && point.y <= view.y + view.height + padding;
      const distance = player ? Phaser.Math.Distance.Between(player.x, player.y, point.x, point.y) : Infinity;
      if (!insideView
        && this.scene.arena?.isInsidePlayable(point.x, point.y, padding)
        && !this.scene.arena?.overlapsObstacle(point.x, point.y, 38)
        && distance >= minDistance) {
        return { ...point, distance, source: 'camera-band' };
      }
    }

    // Narrow streaming arenas can be slimmer than the camera on portrait.
    // Random positions on the short camera edges may then all fall outside the
    // playable lane. Keep the fallback camera-local before considering the
    // (potentially very distant) edge of the streamed world.
    const perpendicularOffsets = [0, -96, 96, -192, 192];
    for (const side of sides) {
      const horizontal = side === 0 || side === 2;
      const targetMarginDistance = (horizontal ? view.height : view.width) * targetMargin;
      const approachDistance = Number.isFinite(requestedApproachDistance)
        ? Phaser.Math.Clamp(requestedApproachDistance, 64, 260)
        : Phaser.Math.Clamp(
          Math.max(minDistance * 0.15, targetMarginDistance + targetBuffer),
          96,
          260
        );
      for (const offset of perpendicularOffsets) {
        const point = horizontal
          ? {
            x: (player?.x ?? view.centerX) + offset,
            y: side === 0 ? view.y - approachDistance : view.y + view.height + approachDistance
          }
          : {
            x: side === 1 ? view.x + view.width + approachDistance : view.x - approachDistance,
            y: (player?.y ?? view.centerY) + offset
          };
        const insideView = point.x >= view.x - padding
          && point.x <= view.x + view.width + padding
          && point.y >= view.y - padding
          && point.y <= view.y + view.height + padding;
        const distance = player
          ? Phaser.Math.Distance.Between(player.x, player.y, point.x, point.y)
          : Infinity;
        if (!insideView
          && this.scene.arena?.isInsidePlayable(point.x, point.y, padding)
          && !this.scene.arena?.overlapsObstacle(point.x, point.y, 38)
          && distance >= minDistance) {
          return { ...point, distance, source: 'camera-band-fallback' };
        }
      }
    }
    return this.findSafeEdgeSpawn(minDistance);
  }

  spawnEnemyAt(waveConfig, x, y) {
    const runtimeConfig = {
      ...waveConfig,
      xp: this.scene.waveSystem.getXpForSpawn(waveConfig)
    };
    const enemy = this.scene.objectPools.acquire(
      'enemy',
      () => new Enemy(this.scene),
      (item) => item.reset(x, y, runtimeConfig)
    );
    if (!enemy) {
      return null;
    }
    this.scene.enemies.push(enemy);
    this.scene.enemyGroup.add(enemy.sprite);
    this.scene.telemetry.addEnemySpawn(
      enemy,
      this.scene.time.now,
      this.scene.waveSystem.currentWave,
      this.scene.waveSystem.director.getState().segment
    );
    if (enemy.elite || enemy.champion) {
      const subtitle = enemy.boss
        ? 'Three phases. Read the fan volleys and the heavy fireball.'
        : enemy.champion
          ? `Champion - ${enemy.ability?.label ?? 'Special Attack'} - Golden Chest`
        : `${enemy.aura?.label ?? 'Elite Aura'} · ${enemy.ability?.label ?? 'Special Attack'}`;
      this.scene.hud?.showEncounterBanner(
        enemy.displayName,
        subtitle,
        enemy.boss ? 'boss' : 'elite'
      );
    }
    if (enemy.boss && enemy.invulnerableUntil > this.scene.time.now) {
      const finalScale = enemy.sprite.scaleX;
      enemy.sprite.setScale(finalScale * 0.55).setAlpha(0.35);
      const ground = getEnemyAuraGround(enemy);
      const shield = new EnemyAuraVisual(this.scene, ground.x, ground.y, 'shield', 82, { follow: enemy });
      this.scene.tweens.add({
        targets: enemy.sprite,
        alpha: 1,
        scaleX: finalScale,
        scaleY: finalScale,
        duration: Math.max(200, enemy.invulnerableUntil - this.scene.time.now)
      });
      this.scene.tweens.add({
        targets: shield,
        alpha: 0,
        scale: 1.45,
        duration: Math.max(200, enemy.invulnerableUntil - this.scene.time.now),
        onComplete: () => shield.destroy()
      });
      this.scene.telemetry.record('bossEntered', this.scene.time.now, {
        wave: this.scene.waveSystem.currentWave,
        name: enemy.displayName,
        protectionMs: enemy.invulnerableUntil - this.scene.time.now
      });
    }
    return enemy;
  }

  killEnemy(enemy, source = 'base-egg') {
    this.scene.enemies = this.scene.enemies.filter((item) => item !== enemy);
    this.scene.combatFeedback.showEnemyDeath(enemy, source);
    if (enemy.type === 'boss') {
      this.scene.clearEnemyProjectiles();
    }
    if (enemy.explodeOnDeath) {
      this.scene.explodeEnemy(enemy);
    } else if (enemy.type === 'boss') {
      this.scene.audio.play('boss-roar', { rate: 0.82, volume: 0.32, cooldown: 0 });
      this.scene.audio.play('boss-phase', { rate: 0.72, volume: 0.2, cooldown: 0 });
    } else {
      this.scene.audio.play('enemy-pop');
    }
    const xpDrop = enemy.microFodder
      ? this.releaseBundledMicroXp(enemy.xpValue)
      : enemy.xpValue;
    this.spawnXp(enemy.sprite.x, enemy.sprite.y, xpDrop);
    this.scene.debugStats.kills += 1;
    this.scene.combatFeedback.recordKill(enemy, source);
    this.scene.telemetry.addKill(
      this.scene.time.now,
      this.scene.waveSystem.currentWave,
      enemy.type,
      enemy.id,
      source
    );
    this.scene.pickups.onEnemyKilled(enemy);
    enemy.destroy();
  }

  spawnXp(x, y, value) {
    if (value <= 0) {
      return null;
    }
    this.scene.telemetry.addXpSpawned(value, this.scene.time.now, this.scene.waveSystem.currentWave);
    const nearby = this.scene.xpOrbs.find((orb) => (
      orb.sprite.active
      && Phaser.Math.Distance.Between(x, y, orb.sprite.x, orb.sprite.y) <= 64
    ));
    if (nearby) {
      nearby.addValue(value);
      return nearby;
    }
    const activeOrbs = this.scene.xpOrbs.filter((orb) => orb.sprite.active);
    if (activeOrbs.length >= this.getXpOrbSoftCap()) {
      const nearest = activeOrbs.reduce((best, orb) => {
        const distance = Phaser.Math.Distance.Squared(x, y, orb.sprite.x, orb.sprite.y);
        return !best || distance < best.distance ? { orb, distance } : best;
      }, null)?.orb;
      nearest?.addValue(value);
      return nearest ?? null;
    }
    const orb = this.scene.objectPools.acquire(
      'xpOrb',
      () => new XPOrb(this.scene),
      (item) => item.reset(x, y, value)
    );
    if (!orb) {
      return null;
    }
    this.scene.xpOrbs.push(orb);
    this.scene.xpGroup.add(orb.sprite);
    return orb;
  }

  releaseBundledMicroXp(value) {
    this.microXpBank += Math.max(0, value ?? 0);
    const released = Math.floor(this.microXpBank);
    this.microXpBank -= released;
    return released;
  }

  flushBundledMicroXp(x, y) {
    const value = this.microXpBank;
    this.microXpBank = 0;
    return value > 0 ? this.spawnXp(x, y, value) : null;
  }

  getXpOrbSoftCap() {
    const { width, height } = getSceneViewport(this.scene);
    const touchDevice = Boolean(this.scene.sys?.game?.device?.input?.touch);
    return width <= 600 || touchDevice || (width < height && Math.min(width, height) <= 600)
      ? XP_ORB_SOFT_CAP.mobile
      : XP_ORB_SOFT_CAP.desktop;
  }

  getXpState() {
    return {
      active: this.scene.xpOrbs.filter((orb) => orb.sprite.active).length,
      value: this.scene.xpOrbs.reduce((sum, orb) => sum + (orb.sprite.active ? orb.value : 0), 0),
      softCap: this.getXpOrbSoftCap(),
      microBank: this.microXpBank
    };
  }

  removeOrb(orb) {
    this.scene.xpOrbs = this.scene.xpOrbs.filter((item) => item !== orb);
    this.scene.telemetry.addXpOrbRemoved(orb.value, this.scene.time.now, this.scene.waveSystem.currentWave);
    orb.destroy();
  }
}
