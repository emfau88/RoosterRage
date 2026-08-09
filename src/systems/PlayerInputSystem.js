import Phaser from 'phaser';

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
    const vector = new Phaser.Math.Vector2(pointer.x, pointer.y).subtract(this.touchOrigin);
    if (vector.length() > 46) {
      vector.setLength(46);
    }
    this.pointerVector.set(vector.x / 46, vector.y / 46);
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

    if (nearestEnemy && nearestDistance < 220) {
      movement.add(playerPosition.clone()
        .subtract(new Phaser.Math.Vector2(nearestEnemy.sprite.x, nearestEnemy.sprite.y))
        .normalize()
        .scale(1.35));
    }

    const nearestOrb = this.findNearestXpOrb();
    if (nearestOrb && nearestDistance > 145) {
      movement.add(new Phaser.Math.Vector2(nearestOrb.sprite.x, nearestOrb.sprite.y)
        .subtract(playerPosition)
        .normalize()
        .scale(0.9));
    } else if (!nearestEnemy) {
      movement.add(this.scene.bot.target.clone().subtract(playerPosition).normalize());
      if (Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        this.scene.bot.target.x,
        this.scene.bot.target.y
      ) < 80) {
        this.scene.bot.target.set(
          Phaser.Math.Between(260, this.arenaWidth - 260),
          Phaser.Math.Between(200, this.arenaHeight - 200)
        );
      }
    }

    const edgePadding = 150;
    if (playerPosition.x < edgePadding) movement.x += 0.9;
    if (playerPosition.x > this.arenaWidth - edgePadding) movement.x -= 0.9;
    if (playerPosition.y < edgePadding) movement.y += 0.9;
    if (playerPosition.y > this.arenaHeight - edgePadding) movement.y -= 0.9;
    if (movement.lengthSq() > 1) {
      movement.normalize();
    }
    return movement;
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

  destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
  }
}
