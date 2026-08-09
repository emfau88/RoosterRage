import uiIconSheetUrl from '../assets/ui/ui-icons-v1-sheet.webp';
import uiIconAtlas from '../assets/ui/ui-icons-v1.json';

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
  'evo-solar-scramble': 'golden-egg',
  'evo-thunder-roost': 'lightning-comb',
  'evo-shell-halo': 'orbit-eggs',
  'evo-broodstorm': 'rocket-egg',
  'evo-singularity-nest': 'void-nest',
  'evo-phoenix-pan': 'molotov-egg',
  'evo-dawn-laser': 'laser-comb',
  'evo-chick-squadron': 'support-chick',
  'primary-ace': 'active-upgrade',
  'primary-artillery': 'rocket-egg',
  'primary-storm': 'lightning-comb'
};

export class HUD {
  constructor(onUpgradeSelected, onRestart, onFullscreen, onRoosterSelected, onReroll) {
    this.onUpgradeSelected = onUpgradeSelected;
    this.onRestart = onRestart;
    this.onFullscreen = onFullscreen;
    this.onRoosterSelected = onRoosterSelected;
    this.onReroll = onReroll;
    document.documentElement.style.setProperty('--ui-icon-sheet', `url("${uiIconSheetUrl}")`);
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__item" data-hp><span data-icon="hp"></span><span data-value>HP 100/100</span></div>
      <div class="hud__item" data-level><span data-icon="badge-1"></span><span data-value>Level 1</span></div>
      <div class="hud__item" data-wave><span data-icon="wave"></span><span data-value>Wave 1/10</span></div>
      <div class="hud__item" data-time><span data-icon="timer"></span><span data-value>00:00</span></div>
      <div class="hud__bar"><span data-icon="xp"></span><div class="hud__bar-track"><div class="hud__bar-fill" data-xp></div></div></div>
      <div class="hud__loadout">
        <div class="hud__upgrades" data-active-loadout></div>
        <div class="hud__upgrades hud__upgrades--passive" data-passive-loadout></div>
      </div>
      <div class="hud__controls">
        <button class="hud__icon-button" type="button" data-fullscreen title="Fullscreen" aria-label="Fullscreen">
          <span class="fullscreen-glyph" aria-hidden="true"></span>
        </button>
      </div>
    `;
    this.root.querySelectorAll('[data-icon]').forEach((icon) => this.setIcon(icon, icon.dataset.icon));
    this.root.querySelector('[data-fullscreen]').addEventListener('click', () => this.onFullscreen?.());

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';

    this.joystick = document.createElement('div');
    this.joystick.className = 'joystick';
    this.joystick.innerHTML = '<div class="joystick__nub" data-nub></div>';
    this.nub = this.joystick.querySelector('[data-nub]');

    this.waveBanner = document.createElement('div');
    this.waveBanner.className = 'wave-banner';

    document.body.append(this.root, this.overlay, this.joystick, this.waveBanner);
  }

  update(state) {
    const hpItem = this.root.querySelector('[data-hp]');
    const hpRatio = state.hp / state.maxHp;
    hpItem.querySelector('[data-value]').textContent = `HP ${Math.ceil(state.hp)}/${state.maxHp}`;
    hpItem.classList.toggle('is-warning', hpRatio <= 0.55 && hpRatio > 0.25);
    hpItem.classList.toggle('is-danger', hpRatio <= 0.25);
    const roosterLabel = state.roosterName ? `${state.roosterName} L${state.level}` : `Level ${state.level}`;
    this.root.querySelector('[data-level] [data-value]').textContent = roosterLabel;
    this.root.querySelector('[data-wave] [data-value]').textContent = `Wave ${state.wave}/10`;
    this.root.querySelector('[data-time] [data-value]').textContent = this.formatTime(state.elapsed);
    this.root.querySelector('[data-xp]').style.width = `${state.xpPercent * 100}%`;
    this.renderLoadout(state.loadout);
  }

  showUpgradeChoices(choices, context = {}) {
    const chest = context.type === 'chest';
    const title = chest
      ? context.kind === 'boss' ? 'Boss Chest' : 'Elite Chest'
      : 'Level Up';
    const subtitle = chest
      ? 'Waehle eine garantierte Build-Belohnung.'
      : context.remaining > 0
        ? `Waehle ein Upgrade. Danach folgen noch ${context.remaining}.`
        : 'Waehle ein Upgrade.';
    this.overlay.classList.add('is-visible');
    this.overlay.innerHTML = `
      <div class="panel ${chest ? 'panel--reward' : ''}">
        <h2>${title}</h2>
        <p>${subtitle}</p>
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
            <span class="upgrade-button__rank">${choice.rankLabel ?? ''}</span>
          </span>
          <span class="upgrade-button__meta">${choice.categoryLabel ?? choice.category}</span>
          ${choice.rewardPriority
            ? `<span class="upgrade-button__reward">${choice.rewardPriority === 'rank-up' ? 'Rank-Up' : choice.rewardPriority === 'evolution' ? 'EVO bereit' : 'Neue Option'}</span>`
            : ''}
          <span class="upgrade-button__description">${choice.description}</span>
          ${choice.synergyActive
            ? `<span class="upgrade-button__synergy">Synergie aktiv: ${choice.synergyDescription}</span>`
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

  showRoosterSelection(definitions) {
    this.overlay.classList.add('is-visible');
    this.overlay.innerHTML = `
      <div class="panel rooster-panel">
        <h1>Rooster Arena</h1>
        <p>Waehle deinen Rooster.</p>
        <div class="rooster-list"></div>
      </div>
    `;
    const list = this.overlay.querySelector('.rooster-list');
    definitions.forEach((definition) => {
      const button = document.createElement('button');
      button.className = `rooster-card rooster-card--${definition.id}`;
      button.type = 'button';
      button.innerHTML = `
        <span class="rooster-card__header">
          <span class="rooster-card__icon" data-rooster-icon></span>
          <span>
            <strong>${definition.name}</strong>
            <small>${definition.role}</small>
          </span>
        </span>
        <span class="rooster-card__stats">
          <span>HP ${definition.stats.maxHp}</span>
          <span>SPD ${definition.stats.speed}</span>
          <span>DMG ${definition.stats.projectileDamage}</span>
        </span>
        <span class="rooster-card__primary">${definition.primary.name}: ${definition.description}</span>
        <span class="rooster-card__passive">${definition.passive}</span>
      `;
      this.setIcon(button.querySelector('[data-rooster-icon]'), definition.icon);
      button.addEventListener('click', () => this.onRoosterSelected?.(definition.id), { once: true });
      list.append(button);
    });
  }

  showEndScreen(title, message) {
    this.overlay.classList.add('is-visible');
    this.overlay.innerHTML = `
      <div class="panel">
        <h1>${title}</h1>
        <p>${message}</p>
        <button class="restart-button"><span data-restart-icon></span><span>Restart</span></button>
      </div>
    `;
    this.setIcon(this.overlay.querySelector('[data-restart-icon]'), 'restart');
    this.overlay.querySelector('button').addEventListener('click', this.onRestart);
  }

  hideOverlay() {
    this.overlay.classList.remove('is-visible');
    this.overlay.innerHTML = '';
  }

  showWaveBanner(wave, config) {
    window.clearTimeout(this.waveBannerTimeout);
    this.waveBanner.textContent = `Wave ${wave}: ${config.name}`;
    this.waveBanner.classList.remove('is-visible');
    requestAnimationFrame(() => this.waveBanner.classList.add('is-visible'));
    this.waveBannerTimeout = window.setTimeout(() => {
      this.waveBanner.classList.remove('is-visible');
    }, 1500);
  }

  setJoystick(vector) {
    const x = 34 + vector.x * 28;
    const y = 34 + vector.y * 28;
    this.nub.style.transform = `translate(${x - 34}px, ${y - 34}px)`;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
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
    container.classList.toggle('is-empty', capacity === 0);
    for (let index = 0; index < capacity; index += 1) {
      const entry = entries[index];
      const icon = document.createElement('span');
      icon.className = `hud__upgrade-icon hud__upgrade-icon--${kind}`;
      if (!entry) {
        icon.classList.add('is-open');
        icon.title = `Freier ${kind === 'active' ? 'Active' : 'Passive'}-Slot`;
      } else {
        icon.title = `${entry.name} ${entry.rank === 'EVO' ? 'EVO' : `Rang ${entry.rank}`}`;
        icon.classList.toggle('is-evolved', entry.evolved);
        this.setIcon(icon, entry.evolutionId ?? entry.sourceId);
        const rank = document.createElement('small');
        rank.textContent = entry.rank === 'EVO' ? 'E' : entry.rank;
        icon.append(rank);
      }
      container.append(icon);
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
    this.root.remove();
    this.overlay.remove();
    this.joystick.remove();
    this.waveBanner.remove();
  }
}
