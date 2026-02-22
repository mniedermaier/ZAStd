import { useEffect } from 'react';
import { useReplayStore } from '../../stores/replay-store';
import { useGameStore } from '../../stores/game-store';

interface ReplayViewerProps {
  onClose: () => void;
}

export function ReplayViewer({ onClose }: ReplayViewerProps) {
  const { currentReplay, currentFrameIndex, nextFrame, prevFrame, seekToFrame, closeReplay } = useReplayStore();
  const setSnapshot = useGameStore((s) => s.setSnapshot);

  // Feed the current frame's snapshot into the game store
  useEffect(() => {
    if (currentReplay && currentReplay.frames[currentFrameIndex]) {
      setSnapshot(currentReplay.frames[currentFrameIndex].snapshot);
    }
  }, [currentReplay, currentFrameIndex, setSnapshot]);

  if (!currentReplay) return null;

  const frame = currentReplay.frames[currentFrameIndex];
  const totalFrames = currentReplay.frames.length;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 100,
      padding: '8px 16px',
      background: 'rgba(10, 10, 26, 0.95)',
      borderTop: '1px solid #333366',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button
        onClick={() => { closeReplay(); onClose(); }}
        style={{
          padding: '4px 10px', fontSize: 11, color: '#ff4466',
          background: 'transparent', border: '1px solid #ff4466',
          borderRadius: 4, cursor: 'pointer',
        }}
      >
        Exit
      </button>

      <button
        onClick={prevFrame}
        disabled={currentFrameIndex <= 0}
        style={{
          padding: '4px 8px', fontSize: 13, cursor: currentFrameIndex > 0 ? 'pointer' : 'not-allowed',
          color: currentFrameIndex > 0 ? '#e0e0f0' : '#555577',
          background: 'rgba(26, 26, 58, 0.9)', border: '1px solid #333366', borderRadius: 4,
        }}
      >
        {'<'}
      </button>

      <div style={{
        flex: 1, position: 'relative', height: 20,
        background: 'rgba(26, 26, 58, 0.9)', borderRadius: 4, overflow: 'hidden',
        cursor: 'pointer',
      }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          seekToFrame(Math.round(ratio * (totalFrames - 1)));
        }}
      >
        {/* Wave markers */}
        {currentReplay.frames.map((f, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / Math.max(1, totalFrames - 1)) * 100}%`,
              top: 0, bottom: 0, width: 2,
              background: i === currentFrameIndex ? '#44bbff' : '#333366',
            }}
          />
        ))}
        {/* Progress */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${(currentFrameIndex / Math.max(1, totalFrames - 1)) * 100}%`,
          background: 'rgba(68, 187, 255, 0.2)',
        }} />
      </div>

      <button
        onClick={nextFrame}
        disabled={currentFrameIndex >= totalFrames - 1}
        style={{
          padding: '4px 8px', fontSize: 13,
          cursor: currentFrameIndex < totalFrames - 1 ? 'pointer' : 'not-allowed',
          color: currentFrameIndex < totalFrames - 1 ? '#e0e0f0' : '#555577',
          background: 'rgba(26, 26, 58, 0.9)', border: '1px solid #333366', borderRadius: 4,
        }}
      >
        {'>'}
      </button>

      <span style={{ fontSize: 12, color: '#e0e0f0', minWidth: 80, textAlign: 'center' }}>
        Wave {frame?.waveNumber ?? 0} / {totalFrames}
      </span>

      <span style={{
        fontSize: 11,
        color: currentReplay.result === 'victory' ? '#44ff88' : '#ff4466',
        fontWeight: 600,
      }}>
        {currentReplay.result === 'victory' ? 'Victory' : 'Defeat'}
      </span>
    </div>
  );
}
