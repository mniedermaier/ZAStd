import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from './config';
import type { GameScene } from './scenes/GameScene';

interface PhaserGameProps {
  onPlaceTower?: (data: { x: number; y: number; towerType: string }) => void;
  onUseAbility?: (data: { targetX: number; targetY: number }) => void;
}

export function PhaserGame({ onPlaceTower, onUseAbility }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createPhaserConfig(containerRef.current);
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Listen for placement events from the scene
    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      if (scene) {
        scene.events.on('place-tower', (data: { x: number; y: number; towerType: string }) => {
          onPlaceTower?.(data);
        });
        scene.events.on('use-ability', (data: { targetX: number; targetY: number }) => {
          onUseAbility?.(data);
        });
      }
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Prevent browser zoom on the game container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Prevent Ctrl+scroll browser zoom
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    // Prevent double-tap zoom and pinch zoom at browser level
    const preventTouchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    el.addEventListener('wheel', preventBrowserZoom, { passive: false });
    el.addEventListener('touchstart', preventTouchZoom, { passive: false });
    el.addEventListener('touchmove', preventTouchZoom, { passive: false });

    return () => {
      el.removeEventListener('wheel', preventBrowserZoom);
      el.removeEventListener('touchstart', preventTouchZoom);
      el.removeEventListener('touchmove', preventTouchZoom);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        touchAction: 'none',
      }}
    />
  );
}
