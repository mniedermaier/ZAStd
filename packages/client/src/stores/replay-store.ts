import { create } from 'zustand';
import type { ReplayData } from '@zastd/engine';

const STORAGE_KEY = 'zastd-replays';
const MAX_REPLAYS = 5;
const MAX_REPLAY_SIZE = 500_000; // 500KB

function loadReplays(): ReplayData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReplayData[];
  } catch {
    return [];
  }
}

function saveReplaysToStorage(replays: ReplayData[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replays));
  } catch { /* quota exceeded */ }
}

interface ReplayStore {
  replays: ReplayData[];
  currentReplay: ReplayData | null;
  currentFrameIndex: number;

  saveReplay: (data: ReplayData) => void;
  loadReplay: (index: number) => void;
  deleteReplay: (index: number) => void;
  seekToFrame: (index: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  closeReplay: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  replays: loadReplays(),
  currentReplay: null,
  currentFrameIndex: 0,

  saveReplay: (data) => {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_REPLAY_SIZE) return;
    set((s) => {
      const replays = [data, ...s.replays].slice(0, MAX_REPLAYS);
      saveReplaysToStorage(replays);
      return { replays };
    });
  },

  loadReplay: (index) => {
    const replay = get().replays[index];
    if (replay) set({ currentReplay: replay, currentFrameIndex: 0 });
  },

  deleteReplay: (index) => {
    set((s) => {
      const replays = s.replays.filter((_, i) => i !== index);
      saveReplaysToStorage(replays);
      return { replays };
    });
  },

  seekToFrame: (index) => {
    const replay = get().currentReplay;
    if (replay) {
      set({ currentFrameIndex: Math.max(0, Math.min(index, replay.frames.length - 1)) });
    }
  },

  nextFrame: () => {
    const { currentReplay, currentFrameIndex } = get();
    if (currentReplay && currentFrameIndex < currentReplay.frames.length - 1) {
      set({ currentFrameIndex: currentFrameIndex + 1 });
    }
  },

  prevFrame: () => {
    const { currentFrameIndex } = get();
    if (currentFrameIndex > 0) {
      set({ currentFrameIndex: currentFrameIndex - 1 });
    }
  },

  closeReplay: () => set({ currentReplay: null, currentFrameIndex: 0 }),
}));
