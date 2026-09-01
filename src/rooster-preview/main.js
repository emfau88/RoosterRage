import '../ace-preview/styles.css';
import './styles.css';
import { loadRoosterParts } from './assets.js';
import {
  ARTILLERY_WALK_PERIOD_MS,
  drawArtilleryPose,
  sampleArtilleryPose
} from '../artillery-preview/artilleryFourDirectionPose.js';
import {
  STORM_WALK_PERIOD_MS,
  drawStormPose,
  sampleStormPose
} from '../storm-preview/stormFourDirectionPose.js';

const canvas = document.getElementById('stage');
const context = canvas.getContext('2d');
const status = document.getElementById('load-status');
const modeLabel = document.getElementById('mode-label');
const characterLabel = document.getElementById('character-label');
const idleMode = document.getElementById('idle-mode');
const runToggle = document.getElementById('run-toggle');
const tourToggle = document.getElementById('tour-toggle');
const scaleSelect = document.getElementById('scale');
const characterButtons = [...document.querySelectorAll('[data-character]')];
const directionButtons = [...document.querySelectorAll('[data-direction]')];
const directionNames = { south: 'SÜD', west: 'WEST', north: 'NORD', east: 'OST' };
const directionVectors = { north: [0, -1], west: [-1, 0], south: [0, 1], east: [1, 0] };
const keyDirections = { w: 'north', arrowup: 'north', a: 'west', arrowleft: 'west', s: 'south', arrowdown: 'south', d: 'east', arrowright: 'east' };
const numberDirections = { '1': 'south', '2': 'west', '3': 'north', '4': 'east' };
const characters = {
  artillery: { label: 'BUMMBERT', accent: '#d59452', gameScale: 0.275, period: ARTILLERY_WALK_PERIOD_MS, sample: sampleArtilleryPose, draw: drawArtilleryPose },
  storm: { label: 'BLITZKAMM', accent: '#5ad7ff', gameScale: 0.235, period: STORM_WALK_PERIOD_MS, sample: sampleStormPose, draw: drawStormPose }
};
const held = new Set();
const state = { character: 'artillery', direction: 'south', phase: 0, movement: 0, runInPlace: false, tour: false, scale: 1, x: 480, y: 280, time: 0 };

function activeCharacter() { return characters[state.character]; }
function effectiveScale() { return scaleSelect.value === 'game' ? activeCharacter().gameScale : Number(scaleSelect.value); }
function setCharacter(character) {
  state.character = character;
  state.phase = 0;
  const config = activeCharacter();
  document.documentElement.style.setProperty('--preview-accent', config.accent);
  characterLabel.textContent = `${config.label} / NEXT`;
  for (const button of characterButtons) button.setAttribute('aria-pressed', String(button.dataset.character === character));
}
function setDirection(direction) {
  state.direction = direction;
  for (const button of directionButtons) button.setAttribute('aria-pressed', String(button.dataset.direction === direction));
}
function setPlayback(mode) {
  state.runInPlace = mode === 'run';
  state.tour = mode === 'tour';
  idleMode.setAttribute('aria-pressed', String(mode === 'idle'));
  runToggle.setAttribute('aria-pressed', String(mode === 'run'));
  tourToggle.setAttribute('aria-pressed', String(mode === 'tour'));
}

for (const button of characterButtons) button.addEventListener('click', () => { setCharacter(button.dataset.character); canvas.focus(); });
for (const button of directionButtons) button.addEventListener('click', () => { if (state.tour) setPlayback('idle'); setDirection(button.dataset.direction); canvas.focus(); });
idleMode.addEventListener('click', () => { setPlayback('idle'); canvas.focus(); });
runToggle.addEventListener('click', () => { setPlayback(state.runInPlace ? 'idle' : 'run'); canvas.focus(); });
tourToggle.addEventListener('click', () => { setPlayback(state.tour ? 'idle' : 'tour'); canvas.focus(); });
scaleSelect.addEventListener('change', () => canvas.focus());

function relevantKey(event) {
  const key = event.key.toLowerCase();
  return keyDirections[key] || numberDirections[key] || key === 'r' || key === 'q';
}
window.addEventListener('keydown', (event) => {
  if (!relevantKey(event)) return;
  if (document.activeElement === canvas || canvas.contains(document.activeElement)) event.preventDefault();
  const key = event.key.toLowerCase();
  if (numberDirections[key]) setDirection(numberDirections[key]);
  else if (key === 'r' && !event.repeat) runToggle.click();
  else if (key === 'q' && !event.repeat) setCharacter(state.character === 'artillery' ? 'storm' : 'artillery');
  else held.add(key);
});
window.addEventListener('keyup', (event) => held.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => held.clear());
canvas.addEventListener('pointerdown', () => canvas.focus());

function keyboardInput() {
  let x = 0; let y = 0;
  for (const key of held) {
    const direction = keyDirections[key];
    if (!direction) continue;
    const vector = directionVectors[direction]; x += vector[0]; y += vector[1];
  }
  if (!x && !y) return [0, 0];
  const length = Math.hypot(x, y); return [x / length, y / length];
}
function directionFromVector(x, y) { return Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'west' : 'east') : (y < 0 ? 'north' : 'south'); }
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const displayWidth = canvas.clientWidth;
  const displayHeight = displayWidth * 9 / 16;
  const targetWidth = Math.round(displayWidth * dpr);
  const targetHeight = Math.round(displayHeight * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) { canvas.width = targetWidth; canvas.height = targetHeight; }
  context.setTransform(targetWidth / 960, 0, 0, targetHeight / 540, 0, 0);
}

setCharacter('artillery');
loadRoosterParts().then((images) => {
  status.textContent = 'Bereit · Figur wählen, Testfläche anklicken und mit WASD oder Pfeiltasten bewegen.';
  canvas.focus();
  let previous = performance.now();
  const render = (now) => {
    resize();
    const delta = Math.min(50, now - previous); previous = now; state.time += delta;
    let [inputX, inputY] = keyboardInput();
    const keyboardMoving = Boolean(inputX || inputY);
    if (keyboardMoving) {
      if (state.runInPlace || state.tour) setPlayback('idle');
      setDirection(directionFromVector(inputX, inputY));
    } else if (state.tour) {
      const tourDirections = ['south', 'west', 'north', 'east'];
      setDirection(tourDirections[Math.floor(state.time / 2200) % 4]);
    }
    const targetMovement = Number(keyboardMoving || state.runInPlace || state.tour);
    state.movement += (targetMovement - state.movement) * (1 - Math.exp(-delta / 65));
    const config = activeCharacter();
    if (targetMovement) state.phase = (state.phase + delta / config.period) % 1;
    const scale = effectiveScale();
    if (keyboardMoving) {
      const speed = state.character === 'storm' ? 0.23 : 0.17;
      state.x += inputX * delta * speed; state.y += inputY * delta * speed;
      const margin = 42 + scale * 80;
      state.x = Math.max(margin, Math.min(960 - margin, state.x));
      state.y = Math.max(margin, Math.min(540 - margin, state.y));
    }
    const pose = config.sample({ direction: state.direction, phase: state.phase, movement: state.movement, timeMs: state.time });
    context.save(); context.setTransform(canvas.width / 960, 0, 0, canvas.height / 540, 0, 0);
    context.fillStyle = '#000'; context.fillRect(0, 0, 960, 540);
    const glow = context.createRadialGradient(state.x, state.y + 70 * scale, 0, state.x, state.y + 70 * scale, 150 * scale);
    glow.addColorStop(0, `${config.accent}12`); glow.addColorStop(1, `${config.accent}00`);
    context.fillStyle = glow; context.fillRect(0, 0, 960, 540);
    context.translate(state.x - 128 * scale, state.y - 128 * scale); context.scale(scale, scale);
    config.draw(context, images[state.character], pose); context.restore();
    const mode = targetMovement || state.movement > 0.2 ? 'LAUFEN' : 'IDLE';
    modeLabel.textContent = `${directionNames[state.direction]} · ${mode}`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}).catch((error) => { status.textContent = `Vorschau konnte nicht geladen werden: ${error.message}`; });
