import { useState, useEffect, useRef, useCallback } from 'react';
import { TUTORIAL_HINTS } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';
import type { GameStateSnapshot } from '@zastd/engine';

const STORAGE_KEY = 'zastd-tutorial-complete';

const COMMON_TOWER_TYPES = new Set(['arrow', 'cannon', 'frost_trap']);

const TIER2_TOWERS = new Set([
  'inferno', 'blizzard', 'glacier', 'meteor',
  'lightning', 'plague', 'necrosis', 'entangle',
  'mana_drain', 'divine',
]);

export function isTutorialComplete(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function evaluateTrigger(
  trigger: string,
  snapshot: GameStateSnapshot,
  playerId: string,
  maxTowerCountRef: React.MutableRefObject<number>,
): boolean {
  const player = snapshot.players[playerId];
  if (!player) return false;

  const myTowers = Object.values(snapshot.towers).filter(t => t.ownerId === playerId);
  const towerCount = myTowers.length;

  // wave_N_complete: check phase directly — _completeWave() nulls currentWave,
  // so checking currentWave.completed is unreliable
  const waveMatch = trigger.match(/^wave_(\d+)_complete$/);
  if (waveMatch) {
    const targetWave = parseInt(waveMatch[1]);
    return snapshot.waveNumber >= targetWave && snapshot.phase !== 'wave_active';
  }

  switch (trigger) {
    case 'tower_placed':
      return towerCount >= 1;
    case 'wave_started':
      return snapshot.waveNumber >= 1;
    case 'tower_upgraded':
      return myTowers.some(t => t.level >= 2);
    case 'tower_sold': {
      if (towerCount < maxTowerCountRef.current) return true;
      maxTowerCountRef.current = Math.max(maxTowerCountRef.current, towerCount);
      return false;
    }
    case 'towers_3':
      return towerCount >= 3;
    case 'governor_tower_placed':
      return myTowers.some(t => !COMMON_TOWER_TYPES.has(t.towerType));
    case 'tech_bought':
      return Object.values(player.techUpgrades).some(v => v > 0);
    case 'targeting_changed':
      return myTowers.some(t => t.targetingMode && t.targetingMode !== 'first');
    case 'ability_used':
      return player.abilityCooldownRemaining > 0;
    case 'tier2_tower_placed':
      return myTowers.some(t => TIER2_TOWERS.has(t.towerType));
    case 'tutorial_complete':
      return true; // auto-advance after delay
    default:
      return false;
  }
}

interface TutorialOverlayProps {
  playerId: string;
}

export function TutorialOverlay({ playerId }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [showPhaseHeader, setShowPhaseHeader] = useState(false);
  const maxTowerCountRef = useRef(0);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshot = useGameStore((s) => s.snapshot);

  const advanceToStep = useCallback((nextStep: number) => {
    setCurrentStep(nextStep);
    if (nextStep < TUTORIAL_HINTS.length) {
      const nextHint = TUTORIAL_HINTS[nextStep];
      if (nextHint.phase && nextHint.phase !== lastPhase) {
        setLastPhase(nextHint.phase);
        setShowPhaseHeader(true);
        setTimeout(() => setShowPhaseHeader(false), 2000);
      }
    }
  }, [lastPhase]);

  useEffect(() => {
    if (!snapshot || dismissed) return;
    if (currentStep >= TUTORIAL_HINTS.length) return;

    const hint = TUTORIAL_HINTS[currentStep];

    // Special case: tutorial_complete has a 3s delay
    if (hint.trigger === 'tutorial_complete') {
      if (!completeTimerRef.current) {
        completeTimerRef.current = setTimeout(() => {
          localStorage.setItem(STORAGE_KEY, 'true');
          setDismissed(true);
        }, 3000);
      }
      return;
    }

    if (evaluateTrigger(hint.trigger, snapshot, playerId, maxTowerCountRef)) {
      advanceToStep(currentStep + 1);
    }
  }, [snapshot, currentStep, playerId, dismissed, advanceToStep]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  // Show initial phase header on mount
  useEffect(() => {
    const hint = TUTORIAL_HINTS[0];
    if (hint.phase) {
      setLastPhase(hint.phase);
      setShowPhaseHeader(true);
      setTimeout(() => setShowPhaseHeader(false), 2000);
    }
  }, []);

  const handleSkipTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }, []);

  const handleSkipStep = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    const nextStep = currentStep + 1;
    if (nextStep >= TUTORIAL_HINTS.length) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    } else {
      advanceToStep(nextStep);
    }
  }, [currentStep, advanceToStep]);

  if (dismissed || currentStep >= TUTORIAL_HINTS.length) return null;

  const hint = TUTORIAL_HINTS[currentStep];
  const progress = (currentStep / TUTORIAL_HINTS.length) * 100;

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      padding: '12px 20px 10px',
      background: 'rgba(10, 10, 26, 0.95)',
      border: '2px solid #44bbff',
      borderRadius: 8,
      color: '#e0e0f0',
      textAlign: 'center',
      width: 420,
      maxWidth: '90%',
      boxShadow: '0 0 20px rgba(68, 187, 255, 0.3)',
    }}>
      {/* Phase header */}
      {showPhaseHeader && hint.phase && (
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#44ff88',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 4,
        }}>
          — {hint.phase} —
        </div>
      )}

      {/* Step counter */}
      <div style={{ fontSize: 10, color: '#44bbff', marginBottom: 4 }}>
        Step {hint.step} of {TUTORIAL_HINTS.length}
        {hint.phase && !showPhaseHeader && (
          <span style={{ color: '#6688aa', marginLeft: 8 }}>{hint.phase}</span>
        )}
      </div>

      {/* Main instruction */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: hint.subtext ? 4 : 0 }}>
        {hint.text}
      </div>

      {/* Subtext */}
      {hint.subtext && (
        <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 2 }}>
          {hint.subtext}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        marginTop: 8,
        height: 3,
        background: 'rgba(68, 187, 255, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #44bbff, #44ff88)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={handleSkipStep}
          style={{
            padding: '3px 12px',
            fontSize: 10,
            color: '#44bbff',
            background: 'transparent',
            border: '1px solid #335577',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Skip Step
        </button>
        <button
          onClick={handleSkipTutorial}
          style={{
            padding: '3px 12px',
            fontSize: 10,
            color: '#8888aa',
            background: 'transparent',
            border: '1px solid #333366',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Skip Tutorial
        </button>
      </div>
    </div>
  );
}
