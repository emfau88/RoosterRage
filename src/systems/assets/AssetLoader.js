import roosterWalkSheetUrl from '../../assets/characters/rooster-walk-v2.webp';
import enemySlimeUrl from '../../assets/enemy-slime.webp';
import enemySlimeWobbleUrl from '../../assets/enemies/animations/enemy-slime-wobble.webp';
import enemyRunnerWalkUrl from '../../assets/enemies/animations/enemy-runner-walk.webp';
import enemyBruteStompUrl from '../../assets/enemies/animations/enemy-brute-stomp.webp';
import enemySpitterPulseUrl from '../../assets/enemies/animations/enemy-spitter-pulse.webp';
import enemyFanSpitterRecoilUrl from '../../assets/enemies/animations/enemy-fan-spitter-recoil.webp';
import enemyBomberBobUrl from '../../assets/enemies/animations/enemy-bomber-bob.webp';
import enemyEliteRunnerWalkUrl from '../../assets/enemies/animations/enemy-elite-runner-walk.webp';
import enemyEliteBruteStompUrl from '../../assets/enemies/animations/enemy-elite-brute-stomp.webp';
import enemyEliteSpitterPulseUrl from '../../assets/enemies/animations/enemy-elite-spitter-pulse.webp';
import enemyBossHeavyUrl from '../../assets/enemies/animations/enemy-boss-heavy.webp';
import fxAtlasUrl from '../../assets/fx/fx-atlas-v1-sheet.webp';
import arenaGroundUrl from '../../assets/map/arena-ground.webp';
import supportChickOrbUrl from '../../assets/companions/support-chick-orb.webp';
import eggShotSfxUrl from '../../assets/audio/egg-shot.wav';
import enemyHitSfxUrl from '../../assets/audio/enemy-hit.wav';
import enemyPopSfxUrl from '../../assets/audio/enemy-pop.wav';
import xpPickupSfxUrl from '../../assets/audio/xp-pickup.wav';
import levelUpSfxUrl from '../../assets/audio/level-up.wav';
import playerHitSfxUrl from '../../assets/audio/player-hit.wav';
import molotovImpactSfxUrl from '../../assets/audio/molotov-impact.wav';
import rocketExplosionSfxUrl from '../../assets/audio/rocket-explosion.wav';
import lightningSfxUrl from '../../assets/audio/lightning.wav';
import laserSfxUrl from '../../assets/audio/laser.wav';
import voidOpenSfxUrl from '../../assets/audio/void-open.wav';

export function preloadGameAssets(scene) {
  document.body.dataset.roosterLoadState = 'loading';
  const centerX = scene.scale.width / 2;
  const centerY = scene.scale.height / 2;
  const progressTrack = scene.add.rectangle(centerX, centerY + 24, 280, 8, 0x2b3a3f, 1);
  const progressBar = scene.add.rectangle(centerX - 140, centerY + 24, 280, 8, 0xffc94a, 1)
    .setOrigin(0, 0.5)
    .setScale(0, 1);
  const progressLabel = scene.add.text(centerX, centerY - 12, 'Arena wird geladen ...', {
    fontFamily: 'Arial',
    fontSize: '18px',
    color: '#f6f0dd'
  }).setOrigin(0.5);
  const loadingUi = [progressTrack, progressBar, progressLabel];
  scene.assetLoadErrors = [];
  scene.load.on('progress', (progress) => progressBar.setScale(progress, 1));
  scene.load.on('loaderror', (file) => {
    scene.assetLoadErrors.push(file.key);
    document.body.dataset.roosterLoadState = 'error';
    progressLabel.setText(`Asset konnte nicht geladen werden: ${file.key}`);
    progressLabel.setColor('#ff7878');
  });
  scene.load.once('complete', () => {
    if (scene.assetLoadErrors.length === 0) {
      document.body.dataset.roosterLoadState = 'loaded';
      loadingUi.forEach((item) => item.destroy());
    } else {
      progressBar.setFillStyle(0xff5c5c);
      progressLabel.setText('Ladefehler. Bitte Seite neu laden.');
    }
  });

  scene.load.spritesheet('rooster-walk', roosterWalkSheetUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.image('enemy-slime', enemySlimeUrl);
  scene.load.spritesheet('enemy-slime-wobble', enemySlimeWobbleUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-runner-walk', enemyRunnerWalkUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-brute-stomp', enemyBruteStompUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-spitter-pulse', enemySpitterPulseUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-fan-spitter-recoil', enemyFanSpitterRecoilUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-bomber-bob', enemyBomberBobUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-elite-runner-walk', enemyEliteRunnerWalkUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-elite-brute-stomp', enemyEliteBruteStompUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-elite-spitter-pulse', enemyEliteSpitterPulseUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('enemy-boss-heavy', enemyBossHeavyUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('fx-atlas-v1', fxAtlasUrl, { frameWidth: 256, frameHeight: 256 });
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
