import { useGameStore } from '../../stores/game-store';
import { getWavePreview, ENEMY_DEFINITIONS, DIFFICULTY_MULTIPLIER_PER_WAVE } from '@zastd/engine';

function formatHP(hp: number): string {
  if (hp >= 1000) return `${(hp / 1000).toFixed(1)}k`;
  return `${hp}`;
}

export function WavePreview() {
  const snapshot = useGameStore((s) => s.snapshot);
  if (!snapshot) return null;

  const nextWave = snapshot.waveNumber + 1;

  const playerCount = Object.keys(snapshot.players).length;
  const preview = getWavePreview(nextWave, playerCount);

  // Calculate total wave HP for DPS hint
  const healthScale = 1 + (nextWave - 1) * DIFFICULTY_MULTIPLIER_PER_WAVE;
  let totalHP = 0;
  for (const et of preview.enemyTypes) {
    const def = (ENEMY_DEFINITIONS as Record<string, { maxHealth: number }>)[et.type];
    if (def) totalHP += Math.floor(def.maxHealth * healthScale) * et.count;
  }

  // Difficulty warnings
  const hasBoss = preview.enemyTypes.some((et: { type: string }) => et.type === 'boss');
  const hasFlying = preview.enemyTypes.some((et: { type: string }) => et.type === 'flying');
  const isBossWave = nextWave % 10 === 0;
  const isDanger = isBossWave || preview.totalEnemies > 30;
  const borderColor = isDanger ? '#ff4466' : '#333366';

  // Tower effectiveness tips
  const tips: string[] = [];
  if (preview.enemyTypes.some((et: { type: string }) => et.type === 'armored'))
    tips.push('Use magic damage vs Armored');
  if (preview.enemyTypes.some((et: { type: string }) => et.type === 'magic_resist'))
    tips.push('Use physical damage vs Magic Resist');
  if (hasFlying)
    tips.push('Flying units ignore maze walls');
  if (preview.enemyTypes.some((et: { type: string }) => et.type === 'healer'))
    tips.push('Focus healers — they restore HP');

  return (
    <div className="wave-preview" style={{
      width: '100%',
      padding: '8px 10px',
      background: 'rgba(10, 10, 26, 0.9)',
      borderRadius: 8,
      border: `1px solid ${borderColor}`,
      fontSize: 11,
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: isDanger ? '#ff4466' : '#44bbff' }}>
        {isDanger ? '!! ' : ''}Wave {nextWave} Preview{isDanger ? ' !!' : ''}
      </div>
      <div style={{ color: '#8888aa', fontSize: 10, marginBottom: 6, display: 'flex', gap: 10 }}>
        <span>{preview.totalEnemies} enemies</span>
        <span style={{ color: '#ff8844' }}>HP: {formatHP(totalHP)}</span>
      </div>
      {preview.properties && (
        <div style={{
          display: 'inline-block',
          padding: '1px 6px',
          fontSize: 9,
          borderRadius: 3,
          background: 'rgba(255, 170, 68, 0.15)',
          color: '#ffaa44',
          marginBottom: 6,
          border: '1px solid rgba(255, 170, 68, 0.3)',
        }}>
          {preview.properties.name}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {preview.enemyTypes.map((et: { type: string; count: number }) => (
          <div key={et.type} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#e0e0f0', textTransform: 'capitalize' }}>
              {et.type.replace(/_/g, ' ')}
            </span>
            <span style={{ color: '#ffdd44', fontWeight: 600 }}>x{et.count}</span>
          </div>
        ))}
      </div>
      {preview.properties?.tags && preview.properties.tags.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {preview.properties.tags.map((tag: string) => (
            <span key={tag} style={{
              fontSize: 8,
              padding: '1px 4px',
              borderRadius: 2,
              background: 'rgba(204, 136, 255, 0.15)',
              color: '#cc88ff',
              border: '1px solid rgba(204, 136, 255, 0.3)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {tips.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid #333366', paddingTop: 4 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 9, color: '#ffaa44', marginBottom: 1 }}>
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
