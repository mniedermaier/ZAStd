import { useState, useEffect } from 'react';
import { TUTORIAL_HINTS } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';

const STORAGE_KEY = 'zastd-tutorial-complete';

export function isTutorialComplete(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

interface TutorialOverlayProps {
  playerId: string;
}

export function TutorialOverlay({ playerId }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const snapshot = useGameStore((s) => s.snapshot);

  useEffect(() => {
    if (!snapshot || dismissed) return;
    const player = snapshot.players[playerId];
    if (!player) return;

    const towerCount = Object.values(snapshot.towers).filter(t => t.ownerId === playerId).length;

    // Advance based on triggers
    if (currentStep === 0 && towerCount >= 1) setCurrentStep(1);
    else if (currentStep === 1 && snapshot.waveNumber >= 1) setCurrentStep(2);
    else if (currentStep === 2) {
      const hasUpgraded = Object.values(snapshot.towers).some(t => t.ownerId === playerId && t.level >= 2);
      if (hasUpgraded) setCurrentStep(3);
    }
    else if (currentStep === 3 && towerCount >= 3) setCurrentStep(4);
    else if (currentStep === 4 && snapshot.waveNumber >= 5) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    }
  }, [snapshot, currentStep, playerId, dismissed]);

  if (dismissed || currentStep >= TUTORIAL_HINTS.length) return null;

  const hint = TUTORIAL_HINTS[currentStep];

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      padding: '10px 20px',
      background: 'rgba(10, 10, 26, 0.95)',
      border: '2px solid #44bbff',
      borderRadius: 8,
      color: '#e0e0f0',
      fontSize: 14,
      fontWeight: 600,
      textAlign: 'center',
      maxWidth: '80%',
      boxShadow: '0 0 20px rgba(68, 187, 255, 0.3)',
    }}>
      <div style={{ fontSize: 10, color: '#44bbff', marginBottom: 4 }}>
        Step {hint.step} of {TUTORIAL_HINTS.length}
      </div>
      <div>{hint.text}</div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          marginTop: 8, padding: '3px 12px', fontSize: 10,
          color: '#8888aa', background: 'transparent', border: '1px solid #333366',
          borderRadius: 4, cursor: 'pointer',
        }}
      >
        Skip Tutorial
      </button>
    </div>
  );
}
