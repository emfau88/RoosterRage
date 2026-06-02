export class HUD {
  constructor(onUpgradeSelected, onRestart) {
    this.onUpgradeSelected = onUpgradeSelected;
    this.onRestart = onRestart;
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__item" data-hp>HP 100/100</div>
      <div class="hud__item" data-level>Level 1</div>
      <div class="hud__item" data-wave>Wave 1/3</div>
      <div class="hud__item" data-time>00:00</div>
      <div class="hud__bar"><div class="hud__bar-fill" data-xp></div></div>
      <div class="hud__upgrades" data-upgrades>Upgrades: -</div>
    `;

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';

    this.joystick = document.createElement('div');
    this.joystick.className = 'joystick';
    this.joystick.innerHTML = '<div class="joystick__nub" data-nub></div>';
    this.nub = this.joystick.querySelector('[data-nub]');

    document.body.append(this.root, this.overlay, this.joystick);
  }

  update(state) {
    this.root.querySelector('[data-hp]').textContent = `HP ${Math.ceil(state.hp)}/${state.maxHp}`;
    this.root.querySelector('[data-level]').textContent = `Level ${state.level}`;
    this.root.querySelector('[data-wave]').textContent = `Wave ${state.wave}/10`;
    this.root.querySelector('[data-time]').textContent = this.formatTime(state.elapsed);
    this.root.querySelector('[data-xp]').style.width = `${state.xpPercent * 100}%`;
    this.root.querySelector('[data-upgrades]').textContent = `Upgrades: ${state.upgrades.join(', ') || '-'}`;
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
      button.className = 'upgrade-button';
      button.innerHTML = `${choice.name}<span>${choice.description}</span>`;
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
        <button class="restart-button">Restart</button>
      </div>
    `;
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

  destroy() {
    this.root.remove();
    this.overlay.remove();
    this.joystick.remove();
  }
}
