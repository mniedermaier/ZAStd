import { useState } from 'react';
import { shareScore } from '../../utils/share';
import type { Badge } from '../../stores/stats-store';
import { useReplayStore } from '../../stores/replay-store';
import type { ReplayData } from '@zastd/engine';

interface GameOverModalProps {
  victory: boolean;
  stats: Record<string, { name: string; kills: number; damageDealt: number; towersPlaced: number; governor: string | null }>;
  onClose: () => void;
  waveReached?: number;
  livesRemaining?: number;
  difficulty?: string;
  endlessMode?: boolean;
  scoreMultiplier?: number;
  newBadges?: Badge[];
  replayData?: ReplayData | null;
}

export function GameOverModal({ victory, stats, onClose, waveReached, livesRemaining, difficulty, endlessMode, scoreMultiplier, newBadges, replayData }: GameOverModalProps) {
  const entries = Object.values(stats).sort((a, b) => b.kills - a.kills);
  const [shareLabel, setShareLabel] = useState('Share');
  const [replaySaved, setReplaySaved] = useState(false);
  const saveReplay = useReplayStore((s) => s.saveReplay);

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
              <span>Wave: <span style={{ color: '#44bbff', fontWeight: 600 }}>{waveReached}{endlessMode ? '' : '/40'}</span></span>
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

        {scoreMultiplier !== undefined && scoreMultiplier > 1 && waveReached !== undefined && (
          <div style={{
            textAlign: 'center',
            marginTop: 8,
            padding: '6px 12px',
            background: 'rgba(255, 170, 68, 0.1)',
            border: '1px solid rgba(255, 170, 68, 0.3)',
            borderRadius: 6,
            fontSize: 13,
          }}>
            <span style={{ color: '#8888aa' }}>Score: </span>
            <span style={{ color: '#ffaa44', fontWeight: 600 }}>
              Wave {waveReached} × {scoreMultiplier.toFixed(1)}x = {Math.floor(waveReached * scoreMultiplier)} pts
            </span>
          </div>
        )}

        {newBadges && newBadges.length > 0 && (
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'rgba(68, 187, 255, 0.08)',
            border: '1px solid #333366',
            borderRadius: 6,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Badges Earned</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {newBadges.map(b => (
                <span
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  style={{
                    fontSize: 22,
                    filter: `drop-shadow(0 0 4px ${b.color})`,
                    cursor: 'default',
                  }}
                >{b.icon}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '10px 20px',
              background: 'rgba(68, 187, 255, 0.1)',
              border: '1px solid #44bbff',
              color: '#44bbff',
              minWidth: 80,
            }}
          >
            {shareLabel}
          </button>
          {replayData && replayData.frames?.length > 0 && (
            <button
              onClick={() => {
                saveReplay(replayData);
                setReplaySaved(true);
              }}
              disabled={replaySaved}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: replaySaved ? 'rgba(68, 255, 136, 0.1)' : 'rgba(204, 136, 255, 0.1)',
                border: `1px solid ${replaySaved ? '#44ff88' : '#cc88ff'}`,
                color: replaySaved ? '#44ff88' : '#cc88ff',
                minWidth: 80,
              }}
            >
              {replaySaved ? 'Saved!' : 'Save Replay'}
            </button>
          )}
          <button
            className="primary"
            onClick={onClose}
            style={{ flex: 1, padding: '10px 20px', minWidth: 80 }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
