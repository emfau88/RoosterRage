import uiIconSheetUrl from '../assets/ui/ui-icons-v1-sheet.png';
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
  'Bigger Eggs': 'bigger-eggs'
};

export class HUD {
  constructor(onUpgradeSelected, onRestart) {
    this.onUpgradeSelected = onUpgradeSelected;
    this.onRestart = onRestart;
    document.documentElement.style.setProperty('--ui-icon-sheet', `url("${uiIconSheetUrl}")`);
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__item" data-hp><span data-icon="hp"></span><span data-value>HP 100/100</span></div>
      <div class="hud__item" data-level><span data-icon="badge-1"></span><span data-value>Level 1</span></div>
      <div class="hud__item" data-wave><span data-icon="wave"></span><span data-value>Wave 1/10</span></div>
      <div class="hud__item" data-time><span data-icon="timer"></span><span data-value>00:00</span></div>
      <div class="hud__bar"><span data-icon="xp"></span><div class="hud__bar-track"><div class="hud__bar-fill" data-xp></div></div></div>
      <div class="hud__upgrades" data-upgrades></div>
    `;
    this.root.querySelectorAll('[data-icon]').forEach((icon) => this.setIcon(icon, icon.dataset.icon));

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';

    this.joystick = document.createElement('div');
    this.joystick.className = 'joystick';
    this.joystick.innerHTML = '<div class="joystick__nub" data-nub></div>';
    this.nub = this.joystick.querySelector('[data-nub]');

    document.body.append(this.root, this.overlay, this.joystick);
  }

  update(state) {
    this.root.querySelector('[data-hp] [data-value]').textContent = `HP ${Math.ceil(state.hp)}/${state.maxHp}`;
    this.root.querySelector('[data-level] [data-value]').textContent = `Level ${state.level}`;
    this.root.querySelector('[data-wave] [data-value]').textContent = `Wave ${state.wave}/10`;
    this.root.querySelector('[data-time] [data-value]').textContent = this.formatTime(state.elapsed);
    this.root.querySelector('[data-xp]').style.width = `${state.xpPercent * 100}%`;
    this.renderActiveUpgrades(state.upgrades);
  }

  showUpgradeChoices(choices) {
    this.overlay.classList.add('is-visible');
    this.overlay.innerHTML = `
      <div class="panel">
        <h2>Level Up</h2>
        <p>Waehle ein Upgrade.</p>
        <div class="upgrade-list"></div>
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
          <strong>${choice.name}</strong>
          <span>${choice.description}</span>
        </span>
      `;
      this.setIcon(button.querySelector('[data-upgrade-icon]'), choice.id);
      this.setIcon(button.querySelector('[data-rarity-icon]'), `rarity-${choice.rarity ?? 'common'}`);
      button.addEventListener('click', () => this.onUpgradeSelected(choice), { once: true });
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
    const container = this.root.querySelector('[data-upgrades]');
    container.innerHTML = '';
    if (!upgrades.length) {
      const empty = document.createElement('span');
      empty.className = 'hud__upgrades-empty';
      empty.innerHTML = '<span data-empty-icon></span><span>Upgrades: -</span>';
      this.setIcon(empty.querySelector('[data-empty-icon]'), 'active-upgrade');
      container.append(empty);
      return;
    }
    upgrades.slice(-10).forEach((label) => {
      const icon = document.createElement('span');
      icon.className = 'hud__upgrade-icon';
      icon.title = label;
      this.setIcon(icon, this.iconIdFromLabel(label) ?? 'active-upgrade');
      container.append(icon);
    });
  }

  iconIdFromLabel(label) {
    const clean = label.replace(/\s+\d+$/, '');
    return ICON_IDS_BY_NAME[clean] ?? null;
  }

  setIcon(element, id) {
    if (!element) {
      return;
    }
    const frame = uiIconAtlas.frames[id] ?? uiIconAtlas.frames['active-upgrade'];
    const col = frame % ICON_COLUMNS;
    const row = Math.floor(frame / ICON_COLUMNS);
    element.classList.add('ui-icon');
    const x = ICON_COLUMNS <= 1 ? 0 : (col / (ICON_COLUMNS - 1)) * 100;
    const y = ICON_ROWS <= 1 ? 0 : (row / (ICON_ROWS - 1)) * 100;
    element.style.setProperty('--icon-x', `${x}%`);
    element.style.setProperty('--icon-y', `${y}%`);
  }

  destroy() {
    this.root.remove();
    this.overlay.remove();
    this.joystick.remove();
  }
}
