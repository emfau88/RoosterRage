import Phaser from 'phaser';

export function playSceneFx(scene, key, x, y, options = {}) {
  const sprite = scene.add.sprite(x, y, 'fx-atlas-v1')
    .setDepth(options.depth ?? 10)
    .setScale(options.scale ?? 1)
    .setAlpha(options.alpha ?? 1)
    .setRotation(options.rotation ?? 0);
  sprite.play(key);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
  return sprite;
}

export function addArena(scene, width, height, renderPaddingY = 0) {
  const renderHeight = height + renderPaddingY * 2;
  scene.add.image(width / 2, height / 2, 'arena-ground')
    .setDisplaySize(width, renderHeight)
    .setDepth(0);
  const grid = scene.add.graphics();
  grid.lineStyle(1, 0x3d4b3f, 0.08);
  for (let x = 0; x <= width; x += 80) {
    grid.lineBetween(x, -renderPaddingY, x, height + renderPaddingY);
  }
  for (let y = -renderPaddingY; y <= height + renderPaddingY; y += 80) {
    grid.lineBetween(0, y, width, y);
  }
  scene.add.rectangle(width / 2, height / 2, width - 8, renderHeight - 8)
    .setStrokeStyle(8, 0x4d3821, 0.65)
    .setDepth(2);
}
