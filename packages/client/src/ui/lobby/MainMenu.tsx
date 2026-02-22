import { useState } from 'react';
import { useLobbyStore } from '../../stores/lobby-store';
import { useStatsStore, getUnlockedBadges } from '../../stores/stats-store';
import { useSettingsStore } from '../../stores/settings-store';
import { isSupabaseConfigured } from '../../supabase';
import { LeaderboardPanel } from './LeaderboardPanel';

interface MainMenuProps {
  onBrowseRooms: () => void;
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onPlaySolo: () => void;
  onPlayDaily?: () => void;
  onPlayEndless?: () => void;
  onPlayTutorial?: () => void;
}

export function MainMenu({ onBrowseRooms, onCreateRoom, onJoinByCode, onPlaySolo, onPlayDaily, onPlayEndless, onPlayTutorial }: MainMenuProps) {
  const { playerName, setPlayerName } = useLobbyStore();
  const hasSupabase = isSupabaseConfigured();
  const stats = useStatsStore();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'min(16px, 2.5vh)',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: 'max(env(safe-area-inset-top, 0px), 16px) 0 max(env(safe-area-inset-bottom, 0px), 16px)',
    }}>
      <div style={{ flex: '1 0 0', minHeight: 8 }} />
      <img
        src="/favicon.svg"
        alt="ZAS"
        style={{
          width: 'min(64px, 14vw)',
          height: 'min(64px, 14vw)',
          filter: 'drop-shadow(0 0 10px rgba(68, 187, 255, 0.5))',
        }}
      />
      <h1 style={{ fontSize: 'min(36px, 7vw)', color: '#44bbff', letterSpacing: 3, margin: 0, textAlign: 'center' }}>
        ZAStd
      </h1>
      <p style={{ color: '#8888aa', fontSize: 'min(13px, 3vw)', marginTop: -4 }}>
        Cooperative maze-building tower defense
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: '#8888aa' }}>Name:</label>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          style={{ width: 'min(200px, 70vw)' }}
          maxLength={20}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'min(10px, 1.5vh)', width: 'min(260px, 85vw)' }}>
        {hasSupabase && (
          <>
            <button className="primary" onClick={onBrowseRooms} style={{ padding: 'min(12px, 2vh) 24px', fontSize: 15 }}>
              Browse Rooms
            </button>
            <button className="primary" onClick={onCreateRoom} style={{ padding: 'min(12px, 2vh) 24px', fontSize: 15 }}>
              Create Room
            </button>
            <button className="primary" onClick={onJoinByCode} style={{ padding: 'min(12px, 2vh) 24px', fontSize: 15 }}>
              Join by Code
            </button>
            <div style={{ borderTop: '1px solid #333366', margin: '2px 0' }} />
          </>
        )}
        <button
          onClick={onPlaySolo}
          style={{
            padding: 'min(12px, 2vh) 24px',
            fontSize: 15,
            background: hasSupabase ? 'rgba(68, 187, 255, 0.08)' : undefined,
          }}
          className={hasSupabase ? '' : 'primary'}
        >
          Play Solo
        </button>
        {onPlayDaily && (
          <button
            onClick={onPlayDaily}
            style={{
              padding: 'min(12px, 2vh) 24px',
              fontSize: 15,
              border: '1px solid #ffaa44',
              color: '#ffaa44',
              background: 'rgba(255, 170, 68, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>Daily Challenge</span>
            <span style={{ fontSize: 10, color: '#aa8844', fontWeight: 400 }}>Same seed for everyone today</span>
          </button>
        )}
        {onPlayEndless && (
          <button
            onClick={onPlayEndless}
            style={{
              padding: 'min(12px, 2vh) 24px',
              fontSize: 15,
              border: '1px solid #cc44ff',
              color: '#cc44ff',
              background: 'rgba(204, 68, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>Endless Mode</span>
            <span style={{ fontSize: 10, color: '#9944aa', fontWeight: 400 }}>Survive as long as you can</span>
          </button>
        )}
        {onPlayTutorial && (
          <button
            onClick={onPlayTutorial}
            style={{
              padding: 'min(12px, 2vh) 24px',
              fontSize: 15,
              border: '1px solid #44ff88',
              color: '#44ff88',
              background: 'rgba(68, 255, 136, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span>Tutorial {!localStorage.getItem('zastd-tutorial-complete') ? '(New!)' : ''}</span>
            <span style={{ fontSize: 10, color: '#44aa66', fontWeight: 400 }}>Learn the basics</span>
          </button>
        )}
        <div style={{ borderTop: '1px solid #333366', margin: '2px 0' }} />
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{ padding: 'min(10px, 1.5vh) 24px', fontSize: 14, color: '#8888aa' }}
        >
          Settings
        </button>
      </div>

      {showSettings && <SettingsPanel />}

      {stats.gamesPlayed > 0 && (
        <div style={{
          marginTop: 8,
          padding: '10px 16px',
          background: 'rgba(10, 10, 26, 0.7)',
          borderRadius: 8,
          border: '1px solid #333366',
          fontSize: 11,
          color: '#8888aa',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px',
          minWidth: 220,
        }}>
          <span>Games Played</span>
          <span style={{ textAlign: 'right', color: '#e0e0f0' }}>{stats.gamesPlayed}</span>
          <span>Games Won</span>
          <span style={{ textAlign: 'right', color: '#44ff88' }}>{stats.gamesWon}</span>
          <span>Total Kills</span>
          <span style={{ textAlign: 'right', color: '#cc88ff' }}>{stats.totalKills}</span>
          <span>Best Wave</span>
          <span style={{ textAlign: 'right', color: '#44bbff' }}>{stats.bestWaveReached}</span>
        </div>
      )}

      {stats.gamesPlayed > 0 && (() => {
        const badges = getUnlockedBadges(stats, stats.leaderboard);
        return badges.length > 0 ? (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280,
          }}>
            {badges.map(b => (
              <span
                key={b.id}
                title={`${b.name}: ${b.description}`}
                style={{
                  fontSize: 18,
                  cursor: 'default',
                  filter: `drop-shadow(0 0 3px ${b.color})`,
                }}
              >{b.icon}</span>
            ))}
          </div>
        ) : null;
      })()}

      {(stats.gamesPlayed > 0 || hasSupabase) && (
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{ marginTop: 6, fontSize: 12, color: '#44bbff', padding: '6px 16px' }}
        >
          View Leaderboard
        </button>
      )}

      {showLeaderboard && <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />}

      <div style={{ flex: '1 0 0', minHeight: 8 }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingTop: 8,
        flexShrink: 0,
      }}>
        <a
          href="https://github.com/mniedermaier/ZAStd"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#8888aa',
            textDecoration: 'none',
            fontSize: 12,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#44bbff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8888aa')}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
        <span style={{ color: '#555577', fontSize: 10 }}>
          Build: {(typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : 'dev')}
        </span>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const masterVolume = useSettingsStore((s) => s.masterVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);
  const setMasterVolume = useSettingsStore((s) => s.setMasterVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setColorblindMode = useSettingsStore((s) => s.setColorblindMode);

  return (
    <div style={{
      padding: 16,
      background: 'rgba(10, 10, 26, 0.7)',
      borderRadius: 8,
      border: '1px solid #333366',
      width: 'min(280px, 90vw)',
    }}>
      <VolumeSlider label="Master Volume" value={masterVolume} onChange={setMasterVolume} />
      <VolumeSlider label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} />
      <VolumeSlider label="Music Volume" value={musicVolume} onChange={setMusicVolume} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: '#8888aa' }}>Colorblind Mode</span>
        <button
          onClick={() => setColorblindMode(!colorblindMode)}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            background: colorblindMode ? 'rgba(68, 187, 255, 0.2)' : 'rgba(26, 26, 58, 0.9)',
            border: `1px solid ${colorblindMode ? '#44bbff' : '#333366'}`,
            color: colorblindMode ? '#44bbff' : '#8888aa',
          }}
        >
          {colorblindMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: '#8888aa' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#e0e0f0' }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 6, accentColor: '#44bbff', cursor: 'pointer' }}
      />
    </div>
  );
}
