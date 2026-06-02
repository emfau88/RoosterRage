import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import './styles.css';

const config = {
  type: Phaser.CANVAS,
  parent: 'game-root',
  backgroundColor: '#172226',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
