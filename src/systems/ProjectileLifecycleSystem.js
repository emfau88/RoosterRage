const COLLECTIONS = [
  { key: 'projectiles', isActive: (item) => item.sprite.active },
  { key: 'enemyProjectiles', isActive: (item) => item.sprite.active },
  { key: 'molotovProjectiles', isActive: (item) => item.active },
  { key: 'rocketProjectiles', isActive: (item) => item.active },
  { key: 'lightningBolts', isActive: (item) => item.active },
  { key: 'orbitEggs', isActive: (item) => item.sprite.active },
  { key: 'supportChickens', isActive: (item) => item.sprite.active },
  { key: 'hazardZones', isActive: (item) => item.active },
  { key: 'voidZones', isActive: (item) => item.active }
];

export class ProjectileLifecycleSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(delta) {
    this.scene.pendingVoidPulls = new Map();
    COLLECTIONS.forEach(({ key }) => {
      this.scene[key].forEach((item) => item.update(delta));
    });
    this.scene.pendingVoidPulls.forEach(({ enemy, x, y }) => {
      if (!enemy.sprite.active) return;
      enemy.sprite.x += x;
      enemy.sprite.y += y;
    });
    this.scene.pendingVoidPulls = null;
  }

  cleanup() {
    COLLECTIONS.forEach(({ key, isActive }) => {
      this.scene[key] = this.scene[key].filter(isActive);
    });
  }

  clearEnemyProjectiles() {
    this.scene.enemyProjectiles.forEach((projectile) => projectile.destroy());
    this.scene.enemyProjectiles = [];
  }

  destroyAll() {
    COLLECTIONS.forEach(({ key }) => {
      this.scene[key].forEach((item) => item.destroy());
      this.scene[key] = [];
    });
  }
}
