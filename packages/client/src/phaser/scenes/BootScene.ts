import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No external assets - all rendered procedurally
  }

  create() {
    // Generate reusable textures for bloom/particle/atmosphere effects
    this.generateGlowSoft();
    this.generateParticleDot();
    this.generateVignetteRadial();
    this.generateNebulaBlob();

    this.scene.start('GameScene');
  }

  /** 64x64 soft white circle for bloom glow behind towers/projectiles/bosses */
  private generateGlowSoft() {
    const size = 64;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;
    const steps = 16;
    for (let i = steps; i >= 1; i--) {
      const r = (i / steps) * maxR;
      const alpha = (1 - i / steps) * 0.5;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(cx, cy, r);
    }
    g.generateTexture('glow_soft', size, size);
    g.destroy();
  }

  /** 8x8 small soft dot for particle emitter texture */
  private generateParticleDot() {
    const size = 8;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx, cy, 3);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(cx, cy, 4);
    g.generateTexture('particle_dot', size, size);
    g.destroy();
  }

  /** 256x256 transparent center → opaque black edges for screen-edge darkening */
  private generateVignetteRadial() {
    const size = 256;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;
    const steps = 32;
    // Draw from outside in: outer rings are more opaque black
    for (let i = steps; i >= 1; i--) {
      const r = (i / steps) * maxR;
      const t = i / steps; // 0 at center, 1 at edge
      // Only darken outer 40%
      const alpha = t > 0.6 ? ((t - 0.6) / 0.4) * 0.8 : 0;
      g.fillStyle(0x000000, alpha);
      g.fillCircle(cx, cy, r);
    }
    g.generateTexture('vignette_radial', size, size);
    g.destroy();
  }

  /** 128x128 large soft white circle for background atmosphere */
  private generateNebulaBlob() {
    const size = 128;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;
    const steps = 20;
    for (let i = steps; i >= 1; i--) {
      const r = (i / steps) * maxR;
      const alpha = (1 - i / steps) * 0.3;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(cx, cy, r);
    }
    g.generateTexture('nebula_blob', size, size);
    g.destroy();
  }
}
