import Phaser from 'phaser';

const BOT_UPGRADE_PRIORITIES = {
  offense: ['faster-eggs', 'fire-eggs', 'triple-shot', 'piercing-eggs', 'bigger-eggs', 'double-shot', 'move-speed', 'max-hp', 'heal'],
  defense: ['max-hp', 'armor', 'regen', 'heal', 'move-speed', 'faster-eggs', 'fire-eggs'],
  random: [],
  'bad-but-valid': ['heal', 'xp-magnet', 'double-shot', 'max-hp', 'bigger-eggs', 'triple-shot', 'fire-eggs', 'faster-eggs']
};

export class RunStateSystem {
  constructor(scene) {
    this.scene = scene;
    this.gameEnded = false;
    this.choosingRooster = false;
    this.choosingUpgrade = false;
    this.pendingUpgradeChoices = null;
    this.upgradeStartedAt = 0;
  }

  startRoosterSelection(definitions) {
    this.choosingRooster = true;
    this.scene.physics.pause();
    this.scene.hud.showRoosterSelection(definitions);
  }

  chooseRooster(id) {
    if (!this.choosingRooster || !this.scene.roosterClasses.select(id)) {
      return false;
    }
    this.choosingRooster = false;
    this.scene.hud.hideOverlay();
    this.scene.physics.resume();
    this.scene.waveSystem.start();
    this.scene.updateHud();
    return true;
  }

  startLevelUp() {
    const { scene } = this;
    this.choosingUpgrade = true;
    this.upgradeStartedAt = scene.time.now;
    this.pendingUpgradeChoices = scene.upgradeSystem.getChoices(3, scene.player);
    scene.bot.upgradeReadyAt = scene.time.now + 350;
    scene.physics.pause();
    scene.telemetry.addUpgradeOffer(
      scene.time.now,
      scene.waveSystem.currentWave,
      this.pendingUpgradeChoices
    );
    scene.hud.showUpgradeChoices(this.pendingUpgradeChoices);
  }

  chooseUpgrade(upgrade) {
    if (!upgrade || !this.choosingUpgrade) {
      return false;
    }
    const { scene } = this;
    const pauseMs = this.upgradeStartedAt ? scene.time.now - this.upgradeStartedAt : 0;
    scene.player.applyUpgrade(upgrade, scene);
    scene.telemetry.addUpgradeChoice(scene.time.now, scene.waveSystem.currentWave, upgrade, pauseMs);
    scene.hud.hideOverlay();
    scene.physics.resume();
    this.choosingUpgrade = false;
    this.pendingUpgradeChoices = null;
    this.upgradeStartedAt = 0;
    scene.updateHud();
    return true;
  }

  maybeChooseBotUpgrade(time) {
    if (!this.scene.bot.enabled || time < this.scene.bot.upgradeReadyAt || !this.pendingUpgradeChoices) {
      return;
    }
    this.chooseUpgrade(this.pickBotUpgrade(this.pendingUpgradeChoices));
  }

  pickBotUpgrade(choices) {
    if (this.scene.bot.strategy === 'random') {
      return Phaser.Utils.Array.GetRandom(choices);
    }
    const priorities = BOT_UPGRADE_PRIORITIES[this.scene.bot.strategy] ?? BOT_UPGRADE_PRIORITIES.offense;
    const rank = (id) => {
      const index = priorities.indexOf(id);
      return index === -1 ? 999 : index;
    };
    return [...choices].sort((a, b) => rank(a.id) - rank(b.id))[0];
  }

  gameOver() {
    this.end('gameOver', 'Game Over', 'Der Hahn wurde ueberrannt.');
  }

  victory() {
    this.end(
      'victory',
      'Victory',
      `Alle ${this.scene.waveSystem.totalWaves} Wellen sind ueberstanden.`
    );
  }

  end(outcome, title, message) {
    if (this.gameEnded) {
      return;
    }
    this.gameEnded = true;
    this.scene.physics.pause();
    this.scene.telemetry.finish(this.scene.time.now, outcome);
    this.scene.hud.showEndScreen(title, message);
  }
}
