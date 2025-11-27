import Phaser from 'phaser';

export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  damage: number,
  color = '#ff4466',
): void {
  const text = scene.add.text(x, y, `-${damage}`, {
    fontSize: '11px',
    color,
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

export function showGoldGain(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
): void {
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
