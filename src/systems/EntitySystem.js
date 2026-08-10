import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy.js';
import { XPOrb } from '../entities/XPOrb.js';
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
    const point = this.findSafeEdgeSpawn(waveConfig.spawnMinDistance ?? 260);
    return this.spawnEnemyAt(waveConfig, point.x, point.y);
  }

  findSafeEdgeSpawn(minDistance) {
    const bounds = this.scene.arena?.bounds ?? {
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
      this.scene.waveSystem.currentWave
    );
    if (enemy.elite) {
      const subtitle = enemy.boss
        ? 'Drei Phasen. Lies die Faechersalven und den schweren Feuerball.'
        : `${enemy.aura?.label ?? 'Elite-Aura'} · ${enemy.ability?.label ?? 'Spezialangriff'}`;
      this.scene.hud?.showEncounterBanner(
        enemy.displayName,
        subtitle,
        enemy.boss ? 'boss' : 'elite'
      );
    }
    if (enemy.boss && enemy.invulnerableUntil > this.scene.time.now) {
      const finalScale = enemy.sprite.scaleX;
      enemy.sprite.setScale(finalScale * 0.55).setAlpha(0.35);
      const shield = this.scene.add.circle(x, y, 82, 0x65d7ff, 0.08)
        .setStrokeStyle(6, 0xcaf5ff, 0.82)
        .setDepth(9);
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
    this.scene.telemetry.addKill(
      this.scene.time.now,
      this.scene.waveSystem.currentWave,
      enemy.type,
      enemy.id,
      source
    );
    if (enemy.boss) {
      this.scene.runState.startChestReward('boss');
    }
    this.scene.pickups.onEnemyKilled(enemy);
    enemy.destroy();
  }

  spawnXp(x, y, value) {
    if (value <= 0) {
      return null;
    }
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
    orb.destroy();
  }
}
