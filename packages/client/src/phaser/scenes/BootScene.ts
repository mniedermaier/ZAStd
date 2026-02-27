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
    const ct = this.textures.createCanvas('vignette_radial', size, size)!;
    const ctx = ct.context;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;

    // Per-pixel: white at center (no MULTIPLY effect), dark at edges
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxR;
        let brightness: number;
        if (dist <= 0.6) {
          brightness = 255; // white = no darkening
        } else if (dist >= 1.0) {
          brightness = 51; // darkest edge
        } else {
          const t = (dist - 0.6) / 0.4;
          brightness = Math.round(255 - t * 204);
        }
        const idx = (y * size + x) * 4;
        data[idx] = brightness;
        data[idx + 1] = brightness;
        data[idx + 2] = brightness;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    ct.refresh();
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
