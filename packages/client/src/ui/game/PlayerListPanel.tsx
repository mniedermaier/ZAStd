import { GOVERNORS } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';

export function PlayerListPanel() {
  const snapshot = useGameStore((s) => s.snapshot);
  if (!snapshot) return null;

  const players = Object.values(snapshot.players).sort((a, b) => b.kills - a.kills);
  if (players.length <= 1) return null;

  return (
    <div className="player-list-panel" style={{
      padding: 8,
      background: 'rgba(10, 10, 26, 0.85)',
      borderRadius: 8,
      border: '1px solid #333366',
      fontSize: 11,
      minWidth: 160,
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#8888aa', fontSize: 10, textTransform: 'uppercase' }}>
        Players
      </div>
      {players.map(p => (
        <div key={p.playerId} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '2px 0',
          gap: 8,
        }}>
          <span style={{ color: p.governor ? GOVERNORS[p.governor]?.color : '#e0e0f0' }}>
            {p.name}
          </span>
          <span style={{ color: '#cc88ff' }}>{p.kills} kills</span>
        </div>
      ))}
    </div>
  );
}
