import roosterAceWalkSheetUrl from '../../assets/characters/rooster-ace-walk.webp';
import roosterArtilleryWalkSheetUrl from '../../assets/characters/rooster-artillery-walk.webp';
import roosterStormWalkSheetUrl from '../../assets/characters/rooster-storm-walk.webp';
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
import eggUrl from '../../assets/projectiles/egg.webp';
import fireEggUrl from '../../assets/projectiles/fire-egg.webp';
import heavyEggUrl from '../../assets/projectiles/heavy-egg.webp';
import stormEggUrl from '../../assets/projectiles/storm-egg.webp';
import goldenEggUrl from '../../assets/projectiles/golden-egg.webp';
import molotovEggUrl from '../../assets/projectiles/molotov-egg.webp';
import rocketEggUrl from '../../assets/projectiles/rocket-egg.webp';
import enemyShotUrl from '../../assets/projectiles/enemy-shot.webp';
import enemyPurpleShotUrl from '../../assets/projectiles/enemy-purple-shot.webp';
import enemyBlueShotUrl from '../../assets/projectiles/enemy-blue-shot.webp';
import bossFireballUrl from '../../assets/projectiles/boss-fireball.webp';
import xpOrbUrl from '../../assets/collectibles/xp-orb.webp';
import pickupHealUrl from '../../assets/pickups/pickup-heal.webp';
import pickupBombUrl from '../../assets/pickups/pickup-bomb.webp';
import pickupMagnetUrl from '../../assets/pickups/pickup-magnet.webp';
import pickupEliteChestUrl from '../../assets/pickups/pickup-elite-chest.webp';
import pickupEliteChestAjarUrl from '../../assets/pickups/pickup-elite-chest-ajar.webp';
import pickupEliteChestOpenUrl from '../../assets/pickups/pickup-elite-chest-open.webp';
import arenaCrateUrl from '../../assets/map/arena-crate.webp';
import arenaBaleUrl from '../../assets/map/arena-bale.webp';
import arenaWallUrl from '../../assets/map/arena-wall.webp';
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

  scene.load.spritesheet('rooster-ace-walk', roosterAceWalkSheetUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('rooster-artillery-walk', roosterArtilleryWalkSheetUrl, { frameWidth: 256, frameHeight: 256 });
  scene.load.spritesheet('rooster-storm-walk', roosterStormWalkSheetUrl, { frameWidth: 256, frameHeight: 256 });
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
  scene.load.image('egg', eggUrl);
  scene.load.image('fire-egg', fireEggUrl);
  scene.load.image('heavy-egg', heavyEggUrl);
  scene.load.image('storm-egg', stormEggUrl);
  scene.load.image('golden-egg', goldenEggUrl);
  scene.load.image('molotov-egg', molotovEggUrl);
  scene.load.image('rocket-egg', rocketEggUrl);
  scene.load.image('enemy-shot', enemyShotUrl);
  scene.load.image('enemy-purple-shot', enemyPurpleShotUrl);
  scene.load.image('enemy-blue-shot', enemyBlueShotUrl);
  scene.load.image('boss-fireball', bossFireballUrl);
  scene.load.image('xp-orb', xpOrbUrl);
  scene.load.image('pickup-heal', pickupHealUrl);
  scene.load.image('pickup-bomb', pickupBombUrl);
  scene.load.image('pickup-magnet', pickupMagnetUrl);
  scene.load.image('pickup-elite-chest', pickupEliteChestUrl);
  scene.load.image('pickup-elite-chest-ajar', pickupEliteChestAjarUrl);
  scene.load.image('pickup-elite-chest-open', pickupEliteChestOpenUrl);
  scene.load.image('arena-crate', arenaCrateUrl);
  scene.load.image('arena-bale', arenaBaleUrl);
  scene.load.image('arena-wall', arenaWallUrl);
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
