import Phaser from 'phaser';

export function showImpact(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
  radius = 6,
): void {
  const circle = scene.add.circle(x, y, radius, color, 0.6);
  circle.setDepth(9);

  scene.tweens.add({
    targets: circle,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 300,
    ease: 'Power2',
    onComplete: () => circle.destroy(),
  });
}

export function showChainLightning(
  scene: Phaser.Scene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const graphics = scene.add.graphics();
  graphics.setDepth(8);
  graphics.lineStyle(2, 0xffee00, 0.8);
  graphics.beginPath();

  // Jagged lightning path
  const segments = 5;
  graphics.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const mx = Phaser.Math.Linear(x1, x2, t) + (Math.random() - 0.5) * 8;
    const my = Phaser.Math.Linear(y1, y2, t) + (Math.random() - 0.5) * 8;
    graphics.lineTo(mx, my);
  }
  graphics.lineTo(x2, y2);
  graphics.strokePath();

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    duration: 200,
    onComplete: () => graphics.destroy(),
  });
}

export function showSpawnPortal(
  scene: Phaser.Scene,
  x: number,
  y: number,
): void {
  // Expanding green ring
  const ring = scene.add.circle(x, y, 2, undefined, 0);
  ring.setStrokeStyle(2, 0x44ff88, 0.7);
  ring.setDepth(9);
  scene.tweens.add({
    targets: ring,
    radius: 18,
    alpha: 0,
    duration: 400,
    ease: 'Power2',
    onUpdate: () => {
      ring.setStrokeStyle(2, 0x44ff88, ring.alpha * 0.7);
    },
    onComplete: () => ring.destroy(),
  });

  // 6 outward particle dots
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dot = scene.add.circle(x, y, 2, 0x44ff88, 0.6);
    dot.setDepth(9);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * 20,
      y: y + Math.sin(angle) * 20,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => dot.destroy(),
    });
  }
}

export function showSplitterSplit(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xdddd44,
): void {
  // Two small circles flying apart from death position
  for (let dir = -1; dir <= 1; dir += 2) {
    const dot = scene.add.circle(x, y, 4, color, 0.8);
    dot.setDepth(9);
    scene.tweens.add({
      targets: dot,
      x: x + dir * 20,
      y: y + (Math.random() - 0.5) * 10,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => dot.destroy(),
    });
  }
}

export function showUpgradeFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
): void {
  // Radial shockwave ring
  const ring = scene.add.circle(x, y, 2, undefined, 0);
  ring.setStrokeStyle(3, color, 0.8);
  ring.setDepth(9);
  scene.tweens.add({
    targets: ring,
    radius: 24,
    alpha: 0,
    duration: 400,
    ease: 'Power2',
    onUpdate: () => {
      ring.setStrokeStyle(3, color, ring.alpha * 0.8);
    },
    onComplete: () => ring.destroy(),
  });

  // White glow
  const glow = scene.add.circle(x, y, 12, 0xffffff, 0.5);
  glow.setDepth(9);
  scene.tweens.add({
    targets: glow,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 350,
    onComplete: () => glow.destroy(),
  });

  // Particle ring (8 dots)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dot = scene.add.circle(x, y, 2, color, 0.7);
    dot.setDepth(9);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * 18,
      y: y + Math.sin(angle) * 18,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => dot.destroy(),
    });
  }
}

// ===== ABILITY VFX =====

export function showMeteorStrike(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  // Outer fire ring expanding
  const ring = scene.add.circle(x, y, 4, undefined, 0);
  ring.setStrokeStyle(3, 0xff4400, 0.9);
  ring.setDepth(10);
  scene.tweens.add({
    targets: ring,
    radius: radius,
    alpha: 0,
    duration: 500,
    ease: 'Power2',
    onUpdate: () => ring.setStrokeStyle(3, 0xff4400, ring.alpha * 0.9),
    onComplete: () => ring.destroy(),
  });

  // Inner flash
  const flash = scene.add.circle(x, y, radius * 0.3, 0xffaa00, 0.8);
  flash.setDepth(10);
  scene.tweens.add({
    targets: flash,
    scaleX: 3,
    scaleY: 3,
    alpha: 0,
    duration: 400,
    onComplete: () => flash.destroy(),
  });

  // Fire particles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dot = scene.add.circle(x, y, 3, 0xff6600, 0.8);
    dot.setDepth(10);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * radius * 0.8,
      y: y + Math.sin(angle) * radius * 0.8,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => dot.destroy(),
    });
  }

  scene.cameras.main.shake(250, 0.006);
}

export function showBlizzardEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  // Frost circle
  const frost = scene.add.circle(x, y, radius, 0x88ddff, 0.15);
  frost.setDepth(10);
  scene.tweens.add({
    targets: frost,
    alpha: 0,
    duration: 2000,
    onComplete: () => frost.destroy(),
  });

  // Ice ring
  const ring = scene.add.circle(x, y, radius, undefined, 0);
  ring.setStrokeStyle(2, 0x88ddff, 0.6);
  ring.setDepth(10);
  scene.tweens.add({
    targets: ring,
    alpha: 0,
    duration: 2000,
    onUpdate: () => ring.setStrokeStyle(2, 0x88ddff, ring.alpha * 0.6),
    onComplete: () => ring.destroy(),
  });

  // Frost particles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const dot = scene.add.circle(
      x + Math.cos(angle) * dist,
      y + Math.sin(angle) * dist,
      2, 0xcceeFF, 0.7,
    );
    dot.setDepth(10);
    scene.tweens.add({
      targets: dot,
      y: dot.y + 15,
      alpha: 0,
      duration: 1500 + Math.random() * 500,
      onComplete: () => dot.destroy(),
    });
  }
}

export function showChainStorm(
  scene: Phaser.Scene,
  targets: Array<{ x: number; y: number }>,
): void {
  // Lightning bolts to random targets
  const cx = scene.cameras.main.worldView.centerX;
  const cy = scene.cameras.main.worldView.y;
  for (const t of targets) {
    showChainLightning(scene, t.x, cy, t.x, t.y);
    showImpact(scene, t.x, t.y, 0xffee00, 8);
  }
  scene.cameras.main.shake(200, 0.005);
}

export function showPlagueCloud(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  // Green cloud circle
  const cloud = scene.add.circle(x, y, radius, 0x88ff00, 0.12);
  cloud.setDepth(10);
  scene.tweens.add({
    targets: cloud,
    alpha: 0,
    duration: 3000,
    onComplete: () => cloud.destroy(),
  });

  // Poison bubbles
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.8;
    const bubble = scene.add.circle(
      x + Math.cos(angle) * dist,
      y + Math.sin(angle) * dist,
      2 + Math.random() * 2, 0xaaff00, 0.5,
    );
    bubble.setDepth(10);
    scene.tweens.add({
      targets: bubble,
      y: bubble.y - 20 - Math.random() * 15,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 1500 + Math.random() * 1000,
      onComplete: () => bubble.destroy(),
    });
  }
}

export function showReapEffect(scene: Phaser.Scene): void {
  // Dark purple pulse from center of screen
  const cam = scene.cameras.main;
  const cx = cam.worldView.centerX;
  const cy = cam.worldView.centerY;
  const pulse = scene.add.circle(cx, cy, 10, 0x8844aa, 0.4);
  pulse.setDepth(10);
  scene.tweens.add({
    targets: pulse,
    scaleX: 30,
    scaleY: 30,
    alpha: 0,
    duration: 600,
    onComplete: () => pulse.destroy(),
  });
  scene.cameras.main.shake(150, 0.004);
}

export function showOvergrowthEffect(scene: Phaser.Scene): void {
  // Green roots spreading from center
  const cam = scene.cameras.main;
  const cx = cam.worldView.centerX;
  const cy = cam.worldView.centerY;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const line = scene.add.graphics();
    line.setDepth(10);
    line.lineStyle(3, 0x44cc44, 0.6);
    line.beginPath();
    line.moveTo(cx, cy);
    line.lineTo(cx + Math.cos(angle) * 200, cy + Math.sin(angle) * 200);
    line.strokePath();
    scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 800,
      onComplete: () => line.destroy(),
    });
  }
  scene.cameras.main.shake(200, 0.005);
}

export function showManaBomb(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  // Bright blue explosion
  const flash = scene.add.circle(x, y, radius * 0.2, 0x4488ff, 0.9);
  flash.setDepth(10);
  scene.tweens.add({
    targets: flash,
    scaleX: 5,
    scaleY: 5,
    alpha: 0,
    duration: 400,
    onComplete: () => flash.destroy(),
  });

  // Arcane ring
  const ring = scene.add.circle(x, y, 4, undefined, 0);
  ring.setStrokeStyle(3, 0x8844ff, 0.8);
  ring.setDepth(10);
  scene.tweens.add({
    targets: ring,
    radius: radius,
    alpha: 0,
    duration: 500,
    onUpdate: () => ring.setStrokeStyle(3, 0x8844ff, ring.alpha * 0.8),
    onComplete: () => ring.destroy(),
  });

  // Arcane particles
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const dot = scene.add.circle(x, y, 2, 0xaa66ff, 0.8);
    dot.setDepth(10);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => dot.destroy(),
    });
  }

  scene.cameras.main.shake(250, 0.006);
}

export function showDivineIntervention(scene: Phaser.Scene): void {
  // Golden halo expanding from center
  const cam = scene.cameras.main;
  const cx = cam.worldView.centerX;
  const cy = cam.worldView.centerY;
  const halo = scene.add.circle(cx, cy, 10, 0xffdd66, 0.3);
  halo.setDepth(10);
  scene.tweens.add({
    targets: halo,
    scaleX: 25,
    scaleY: 25,
    alpha: 0,
    duration: 800,
    onComplete: () => halo.destroy(),
  });

  // Golden sparkles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dot = scene.add.circle(cx, cy, 3, 0xffeeaa, 0.8);
    dot.setDepth(10);
    scene.tweens.add({
      targets: dot,
      x: cx + Math.cos(angle) * 150,
      y: cy + Math.sin(angle) * 150,
      alpha: 0,
      duration: 600,
      onComplete: () => dot.destroy(),
    });
  }
}

export function showDeathBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
  count = 8,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 100 + Math.random() * 50;
    const particle = scene.add.circle(x, y, 3, color, 0.8);
    particle.setDepth(9);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }
}
