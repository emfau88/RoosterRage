import Phaser from 'phaser';
import { Pickup } from '../entities/Pickup.js';

const PICKUP_BUDGETS = Object.freeze({ heal: 3, bomb: 2, magnet: 2 });
const MILESTONES = Object.freeze([
  { kills: 18, kind: 'heal' },
  { kills: 48, kind: 'magnet' },
  { kills: 90, kind: 'bomb' },
  { kills: 155, kind: 'heal' },
  { kills: 235, kind: 'magnet' },
  { kills: 330, kind: 'bomb' },
  { kills: 440, kind: 'heal' }
]);

export class PickupSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.items = [];
    this.openingChests = new Set();
    this.spawned = { heal: 0, bomb: 0, magnet: 0, 'elite-chest': 0 };
    this.collected = { heal: 0, bomb: 0, magnet: 0, 'elite-chest': 0 };
    this.milestoneIndex = 0;
    this.magnetUntil = 0;
  }

  update(time) {
    this.items.forEach((pickup) => pickup.update(time));
  }

  onEnemyKilled(enemy) {
    if (enemy.elite && !enemy.boss) {
      this.spawn('elite-chest', enemy.sprite.x, enemy.sprite.y, { guaranteed: true });
    }
    while (MILESTONES[this.milestoneIndex]?.kills <= this.scene.debugStats.kills) {
      const milestone = MILESTONES[this.milestoneIndex];
      this.milestoneIndex += 1;
      this.spawn(milestone.kind);
    }
  }

  canSpawn(kind) {
    return kind === 'elite-chest' || this.spawned[kind] < (PICKUP_BUDGETS[kind] ?? 0);
  }

  spawn(kind, x, y, options = {}) {
    if (!this.canSpawn(kind)) return null;
    let point = Number.isFinite(x) && Number.isFinite(y)
      ? this.scene.arena.clampPoint(x, y, 72)
      : this.scene.arena.findSafePoint(`pickup-${kind}`, 90);
    if (this.scene.arena.overlapsObstacle(point.x, point.y, 30)) {
      point = this.scene.arena.findSafePoint(`pickup-${kind}`, 90);
    }
    const pickup = new Pickup(this.scene, kind, point.x, point.y);
    pickup.guaranteed = options.guaranteed ?? false;
    this.items.push(pickup);
    this.group.add(pickup.sprite);
    this.spawned[kind] += 1;
    this.scene.telemetry.record('pickupSpawned', this.scene.time.now, {
      wave: this.scene.waveSystem?.currentWave ?? 0,
      kind,
      x: point.x,
      y: point.y
    });
    return pickup;
  }

  collect(pickup) {
    if (!pickup?.sprite?.active || pickup.opening) return false;
    const { scene } = this;
    const kind = pickup.kind;
    if (kind === 'heal') {
      const before = scene.player.hp;
      scene.player.heal(Math.max(12, Math.round(scene.player.maxHp * 0.25)));
      scene.telemetry.addHealing(scene.player.hp - before, scene.time.now, scene.waveSystem.currentWave, 'pickup:heal');
    } else if (kind === 'bomb') {
      [...scene.enemies].forEach((enemy) => {
        const damage = enemy.boss ? Math.max(1, Math.round(enemy.maxHp * 0.05)) : enemy.maxHp;
        scene.damageEnemy(enemy, damage, enemy.sprite.x, enemy.sprite.y, { source: 'pickup:bomb' });
      });
      if (scene.effects.enabled('screenFlash')) {
        scene.cameras.main.flash(120, 255, 202, 88, false);
      }
    } else if (kind === 'magnet') {
      this.magnetUntil = Math.max(this.magnetUntil, scene.time.now + 8000);
    }
    this.collected[kind] += 1;
    scene.telemetry.record('pickupCollected', scene.time.now, {
      wave: scene.waveSystem.currentWave,
      kind
    });
    this.items = this.items.filter((item) => item !== pickup);
    this.group.remove(pickup.sprite, false, false);
    if (kind === 'elite-chest') {
      scene.physics.pause();
      this.openingChests.add(pickup);
      pickup.playChestOpening(() => {
        this.openingChests.delete(pickup);
        scene.runState.startChestReward('elite');
        pickup.destroy();
      });
    } else {
      this.playCollectFx(kind, pickup.sprite.x, pickup.sprite.y);
      pickup.destroy();
    }
    return true;
  }

  playCollectFx(kind, x, y) {
    const palette = {
      heal: { color: 0x65ef8b, radius: 20 },
      bomb: { color: 0xffa24d, radius: 27 },
      magnet: { color: 0x5ad7ff, radius: 23 }
    }[kind];
    if (!palette) return;

    if (kind === 'bomb') {
      this.scene.playFx('fx-rocket-explosion', x, y, { scale: 0.48, depth: 10 });
    }
    const ring = this.scene.add.circle(x, y, palette.radius)
      .setStrokeStyle(kind === 'magnet' ? 3 : 2, palette.color, 0.88)
      .setDepth(10)
      .setScale(kind === 'magnet' ? 1.25 : 0.45);
    const core = this.scene.add.circle(x, y, kind === 'bomb' ? 10 : 8, palette.color, 0.32).setDepth(9);
    this.scene.tweens.add({
      targets: ring,
      scale: kind === 'magnet' ? 0.25 : 1.55,
      alpha: 0,
      duration: kind === 'magnet' ? 360 : 300,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });
    this.scene.tweens.add({
      targets: core,
      scale: 2.7,
      alpha: 0,
      duration: 280,
      ease: 'Quad.Out',
      onComplete: () => core.destroy()
    });
  }

  isMagnetActive(time = this.scene.time.now) {
    return time < this.magnetUntil;
  }

  getState() {
    return {
      budgets: { ...PICKUP_BUDGETS },
      spawned: { ...this.spawned },
      collected: { ...this.collected },
      magnetActive: this.isMagnetActive(),
      magnetRemainingMs: Math.max(0, this.magnetUntil - this.scene.time.now),
      openingChests: this.openingChests.size,
      openingChestStates: [...this.openingChests].map((pickup) => ({
        texture: pickup.sprite.texture.key,
        displayWidth: Math.round(pickup.sprite.displayWidth),
        displayHeight: Math.round(pickup.sprite.displayHeight)
      })),
      items: this.items.map((pickup) => ({
        kind: pickup.kind,
        x: pickup.sprite.x,
        y: pickup.sprite.y,
        active: pickup.sprite.active,
        opening: pickup.opening,
        texture: pickup.sprite.texture.key,
        displayWidth: Math.round(pickup.sprite.displayWidth),
        displayHeight: Math.round(pickup.sprite.displayHeight),
        reachable: this.scene.arena.isInsidePlayable(pickup.sprite.x, pickup.sprite.y, 20)
          && !this.scene.arena.overlapsObstacle(pickup.sprite.x, pickup.sprite.y, 22)
      }))
    };
  }

  destroy() {
    this.items.forEach((pickup) => pickup.destroy());
    this.openingChests.forEach((pickup) => pickup.destroy());
    this.items = [];
    this.openingChests.clear();
  }
}
