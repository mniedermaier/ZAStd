import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/game-store';
import { create } from 'zustand';

interface LogEntry {
  id: number;
  text: string;
  color: string;
  timestamp: number;
}

interface EventLogState {
  entries: LogEntry[];
  nextId: number;
  addEntry: (text: string, color: string) => void;
  clear: () => void;
}

const MAX_ENTRIES = 30;

export const useEventLogStore = create<EventLogState>((set) => ({
  entries: [],
  nextId: 1,
  addEntry: (text, color) => set((s) => ({
    entries: [...s.entries.slice(-(MAX_ENTRIES - 1)), { id: s.nextId, text, color, timestamp: Date.now() }],
    nextId: s.nextId + 1,
  })),
  clear: () => set({ entries: [], nextId: 1 }),
}));

export function EventLog() {
  const entries = useEventLogStore((s) => s.entries);
  const addEntry = useEventLogStore((s) => s.addEntry);
  const snapshot = useGameStore((s) => s.snapshot);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevWaveRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>('');
  const prevLivesRef = useRef<number>(40);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  // Detect game events from snapshot changes
  useEffect(() => {
    if (!snapshot) return;

    // Wave start
    if (snapshot.waveNumber > prevWaveRef.current && snapshot.phase === 'wave_active') {
      addEntry(`Wave ${snapshot.waveNumber} started`, '#44bbff');
    }
    prevWaveRef.current = snapshot.waveNumber;

    // Wave complete
    if (snapshot.phase === 'wave_complete' && prevPhaseRef.current === 'wave_active') {
      addEntry(`Wave ${snapshot.waveNumber} complete!`, '#88ff44');
    }

    // Lives lost
    if (snapshot.sharedLives < prevLivesRef.current) {
      const lost = prevLivesRef.current - snapshot.sharedLives;
      addEntry(`Lost ${lost} ${lost === 1 ? 'life' : 'lives'}! (${snapshot.sharedLives} remaining)`, '#ff4466');
    }
    prevLivesRef.current = snapshot.sharedLives;

    // Game over / Victory
    if (snapshot.phase === 'game_over' && prevPhaseRef.current !== 'game_over') {
      addEntry('Game Over! All lives lost.', '#ff4466');
    }
    if (snapshot.phase === 'victory' && prevPhaseRef.current !== 'victory') {
      addEntry('Victory! All 40 waves defeated!', '#ffdd44');
    }

    prevPhaseRef.current = snapshot.phase;
  }, [snapshot, addEntry]);

  // Filter to last 15 seconds of entries
  const now = Date.now();
  const recentEntries = entries.filter((e) => now - e.timestamp < 15000);

  if (recentEntries.length === 0) return null;

  return (
    <div className="event-log" style={{
      width: 180,
      maxHeight: 120,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      <div ref={scrollRef} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {recentEntries.map((entry) => {
          const age = now - entry.timestamp;
          const opacity = age > 12000 ? Math.max(0, 1 - (age - 12000) / 3000) : 1;
          return (
            <div key={entry.id} style={{
              fontSize: 10,
              padding: '2px 6px',
              background: 'rgba(10, 10, 26, 0.75)',
              borderRadius: 4,
              color: entry.color,
              opacity,
              borderLeft: `2px solid ${entry.color}`,
            }}>
              {entry.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
