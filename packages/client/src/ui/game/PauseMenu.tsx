import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { useGameStore } from '../../stores/game-store';

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
  const graphicsQuality = useSettingsStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useSettingsStore((s) => s.setGraphicsQuality);
  const screenShake = useSettingsStore((s) => s.screenShake);
  const setScreenShake = useSettingsStore((s) => s.setScreenShake);
  const blueprints = useSettingsStore((s) => s.blueprints);
  const saveBlueprint = useSettingsStore((s) => s.saveBlueprint);
  const deleteBlueprint = useSettingsStore((s) => s.deleteBlueprint);
  const loadBlueprintAction = useSettingsStore((s) => s.loadBlueprint);
  const snapshot = useGameStore((s) => s.snapshot);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [bpName, setBpName] = useState('');

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

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 0',
        }}>
          <span style={{ fontSize: 13, color: '#e0e0f0' }}>Graphics</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['low', 'med', 'high'] as const).map(q => (
              <button
                key={q}
                onClick={() => setGraphicsQuality(q)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  background: graphicsQuality === q ? 'rgba(68, 187, 255, 0.2)' : 'rgba(26, 26, 58, 0.9)',
                  border: `1px solid ${graphicsQuality === q ? '#44bbff' : '#333366'}`,
                  color: graphicsQuality === q ? '#44bbff' : '#8888aa',
                  textTransform: 'capitalize',
                }}
              >
                {q === 'med' ? 'Med' : q === 'low' ? 'Low' : 'High'}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 0',
        }}>
          <span style={{ fontSize: 13, color: '#e0e0f0' }}>Screen Shake</span>
          <button
            onClick={() => setScreenShake(!screenShake)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: screenShake ? 'rgba(68, 187, 255, 0.2)' : 'rgba(26, 26, 58, 0.9)',
              border: `1px solid ${screenShake ? '#44bbff' : '#333366'}`,
              color: screenShake ? '#44bbff' : '#8888aa',
            }}
          >
            {screenShake ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Blueprints */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowBlueprints(!showBlueprints)}
            style={{
              width: '100%', padding: '6px 12px', fontSize: 12,
              background: showBlueprints ? 'rgba(68, 187, 255, 0.15)' : 'transparent',
              border: '1px solid #333366', color: showBlueprints ? '#44bbff' : '#8888aa',
            }}
          >
            Blueprints {showBlueprints ? '\u25B2' : '\u25BC'}
          </button>
          {showBlueprints && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: 'rgba(26, 26, 58, 0.4)', borderRadius: 6,
              border: '1px solid #222244',
            }}>
              {/* Save current layout */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <input
                  value={bpName}
                  onChange={(e) => setBpName(e.target.value)}
                  placeholder="Blueprint name"
                  maxLength={20}
                  style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
                />
                <button
                  onClick={() => {
                    if (!snapshot || !bpName.trim()) return;
                    const spawn = snapshot.map.spawn;
                    const towers = Object.values(snapshot.towers).map(t => ({
                      relX: t.x - spawn[0],
                      relY: t.y - spawn[1],
                      towerType: t.towerType,
                    }));
                    if (towers.length === 0) return;
                    saveBlueprint(bpName.trim(), towers);
                    setBpName('');
                  }}
                  style={{
                    padding: '4px 8px', fontSize: 11, minHeight: 'auto',
                    background: 'rgba(68, 255, 136, 0.1)',
                    border: '1px solid #44ff88', color: '#44ff88',
                  }}
                >
                  Save Layout
                </button>
              </div>

              {/* List saved blueprints */}
              {blueprints.length === 0 ? (
                <div style={{ fontSize: 11, color: '#8888aa', textAlign: 'center', padding: 4 }}>
                  No saved blueprints
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                  {blueprints.map(bp => (
                    <div key={bp.id} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 6px', background: 'rgba(10, 10, 26, 0.5)',
                      borderRadius: 4, border: '1px solid #222244',
                    }}>
                      <span style={{ flex: 1, fontSize: 11, color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bp.name} <span style={{ color: '#8888aa' }}>({bp.towers.length})</span>
                      </span>
                      <button
                        onClick={() => { loadBlueprintAction(bp.id); onResume(); }}
                        style={{
                          padding: '2px 6px', fontSize: 10, minHeight: 'auto',
                          background: 'rgba(68, 187, 255, 0.1)',
                          border: '1px solid #44bbff', color: '#44bbff',
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteBlueprint(bp.id)}
                        style={{
                          padding: '2px 6px', fontSize: 10, minHeight: 'auto',
                          background: 'rgba(255, 68, 102, 0.1)',
                          border: '1px solid #ff4466', color: '#ff4466',
                        }}
                      >
                        Del
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
