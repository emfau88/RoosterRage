// One measured slot below the combat HUD. A newer message replaces an older
// message of the same kind; priority warnings interrupt and then resume receipts.
export class CombatMessages {
  constructor(root, nodes, onActivate = () => {}) {
    this.root = root;
    this.nodes = nodes;
    this.onActivate = onActivate;
    this.pending = new Map();
    this.active = null;
    this.paused = false;
    this.playerHeld = false;
    this.playerRect = null;
    this.dock = document.createElement('div');
    this.dock.className = 'combat-messages';
    this.dock.setAttribute('role', 'status');
    this.dock.setAttribute('aria-live', 'polite');
    this.dock.append(...Object.values(nodes));
    document.body.append(this.dock);
    this.observer = new ResizeObserver(() => this.layout());
    this.observer.observe(root);
    this.observer.observe(this.dock);
    root.querySelectorAll('.hud__identity, .hud__metrics, .hud__controls, .hud__loadout, [data-boss]')
      .forEach(node => this.observer.observe(node));
    this.onResize = () => this.layout();
    window.addEventListener('resize', this.onResize);
    this.layout();
  }

  layout() {
    const rects = [...this.root.children].filter(node => {
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).map(node => node.getBoundingClientRect());
    const dock = this.dock.getBoundingClientRect();
    const width = dock.width;
    const candidates = [(innerWidth - width) / 2, innerWidth - width - 12, 12];
    // A short frame can use the free space beside the loadout, rather than
    // pushing a notice into the player's central escape area.
    const floors = [...new Set(rects.map(rect => Math.ceil(rect.bottom) + 8))].sort((a, b) => a - b);
    for (const top of floors) {
      for (const left of candidates) {
        const collides = rects.some(rect => rect.width && rect.height
          && left < rect.right + 6 && left + width > rect.left - 6
          && top < rect.bottom + 6 && top + dock.height > rect.top - 6);
        if (!collides) {
          this.dock.style.top = `${top}px`;
          this.dock.style.left = `${left}px`;
          return;
        }
      }
    }
    this.dock.style.top = `${Math.max(0, ...floors)}px`;
  }

  request(kind, duration) {
    const priority = { banner: 3, upgrade: 2, kill: 1 }[kind];
    if (this.active?.kind === kind) {
      this.active = null;
      window.clearTimeout(this.timer);
    } else if (this.active && priority > this.active.priority) {
      this.pending.set(this.active.kind, {
        ...this.active, remaining: this.remaining()
      });
      this.active = null;
      window.clearTimeout(this.timer);
    }
    if (!this.active) {
      this.playerHeld = false;
      this.dock.style.visibility = '';
    }
    this.pending.set(kind, { kind, priority, remaining: duration });
    this.next();
  }

  next() {
    if (this.active || this.paused) return;
    Object.values(this.nodes).forEach(node => node.classList.remove('is-visible'));
    const message = [...this.pending.values()].sort((a, b) => b.priority - a.priority)[0];
    if (!message) return;
    this.pending.delete(message.kind);
    this.active = { ...message, until: performance.now() + message.remaining };
    const node = this.nodes[message.kind];
    node.hidden = false;
    node.classList.add('is-visible');
    this.onActivate(message.kind, message.remaining);
    this.layout();
    this.startTimer(message.remaining);
    this.checkPlayerOverlap();
  }

  remaining() {
    return this.playerHeld ? this.active.remaining : Math.max(200, this.active.until - performance.now());
  }

  startTimer(duration) {
    window.clearTimeout(this.timer);
    this.active.until = performance.now() + duration;
    this.timer = window.setTimeout(() => {
      const node = this.nodes[this.active.kind];
      node.classList.remove('is-visible');
      this.active = null;
      this.playerHeld = false;
      this.dock.style.visibility = '';
      this.next();
    }, duration);
  }

  setPlayerRect(rect) {
    this.playerRect = rect;
    this.checkPlayerOverlap();
  }

  checkPlayerOverlap() {
    if (!this.active || this.paused) return;
    const p = this.playerRect, r = this.dock.getBoundingClientRect();
    const overlaps = this.active.kind !== 'banner' && p
      && p.left < r.right + 8 && p.right > r.left - 8
      && p.top < r.bottom + 8 && p.bottom > r.top - 8;
    if (overlaps && !this.playerHeld) {
      this.active.remaining = this.remaining();
      this.playerHeld = true;
      window.clearTimeout(this.timer);
      this.dock.style.visibility = 'hidden';
    } else if (!overlaps && this.playerHeld) {
      this.playerHeld = false;
      this.dock.style.visibility = '';
      this.startTimer(this.active.remaining);
    }
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused && this.active) {
      this.pending.set(this.active.kind, {
        ...this.active, remaining: this.remaining()
      });
      this.active = null;
      this.playerHeld = false;
      this.dock.style.visibility = '';
      window.clearTimeout(this.timer);
      Object.values(this.nodes).forEach(node => node.classList.remove('is-visible'));
    }
    if (!paused) this.next();
  }

  clear() {
    window.clearTimeout(this.timer);
    this.pending.clear();
    this.active = null;
    this.playerHeld = false;
    this.dock.style.visibility = '';
    Object.values(this.nodes).forEach(node => node.classList.remove('is-visible'));
  }

  destroy() {
    this.clear();
    this.observer.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.dock.remove();
  }
}
