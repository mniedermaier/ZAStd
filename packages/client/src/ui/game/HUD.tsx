import { useGameStore } from '../../stores/game-store';
import { useSettingsStore, getCBColor } from '../../stores/settings-store';
import { calculateInterest, INTEREST_CAP_BASE, INTEREST_CAP_PER_WAVE, WAVE_BASE_INCOME, WAVE_INCOME_PER_WAVE, DIFFICULTY_SCALING } from '@zastd/engine';

interface HUDProps {
  playerId: string;
  onStartWave?: () => void;
}

export function HUD({ playerId, onStartWave }: HUDProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const cb = useSettingsStore((s) => s.colorblindMode);
  if (!snapshot) return null;

  const player = snapshot.players[playerId];
  if (!player) return null;

  const interestRate = player.bonuses.interestRate ?? 0.01;
  const interest = calculateInterest(player.money, interestRate, snapshot.waveNumber);
  const interestCap = INTEREST_CAP_BASE + snapshot.waveNumber * INTEREST_CAP_PER_WAVE;
  const playerCount = Object.keys(snapshot.players).length;

  const phase = snapshot.phase;
  const wave = snapshot.currentWave;
  const allSpawned = wave ? wave.spawned >= wave.totalEnemies : false;
  const canStartWave = phase === 'playing' || phase === 'wave_complete' || (phase === 'wave_active' && allSpawned);
  const cooldownActive = snapshot.manualStartCooldown !== null && snapshot.manualStartCooldown > 0;

  return (
    <div className="game-hud" style={{
      display: 'flex',
      gap: 16,
      padding: '8px 14px',
      background: 'rgba(10, 10, 26, 0.85)',
      borderRadius: 8,
      border: '1px solid #333366',
      fontSize: 13,
      pointerEvents: 'none',
      flexWrap: 'wrap',
    }}>
      <Stat label="Gold" value={player.money} color={getCBColor('gold', cb)} />
      <Stat label="Interest" value={`+${interest}`} color={getCBColor('gold', cb)} sub={`${(interestRate * 100).toFixed(0)}% (cap ${interestCap})`} />
      <Stat label="Lumber" value={player.lumber} color={getCBColor('poison', cb)} />
      <Stat label="Lives" value={snapshot.sharedLives} color={snapshot.sharedLives > 10 ? getCBColor('lives', cb) : getCBColor('livesLow', cb)} />
      <Stat
        label="Wave"
        value={`${snapshot.waveNumber}/40`}
        color={getCBColor('ice', cb)}
        onClick={canStartWave && !cooldownActive && onStartWave ? onStartWave : undefined}
        clickHint={canStartWave && !cooldownActive ? 'Send early' : undefined}
      />
      <Stat label="Kills" value={player.kills} color={getCBColor('magic', cb)} />
      {(() => {
        const ds = DIFFICULTY_SCALING[snapshot.settings.difficulty] ?? DIFFICULTY_SCALING.normal;
        const nextIncome = Math.floor((WAVE_BASE_INCOME + (snapshot.waveNumber + 1) * WAVE_INCOME_PER_WAVE) * ds.incomeMult);
        return <Stat label="Income" value={`+${nextIncome}`} color={getCBColor('gold', cb)} sub={`Wave ${snapshot.waveNumber + 1}`} />;
      })()}
      {playerCount > 1 && (
        <Stat label="Economy" value={snapshot.settings.moneySharing ? 'Shared' : 'Split'} color={snapshot.settings.moneySharing ? getCBColor('lives', cb) : '#8888aa'} />
      )}
      {snapshot.nextWaveCountdown !== null && (
        <Stat
          label="Next Wave"
          value={`${Math.ceil(snapshot.nextWaveCountdown)}s`}
          color={getCBColor('gold', cb)}
          onClick={canStartWave && !cooldownActive && onStartWave ? onStartWave : undefined}
          clickHint={canStartWave && !cooldownActive ? 'Send early' : undefined}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color, sub, onClick, clickHint }: {
  label: string; value: string | number; color: string; sub?: string;
  onClick?: () => void; clickHint?: string;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      title={clickHint}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: clickable ? 'pointer' : undefined,
        pointerEvents: clickable ? 'auto' : undefined,
        padding: clickable ? '2px 6px' : undefined,
        borderRadius: clickable ? 4 : undefined,
        background: clickable ? 'rgba(68, 187, 255, 0.08)' : undefined,
        border: clickable ? '1px solid rgba(68, 187, 255, 0.2)' : undefined,
        transition: 'background 0.15s',
      }}
    >
      <span className="stat-label" style={{ color: '#8888aa', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span className="stat-value" style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</span>
      {sub && <span style={{ color: '#8888aa', fontSize: 9 }}>{sub}</span>}
    </div>
  );
}
