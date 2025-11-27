import { useState } from 'react';
import { useLobbyStore } from '../../stores/lobby-store';
import { useStatsStore } from '../../stores/stats-store';
import { useSettingsStore } from '../../stores/settings-store';
import { isSupabaseConfigured } from '../../supabase';
import { LeaderboardPanel } from './LeaderboardPanel';

interface MainMenuProps {
  onBrowseRooms: () => void;
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onPlaySolo: () => void;
}

export function MainMenu({ onBrowseRooms, onCreateRoom, onJoinByCode, onPlaySolo }: MainMenuProps) {
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
      justifyContent: 'center',
      gap: 24,
    }}>
      <h1 style={{ fontSize: 36, color: '#44bbff', letterSpacing: 3, marginBottom: 8 }}>
        ZAStd Tower Defense
      </h1>
      <p style={{ color: '#8888aa', fontSize: 13, marginTop: -16 }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 'min(260px, 85vw)' }}>
        {hasSupabase && (
          <>
            <button className="primary" onClick={onBrowseRooms} style={{ padding: '12px 24px', fontSize: 15 }}>
              Browse Rooms
            </button>
            <button className="primary" onClick={onCreateRoom} style={{ padding: '12px 24px', fontSize: 15 }}>
              Create Room
            </button>
            <button className="primary" onClick={onJoinByCode} style={{ padding: '12px 24px', fontSize: 15 }}>
              Join by Code
            </button>
            <div style={{ borderTop: '1px solid #333366', margin: '4px 0' }} />
          </>
        )}
        <button
          onClick={onPlaySolo}
          style={{
            padding: '12px 24px',
            fontSize: 15,
            background: hasSupabase ? 'rgba(68, 187, 255, 0.08)' : undefined,
          }}
          className={hasSupabase ? '' : 'primary'}
        >
          Play Solo
        </button>
        <div style={{ borderTop: '1px solid #333366', margin: '4px 0' }} />
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{ padding: '10px 24px', fontSize: 14, color: '#8888aa' }}
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

      {(stats.gamesPlayed > 0 || hasSupabase) && (
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{ marginTop: 6, fontSize: 12, color: '#44bbff', padding: '6px 16px' }}
        >
          View Leaderboard
        </button>
      )}

      {showLeaderboard && <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />}
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
