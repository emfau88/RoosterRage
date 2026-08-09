export class CombatFeedbackSystem {
  constructor(scene) {
    this.scene = scene;
  }

  showHit(x, y, damage) {
    const burst = this.scene.add.circle(x, y, 18, 0xffffff, 0.8).setDepth(9);
    const text = this.scene.add.text(x, y - 30, `-${damage}`, {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#2b1114',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.8,
      duration: 120,
      onComplete: () => burst.destroy()
    });
    this.scene.tweens.add({
      targets: text,
      y: y - 48,
      alpha: 0,
      duration: 420,
      onComplete: () => text.destroy()
    });
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
}
