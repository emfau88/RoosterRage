import uiIconSheetUrl from '../assets/ui/ui-icons-v1-sheet.webp';
import uiIconAtlas from '../assets/ui/ui-icons-v1.json';
import acePortraitUrl from '../assets/characters/rooster-ace-portrait.webp';
import artilleryPortraitUrl from '../assets/characters/rooster-artillery-portrait.webp';
import stormPortraitUrl from '../assets/characters/rooster-storm-portrait.webp';

const ROOSTER_PORTRAITS = {
  ace: acePortraitUrl,
  artillery: artilleryPortraitUrl,
  storm: stormPortraitUrl
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
  'evo-thunder-roost': 'lightning-comb',
  'evo-shell-halo': 'orbit-eggs',
  'evo-singularity-nest': 'void-nest',
  'evo-dawn-laser': 'laser-comb',
  'evo-chick-squadron': 'support-chick',
  'primary-ace': 'active-upgrade',
  'primary-artillery': 'rocket-egg',
  'primary-storm': 'lightning-comb'
};

export class HUD {
  constructor(onUpgradeSelected, onRestart, onFullscreen, onRoosterSelected, onReroll, onSettings, onAnalyticsConsent) {
    this.onUpgradeSelected = onUpgradeSelected;
    this.onRestart = onRestart;
    this.onFullscreen = onFullscreen;
    this.onRoosterSelected = onRoosterSelected;
    this.onReroll = onReroll;
    this.onSettings = onSettings;
    this.onAnalyticsConsent = onAnalyticsConsent;
    document.documentElement.style.setProperty('--ui-icon-sheet', `url("${uiIconSheetUrl}")`);
    document.documentElement.style.setProperty('--ui-icon-columns', `${ICON_COLUMNS * 100}%`);
    document.documentElement.style.setProperty('--ui-icon-rows', `${ICON_ROWS * 100}%`);
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__identity" data-identity>
        <span class="hud__avatar-shell"><img data-rooster-avatar alt="Ausgewaehlter Rooster"></span>
        <div class="hud__vitals">
          <div class="hud__identity-heading" data-level>
            <span><small>ROOSTER</small><strong data-value>Level 1</strong></span>
            <b data-hp-value>100 / 100 HP</b>
          </div>
          <div class="hud__health" data-hp><i data-hp-fill></i></div>
          <div class="hud__xp-row"><span data-icon="xp"></span><div class="hud__bar-track"><div class="hud__bar-fill" data-xp></div></div></div>
        </div>
      </div>
      <div class="hud__metrics">
        <div class="hud__item" data-time><span data-icon="timer"></span><span><small>RUN</small><strong data-value>00:00</strong></span></div>
        <div class="hud__item hud__item--wave" data-wave><span data-icon="wave"></span><span><small>WELLE</small><strong data-value>Wave 1/10</strong></span><span class="hud__wave-track"><i data-wave-fill></i></span></div>
        <div class="hud__item" data-kills><span data-icon="enemy"></span><span><small>JAGD</small><strong data-value>0 Kills</strong></span></div>
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
        <button class="hud__icon-button" type="button" data-settings title="Einstellungen" aria-label="Einstellungen">
          <span class="settings-glyph" aria-hidden="true">SET</span>
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

    document.body.append(this.root, this.overlay, this.joystick, this.waveBanner);
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
    this.root.querySelector('[data-hp-value]').textContent = `${Math.ceil(state.hp)} / ${state.maxHp} HP`;
    const challengeSuffix = state.challenge?.id && state.challenge.id !== 'standard'
      ? ` · ${state.challenge.name}`
      : '';
    this.root.querySelector('[data-wave] [data-value]').textContent = `Wave ${state.wave}/10${challengeSuffix}`;
    this.root.querySelector('[data-time] [data-value]').textContent = this.formatTime(state.elapsed);
    this.root.querySelector('[data-kills] [data-value]').textContent = `${state.kills ?? 0} Kills`;
    this.root.querySelector('[data-xp]').style.width = `${state.xpPercent * 100}%`;
    this.root.querySelector('[data-wave-fill]').style.width = `${(state.waveProgress?.percent ?? 0) * 100}%`;
    const bossHud = this.root.querySelector('[data-boss]');
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
          ${this.renderRankPips(choice.rankProgress)}
          <span class="upgrade-button__meta">${choice.categoryLabel ?? choice.category}</span>
          ${choice.rewardPriority
            ? `<span class="upgrade-button__reward">${choice.rewardPriority === 'rank-up' ? 'Rank-Up' : choice.rewardPriority === 'evolution' ? 'EVO bereit' : 'Neue Option'}</span>`
            : ''}
          <span class="upgrade-button__description">${choice.description}</span>
          ${choice.synergyActive
            ? `<span class="upgrade-button__synergy">Synergie aktiv: ${choice.synergyDescription}</span>`
            : ''}
          ${choice.evolutionHint
            ? `<span class="upgrade-button__evolution-hint">EVO ${choice.evolutionHint.name}: R4 ${choice.evolutionHint.baseReady ? '✓' : '○'} · ${choice.evolutionHint.passiveName} ${choice.evolutionHint.passiveOwned ? '✓' : '○'}</span>`
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
    let selectedChallenge = hub.selectedChallenge ?? 'standard';
    const challengeCards = (hub.challenges ?? []).map((challenge) => `
      <button class="challenge-card ${challenge.id === selectedChallenge ? 'is-selected' : ''} ${challenge.unlocked ? '' : 'is-locked'}"
        type="button" data-challenge="${challenge.id}" ${challenge.unlocked ? '' : 'disabled'}>
        <strong>${challenge.name}</strong>
        <span>${challenge.description}</span>
        <small>${challenge.unlocked ? (challenge.arenaId ?? 'Freie Arena') : `Gesperrt: ${challenge.unlockLabel}`}</small>
      </button>
    `).join('');
    const historyRows = (hub.history ?? []).length
      ? hub.history.map((run) => `
        <li><strong>${run.roosterName}</strong><span>${run.outcome === 'victory' ? 'Sieg' : 'Niederlage'} · ${run.kills} Kills · ${this.formatDuration(run.elapsedMs)}</span></li>
      `).join('')
      : '<li><span>Noch kein Run gespeichert.</span></li>';
    const enemyRows = (hub.lexicon?.enemies ?? []).map((enemy) => `
      <li class="${enemy.seen ? '' : 'is-undiscovered'}"><strong>${enemy.id.replaceAll('-', ' ')}</strong><span>${enemy.purpose} · ${enemy.counterplay}</span></li>
    `).join('');
    const evoRows = (hub.lexicon?.evolutions ?? []).map((evolution) => `
      <li class="${evolution.discovered ? '' : 'is-undiscovered'}"><strong>${evolution.name}</strong><span>${evolution.base.replaceAll('-', ' ')} + ${evolution.passive.replaceAll('-', ' ')}</span></li>
    `).join('');
    this.overlay.classList.add('is-visible');
    this.overlay.innerHTML = `
      <div class="panel rooster-panel henhouse-panel">
        <div class="henhouse-heading">
          <div><small>ROOSTER RAGE</small><h1>Hennenhuette</h1></div>
          <div class="henhouse-stats">
            <span><strong>${progress.totalRuns}</strong> Runs</span>
            <span><strong>${progress.victories}</strong> Siege</span>
            <span><strong>${progress.totalKills}</strong> Kills</span>
          </div>
          <button type="button" class="henhouse-settings" data-hub-settings>Einstellungen</button>
        </div>
        <p>Waehle Challenge und Rooster. Fortschritt schaltet nur neue Optionen frei, keine Pflicht-Stats.</p>
        <h2>Challenge</h2>
        <div class="challenge-list">${challengeCards}</div>
        <h2>Rooster</h2>
        <div class="rooster-list"></div>
        <div class="henhouse-drawers">
          <details>
            <summary>Bestwerte & Run-Historie</summary>
            <div class="personal-bests">
              <span><small>Meiste Kills</small><strong>${bests.highestKills}</strong></span>
              <span><small>Laengster Run</small><strong>${this.formatDuration(bests.longestRunMs)}</strong></span>
              <span><small>Schnellster Sieg</small><strong>${bests.fastestVictoryMs === null ? '–' : this.formatDuration(bests.fastestVictoryMs)}</strong></span>
            </div>
            <ul class="history-list">${historyRows}</ul>
          </details>
          <details>
            <summary>Gegner-Lexikon</summary>
            <ul class="lexicon-list">${enemyRows}</ul>
          </details>
          <details>
            <summary>EVO-Rezepte</summary>
            <ul class="lexicon-list">${evoRows}</ul>
          </details>
        </div>
        <div class="henhouse-privacy">
          <span><strong>Anonyme Demo-Messung</strong><small>Nur Funnel und Run-Eckdaten, keine Konten, Cookies oder Werbe-IDs.</small></span>
          <button type="button" data-analytics-toggle aria-pressed="${Boolean(hub.analytics?.enabled)}">${hub.analytics?.enabled ? 'AN' : 'AUS'}</button>
        </div>
      </div>
    `;
    const list = this.overlay.querySelector('.rooster-list');
    this.overlay.querySelector('[data-hub-settings]')?.addEventListener('click', () => this.onSettings?.());
    definitions.forEach((definition) => {
      const meta = hub.roosters?.find((rooster) => rooster.id === definition.id)
        ?? { unlocked: true, cosmetics: [], runs: 0, wins: 0 };
      const entry = document.createElement('div');
      entry.className = 'rooster-entry';
      const button = document.createElement('button');
      button.className = `rooster-card rooster-card--${definition.id} ${meta.unlocked ? '' : 'is-locked'}`;
      button.type = 'button';
      button.disabled = !meta.unlocked;
      button.innerHTML = `
        <span class="rooster-card__portrait">
          <img src="${ROOSTER_PORTRAITS[definition.id]}" alt="${definition.name} Portrait">
          <span class="rooster-card__portrait-shade"></span>
          <span class="rooster-card__header">
            <span class="rooster-card__icon" data-rooster-icon></span>
            <span>
            <strong>${definition.name}</strong>
            <small>${definition.role}</small>
            </span>
          </span>
        </span>
        <span class="rooster-card__stats">
          <span>HP ${definition.stats.maxHp}</span>
          <span>SPD ${definition.stats.speed}</span>
          <span>DMG ${definition.stats.projectileDamage}</span>
        </span>
        <span class="rooster-card__primary">${definition.primary.name}: ${definition.description}</span>
        <span class="rooster-card__passive">${definition.passive}</span>
        <span class="rooster-card__progress">${meta.unlocked ? `${meta.runs} Runs · ${meta.wins} Siege` : `Gesperrt: ${meta.unlockLabel}`}</span>
      `;
      this.setIcon(button.querySelector('[data-rooster-icon]'), definition.icon);
      button.addEventListener('click', () => this.onRoosterSelected?.(definition.id, selectedChallenge), { once: true });
      entry.append(button);
      if (meta.cosmetics?.length) {
        const cosmetics = document.createElement('div');
        cosmetics.className = 'cosmetic-list';
        cosmetics.innerHTML = `
          <button type="button" data-cosmetic="" class="${meta.selectedCosmetic ? '' : 'is-selected'}">Original</button>
          ${meta.cosmetics.map((cosmetic) => `
            <button type="button" data-cosmetic="${cosmetic.id}" class="${meta.selectedCosmetic === cosmetic.id ? 'is-selected' : ''}"
              ${cosmetic.unlocked ? '' : 'disabled'} title="${cosmetic.unlocked ? cosmetic.name : cosmetic.unlockLabel}">
              ${cosmetic.unlocked ? cosmetic.name : 'Gesperrt'}
            </button>
          `).join('')}`;
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
    this.overlay.querySelectorAll('[data-challenge]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedChallenge = button.dataset.challenge;
        this.overlay.querySelectorAll('[data-challenge]').forEach((candidate) => (
          candidate.classList.toggle('is-selected', candidate === button)
        ));
      });
    });
    this.overlay.querySelector('[data-analytics-toggle]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      const state = this.onAnalyticsConsent?.(next) ?? { enabled: next };
      button.setAttribute('aria-pressed', String(state.enabled));
      button.textContent = state.enabled ? 'AN' : 'AUS';
    });
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
    const unlocks = (report.newUnlocks ?? []).map((unlock) => `
      <span><strong>${unlock.type === 'rooster' ? 'Rooster' : unlock.type === 'challenge' ? 'Challenge' : 'Kosmetik'}</strong>${this.formatSource(unlock.id)}</span>
    `).join('');
    this.overlay.classList.add('is-visible');
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
        ${unlocks ? `<div class="run-report__unlocks"><h2>Neu freigeschaltet</h2>${unlocks}</div>` : ''}
        <div class="run-report__table-wrap">
          <table>
            <thead><tr><th>Quelle</th><th>Schaden</th><th>Share</th><th>Treffer</th><th>Kills</th><th>Overkill</th><th>Aktiv</th></tr></thead>
            <tbody>${sourceRows}</tbody>
          </table>
        </div>
        <button class="restart-button"><span data-restart-icon></span><span>Zur Hennenhuette</span></button>
      </div>
    `;
    this.setIcon(this.overlay.querySelector('[data-restart-icon]'), 'restart');
    this.overlay.querySelector('button').addEventListener('click', this.onRestart);
  }

  showSettings(effectSettings, audioSettings, onEffectToggle, onAudioChange, onClose) {
    const labels = {
      damageNumbers: 'Damage Numbers',
      screenShake: 'Screen Shake',
      screenFlash: 'Screen Flash',
      vibration: 'Vibration'
    };
    const audioLabels = {
      master: 'Master',
      sfx: 'Soundeffekte',
      ui: 'UI',
      music: 'Musik',
      ambience: 'Ambiente'
    };
    this.overlay.classList.add('is-visible');
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
        </div>
        <h3>Audio</h3>
        <div class="settings-list settings-list--audio">
          ${Object.entries(audioLabels).map(([key, label]) => `
            <label class="settings-volume">
              <span>${label}</span>
              <input type="range" min="0" max="1" step="0.05" value="${audioSettings[key]}"
                data-audio-volume="${key}" aria-label="${label} Lautstaerke">
              <strong>${Math.round(audioSettings[key] * 100)}%</strong>
            </label>`).join('')}
        </div>
        <button class="settings-close" type="button">Weiter</button>
      </div>`;
    this.overlay.querySelectorAll('[data-effect]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = onEffectToggle?.(button.dataset.effect) ?? effectSettings;
        button.setAttribute('aria-pressed', String(next[button.dataset.effect]));
        button.querySelector('strong').textContent = next[button.dataset.effect] ? 'AN' : 'AUS';
      });
    });
    this.overlay.querySelectorAll('[data-audio-volume]').forEach((input) => {
      input.addEventListener('input', () => {
        const next = onAudioChange?.(input.dataset.audioVolume, Number(input.value)) ?? audioSettings;
        input.closest('.settings-volume').querySelector('strong').textContent = `${Math.round(next[input.dataset.audioVolume] * 100)}%`;
      });
    });
    this.overlay.querySelector('.settings-close').addEventListener('click', () => onClose?.(), { once: true });
  }

  hideOverlay() {
    this.overlay.classList.remove('is-visible');
    this.overlay.innerHTML = '';
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
