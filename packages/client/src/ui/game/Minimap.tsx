import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../../stores/game-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';

const MINIMAP_W = 160;
const MINIMAP_H = 100;

function lerpColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number): string {
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function dpsToColor(ratio: number): string {
  // blue → yellow → red
  if (ratio < 0.5) {
    const t = ratio * 2;
    return lerpColor(68, 68, 255, 255, 221, 68, t);
  } else {
    const t = (ratio - 0.5) * 2;
    return lerpColor(255, 221, 68, 255, 68, 68, t);
  }
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshot = useGameStore((s) => s.snapshot);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);
  const [heatmapMode, setHeatmapMode] = useState(false);
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
    if (heatmapMode) {
      // Heatmap: color by DPS
      const towers = Object.values(snapshot.towers);
      let maxDps = 0;
      const towerDps = towers.map(t => {
        const dps = t.stats.damage * t.stats.fireRate;
        if (dps > maxDps) maxDps = dps;
        return { tower: t, dps };
      });
      for (const { tower, dps } of towerDps) {
        const ratio = maxDps > 0 ? dps / maxDps : 0;
        ctx.fillStyle = dpsToColor(ratio);
        ctx.fillRect(tower.x * scaleX, tower.y * scaleY, Math.max(scaleX, 1.5), Math.max(scaleY, 1.5));
      }
    } else {
      for (const tower of Object.values(snapshot.towers)) {
        ctx.fillStyle = '#ffdd44';
        ctx.fillRect(tower.x * scaleX, tower.y * scaleY, Math.max(scaleX, 1.5), Math.max(scaleY, 1.5));
      }
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

    // Wave direction arrow: animated arrow from spawn toward first checkpoint during active waves
    const waveActive = snapshot.phase === 'wave_active';
    const hasEnemies = Object.values(snapshot.enemies).some(e => e.isAlive);
    if (waveActive && hasEnemies) {
      const [spawnX, spawnY] = snapshot.map.spawn;
      const firstCheckpoint = snapshot.map.checkpoints?.[0];
      const targetX = firstCheckpoint ? firstCheckpoint[0] : snapshot.map.end[0];
      const targetY = firstCheckpoint ? firstCheckpoint[1] : snapshot.map.end[1];

      const fromX = spawnX * scaleX;
      const fromY = spawnY * scaleY;
      const toX = targetX * scaleX;
      const toY = targetY * scaleY;

      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const nx = dx / dist;
        const ny = dy / dist;
        const arrowLen = Math.min(dist * 0.6, 30);
        const endX = fromX + nx * arrowLen;
        const endY = fromY + ny * arrowLen;
        const headLen = 5;

        // Pulsing alpha
        const pulseAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 300);
        ctx.globalAlpha = pulseAlpha;
        ctx.strokeStyle = '#44ffff';
        ctx.lineWidth = 1.5;

        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(ny, nx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Selected tower range circle
    const selectedTowerId = useUIStore.getState().selectedTowerId;
    if (selectedTowerId) {
      const tower = snapshot.towers[selectedTowerId];
      if (tower) {
        ctx.strokeStyle = 'rgba(68, 187, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tower.x * scaleX, tower.y * scaleY, tower.stats.range * scaleX, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Ping markers
    const pings = useUIStore.getState().pings;
    const now = Date.now();
    const PING_COLORS: Record<string, string> = { alert: '#ff4466', here: '#44bbff', help: '#ffdd44' };
    for (const ping of pings) {
      const age = now - ping.time;
      if (age > 4000) continue;
      const pulse = 1 + 0.5 * Math.sin(age / 200);
      const alpha = Math.max(0, 1 - age / 4000);
      ctx.fillStyle = PING_COLORS[ping.pingType] || '#ffffff';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(ping.x * scaleX, ping.y * scaleY, 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [snapshot, colorblindMode, heatmapMode]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = (clickX / MINIMAP_W) * snapshot.map.width;
    const worldY = (clickY / MINIMAP_H) * snapshot.map.height;
    useUIStore.getState().setPanTarget(worldX, worldY);
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <div className="minimap" style={{
      borderRadius: 6,
      border: '1px solid #333366',
      overflow: 'hidden',
      opacity: 0.85,
      pointerEvents: 'auto',
      cursor: 'pointer',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ display: 'block' }}
        onClick={handleClick}
      />
      <button
        onClick={(e) => { e.stopPropagation(); setHeatmapMode(!heatmapMode); }}
        style={{
          position: 'absolute', top: 2, right: 2,
          padding: '1px 4px', fontSize: 8,
          background: heatmapMode ? 'rgba(255, 68, 68, 0.3)' : 'rgba(26, 26, 58, 0.8)',
          border: `1px solid ${heatmapMode ? '#ff4444' : '#333366'}`,
          color: heatmapMode ? '#ff4444' : '#8888aa',
          borderRadius: 3, cursor: 'pointer', lineHeight: 1.2,
        }}
      >
        DPS
      </button>
    </div>
  );
}
