import Phaser from 'phaser';
import { playEvolutionImpact } from '../systems/EvolutionVisuals.js';

const NORMAL_ORBIT_PROFILES = {
  1: {
    radii: [80],
    scale: 1.25,
    color: 0xfff3d1,
    tint: 0xffffff,
    glowRadius: 15,
    glowAlpha: 0.1,
    auraRadius: 17,
    auraAlpha: 0.16
  },
  2: {
    radii: [90],
    scale: 1.34,
    color: 0xffe4a0,
    tint: 0xffffed,
    glowRadius: 17,
    glowAlpha: 0.14,
    auraRadius: 19,
    auraAlpha: 0.22
  },
  3: {
    radii: [100],
    scale: 1.43,
    color: 0xffd35c,
    tint: 0xffefbd,
    glowRadius: 19,
    glowAlpha: 0.18,
    auraRadius: 22,
    auraAlpha: 0.3
  },
  4: {
    radii: [104, 130],
    scale: 1.54,
    color: 0xffc247,
    tint: 0xffd978,
    glowRadius: 22,
    glowAlpha: 0.23,
    auraRadius: 25,
    auraAlpha: 0.38
  }
};

const EVOLVED_ORBIT_PROFILE = {
  radii: [116, 146],
  scale: 1.08,
  color: 0x9ff7ff,
  tint: 0xffffff,
  glowRadius: 25,
  glowAlpha: 0.28,
  auraRadius: 29,
  auraAlpha: 0.48,
  breathAmount: 16,
  expandMs: 1200,
  outerHoldMs: 2000,
  contractMs: 1200,
  innerHoldMs: 3600
};

export function getOrbitVisualProfile(rank, evolved = false) {
  return evolved
    ? EVOLVED_ORBIT_PROFILE
    : NORMAL_ORBIT_PROFILES[Phaser.Math.Clamp(rank, 1, 4)];
}

function easeInOut(progress) {
  return 0.5 - Math.cos(Math.PI * Phaser.Math.Clamp(progress, 0, 1)) * 0.5;
}

export class OrbitEgg {
  constructor(scene, index, count, rank, evolved = false) {
    this.scene = scene;
    this.index = index;
    this.count = count;
    this.rank = rank;
    this.evolved = evolved;
    this.profile = getOrbitVisualProfile(rank, evolved);
    this.ringIndex = count >= 4 ? index % 2 : 0;
    this.angle = (Math.PI * 2 * index) / count;
    this.baseRadius = this.profile.radii[this.ringIndex] ?? this.profile.radii[0];
    this.radius = this.baseRadius;
    this.breathStartedAt = scene.time.now;
    const baseSpeed = (evolved ? 0.0038 : 0.0028) + rank * 0.00045;
    this.speed = baseSpeed * (this.ringIndex === 1 ? 0.88 : 1);
    this.damage = evolved ? 14 + rank * 3 : 14 + rank * 5;
    this.hitCooldownMs = evolved ? 450 : 420;
    this.lastHits = new Map();
    this.nextBossPulseAt = scene.time.now + 650 + index * 180;

    this.sprite = scene.physics.add.sprite(
      scene.player.sprite.x,
      scene.player.sprite.y,
      evolved ? 'evo-shell-halo-projectile' : 'egg'
    );
    this.sprite.setScale(this.profile.scale);
    this.sprite.setTint(this.profile.tint);
    this.sprite.setCircle(10);
    this.sprite.setDepth(7);

    this.glow = scene.add.circle(
      scene.player.sprite.x,
      scene.player.sprite.y,
      this.profile.glowRadius,
      this.profile.color,
      this.profile.glowAlpha
    ).setDepth(5);
    this.aura = scene.add.circle(
      scene.player.sprite.x,
      scene.player.sprite.y,
      this.profile.auraRadius,
      this.profile.color,
      0
    ).setStrokeStyle(evolved ? 3 : Math.max(1.5, rank * 0.55), this.profile.color, this.profile.auraAlpha)
      .setDepth(6);

  }

  update(delta) {
    if (!this.sprite.active) {
      return;
    }
    const now = this.scene.time.now;
    this.angle += delta * this.speed;
    this.radius = this.baseRadius + this.getBreathOffset(now);
    const x = this.scene.player.sprite.x + Math.cos(this.angle) * this.radius;
    const y = this.scene.player.sprite.y + Math.sin(this.angle) * this.radius;
    const pulse = Math.sin(now * (this.evolved ? 0.008 : 0.0065) + this.index * 0.92);
    const spritePulse = this.evolved ? 0.04 : 0.018 + this.rank * 0.004;

    this.sprite.setPosition(x, y);
    this.sprite.setScale(this.profile.scale * (1 + pulse * spritePulse));
    this.sprite.rotation = this.angle;
    this.glow.setPosition(x, y)
      .setScale(1 + pulse * (this.evolved ? 0.16 : 0.1))
      .setAlpha(this.profile.glowAlpha * (1 + pulse * 0.2));
    this.aura.setPosition(x, y)
      .setScale(1.04 + pulse * (this.evolved ? 0.18 : 0.12))
      .setAlpha(this.profile.auraAlpha * (0.84 + pulse * 0.16));
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const lastHitAt = this.lastHits.get(enemy.id) ?? -Infinity;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
      if (distance <= 32 && now - lastHitAt >= this.hitCooldownMs) {
        this.lastHits.set(enemy.id, now);
        const source = this.evolved ? 'evo-shell-halo' : 'orbit-eggs';
        this.scene.damageEnemy(enemy, this.damage, enemy.sprite.x, enemy.sprite.y, { source });
        if (this.evolved) {
          playEvolutionImpact(this.scene, source, enemy.sprite.x, enemy.sprite.y);
          const chained = this.scene.enemies.find((candidate) => (
            candidate !== enemy
            && candidate.sprite.active
            && Phaser.Math.Distance.Between(
              enemy.sprite.x,
              enemy.sprite.y,
              candidate.sprite.x,
              candidate.sprite.y
            ) <= 130
          ));
          if (chained) {
            this.scene.damageEnemy(chained, Math.round(this.damage * 0.6), chained.sprite.x, chained.sprite.y, { source });
          }
        }
      }
    });
    this.pulseBossAtRange(x, y);
  }

  getBreathOffset(now) {
    if (!this.evolved) return 0;
    const {
      breathAmount,
      expandMs,
      outerHoldMs,
      contractMs,
      innerHoldMs
    } = this.profile;
    const cycleMs = expandMs + outerHoldMs + contractMs + innerHoldMs;
    const elapsed = (now - this.breathStartedAt) % cycleMs;
    if (elapsed < expandMs) {
      return breathAmount * easeInOut(elapsed / expandMs);
    }
    if (elapsed < expandMs + outerHoldMs) {
      return breathAmount;
    }
    if (elapsed < expandMs + outerHoldMs + contractMs) {
      const progress = (elapsed - expandMs - outerHoldMs) / contractMs;
      return breathAmount * (1 - easeInOut(progress));
    }
    return 0;
  }

  pulseBossAtRange(x, y) {
    const now = this.scene.time.now;
    if (now < this.nextBossPulseAt) {
      return;
    }
    const boss = this.scene.enemies.find((enemy) => enemy.boss && enemy.sprite.active);
    if (!boss || Phaser.Math.Distance.Between(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y,
      boss.sprite.x,
      boss.sprite.y
    ) > 460) {
      return;
    }
    this.nextBossPulseAt = now + (this.evolved ? 1350 : 1650);
    const source = this.evolved ? 'evo-shell-halo:boss-pulse' : 'orbit-eggs:boss-pulse';
    const damage = Math.max(1, Math.round(this.damage * (this.evolved ? 0.6 : 0.5)));
    this.scene.damageEnemy(boss, damage, boss.sprite.x, boss.sprite.y, { source });
    const bolt = this.scene.add.graphics().setDepth(8);
    bolt.lineStyle(this.evolved ? 3 : 2, this.evolved ? 0x9ff7ff : 0xffd35c, 0.85);
    bolt.lineBetween(x, y, boss.sprite.x, boss.sprite.y);
    this.scene.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 130,
      onComplete: () => bolt.destroy()
    });
  }

  destroy() {
    this.aura.destroy();
    this.glow.destroy();
    if (this.sprite.active) {
      this.sprite.destroy();
    }
  }
}
