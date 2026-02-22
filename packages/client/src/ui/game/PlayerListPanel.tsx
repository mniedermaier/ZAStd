import { useState } from 'react';
import { GOVERNORS } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';
import { useToastStore } from '../shared/ActionToast';

interface PlayerListPanelProps {
  playerId?: string;
  onSendGold?: (targetPlayerId: string, amount: number) => void;
}

const GOLD_PRESETS = [10, 25, 50, 100];

export function PlayerListPanel({ playerId, onSendGold }: PlayerListPanelProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const [sendTarget, setSendTarget] = useState<string | null>(null);

  if (!snapshot) return null;

  const players = Object.values(snapshot.players).sort((a, b) => b.kills - a.kills);
  if (players.length <= 1) return null;

  const myMoney = playerId ? snapshot.players[playerId]?.money ?? 0 : 0;

  const handleSend = (targetId: string, amount: number) => {
    if (!onSendGold) return;
    const actual = amount === -1 ? myMoney : amount;
    if (actual < 1) return;
    onSendGold(targetId, actual);
    useToastStore.getState().addToast(`Sent ${actual}g`, 'success', 2000);
    setSendTarget(null);
  };

  return (
    <div className="player-list-panel" style={{
      padding: 8,
      background: 'rgba(10, 10, 26, 0.85)',
      borderRadius: 8,
      border: '1px solid #333366',
      fontSize: 11,
      minWidth: 160,
      pointerEvents: 'auto',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#8888aa', fontSize: 10, textTransform: 'uppercase' }}>
        Players
      </div>
      {players.map(p => (
        <div key={p.playerId}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 0',
            gap: 8,
          }}>
            <span style={{ color: p.governor ? GOVERNORS[p.governor]?.color : '#e0e0f0' }}>
              {p.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#cc88ff' }}>{p.kills} kills</span>
              {onSendGold && playerId && p.playerId !== playerId && (
                <button
                  onClick={() => setSendTarget(sendTarget === p.playerId ? null : p.playerId)}
                  style={{
                    padding: '1px 5px',
                    fontSize: 9,
                    background: sendTarget === p.playerId ? '#44bbff' : 'rgba(68, 187, 255, 0.15)',
                    border: '1px solid #44bbff',
                    borderRadius: 4,
                    color: sendTarget === p.playerId ? '#0a0a1a' : '#44bbff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    lineHeight: '14px',
                  }}
                >
                  Gold
                </button>
              )}
            </div>
          </div>
          {sendTarget === p.playerId && (
            <div style={{
              display: 'flex',
              gap: 3,
              padding: '3px 0 4px',
              flexWrap: 'wrap',
            }}>
              {GOLD_PRESETS.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleSend(p.playerId, amt)}
                  disabled={myMoney < amt}
                  style={{
                    padding: '1px 5px',
                    fontSize: 9,
                    background: myMoney >= amt ? 'rgba(255, 204, 0, 0.15)' : 'rgba(50, 50, 70, 0.3)',
                    border: `1px solid ${myMoney >= amt ? '#ffcc00' : '#555'}`,
                    borderRadius: 3,
                    color: myMoney >= amt ? '#ffcc00' : '#666',
                    cursor: myMoney >= amt ? 'pointer' : 'default',
                    fontWeight: 600,
                    lineHeight: '14px',
                  }}
                >
                  {amt}
                </button>
              ))}
              <button
                onClick={() => handleSend(p.playerId, -1)}
                disabled={myMoney < 1}
                style={{
                  padding: '1px 5px',
                  fontSize: 9,
                  background: myMoney >= 1 ? 'rgba(255, 136, 0, 0.15)' : 'rgba(50, 50, 70, 0.3)',
                  border: `1px solid ${myMoney >= 1 ? '#ff8800' : '#555'}`,
                  borderRadius: 3,
                  color: myMoney >= 1 ? '#ff8800' : '#666',
                  cursor: myMoney >= 1 ? 'pointer' : 'default',
                  fontWeight: 600,
                  lineHeight: '14px',
                }}
              >
                All
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
