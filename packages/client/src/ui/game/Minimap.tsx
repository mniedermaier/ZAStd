import { useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/game-store';
import { useSettingsStore } from '../../stores/settings-store';

const MINIMAP_W = 160;
const MINIMAP_H = 100;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useGameStore((s) => s.snapshot);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapW = snapshot.map.width;
    const mapH = snapshot.map.height;
    const scaleX = MINIMAP_W / mapW;
    const scaleY = MINIMAP_H / mapH;

    // Clear
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Path cells
    if (snapshot.map.pathCells) {
      ctx.fillStyle = 'rgba(68, 187, 255, 0.15)';
      for (const cell of snapshot.map.pathCells) {
        ctx.fillRect(cell[0] * scaleX, cell[1] * scaleY, Math.max(scaleX, 1), Math.max(scaleY, 1));
      }
    }

    // Checkpoint waypoints (diamonds)
    const wpColors = ['#ffdd44', '#ff8844', '#44bbff', '#cc88ff'];
    const checkpoints = snapshot.map.checkpoints ?? [];
    for (let i = 0; i < checkpoints.length; i++) {
      const [cpx, cpy] = checkpoints[i];
      const px = cpx * scaleX;
      const py = cpy * scaleY;
      ctx.fillStyle = wpColors[i % wpColors.length];
      ctx.beginPath();
      ctx.moveTo(px, py - 3);
      ctx.lineTo(px + 3, py);
      ctx.lineTo(px, py + 3);
      ctx.lineTo(px - 3, py);
      ctx.closePath();
      ctx.fill();
    }

    // Spawn / End markers
    const [sx, sy] = snapshot.map.spawn;
    const [ex, ey] = snapshot.map.end;
    ctx.fillStyle = '#44ff88';
    ctx.fillRect(sx * scaleX - 2, sy * scaleY - 2, 4, 4);
    ctx.fillStyle = '#ff4466';
    ctx.fillRect(ex * scaleX - 2, ey * scaleY - 2, 4, 4);

    // Towers
    for (const tower of Object.values(snapshot.towers)) {
      ctx.fillStyle = '#ffdd44';
      ctx.fillRect(tower.x * scaleX, tower.y * scaleY, Math.max(scaleX, 1.5), Math.max(scaleY, 1.5));
    }

    // Enemies (colorblind-safe)
    for (const enemy of Object.values(snapshot.enemies)) {
      if (!enemy.isAlive) continue;
      if (colorblindMode) {
        ctx.fillStyle = enemy.isFlying ? '#56b4e9' : '#e69f00'; // sky blue / orange
      } else {
        ctx.fillStyle = enemy.isFlying ? '#cc88ff' : '#ff4466';
      }
      ctx.beginPath();
      ctx.arc(enemy.x * scaleX, enemy.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [snapshot, colorblindMode]);

  if (!snapshot) return null;

  return (
    <div className="minimap" style={{
      borderRadius: 6,
      border: '1px solid #333366',
      overflow: 'hidden',
      opacity: 0.85,
      pointerEvents: 'none',
    }}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ display: 'block' }}
      />
    </div>
  );
}
