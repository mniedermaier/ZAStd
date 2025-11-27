import { useState } from 'react';
import { shareScore } from '../../utils/share';

interface GameOverModalProps {
  victory: boolean;
  stats: Record<string, { name: string; kills: number; damageDealt: number; towersPlaced: number; governor: string | null }>;
  onClose: () => void;
  waveReached?: number;
  livesRemaining?: number;
  difficulty?: string;
}

export function GameOverModal({ victory, stats, onClose, waveReached, livesRemaining, difficulty }: GameOverModalProps) {
  const entries = Object.values(stats).sort((a, b) => b.kills - a.kills);
  const [shareLabel, setShareLabel] = useState('Share');

  const totalKills = entries.reduce((sum, s) => sum + s.kills, 0);
  const totalDamage = entries.reduce((sum, s) => sum + s.damageDealt, 0);
  const totalTowers = entries.reduce((sum, s) => sum + s.towersPlaced, 0);

  const handleShare = async () => {
    const result = await shareScore({
      playerName: entries.length === 1 ? entries[0].name : 'Player',
      wave: waveReached ?? 0,
      kills: totalKills,
      damageDealt: totalDamage,
      towersPlaced: totalTowers,
      governor: entries.length === 1 ? entries[0].governor : null,
      victory,
      difficulty,
    });
    if (result === 'copied') {
      setShareLabel('Copied!');
    } else if (result === 'shared') {
      setShareLabel('Shared!');
    } else {
      setShareLabel('Failed');
    }
    setTimeout(() => setShareLabel('Share'), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div className="modal-panel" style={{
        background: '#12122a',
        border: `2px solid ${victory ? '#44ff88' : '#ff4466'}`,
        borderRadius: 12,
        padding: 24,
        width: 'min(340px, 90vw)',
        maxWidth: 500,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 24,
          color: victory ? '#44ff88' : '#ff4466',
          marginBottom: 16,
        }}>
          {victory ? 'VICTORY!' : 'DEFEAT'}
        </h2>

        {(waveReached !== undefined || livesRemaining !== undefined) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginBottom: 12,
            fontSize: 13,
            color: '#8888aa',
          }}>
            {waveReached !== undefined && (
              <span>Wave: <span style={{ color: '#44bbff', fontWeight: 600 }}>{waveReached}/40</span></span>
            )}
            {livesRemaining !== undefined && (
              <span>Lives: <span style={{ color: livesRemaining > 0 ? '#44ff88' : '#ff4466', fontWeight: 600 }}>{livesRemaining}</span></span>
            )}
          </div>
        )}

        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#8888aa', borderBottom: '1px solid #333366' }}>
              <th style={{ textAlign: 'left', padding: 4 }}>Player</th>
              <th style={{ textAlign: 'right', padding: 4 }}>Kills</th>
              <th style={{ textAlign: 'right', padding: 4 }}>Damage</th>
              <th style={{ textAlign: 'right', padding: 4 }}>Towers</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a3a' }}>
                <td style={{ padding: 4 }}>{s.name}</td>
                <td style={{ textAlign: 'right', padding: 4, color: '#cc88ff' }}>{s.kills}</td>
                <td style={{ textAlign: 'right', padding: 4, color: '#ff8844' }}>{s.damageDealt}</td>
                <td style={{ textAlign: 'right', padding: 4, color: '#44bbff' }}>{s.towersPlaced}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '10px 20px',
              background: 'rgba(68, 187, 255, 0.1)',
              border: '1px solid #44bbff',
              color: '#44bbff',
            }}
          >
            {shareLabel}
          </button>
          <button
            className="primary"
            onClick={onClose}
            style={{ flex: 1, padding: '10px 20px' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
