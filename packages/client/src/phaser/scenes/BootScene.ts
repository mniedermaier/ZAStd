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

  /** 256x256 white center → dark edges for MULTIPLY screen-edge darkening */
  private generateVignetteRadial() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;

    // White base (MULTIPLY with white = no effect)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Radial gradient: transparent center → semi-transparent black at edges
    const gradient = ctx.createRadialGradient(cx, cy, maxR * 0.6, cx, cy, maxR);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.textures.addCanvas('vignette_radial', canvas);
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
