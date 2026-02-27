import Phaser from 'phaser';
import { ObjectPool } from './ObjectPool';

let textPool: ObjectPool<Phaser.GameObjects.Text> | null = null;
let poolScene: Phaser.Scene | null = null;

export function initDamageNumberPool(scene: Phaser.Scene): void {
  poolScene = scene;
  textPool = new ObjectPool<Phaser.GameObjects.Text>(
    () => {
      const t = scene.add.text(0, 0, '', {
        fontSize: '11px',
        color: '#ff4466',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
        resolution: 3,
      });
      t.setDepth(10);
      t.setOrigin(0.5, 1);
      return t;
    },
    (t) => {
      t.setAlpha(1);
      t.setScale(1);
    },
    40,
  );
}

export function destroyDamageNumberPool(): void {
  if (textPool) {
    textPool.destroy();
    textPool = null;
  }
  poolScene = null;
}

interface DamageNumberOptions {
  damageType?: 'physical' | 'magic';
  isExecute?: boolean;
}

let damageNumberCounter = 0;

export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  color = '#ff4466',
  options?: DamageNumberOptions,
  quality: 'low' | 'med' | 'high' = 'high',
): void {
  // Quality gate: on low, only show every 4th or executes
  if (quality === 'low' && damageNumberCounter % 4 !== 0 && !options?.isExecute) {
    damageNumberCounter++;
    return;
  }
  damageNumberCounter++;

  // Determine color based on damage type
  let finalColor = color;
  if (options?.isExecute) {
    finalColor = '#ff4466';
  } else if (options?.damageType === 'physical') {
    finalColor = '#ffaa88';
  } else if (options?.damageType === 'magic') {
    finalColor = '#cc88ff';
  }

  // Scale font size based on damage
  const baseFontSize = Math.min(16, 10 + Math.floor(damage / 50));
  const fontSize = options?.isExecute ? baseFontSize + 4 : baseFontSize;
  const label = options?.isExecute ? `EXEC -${damage}` : `-${damage}`;

  if (textPool && poolScene) {
    const text = textPool.acquire();
    text.setText(label);
    text.setStyle({ fontSize: `${fontSize}px`, color: finalColor, fontFamily: 'monospace', stroke: '#000000', strokeThickness: 2 });
    text.setPosition(x, y);
    text.setAlpha(1);

    scene.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => textPool?.release(text),
    });
  } else {
    // Fallback: create/destroy (before pool is initialized)
    const text = scene.add.text(x, y, label, {
      fontSize: `${fontSize}px`,
      color: finalColor,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 3,
    });
    text.setDepth(10);
    text.setOrigin(0.5, 1);

    scene.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}

export function showGoldGain(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
): void {
  if (textPool && poolScene) {
    const text = textPool.acquire();
    text.setText(`+${amount}g`);
    text.setStyle({ fontSize: '10px', color: '#ffdd44', fontFamily: 'monospace', stroke: '#000000', strokeThickness: 2 });
    text.setPosition(x, y);
    text.setAlpha(1);

    scene.tweens.add({
      targets: text,
      y: y - 16,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => textPool?.release(text),
    });
  } else {
    const text = scene.add.text(x, y, `+${amount}g`, {
      fontSize: '10px',
      color: '#ffdd44',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 3,
    });
    text.setDepth(10);
    text.setOrigin(0.5, 1);

    scene.tweens.add({
      targets: text,
      y: y - 16,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
