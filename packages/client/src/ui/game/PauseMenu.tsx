import { useSettingsStore } from '../../stores/settings-store';

interface PauseMenuProps {
  onResume: () => void;
  onHelp: () => void;
  onQuit: () => void;
  isSolo?: boolean;
}

export function PauseMenu({ onResume, onHelp, onQuit, isSolo }: PauseMenuProps) {
  const masterVolume = useSettingsStore((s) => s.masterVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const colorblindMode = useSettingsStore((s) => s.colorblindMode);
  const setMasterVolume = useSettingsStore((s) => s.setMasterVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setColorblindMode = useSettingsStore((s) => s.setColorblindMode);
  const gameSpeed = useSettingsStore((s) => s.gameSpeed);
  const setGameSpeed = useSettingsStore((s) => s.setGameSpeed);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
    }}>
      <div className="modal-panel" style={{
        background: '#12122a',
        border: '2px solid #333366',
        borderRadius: 12,
        padding: 24,
        width: 'min(320px, 90vw)',
        maxWidth: 400,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ textAlign: 'center', fontSize: 22, color: '#44bbff', marginBottom: 20 }}>
          Paused
        </h2>

        <div style={{ marginBottom: 16 }}>
          <VolumeSlider label="Master Volume" value={masterVolume} onChange={setMasterVolume} />
          <VolumeSlider label="SFX Volume" value={sfxVolume} onChange={setSfxVolume} />
          <VolumeSlider label="Music Volume" value={musicVolume} onChange={setMusicVolume} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 0',
        }}>
          <span style={{ fontSize: 13, color: '#e0e0f0' }}>Colorblind Mode</span>
          <button
            onClick={() => setColorblindMode(!colorblindMode)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: colorblindMode ? 'rgba(68, 187, 255, 0.2)' : 'rgba(26, 26, 58, 0.9)',
              border: `1px solid ${colorblindMode ? '#44bbff' : '#333366'}`,
              color: colorblindMode ? '#44bbff' : '#8888aa',
            }}
          >
            {colorblindMode ? 'ON' : 'OFF'}
          </button>
        </div>

        {isSolo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            padding: '8px 0',
          }}>
            <span style={{ fontSize: 13, color: '#e0e0f0' }}>Game Speed</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setGameSpeed(s)}
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    background: gameSpeed === s ? 'rgba(68, 187, 255, 0.2)' : 'rgba(26, 26, 58, 0.9)',
                    border: `1px solid ${gameSpeed === s ? '#44bbff' : '#333366'}`,
                    color: gameSpeed === s ? '#44bbff' : '#8888aa',
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="primary" onClick={onResume} style={{ width: '100%', padding: '10px 20px' }}>
            Resume
          </button>
          <button onClick={onHelp} style={{ width: '100%', padding: '10px 20px' }}>
            Help & Controls
          </button>
          <button className="danger" onClick={onQuit} style={{ width: '100%', padding: '10px 20px' }}>
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#8888aa' }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e0e0f0' }}>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          accentColor: '#44bbff',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
