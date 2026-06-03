import Phaser from 'phaser';
import roosterWalkSheetUrl from '../assets/characters/rooster-walk-v2.png';
import enemySlimeUrl from '../assets/enemy-slime.png';
import enemyRunnerUrl from '../assets/enemy-runner.png';
import enemyBruteUrl from '../assets/enemy-brute.png';
import enemySlimeWobbleUrl from '../assets/enemies/animations/enemy-slime-wobble.png';
import enemyRunnerWalkUrl from '../assets/enemies/animations/enemy-runner-walk.png';
import enemyBruteStompUrl from '../assets/enemies/animations/enemy-brute-stomp.png';
import enemySpitterPulseUrl from '../assets/enemies/animations/enemy-spitter-pulse.png';
import enemyFanSpitterRecoilUrl from '../assets/enemies/animations/enemy-fan-spitter-recoil.png';
import enemyBomberBobUrl from '../assets/enemies/animations/enemy-bomber-bob.png';
import enemyEliteRunnerWalkUrl from '../assets/enemies/animations/enemy-elite-runner-walk.png';
import enemyEliteBruteStompUrl from '../assets/enemies/animations/enemy-elite-brute-stomp.png';
import enemyEliteSpitterPulseUrl from '../assets/enemies/animations/enemy-elite-spitter-pulse.png';
import enemyBossHeavyUrl from '../assets/enemies/animations/enemy-boss-heavy.png';
import enemySpitterUrl from '../assets/enemies/enemy-spitter.png';
import enemyFanSpitterUrl from '../assets/enemies/enemy-fan-spitter.png';
import enemyBomberUrl from '../assets/enemies/enemy-bomber.png';
import enemyEliteRunnerUrl from '../assets/enemies/enemy-elite-runner.png';
import enemyEliteBruteUrl from '../assets/enemies/enemy-elite-brute.png';
import enemyEliteSpitterUrl from '../assets/enemies/enemy-elite-spitter.png';
import enemyBossUrl from '../assets/enemies/enemy-boss.png';
import fxAtlasUrl from '../assets/fx/fx-atlas-v1-sheet.png';
import arenaGroundUrl from '../assets/map/arena-ground.png';
import supportChickOrbUrl from '../assets/companions/support-chick-orb.png';
import eggShotSfxUrl from '../assets/audio/egg-shot.wav';
import enemyHitSfxUrl from '../assets/audio/enemy-hit.wav';
import enemyPopSfxUrl from '../assets/audio/enemy-pop.wav';
import xpPickupSfxUrl from '../assets/audio/xp-pickup.wav';
import levelUpSfxUrl from '../assets/audio/level-up.wav';
import playerHitSfxUrl from '../assets/audio/player-hit.wav';
import molotovImpactSfxUrl from '../assets/audio/molotov-impact.wav';
import rocketExplosionSfxUrl from '../assets/audio/rocket-explosion.wav';
import lightningSfxUrl from '../assets/audio/lightning.wav';
import laserSfxUrl from '../assets/audio/laser.wav';
import voidOpenSfxUrl from '../assets/audio/void-open.wav';

export function preloadGameAssets(scene) {
  scene.load.spritesheet('rooster-walk', roosterWalkSheetUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.image('enemy-slime', enemySlimeUrl);
  scene.load.image('enemy-runner', enemyRunnerUrl);
  scene.load.image('enemy-brute', enemyBruteUrl);
  scene.load.spritesheet('enemy-slime-wobble', enemySlimeWobbleUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-runner-walk', enemyRunnerWalkUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-brute-stomp', enemyBruteStompUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-spitter-pulse', enemySpitterPulseUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-fan-spitter-recoil', enemyFanSpitterRecoilUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-bomber-bob', enemyBomberBobUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-elite-runner-walk', enemyEliteRunnerWalkUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-elite-brute-stomp', enemyEliteBruteStompUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-elite-spitter-pulse', enemyEliteSpitterPulseUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.spritesheet('enemy-boss-heavy', enemyBossHeavyUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.image('enemy-spitter', enemySpitterUrl);
  scene.load.image('enemy-fan-spitter', enemyFanSpitterUrl);
  scene.load.image('enemy-bomber', enemyBomberUrl);
  scene.load.image('enemy-elite-runner', enemyEliteRunnerUrl);
  scene.load.image('enemy-elite-brute', enemyEliteBruteUrl);
  scene.load.image('enemy-elite-spitter', enemyEliteSpitterUrl);
  scene.load.image('enemy-boss', enemyBossUrl);
  scene.load.spritesheet('fx-atlas-v1', fxAtlasUrl, {
    frameWidth: 256,
    frameHeight: 256
  });
  scene.load.image('arena-ground', arenaGroundUrl);
  scene.load.image('support-chick', supportChickOrbUrl);
  scene.load.audio('egg-shot', eggShotSfxUrl);
  scene.load.audio('enemy-hit', enemyHitSfxUrl);
  scene.load.audio('enemy-pop', enemyPopSfxUrl);
  scene.load.audio('xp-pickup', xpPickupSfxUrl);
  scene.load.audio('level-up', levelUpSfxUrl);
  scene.load.audio('player-hit', playerHitSfxUrl);
  scene.load.audio('molotov-impact', molotovImpactSfxUrl);
  scene.load.audio('rocket-explosion', rocketExplosionSfxUrl);
  scene.load.audio('lightning', lightningSfxUrl);
  scene.load.audio('laser', laserSfxUrl);
  scene.load.audio('void-open', voidOpenSfxUrl);
}

export function createGeneratedTextures(scene) {
  const egg = scene.make.graphics({ x: 0, y: 0, add: false });
  egg.fillStyle(0xfffbef, 1);
  egg.fillEllipse(10, 10, 18, 13);
  egg.generateTexture('egg', 20, 20);
  egg.clear();
  egg.fillStyle(0xff5b25, 1);
  egg.fillEllipse(10, 10, 19, 14);
  egg.fillStyle(0xffd05c, 1);
  egg.fillEllipse(12, 8, 8, 5);
  egg.generateTexture('fire-egg', 20, 20);
  egg.clear();
  egg.fillStyle(0xffc83d, 1);
  egg.fillEllipse(16, 16, 29, 22);
  egg.fillStyle(0xfff0a6, 0.95);
  egg.fillEllipse(12, 11, 13, 8);
  egg.fillStyle(0xffffff, 0.82);
  egg.fillEllipse(9, 8, 5, 3);
  egg.generateTexture('golden-egg', 32, 32);
  egg.clear();
  egg.fillStyle(0x3a130c, 1);
  egg.fillEllipse(14, 14, 23, 18);
  egg.fillStyle(0xff5b25, 1);
  egg.fillEllipse(14, 14, 18, 14);
  egg.fillStyle(0xffd35c, 0.9);
  egg.fillCircle(10, 9, 5);
  egg.fillStyle(0x2a1008, 1);
  egg.fillRect(16, 4, 4, 9);
  egg.generateTexture('molotov-egg', 28, 28);
  egg.clear();
  egg.fillStyle(0x3a1010, 1);
  egg.fillEllipse(16, 16, 28, 18);
  egg.fillStyle(0xfff3b0, 1);
  egg.fillTriangle(24, 16, 33, 11, 33, 21);
  egg.fillStyle(0xff6a28, 1);
  egg.fillEllipse(12, 16, 14, 11);
  egg.fillStyle(0xffffff, 0.75);
  egg.fillEllipse(9, 12, 5, 3);
  egg.generateTexture('rocket-egg', 36, 32);
  egg.destroy();

  const xp = scene.make.graphics({ x: 0, y: 0, add: false });
  xp.fillStyle(0x4bb7ff, 1);
  xp.fillCircle(9, 9, 7);
  xp.fillStyle(0xffd14a, 1);
  xp.fillCircle(7, 6, 3);
  xp.generateTexture('xp-orb', 18, 18);
  xp.destroy();

  const shot = scene.make.graphics({ x: 0, y: 0, add: false });
  shot.fillStyle(0x1a1020, 0.95);
  shot.fillCircle(12, 12, 11);
  shot.fillStyle(0xa7ff64, 1);
  shot.fillCircle(12, 12, 8);
  shot.fillStyle(0xffffff, 0.78);
  shot.fillCircle(9, 8, 3);
  shot.generateTexture('enemy-shot', 24, 24);
  shot.clear();
  shot.fillStyle(0x1a1028, 0.95);
  shot.fillCircle(15, 15, 14);
  shot.fillStyle(0xb86cff, 1);
  shot.fillCircle(15, 15, 10);
  shot.fillStyle(0xf2d8ff, 0.88);
  shot.fillCircle(11, 10, 4);
  shot.generateTexture('enemy-purple-shot', 30, 30);
  shot.clear();
  shot.fillStyle(0x0d2333, 0.95);
  shot.fillCircle(14, 14, 13);
  shot.fillStyle(0x6bd8ff, 1);
  shot.fillCircle(14, 14, 9);
  shot.fillStyle(0xffffff, 0.82);
  shot.fillCircle(10, 9, 4);
  shot.generateTexture('enemy-blue-shot', 28, 28);
  shot.clear();
  shot.fillStyle(0x3a1010, 0.96);
  shot.fillCircle(20, 20, 19);
  shot.fillStyle(0xff5a22, 1);
  shot.fillCircle(20, 20, 15);
  shot.fillStyle(0xffd35c, 0.92);
  shot.fillCircle(15, 14, 7);
  shot.fillStyle(0xffffff, 0.7);
  shot.fillCircle(12, 10, 3);
  shot.generateTexture('boss-fireball', 40, 40);
  shot.destroy();
}

export function createGameAnimations(scene) {
  const directions = [
    ['rooster-walk-south', 0],
    ['rooster-walk-west', 4],
    ['rooster-walk-east', 8],
    ['rooster-walk-north', 12]
  ];
  directions.forEach(([key, start]) => {
    if (scene.anims.exists(key)) {
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers('rooster-walk', { start, end: start + 3 }),
      frameRate: 10,
      repeat: -1
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

export function addArena(scene, width, height) {
  scene.add.image(width / 2, height / 2, 'arena-ground')
    .setDisplaySize(width, height)
    .setDepth(0);
  const grid = scene.add.graphics();
  grid.lineStyle(1, 0x3d4b3f, 0.08);
  for (let x = 0; x <= width; x += 80) {
    grid.lineBetween(x, 0, x, height);
  }
  for (let y = 0; y <= height; y += 80) {
    grid.lineBetween(0, y, width, y);
  }
  scene.add.rectangle(width / 2, height / 2, width - 8, height - 8)
    .setStrokeStyle(8, 0x4d3821, 0.65)
    .setDepth(2);
}
