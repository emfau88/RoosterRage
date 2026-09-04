import uiIconSheetUrl from '../assets/ui/ui-icons-v1-sheet.webp';
import uiIconAtlas from '../assets/ui/ui-icons-v1.json';
import acePortraitUrl from '../assets/characters/rooster-ace-portrait.webp';
import artilleryPortraitUrl from '../assets/characters/rooster-artillery-portrait.webp';
import stormPortraitUrl from '../assets/characters/rooster-storm-portrait.webp';
import kernelCurrencyUrl from '../assets/meta/kernel-currency.webp';
import masteryAceUrl from '../assets/meta/mastery-ace.webp';
import masteryArtilleryUrl from '../assets/meta/mastery-artillery.webp';
import masteryStormUrl from '../assets/meta/mastery-storm.webp';
import harvestYardPosterUrl from '../assets/map/posters/arena-poster-open-yard.webp';
import feedAlleyPosterUrl from '../assets/map/posters/arena-poster-vertical-run.webp';
import coopSquarePosterUrl from '../assets/map/posters/arena-poster-square-coop.webp';
import { getArenaDefinition } from '../data/arenaDefinitions.js';

const ROOSTER_PORTRAITS = {
  ace: acePortraitUrl,
  artillery: artilleryPortraitUrl,
  storm: stormPortraitUrl
};

const MASTERY_BADGES = {
  ace: masteryAceUrl,
  artillery: masteryArtilleryUrl,
  storm: masteryStormUrl
};

const ARENA_PREVIEWS = {
  'open-yard': {
    url: harvestYardPosterUrl,
    layout: 'Wide & open',
    scope: 'ENDLESS YARD'
  },
  'vertical-run': {
    url: feedAlleyPosterUrl,
    layout: 'North-south lane',
    scope: 'ENDLESS CORRIDOR'
  },
  'square-coop': {
    url: coopSquarePosterUrl,
    layout: 'Compact square',
    scope: 'FULL ARENA'
  }
};

const ICON_COLUMNS = uiIconAtlas.columns;
const ICON_ROWS = uiIconAtlas.rows;
const ICON_IDS_BY_NAME = {
  Heal: 'heal',
  'Double Shot': 'double-shot',
  'Triple Shot': 'triple-shot',
  'Fire Eggs': 'fire-eggs',
  'Faster Eggs': 'faster-eggs',
  'Max HP': 'max-hp',
  'Golden Egg': 'golden-egg',
  'Orbit Eggs': 'orbit-eggs',
  'Molotov Egg': 'molotov-egg',
  'Lightning Comb': 'lightning-comb',
  'Support Chick': 'support-chick',
  'Rocket Egg': 'rocket-egg',
  'Void Nest': 'void-nest',
  'Laser Comb': 'laser-comb',
  'Move Speed': 'move-speed',
  Armor: 'armor',
  Regen: 'regen',
  'XP Magnet': 'xp-magnet',
  'Piercing Eggs': 'piercing-eggs',
  'Bigger Eggs': 'bigger-eggs',
  'Swift Shells': 'faster-eggs',
  'Critical Yolk': 'fire-eggs',
  'Ricochet Eggs': 'piercing-eggs',
  'Shell Shock': 'bigger-eggs',
  'Second Wind': 'heal'
};
const ICON_ALIASES_BY_ID = {
  'swift-shells': 'faster-eggs',
  'critical-yolk': 'fire-eggs',
  'ricochet-eggs': 'piercing-eggs',
  'shell-shock': 'bigger-eggs',
  'second-wind': 'heal',
  'ace-deadeye-drill': 'fire-eggs',
  'ace-guidance-fins': 'faster-eggs',
  'artillery-reinforced-breech': 'bigger-eggs',
  'artillery-blast-plating': 'armor',
  'storm-static-plumage': 'lightning-comb',
  'storm-tailwind-training': 'move-speed',
  'evo-thunder-roost': 'evo-thunder-roost',
  'evo-shell-halo': 'evo-shell-halo',
  'evo-singularity-nest': 'evo-singularity-nest',
  'evo-dawn-laser': 'evo-dawn-laser',
  'evo-chick-squadron': 'evo-chick-squadron',
  'primary-ace': 'active-upgrade',
  'primary-artillery': 'rocket-egg',
  'primary-storm': 'lightning-comb'
};

export class HUD {
  constructor(onUpgradeSelected, onRestart, onFullscreen, onRoosterSelected, onReroll, onSettings, onAnalyticsConsent, onTalentPurchased) {
    this.onUpgradeSelected = onUpgradeSelected;
    this.onRestart = onRestart;
    this.onFullscreen = onFullscreen;
    this.onRoosterSelected = onRoosterSelected;
    this.onReroll = onReroll;
    this.onSettings = onSettings;
    this.onAnalyticsConsent = onAnalyticsConsent;
    this.onTalentPurchased = onTalentPurchased;
    this.recentUpgrade = null;
    this.upgradeConfirmationTimeout = null;
    this.multiKillTimeout = null;
    this.hubSelection = { roosterId: 'ace', challengeId: 'standard', view: 'play', talentId: null };
    document.documentElement.style.setProperty('--ui-icon-sheet', `url("${uiIconSheetUrl}")`);
    document.documentElement.style.setProperty('--ui-icon-columns', `${ICON_COLUMNS * 100}%`);
    document.documentElement.style.setProperty('--ui-icon-rows', `${ICON_ROWS * 100}%`);
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__identity" data-identity>
        <span class="hud__avatar-shell"><img data-rooster-avatar alt="Selected rooster"></span>
        <div class="hud__vitals">
          <div class="hud__identity-heading" data-level>
            <span><small>ROOSTER</small><strong data-value>Level 1</strong></span>
            <b data-hp-value aria-label="100 / 100 HP"><span data-hp-full>100 / 100 HP</span><span data-hp-compact aria-hidden="true">100/100</span></b>
          </div>
          <div class="hud__health" data-hp><i data-hp-fill></i></div>
          <div class="hud__xp-row"><span data-icon="xp"></span><div class="hud__bar-track"><div class="hud__bar-fill" data-xp></div></div></div>
        </div>
      </div>
      <div class="hud__metrics">
        <div class="hud__item" data-time><span data-icon="timer"></span><span><small>RUN</small><strong data-value><span data-value-full>00:00</span><span data-value-compact aria-hidden="true">00:00</span></strong></span></div>
        <div class="hud__item hud__item--wave" data-wave><span data-icon="wave"></span><span><small>WAVE</small><strong data-value><span data-value-full>Wave 1/10</span><span data-value-compact aria-hidden="true">1/10</span></strong></span><span class="hud__wave-track"><i data-wave-fill></i></span></div>
        <div class="hud__item" data-kills><span data-icon="enemy"></span><span><small>HUNT</small><strong data-value><span data-value-full>0 kills</span><span data-value-compact aria-hidden="true">0</span></strong></span></div>
      </div>
      <div class="hud__boss" data-boss>
        <div class="hud__boss-heading"><strong data-boss-name>BROOD KING</strong><span data-boss-phase>PHASE 1/3</span></div>
        <div class="hud__boss-track"><div class="hud__boss-fill" data-boss-fill></div></div>
      </div>
      <div class="hud__loadout">
        <div class="hud__upgrades" data-active-loadout></div>
        <div class="hud__upgrades hud__upgrades--passive" data-passive-loadout></div>
      </div>
      <div class="hud__controls">
        <button class="hud__icon-button" type="button" data-settings title="Pause and settings" aria-label="Pause and settings">
          <span class="settings-glyph" aria-hidden="true"><i></i><i></i></span>
        </button>
        <button class="hud__icon-button" type="button" data-fullscreen title="Fullscreen" aria-label="Toggle fullscreen">
          <span class="fullscreen-glyph" aria-hidden="true"></span>
        </button>
      </div>
    `;
    this.root.querySelectorAll('[data-icon]').forEach((icon) => this.setIcon(icon, icon.dataset.icon));
    this.root.querySelector('[data-fullscreen]').addEventListener('click', () => this.onFullscreen?.());
    this.root.querySelector('[data-settings]').addEventListener('click', () => this.onSettings?.());

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';

    this.joystick = document.createElement('div');
    this.joystick.className = 'joystick';
    this.joystick.innerHTML = '<div class="joystick__nub" data-nub></div>';
    this.nub = this.joystick.querySelector('[data-nub]');

    this.waveBanner = document.createElement('div');
    this.waveBanner.className = 'wave-banner';

    this.upgradeConfirmation = document.createElement('div');
    this.upgradeConfirmation.className = 'upgrade-confirmation';

    this.multiKill = document.createElement('div');
    this.multiKill.className = 'multi-kill';

    document.body.append(
      this.root,
      this.overlay,
      this.joystick,
      this.waveBanner,
      this.upgradeConfirmation,
      this.multiKill
    );
  }

  update(state) {
    const roosterLabel = state.roosterName ? `${state.roosterName} L${state.level}` : `Level ${state.level}`;
    this.root.querySelector('[data-level] [data-value]').textContent = roosterLabel;
    if (state.roosterId && state.roosterId !== this.roosterId) {
      this.roosterId = state.roosterId;
      const avatar = this.root.querySelector('[data-rooster-avatar]');
      avatar.src = ROOSTER_PORTRAITS[state.roosterId];
      avatar.alt = `${state.roosterName ?? state.roosterId} portrait`;
      this.root.querySelector('[data-identity]').dataset.rooster = state.roosterId;
    }
    const hpRatio = Math.max(0, Math.min(1, state.hp / state.maxHp));
    const hp = this.root.querySelector('[data-hp]');
    hp.classList.toggle('is-warning', hpRatio <= 0.55 && hpRatio > 0.25);
    hp.classList.toggle('is-danger', hpRatio <= 0.25);
    hp.querySelector('[data-hp-fill]').style.width = `${hpRatio * 100}%`;
    const hpValue = this.root.querySelector('[data-hp-value]');
    const hpText = `${Math.ceil(state.hp)} / ${state.maxHp} HP`;
    hpValue.querySelector('[data-hp-full]').textContent = hpText;
    hpValue.querySelector('[data-hp-compact]').textContent = `${Math.ceil(state.hp)}/${state.maxHp}`;
    hpValue.setAttribute('aria-label', hpText);
    const challengeSuffix = state.challenge?.id && state.challenge.id !== 'standard'
      ? ` · ${state.challenge.name}`
      : '';
    const formattedTime = this.formatTime(state.elapsed);
    this.setMetricValue('[data-wave]', `Wave ${state.wave}/10${challengeSuffix}`, `${state.wave}/10`);
    this.setMetricValue('[data-time]', formattedTime, formattedTime);
    const kills = state.kills ?? 0;
    this.setMetricValue('[data-kills]', `${kills} ${kills === 1 ? 'kill' : 'kills'}`, `${kills}`);
    this.root.querySelector('[data-xp]').style.width = `${state.xpPercent * 100}%`;
    this.root.querySelector('[data-wave-fill]').style.width = `${(state.waveProgress?.percent ?? 0) * 100}%`;
    const bossHud = this.root.querySelector('[data-boss]');
    this.root.classList.toggle('has-boss', Boolean(state.boss));
    bossHud.classList.toggle('is-visible', Boolean(state.boss));
    if (state.boss) {
      bossHud.querySelector('[data-boss-name]').textContent = state.boss.name;
      bossHud.querySelector('[data-boss-phase]').textContent = state.boss.protected
        ? 'ENTRY SHIELD'
        : `PHASE ${state.boss.phase}/3`;
      bossHud.querySelector('[data-boss-fill]').style.width = `${Math.max(0, state.boss.hp / state.boss.maxHp) * 100}%`;
    }
    this.renderLoadout(state.loadout);
  }

  setMetricValue(selector, fullText, compactText = fullText) {
    const value = this.root.querySelector(`${selector} [data-value]`);
    const full = value?.querySelector('[data-value-full]');
    const compact = value?.querySelector('[data-value-compact]');
    if (!value || !full || !compact) return;
    if (full.textContent !== fullText) full.textContent = fullText;
    if (compact.textContent !== compactText) compact.textContent = compactText;
    if (value.getAttribute('aria-label') !== fullText) value.setAttribute('aria-label', fullText);
  }

  showUpgradeChoices(choices, context = {}) {
    const chest = context.type === 'chest';
    const title = chest
      ? context.kind === 'boss' ? 'Royal Boss Chest'
        : context.kind === 'golden' ? 'Golden Champion Chest' : 'Elite Chest'
      : 'Level Up';
    const subtitle = chest
      ? 'Choose a guaranteed build reward.'
      : context.remaining > 0
        ? `Choose an upgrade. ${context.remaining} more will follow.`
        : 'Choose an upgrade.';
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel ${chest ? 'panel--reward' : ''}">
        <h2>${title}</h2>
        <p>${subtitle}</p>
        ${context.recentChoice ? `
          <div class="upgrade-selection-receipt">
            <span>✓ LAST PICK</span>
            <strong>${context.recentChoice.name} ${context.recentChoice.evolution ? 'EVO' : `R${context.recentChoice.nextRank ?? 1}`}</strong>
            <em>${context.recentChoice.momentTitle ?? context.recentChoice.name}</em>
          </div>
        ` : ''}
        <div class="upgrade-list"></div>
        ${context.canReroll ? '<button class="reroll-button" type="button">Reroll (1)</button>' : ''}
      </div>
    `;
    const list = this.overlay.querySelector('.upgrade-list');
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.className = `upgrade-button upgrade-button--${choice.rarity ?? 'common'}`;
      button.innerHTML = `
        <span class="upgrade-button__art">
          <span class="upgrade-button__rarity" data-rarity-icon></span>
          <span class="upgrade-button__icon" data-upgrade-icon></span>
        </span>
        <span class="upgrade-button__copy">
          <span class="upgrade-button__heading">
            <strong>${choice.name}</strong>
            <span class="upgrade-button__rank">${choice.rankDeltaLabel ?? choice.rankLabel ?? ''}</span>
          </span>
          ${this.renderRankPips(choice.rankProgress)}
          <span class="upgrade-button__meta">${choice.categoryLabel ?? choice.category}</span>
          <span class="upgrade-button__milestone">${choice.momentTitle ?? choice.name}</span>
          ${this.renderChangeItems(choice.changeItems)}
          <span class="upgrade-button__reward upgrade-button__reward--${choice.upgradeMoment ?? 'new'}">${
            choice.upgradeMoment === 'rank-up' ? 'Rank up'
              : choice.upgradeMoment === 'evolution' ? 'EVO ready'
                : choice.upgradeMoment === 'instant' ? 'Instant effect' : 'New ability'
          }</span>
          <span class="upgrade-button__description">${choice.description}</span>
          ${choice.synergyActive
            ? `<span class="upgrade-button__synergy">Synergy active: ${choice.synergyDescription}</span>`
            : ''}
          ${choice.evolutionHint
            ? `<span class="upgrade-button__evolution-hint"><strong>EVO-ZIEL · ${choice.evolutionHint.name}</strong><span class="${choice.evolutionHint.baseReady ? 'is-ready' : ''}">R4 ${choice.evolutionHint.baseReady ? '✓' : '○'}</span><span class="${choice.evolutionHint.passiveOwned ? 'is-ready' : ''}">${choice.evolutionHint.passiveName} ${choice.evolutionHint.passiveOwned ? '✓' : '○'}</span></span>`
            : ''}
        </span>
      `;
      this.setIcon(button.querySelector('[data-upgrade-icon]'), choice.id);
      this.setIcon(button.querySelector('[data-rarity-icon]'), `rarity-${choice.rarity ?? 'common'}`);
      button.addEventListener('click', () => this.onUpgradeSelected(choice), { once: true });
      list.append(button);
    });
    this.overlay.querySelector('.reroll-button')?.addEventListener('click', () => this.onReroll?.(), { once: true });
  }

  showRoosterSelection(definitions, hub = {}, onCosmeticSelected = null) {
    const progress = hub.progress ?? { totalRuns: 0, victories: 0, totalKills: 0 };
    const bests = hub.bests ?? { highestKills: 0, longestRunMs: 0, fastestVictoryMs: null };
    const currency = hub.currency ?? { kernels: 0, lifetimeKernels: 0 };
    const talentNodes = hub.talents?.nodes ?? [];
    const talentTotalRanks = hub.talents?.totalRanks ?? 0;
    const formatTalentValue = (talent, rank) => {
      const value = (talent.effect?.perRank ?? 0) * rank;
      const formatted = `${Number(value.toFixed(2))}`;
      const prefix = value > 0 ? '+' : '';
      return `${prefix}${formatted}${talent.effect?.unit ? ` ${talent.effect.unit}` : ''}`;
    };
    const talentNodeMarkup = (talent) => `
      <button type="button" data-talent="${talent.id}"
        class="talent-node ${talent.complete ? 'is-complete' : ''} ${talent.unlocked ? '' : 'is-locked'} ${talent.affordable ? 'is-affordable' : ''}"
        aria-pressed="false"
        aria-label="${talent.name}, ${talent.description} Rank ${talent.rank} of ${talent.maxRank}. ${talent.unlocked ? 'Open details' : talent.unlockLabel}">
        <span class="talent-node__frame">
          <span class="talent-node__icon" data-talent-icon="${talent.icon}"></span>
          <em>${talent.rank}/${talent.maxRank}</em>
          ${talent.unlocked ? '' : '<i aria-hidden="true"></i>'}
        </span>
        <span class="talent-node__copy">
          <strong>${talent.name}</strong>
          <small>${talent.description.replace(' per rank.', '/rank').replace('.', '')}</small>
        </span>
        <b>${talent.complete ? 'MAX' : talent.unlocked ? `${talent.nextCost} kernels` : 'Locked'}</b>
      </button>
    `;
    const talentTiers = [
      { numeral: 'I', title: 'Nest Foundation', unlockAt: 0, nodes: talentNodes.filter((talent) => talent.unlockAt < 3) },
      { numeral: 'II', title: 'Advanced Instincts', unlockAt: 3, nodes: talentNodes.filter((talent) => talent.unlockAt >= 3 && talent.unlockAt < 8) },
      { numeral: 'III', title: 'Royal Path', unlockAt: 8, nodes: talentNodes.filter((talent) => talent.unlockAt >= 8) }
    ];
    const talentBranchMarkup = (index) => `
      <div class="talent-tree__branches talent-tree__branches--${index === 0 ? 'roots' : 'crown'}" aria-hidden="true">
        <span></span>
      </div>
    `;
    const talentTree = talentTiers.map((tier, index) => `
      <section class="talent-tier talent-tier--${index + 1} ${tier.unlockAt > (hub.talents?.totalRanks ?? 0) ? 'is-locked' : ''}"
        data-talent-tier="${index + 1}">
        <header>
          <span>${tier.numeral}</span>
          <div><small>TIER ${tier.numeral}</small><strong>${tier.title}</strong></div>
          <em>${tier.unlockAt === 0 || talentTotalRanks >= tier.unlockAt ? 'Unlocked' : `${tier.unlockAt - talentTotalRanks} ranks missing`}</em>
        </header>
        <div class="talent-tier__nodes">${tier.nodes.map(talentNodeMarkup).join('')}</div>
      </section>
      ${index < talentTiers.length - 1 ? talentBranchMarkup(index) : ''}
    `).join('');
    let selectedChallenge = hub.selectedChallenge ?? 'standard';
    const standardArenaId = hub.standardArenaId ?? 'open-yard';
    const arenaCarouselChallenges = [];
    const carouselArenaIds = new Set();
    (hub.challenges ?? []).forEach((challenge) => {
      const arenaId = challenge.arenaId ?? standardArenaId;
      if (carouselArenaIds.has(arenaId)) return;
      carouselArenaIds.add(arenaId);
      arenaCarouselChallenges.push(challenge);
    });
    const challengeCards = (hub.challenges ?? []).map((challenge) => {
      const arena = getArenaDefinition(challenge.arenaId ?? standardArenaId);
      const preview = ARENA_PREVIEWS[arena.id] ?? ARENA_PREVIEWS['open-yard'];
      const status = challenge.unlocked
        ? (challenge.firstClearClaimed ? 'First clear complete' : `First clear +${challenge.firstClearReward} kernels`)
        : `Locked: ${challenge.unlockLabel}`;
      return `
        <button class="challenge-card ${challenge.id === selectedChallenge ? 'is-selected' : ''} ${challenge.unlocked ? '' : 'is-locked'}"
          type="button" data-challenge="${challenge.id}" data-arena="${arena.id}" data-unlocked="${challenge.unlocked}"
          aria-label="${challenge.name}, Arena ${arena.name}">
          <span class="challenge-card__visual" aria-hidden="true">
            <img src="${preview.url}" alt="">
            <i></i>
          </span>
          <span class="challenge-card__copy">
            <em>${arena.name} · ${preview.layout}</em>
            <strong>${challenge.name}</strong>
            <span class="challenge-card__description">${challenge.description}</span>
            <small>${status}</small>
          </span>
        </button>
      `;
    }).join('');
    const arenaCarouselDots = arenaCarouselChallenges.map((challenge, index) => {
      const arena = getArenaDefinition(challenge.arenaId ?? standardArenaId);
      return `<button type="button" data-arena-carousel-slide="${challenge.id}"
        aria-label="Map ${index + 1}: ${arena.name}"><span></span></button>`;
    }).join('');
    const historyRows = (hub.history ?? []).length
      ? hub.history.map((run) => `
        <li><strong>${run.roosterName}</strong><span>${run.outcome === 'victory' ? 'Victory' : 'Defeat'} · ${run.kills} kills · +${run.kernels ?? 0} kernels · ${this.formatDuration(run.elapsedMs)}</span></li>
      `).join('')
      : '<li><span>No runs saved yet.</span></li>';
    const historyToggle = (hub.history ?? []).length > 3
      ? '<button type="button" class="history-toggle" data-history-toggle aria-expanded="false">Show all runs</button>'
      : '';
    const enemyRows = (hub.lexicon?.enemies ?? []).map((enemy) => `
      <li class="${enemy.seen ? '' : 'is-undiscovered'}"><strong>${enemy.id.replaceAll('-', ' ')}</strong><span>${enemy.purpose} · ${enemy.counterplay}</span></li>
    `).join('');
    const evoRows = (hub.lexicon?.evolutions ?? []).map((evolution) => `
      <li class="${evolution.discovered ? '' : 'is-undiscovered'}"><strong>${evolution.name}</strong><span>${evolution.base.replaceAll('-', ' ')} + ${evolution.passive.replaceAll('-', ' ')}</span></li>
    `).join('');
    const unlockedDefinitions = definitions.filter((definition) => (
      hub.roosters?.find((rooster) => rooster.id === definition.id)?.unlocked ?? true
    ));
    const selectedRoosterAvailable = unlockedDefinitions.some((definition) => definition.id === this.hubSelection.roosterId);
    let selectedRoosterId = selectedRoosterAvailable
      ? this.hubSelection.roosterId
      : (unlockedDefinitions[0]?.id ?? definitions[0]?.id ?? 'ace');
    if ((hub.challenges ?? []).some((challenge) => challenge.id === this.hubSelection.challengeId && challenge.unlocked)) {
      selectedChallenge = this.hubSelection.challengeId;
    }
    this.hubSelection = { ...this.hubSelection, roosterId: selectedRoosterId, challengeId: selectedChallenge };
    const roosterSwitches = definitions.map((definition) => {
      const meta = hub.roosters?.find((rooster) => rooster.id === definition.id) ?? { unlocked: true };
      return `<button type="button" class="hub-rooster-switch ${definition.id === selectedRoosterId ? 'is-selected' : ''}"
        data-hub-rooster="${definition.id}" ${meta.unlocked ? '' : 'disabled'}
        aria-label="Select ${definition.name}">${definition.name}</button>`;
    }).join('');
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel rooster-panel henhouse-panel">
        <div class="henhouse-heading">
          <div><small>ROOSTER RAGE</small><h1>Henhouse</h1></div>
          <div class="henhouse-stats">
            <span class="henhouse-kernels"><img src="${kernelCurrencyUrl}" alt=""><strong>${currency.kernels}</strong> kernels</span>
          </div>
          <div class="henhouse-actions">
            <button type="button" class="henhouse-settings" data-hub-fullscreen title="Fullscreen" aria-label="Toggle fullscreen">
              <span class="henhouse-action__icon fullscreen-glyph" aria-hidden="true"></span>
              <span class="henhouse-action__label">Fullscreen</span>
            </button>
            <button type="button" class="henhouse-settings" data-hub-settings title="Settings" aria-label="Open settings">
              <span class="henhouse-action__icon settings-glyph" aria-hidden="true"><i></i><i></i></span>
              <span class="henhouse-action__label">Settings</span>
            </button>
          </div>
        </div>
        <nav class="henhouse-nav" aria-label="Henhouse sections">
          <button type="button" data-hub-tab="play" class="is-selected">Play</button>
          <button type="button" data-hub-tab="roosters">Roosters</button>
          <button type="button" data-hub-tab="training"><span class="hub-nav-label--desktop">Training</span><span class="hub-nav-label--mobile">Talents</span></button>
          <button type="button" data-hub-tab="archive">Archive</button>
        </nav>
        <section class="henhouse-view is-active" data-hub-view="play">
          <div class="henhouse-play-grid">
            <article class="hub-run-card">
              <div class="hub-run-spotlight" aria-label="Map preview, swipe horizontally">
                <div class="hub-arena-showcase" data-arena-showcase>
                  <img data-arena-preview alt="" loading="eager">
                  <span class="hub-arena-showcase__shade"></span>
                  <span class="hub-arena-showcase__identity">
                    <small data-run-scope></small>
                    <strong data-run-arena>OPEN YARD</strong>
                    <em data-run-layout></em>
                  </span>
                </div>
                <div class="hub-run-summary">
                  <small>PREPARE RUN</small>
                  <h2 data-run-challenge>STANDARD RUN</h2>
                  <p data-run-description></p>
                  <div class="hub-run-best">
                    <span><small>WAVES</small><strong>10</strong></span>
                    <span><small>BEST HUNT</small><strong>${bests.highestKills} kills</strong></span>
                    <span data-run-reward></span>
                  </div>
                </div>
                <div class="hub-arena-carousel-controls" aria-label="Browse maps">
                  <button type="button" class="hub-arena-carousel-arrow is-previous" data-arena-carousel-previous aria-label="Previous map">‹</button>
                  <div class="hub-arena-carousel-progress">
                    <small data-arena-carousel-status>1 / ${arenaCarouselChallenges.length} · SWIPE</small>
                    <span>${arenaCarouselDots}</span>
                  </div>
                  <button type="button" class="hub-arena-carousel-arrow is-next" data-arena-carousel-next aria-label="Next map">›</button>
                </div>
              </div>
              <div class="hub-mode-heading"><small>CHOOSE EXPEDITION</small><span>Every mode changes the yard and the pressure.</span></div>
              <div class="challenge-list hub-challenge-list">${challengeCards}</div>
            </article>
            <article class="hub-rooster-hero">
              <div class="hub-rooster-hero__portrait">
                <img data-hero-portrait alt="Selected rooster">
                <span class="hub-rooster-hero__shade"></span>
                <img data-hero-mastery-badge class="hub-rooster-hero__badge" alt="Mastery badge">
              </div>
              <div class="hub-rooster-hero__copy">
                <small>YOUR ROOSTER</small>
                <h2 data-hero-name></h2>
                <strong data-hero-role></strong>
                <p data-hero-description></p>
                <div class="hub-rooster-mastery"><span data-hero-mastery></span><i><b data-hero-progress></b></i></div>
              </div>
              <div class="hub-rooster-switches hub-rooster-switches--desktop">${roosterSwitches}</div>
              <button type="button" class="hub-rooster-change" data-rooster-picker-open aria-expanded="false">Change</button>
              <button type="button" class="hub-start-button" data-run-start><span>START RUN</span><small>Enter the yard</small></button>
            </article>
          </div>
          <button type="button" class="hub-rooster-picker__scrim" data-rooster-picker-close aria-label="Close rooster selection" hidden></button>
          <aside class="hub-rooster-picker" data-rooster-picker aria-label="Choose rooster" hidden>
            <header><span><small>YOUR ROOSTER</small><strong>Choose rooster</strong></span><button type="button" data-rooster-picker-close aria-label="Close rooster selection">×</button></header>
            <div class="hub-rooster-switches hub-rooster-switches--mobile">${roosterSwitches}</div>
          </aside>
        </section>
        <section class="henhouse-view" data-hub-view="roosters" hidden>
          <div class="henhouse-section-heading"><span><small>ROOSTERS</small><h2>Roosters</h2></span><p>Stats, mastery, cosmetics, and unlocks.</p></div>
          <div class="rooster-list"></div>
        </section>
        <section class="henhouse-view" data-hub-view="training" hidden>
          <div class="henhouse-section-heading talent-heading">
            <span><small>PERMANENT</small><h2>Talent Nest</h2></span>
            <div class="talent-summary" aria-label="Talent progress">
              <span><small>INVESTED</small><strong>${talentTotalRanks}</strong><em>ranks</em></span>
              <span><small>EARNED</small><strong>${currency.lifetimeKernels}</strong><em>kernels</em></span>
            </div>
          </div>
          <p class="talent-intro">Choose a talent to preview its effect, next rank, and cost before upgrading.</p>
          <div class="talent-tree" aria-label="Talent progress">${talentTree}</div>
          <div class="talent-inspector-layer" data-talent-detail hidden>
            <button type="button" class="talent-inspector__scrim" data-talent-close tabindex="-1" aria-label="Close talent details"></button>
            <section class="talent-inspector" role="dialog" aria-modal="true" aria-labelledby="talent-detail-name">
              <span class="talent-inspector__handle" aria-hidden="true"></span>
              <button type="button" class="talent-inspector__close" data-talent-close aria-label="Close talent details">×</button>
              <header>
                <span class="talent-inspector__icon-frame"><span data-talent-detail-icon></span></span>
                <span><small data-talent-detail-tier></small><h3 id="talent-detail-name" data-talent-detail-name></h3><em data-talent-detail-rank></em></span>
              </header>
              <p data-talent-detail-description></p>
              <div class="talent-inspector__values">
                <span><small>CURRENT</small><strong data-talent-current></strong></span>
                <i aria-hidden="true">→</i>
                <span><small>NEXT RANK</small><strong data-talent-next></strong></span>
                <span><small>MAXIMUM</small><strong data-talent-max></strong></span>
              </div>
              <p class="talent-inspector__status" data-talent-detail-status></p>
              <button type="button" class="talent-inspector__purchase" data-talent-purchase></button>
              <small class="talent-inspector__hint">Selection previews. Only the button upgrades the talent.</small>
            </section>
          </div>
        </section>
        <section class="henhouse-view" data-hub-view="archive" hidden>
          <div class="henhouse-section-heading"><span><small>PROGRESS</small><h2>Archive</h2></span><p>Personal bests, recent runs, and discovered enemies/EVOs.</p></div>
          <div class="henhouse-archive-stats">
            <span><small>Runs</small><strong>${progress.totalRuns}</strong></span>
            <span><small>Victories</small><strong>${progress.victories}</strong></span>
            <span><small>Kills</small><strong>${progress.totalKills}</strong></span>
          </div>
          <div class="henhouse-records"><small>RECORDS</small><div class="personal-bests"><span><small>Most kills</small><strong>${bests.highestKills}</strong></span><span><small>Fastest victory</small><strong>${bests.fastestVictoryMs === null ? '–' : this.formatDuration(bests.fastestVictoryMs)}</strong></span><span><small>Longest run</small><strong>${this.formatDuration(bests.longestRunMs)}</strong></span></div></div>
          <div class="henhouse-drawers">
            <details open><summary>Run History</summary><ul class="history-list">${historyRows}</ul>${historyToggle}</details>
            <details><summary>Enemy Lexicon</summary><ul class="lexicon-list">${enemyRows}</ul></details>
            <details><summary>EVO Lexicon</summary><ul class="lexicon-list">${evoRows}</ul></details>
          </div>
        </section>
      </div>
    `;
    const list = this.overlay.querySelector('.rooster-list');
    this.overlay.querySelectorAll('[data-talent-icon]').forEach((icon) => this.setIcon(icon, icon.dataset.talentIcon));
    const talentDetail = this.overlay.querySelector('[data-talent-detail]');
    const talentPurchase = this.overlay.querySelector('[data-talent-purchase]');
    let talentReturnFocus = null;
    const closeTalentDetail = () => {
      if (!talentDetail) return;
      this.hubSelection.talentId = null;
      if (talentDetail.hidden) return;
      talentDetail.hidden = true;
      this.overlay.querySelectorAll('[data-talent]').forEach((button) => {
        button.classList.remove('is-selected');
        button.setAttribute('aria-pressed', 'false');
      });
      talentReturnFocus?.focus({ preventScroll: true });
      talentReturnFocus = null;
    };
    const openTalentDetail = (talentId, focusDialog = true) => {
      const talent = talentNodes.find((candidate) => candidate.id === talentId);
      if (!talent || !talentDetail || !talentPurchase) return;
      const tierIndex = talentTiers.findIndex((tier) => tier.nodes.some((candidate) => candidate.id === talent.id));
      const selectedButton = this.overlay.querySelector(`[data-talent="${talent.id}"]`);
      talentReturnFocus = selectedButton;
      this.hubSelection.talentId = talent.id;
      this.overlay.querySelectorAll('[data-talent]').forEach((button) => {
        const selected = button.dataset.talent === talent.id;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', `${selected}`);
      });
      this.setIcon(talentDetail.querySelector('[data-talent-detail-icon]'), talent.icon);
      talentDetail.querySelector('[data-talent-detail-tier]').textContent = `TIER ${talentTiers[tierIndex]?.numeral ?? 'I'} · ${talent.effect?.label ?? 'Permanent bonus'}`;
      talentDetail.querySelector('[data-talent-detail-name]').textContent = talent.name;
      talentDetail.querySelector('[data-talent-detail-rank]').textContent = `Rank ${talent.rank}/${talent.maxRank}`;
      talentDetail.querySelector('[data-talent-detail-description]').textContent = talent.description;
      talentDetail.querySelector('[data-talent-current]').textContent = formatTalentValue(talent, talent.rank);
      talentDetail.querySelector('[data-talent-next]').textContent = talent.complete
        ? 'MAX'
        : formatTalentValue(talent, talent.rank + 1);
      talentDetail.querySelector('[data-talent-max]').textContent = formatTalentValue(talent, talent.maxRank);
      const status = talentDetail.querySelector('[data-talent-detail-status]');
      talentPurchase.dataset.talentPurchase = talent.id;
      talentPurchase.disabled = talent.complete || !talent.unlocked || !talent.affordable;
      talentPurchase.classList.toggle('is-ready', talent.affordable);
      if (talent.complete) {
        status.textContent = 'This talent is fully upgraded.';
        talentPurchase.textContent = 'Fully upgraded';
      } else if (!talent.unlocked) {
        status.textContent = `Locked · ${talent.unlockLabel}. You can still preview its effect and maximum value.`;
        talentPurchase.textContent = talent.unlockLabel;
      } else if (!talent.affordable) {
        const missingKernels = Math.max(0, talent.nextCost - currency.kernels);
        status.textContent = `You need ${missingKernels} more kernels for the next rank.`;
        talentPurchase.textContent = `${talent.nextCost} kernels required`;
      } else {
        status.textContent = `${currency.kernels} kernels available · ${currency.kernels - talent.nextCost} will remain.`;
        talentPurchase.textContent = `Upgrade for ${talent.nextCost} kernels`;
      }
      talentDetail.hidden = false;
      if (focusDialog) {
        requestAnimationFrame(() => talentDetail.querySelector('.talent-inspector__close')?.focus({ preventScroll: true }));
      }
    };
    this.overlay.querySelectorAll('[data-talent]').forEach((button) => {
      button.addEventListener('click', () => openTalentDetail(button.dataset.talent));
    });
    this.overlay.querySelectorAll('[data-talent-close]').forEach((button) => {
      button.addEventListener('click', closeTalentDetail);
    });
    talentPurchase?.addEventListener('click', () => {
      if (!talentPurchase.disabled) this.onTalentPurchased?.(talentPurchase.dataset.talentPurchase);
    });
    this.overlay.onkeydown = (event) => {
      if (!talentDetail?.isConnected || talentDetail.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTalentDetail();
      } else if (event.key === 'Tab') {
        const focusable = [...talentDetail.querySelectorAll('button:not(:disabled)')]
          .filter((button) => button.tabIndex >= 0);
        if (!focusable.length) return;
        const activeIndex = focusable.indexOf(document.activeElement);
        const nextIndex = event.shiftKey
          ? (activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1)
          : (activeIndex >= focusable.length - 1 ? 0 : activeIndex + 1);
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    };
    this.overlay.querySelector('[data-hub-settings]')?.addEventListener('click', () => this.onSettings?.());
    this.overlay.querySelector('[data-hub-fullscreen]')?.addEventListener('click', () => this.onFullscreen?.());
    definitions.forEach((definition) => {
      const meta = hub.roosters?.find((rooster) => rooster.id === definition.id)
        ?? { unlocked: true, cosmetics: [], runs: 0, wins: 0 };
      const mastery = meta.mastery
        ?? { level: 1, maxLevel: 5, progress: 0, xp: 0, nextTarget: 120, badgeUnlocked: false };
      const entry = document.createElement('div');
      entry.className = 'rooster-entry';
      const button = document.createElement('button');
      button.className = `rooster-card rooster-card--${definition.id} ${definition.id === selectedRoosterId ? 'is-selected' : ''} ${meta.unlocked ? '' : 'is-locked'}`;
      button.type = 'button';
      button.dataset.unlocked = `${meta.unlocked}`;
      button.setAttribute('aria-expanded', `${definition.id === selectedRoosterId}`);
      button.setAttribute(
        'aria-label',
        meta.unlocked
          ? `${definition.name}: show details`
          : `${definition.name}: show preview, locked: ${meta.unlockLabel}`
      );
      button.innerHTML = `
        <span class="rooster-card__portrait">
          <img class="rooster-card__portrait-image" src="${ROOSTER_PORTRAITS[definition.id]}" alt="${definition.name} portrait">
          <span class="rooster-card__portrait-shade"></span>
          <span class="rooster-card__header">
            <span class="rooster-card__icon" data-rooster-icon></span>
            <span>
            <strong>${definition.name}</strong>
            <small>${definition.role}</small>
            </span>
            <img class="rooster-card__mastery-badge ${mastery.badgeUnlocked ? '' : 'is-locked'}"
              src="${MASTERY_BADGES[definition.id]}" alt="${definition.name} mastery badge">
          </span>
        </span>
        <span class="rooster-card__compact-copy">
          <small>${meta.unlocked ? 'AVAILABLE' : 'LOCKED · PREVIEW'}</small>
          <strong>${definition.name}</strong>
          <span>${definition.role}</span>
          <em>${meta.unlocked ? 'Tap for details' : `Unlock: ${meta.unlockLabel}`}</em>
        </span>
        <span class="rooster-card__stats">
          <span>HP ${definition.stats.maxHp}</span>
          <span>SPD ${definition.stats.speed}</span>
          <span>DMG ${definition.stats.projectileDamage}</span>
        </span>
        <span class="rooster-card__primary">${definition.primary.name}: ${definition.description}</span>
        <span class="rooster-card__passive">${definition.passive}</span>
        <span class="rooster-card__mastery">
          <span><strong>Mastery ${mastery.level}/${mastery.maxLevel}</strong><small>${mastery.nextTarget === null ? `${mastery.xp} XP · MAX` : `${mastery.xp}/${mastery.nextTarget} XP`}</small></span>
          <i><b style="width:${Math.round(mastery.progress * 100)}%"></b></i>
        </span>
        <span class="rooster-card__progress">${meta.unlocked ? `${meta.runs} runs · ${meta.wins} victories` : `Locked: ${meta.unlockLabel}`}</span>
      `;
      this.setIcon(button.querySelector('[data-rooster-icon]'), definition.icon);
      button.addEventListener('click', () => {
        this.overlay.querySelectorAll('.rooster-card').forEach((candidate) => {
          const expanded = candidate === button;
          candidate.classList.toggle('is-selected', expanded);
          candidate.setAttribute('aria-expanded', `${expanded}`);
        });
      });
      entry.append(button);
      const chooseButton = document.createElement('button');
      chooseButton.className = 'rooster-card__choose';
      chooseButton.type = 'button';
      chooseButton.disabled = !meta.unlocked;
      chooseButton.innerHTML = meta.unlocked
        ? `<span>PLAY AS ${definition.name.toUpperCase()}</span><small>Confirm selection</small>`
        : `<span>STILL LOCKED</span><small>${meta.unlockLabel}</small>`;
      chooseButton.addEventListener('click', () => {
        if (!meta.unlocked) return;
        selectedRoosterId = definition.id;
        this.hubSelection.roosterId = definition.id;
        updateSelectedRooster();
        switchHubView('play');
      });
      entry.append(chooseButton);
      if (meta.cosmetics?.length) {
        const variant = meta.cosmetics[0];
        const tint = `#${Math.max(0, variant.tint ?? 0xffffff).toString(16).padStart(6, '0').slice(-6)}`;
        const cosmetics = document.createElement('div');
        cosmetics.className = 'cosmetic-panel';
        cosmetics.innerHTML = `
          <div class="cosmetic-panel__heading">
            <span>VISUAL ONLY</span>
            <strong>No stat changes</strong>
            <button type="button" class="cosmetic-panel__toggle" data-cosmetic-toggle aria-expanded="false">Show</button>
          </div>
          <div class="cosmetic-preview" aria-label="Preview Original and ${variant.name}">
            <figure class="${meta.selectedCosmetic ? '' : 'is-selected'}">
              <span class="cosmetic-preview__image"><img src="${ROOSTER_PORTRAITS[definition.id]}" alt=""><i></i></span>
              <figcaption>Original</figcaption>
            </figure>
            <span class="cosmetic-preview__arrow" aria-hidden="true">→</span>
            <figure class="${meta.selectedCosmetic === variant.id ? 'is-selected' : ''} ${variant.unlocked ? '' : 'is-locked'}">
              <span class="cosmetic-preview__image"><img src="${ROOSTER_PORTRAITS[definition.id]}" alt=""><i style="--cosmetic-tint:${tint}"></i></span>
              <figcaption>${variant.name}${variant.unlocked ? '' : ' · Preview'}</figcaption>
            </figure>
          </div>
          <p class="cosmetic-panel__unlock"><b>Unlock:</b> ${variant.unlockLabel}</p>
          <div class="cosmetic-list">
            <button type="button" data-cosmetic="" class="${meta.selectedCosmetic ? '' : 'is-selected'}"
              ${meta.unlocked ? '' : 'disabled'}>Original</button>
            ${meta.cosmetics.map((cosmetic) => `
              <button type="button" data-cosmetic="${cosmetic.id}" class="${meta.selectedCosmetic === cosmetic.id ? 'is-selected' : ''}"
                ${cosmetic.unlocked ? '' : 'disabled'} title="${cosmetic.unlocked ? cosmetic.name : cosmetic.unlockLabel}">
                ${cosmetic.name}${cosmetic.unlocked ? '' : ' · Locked'}
              </button>
            `).join('')}
          </div>`;
        cosmetics.querySelectorAll('[data-cosmetic]').forEach((cosmeticButton) => {
          cosmeticButton.addEventListener('click', () => onCosmeticSelected?.(
            definition.id,
            cosmeticButton.dataset.cosmetic || null,
            selectedChallenge
          ));
        });
        cosmetics.querySelector('[data-cosmetic-toggle]')?.addEventListener('click', (event) => {
          const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
          event.currentTarget.setAttribute('aria-expanded', `${!expanded}`);
          cosmetics.classList.toggle('is-expanded', !expanded);
          event.currentTarget.textContent = expanded ? 'Show' : 'Close';
        });
        entry.append(cosmetics);
      }
      list.append(entry);
    });
    const updateSelectedRooster = () => {
      const definition = definitions.find((candidate) => candidate.id === selectedRoosterId) ?? definitions[0];
      const meta = hub.roosters?.find((rooster) => rooster.id === definition.id)
        ?? { mastery: { level: 1, maxLevel: 5, progress: 0 } };
      const mastery = meta.mastery ?? { level: 1, maxLevel: 5, progress: 0 };
      const portrait = this.overlay.querySelector('[data-hero-portrait]');
      portrait.src = ROOSTER_PORTRAITS[definition.id];
      portrait.alt = `${definition.name} portrait`;
      const badge = this.overlay.querySelector('[data-hero-mastery-badge]');
      badge.src = MASTERY_BADGES[definition.id];
      badge.alt = `${definition.name} mastery badge`;
      badge.classList.toggle('is-locked', !mastery.badgeUnlocked);
      this.overlay.querySelector('[data-hero-name]').textContent = definition.name;
      this.overlay.querySelector('[data-hero-role]').textContent = definition.role;
      this.overlay.querySelector('[data-hero-description]').textContent = `${definition.primary.name}: ${definition.description}`;
      this.overlay.querySelector('[data-hero-mastery]').textContent = `Mastery ${mastery.level}/${mastery.maxLevel}`;
      this.overlay.querySelector('[data-hero-progress]').style.width = `${Math.round(mastery.progress * 100)}%`;
      this.overlay.querySelectorAll('[data-hub-rooster]').forEach((candidate) => (
        candidate.classList.toggle('is-selected', candidate.dataset.hubRooster === definition.id)
      ));
      this.overlay.querySelectorAll('.rooster-card').forEach((candidate) => (
        candidate.classList.toggle('is-selected', candidate.classList.contains(`rooster-card--${definition.id}`))
      ));
      this.overlay.querySelectorAll('.rooster-card').forEach((candidate) => (
        candidate.setAttribute('aria-expanded', `${candidate.classList.contains('is-selected')}`)
      ));
    };
    const updateChallenge = () => {
      const challenge = (hub.challenges ?? []).find((candidate) => candidate.id === selectedChallenge)
        ?? hub.challenges?.[0];
      if (!challenge) return;
      const arena = getArenaDefinition(challenge.arenaId ?? standardArenaId);
      const preview = ARENA_PREVIEWS[arena.id] ?? ARENA_PREVIEWS['open-yard'];
      const previewImage = this.overlay.querySelector('[data-arena-preview]');
      previewImage.src = preview.url;
      previewImage.alt = `${arena.name} arena poster`;
      this.overlay.querySelector('[data-arena-showcase]').dataset.arena = arena.id;
      const henhousePanel = this.overlay.querySelector('.henhouse-panel');
      henhousePanel.dataset.arena = arena.id;
      henhousePanel.style.setProperty('--hub-poster', `url("${preview.url}")`);
      this.overlay.querySelector('[data-run-arena]').textContent = arena.name.toUpperCase();
      this.overlay.querySelector('[data-run-layout]').textContent = preview.layout;
      this.overlay.querySelector('[data-run-scope]').textContent = preview.scope;
      this.overlay.querySelector('[data-run-challenge]').textContent = challenge.name.toUpperCase();
      this.overlay.querySelector('[data-run-description]').textContent = challenge.description;
      this.overlay.querySelector('[data-run-reward]').innerHTML = `<small>REWARD</small><strong>${challenge.firstClearClaimed ? 'First clear complete' : `+${challenge.firstClearReward} kernels`}</strong>`;
      const startButton = this.overlay.querySelector('[data-run-start]');
      startButton.disabled = !challenge.unlocked;
      startButton.classList.toggle('is-locked', !challenge.unlocked);
      startButton.querySelector('span').textContent = challenge.unlocked ? 'START RUN' : 'STILL LOCKED';
      startButton.querySelector('small').textContent = challenge.unlocked ? 'Enter the yard' : challenge.unlockLabel;
      this.overlay.querySelectorAll('[data-challenge]').forEach((candidate) => (
        candidate.classList.toggle('is-selected', candidate.dataset.challenge === challenge.id)
      ));
      const carouselIndex = Math.max(0, arenaCarouselChallenges.findIndex((candidate) => (
        (candidate.arenaId ?? standardArenaId) === arena.id
      )));
      const carouselStatus = this.overlay.querySelector('[data-arena-carousel-status]');
      if (carouselStatus) carouselStatus.textContent = `${carouselIndex + 1} / ${arenaCarouselChallenges.length} · SWIPE`;
      this.overlay.querySelectorAll('[data-arena-carousel-slide]').forEach((dot, index) => {
        const active = index === carouselIndex;
        dot.classList.toggle('is-selected', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      this.overlay.querySelector('.hub-run-spotlight')?.style.setProperty('--carousel-index', carouselIndex);
    };
    const selectCarouselIndex = (index) => {
      if (!arenaCarouselChallenges.length) return;
      const normalizedIndex = (index + arenaCarouselChallenges.length) % arenaCarouselChallenges.length;
      selectedChallenge = arenaCarouselChallenges[normalizedIndex].id;
      this.hubSelection.challengeId = selectedChallenge;
      updateChallenge();
    };
    const moveCarousel = (direction) => {
      const currentChallenge = (hub.challenges ?? []).find((candidate) => candidate.id === selectedChallenge);
      const currentArenaId = currentChallenge?.arenaId ?? standardArenaId;
      const currentIndex = Math.max(0, arenaCarouselChallenges.findIndex((candidate) => (
        (candidate.arenaId ?? standardArenaId) === currentArenaId
      )));
      selectCarouselIndex(currentIndex + direction);
    };
    const switchHubView = (view) => {
      const target = this.overlay.querySelector(`[data-hub-view="${view}"]`) ? view : 'play';
      if (target !== 'training') closeTalentDetail();
      if (target !== 'play') closeRoosterPicker();
      this.hubSelection.view = target;
      this.overlay.querySelectorAll('[data-hub-view]').forEach((section) => {
        const active = section.dataset.hubView === target;
        section.hidden = !active;
        section.classList.toggle('is-active', active);
      });
      this.overlay.querySelectorAll('[data-hub-tab]').forEach((button) => (
        button.classList.toggle('is-selected', button.dataset.hubTab === target)
      ));
    };
    const roosterPicker = this.overlay.querySelector('[data-rooster-picker]');
    const roosterPickerScrim = this.overlay.querySelector('.hub-rooster-picker__scrim');
    const roosterPickerTrigger = this.overlay.querySelector('[data-rooster-picker-open]');
    const closeRoosterPicker = () => {
      if (!roosterPicker || !roosterPickerScrim) return;
      roosterPicker.hidden = true;
      roosterPickerScrim.hidden = true;
      roosterPickerTrigger?.setAttribute('aria-expanded', 'false');
    };
    const openRoosterPicker = () => {
      if (!roosterPicker || !roosterPickerScrim) return;
      roosterPicker.hidden = false;
      roosterPickerScrim.hidden = false;
      roosterPickerTrigger?.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => roosterPicker.querySelector('.hub-rooster-switch.is-selected')?.focus({ preventScroll: true }));
    };
    roosterPickerTrigger?.addEventListener('click', openRoosterPicker);
    this.overlay.querySelectorAll('[data-rooster-picker-close]').forEach((button) => {
      button.addEventListener('click', closeRoosterPicker);
    });
    this.overlay.querySelectorAll('[data-hub-tab]').forEach((button) => {
      button.addEventListener('click', () => switchHubView(button.dataset.hubTab));
    });
    this.overlay.querySelectorAll('[data-hub-rooster]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedRoosterId = button.dataset.hubRooster;
        this.hubSelection.roosterId = selectedRoosterId;
        updateSelectedRooster();
        closeRoosterPicker();
      });
    });
    this.overlay.querySelector('[data-history-toggle]')?.addEventListener('click', (event) => {
      const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
      event.currentTarget.setAttribute('aria-expanded', `${!expanded}`);
      event.currentTarget.closest('details')?.classList.toggle('is-history-expanded', !expanded);
      event.currentTarget.textContent = expanded ? 'Show all runs' : 'Show less';
    });
    this.overlay.querySelectorAll('[data-challenge]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedChallenge = button.dataset.challenge;
        this.hubSelection.challengeId = selectedChallenge;
        updateChallenge();
      });
    });
    this.overlay.querySelector('[data-arena-carousel-previous]')?.addEventListener('click', () => moveCarousel(-1));
    this.overlay.querySelector('[data-arena-carousel-next]')?.addEventListener('click', () => moveCarousel(1));
    this.overlay.querySelectorAll('[data-arena-carousel-slide]').forEach((button, index) => {
      button.addEventListener('click', () => selectCarouselIndex(index));
    });
    const arenaSpotlight = this.overlay.querySelector('.hub-run-spotlight');
    let carouselSwipeStart = null;
    arenaSpotlight?.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button')) return;
      carouselSwipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    });
    arenaSpotlight?.addEventListener('pointerup', (event) => {
      if (!carouselSwipeStart || carouselSwipeStart.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - carouselSwipeStart.x;
      const deltaY = event.clientY - carouselSwipeStart.y;
      carouselSwipeStart = null;
      if (Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        moveCarousel(deltaX < 0 ? 1 : -1);
      }
    });
    arenaSpotlight?.addEventListener('pointercancel', () => {
      carouselSwipeStart = null;
    });
    this.overlay.querySelector('[data-run-start]')?.addEventListener('click', () => (
      this.overlay.querySelector('[data-run-start]').disabled
        ? null
        : this.onRoosterSelected?.(selectedRoosterId, selectedChallenge)
    ));
    updateSelectedRooster();
    updateChallenge();
    switchHubView(this.hubSelection.view);
    if (this.hubSelection.view === 'training' && this.hubSelection.talentId) {
      openTalentDetail(this.hubSelection.talentId, false);
    }
  }

  showEndScreen(title, message, report = {}) {
    const sources = report.combatSources ?? [];
    const sourceRows = sources.length
      ? sources.slice(0, 10).map((source) => `
        <tr>
          <td>${this.formatSource(source.source)}</td>
          <td>${Math.round(source.effectiveDamage)}</td>
          <td>${Math.round(source.damageShare * 100)}%</td>
          <td>${source.hitRate === null ? '–' : `${Math.round(source.hitRate * 100)}%`}</td>
          <td>${source.kills}</td>
          <td>${Math.round(source.overkillRatio * 100)}%</td>
          <td>${this.formatDuration(source.usageMs)}</td>
        </tr>`).join('')
      : '<tr><td colspan="7">No combat data yet.</td></tr>';
    const build = report.build ?? { active: [], passive: [], evolutions: [] };
    const active = build.active
      .map((entry) => `<span>${entry.name} ${entry.rank === 'EVO' ? 'EVO' : `R${entry.rank}`}</span>`)
      .join('');
    const passive = build.passive
      .map((entry) => `<span>${entry.name} R${entry.rank}</span>`)
      .join('');
    const evos = build.evolutions.map((entry) => entry.name).join(', ') || 'None';
    const unlockLabels = {
      rooster: 'Rooster',
      challenge: 'Challenge',
      cosmetic: 'Cosmetic',
      mastery: 'Mastery',
      'first-clear': 'First clear'
    };
    const unlocks = (report.newUnlocks ?? []).map((unlock) => `
      <span><strong>${unlockLabels[unlock.type] ?? 'Progress'}</strong>${this.formatSource(unlock.id)}</span>
    `).join('');
    const metaReward = report.metaReward;
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel run-report">
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="run-report__summary">
          <span><small>Rooster</small><strong>${report.rooster?.name ?? 'Unknown'}</strong></span>
          <span><small>Arena</small><strong>${report.arena?.name ?? 'Unknown'}</strong></span>
          <span><small>Mode</small><strong>${report.challenge?.name ?? 'Standard Run'}</strong></span>
          <span><small>Time</small><strong>${this.formatDuration(report.elapsedMs ?? 0)}</strong></span>
          <span><small>Kills</small><strong>${report.kills ?? 0}</strong></span>
          <span><small>Hits</small><strong>${report.shots ? `${Math.round(Math.min(1, report.hits / report.shots) * 100)}%` : '–'}</strong></span>
          <span><small>Peak</small><strong>${report.maxEnemiesAlive ?? 0}</strong></span>
          <span><small>Death cause</small><strong>${this.formatSource(report.deathCause ?? '–')}</strong></span>
          <span><small>EVOs</small><strong>${build.evolutions.length}</strong></span>
        </div>
        <div class="run-report__build"><strong>Active</strong>${active || '<span>–</span>'}</div>
        <div class="run-report__build run-report__build--passive"><strong>Passive</strong>${passive || '<span>–</span>'}</div>
        <p class="run-report__evos"><strong>EVO:</strong> ${evos}</p>
        ${metaReward ? `<div class="run-report__meta-reward">
          <img src="${kernelCurrencyUrl}" alt="Kernels">
          <span><strong>+${metaReward.earnedKernels} kernels</strong><small>Run ${metaReward.runKernels}${metaReward.firstClearKernels ? ` · First clear ${metaReward.firstClearKernels}` : ''}${metaReward.masteryKernels ? ` · Mastery ${metaReward.masteryKernels}` : ''} · Balance ${metaReward.balance}</small></span>
          <b>Mastery ${metaReward.masteryLevel} · +${metaReward.masteryXp} XP</b>
        </div>` : ''}
        ${unlocks ? `<div class="run-report__unlocks"><h2>Newly unlocked</h2>${unlocks}</div>` : ''}
        <div class="run-report__table-wrap">
          <table>
            <thead><tr><th>Source</th><th>Damage</th><th>Share</th><th>Hits</th><th>Kills</th><th>Overkill</th><th>Active</th></tr></thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>
        <button class="restart-button"><span data-restart-icon></span><span>Return to Henhouse</span></button>
      </div>
    `;
    this.setIcon(this.overlay.querySelector('[data-restart-icon]'), 'restart');
    this.overlay.querySelector('button').addEventListener('click', this.onRestart);
  }

  showSettings(
    effectSettings,
    audioSettings,
    analyticsSettings,
    onEffectToggle,
    onAudioChange,
    onAnalyticsChange,
    onClose,
    onReturnToHub
  ) {
    const labels = {
      damageNumbers: 'Damage numbers',
      screenShake: 'Screen shake',
      screenFlash: 'Hit flashes',
      vibration: 'Vibration'
    };
    const audioLabels = {
      master: 'Master',
      sfx: 'Sound effects',
      ui: 'UI',
      music: 'Music',
      ambience: 'Ambience'
    };
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel settings-panel">
        <h2>Settings</h2>
        <p>Adjust visuals and audio independently.</p>
        <h3>Visuals</h3>
        <div class="settings-list">
          ${Object.entries(labels).map(([key, label]) => `
            <button type="button" data-effect="${key}" aria-pressed="${effectSettings[key]}">
              <span>${label}</span><strong>${effectSettings[key] ? 'ON' : 'OFF'}</strong>
            </button>`).join('')}
          <button type="button" data-settings-fullscreen>
            <span>Fullscreen</span><strong>TOGGLE</strong>
          </button>
        </div>
        <h3>Audio</h3>
        <div class="settings-list settings-list--audio">
          ${Object.entries(audioLabels).map(([key, label]) => `
            <label class="settings-volume">
              <span>${label}</span>
              <input type="range" min="0" max="1" step="0.05" value="${audioSettings[key]}"
                data-audio-volume="${key}" aria-label="${label} volume">
              <strong>${Math.round(audioSettings[key] * 100)}%</strong>
            </label>`).join('')}
        </div>
        <h3>Privacy</h3>
        <div class="settings-privacy">
          <span><strong>Anonymous gameplay analytics</strong><small>Records only run flow and key metrics. No accounts, cookies, or advertising IDs.</small></span>
          <button type="button" data-analytics-toggle aria-pressed="${Boolean(analyticsSettings?.enabled)}">${analyticsSettings?.enabled ? 'ON' : 'OFF'}</button>
        </div>
        ${onReturnToHub ? `
          <div class="settings-run-exit">
            <span><strong>Current run</strong><small>Leave combat and return to the Henhouse.</small></span>
            <button type="button" data-return-hub>Main menu</button>
          </div>` : ''}
        <button class="settings-close" type="button">Continue</button>
      </div>`;
    this.overlay.querySelectorAll('[data-effect]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = onEffectToggle?.(button.dataset.effect) ?? effectSettings;
        button.setAttribute('aria-pressed', String(next[button.dataset.effect]));
        button.querySelector('strong').textContent = next[button.dataset.effect] ? 'ON' : 'OFF';
      });
    });
    this.overlay.querySelector('[data-settings-fullscreen]')?.addEventListener('click', () => this.onFullscreen?.());
    this.overlay.querySelectorAll('[data-audio-volume]').forEach((input) => {
      input.addEventListener('input', () => {
        const next = onAudioChange?.(input.dataset.audioVolume, Number(input.value)) ?? audioSettings;
        input.closest('.settings-volume').querySelector('strong').textContent = `${Math.round(next[input.dataset.audioVolume] * 100)}%`;
      });
    });
    this.overlay.querySelector('[data-analytics-toggle]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      const state = onAnalyticsChange?.(next) ?? { enabled: next };
      button.setAttribute('aria-pressed', String(state.enabled));
      button.textContent = state.enabled ? 'ON' : 'OFF';
    });
    this.overlay.querySelector('[data-return-hub]')?.addEventListener('click', () => onReturnToHub?.());
    this.overlay.querySelector('.settings-close').addEventListener('click', () => onClose?.(), { once: true });
  }

  showReturnToHubConfirmation(onConfirm, onCancel) {
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel return-hub-panel" role="dialog" aria-modal="true" aria-labelledby="return-hub-title">
        <small>CURRENT RUN</small>
        <h2 id="return-hub-title">Return to the Henhouse?</h2>
        <p>The current run will end without granting a completion reward.</p>
        <div class="return-hub-actions">
          <button type="button" data-return-cancel>Keep fighting</button>
          <button type="button" class="is-danger" data-return-confirm>Leave run</button>
        </div>
      </div>`;
    this.overlay.querySelector('[data-return-cancel]')?.addEventListener('click', () => onCancel?.(), { once: true });
    this.overlay.querySelector('[data-return-confirm]')?.addEventListener('click', () => onConfirm?.(), { once: true });
  }

  hideOverlay() {
    this.setOverlayVisible(false);
    this.overlay.innerHTML = '';
  }

  setOverlayVisible(visible) {
    this.overlay.classList.toggle('is-visible', visible);
    document.documentElement.classList.toggle('has-ui-overlay', visible);
  }

  showWaveBanner(wave, config) {
    this.showEncounterBanner(`Wave ${wave}: ${config.name}`, config.intent ?? '', config.bossWave ? 'boss' : 'wave');
  }

  showEncounterBanner(title, subtitle = '', tier = 'elite') {
    window.clearTimeout(this.waveBannerTimeout);
    this.waveBanner.className = `wave-banner wave-banner--${tier}`;
    this.waveBanner.innerHTML = `<strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ''}`;
    this.waveBanner.classList.remove('is-visible');
    requestAnimationFrame(() => this.waveBanner.classList.add('is-visible'));
    this.waveBannerTimeout = window.setTimeout(() => {
      this.waveBanner.classList.remove('is-visible');
    }, tier === 'boss' ? 2300 : 1700);
  }

  setJoystick(vector) {
    const x = 34 + vector.x * 28;
    const y = 34 + vector.y * 28;
    this.joystick.classList.toggle('is-active', Math.hypot(vector.x, vector.y) > 0.04);
    this.nub.style.transform = `translate(${x - 34}px, ${y - 34}px)`;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
  }

  formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, milliseconds > 0 ? Math.ceil(milliseconds / 1000) : 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatSource(source) {
    return String(source).replaceAll(':', ' · ').replaceAll('-', ' ');
  }

  renderActiveUpgrades(upgrades) {
    const container = this.root.querySelector('[data-active-loadout]');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    container.classList.toggle('is-empty', upgrades.length === 0);
    if (!upgrades.length) {
      return;
    }
    upgrades.slice(-8).forEach((label) => {
      const icon = document.createElement('span');
      icon.className = 'hud__upgrade-icon';
      icon.title = label;
      this.setIcon(icon, this.iconIdFromLabel(label) ?? 'active-upgrade');
      container.append(icon);
    });
  }

  renderLoadout(loadout) {
    if (!loadout) {
      this.renderActiveUpgrades([]);
      return;
    }
    this.renderLoadoutRow(
      this.root.querySelector('[data-active-loadout]'),
      loadout.active,
      loadout.activeSlots,
      'active'
    );
    this.renderLoadoutRow(
      this.root.querySelector('[data-passive-loadout]'),
      loadout.passive,
      loadout.passiveSlots,
      'passive'
    );
  }

  renderLoadoutRow(container, entries, capacity, kind) {
    container.innerHTML = '';
    container.classList.toggle('is-empty', entries.length === 0);
    container.dataset.kind = kind;
    container.setAttribute('aria-label', `${kind === 'active' ? 'Active abilities' : 'Passive upgrades'}: ${entries.length} of ${capacity}`);
    const visibleSlots = Math.min(capacity, entries.length);
    for (let index = 0; index < visibleSlots; index += 1) {
      const entry = entries[index];
      const icon = document.createElement('span');
      icon.className = `hud__upgrade-icon hud__upgrade-icon--${kind}`;
      if (!entry) {
        icon.classList.add('is-open');
        icon.title = `Open ${kind === 'active' ? 'active' : 'passive'} slot`;
      } else {
        const recentKey = this.recentUpgrade?.key;
        const recentActive = this.recentUpgrade && performance.now() < this.recentUpgrade.until;
        const matchesRecent = recentActive && (
          entry.id === recentKey
          || entry.sourceId === recentKey
          || entry.rankUpgradeId === recentKey
          || entry.evolutionId === this.recentUpgrade.id
        );
        icon.title = `${entry.name} ${entry.rank === 'EVO' ? 'EVO' : `Rank ${entry.rank}`}`;
        icon.classList.toggle('is-evolved', entry.evolved);
        icon.classList.toggle('is-recent-upgrade', Boolean(matchesRecent));
        this.setIcon(icon, entry.evolutionId ?? entry.sourceId);
        const rank = document.createElement('small');
        rank.textContent = entry.rank === 'EVO' ? 'E' : entry.rank;
        icon.append(rank);
        if (entry.rank !== 'EVO' && entry.maxRank > 1) {
          const pips = document.createElement('span');
          pips.className = 'hud__rank-pips';
          for (let pipIndex = 1; pipIndex <= entry.maxRank; pipIndex += 1) {
            const pip = document.createElement('i');
            pip.classList.toggle('is-filled', pipIndex <= entry.rank);
            pips.append(pip);
          }
          icon.append(pips);
        }
        if (entry.cooldown) {
          const cooldown = document.createElement('i');
          cooldown.className = 'hud__cooldown';
          cooldown.style.setProperty('--cooldown-angle', `${Math.round(entry.cooldown.ratio * 360)}deg`);
          cooldown.title = entry.cooldown.remainingMs > 0
            ? `${(entry.cooldown.remainingMs / 1000).toFixed(1)} s`
            : 'Ready';
          icon.append(cooldown);
        }
      }
      container.append(icon);
    }
    if (capacity > 0) {
      const count = document.createElement('span');
      count.className = 'hud__slot-count';
      count.textContent = `${entries.length}/${capacity}`;
      count.title = `${entries.length} of ${capacity} ${kind === 'active' ? 'active' : 'passive'} slots filled`;
      container.append(count);
    }
  }

  renderRankPips(progress) {
    if (!progress?.max || progress.max <= 1) {
      return '';
    }
    const pips = Array.from({ length: progress.max }, (_value, index) => {
      const rank = index + 1;
      const state = rank < progress.next ? 'is-filled' : rank === progress.next ? 'is-next' : '';
      return `<i class="${state}"></i>`;
    }).join('');
    return `<span class="upgrade-button__rank-pips" aria-label="Rank ${progress.next} of ${progress.max}">${pips}</span>`;
  }

  renderChangeItems(items) {
    if (!items?.length) {
      return '';
    }
    return `<span class="upgrade-button__changes">${items
      .slice(0, 3)
      .map((item) => `<span>${item}</span>`)
      .join('')}</span>`;
  }

  showUpgradeConfirmation(upgrade) {
    if (!upgrade || !this.upgradeConfirmation) {
      return;
    }
    const rank = upgrade.evolution
      ? 'EVO'
      : upgrade.consumable
        ? 'INSTANT'
        : `R${upgrade.nextRank ?? 1}`;
    const key = upgrade.evolution?.base
      ?? upgrade.baseWeaponId
      ?? upgrade.slotKey
      ?? upgrade.id;
    const displayDuration = window.matchMedia('(max-width: 760px)').matches ? 2400 : 1750;
    this.recentUpgrade = {
      id: upgrade.id,
      key,
      until: performance.now() + displayDuration + 150
    };
    window.clearTimeout(this.upgradeConfirmationTimeout);
    this.upgradeConfirmation.className = `upgrade-confirmation upgrade-confirmation--${upgrade.momentTone ?? upgrade.upgradeMoment ?? 'new'}`;
    this.upgradeConfirmation.innerHTML = `
      <span class="upgrade-confirmation__icon" data-confirmation-icon></span>
      <span class="upgrade-confirmation__copy">
        <small>${upgrade.evolution ? 'EVOLUTION ACTIVE' : upgrade.upgradeMoment === 'new' ? 'NEW ABILITY' : 'UPGRADE ACTIVE'}</small>
        <span><strong>${upgrade.name}</strong><b>${rank}</b></span>
        <em>${upgrade.momentTitle ?? upgrade.name}</em>
        ${this.renderChangeItems(upgrade.changeItems)}
      </span>
    `;
    this.setIcon(
      this.upgradeConfirmation.querySelector('[data-confirmation-icon]'),
      upgrade.evolution ? upgrade.id : upgrade.id
    );
    // Reflow restarts the entrance animation when upgrades are selected in quick succession.
    void this.upgradeConfirmation.offsetWidth;
    this.upgradeConfirmation.classList.add('is-visible');
    this.upgradeConfirmationTimeout = window.setTimeout(() => {
      this.upgradeConfirmation.classList.remove('is-visible');
    }, displayDuration);
  }

  getUpgradeFeedbackState() {
    return {
      visible: this.upgradeConfirmation?.classList.contains('is-visible') ?? false,
      title: this.upgradeConfirmation?.querySelector('strong')?.textContent ?? null,
      rank: this.upgradeConfirmation?.querySelector('b')?.textContent ?? null,
      milestone: this.upgradeConfirmation?.querySelector('em')?.textContent ?? null,
      changes: [...(this.upgradeConfirmation?.querySelectorAll('.upgrade-button__changes span') ?? [])]
        .map((item) => item.textContent),
      recent: this.recentUpgrade ? { ...this.recentUpgrade } : null
    };
  }

  showMultiKill(event, color = 0xffd35c) {
    if (!event || !this.multiKill) {
      return;
    }
    window.clearTimeout(this.multiKillTimeout);
    const cssColor = `#${Number(color).toString(16).padStart(6, '0')}`;
    this.multiKill.style.setProperty('--multi-kill-color', cssColor);
    this.multiKill.innerHTML = `<strong>${event.count}×</strong><span>${event.label}</span>`;
    this.multiKill.classList.remove('is-visible');
    void this.multiKill.offsetWidth;
    this.multiKill.classList.add('is-visible');
    const killMetric = this.root.querySelector('[data-kills]');
    killMetric?.classList.remove('is-kill-burst');
    void killMetric?.offsetWidth;
    killMetric?.classList.add('is-kill-burst');
    this.scheduleMultiKillHide();
  }

  scheduleMultiKillHide() {
    window.clearTimeout(this.multiKillTimeout);
    const displayDuration = window.matchMedia('(max-width: 760px)').matches ? 1600 : 1050;
    this.multiKillTimeout = window.setTimeout(() => {
      this.multiKill?.classList.remove('is-visible');
      this.root.querySelector('[data-kills]')?.classList.remove('is-kill-burst');
    }, displayDuration);
  }

  getMultiKillState() {
    return {
      visible: this.multiKill?.classList.contains('is-visible') ?? false,
      count: this.multiKill?.querySelector('strong')?.textContent ?? null,
      label: this.multiKill?.querySelector('span')?.textContent ?? null
    };
  }

  updateMultiKillCount(count) {
    const value = this.multiKill?.querySelector('strong');
    if (value) {
      value.textContent = `${count}×`;
      if (this.multiKill.classList.contains('is-visible')) {
        this.scheduleMultiKillHide();
      }
    }
  }

  iconIdFromLabel(label) {
    const clean = label.replace(/\s+\d+$/, '');
    return ICON_IDS_BY_NAME[clean] ?? null;
  }

  setIcon(element, id) {
    if (!element) {
      return;
    }
    const resolvedId = ICON_ALIASES_BY_ID[id] ?? id;
    const frame = uiIconAtlas.frames[resolvedId] ?? uiIconAtlas.frames['active-upgrade'];
    const col = frame % ICON_COLUMNS;
    const row = Math.floor(frame / ICON_COLUMNS);
    element.classList.add('ui-icon');
    const x = ICON_COLUMNS <= 1 ? 0 : (col / (ICON_COLUMNS - 1)) * 100;
    const y = ICON_ROWS <= 1 ? 0 : (row / (ICON_ROWS - 1)) * 100;
    element.style.setProperty('--icon-x', `${x}%`);
    element.style.setProperty('--icon-y', `${y}%`);
  }

  destroy() {
    window.clearTimeout(this.waveBannerTimeout);
    window.clearTimeout(this.upgradeConfirmationTimeout);
    window.clearTimeout(this.multiKillTimeout);
    this.root.remove();
    this.overlay.remove();
    this.upgradeConfirmation.remove();
    this.multiKill.remove();
    this.joystick.remove();
    this.waveBanner.remove();
  }
}
