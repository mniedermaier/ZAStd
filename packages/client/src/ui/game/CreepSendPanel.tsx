import { CREEP_SEND_DEFINITIONS } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';

const TYPE_ICONS: Record<string, string> = {
  basic: 'B', fast: 'F', tank: 'T', armored: 'A', flying: 'W', berserker: 'X',
};

const TYPE_COLORS: Record<string, string> = {
  basic: '#cccccc', fast: '#44ff88', tank: '#ff8844', armored: '#8888cc', flying: '#44bbff', berserker: '#ff4466',
};

interface CreepSendPanelProps {
  playerId: string;
  onSendCreeps: (enemyType: string, count: number) => void;
}

export function CreepSendPanel({ playerId, onSendCreeps }: CreepSendPanelProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  if (!snapshot) return null;

  const player = snapshot.players[playerId];
  if (!player) return null;

  return (
    <div style={{
      padding: 8,
      background: 'rgba(10, 10, 26, 0.9)',
      borderRadius: 6,
      border: '1px solid #333366',
      pointerEvents: 'auto',
      minWidth: 180,
    }}>
      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 6, fontWeight: 600 }}>
        Send Creeps for Income
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {CREEP_SEND_DEFINITIONS.map((def) => {
          const locked = snapshot.waveNumber < def.unlockWave;
          const cantAfford = player.money < def.cost;
          const disabled = locked || cantAfford;

          return (
            <button
              key={def.type}
              onClick={() => !disabled && onSendCreeps(def.type, 1)}
              disabled={disabled}
              style={{
                padding: '4px 6px',
                fontSize: 10,
                background: disabled ? 'rgba(26, 26, 58, 0.5)' : 'rgba(26, 26, 58, 0.9)',
                border: `1px solid ${locked ? '#333366' : TYPE_COLORS[def.type] || '#333366'}`,
                borderRadius: 4,
                color: disabled ? '#555577' : TYPE_COLORS[def.type] || '#e0e0f0',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>{TYPE_ICONS[def.type] || '?'}</span>
              <span>{def.type}</span>
              <span style={{ fontSize: 9, color: '#ffdd44' }}>{def.cost}g +{def.incomeBonus}g</span>
              {locked && <span style={{ fontSize: 8, color: '#ff4466' }}>Wave {def.unlockWave}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
