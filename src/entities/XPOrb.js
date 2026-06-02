import Phaser from 'phaser';

export class XPOrb {
  constructor(scene, x, y, value) {
    this.scene = scene;
    this.value = value;
    this.sprite = scene.physics.add.sprite(x, y, 'xp-orb');
    this.sprite.setCircle(7);
    this.sprite.entity = this;
  }

  update(player) {
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.sprite.x,
      player.sprite.y
    );
    if (distance < player.xpMagnetRadius) {
      this.scene.physics.moveToObject(this.sprite, player.sprite, 230);
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  destroy() {
    this.sprite.destroy();
  }
}
