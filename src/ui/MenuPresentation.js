import farmUrl from '../assets/ui/menu-preview-v1/farm-sunset.webp';
import logoUrl from '../assets/ui/menu-preview-v1/rooster-rage-logo.webp';
import loadingTrioUrl from '../assets/ui/menu-preview-v1/loading-rooster-trio-v2.webp';
import aceFullbodyUrl from '../assets/ui/menu-preview-v1/rooster-ace-fullbody-v1.webp';
import artilleryFullbodyUrl from '../assets/ui/menu-preview-v1/rooster-artillery-fullbody-v1.webp';
import stormFullbodyUrl from '../assets/ui/menu-preview-v1/rooster-storm-fullbody-v1.webp';
import './menu-presentation.css';

export const MENU_HERO_PORTRAITS = { ace: aceFullbodyUrl, artillery: artilleryFullbodyUrl, storm: stormFullbodyUrl };

export function installMenuPresentation() {
  // Keep a direct comparison available without changing settings or saved games.
  if (new URLSearchParams(location.search).get('menu') === 'classic') return;
  document.body.classList.add('menu-preview');
  document.documentElement.style.setProperty('--menu-farm', `url("${farmUrl}")`);
  document.documentElement.style.setProperty('--menu-logo', `url("${logoUrl}")`);
  const card = document.querySelector('.boot-loader__card');
  if (!card) return;
  const logo = document.createElement('img');
  logo.className = 'menu-loading-logo';
  logo.src = logoUrl;
  logo.alt = 'Rooster Rage';
  card.prepend(logo);
  const flock = document.createElement('img');
  flock.className = 'menu-loading-flock';
  flock.src = loadingTrioUrl;
  flock.alt = 'Storm, Ace and Artillery ready for the barnyard';
  flock.width = 1056;
  flock.height = 704;
  flock.fetchPriority = 'high';
  logo.after(flock);
}
