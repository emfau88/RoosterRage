import {
  NEXT_ROOSTER_IDLE_FRAME_RATE,
  NEXT_ROOSTER_WALK_FRAME_COUNT,
  NEXT_ROOSTER_WALK_FRAME_RATE,
  USE_NEXT_ROOSTER_VISUAL
} from '../../config/aceVisual.js';

export function createGameAnimations(scene) {
  const roosterTextures = ['ace', 'artillery', 'storm'];
  // A single clean side row is mirrored at runtime. Besides making direction
  // semantics unambiguous, this avoids baked edge bleed in opposing side rows.
  roosterTextures.forEach((roosterId) => {
    const walkFrames = NEXT_ROOSTER_WALK_FRAME_COUNT[roosterId];
    const directions = [
      ['south', 0],
      ['west', walkFrames],
      ['east', walkFrames],
      ['north', walkFrames * 3]
    ];
    directions.forEach(([direction, start]) => {
      const key = `rooster-${roosterId}-walk-${direction}`;
      if (scene.anims.exists(key)) {
        return;
      }
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(`rooster-${roosterId}-walk`, { start, end: start + walkFrames - 1 }),
        frameRate: USE_NEXT_ROOSTER_VISUAL[roosterId]
          ? NEXT_ROOSTER_WALK_FRAME_RATE[roosterId]
          : roosterId === 'artillery' ? 8 : roosterId === 'storm' ? 12 : 10,
        repeat: -1
      });
    });
  });

  roosterTextures.forEach((roosterId) => {
    if (USE_NEXT_ROOSTER_VISUAL[roosterId]) {
      [['south', 0], ['west', 8], ['east', 8], ['north', 24]].forEach(([direction, start]) => {
        const key = `rooster-${roosterId}-idle-${direction}`;
        if (scene.anims.exists(key)) return;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(`rooster-${roosterId}-idle`, { start, end: start + 7 }),
          frameRate: NEXT_ROOSTER_IDLE_FRAME_RATE[roosterId],
          repeat: -1
        });
      });
    }
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
    ['enemy-slime-wobble-loop', 'enemy-slime-wobble', 0, 2, 7]
  ];
  const stateDrivenEnemies = [
    ['enemy-brute', 'enemy-brute-stomp', 6],
    ['enemy-spitter', 'enemy-spitter-pulse', 7],
    ['enemy-fan-spitter', 'enemy-fan-spitter-recoil', 7],
    ['enemy-bomber', 'enemy-bomber-bob', 8],
    ['enemy-elite-brute', 'enemy-elite-brute-stomp', 6],
    ['enemy-elite-spitter', 'enemy-elite-spitter-pulse', 7]
  ];
  [
    ['enemy-kornkrabbler-run', 11],
    ['enemy-runner-run', 10],
    ['enemy-elite-runner-run', 12],
    ['enemy-brute-run', 7],
    ['enemy-boss-run', 5],
    ['enemy-support-run', 9],
    ['enemy-summoner-run', 9],
    ['enemy-spitter-run', 7],
    ['enemy-fan-spitter-run', 7],
    ['enemy-bomber-run', 10],
    ['enemy-elite-spitter-run', 7]
  ].forEach(([texture, frameRate]) => {
    [
      ['left', 0],
      ['right', 4],
      ['up', 8],
      ['down', 12]
    ].forEach(([direction, start]) => {
      const key = `${texture}-${direction}`;
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(texture, { start, end: start + 3 }),
          frameRate,
          repeat: -1
        });
      }
    });
  });

  [1, 2, 3, 4, 5, 'evo'].forEach((rank) => {
    const texture = `support-chick-${rank === 'evo' ? 'evo' : `r${rank}`}-sheet`;
    [
      ['south', 0],
      ['west', 4],
      ['east', 8],
      ['north', 12]
    ].forEach(([direction, start]) => {
      const key = `${texture}-walk-${direction}`;
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(texture, { start, end: start + 3 }),
        frameRate: rank === 'evo' ? 12 : 9 + Math.min(3, Number(rank) || 1),
        repeat: -1
      });
    });
  });

  [
    ['fx-void-open', 12, 14, 9],
    ['fx-void-collapse', 14, 15, 6]
  ].forEach(([key, start, end, frameRate]) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers('fx-atlas-v1', { start, end }),
      frameRate,
      repeat: 0
    });
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
  stateDrivenEnemies.forEach(([prefix, texture, frameRate]) => {
    const specs = [
      [`${prefix}-move`, [0, 1], frameRate, -1, true],
      [`${prefix}-windup`, [1, 2], Math.max(7, frameRate), 0, false],
      [`${prefix}-resolve`, [2], frameRate, -1, false],
      [`${prefix}-recovery`, [2, 1, 0], Math.max(8, frameRate + 1), 0, false]
    ];
    specs.forEach(([key, frames, rate, repeat, yoyo]) => {
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: texture, frame })),
        frameRate: rate,
        repeat,
        yoyo
      });
    });
  });
  [
    ['molotov-ground-flame-orange-loop', 'molotov-ground-flame-orange'],
    ['molotov-ground-flame-blue-loop', 'molotov-ground-flame-blue']
  ].forEach(([key, texture]) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texture, { start: 0, end: 11 }),
      frameRate: 14,
      repeat: -1
    });
  });
}
