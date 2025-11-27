import { useGameStore } from '../../stores/game-store';

export type MobilePanel = 'tech' | 'scout' | 'map' | 'log' | 'players';

interface MobileToolbarProps {
  playerId: string;
  activePanel: MobilePanel | null;
  onToggle: (panel: MobilePanel) => void;
}

export function MobileToolbar({ playerId, activePanel, onToggle }: MobileToolbarProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const player = snapshot?.players[playerId];
  const lumber = player?.lumber ?? 0;
  const playerCount = snapshot ? Object.keys(snapshot.players).length : 1;

  const buttons: { panel: MobilePanel; label: string; icon: string; badge?: string; hidden?: boolean }[] = [
    { panel: 'tech', label: 'Tech', icon: '🪵', badge: lumber > 0 ? String(lumber) : undefined },
    { panel: 'scout', label: 'Scout', icon: '👁' },
    { panel: 'map', label: 'Map', icon: '▦' },
    { panel: 'log', label: 'Log', icon: '☰' },
    { panel: 'players', label: 'Players', icon: '👥', hidden: playerCount <= 1 },
  ];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
      padding: '4px 8px',
    }}>
      {buttons.filter(b => !b.hidden).map(b => (
        <button
          key={b.panel}
          onClick={() => onToggle(b.panel)}
          style={{
            position: 'relative',
            padding: '4px 10px',
            fontSize: 11,
            minHeight: 32,
            background: activePanel === b.panel ? 'rgba(68, 187, 255, 0.15)' : 'rgba(10, 10, 26, 0.8)',
            border: activePanel === b.panel ? '1px solid #44bbff' : '1px solid #333366',
            color: activePanel === b.panel ? '#44bbff' : '#aaaacc',
            borderRadius: 6,
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: 13 }}>{b.icon}</span>{' '}{b.label}
          {b.badge && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#88ff44',
              color: '#0a0a1a',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 8,
              padding: '1px 4px',
              minWidth: 14,
              textAlign: 'center',
            }}>
              {b.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
