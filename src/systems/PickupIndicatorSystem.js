import healUrl from '@portal-pickup-heal';
import bombUrl from '@portal-pickup-bomb';
import magnetUrl from '@portal-pickup-magnet';

const TYPES = ['heal', 'bomb', 'magnet'];
const ICONS = { heal: healUrl, bomb: bombUrl, magnet: magnetUrl };
const CLASSIC_FEEDBACK = import.meta.env?.DEV
  && new URLSearchParams(globalThis.location?.search ?? '').get('feedbackCompare') === 'before';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export class PickupIndicatorSystem {
  constructor(scene) {
    this.scene = scene;
    this.root = document.createElement('div');
    this.root.className = 'pickup-indicators';
    this.nodes = new Map();
    for (const kind of TYPES) {
      const node = document.createElement('div');
      node.className = `pickup-indicator pickup-indicator--${kind}`;
      node.dataset.pickupKind = kind;
      node.hidden = true;
      node.innerHTML = '<span class="pickup-indicator__arrow">▲</span><img alt=""><span class="pickup-indicator__distance" aria-hidden="true"><i></i><i></i><i></i></span>';
      node.querySelector('img').src = ICONS[kind];
      this.root.append(node);
      this.nodes.set(kind, node);
    }
    document.body.append(this.root);
  }

  hide() {
    for (const node of this.nodes.values()) node.hidden = true;
  }

  update() {
    const { scene } = this;
    if (CLASSIC_FEEDBACK || scene.gameEnded || scene.isChoosingRooster || scene.isChoosingUpgrade
      || scene.isSettingsOpen || scene.gamePause?.isPaused) {
      this.hide();
      return;
    }
    const canvas = scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const view = scene.cameras.main.worldView;
    const compact = rect.width < 760;
    const safe = {
      left: rect.left + (compact ? 33 : 42),
      right: rect.right - (compact ? 33 : 42),
      top: rect.top + (compact ? 112 : 94),
      bottom: rect.bottom - (compact ? 156 : 56)
    };
    if (safe.right <= safe.left || safe.bottom <= safe.top) {
      this.hide();
      return;
    }
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const nearest = new Map();
    const player = scene.player.groundMarker;
    for (const pickup of scene.pickups.items) {
      if (!TYPES.includes(pickup.kind) || !pickup.sprite.active) continue;
      const dx = pickup.sprite.x - player.x;
      const dy = pickup.sprite.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (!nearest.has(pickup.kind) || distance < nearest.get(pickup.kind).distance) {
        nearest.set(pickup.kind, { pickup, distance });
      }
    }
    const placements = [];
    for (const kind of TYPES) {
      const node = this.nodes.get(kind);
      const target = nearest.get(kind);
      if (!target) { node.hidden = true; continue; }
      const { x, y } = target.pickup.sprite;
      if (x >= view.x && x <= view.right && y >= view.y && y <= view.bottom) {
        node.hidden = true;
        continue;
      }
      const projected = {
        x: rect.left + (x - view.x) / view.width * rect.width,
        y: rect.top + (y - view.y) / view.height * rect.height
      };
      const dx = projected.x - center.x;
      const dy = projected.y - center.y;
      const tx = dx > 0 ? (safe.right - center.x) / dx : dx < 0 ? (safe.left - center.x) / dx : Infinity;
      const ty = dy > 0 ? (safe.bottom - center.y) / dy : dy < 0 ? (safe.top - center.y) / dy : Infinity;
      const t = Math.max(0, Math.min(tx, ty));
      const edge = tx < ty ? 'side' : 'horizontal';
      placements.push({
        kind, node, edge,
        x: clamp(center.x + dx * t, safe.left, safe.right),
        y: clamp(center.y + dy * t, safe.top, safe.bottom),
        angle: Math.atan2(dy, dx) * 180 / Math.PI + 90,
        distance: target.distance
      });
    }
    // At most three indicators exist. Offset later ones along their edge until
    // nearby arrows no longer cover each other.
    for (let index = 0; index < placements.length; index += 1) {
      const current = placements[index];
      for (let earlier = 0; earlier < index; earlier += 1) {
        const other = placements[earlier];
        if (Math.hypot(current.x - other.x, current.y - other.y) >= 44) continue;
        if (current.edge === 'side') {
          const down = other.y + 44;
          current.y = down <= safe.bottom ? down : clamp(other.y - 44, safe.top, safe.bottom);
        } else {
          const right = other.x + 44;
          current.x = right <= safe.right ? right : clamp(other.x - 44, safe.left, safe.right);
        }
      }
    }
    for (const entry of placements) {
      const { node, kind } = entry;
      node.hidden = false;
      node.style.left = `${entry.x}px`;
      node.style.top = `${entry.y}px`;
      node.querySelector('.pickup-indicator__arrow').style.rotate = `${entry.angle}deg`;
      const threshold = Math.max(view.width, view.height);
      const tier = entry.distance < threshold * 1.5 ? 1 : entry.distance < threshold * 3 ? 2 : 3;
      node.dataset.distanceTier = String(tier);
      node.classList.toggle('is-urgent', kind === 'heal' && scene.player.hp < scene.player.maxHp);
    }
  }

  destroy() {
    this.root.remove();
    this.nodes.clear();
  }
}
