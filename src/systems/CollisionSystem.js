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
      if (enemy && scene.player.damage(enemy.damage, scene.time.now)) {
        scene.audio.play('player-hit');
        scene.telemetry.addDamageTaken(enemy.damage, scene.time.now, scene.waveSystem.currentWave);
        scene.combatFeedback.showPlayerDamage(scene.player.sprite.x, scene.player.sprite.y, enemy.damage);
      }
    });

    scene.physics.add.overlap(scene.player.sprite, scene.enemyProjectileGroup, (_playerSprite, projectileSprite) => {
      const projectile = projectileSprite.entity;
      if (!projectile) {
        return;
      }
      if (scene.player.damage(projectile.damage, scene.time.now)) {
        scene.audio.play('player-hit');
        scene.telemetry.addDamageTaken(projectile.damage, scene.time.now, scene.waveSystem.currentWave);
        scene.combatFeedback.showPlayerDamage(
          projectile.sprite.x,
          projectile.sprite.y,
          projectile.damage,
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
      const leveled = scene.player.addXp(orb.value);
      scene.audio.play('xp-pickup');
      scene.debugStats.xpCollected += orb.value;
      scene.telemetry.addXp(orb.value, scene.time.now, scene.waveSystem.currentWave);
      scene.removeOrb(orb);
      if (leveled) {
        scene.audio.play('level-up');
        scene.debugStats.levelUps += 1;
        scene.telemetry.addLevelUp(scene.time.now, scene.waveSystem.currentWave, scene.player.level);
        scene.startLevelUp();
      }
    });
  }
}
