import Phaser from 'phaser';

export function findClusterTarget(scene) {
  const candidates = scene.getTargetableEnemies();
  if (!candidates.length) {
    return null;
  }
  let bestEnemy = scene.findNearestEnemy();
  let bestScore = -1;
  candidates.forEach((enemy) => {
    const score = candidates.filter((candidate) => Phaser.Math.Distance.Between(
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
  if (!bestEnemy) return null;
  const cluster = candidates.filter((candidate) => Phaser.Math.Distance.Between(
    bestEnemy.sprite.x,
    bestEnemy.sprite.y,
    candidate.sprite.x,
    candidate.sprite.y
  ) < 150);
  const divisor = Math.max(1, cluster.length);
  return cluster.reduce((target, enemy) => ({
    x: target.x + enemy.sprite.x / divisor,
    y: target.y + enemy.sprite.y / divisor,
    velocityX: target.velocityX + (enemy.sprite.body?.velocity.x ?? 0) / divisor,
    velocityY: target.velocityY + (enemy.sprite.body?.velocity.y ?? 0) / divisor
  }), { x: 0, y: 0, velocityX: 0, velocityY: 0 });
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
