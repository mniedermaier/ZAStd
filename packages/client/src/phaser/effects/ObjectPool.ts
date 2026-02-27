import Phaser from 'phaser';

export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private pool: T[] = [];
  private activeItems: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      (obj as any).setVisible(false);
      (obj as any).setActive(false);
      this.pool.push(obj);
    }
  }

  acquire(): T {
    let obj = this.pool.pop();
    if (!obj) obj = this.factory();
    (obj as any).setVisible(true);
    (obj as any).setActive(true);
    this.activeItems.push(obj);
    return obj;
  }

  release(obj: T): void {
    this.reset(obj);
    (obj as any).setVisible(false);
    (obj as any).setActive(false);
    const idx = this.activeItems.indexOf(obj);
    if (idx >= 0) this.activeItems.splice(idx, 1);
    this.pool.push(obj);
  }

  get activeCount(): number { return this.activeItems.length; }

  destroy(): void {
    for (const obj of this.pool) obj.destroy();
    for (const obj of this.activeItems) obj.destroy();
    this.pool.length = 0;
    this.activeItems.length = 0;
  }
}
