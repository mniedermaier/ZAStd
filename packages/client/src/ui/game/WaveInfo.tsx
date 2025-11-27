import { useState } from 'react';
import { useGameStore } from '../../stores/game-store';
import { getWavePreview, ENEMY_DEFINITIONS, DIFFICULTY_MULTIPLIER_PER_WAVE, MUTATOR_DEFINITIONS } from '@zastd/engine';

interface WaveInfoProps {
  onStartWave: () => void;
}

function formatHP(hp: number): string {
  if (hp >= 1000) return `${(hp / 1000).toFixed(1)}k`;
  return `${hp}`;
}

export function WaveInfo({ onStartWave }: WaveInfoProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const [showPreview, setShowPreview] = useState(false);
  if (!snapshot) return null;

  const wave = snapshot.currentWave;
  const phase = snapshot.phase;
  const canStart = phase === 'playing' || phase === 'wave_complete';
  const isWaveActive = phase === 'wave_active';
  const cooldownActive = snapshot.manualStartCooldown !== null && snapshot.manualStartCooldown > 0;

  const nextWave = snapshot.waveNumber + 1;
  const hasNextPreview = nextWave <= 40;
  const playerCount = Object.keys(snapshot.players).length;

  return (
    <div style={{
      padding: '8px 14px',
      background: 'rgba(10, 10, 26, 0.85)',
      borderRadius: 8,
      border: '1px solid #333366',
      fontSize: 12,
      minWidth: 140,
      width: '100%',
      pointerEvents: 'auto',
    }}>
      {/* Active wave info */}
      {wave && isWaveActive && (
        <div>
          <div style={{ fontWeight: 700, color: '#44bbff', marginBottom: 4 }}>
            {wave.properties?.name || `Wave ${wave.waveNumber}`}
          </div>
          <div style={{ color: '#8888aa' }}>
            {wave.spawned}/{wave.totalEnemies} spawned
          </div>
          {wave.properties?.tags && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {wave.properties.tags.map(tag => (
                <span key={tag} style={{
                  padding: '1px 6px',
                  fontSize: 10,
                  borderRadius: 3,
                  background: 'rgba(68, 187, 255, 0.15)',
                  color: '#44bbff',
                }}>{tag}</span>
              ))}
            </div>
          )}
          {wave.properties?.mutators && wave.properties.mutators.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {wave.properties.mutators.map(mut => {
                const def = (MUTATOR_DEFINITIONS as Record<string, { name: string; description: string; color: string }>)[mut];
                if (!def) return null;
                return (
                  <span key={mut} title={def.description} style={{
                    padding: '1px 6px',
                    fontSize: 10,
                    borderRadius: 3,
                    background: `${def.color}25`,
                    color: def.color,
                    fontWeight: 600,
                    cursor: 'help',
                  }}>{def.name}</span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Send wave early / auto-start countdown */}
      {canStart && !isWaveActive && (
        <div style={{ marginBottom: hasNextPreview ? 6 : 0 }}>
          {snapshot.nextWaveCountdown !== null && (
            <div style={{ fontSize: 10, color: '#8888aa', textAlign: 'center', marginBottom: 4 }}>
              Wave {nextWave} in {Math.ceil(snapshot.nextWaveCountdown)}s
            </div>
          )}
          <button
            className="primary"
            onClick={onStartWave}
            disabled={cooldownActive}
            style={{ width: '100%' }}
          >
            Send Early
          </button>
        </div>
      )}

      {/* Next wave preview toggle */}
      {hasNextPreview && (
        <div
          onClick={() => setShowPreview(!showPreview)}
          style={{
            cursor: 'pointer',
            padding: '4px 0',
            fontSize: 10,
            color: '#44bbff',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {showPreview ? 'Hide preview \u25B2' : `Preview wave ${nextWave} \u25BC`}
        </div>
      )}

      {/* Inline compact preview */}
      {showPreview && hasNextPreview && (
        <CompactWavePreview waveNumber={nextWave} playerCount={playerCount} />
      )}
    </div>
  );
}

function CompactWavePreview({ waveNumber, playerCount }: { waveNumber: number; playerCount: number }) {
  const preview = getWavePreview(waveNumber, playerCount);
  const healthScale = 1 + (waveNumber - 1) * DIFFICULTY_MULTIPLIER_PER_WAVE;
  let totalHP = 0;
  for (const et of preview.enemyTypes) {
    const def = (ENEMY_DEFINITIONS as Record<string, { maxHealth: number }>)[et.type];
    if (def) totalHP += Math.floor(def.maxHealth * healthScale) * et.count;
  }

  const isBossWave = waveNumber % 10 === 0;
  const isDanger = isBossWave || preview.totalEnemies > 30;

  return (
    <div style={{
      borderTop: '1px solid #333366',
      paddingTop: 6,
      marginTop: 2,
      fontSize: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#8888aa' }}>
        <span>{preview.totalEnemies} enemies</span>
        <span style={{ color: '#ff8844' }}>HP: {formatHP(totalHP)}</span>
      </div>
      {isDanger && (
        <div style={{ color: '#ff4466', fontWeight: 700, fontSize: 9, marginBottom: 4 }}>
          {isBossWave ? 'BOSS WAVE' : 'LARGE WAVE'}
        </div>
      )}
      {preview.enemyTypes.map((et: { type: string; count: number }) => (
        <div key={et.type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
          <span style={{ color: '#e0e0f0', textTransform: 'capitalize' }}>
            {et.type.replace(/_/g, ' ')}
          </span>
          <span style={{ color: '#ffdd44', fontWeight: 600 }}>x{et.count}</span>
        </div>
      ))}
      {preview.properties?.tags && preview.properties.tags.length > 0 && (
        <div style={{ marginTop: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {preview.properties.tags.map((tag: string) => (
            <span key={tag} style={{
              fontSize: 8,
              padding: '1px 4px',
              borderRadius: 2,
              background: 'rgba(204, 136, 255, 0.15)',
              color: '#cc88ff',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
