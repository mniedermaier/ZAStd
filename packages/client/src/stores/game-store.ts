import { create } from 'zustand';
import type { GameStateSnapshot } from '@zastd/engine';

interface GameStore {
  snapshot: GameStateSnapshot | null;
  setSnapshot: (s: GameStateSnapshot) => void;
  clear: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clear: () => set({ snapshot: null }),
}));
