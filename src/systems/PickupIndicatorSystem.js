import healUrl from '@portal-pickup-heal';
import bombUrl from '@portal-pickup-bomb';
import magnetUrl from '@portal-pickup-magnet';
import chestUrl from '../assets/pickups/pickup-elite-chest.webp';

const TYPES = ['heal', 'bomb', 'magnet', 'chest'];
const ICONS = { heal: healUrl, bomb: bombUrl, magnet: magnetUrl, chest: chestUrl };
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
      node.innerHTML = '<span class="pickup-indicator__arrow">▲</span><img alt=""><span class="pickup-indicator__distance"><b></b><span aria-hidden="true"><i></i><i></i><i></i></span></span>';
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
      left: rect.left + 52,
      right: rect.right - 52,
      top: rect.top + (compact ? 126 : 116),
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
      const kind = pickup.chest ? 'chest' : pickup.kind;
      if (!TYPES.includes(kind) || !pickup.sprite.active || pickup.opening) continue;
      // A visible pickup should not conceal another collectible of its type
      // that was left behind outside the camera.
      const { x, y } = pickup.sprite;
      if (x >= view.x && x <= view.right && y >= view.y && y <= view.bottom) continue;
      const dx = pickup.sprite.x - player.x;
      const dy = pickup.sprite.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (!nearest.has(kind) || distance < nearest.get(kind).distance) {
        nearest.set(kind, { pickup, distance });
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
        projected,
        distance: target.distance
      });
    }
    // At most four indicators exist. Find a free slot along the same edge,
    // including when all types point toward the same corner.
    for (let index = 0; index < placements.length; index += 1) {
      const current = placements[index];
      const vertical = current.edge === 'side';
      const axis = vertical ? 'y' : 'x';
      const initial = current[axis];
      for (const offset of [0, 64, -64, 128, -128, 192, -192, 256, -256]) {
        current[axis] = clamp(initial + offset, vertical ? safe.top : safe.left, vertical ? safe.bottom : safe.right);
        if (placements.slice(0, index).every((other) => Math.hypot(current.x - other.x, current.y - other.y) >= 63)) break;
      }
    }
    for (const entry of placements) {
      const { node, kind } = entry;
      node.hidden = false;
      node.style.left = `${entry.x}px`;
      node.style.top = `${entry.y}px`;
      const angle = Math.atan2(entry.projected.y - entry.y, entry.projected.x - entry.x);
      const arrow = node.querySelector('.pickup-indicator__arrow');
      arrow.style.transform = `translate(-50%, -50%) rotate(${angle * 180 / Math.PI + 90}deg)`;
      arrow.style.left = `${20 + Math.cos(angle) * 32}px`;
      arrow.style.top = `${20 + Math.sin(angle) * 32}px`;
      const threshold = Math.max(view.width, view.height);
      const tier = entry.distance < threshold * 0.75 ? 1 : entry.distance < threshold * 1.5 ? 2 : 3;
      node.dataset.distanceTier = String(tier);
      node.querySelector('.pickup-indicator__distance b').textContent = ['NEAR', 'FAR', 'DISTANT'][tier - 1];
      node.classList.toggle('is-royal', kind === 'chest' && nearest.get(kind).pickup.kind === 'royal-chest');
      node.classList.toggle('is-urgent', kind === 'heal' && scene.player.hp < scene.player.maxHp);
    }
  }

  destroy() {
    this.root.remove();
    this.nodes.clear();
  }
}
