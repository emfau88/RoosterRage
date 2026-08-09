export class CombatFeedbackSystem {
  constructor(scene) {
    this.scene = scene;
    this.lastDamageTextAt = new WeakMap();
    this.lastShakeAt = -Infinity;
    this.activeTelegraphs = 0;
  }

  showHit(x, y, damage, enemy = null) {
    const burst = this.scene.add.circle(x, y, 15, 0xffffff, 0.72).setDepth(9);
    const now = this.scene.time.now;
    const lastTextAt = enemy ? this.lastDamageTextAt.get(enemy) ?? -Infinity : -Infinity;
    const showText = now - lastTextAt >= 170;
    if (enemy && showText) {
      this.lastDamageTextAt.set(enemy, now);
    }
    let text = null;
    if (showText) {
      text = this.scene.add.text(x, y - 30, `-${damage}`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#2b1114',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(10);
    }
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.65,
      duration: 120,
      onComplete: () => burst.destroy()
    });
    if (text) {
      this.scene.tweens.add({
        targets: text,
        y: y - 48,
        alpha: 0,
        duration: 420,
        onComplete: () => text.destroy()
      });
    }
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
    const dangerColor = heavy ? 0xff3048 : 0xff5268;
    const accentColor = config.color ?? 0xffd35c;
    const angle = Math.atan2(player.sprite.y - enemy.sprite.y, player.sprite.x - enemy.sprite.x);
    const graphics = this.scene.add.graphics().setDepth(12);
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
    this.scene.cameras.main.flash(projectile?.heavy ? 110 : 70, 130, 18, 30, false);
    this.shake(projectile?.heavy ? 110 : 80, projectile?.heavy ? 0.005 : 0.0035);
  }

  shake(duration, intensity, cooldown = 90) {
    const now = this.scene.time.now;
    if (now - this.lastShakeAt < cooldown) {
      return;
    }
    this.lastShakeAt = now;
    this.scene.cameras.main.shake(duration, intensity);
  }
}
