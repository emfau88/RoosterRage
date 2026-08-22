import Phaser from 'phaser';

const LIGHTNING_VISUALS = {
  1: {
    life: 145,
    outerWidth: 4,
    coreWidth: 1.35,
    outerColor: 0x80e8ff,
    coreColor: 0xf2ffff,
    jitter: 10,
    steps: 4,
    forkLength: 0,
    impactScale: 0.34
  },
  2: {
    life: 165,
    outerWidth: 5,
    coreWidth: 1.7,
    outerColor: 0x63dcff,
    coreColor: 0xf5ffff,
    jitter: 13,
    steps: 5,
    forkLength: 12,
    impactScale: 0.4
  },
  3: {
    life: 190,
    outerWidth: 6.2,
    coreWidth: 2.15,
    outerColor: 0x54cfff,
    coreColor: 0xffffff,
    jitter: 16,
    steps: 6,
    forkLength: 18,
    impactScale: 0.47
  },
  4: {
    life: 220,
    outerWidth: 7.4,
    coreWidth: 2.65,
    outerColor: 0x77ddff,
    coreColor: 0xffffff,
    jitter: 19,
    steps: 7,
    forkLength: 24,
    impactScale: 0.55
  },
  EVO: {
    life: 245,
    outerWidth: 9,
    coreWidth: 3.2,
    outerColor: 0xcaa8ff,
    coreColor: 0xfff3d0,
    jitter: 22,
    steps: 8,
    forkLength: 30,
    impactScale: 0.62
  }
};

export function getLightningVisual(rank, evolved = false) {
  return LIGHTNING_VISUALS[evolved ? 'EVO' : Math.max(1, Math.min(4, rank))];
}

export class LightningBolt {
  constructor(scene, targets, rank, synergyActive = false, evolved = false) {
    this.scene = scene;
    this.rank = rank;
    this.synergyActive = synergyActive;
    this.evolved = evolved;
    this.visualRank = evolved ? 'EVO' : rank;
    this.visual = getLightningVisual(rank, evolved);
    this.age = 0;
    this.life = this.visual.life;
    this.active = true;
    this.segments = [];
    this.decorations = [];
    this.mainSegmentCount = 0;
    this.branchSegmentCount = 0;

    const points = [
      { x: scene.player.sprite.x, y: scene.player.sprite.y - 18 },
      ...targets.map((enemy) => ({ x: enemy.sprite.x, y: enemy.sprite.y }))
    ];

    for (let index = 0; index < points.length - 1; index += 1) {
      this.createSegment(points[index], points[index + 1]);
      this.mainSegmentCount += 1;
    }
    if (!evolved && rank >= 3 && points.length >= 4) {
      this.createSegment(points[1], points[points.length - 1], { branch: true });
      this.branchSegmentCount += 1;
    }
    if (!evolved && rank >= 4) {
      scene.playFx('fx-lightning-impact', points[0].x, points[0].y + 8, {
        scale: 0.3,
        alpha: 0.72,
        depth: 10
      });
      this.createOriginCrown(points[0]);
    }

    targets.forEach((enemy, index) => {
      const falloff = Math.max(0.55, 1 - index * 0.18);
      const synergyMultiplier = synergyActive ? 1.2 : 1;
      const evolutionMultiplier = evolved ? 1.3 : 1;
      scene.damageEnemy(
        enemy,
        Math.round((24 + rank * 10) * falloff * synergyMultiplier * evolutionMultiplier),
        enemy.sprite.x,
        enemy.sprite.y,
        { source: evolved ? 'evo-thunder-roost' : 'lightning-comb' }
      );
    });
  }

  createSegment(from, to, { branch = false } = {}) {
    const points = [{ x: from.x, y: from.y }];
    const steps = this.visual.steps;
    const jitter = branch ? this.visual.jitter * 0.72 : this.visual.jitter;
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      points.push({
        x: Phaser.Math.Linear(from.x, to.x, t)
          + this.scene.rng.int(-jitter, jitter, 'fx-lightning'),
        y: Phaser.Math.Linear(from.y, to.y, t)
          + this.scene.rng.int(-jitter, jitter, 'fx-lightning')
      });
    }
    points.push({ x: to.x, y: to.y });

    const outer = this.scene.add.graphics().setDepth(branch ? 10 : 11)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.scene.add.graphics().setDepth(branch ? 11 : 12)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.drawPolyline(
      outer,
      points,
      branch ? this.visual.outerWidth * 0.58 : this.visual.outerWidth,
      this.visual.outerColor,
      branch ? 0.5 : 0.74
    );
    this.drawPolyline(
      core,
      points,
      branch ? this.visual.coreWidth * 0.62 : this.visual.coreWidth,
      this.visual.coreColor,
      branch ? 0.72 : 1
    );
    if (!branch && this.visual.forkLength > 0) {
      this.drawFork(outer, core, points[Math.floor(points.length * 0.55)], from, to);
    }
    this.segments.push({
      outer,
      core,
      phase: this.segments.length * 1.37 + (branch ? 0.8 : 0),
      branch
    });
  }

  drawPolyline(graphics, points, width, color, alpha) {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
  }

  drawFork(outer, core, origin, from, to) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
      + (this.segments.length % 2 === 0 ? -0.72 : 0.72);
    const end = {
      x: origin.x + Math.cos(angle) * this.visual.forkLength,
      y: origin.y + Math.sin(angle) * this.visual.forkLength
    };
    outer.lineStyle(this.visual.outerWidth * 0.42, this.visual.outerColor, 0.42);
    outer.lineBetween(origin.x, origin.y, end.x, end.y);
    core.lineStyle(this.visual.coreWidth * 0.46, this.visual.coreColor, 0.76);
    core.lineBetween(origin.x, origin.y, end.x, end.y);
    this.branchSegmentCount += 1;
  }

  createOriginCrown(origin) {
    const crown = this.scene.add.graphics({ x: origin.x, y: origin.y })
      .setDepth(12)
      .setBlendMode(Phaser.BlendModes.ADD);
    crown.lineStyle(2.2, 0xf4ffff, 0.88);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + 0.18;
      crown.lineBetween(
        Math.cos(angle) * 13,
        Math.sin(angle) * 13,
        Math.cos(angle) * 28,
        Math.sin(angle) * 28
      );
    }
    this.decorations.push(crown);
  }

  update(delta) {
    if (!this.active) return;
    this.age += delta;
    const progress = Phaser.Math.Clamp(this.age / this.life, 0, 1);
    const envelope = progress < 0.56
      ? 1
      : Phaser.Math.Clamp(1 - (progress - 0.56) / 0.44, 0, 1);
    this.segments.forEach((segment) => {
      const fluidPulse = 0.84
        + Math.sin(this.age * 0.075 + segment.phase) * 0.11
        + Math.sin(this.age * 0.031 + segment.phase * 1.7) * 0.05;
      segment.outer.setAlpha(envelope * fluidPulse * (segment.branch ? 0.72 : 1));
      segment.core.setAlpha(envelope * (0.88 + (1 - fluidPulse) * 0.42));
    });
    this.decorations.forEach((decoration, index) => {
      const pulse = 0.8 + Math.sin(this.age * 0.055 + index) * 0.2;
      decoration.setAlpha(envelope * pulse);
      decoration.setScale(1 + progress * 0.18);
    });
    if (this.age >= this.life) this.destroy();
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.segments.forEach(({ outer, core }) => {
      outer.destroy();
      core.destroy();
    });
    this.decorations.forEach((decoration) => decoration.destroy());
  }
}
