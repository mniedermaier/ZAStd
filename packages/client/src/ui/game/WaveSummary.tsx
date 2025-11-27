import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/game-store';

interface WaveSummaryProps {
  playerId: string;
}

interface SummaryData {
  waveNumber: number;
  sharedLives: number;
  lumberAwarded: boolean;
}

export function WaveSummary({ playerId }: WaveSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [visible, setVisible] = useState(false);
  const snapshot = useGameStore((s) => s.snapshot);
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [prevWave, setPrevWave] = useState<number>(0);

  useEffect(() => {
    if (!snapshot) return;
    const phase = snapshot.phase;
    const wave = snapshot.waveNumber;

    // Detect transition from wave_active → wave_complete or playing
    if (prevPhase === 'wave_active' && (phase === 'wave_complete' || phase === 'playing') && wave > prevWave) {
      setSummary({
        waveNumber: wave,
        sharedLives: snapshot.sharedLives,
        lumberAwarded: wave % 5 === 0,
      });
      setVisible(true);

      // Update tracking state before returning
      setPrevPhase(phase);
      setPrevWave(wave);

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }

    setPrevPhase(phase);
    setPrevWave(wave);
  }, [snapshot?.phase, snapshot?.waveNumber]);

  if (!visible || !summary) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '25%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      background: 'rgba(10, 10, 26, 0.92)',
      borderRadius: 10,
      border: '1px solid #44bbff',
      zIndex: 50,
      textAlign: 'center',
      animation: 'fadeIn 0.3s ease',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#44ff88', marginBottom: 6 }}>
        Wave {summary.waveNumber} Complete!
      </div>
      <div style={{ fontSize: 12, color: '#e0e0f0', marginBottom: 4 }}>
        Lives remaining: <span style={{ color: summary.sharedLives > 10 ? '#44ff88' : '#ff4466', fontWeight: 600 }}>{summary.sharedLives}</span>
      </div>
      {summary.lumberAwarded && (
        <div style={{ fontSize: 12, color: '#88ff44', fontWeight: 600 }}>
          +1 Lumber awarded!
        </div>
      )}
    </div>
  );
}
