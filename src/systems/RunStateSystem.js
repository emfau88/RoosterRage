import { getPlayerProfile } from '../data/playerProfiles.js';

const MAX_REGULAR_CHOICES = 11;

export class RunStateSystem {
  constructor(scene) {
    this.scene = scene;
    this.gameEnded = false;
    this.choosingRooster = false;
    this.choosingUpgrade = false;
    this.pendingUpgradeChoices = null;
    this.pendingLevelUps = 0;
    this.regularChoices = 0;
    this.rewardQueue = [];
    this.currentSelection = null;
    this.upgradeStartedAt = 0;
    this.rerollsRemaining = 1;
  }

  startRoosterSelection(definitions) {
    this.choosingRooster = true;
    this.scene.physics.pause();
    this.scene.productAnalytics.viewHub();
    const renderHub = () => this.scene.hud.showRoosterSelection(
      definitions,
      {
        ...this.scene.meta.getHubState(definitions),
        analytics: this.scene.productAnalytics.getState()
      },
      (roosterId, cosmeticId, challengeId) => {
        this.scene.meta.selectChallenge(challengeId);
        if (this.scene.meta.selectCosmetic(roosterId, cosmeticId)) renderHub();
      }
    );
    this.renderHub = renderHub;
    renderHub();
  }

  chooseRooster(id) {
    if (
      !this.choosingRooster
      || !this.scene.meta.isRoosterUnlocked(id)
      || !this.scene.roosterClasses.select(id)
    ) {
      return false;
    }
    this.scene.meta.applyRunBonuses(this.scene.player, this);
    this.choosingRooster = false;
    this.scene.audio.play('ui-confirm');
    this.scene.audio.play('rooster-crow');
    this.scene.audio.stopAmbience(650);
    this.scene.audio.playMusic('run-theme', { fadeMs: 750 });
    this.scene.hud.hideOverlay();
    this.scene.physics.resume();
    this.scene.waveSystem.start();
    this.scene.productAnalytics.startRun({
      roosterId: id,
      challengeId: this.scene.challenge.id,
      arenaId: this.scene.arena.id
    });
    this.scene.updateHud();
    return true;
  }

  startLevelUp(count = 1) {
    const available = Math.max(0, MAX_REGULAR_CHOICES - this.regularChoices - this.pendingLevelUps);
    this.pendingLevelUps += Math.min(Math.max(1, count), available);
    this.openNextSelection();
  }

  startChestReward(kind = 'elite') {
    this.rewardQueue.push(kind);
    this.scene.telemetry.addChestFound(this.scene.time.now, this.scene.waveSystem.currentWave, kind);
    this.openNextSelection();
  }

  openNextSelection() {
    if (this.gameEnded || this.choosingUpgrade) {
      return;
    }
    const { scene } = this;
    const rewardKind = this.rewardQueue.shift();
    if (rewardKind) {
      this.currentSelection = { type: 'chest', kind: rewardKind };
      this.pendingUpgradeChoices = scene.upgradeSystem.getRewardChoices(
        rewardKind === 'boss' ? 4 : 3,
        scene.player,
        rewardKind
      );
    } else if (this.pendingLevelUps > 0 && this.regularChoices < MAX_REGULAR_CHOICES) {
      this.pendingLevelUps -= 1;
      this.currentSelection = {
        type: 'level',
        index: this.regularChoices + 1,
        remaining: this.pendingLevelUps
      };
      this.pendingUpgradeChoices = scene.upgradeSystem.getChoices(3, scene.player);
    } else {
      this.pendingLevelUps = 0;
      this.currentSelection = null;
      this.pendingUpgradeChoices = null;
      scene.hud.hideOverlay();
      scene.physics.resume();
      return;
    }

    this.choosingUpgrade = true;
    this.upgradeStartedAt = scene.time.now;
    scene.bot.upgradeReadyAt = scene.time.now + 260;
    scene.physics.pause();
    scene.telemetry.addUpgradeOffer(
      scene.time.now,
      scene.waveSystem.currentWave,
      this.pendingUpgradeChoices,
      this.currentSelection.type
    );
    scene.hud.showUpgradeChoices(this.pendingUpgradeChoices, {
      type: this.currentSelection.type,
      kind: this.currentSelection.kind,
      remaining: this.pendingLevelUps + this.rewardQueue.length,
      canReroll: this.rerollsRemaining > 0
    });
  }

  rerollUpgradeChoices() {
    if (!this.choosingUpgrade || this.rerollsRemaining <= 0 || !this.currentSelection) {
      return false;
    }
    const { scene } = this;
    this.rerollsRemaining -= 1;
    scene.audio.play('ui-reroll');
    this.pendingUpgradeChoices = this.currentSelection.type === 'chest'
      ? scene.upgradeSystem.getRewardChoices(
        this.currentSelection.kind === 'boss' ? 4 : 3,
        scene.player,
        this.currentSelection.kind
      )
      : scene.upgradeSystem.getChoices(3, scene.player);
    scene.telemetry.record('upgradeRerolled', scene.time.now, {
      wave: scene.waveSystem.currentWave,
      selectionType: this.currentSelection.type,
      choices: this.pendingUpgradeChoices.map((choice) => choice.id)
    });
    scene.hud.showUpgradeChoices(this.pendingUpgradeChoices, {
      type: this.currentSelection.type,
      kind: this.currentSelection.kind,
      remaining: this.pendingLevelUps + this.rewardQueue.length,
      canReroll: false
    });
    return true;
  }

  chooseUpgrade(upgrade) {
    if (!upgrade || !this.choosingUpgrade) {
      return false;
    }
    const { scene } = this;
    const selection = this.currentSelection;
    const pauseMs = this.upgradeStartedAt ? scene.time.now - this.upgradeStartedAt : 0;
    scene.player.applyUpgrade(upgrade, scene);
    if (upgrade.category !== 'evolution') scene.audio.play('upgrade-select');
    scene.telemetry.addUpgradeChoice(
      scene.time.now,
      scene.waveSystem.currentWave,
      upgrade,
      pauseMs,
      selection?.type ?? 'level'
    );
    scene.productAnalytics.trackUpgrade(upgrade, {
      type: selection?.type ?? 'level',
      kind: selection?.kind ?? null,
      wave: scene.waveSystem.currentWave
    });
    if (selection?.type === 'level') {
      this.regularChoices += 1;
    } else if (selection?.type === 'chest') {
      scene.telemetry.addChestChoice(
        scene.time.now,
        scene.waveSystem.currentWave,
        selection.kind,
        upgrade,
        pauseMs
      );
    }
    this.choosingUpgrade = false;
    this.pendingUpgradeChoices = null;
    this.currentSelection = null;
    this.upgradeStartedAt = 0;
    scene.updateHud();
    this.openNextSelection();
    return true;
  }

  maybeChooseBotUpgrade(time) {
    if (!this.scene.bot.enabled || time < this.scene.bot.upgradeReadyAt || !this.pendingUpgradeChoices) {
      return;
    }
    this.chooseUpgrade(this.pickBotUpgrade(this.pendingUpgradeChoices));
  }

  pickBotUpgrade(choices) {
    const emergencyHeal = choices.find((choice) => choice.id === 'heal');
    if (emergencyHeal && this.scene.player.hp / this.scene.player.maxHp <= 0.55) {
      return emergencyHeal;
    }
    const hasSpectacle = this.scene.upgradeSystem.upgrades.some((upgrade) => (
      ['active', 'orbit', 'summon'].includes(upgrade.category)
      && this.scene.player.getUpgradeRank(upgrade.id) > 0
    ));
    if (!hasSpectacle) {
      const spectacle = choices.find((choice) => ['active', 'orbit', 'summon'].includes(choice.category));
      if (spectacle) {
        return spectacle;
      }
    }
    const profile = getPlayerProfile(this.scene.bot.strategy);
    const priorities = profile.upgradePriorities;
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
    this.scene.audio.stopAmbience(250);
    this.scene.audio.stopMusic(outcome === 'victory' ? 700 : 450);
    if (outcome === 'victory') {
      this.scene.time.delayedCall(560, () => this.scene.audio.play('victory'));
    } else {
      this.scene.audio.play('ui-denied', { volume: 0.34, priority: true });
    }
    this.scene.telemetry.finish(this.scene.time.now, outcome);
    const report = this.getRunReport();
    this.scene.productAnalytics.finishRun(report);
    report.newUnlocks = this.scene.meta.recordRun(report, this.scene.telemetry.events);
    report.metaReward = this.scene.meta.getLastRunReward();
    report.meta = this.scene.meta.getState();
    this.scene.hud.showEndScreen(title, message, report);
  }

  getRunReport() {
    const { scene } = this;
    const telemetry = scene.telemetry.getSummary(scene.time.now);
    const loadout = scene.loadout.getSnapshot();
    return {
      ...telemetry,
      rooster: {
        id: scene.player.roosterId,
        name: scene.roosterClasses.selected?.name ?? scene.player.roosterName
      },
      arena: { id: scene.arena.id, name: scene.arena.definition.name },
      challenge: scene.challenge.getState(),
      build: {
        active: loadout.active,
        passive: loadout.passive,
        evolutions: loadout.evolutions
      }
    };
  }
}
