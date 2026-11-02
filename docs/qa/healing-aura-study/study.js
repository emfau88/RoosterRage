// Isolated art study. No production module imports or activates this proposal.
import Phaser from 'phaser';
import { EnemyAuraVisual } from '../../../src/systems/EnemyAuraVisual.js';
import { ENEMY_AURA_ASSETS } from '../../../src/systems/assets/EnemyAuraAssets.js';
import groundUrl from '../../../src/assets/map/arena-ground-farm.webp';
import supportUrl from '../../../src/assets/enemies/animations/enemy-support-run.webp';

const TAU = Math.PI * 2;
const ease = x => { x = Phaser.Math.Clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const fract = x => x - Math.floor(x);
const controls = { manualTime: null, elapsed: 0, paused: false };
const phaseLabel = document.getElementById('phase');

// A tapered ribbon is redrawn from its own life phase; no closed ring texture.
function ribbon(graphics, points, width, color, alpha) {
  if (points.length < 3 || alpha < .001) return;
  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], previous = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - previous.x, dy = next.y - previous.y, distance = Math.hypot(dx, dy) || 1;
    const taper = Math.pow(Math.sin(i / (points.length - 1) * Math.PI), .85);
    const half = width * taper * .5;
    left.push({ x: p.x - dy / distance * half, y: p.y + dx / distance * half });
    right.push({ x: p.x + dy / distance * half, y: p.y - dx / distance * half });
  }
  graphics.fillStyle(color, alpha).fillPoints([...left, ...right.reverse()], true);
}

class HealingAuraStudy {
  constructor(scene) {
    this.scene = scene;
    this.ground = scene.add.image(0, 0, 'study-ground-light').setDepth(2.5).setAlpha(.38);
    this.rear = scene.add.graphics().setDepth(3.5);
    this.front = scene.add.graphics().setDepth(4.5);
    this.motes = Array.from({ length: 13 }, () => scene.add.image(0, 0, 'study-mote').setBlendMode(Phaser.BlendModes.ADD));
    this.halo = scene.add.image(0, 0, 'study-soft-light').setDepth(3.4).setBlendMode(Phaser.BlendModes.ADD);
  }

  draw(milliseconds, x, y) {
    const t = milliseconds / 1000, breath = .5 + .5 * Math.sin(t * TAU / 4);
    this.ground.setPosition(x, y).setDisplaySize(212 + breath * 8, 74 + breath * 3).setAlpha(.32 + breath * .07);
    this.halo.setPosition(x, y - 17).setDisplaySize(106, 110).setAlpha(.09 + .035 * breath);
    this.rear.clear(); this.front.clear();

    // Six independently born strands: tapered ends, slow curl, upward drift.
    for (let i = 0; i < 6; i++) {
      const life = fract(t / 2 + i / 6);
      const envelope = ease(life / .16) * (1 - ease((life - .68) / .32));
      const angle = i / 6 * TAU + t * TAU / 8;
      const rx = 66 + 9 * Math.sin(i * 2.7), ry = 22;
      const baseX = Math.cos(angle) * rx, baseY = Math.sin(angle) * ry;
      const end = ease(Math.min(1, life / .88));
      const begin = Math.max(0, end - .6);
      const points = [];
      for (let step = 0; step <= 24; step++) {
        const u = begin + (end - begin) * step / 24;
        points.push({
          x: x + baseX * (1 - .28 * u) + Math.sin(u * Math.PI * 1.7 + angle) * 15 * Math.sin(u * Math.PI),
          y: y + baseY - u * (48 + 10 * Math.sin(i * 2.2)) - Math.sin(u * Math.PI) * 6
        });
      }
      const g = baseY < 1 ? this.rear : this.front;
      ribbon(g, points, 18, 0x4cce76, .035 * envelope);
      ribbon(g, points, 10, 0x65df8a, .09 * envelope);
      ribbon(g, points, 5.2, 0x8bea9b, .38 * envelope);
      ribbon(g, points, 1.1, 0xe6ffd2, .62 * envelope);
    }

    // Very short ground arcs dissolve independently, never forming a border.
    for (let i = 0; i < 3; i++) {
      const life = fract(t / 4 + i / 3);
      const a = i * TAU / 3 - t * TAU / 8;
      const envelope = Math.pow(Math.sin(life * Math.PI), 2);
      const points = [];
      for (let j = 0; j <= 18; j++) {
        const angle = a + j / 18 * .5;
        points.push({x: x + Math.cos(angle) * (75 + life * 9), y: y + Math.sin(angle) * (25 + life * 3)});
      }
      ribbon(this.rear, points, 7, 0x67d777, .035 * envelope);
      ribbon(this.rear, points, 1.5, 0xc2f3a1, .24 * envelope);
    }

    this.motes.forEach((particle, i) => {
      const life = fract(t / (i < 9 ? 2 : 4) + i * .61803398875);
      const angle = i * 2.399963 + t * TAU / 8;
      const radius = i < 9 ? 46 + (i % 4) * 10 : 24;
      const baseY = Math.sin(angle) * radius * .34;
      const visible = Math.sin(life * Math.PI) ** 1.7;
      particle.setPosition(x + Math.cos(angle) * radius + Math.sin(life * TAU + i) * 5,
        y + baseY - life * (40 + (i % 3) * 13));
      particle.setDepth(baseY < 0 ? 3.6 : 4.6).setAlpha(visible * (i < 9 ? .68 : .38));
      particle.setScale((i < 9 ? .24 : .35) * (.75 + visible * .25));
    });
  }
}

class StudyScene extends Phaser.Scene {
  preload() {
    this.load.image('ground', groundUrl);
    this.load.spritesheet('support', supportUrl, { frameWidth: 256, frameHeight: 256 });
    this.load.image('enemy-aura-regen-green', ENEMY_AURA_ASSETS['regen-green']);
  }

  create() {
    for (const x of [0, 560]) {
      this.add.tileSprite(x, 0, 560, 382, 'ground').setOrigin(0).setTint(0xfffbf0).setTilePosition(65, 130);
    }
    this.makeLightTexture('study-ground-light', 256, [
      [0, 'rgba(121,226,129,.55)'], [.24, 'rgba(90,205,105,.25)'], [.62, 'rgba(64,167,79,.075)'], [1, 'rgba(64,167,79,0)']
    ]);
    this.makeLightTexture('study-soft-light', 128, [[0,'rgba(163,246,154,.5)'], [.42,'rgba(108,231,136,.12)'], [1,'rgba(108,231,136,0)']]);
    this.makeLightTexture('study-mote', 32, [[0,'rgba(255,255,227,1)'], [.11,'rgba(232,255,193,1)'], [.25,'rgba(176,245,147,.55)'], [.55,'rgba(109,223,129,.12)'], [1,'rgba(109,223,129,0)']]);
    this.subjects = [280, 840].map(x => {
      const sprite = this.add.sprite(x, 201, 'support', 0).setScale(.28).setDepth(4);
      return { sprite, activationId: 1 };
    });
    this.oldAura = new EnemyAuraVisual(this, 280, 221.0704, 'regen-green', 185, { follow: this.subjects[0] });
    this.oldAura.startedAt = 0;
    this.proposal = new HealingAuraStudy(this);
    window.auraStudy = {
      ready: true,
      setTime: ms => { controls.manualTime = ms; this.drawFrame(ms); },
      resume: () => { controls.manualTime = null; },
      describe: () => ({
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS',
        originalClass: 'src/systems/EnemyAuraVisual.js',
        originalRadius: this.oldAura.radius,
        originalScale: this.oldAura.scaleX,
        subjectScale: this.subjects.map(s => s.sprite.scaleX),
        subjectFrame: this.subjects.map(s => s.sprite.frame.name),
        subjectCount: this.subjects.length,
        originalGroundPosition: {x:this.oldAura.x,y:this.oldAura.y},
        proposedDecorativeWidth: 220,
        gameplayModified: false,
        effect: 'Procedural tapered ribbons and motes; no generated ring bitmap',
        cycleMs: 8000
      })
    };
    this.drawFrame(0);
  }

  makeLightTexture(key, size, stops) {
    const texture = this.textures.createCanvas(key, size, size), ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    for (const [position, color] of stops) gradient.addColorStop(position,color);
    ctx.fillStyle = gradient; ctx.fillRect(0,0,size,size); texture.refresh();
  }

  drawFrame(milliseconds) {
    const ms = ((milliseconds % 8000) + 8000) % 8000, t = ms / 1000;
    this.time.now = ms;
    const moving = t >= 4, movePhase = (t - 4) * TAU / 4;
    const dx = moving ? Math.sin(movePhase) ** 3 * 36 : 0;
    const dy = moving ? (1 - Math.cos(movePhase * 2)) * 2 : 0;
    const frame = moving ? Math.floor((t - 4) * 8) % 4 + (Math.cos(movePhase) > 0 ? 4 : 0) : 0;
    this.subjects.forEach((subject, i) => {
      subject.sprite.setPosition(280 + i * 560 + dx, 201 + dy).setFrame(frame);
    });
    this.oldAura.updateVisual();
    const sprite = this.subjects[1].sprite;
    this.proposal.draw(ms, sprite.x, sprite.y + sprite.displayHeight * .28);
    phaseLabel.textContent = moving ? 'In Bewegung' : 'Im Stand';
  }

  update(_time, delta) {
    if (!this.oldAura) return;
    if (!controls.paused) controls.elapsed += delta;
    this.drawFrame(controls.manualTime ?? controls.elapsed);
  }
}

const query = new URLSearchParams(location.search);
if (query.has('capture')) document.body.classList.add('capture');
new Phaser.Game({ type: query.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.WEBGL,
  parent: 'stage', width:1120,height:382,backgroundColor:'#b59a62',
  render:{antialias:true,pixelArt:false,roundPixels:false}, scene:StudyScene, banner:false, audio:{noAudio:true} });
document.getElementById('pause').addEventListener('click', event => {
  controls.paused = !controls.paused;
  event.currentTarget.textContent = controls.paused ? 'Abspielen' : 'Pause';
});
