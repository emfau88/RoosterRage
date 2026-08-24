import uiIconSheetUrl from '../assets/ui/ui-icons-v1-sheet.webp';
import uiIconAtlas from '../assets/ui/ui-icons-v1.json';
import acePortraitUrl from '../assets/characters/rooster-ace-portrait.webp';
import artilleryPortraitUrl from '../assets/characters/rooster-artillery-portrait.webp';
import stormPortraitUrl from '../assets/characters/rooster-storm-portrait.webp';
import kernelCurrencyUrl from '../assets/meta/kernel-currency.webp';
import masteryAceUrl from '../assets/meta/mastery-ace.webp';
import masteryArtilleryUrl from '../assets/meta/mastery-artillery.webp';
import masteryStormUrl from '../assets/meta/mastery-storm.webp';
import harvestYardPreviewUrl from '../../docs/qa/map-readability-pass/harvest-yard-after.png';
import feedAlleyPreviewUrl from '../../docs/qa/map-readability-pass/feed-alley-after.png';
import coopSquarePreviewUrl from '../../docs/qa/coop-square-rework/coop-square-after.png';
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
    url: harvestYardPreviewUrl,
    layout: 'Weit & offen'
  },
  'vertical-run': {
    url: feedAlleyPreviewUrl,
    layout: 'Nord-Süd-Gang'
  },
  'square-coop': {
    url: coopSquarePreviewUrl,
    layout: 'Kompaktes Karree'
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
        <span class="hud__avatar-shell"><img data-rooster-avatar alt="Ausgewählter Rooster"></span>
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
        <div class="hud__item hud__item--wave" data-wave><span data-icon="wave"></span><span><small>WELLE</small><strong data-value><span data-value-full>Wave 1/10</span><span data-value-compact aria-hidden="true">1/10</span></strong></span><span class="hud__wave-track"><i data-wave-fill></i></span></div>
        <div class="hud__item" data-kills><span data-icon="enemy"></span><span><small>JAGD</small><strong data-value><span data-value-full>0 Kills</span><span data-value-compact aria-hidden="true">0</span></strong></span></div>
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
        <button class="hud__icon-button" type="button" data-settings title="Pause und Einstellungen" aria-label="Pause und Einstellungen">
          <span class="settings-glyph" aria-hidden="true"><i></i><i></i></span>
        </button>
        <button class="hud__icon-button" type="button" data-fullscreen title="Fullscreen" aria-label="Fullscreen">
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
      avatar.alt = `${state.roosterName ?? state.roosterId} Portrait`;
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
    this.setMetricValue('[data-kills]', `${kills} ${kills === 1 ? 'Kill' : 'Kills'}`, `${kills}`);
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
      ? 'Wähle eine garantierte Build-Belohnung.'
      : context.remaining > 0
        ? `Wähle ein Upgrade. Danach folgen noch ${context.remaining}.`
        : 'Wähle ein Upgrade.';
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel ${chest ? 'panel--reward' : ''}">
        <h2>${title}</h2>
        <p>${subtitle}</p>
        ${context.recentChoice ? `
          <div class="upgrade-selection-receipt">
            <span>✓ ZULETZT GEWÄHLT</span>
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
            choice.upgradeMoment === 'rank-up' ? 'Rangaufstieg'
              : choice.upgradeMoment === 'evolution' ? 'EVO bereit'
                : choice.upgradeMoment === 'instant' ? 'Soforteffekt' : 'Neue Fähigkeit'
          }</span>
          <span class="upgrade-button__description">${choice.description}</span>
          ${choice.synergyActive
            ? `<span class="upgrade-button__synergy">Synergie aktiv: ${choice.synergyDescription}</span>`
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
      const formatted = Number.isInteger(value) ? `${value}` : `${value}`.replace('.', ',');
      const prefix = value > 0 ? '+' : '';
      return `${prefix}${formatted}${talent.effect?.unit ? ` ${talent.effect.unit}` : ''}`;
    };
    const talentNodeMarkup = (talent) => `
      <button type="button" data-talent="${talent.id}"
        class="talent-node ${talent.complete ? 'is-complete' : ''} ${talent.unlocked ? '' : 'is-locked'} ${talent.affordable ? 'is-affordable' : ''}"
        aria-pressed="false"
        aria-label="${talent.name}, ${talent.description} Rang ${talent.rank} von ${talent.maxRank}. ${talent.unlocked ? 'Details öffnen' : talent.unlockLabel}">
        <span class="talent-node__frame">
          <span class="talent-node__icon" data-talent-icon="${talent.icon}"></span>
          <em>${talent.rank}/${talent.maxRank}</em>
          ${talent.unlocked ? '' : '<i aria-hidden="true"></i>'}
        </span>
        <span class="talent-node__copy">
          <strong>${talent.name}</strong>
          <small>${talent.description.replace(' pro Rang.', '/Rang').replace('.', '')}</small>
        </span>
        <b>${talent.complete ? 'MAX' : talent.unlocked ? `${talent.nextCost} Körner` : 'Gesperrt'}</b>
      </button>
    `;
    const talentTiers = [
      { numeral: 'I', title: 'Nestfundament', unlockAt: 0, nodes: talentNodes.filter((talent) => talent.unlockAt < 3) },
      { numeral: 'II', title: 'Erweiterte Instinkte', unlockAt: 3, nodes: talentNodes.filter((talent) => talent.unlockAt >= 3 && talent.unlockAt < 8) },
      { numeral: 'III', title: 'Königsweg', unlockAt: 8, nodes: talentNodes.filter((talent) => talent.unlockAt >= 8) }
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
          <div><small>STUFE ${tier.numeral}</small><strong>${tier.title}</strong></div>
          <em>${tier.unlockAt === 0 || talentTotalRanks >= tier.unlockAt ? 'Freigeschaltet' : `${tier.unlockAt - talentTotalRanks} Ränge fehlen`}</em>
        </header>
        <div class="talent-tier__nodes">${tier.nodes.map(talentNodeMarkup).join('')}</div>
      </section>
      ${index < talentTiers.length - 1 ? talentBranchMarkup(index) : ''}
    `).join('');
    let selectedChallenge = hub.selectedChallenge ?? 'standard';
    const standardArenaId = hub.standardArenaId ?? 'open-yard';
    const challengeCards = (hub.challenges ?? []).map((challenge) => {
      const arena = getArenaDefinition(challenge.arenaId ?? standardArenaId);
      const preview = ARENA_PREVIEWS[arena.id] ?? ARENA_PREVIEWS['open-yard'];
      const status = challenge.unlocked
        ? (challenge.firstClearClaimed ? 'Erstsieg geschafft' : `Erstsieg +${challenge.firstClearReward} Körner`)
        : `Gesperrt: ${challenge.unlockLabel}`;
      return `
        <button class="challenge-card ${challenge.id === selectedChallenge ? 'is-selected' : ''} ${challenge.unlocked ? '' : 'is-locked'}"
          type="button" data-challenge="${challenge.id}" data-arena="${arena.id}" ${challenge.unlocked ? '' : 'disabled'}
          aria-label="${challenge.name}, Arena ${arena.name}">
          <span class="challenge-card__preview">
            <img src="${preview.url}" alt="" loading="eager">
            <span class="challenge-card__arena">${arena.name}</span>
            <em>${preview.layout}</em>
          </span>
          <span class="challenge-card__copy">
            <strong>${challenge.name}</strong>
            <span class="challenge-card__description">${challenge.description}</span>
            <small>${status}</small>
          </span>
        </button>
      `;
    }).join('');
    const historyRows = (hub.history ?? []).length
      ? hub.history.map((run) => `
        <li><strong>${run.roosterName}</strong><span>${run.outcome === 'victory' ? 'Sieg' : 'Niederlage'} · ${run.kills} Kills · +${run.kernels ?? 0} Körner · ${this.formatDuration(run.elapsedMs)}</span></li>
      `).join('')
      : '<li><span>Noch kein Run gespeichert.</span></li>';
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
        aria-label="${definition.name} auswählen">${definition.name}</button>`;
    }).join('');
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel rooster-panel henhouse-panel">
        <div class="henhouse-heading">
          <div><small>ROOSTER RAGE</small><h1>Hennenhütte</h1></div>
          <div class="henhouse-stats">
            <span class="henhouse-kernels"><img src="${kernelCurrencyUrl}" alt=""><strong>${currency.kernels}</strong> Körner</span>
          </div>
          <div class="henhouse-actions">
            <button type="button" class="henhouse-settings" data-hub-fullscreen>Fullscreen</button>
            <button type="button" class="henhouse-settings" data-hub-settings>Einstellungen</button>
          </div>
        </div>
        <nav class="henhouse-nav" aria-label="Hennenhütte Bereiche">
          <button type="button" data-hub-tab="play" class="is-selected">Spielen</button>
          <button type="button" data-hub-tab="roosters">Hähne</button>
          <button type="button" data-hub-tab="training">Training</button>
          <button type="button" data-hub-tab="archive">Archiv</button>
        </nav>
        <section class="henhouse-view is-active" data-hub-view="play">
          <div class="henhouse-play-grid">
            <article class="hub-rooster-hero">
              <div class="hub-rooster-hero__portrait">
                <img data-hero-portrait alt="Ausgewählter Rooster">
                <span class="hub-rooster-hero__shade"></span>
                <img data-hero-mastery-badge class="hub-rooster-hero__badge" alt="Mastery-Wappen">
              </div>
              <div class="hub-rooster-hero__copy">
                <small>DEIN ROOSTER</small>
                <h2 data-hero-name></h2>
                <strong data-hero-role></strong>
                <p data-hero-description></p>
                <div class="hub-rooster-mastery"><span data-hero-mastery></span><i><b data-hero-progress></b></i></div>
                <div class="hub-rooster-switches">${roosterSwitches}</div>
              </div>
            </article>
            <article class="hub-run-card">
              <small data-run-arena>OPEN YARD</small>
              <h2 data-run-challenge>STANDARD RUN</h2>
              <p data-run-description></p>
              <div class="hub-run-best"><span><small>BESTE JAGD</small><strong>${bests.highestKills} Kills</strong></span><span data-run-reward></span></div>
              <div class="challenge-list hub-challenge-list">${challengeCards}</div>
              <button type="button" class="hub-start-button" data-run-start><span>RUN STARTEN</span><small>Hof betreten</small></button>
            </article>
          </div>
        </section>
        <section class="henhouse-view" data-hub-view="roosters" hidden>
          <div class="henhouse-section-heading"><span><small>ROOSTER</small><h2>Hähne</h2></span><p>Stats, Mastery, Kosmetik und Freischaltungen.</p></div>
          <div class="rooster-list"></div>
        </section>
        <section class="henhouse-view" data-hub-view="training" hidden>
          <div class="henhouse-section-heading talent-heading">
            <span><small>DAUERHAFT</small><h2>Talentnest</h2></span>
            <div class="talent-summary" aria-label="Talentfortschritt">
              <span><small>INVESTIERT</small><strong>${talentTotalRanks}</strong><em>Ränge</em></span>
              <span><small>VERDIENT</small><strong>${currency.lifetimeKernels}</strong><em>Körner</em></span>
            </div>
          </div>
          <p class="talent-intro">Wähle ein Talent, um Wirkung, nächsten Rang und Kosten vor dem Verbessern zu prüfen.</p>
          <div class="talent-tree" aria-label="Talentfortschritt">${talentTree}</div>
          <div class="talent-inspector-layer" data-talent-detail hidden>
            <button type="button" class="talent-inspector__scrim" data-talent-close tabindex="-1" aria-label="Talentdetails schließen"></button>
            <section class="talent-inspector" role="dialog" aria-modal="true" aria-labelledby="talent-detail-name">
              <span class="talent-inspector__handle" aria-hidden="true"></span>
              <button type="button" class="talent-inspector__close" data-talent-close aria-label="Talentdetails schließen">×</button>
              <header>
                <span class="talent-inspector__icon-frame"><span data-talent-detail-icon></span></span>
                <span><small data-talent-detail-tier></small><h3 id="talent-detail-name" data-talent-detail-name></h3><em data-talent-detail-rank></em></span>
              </header>
              <p data-talent-detail-description></p>
              <div class="talent-inspector__values">
                <span><small>AKTUELL</small><strong data-talent-current></strong></span>
                <i aria-hidden="true">→</i>
                <span><small>NÄCHSTER RANG</small><strong data-talent-next></strong></span>
                <span><small>MAXIMAL</small><strong data-talent-max></strong></span>
              </div>
              <p class="talent-inspector__status" data-talent-detail-status></p>
              <button type="button" class="talent-inspector__purchase" data-talent-purchase></button>
              <small class="talent-inspector__hint">Auswahl = Vorschau. Nur der Button verbessert das Talent.</small>
            </section>
          </div>
        </section>
        <section class="henhouse-view" data-hub-view="archive" hidden>
          <div class="henhouse-section-heading"><span><small>FORTSCHRITT</small><h2>Archiv</h2></span><p>Bestwerte, letzte Runs und entdeckte Gegner/EVOs.</p></div>
          <div class="henhouse-archive-stats">
            <span><small>Runs</small><strong>${progress.totalRuns}</strong></span>
            <span><small>Siege</small><strong>${progress.victories}</strong></span>
            <span><small>Kills</small><strong>${progress.totalKills}</strong></span>
          </div>
          <div class="henhouse-records"><small>REKORDE</small><div class="personal-bests"><span><small>Meiste Kills</small><strong>${bests.highestKills}</strong></span><span><small>Schnellster Sieg</small><strong>${bests.fastestVictoryMs === null ? '–' : this.formatDuration(bests.fastestVictoryMs)}</strong></span><span><small>Längster Run</small><strong>${this.formatDuration(bests.longestRunMs)}</strong></span></div></div>
          <div class="henhouse-drawers">
            <details open><summary>Run-Historie</summary><ul class="history-list">${historyRows}</ul></details>
            <details><summary>Gegner-Lexikon</summary><ul class="lexicon-list">${enemyRows}</ul></details>
            <details><summary>EVO-Lexikon</summary><ul class="lexicon-list">${evoRows}</ul></details>
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
      talentDetail.querySelector('[data-talent-detail-tier]').textContent = `STUFE ${talentTiers[tierIndex]?.numeral ?? 'I'} · ${talent.effect?.label ?? 'Dauerhafter Bonus'}`;
      talentDetail.querySelector('[data-talent-detail-name]').textContent = talent.name;
      talentDetail.querySelector('[data-talent-detail-rank]').textContent = `Rang ${talent.rank}/${talent.maxRank}`;
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
        status.textContent = 'Dieses Talent ist vollständig ausgebaut.';
        talentPurchase.textContent = 'Maximal ausgebaut';
      } else if (!talent.unlocked) {
        status.textContent = `Gesperrt · ${talent.unlockLabel}. Wirkung und Maximalwert kannst du trotzdem schon planen.`;
        talentPurchase.textContent = talent.unlockLabel;
      } else if (!talent.affordable) {
        const missingKernels = Math.max(0, talent.nextCost - currency.kernels);
        status.textContent = `Dir fehlen ${missingKernels} Körner für den nächsten Rang.`;
        talentPurchase.textContent = `${talent.nextCost} Körner benötigt`;
      } else {
        status.textContent = `${currency.kernels} Körner verfügbar · danach bleiben ${currency.kernels - talent.nextCost}.`;
        talentPurchase.textContent = `Für ${talent.nextCost} Körner verbessern`;
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
      button.disabled = !meta.unlocked;
      button.innerHTML = `
        <span class="rooster-card__portrait">
          <img class="rooster-card__portrait-image" src="${ROOSTER_PORTRAITS[definition.id]}" alt="${definition.name} Portrait">
          <span class="rooster-card__portrait-shade"></span>
          <span class="rooster-card__header">
            <span class="rooster-card__icon" data-rooster-icon></span>
            <span>
            <strong>${definition.name}</strong>
            <small>${definition.role}</small>
            </span>
            <img class="rooster-card__mastery-badge ${mastery.badgeUnlocked ? '' : 'is-locked'}"
              src="${MASTERY_BADGES[definition.id]}" alt="${definition.name} Mastery-Wappen">
          </span>
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
        <span class="rooster-card__progress">${meta.unlocked ? `${meta.runs} Runs · ${meta.wins} Siege` : `Gesperrt: ${meta.unlockLabel}`}</span>
      `;
      this.setIcon(button.querySelector('[data-rooster-icon]'), definition.icon);
      button.addEventListener('click', () => {
        selectedRoosterId = definition.id;
        this.hubSelection.roosterId = definition.id;
        updateSelectedRooster();
        switchHubView('play');
      });
      entry.append(button);
      if (meta.cosmetics?.length) {
        const variant = meta.cosmetics[0];
        const tint = `#${Math.max(0, variant.tint ?? 0xffffff).toString(16).padStart(6, '0').slice(-6)}`;
        const cosmetics = document.createElement('div');
        cosmetics.className = 'cosmetic-panel';
        cosmetics.innerHTML = `
          <div class="cosmetic-panel__heading">
            <span>NUR OPTIK</span>
            <strong>Keine Werteänderung</strong>
          </div>
          <div class="cosmetic-preview" aria-label="Vorschau Original und ${variant.name}">
            <figure class="${meta.selectedCosmetic ? '' : 'is-selected'}">
              <span class="cosmetic-preview__image"><img src="${ROOSTER_PORTRAITS[definition.id]}" alt=""><i></i></span>
              <figcaption>Original</figcaption>
            </figure>
            <span class="cosmetic-preview__arrow" aria-hidden="true">→</span>
            <figure class="${meta.selectedCosmetic === variant.id ? 'is-selected' : ''} ${variant.unlocked ? '' : 'is-locked'}">
              <span class="cosmetic-preview__image"><img src="${ROOSTER_PORTRAITS[definition.id]}" alt=""><i style="--cosmetic-tint:${tint}"></i></span>
              <figcaption>${variant.name}${variant.unlocked ? '' : ' · Vorschau'}</figcaption>
            </figure>
          </div>
          <p class="cosmetic-panel__unlock"><b>Freischaltung:</b> ${variant.unlockLabel}</p>
          <div class="cosmetic-list">
            <button type="button" data-cosmetic="" class="${meta.selectedCosmetic ? '' : 'is-selected'}"
              ${meta.unlocked ? '' : 'disabled'}>Original</button>
            ${meta.cosmetics.map((cosmetic) => `
              <button type="button" data-cosmetic="${cosmetic.id}" class="${meta.selectedCosmetic === cosmetic.id ? 'is-selected' : ''}"
                ${cosmetic.unlocked ? '' : 'disabled'} title="${cosmetic.unlocked ? cosmetic.name : cosmetic.unlockLabel}">
                ${cosmetic.name}${cosmetic.unlocked ? '' : ' · Gesperrt'}
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
      portrait.alt = `${definition.name} Portrait`;
      const badge = this.overlay.querySelector('[data-hero-mastery-badge]');
      badge.src = MASTERY_BADGES[definition.id];
      badge.alt = `${definition.name} Mastery-Wappen`;
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
    };
    const updateChallenge = () => {
      const challenge = (hub.challenges ?? []).find((candidate) => candidate.id === selectedChallenge)
        ?? hub.challenges?.[0];
      if (!challenge) return;
      this.overlay.querySelector('[data-run-arena]').textContent = getArenaDefinition(challenge.arenaId ?? standardArenaId).name.toUpperCase();
      this.overlay.querySelector('[data-run-challenge]').textContent = challenge.name.toUpperCase();
      this.overlay.querySelector('[data-run-description]').textContent = challenge.description;
      this.overlay.querySelector('[data-run-reward]').innerHTML = `<small>BELOHNUNG</small><strong>${challenge.firstClearClaimed ? 'Erstsieg geschafft' : `+${challenge.firstClearReward} Körner`}</strong>`;
      this.overlay.querySelectorAll('[data-challenge]').forEach((candidate) => (
        candidate.classList.toggle('is-selected', candidate.dataset.challenge === challenge.id)
      ));
    };
    const switchHubView = (view) => {
      const target = this.overlay.querySelector(`[data-hub-view="${view}"]`) ? view : 'play';
      if (target !== 'training') closeTalentDetail();
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
    this.overlay.querySelectorAll('[data-hub-tab]').forEach((button) => {
      button.addEventListener('click', () => switchHubView(button.dataset.hubTab));
    });
    this.overlay.querySelectorAll('[data-hub-rooster]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedRoosterId = button.dataset.hubRooster;
        this.hubSelection.roosterId = selectedRoosterId;
        updateSelectedRooster();
      });
    });
    this.overlay.querySelectorAll('[data-challenge]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedChallenge = button.dataset.challenge;
        this.hubSelection.challengeId = selectedChallenge;
        updateChallenge();
      });
    });
    this.overlay.querySelector('[data-run-start]')?.addEventListener('click', () => (
      this.onRoosterSelected?.(selectedRoosterId, selectedChallenge)
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
      : '<tr><td colspan="7">Noch keine Kampfdaten.</td></tr>';
    const build = report.build ?? { active: [], passive: [], evolutions: [] };
    const active = build.active
      .map((entry) => `<span>${entry.name} ${entry.rank === 'EVO' ? 'EVO' : `R${entry.rank}`}</span>`)
      .join('');
    const passive = build.passive
      .map((entry) => `<span>${entry.name} R${entry.rank}</span>`)
      .join('');
    const evos = build.evolutions.map((entry) => entry.name).join(', ') || 'Keine';
    const unlockLabels = {
      rooster: 'Rooster',
      challenge: 'Challenge',
      cosmetic: 'Kosmetik',
      mastery: 'Mastery',
      'first-clear': 'Erstsieg'
    };
    const unlocks = (report.newUnlocks ?? []).map((unlock) => `
      <span><strong>${unlockLabels[unlock.type] ?? 'Fortschritt'}</strong>${this.formatSource(unlock.id)}</span>
    `).join('');
    const metaReward = report.metaReward;
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel run-report">
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="run-report__summary">
          <span><small>Rooster</small><strong>${report.rooster?.name ?? 'Unbekannt'}</strong></span>
          <span><small>Arena</small><strong>${report.arena?.name ?? 'Unbekannt'}</strong></span>
          <span><small>Modus</small><strong>${report.challenge?.name ?? 'Standard Run'}</strong></span>
          <span><small>Zeit</small><strong>${this.formatDuration(report.elapsedMs ?? 0)}</strong></span>
          <span><small>Kills</small><strong>${report.kills ?? 0}</strong></span>
          <span><small>Treffer</small><strong>${report.shots ? `${Math.round(Math.min(1, report.hits / report.shots) * 100)}%` : '–'}</strong></span>
          <span><small>Peak</small><strong>${report.maxEnemiesAlive ?? 0}</strong></span>
          <span><small>Todesursache</small><strong>${this.formatSource(report.deathCause ?? '–')}</strong></span>
          <span><small>EVOs</small><strong>${build.evolutions.length}</strong></span>
        </div>
        <div class="run-report__build"><strong>Aktiv</strong>${active || '<span>–</span>'}</div>
        <div class="run-report__build run-report__build--passive"><strong>Passiv</strong>${passive || '<span>–</span>'}</div>
        <p class="run-report__evos"><strong>EVO:</strong> ${evos}</p>
        ${metaReward ? `<div class="run-report__meta-reward">
          <img src="${kernelCurrencyUrl}" alt="Körner">
          <span><strong>+${metaReward.earnedKernels} Körner</strong><small>Run ${metaReward.runKernels}${metaReward.firstClearKernels ? ` · Erstsieg ${metaReward.firstClearKernels}` : ''}${metaReward.masteryKernels ? ` · Mastery ${metaReward.masteryKernels}` : ''} · Bestand ${metaReward.balance}</small></span>
          <b>Mastery ${metaReward.masteryLevel} · +${metaReward.masteryXp} XP</b>
        </div>` : ''}
        ${unlocks ? `<div class="run-report__unlocks"><h2>Neu freigeschaltet</h2>${unlocks}</div>` : ''}
        <div class="run-report__table-wrap">
          <table>
            <thead><tr><th>Quelle</th><th>Schaden</th><th>Share</th><th>Treffer</th><th>Kills</th><th>Overkill</th><th>Aktiv</th></tr></thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>
        <button class="restart-button"><span data-restart-icon></span><span>Zur Hennenhütte</span></button>
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
      damageNumbers: 'Schadenszahlen',
      screenShake: 'Bildschirmwackeln',
      screenFlash: 'Trefferblitze',
      vibration: 'Vibration'
    };
    const audioLabels = {
      master: 'Master',
      sfx: 'Soundeffekte',
      ui: 'UI',
      music: 'Musik',
      ambience: 'Ambiente'
    };
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel settings-panel">
        <h2>Einstellungen</h2>
        <p>Darstellung und Audio getrennt anpassen.</p>
        <h3>Darstellung</h3>
        <div class="settings-list">
          ${Object.entries(labels).map(([key, label]) => `
            <button type="button" data-effect="${key}" aria-pressed="${effectSettings[key]}">
              <span>${label}</span><strong>${effectSettings[key] ? 'AN' : 'AUS'}</strong>
            </button>`).join('')}
          <button type="button" data-settings-fullscreen>
            <span>Fullscreen</span><strong>WECHSELN</strong>
          </button>
        </div>
        <h3>Audio</h3>
        <div class="settings-list settings-list--audio">
          ${Object.entries(audioLabels).map(([key, label]) => `
            <label class="settings-volume">
              <span>${label}</span>
              <input type="range" min="0" max="1" step="0.05" value="${audioSettings[key]}"
                data-audio-volume="${key}" aria-label="${label} Lautstärke">
              <strong>${Math.round(audioSettings[key] * 100)}%</strong>
            </label>`).join('')}
        </div>
        <h3>Datenschutz</h3>
        <div class="settings-privacy">
          <span><strong>Anonyme Spielanalyse</strong><small>Erfasst nur Run-Ablauf und Eckdaten. Keine Konten, Cookies oder Werbe-IDs.</small></span>
          <button type="button" data-analytics-toggle aria-pressed="${Boolean(analyticsSettings?.enabled)}">${analyticsSettings?.enabled ? 'AN' : 'AUS'}</button>
        </div>
        ${onReturnToHub ? `
          <div class="settings-run-exit">
            <span><strong>Aktueller Run</strong><small>Kampf verlassen und zur Hennenhütte zurückkehren.</small></span>
            <button type="button" data-return-hub>Hauptmenü</button>
          </div>` : ''}
        <button class="settings-close" type="button">Weiter</button>
      </div>`;
    this.overlay.querySelectorAll('[data-effect]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = onEffectToggle?.(button.dataset.effect) ?? effectSettings;
        button.setAttribute('aria-pressed', String(next[button.dataset.effect]));
        button.querySelector('strong').textContent = next[button.dataset.effect] ? 'AN' : 'AUS';
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
      button.textContent = state.enabled ? 'AN' : 'AUS';
    });
    this.overlay.querySelector('[data-return-hub]')?.addEventListener('click', () => onReturnToHub?.());
    this.overlay.querySelector('.settings-close').addEventListener('click', () => onClose?.(), { once: true });
  }

  showReturnToHubConfirmation(onConfirm, onCancel) {
    this.setOverlayVisible(true);
    this.overlay.innerHTML = `
      <div class="panel return-hub-panel" role="dialog" aria-modal="true" aria-labelledby="return-hub-title">
        <small>AKTUELLER RUN</small>
        <h2 id="return-hub-title">Zur Hennenhütte?</h2>
        <p>Der aktuelle Run wird beendet und vergibt keine Abschlussbelohnung.</p>
        <div class="return-hub-actions">
          <button type="button" data-return-cancel>Weiterkämpfen</button>
          <button type="button" class="is-danger" data-return-confirm>Run verlassen</button>
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
    container.setAttribute('aria-label', `${kind === 'active' ? 'Aktive Fähigkeiten' : 'Passive Verbesserungen'}: ${entries.length} von ${capacity}`);
    const visibleSlots = Math.min(capacity, entries.length);
    for (let index = 0; index < visibleSlots; index += 1) {
      const entry = entries[index];
      const icon = document.createElement('span');
      icon.className = `hud__upgrade-icon hud__upgrade-icon--${kind}`;
      if (!entry) {
        icon.classList.add('is-open');
        icon.title = `Freier ${kind === 'active' ? 'Active' : 'Passive'}-Slot`;
      } else {
        const recentKey = this.recentUpgrade?.key;
        const recentActive = this.recentUpgrade && performance.now() < this.recentUpgrade.until;
        const matchesRecent = recentActive && (
          entry.id === recentKey
          || entry.sourceId === recentKey
          || entry.rankUpgradeId === recentKey
          || entry.evolutionId === this.recentUpgrade.id
        );
        icon.title = `${entry.name} ${entry.rank === 'EVO' ? 'EVO' : `Rang ${entry.rank}`}`;
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
            : 'Bereit';
          icon.append(cooldown);
        }
      }
      container.append(icon);
    }
    if (capacity > 0) {
      const count = document.createElement('span');
      count.className = 'hud__slot-count';
      count.textContent = `${entries.length}/${capacity}`;
      count.title = `${entries.length} von ${capacity} ${kind === 'active' ? 'aktiven' : 'passiven'} Slots belegt`;
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
    return `<span class="upgrade-button__rank-pips" aria-label="Rang ${progress.next} von ${progress.max}">${pips}</span>`;
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
        ? 'SOFORT'
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
        <small>${upgrade.evolution ? 'EVOLUTION AKTIV' : upgrade.upgradeMoment === 'new' ? 'NEUE FÄHIGKEIT' : 'UPGRADE AKTIV'}</small>
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
