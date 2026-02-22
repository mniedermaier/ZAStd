import { create } from 'zustand';
import type { TowerType } from '@zastd/engine';

export interface PingData {
  id: string;
  x: number;
  y: number;
  playerName: string;
  pingType: 'alert' | 'here' | 'help';
  time: number;
}

interface UIStore {
  // Tower placement
  selectedTowerType: TowerType | null;
  placementMode: boolean;
  selectedTowerId: string | null;

  // Ability targeting
  abilityTargeting: boolean;

  // Pings
  pings: PingData[];

  // Minimap pan target
  panTarget: { x: number; y: number } | null;

  // Actions
  startPlacement: (towerType: TowerType) => void;
  cancelPlacement: () => void;
  selectTower: (towerId: string | null) => void;
  startAbilityTargeting: () => void;
  cancelAbilityTargeting: () => void;
  addPing: (ping: PingData) => void;
  clearExpiredPings: () => void;
  setPanTarget: (x: number, y: number) => void;
  clearPanTarget: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedTowerType: null,
  placementMode: false,
  selectedTowerId: null,
  abilityTargeting: false,
  pings: [],
  panTarget: null,

  startPlacement: (towerType) => set({
    selectedTowerType: towerType,
    placementMode: true,
    selectedTowerId: null,
    abilityTargeting: false,
  }),
  cancelPlacement: () => set({
    selectedTowerType: null,
    placementMode: false,
  }),
  selectTower: (towerId) => set({
    selectedTowerId: towerId,
    placementMode: false,
    selectedTowerType: null,
    abilityTargeting: false,
  }),
  startAbilityTargeting: () => set({
    abilityTargeting: true,
    placementMode: false,
    selectedTowerType: null,
    selectedTowerId: null,
  }),
  cancelAbilityTargeting: () => set({
    abilityTargeting: false,
  }),
  addPing: (ping) => set((s) => ({
    pings: [...s.pings, ping].slice(-20), // keep last 20
  })),
  clearExpiredPings: () => set((s) => ({
    pings: s.pings.filter((p) => Date.now() - p.time < 4000),
  })),
  setPanTarget: (x, y) => set({ panTarget: { x, y } }),
  clearPanTarget: () => set({ panTarget: null }),
}));
