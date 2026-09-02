import './styles.css';
import groundUrl from '../assets/map/arena-ground-farm.webp';
import slimeUrl from '../assets/enemy-slime.webp';
import eggUrl from '../assets/projectiles/egg.webp';
import { loadAceParts } from '../ace-preview/assets.js';
import { ACE_WALK_PERIOD_MS, drawAcePose, sampleAcePose } from '../ace-preview/aceFourDirectionPose.js';
import {
  ACE_GAMEPLAY_WALK_PERIOD_MS,
  sampleAceGameplayPose,
} from '../ace-preview/aceGameplayPose.js';

const canvas = document.querySelector('#stage');
const context = canvas.getContext('2d');
const statusLabel = document.querySelector('#status-label');
const cameraSelect = document.querySelector('#camera-profile');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const directionButtons = [...document.querySelectorAll('[data-direction]')];
const cameraProfiles = {
  desktop: { label: 'DESKTOP · 100 %', scale: 0.25 },
  portrait: { label: 'MOBILE PORTRAIT · 85 %', scale: 0.25 * 0.85 },
  feed: { label: 'FEED ALLEY · 54 %', scale: 0.25 * 0.54 },
};
const directionLabels = { south: 'SÜD', west: 'WEST', north: 'NORD', east: 'OST' };
const state = { mode: 'walk', direction: 'south', phase: 0, time: 0, camera: 'portrait' };

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function select(buttons, attribute, value) {
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset[attribute] === value));
}

for (const button of modeButtons) button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  select(modeButtons, 'mode', state.mode);
});
for (const button of directionButtons) button.addEventListener('click', () => {
  state.direction = button.dataset.direction;
  select(directionButtons, 'direction', state.direction);
});
cameraSelect.addEventListener('change', () => { state.camera = cameraSelect.value; });

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth;
  const height = width * 13 / 24;
  const targetWidth = Math.round(width * dpr);
  const targetHeight = Math.round(height * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  context.setTransform(targetWidth / 1200, 0, 0, targetHeight / 650, 0, 0);
}

function drawLabel(x, title, subtitle, candidate = false) {
  context.save();
  context.textAlign = 'center';
  context.fillStyle = 'rgba(13,15,12,.88)';
  context.strokeStyle = candidate ? '#d9a23d' : '#565248';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x - 110, 72, 220, 48, 8);
  context.fill(); context.stroke();
  context.fillStyle = candidate ? '#ffd56c' : '#f4eddf';
  context.font = '700 14px Inter, sans-serif';
  context.fillText(title, x, 93);
  context.fillStyle = '#aba596';
  context.font = '11px Inter, sans-serif';
  context.fillText(subtitle, x, 109);
  context.restore();
}

function drawHealthBar(x, y, width) {
  context.fillStyle = '#321719'; context.fillRect(x - width / 2 - 1, y - 1, width + 2, 7);
  context.fillStyle = '#5cff74'; context.fillRect(x - width / 2, y, width, 5);
}

function drawCharacter(images, sampler, x, y, scale, phase, movement, time) {
  const pose = sampler({ direction: state.direction, phase, movement, timeMs: time });
  context.save();
  context.translate(x - 128 * scale, y - 128 * scale);
  context.scale(scale, scale);
  drawAcePose(context, images, pose, { shadow: false });
  context.restore();
  drawHealthBar(x, y - 49 * (scale / 0.25), 54 * (scale / 0.25));
}

function drawCombatClutter(slime, egg, time) {
  const enemies = [[238, 252], [294, 278], [908, 254], [965, 286], [1030, 235], [596, 482]];
  for (let index = 0; index < enemies.length; index++) {
    const [x, y] = enemies[index];
    const bob = Math.sin(time * 0.004 + index) * 3;
    context.drawImage(slime, x - 22, y - 22 + bob, 44, 44);
    context.fillStyle = '#d9364b'; context.fillRect(x - 18, y - 31 + bob, 36, 4);
  }
  for (let index = 0; index < 7; index++) {
    const angle = time * 0.0017 + index * Math.PI * 2 / 7;
    const x = 600 + Math.cos(angle) * (120 + index * 18);
    const y = 340 + Math.sin(angle * 1.2) * (75 + index * 9);
    context.save(); context.translate(x, y); context.rotate(angle);
    context.drawImage(egg, -8, -8, 16, 16); context.restore();
  }
}

Promise.all([loadAceParts(), loadImage(groundUrl), loadImage(slimeUrl), loadImage(eggUrl)]).then(([images, ground, slime, egg]) => {
  let previous = performance.now();
  const render = (now) => {
    resize();
    const delta = Math.min(50, now - previous); previous = now; state.time += delta;
    if (state.mode === 'walk') state.phase = (state.phase + delta / ACE_WALK_PERIOD_MS) % 1;
    const profile = cameraProfiles[state.camera];
    const pattern = context.createPattern(ground, 'repeat');
    context.fillStyle = pattern; context.fillRect(0, 0, 1200, 650);
    context.fillStyle = 'rgba(35,26,11,.16)'; context.fillRect(0, 0, 1200, 650);
    context.strokeStyle = 'rgba(255,255,255,.12)'; context.setLineDash([6, 8]);
    context.beginPath(); context.moveTo(600, 58); context.lineTo(600, 610); context.stroke(); context.setLineDash([]);
    drawCombatClutter(slime, egg, state.time);
    drawLabel(420, 'AKTUELLER ACE', `Scale ${profile.scale.toFixed(3)}`);
    drawLabel(780, 'ACE GAMEPLAY', `Scale ${profile.scale.toFixed(3)}`, true);
    const movement = state.mode === 'walk' ? 1 : 0;
    drawCharacter(images, sampleAcePose, 420, 350, profile.scale, state.phase, movement, state.time);
    const gameplayPhase = state.phase * ACE_WALK_PERIOD_MS / ACE_GAMEPLAY_WALK_PERIOD_MS;
    drawCharacter(images, sampleAceGameplayPose, 780, 350, profile.scale, gameplayPhase, movement, state.time);
    context.fillStyle = 'rgba(8,10,8,.78)'; context.fillRect(0, 584, 1200, 66);
    context.fillStyle = '#ddd4c1'; context.font = '12px Inter, sans-serif'; context.textAlign = 'center';
    context.fillText('Gleiche Spielgröße · gleiche Phase · gleiche Kampfkulisse', 600, 613);
    context.fillStyle = '#aaa28f';
    context.fillText('Achte auf Schrittwechsel, Körpergewicht und Erkennbarkeit beim kurzen Hinschauen.', 600, 634);
    statusLabel.textContent = `${profile.label} · ${directionLabels[state.direction]} · ${state.mode === 'walk' ? 'LAUFEN' : 'IDLE'}`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
});
