import Phaser from 'phaser';

export class XPOrb {
  constructor(scene) {
    this.scene = scene;
    this.value = 0;
    this.sprite = scene.physics.add.sprite(0, 0, 'xp-orb');
    this.sprite.setCircle(7);
    this.sprite.setActive(false).setVisible(false);
    this.sprite.disableBody(true, true);
    this.sprite.entity = this;
  }

  reset(x, y, value) {
    this.value = value;
    this.sprite.enableBody(true, x, y, true, true);
    this.sprite.setVelocity(0, 0);
    this.updateScale();
    return this;
  }

  addValue(value) {
    this.value += value;
    this.updateScale();
    return this.value;
  }

  updateScale() {
    const scale = Phaser.Math.Clamp(0.82 + Math.log2(Math.max(1, this.value)) * 0.08, 0.82, 1.45);
    this.sprite.setScale(scale);
  }

  update(player) {
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.sprite.x,
      player.sprite.y
    );
    const pickupMagnet = this.scene.pickups?.isMagnetActive() ?? false;
    if (pickupMagnet || distance < player.xpMagnetRadius) {
      this.scene.physics.moveToObject(this.sprite, player.sprite, pickupMagnet ? 560 : 230);
    } else {
      this.sprite.setVelocity(0, 0);
    }
  }

  destroy() {
    this.scene.objectPools.release(this);
  }

  deactivate() {
    this.sprite.setVelocity(0, 0);
    this.sprite.disableBody(true, true);
  }

  dispose() {
    this.sprite.destroy();
  }
}
