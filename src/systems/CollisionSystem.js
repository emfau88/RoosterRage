export class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
  }

  setup() {
    const { scene } = this;
    scene.enemyGroup = scene.physics.add.group();
    scene.projectileGroup = scene.physics.add.group();
    scene.enemyProjectileGroup = scene.physics.add.group();
    scene.xpGroup = scene.physics.add.group();

    scene.physics.add.overlap(scene.projectileGroup, scene.enemyGroup, (projectileSprite, enemySprite) => {
      const projectile = projectileSprite.entity;
      const enemy = enemySprite.entity;
      if (projectile && enemy) {
        scene.hitEnemy(projectile, enemy);
      }
    });

    scene.physics.add.overlap(scene.player.sprite, scene.enemyGroup, (_playerSprite, enemySprite) => {
      const enemy = enemySprite.entity;
      if (!enemy || scene.time.now < enemy.contactReadyAt) {
        return;
      }
      enemy.contactReadyAt = scene.time.now + 650;
      const hpBefore = scene.player.hp;
      if (scene.player.damage(enemy.damage, scene.time.now)) {
        const appliedDamage = Math.max(0, hpBefore - scene.player.hp);
        scene.audio.play('player-hit');
        scene.telemetry.addDamageTaken(
          appliedDamage,
          scene.time.now,
          scene.waveSystem.currentWave,
          `contact:${enemy.type}`,
          { lethal: scene.player.hp <= 0 }
        );
        scene.combatFeedback.showPlayerDamage(scene.player.sprite.x, scene.player.sprite.y, appliedDamage);
      }
    });

    scene.physics.add.collider(scene.player.sprite, scene.arena.obstacleGroup);
    scene.physics.add.collider(scene.enemyGroup, scene.arena.obstacleGroup);
    scene.physics.add.overlap(scene.projectileGroup, scene.arena.obstacleGroup, (projectileSprite, obstacleSprite) => {
      const projectile = projectileSprite.entity;
      const obstacle = obstacleSprite.entity;
      if (!projectile || projectile.destroyed) {
        return;
      }
      if (obstacle?.destructible) {
        scene.arena.damageObstacle(obstacle, projectile.damage, projectile.source);
      }
      projectile.destroy();
    });

    scene.physics.add.overlap(scene.player.sprite, scene.pickups.group, (_playerSprite, pickupSprite) => {
      scene.pickups.collect(pickupSprite.entity);
    });

    scene.physics.add.overlap(scene.player.sprite, scene.enemyProjectileGroup, (_playerSprite, projectileSprite) => {
      const projectile = projectileSprite.entity;
      if (!projectile) {
        return;
      }
      const hpBefore = scene.player.hp;
      if (scene.player.damage(projectile.damage, scene.time.now)) {
        const appliedDamage = Math.max(0, hpBefore - scene.player.hp);
        scene.audio.play('player-hit');
        scene.telemetry.addDamageTaken(
          appliedDamage,
          scene.time.now,
          scene.waveSystem.currentWave,
          projectile.source,
          { lethal: scene.player.hp <= 0 }
        );
        scene.combatFeedback.showPlayerDamage(
          projectile.sprite.x,
          projectile.sprite.y,
          appliedDamage,
          projectile
        );
      }
      projectile.destroy();
    });

    scene.physics.add.overlap(scene.player.sprite, scene.xpGroup, (_playerSprite, orbSprite) => {
      const orb = orbSprite.entity;
      if (!orb) {
        return;
      }
      const levelsGained = scene.player.addXp(orb.value);
      scene.audio.play('xp-pickup');
      scene.debugStats.xpCollected += orb.value;
      scene.telemetry.addXp(orb.value, scene.time.now, scene.waveSystem.currentWave);
      scene.removeOrb(orb);
      if (levelsGained > 0) {
        scene.audio.play('level-up');
        scene.debugStats.levelUps += levelsGained;
        for (let offset = levelsGained - 1; offset >= 0; offset -= 1) {
          scene.telemetry.addLevelUp(
            scene.time.now,
            scene.waveSystem.currentWave,
            scene.player.level - offset
          );
        }
        scene.startLevelUp(levelsGained);
      }
    });
  }
}
