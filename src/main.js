import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import {
  createDisplayMetrics,
  installDisplayResolution
} from './systems/DisplayResolutionSystem.js';
import './styles.css';

const displayMetrics = createDisplayMetrics();

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#172226',
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
    powerPreference: 'high-performance'
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: displayMetrics.renderWidth,
    height: displayMetrics.renderHeight,
    zoom: 1 / displayMetrics.renderScale
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  callbacks: {
    preBoot: (game) => installDisplayResolution(game, displayMetrics)
  },
  scene: [GameScene]
};

new Phaser.Game(config);
