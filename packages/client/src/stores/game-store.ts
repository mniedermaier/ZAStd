import { create } from 'zustand';
import type { GameStateSnapshot } from '@zastd/engine';

export interface GameEvent {
  type: string;
  [key: string]: any;
}

interface GameStore {
  snapshot: GameStateSnapshot | null;
  /** Transient game events forwarded from the game loop for VFX rendering. */
  pendingGameEvents: GameEvent[];
  setSnapshot: (s: GameStateSnapshot) => void;
  pushGameEvents: (events: GameEvent[]) => void;
  drainGameEvents: () => GameEvent[];
  clear: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  snapshot: null,
  pendingGameEvents: [],
  setSnapshot: (snapshot) => set({ snapshot }),
  pushGameEvents: (events) => set((s) => ({ pendingGameEvents: [...s.pendingGameEvents, ...events] })),
  drainGameEvents: () => {
    const events = get().pendingGameEvents;
    if (events.length > 0) set({ pendingGameEvents: [] });
    return events;
  },
  clear: () => set({ snapshot: null, pendingGameEvents: [] }),
}));
