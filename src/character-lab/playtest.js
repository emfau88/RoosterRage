import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { AceSouthRig } from './AceSouthRig.js';
import { IMAGE_URLS, PART_URLS } from './assets.js';

export function createPlaytest() {
  const host = document.getElementById('playfield');
  const status = document.getElementById('play-status');
  class AcePlaytest extends Phaser.Scene {
    preload() {
      for (const [key, url] of Object.entries(PART_URLS)) this.load.image(`ace-part-${key}`, url);
      this.load.spritesheet('rooster-ace-walk', IMAGE_URLS.legacy, { frameWidth: 256, frameHeight: 256 });
      this.load.image('lab-ground', IMAGE_URLS.ground);
      this.load.image('lab-egg', IMAGE_URLS.egg);
      this.load.on('loaderror', (file) => { status.textContent = `Grafik konnte nicht geladen werden: ${file.key}`; });
    }
    create() {
      this.add.tileSprite(480, 170, 960, 340, 'lab-ground').setTileScale(0.7).setAlpha(0.75);
      for (const [direction, start] of [['south', 0], ['west', 4], ['east', 4], ['north', 12]]) {
        this.anims.create({ key: `rooster-ace-walk-${direction}`, frames: this.anims.generateFrameNumbers('rooster-ace-walk', { start, end: start + 3 }), frameRate: 10, repeat: -1 });
      }
      this.effects = { enabled: () => false };
      this.player = new Player(this, 480, 155);
      this.player.sprite.setVisible(false);
      this.rig = new AceSouthRig(this);
      this.physics.world.setBounds(25, 40, 910, 245);
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,H');
      this.input.keyboard.disableGlobalCapture();
      this.autoFire = false;
      this.lastShot = -Infinity;
      this.shots = 0;
      this.projectiles = [];
      this.touchTarget = null;
      this.input.on('pointerdown', (pointer) => { host.focus(); this.touchTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY); });
      this.add.rectangle(480, 310, 900, 2, 0xddc176, 0.35);
      this.target = this.add.circle(480, 309, 13, 0xb89442, 0.5).setStrokeStyle(2, 0xffe3a0, 0.8);
      this.add.text(20, 16, 'ACE / SÜD · PHYSIK UND BEWEGUNG BLEIBEN UNABHÄNGIG', { fontFamily: 'Arial', fontSize: '11px', color: '#fff0c0' });
      this.api = { shoot: () => this.shoot(), hurt: () => this.hurt(), reset: () => this.resetPlayer(), toggleFire: () => (this.autoFire = !this.autoFire) };
      host.dispatchEvent(new CustomEvent('lab-ready', { detail: this.api }));
      host.addEventListener('keydown', this.preventScroll = (event) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      });
      this.events.once('shutdown', () => {
        host.removeEventListener('keydown', this.preventScroll);
        this.rig.destroy(); this.player.destroy();
      });
    }
    shoot() {
      const now = this.time.now;
      if (now - this.lastShot < 100) return;
      this.lastShot = now;
      this.shots += 1;
      this.rig.shoot(now);
      this.target.x = this.player.sprite.x + 17;
      const egg = this.physics.add.image(this.player.sprite.x + 17, this.player.sprite.y + 10, 'lab-egg').setDisplaySize(10, 13).setDepth(7);
      egg.setVelocity(0, 420);
      this.projectiles.push(egg);
    }
    hurt() {
      if (this.player.damage(7, this.time.now)) this.rig.hurt(this.time.now);
    }
    resetPlayer() {
      this.player.sprite.setPosition(480, 155).setVelocity(0, 0);
      this.player.hp = this.player.maxHp;
      this.touchTarget = null;
      this.player.invulnerableUntil = 0;
    }
    update(time, delta) {
      if (!this.player) return;
      const focused = document.activeElement === host || host.contains(document.activeElement);
      const keys = this.keys;
      const input = new Phaser.Math.Vector2();
      if (focused) {
        input.set(Number(keys.D.isDown || keys.RIGHT.isDown) - Number(keys.A.isDown || keys.LEFT.isDown),
          Number(keys.S.isDown || keys.DOWN.isDown) - Number(keys.W.isDown || keys.UP.isDown));
        if (input.lengthSq()) this.touchTarget = null;
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) this.shoot();
        if (Phaser.Input.Keyboard.JustDown(keys.H)) this.hurt();
      }
      if (this.touchTarget) {
        input.set(this.touchTarget.x - this.player.sprite.x, this.touchTarget.y - this.player.sprite.y);
        if (input.length() < 5) { input.set(0, 0); this.touchTarget = null; } else input.normalize();
      }
      this.player.update(input);
      if (this.autoFire && time - this.lastShot >= 800) this.shoot();
      this.rig.update(this.player, time, Math.min(delta, 50));
      this.projectiles = this.projectiles.filter((egg) => {
        if (egg.y > 310) { egg.destroy(); return false; }
        return true;
      });
      if (!this.lastStatusAt || time - this.lastStatusAt > 120) {
        this.lastStatusAt = time;
        status.textContent = `HP ${this.player.hp}/100 · ${this.shots} Schüsse · Tempo ${Math.round(this.player.sprite.body.velocity.length())} · ${this.autoFire ? 'Dauerfeuer aktiv' : 'Manuelles Feuer'} · Blick: Süd`;
      }
    }
  }
  return new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 960, height: 340, backgroundColor: '#303820',
    render: { antialias: true, roundPixels: false }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }, scene: [AcePlaytest] });
}
