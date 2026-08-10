export function createGameAnimations(scene) {
  const roosterTextures = ['ace', 'artillery', 'storm'];
  // A single clean side row is mirrored at runtime. Besides making direction
  // semantics unambiguous, this avoids baked edge bleed in opposing side rows.
  const directions = [['south', 0], ['west', 4], ['east', 4], ['north', 12]];
  roosterTextures.forEach((roosterId) => {
    directions.forEach(([direction, start]) => {
      const key = `rooster-${roosterId}-walk-${direction}`;
      if (scene.anims.exists(key)) {
        return;
      }
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(`rooster-${roosterId}-walk`, { start, end: start + 3 }),
        frameRate: roosterId === 'artillery' ? 8 : roosterId === 'storm' ? 12 : 10,
        repeat: -1
      });
    });
  });

  const fxAnimations = [
    ['fx-molotov-fire', 0, 3, 9],
    ['fx-rocket-explosion', 4, 7, 11],
    ['fx-lightning-impact', 8, 11, 13],
    ['fx-void-portal', 12, 15, 9],
    ['fx-laser-impact', 16, 19, 14]
  ];
  fxAnimations.forEach(([key, start, end, frameRate]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers('fx-atlas-v1', { start, end }),
      frameRate,
      repeat: 0
    });
  });

  const enemyAnimations = [
    ['enemy-slime-wobble-loop', 'enemy-slime-wobble', 0, 2, 7],
    ['enemy-runner-walk-loop', 'enemy-runner-walk', 0, 2, 8],
    ['enemy-brute-stomp-loop', 'enemy-brute-stomp', 0, 2, 6],
    ['enemy-spitter-pulse-loop', 'enemy-spitter-pulse', 0, 2, 6],
    ['enemy-fan-spitter-recoil-loop', 'enemy-fan-spitter-recoil', 0, 2, 6],
    ['enemy-bomber-bob-loop', 'enemy-bomber-bob', 0, 2, 7],
    ['enemy-elite-runner-walk-loop', 'enemy-elite-runner-walk', 0, 2, 8],
    ['enemy-elite-brute-stomp-loop', 'enemy-elite-brute-stomp', 0, 2, 5],
    ['enemy-elite-spitter-pulse-loop', 'enemy-elite-spitter-pulse', 0, 2, 6],
    ['enemy-boss-heavy-loop', 'enemy-boss-heavy', 0, 2, 4]
  ];
  [
    ['left', 0],
    ['right', 4],
    ['up', 8],
    ['down', 12]
  ].forEach(([direction, start]) => {
    const key = `enemy-kornkrabbler-run-${direction}`;
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('enemy-kornkrabbler-run', { start, end: start + 3 }),
        frameRate: 11,
        repeat: -1
      });
    }
  });
  enemyAnimations.forEach(([key, texture, start, end, frameRate]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, { start, end }),
      frameRate,
      repeat: -1,
      yoyo: true
    });
  });
}
