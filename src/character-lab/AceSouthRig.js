import { sampleAceSouthPose, ACE_WALK_PERIOD_MS } from './aceSouthPose.js';

// Visual-only attachment. Physics, HP, damage, and projectile scheduling remain
// owned by Player / the scene, never by a tween or an animation completion event.
export class AceSouthRig {
  constructor(scene) {
    this.root = scene.add.container(0, 0).setDepth(6);
    this.shadow = scene.add.ellipse(128, 234, 128, 24, 0x100d09, 0.24);
    this.root.add(this.shadow);
    this.layers = new Map();
    for (const key of ['foot-left', 'foot-right', 'wing-left', 'wing-right', 'body', 'wing-throw']) {
      const image = scene.add.image(0, 0, `ace-part-${key}`);
      this.layers.set(key, image);
      this.root.add(image);
    }
    this.phase = 0;
    this.movement = 0;
    this.shotAt = -Infinity;
    this.hurtAt = -Infinity;
  }

  shoot(now) { this.shotAt = now; }
  hurt(now) { this.hurtAt = now; }

  update(player, now, delta) {
    const speed = player.sprite.body.velocity.length();
    const target = Math.min(1.6, speed / 210);
    this.movement += (Math.min(1, target) - this.movement) * (1 - Math.exp(-delta / 70));
    if (speed > 1) this.phase = (this.phase + delta / ACE_WALK_PERIOD_MS * target) % 1;
    const pose = sampleAceSouthPose({ phase: this.phase, movement: this.movement, timeMs: now,
      shotAgeMs: now - this.shotAt, hurtAgeMs: now - this.hurtAt });
    this.root.setPosition(player.sprite.x - 32, player.sprite.y - 32).setScale(0.25);
    this.shadow.setPosition(pose.shadow.x, pose.shadow.y).setDisplaySize(pose.shadow.width, pose.shadow.height);
    for (const image of this.layers.values()) image.setVisible(false);
    for (const part of pose.parts) {
      this.layers.get(part.key).setVisible(true).setPosition(part.x, part.y)
        .setOrigin(part.originX, part.originY).setScale(part.scaleX, part.scaleY)
        .setRotation(part.rotation).setAlpha(part.alpha);
    }
  }

  destroy() { this.root.destroy(); }
}
