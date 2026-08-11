import Phaser from 'phaser';

export function findClusterTarget(scene) {
  if (!scene.enemies.length) {
    return null;
  }
  let bestEnemy = scene.findNearestEnemy();
  let bestScore = -1;
  scene.enemies.forEach((enemy) => {
    const score = scene.enemies.filter((candidate) => Phaser.Math.Distance.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      candidate.sprite.x,
      candidate.sprite.y
    ) < 150).length;
    if (score > bestScore) {
      bestScore = score;
      bestEnemy = enemy;
    }
  });
  return bestEnemy ? {
    x: bestEnemy.sprite.x,
    y: bestEnemy.sprite.y,
    velocityX: bestEnemy.sprite.body?.velocity.x ?? 0,
    velocityY: bestEnemy.sprite.body?.velocity.y ?? 0
  } : null;
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Phaser.Math.Distance.Between(px, py, ax, ay);
  }
  const progress = Phaser.Math.Clamp(
    ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy),
    0,
    1
  );
  return Phaser.Math.Distance.Between(px, py, ax + dx * progress, ay + dy * progress);
}
