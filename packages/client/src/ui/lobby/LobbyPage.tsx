import { useState } from 'react';
import { GOVERNORS, CHALLENGE_MODIFIERS } from '@zastd/engine';
import { GovernorCard } from './GovernorCard';
import { useLobbyStore } from '../../stores/lobby-store';

interface LobbyPageProps {
  playerId: string;
  players: Record<string, { name: string; governor: string | null; ready: boolean }>;
  onSelectGovernor: (element: string) => void;
  onReady: () => void;
  onStartGame: () => void;
  onUpdateSettings: (settings: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }) => void;
  settings: { mapSize: string; mapLayout: string; difficulty: string; moneySharing?: boolean };
  allReady: boolean;
  isHost: boolean;
  roomCode?: string;
  onLeave?: () => void;
  dailyInfo?: { dateString: string; featuredGovernor: string };
  endlessMode?: boolean;
  showModifiers?: boolean;
  selectedModifiers?: string[];
  onUpdateModifiers?: (modifiers: string[]) => void;
}

export function LobbyPage({
  playerId, players, onSelectGovernor, onReady, onStartGame,
  onUpdateSettings, settings, allReady, isHost, roomCode, onLeave, dailyInfo,
  endlessMode, showModifiers, selectedModifiers = [], onUpdateModifiers,
}: LobbyPageProps) {
  const { playerName, setPlayerName } = useLobbyStore();
  const me = players[playerId];
  const myGovernor = me?.governor;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 'min(24px, 4vw)',
      gap: 20,
      overflow: 'auto',
    }}>
      <h1 style={{ fontSize: 28, color: '#44bbff', letterSpacing: 2 }}>ZAStd Tower Defense</h1>

      {dailyInfo && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(255, 170, 68, 0.1)',
          border: '1px solid #ffaa44',
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{ color: '#ffaa44', fontSize: 16, fontWeight: 700 }}>
            Daily Challenge — {dailyInfo.dateString}
          </div>
          <div style={{ color: '#aa8844', fontSize: 12, marginTop: 4 }}>
            Featured Governor: {GOVERNORS[dailyInfo.featuredGovernor]?.name ?? dailyInfo.featuredGovernor}
            {' '}&bull;{' '}
            {settings.mapSize} / {settings.mapLayout} / {settings.difficulty}
          </div>
          <div style={{ color: '#887755', fontSize: 10, marginTop: 2 }}>
            Settings locked — same seed for everyone
          </div>
        </div>
      )}

      {endlessMode && (
        <div style={{
          padding: '8px 20px',
          background: 'rgba(204, 68, 255, 0.1)',
          border: '1px solid #cc44ff',
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{ color: '#cc44ff', fontSize: 16, fontWeight: 700 }}>
            Endless Mode
          </div>
          <div style={{ color: '#9944aa', fontSize: 11, marginTop: 2 }}>
            No wave limit — survive as long as you can
          </div>
        </div>
      )}

      {roomCode && (
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '8px 16px',
          background: 'rgba(68, 187, 255, 0.08)',
          borderRadius: 6,
          border: '1px solid #333366',
        }}>
          <span style={{ fontSize: 12, color: '#8888aa' }}>Room Code:</span>
          <span style={{ fontSize: 18, fontFamily: 'monospace', color: '#44bbff', letterSpacing: 4 }}>
            {roomCode}
          </span>
        </div>
      )}

      {/* Player name */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your Name"
          style={{ width: 'min(200px, 70vw)' }}
        />
      </div>

      {/* Governor selection */}
      <div>
        <h3 style={{ color: '#8888aa', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
          {dailyInfo ? 'Governor (Locked)' : 'Choose Governor'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, width: '100%', maxWidth: 500, opacity: dailyInfo ? 0.6 : 1, pointerEvents: dailyInfo ? 'none' : 'auto' }}>
          {Object.keys(GOVERNORS).map(elem => (
            <GovernorCard
              key={elem}
              element={elem}
              selected={myGovernor === elem}
              onSelect={onSelectGovernor}
            />
          ))}
        </div>
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          padding: 12,
          background: 'rgba(26, 26, 58, 0.5)',
          borderRadius: 8,
          border: '1px solid #333366',
          maxWidth: '100%',
        }}>
          <div>
            <label style={{ fontSize: 11, color: '#8888aa' }}>Map Size</label>
            <select
              value={settings.mapSize}
              onChange={(e) => onUpdateSettings({ mapSize: e.target.value })}
            >
              <option value="tiny">Tiny</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8888aa' }}>Layout</label>
            <select
              value={settings.mapLayout}
              onChange={(e) => onUpdateSettings({ mapLayout: e.target.value })}
            >
              <option value="classic">Classic</option>
              <option value="spiral">Spiral</option>
              <option value="crossroads">Crossroads</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8888aa' }}>Difficulty</label>
            <select
              value={settings.difficulty}
              onChange={(e) => onUpdateSettings({ difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
              <option value="endless">Endless</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#8888aa', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.moneySharing ?? false}
                onChange={(e) => onUpdateSettings({ moneySharing: e.target.checked })}
                style={{ marginRight: 4 }}
              />
              Share Income
            </label>
          </div>
        </div>
      )}

      {/* Challenge Modifiers */}
      {showModifiers && onUpdateModifiers && (
        <div style={{
          padding: 12,
          background: 'rgba(26, 26, 58, 0.5)',
          borderRadius: 8,
          border: '1px solid #333366',
          maxWidth: 400,
          width: '100%',
        }}>
          <h3 style={{ color: '#8888aa', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
            Challenge Modifiers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(CHALLENGE_MODIFIERS).map(([id, mod]) => (
              <label key={id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: '#e0e0f0', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={selectedModifiers.includes(id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedModifiers, id]
                      : selectedModifiers.filter(m => m !== id);
                    onUpdateModifiers(next);
                  }}
                />
                <span>{mod.name}</span>
                <span style={{ color: '#8888aa', fontSize: 10, flex: 1 }}>{mod.description}</span>
                <span style={{ color: '#ffaa44', fontSize: 10, fontWeight: 600 }}>{mod.scoreMultiplier}x</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Player list */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h3 style={{ color: '#8888aa', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
          Players ({Object.keys(players).length})
        </h3>
        {Object.entries(players).map(([pid, p]) => (
          <div key={pid} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: pid === playerId ? 'rgba(68, 187, 255, 0.08)' : 'transparent',
            borderRadius: 4,
            fontSize: 13,
          }}>
            <span>
              {p.name || 'Unnamed'}
              {pid === playerId && <span style={{ color: '#8888aa' }}> (you)</span>}
            </span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.governor && (
                <span style={{ color: GOVERNORS[p.governor]?.color, fontSize: 11 }}>
                  {GOVERNORS[p.governor]?.name}
                </span>
              )}
              <span style={{ color: p.ready ? '#44ff88' : '#555577', fontSize: 11 }}>
                {p.ready ? 'Ready' : 'Not Ready'}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Governor warning */}
      {!myGovernor && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(255, 170, 68, 0.1)',
          border: '1px solid #ffaa44',
          borderRadius: 6,
          fontSize: 12,
          color: '#ffaa44',
        }}>
          Select a Governor above to unlock faction towers
        </div>
      )}

      {/* Ready / Start / Leave */}
      <div style={{ display: 'flex', gap: 12 }}>
        {onLeave && (
          <button
            onClick={onLeave}
            style={{ padding: '10px 24px', fontSize: 15 }}
          >
            {dailyInfo ? 'Back' : 'Leave Room'}
          </button>
        )}
        <button
          onClick={onReady}
          className={me?.ready ? 'danger' : 'primary'}
          style={{ padding: '10px 24px', fontSize: 15 }}
        >
          {me?.ready ? 'Unready' : 'Ready'}
        </button>
        {(isHost || dailyInfo) && (
          <button
            onClick={onStartGame}
            className="primary"
            disabled={!allReady}
            style={{ padding: '10px 24px', fontSize: 15 }}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
