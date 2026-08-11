import Phaser from 'phaser';
import { getPlayerProfile } from '../data/playerProfiles.js';
import { getSceneRenderScale } from './DisplayResolutionSystem.js';

export class PlayerInputSystem {
  constructor(scene, arenaWidth, arenaHeight) {
    this.scene = scene;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.pointerVector = new Phaser.Math.Vector2(0, 0);
    this.activePointerId = null;
    this.touchOrigin = null;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
  }

  setupTouchInput() {
    this.scene.input.on('pointerdown', this.onPointerDown);
    this.scene.input.on('pointermove', this.onPointerMove);
    this.scene.input.on('pointerup', this.onPointerUp);
  }

  handlePointerDown(pointer) {
    if (this.scene.isChoosingUpgrade || pointer.x > this.scene.scale.width * 0.58) {
      return;
    }
    this.activePointerId = pointer.id;
    this.touchOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.updatePointerVector(pointer);
  }

  handlePointerMove(pointer) {
    if (pointer.id === this.activePointerId) {
      this.updatePointerVector(pointer);
    }
  }

  handlePointerUp(pointer) {
    if (pointer.id !== this.activePointerId) {
      return;
    }
    this.activePointerId = null;
    this.touchOrigin = null;
    this.pointerVector.set(0, 0);
    this.scene.hud.setJoystick(this.pointerVector);
  }

  updatePointerVector(pointer) {
    if (!this.touchOrigin) {
      return;
    }
    const maxDistance = 46 * getSceneRenderScale(this.scene);
    const vector = new Phaser.Math.Vector2(pointer.x, pointer.y).subtract(this.touchOrigin);
    if (vector.length() > maxDistance) {
      vector.setLength(maxDistance);
    }
    this.pointerVector.set(vector.x / maxDistance, vector.y / maxDistance);
    this.scene.hud.setJoystick(this.pointerVector);
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
    return this.scene.bot.enabled ? this.getBotMovementVector() : vector;
  }

  getBotMovementVector() {
    const movement = new Phaser.Math.Vector2(0, 0);
    const playerPosition = new Phaser.Math.Vector2(
      this.scene.player.sprite.x,
      this.scene.player.sprite.y
    );
    const nearestEnemy = this.scene.findNearestEnemy();
    const nearestDistance = nearestEnemy
      ? Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        nearestEnemy.sprite.x,
        nearestEnemy.sprite.y
      )
      : Infinity;

    const profile = getPlayerProfile(this.scene.bot.strategy);
    const arenaBounds = this.scene.arena?.bounds ?? {
      x: 0,
      y: 0,
      width: this.arenaWidth,
      height: this.arenaHeight
    };
    const bossKiting = this.addBossKiting(movement, playerPosition, profile);
    const avoidingDangerZone = this.addDangerZoneAvoidance(movement, playerPosition, profile);
    const avoidingProjectile = this.addProjectileAvoidance(movement, playerPosition, profile);
    if (!bossKiting && nearestEnemy && nearestDistance < profile.dangerRadius) {
      this.addEnemyAvoidance(movement, playerPosition, profile);
    } else if (!bossKiting && nearestEnemy && profile.pressureWeight > 0) {
      movement.add(new Phaser.Math.Vector2(nearestEnemy.sprite.x, nearestEnemy.sprite.y)
        .subtract(playerPosition)
        .normalize()
        .scale(profile.pressureWeight));
    }

    const priorityPickup = this.findPriorityPickup(playerPosition);
    const nearestOrb = this.findNearestXpOrb();
    if (!bossKiting && !avoidingDangerZone && !avoidingProjectile && priorityPickup) {
      movement.add(new Phaser.Math.Vector2(priorityPickup.sprite.x, priorityPickup.sprite.y)
        .subtract(playerPosition)
        .normalize()
        .scale(1.15));
    } else if (!bossKiting && !avoidingDangerZone && !avoidingProjectile && nearestOrb && nearestDistance > 145) {
      movement.add(new Phaser.Math.Vector2(nearestOrb.sprite.x, nearestOrb.sprite.y)
        .subtract(playerPosition)
        .normalize()
        .scale(profile.pickupWeight));
    } else if (!nearestEnemy && !avoidingDangerZone && !avoidingProjectile) {
      movement.add(this.scene.bot.target.clone().subtract(playerPosition).normalize());
      if (Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        this.scene.bot.target.x,
        this.scene.bot.target.y
      ) < 80) {
        this.scene.bot.target.set(
          this.scene.rng.int(arenaBounds.x + 130, arenaBounds.x + arenaBounds.width - 130, 'bot-movement'),
          this.scene.rng.int(arenaBounds.y + 130, arenaBounds.y + arenaBounds.height - 130, 'bot-movement')
        );
      }
    }

    const edgePadding = 150;
    if (playerPosition.x < arenaBounds.x + edgePadding) movement.x += profile.edgeWeight;
    if (playerPosition.x > arenaBounds.x + arenaBounds.width - edgePadding) movement.x -= profile.edgeWeight;
    if (playerPosition.y < arenaBounds.y + edgePadding) movement.y += profile.edgeWeight;
    if (playerPosition.y > arenaBounds.y + arenaBounds.height - edgePadding) movement.y -= profile.edgeWeight;
    if (movement.lengthSq() > 1) {
      movement.normalize();
    }
    return movement;
  }

  addBossKiting(movement, playerPosition, profile) {
    const boss = this.scene.enemies.find((enemy) => enemy.boss && enemy.sprite.active);
    if (!boss) {
      return false;
    }
    const bossPosition = new Phaser.Math.Vector2(boss.sprite.x, boss.sprite.y);
    const away = playerPosition.clone().subtract(bossPosition);
    const distance = Math.max(1, away.length());
    away.normalize();
    const bounds = this.scene.arena?.bounds ?? {
      x: 0,
      y: 0,
      width: this.arenaWidth,
      height: this.arenaHeight
    };
    const center = new Phaser.Math.Vector2(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
    const centerDirection = center.subtract(playerPosition).normalize();
    const edgeDistance = Math.min(
      playerPosition.x - bounds.x,
      bounds.x + bounds.width - playerPosition.x,
      playerPosition.y - bounds.y,
      bounds.y + bounds.height - playerPosition.y
    );
    const tangentA = new Phaser.Math.Vector2(-away.y, away.x);
    const tangentB = tangentA.clone().negate();
    let tangent = (this.scene.bot.orbitDirection ?? 1) > 0 ? tangentA : tangentB;
    if (edgeDistance < 185) {
      tangent = tangentA.dot(centerDirection) >= tangentB.dot(centerDirection) ? tangentA : tangentB;
      this.scene.bot.orbitDirection = tangent === tangentA ? 1 : -1;
      movement.add(tangent.scale(1.75));
      movement.add(centerDirection.scale(0.55));
    } else {
      movement.add(tangent.scale(1.05));
    }
    const awayHeadsInward = away.dot(centerDirection) > -0.1;
    if (distance < 330 && (edgeDistance >= 185 || awayHeadsInward)) {
      movement.add(away.scale(0.8 + 2.2 * (1 - distance / 330)));
    } else if (distance > 440) {
      movement.subtract(away.scale(Math.min(0.38, (distance - 440) / 340)));
    }
    if (profile.id === 'novice') {
      movement.scale(0.72);
    }
    return true;
  }

  addEnemyAvoidance(movement, playerPosition, profile) {
    const radius = profile.dangerRadius;
    this.scene.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) {
        return;
      }
      const enemyPosition = new Phaser.Math.Vector2(enemy.sprite.x, enemy.sprite.y);
      const distance = playerPosition.distance(enemyPosition);
      if (distance <= 0 || distance >= radius) {
        return;
      }
      const urgency = 0.3 + (1 - distance / radius) * 1.35;
      movement.add(playerPosition.clone()
        .subtract(enemyPosition)
        .normalize()
        .scale(profile.evadeWeight * urgency));
    });
  }

  addDangerZoneAvoidance(movement, playerPosition, profile) {
    const now = this.scene.time.now;
    this.scene.enemyDangerZones = (this.scene.enemyDangerZones ?? [])
      .filter((zone) => zone.expiresAt > now);
    let mostUrgent = null;
    this.scene.enemyDangerZones.forEach((zone) => {
      const closest = zone.kind === 'line'
        ? new Phaser.Math.Vector2()
        : null;
      if (closest) {
        const start = new Phaser.Math.Vector2(zone.x, zone.y);
        const end = new Phaser.Math.Vector2(zone.targetX, zone.targetY);
        const segment = end.clone().subtract(start);
        const lengthSq = Math.max(1, segment.lengthSq());
        const progress = Phaser.Math.Clamp(
          playerPosition.clone().subtract(start).dot(segment) / lengthSq,
          0,
          1
        );
        closest.copy(start).add(segment.scale(progress));
      }
      const dangerCenter = closest ?? new Phaser.Math.Vector2(zone.x, zone.y);
      const distance = playerPosition.distance(dangerCenter);
      const clearance = distance - zone.radius;
      if (clearance > 90 || (mostUrgent && clearance >= mostUrgent.clearance)) {
        return;
      }
      mostUrgent = { ...zone, distance, clearance, dangerX: dangerCenter.x, dangerY: dangerCenter.y };
    });
    if (!mostUrgent) {
      return false;
    }
    let escape = playerPosition.clone().subtract(new Phaser.Math.Vector2(
      mostUrgent.x,
      mostUrgent.y
    ));
    if (mostUrgent.kind === 'line') {
      escape = playerPosition.clone().subtract(new Phaser.Math.Vector2(
        mostUrgent.dangerX,
        mostUrgent.dangerY
      ));
    }
    if (escape.lengthSq() < 4) {
      const bounds = this.scene.arena?.bounds ?? {
        x: 0,
        y: 0,
        width: this.arenaWidth,
        height: this.arenaHeight
      };
      const towardCenter = new Phaser.Math.Vector2(
        bounds.x + bounds.width / 2 - playerPosition.x,
        bounds.y + bounds.height / 2 - playerPosition.y
      );
      if (mostUrgent.kind === 'line') {
        const lineX = mostUrgent.targetX - mostUrgent.x;
        const lineY = mostUrgent.targetY - mostUrgent.y;
        const perpendicularA = new Phaser.Math.Vector2(-lineY, lineX).normalize();
        const perpendicularB = perpendicularA.clone().negate();
        escape.copy(perpendicularA.dot(towardCenter) >= perpendicularB.dot(towardCenter)
          ? perpendicularA
          : perpendicularB);
      } else {
        escape.copy(towardCenter);
      }
    }
    const urgency = Phaser.Math.Clamp(1 - mostUrgent.clearance / 90, 0.4, 1.8);
    movement.add(escape.normalize().scale(profile.evadeWeight * (1.35 + urgency)));
    return true;
  }

  addProjectileAvoidance(movement, playerPosition, profile) {
    const radius = profile.projectileDangerRadius ?? 0;
    if (radius <= 0) {
      return false;
    }
    let mostUrgent = null;
    this.scene.enemyProjectiles.forEach((projectile) => {
      if (!projectile.sprite.active) {
        return;
      }
      const threatPosition = new Phaser.Math.Vector2(projectile.sprite.x, projectile.sprite.y);
      const distance = playerPosition.distance(threatPosition);
      const velocity = projectile.sprite.body?.velocity;
      const speedSq = velocity ? velocity.x * velocity.x + velocity.y * velocity.y : 0;
      if (distance <= 0 || distance >= radius || speedSq <= 0) {
        return;
      }
      const toPlayer = playerPosition.clone().subtract(threatPosition);
      const secondsToClosest = Phaser.Math.Clamp(
        (velocity.x * toPlayer.x + velocity.y * toPlayer.y) / speedSq,
        0,
        1.25
      );
      if (secondsToClosest <= 0) {
        return;
      }
      const closestPoint = threatPosition.clone().add(new Phaser.Math.Vector2(
        velocity.x * secondsToClosest,
        velocity.y * secondsToClosest
      ));
      const missDistance = playerPosition.distance(closestPoint);
      if (missDistance > 58) {
        return;
      }
      const urgency = missDistance + secondsToClosest * 72;
      if (!mostUrgent || urgency < mostUrgent.urgency) {
        mostUrgent = { closestPoint, velocity, distance, urgency, secondsToClosest };
      }
    });
    if (!mostUrgent) {
      return false;
    }
    let dodge = playerPosition.clone().subtract(mostUrgent.closestPoint);
    if (dodge.lengthSq() < 4) {
      dodge = new Phaser.Math.Vector2(-mostUrgent.velocity.y, mostUrgent.velocity.x);
      const bounds = this.scene.arena?.bounds ?? { x: 0, y: 0, width: this.arenaWidth, height: this.arenaHeight };
      const arenaCenter = new Phaser.Math.Vector2(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      if (playerPosition.clone().add(dodge).distance(arenaCenter)
        > playerPosition.clone().subtract(dodge).distance(arenaCenter)) {
        dodge.negate();
      }
    }
    const timeUrgency = 1 - mostUrgent.secondsToClosest / 1.25;
    movement.add(dodge.normalize().scale(
      (profile.projectileEvadeWeight ?? 1) * (0.6 + timeUrgency)
    ));
    return true;
  }

  findNearestXpOrb() {
    let nearest = null;
    let nearestDistance = Infinity;
    this.scene.xpOrbs.forEach((orb) => {
      const distance = Phaser.Math.Distance.Squared(
        this.scene.player.sprite.x,
        this.scene.player.sprite.y,
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

  findPriorityPickup(playerPosition) {
    const candidates = (this.scene.pickups?.items ?? []).filter((pickup) => {
      if (!pickup.sprite.active) return false;
      if (['elite-chest', 'golden-chest', 'royal-chest'].includes(pickup.kind)) return true;
      if (pickup.kind === 'heal') return this.scene.player.hp / this.scene.player.maxHp < 0.72;
      if (pickup.kind === 'bomb') return this.scene.enemies.length >= 10;
      if (pickup.kind === 'magnet') return this.scene.xpOrbs.length >= 4;
      return false;
    });
    return candidates.sort((a, b) => playerPosition.distanceSq(a.sprite)
      - playerPosition.distanceSq(b.sprite))[0] ?? null;
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
  }
}
