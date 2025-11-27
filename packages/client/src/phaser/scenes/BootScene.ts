import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No external assets - all rendered procedurally
  }

  create() {
    this.scene.start('GameScene');
  }
}
