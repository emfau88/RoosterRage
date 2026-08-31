import './styles.css';
import { loadLabImages } from './assets.js';
import { ACE_WALK_PERIOD_MS, drawAceSouth, sampleAceSouthPose } from './aceSouthPose.js';
import { createPlaytest } from './playtest.js';

const el = (id) => document.getElementById(id);
const state = { time: 0, phase: 0, moving: true, paused: false, speed: 1, background: 'yard', guides: false, shotAt: -Infinity, hurtAt: -Infinity };
let playtestApi;
el('playfield').addEventListener('lab-ready', (event) => { playtestApi = event.detail; });

function motion(moving) {
  state.moving = moving;
  el('walk').setAttribute('aria-pressed', String(moving));
  el('idle').setAttribute('aria-pressed', String(!moving));
}
el('walk').onclick = () => motion(true);
el('idle').onclick = () => motion(false);
el('shot').onclick = () => { state.shotAt = state.time; playtestApi?.shoot(); };
el('hurt').onclick = () => { state.hurtAt = state.time; playtestApi?.hurt(); };
function pause(value) { state.paused = value; el('pause').textContent = value ? 'Abspielen' : 'Pause'; }
el('pause').onclick = () => pause(!state.paused);
el('step').onclick = () => { pause(true); state.phase = (Math.round(state.phase * 24) + 1) % 24 / 24; state.time += ACE_WALK_PERIOD_MS / 24; };
el('phase').oninput = (event) => { pause(true); state.phase = Number(event.target.value) / 24; state.time = state.phase * ACE_WALK_PERIOD_MS; state.shotAt = state.hurtAt = -Infinity; };
el('speed').onchange = (event) => { state.speed = Number(event.target.value); };
el('background').onchange = (event) => { state.background = event.target.value; };
el('guides').onchange = (event) => { state.guides = event.target.checked; };
el('reset-player').onclick = () => playtestApi?.reset();
el('auto-fire').onclick = () => {
  const enabled = playtestApi?.toggleFire() ?? false;
  el('auto-fire').setAttribute('aria-pressed', String(enabled));
};

function paintBackground(ctx, width, height, images) {
  ctx.fillStyle = state.background === 'light' ? '#f2f0e4' : '#202b28';
  ctx.fillRect(0, 0, width, height);
  if (state.background === 'yard') {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(images.ground, 0, 0, images.ground.width, images.ground.height, 0, 0, width, height);
    ctx.restore();
  }
}

function paint(canvas, variant, images, pose, small) {
  const ctx = canvas.getContext('2d');
  const width = small ? 96 : 320;
  const height = small ? 84 : 284;
  const resolution = Math.max(1, (window.devicePixelRatio || 1) * canvas.clientWidth / width);
  const renderWidth = Math.round(width * resolution);
  const renderHeight = Math.round(height * resolution);
  if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
    canvas.width = renderWidth; canvas.height = renderHeight;
  }
  ctx.setTransform(renderWidth / width, 0, 0, renderHeight / height, 0, 0);
  paintBackground(ctx, width, height, images);
  ctx.save();
  const scale = small ? 0.25 : 1;
  ctx.translate((width - 256 * scale) / 2, small ? 6 : 5);
  ctx.scale(scale, scale);
  if (variant === 'rig') drawAceSouth(ctx, images, pose);
  else {
    const frameCount = variant === 'legacy' ? 4 : 8;
    const frame = state.moving ? (state.paused ? Math.floor(state.phase * frameCount) : Math.floor(state.time / 100) % frameCount) : 0;
    if (variant === 'legacy' && state.time - state.hurtAt < 420) ctx.globalAlpha = Math.floor((state.time - state.hurtAt) / 70) % 2 ? 1 : 0.45;
    ctx.drawImage(images[variant], (frame % 4) * 256, Math.floor(frame / 4) * 256, 256, 256, 0, 0, 256, 256);
  }
  if (state.guides) {
    ctx.strokeStyle = '#fae6a080'; ctx.lineWidth = small ? 2 : 0.7;
    ctx.beginPath(); ctx.moveTo(0, 238); ctx.lineTo(256, 238); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
    ctx.strokeStyle = '#a5f2ec'; ctx.beginPath(); ctx.arc(128, 144, 58, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

loadLabImages().then((images) => {
  el('load-status').textContent = 'Vergleich bereit · Große Ansicht zum Prüfen, darunter unvergrößerte Spielgröße.';
  let previous = performance.now();
  const render = (now) => {
    const delta = Math.min(50, now - previous); previous = now;
    if (!state.paused) {
      state.time += delta * state.speed;
      if (state.moving) state.phase = (state.phase + delta * state.speed / ACE_WALK_PERIOD_MS) % 1;
    }
    const pose = sampleAceSouthPose({ phase: state.phase, movement: Number(state.moving), timeMs: state.time,
      shotAgeMs: state.time - state.shotAt, hurtAgeMs: state.time - state.hurtAt });
    for (const variant of ['legacy', 'chat', 'rig']) {
      paint(el(variant), variant, images, pose, false);
      paint(el(`${variant}-small`), variant, images, pose, true);
    }
    el('phase').value = String(Math.floor(state.phase * 24));
    el('frame-label').value = `${String(Math.floor(state.phase * 24) + 1).padStart(2, '0')} / 24`;
    el('animation-status').textContent = `${state.moving ? 'Laufen' : 'Idle'}${pose.shot > 0.01 ? ' + Schuss' : ''}${pose.hurt > 0.01 ? ' + Treffer' : ''}${state.paused ? ' · pausiert' : ''}`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
  createPlaytest();
}).catch((error) => { el('load-status').textContent = `Vorschau konnte nicht geladen werden: ${error.message}`; });
