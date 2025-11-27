import { create } from 'zustand';
import type { TowerType } from '@zastd/engine';

interface UIStore {
  // Tower placement
  selectedTowerType: TowerType | null;
  placementMode: boolean;
  selectedTowerId: string | null;

  // Ability targeting
  abilityTargeting: boolean;

  // Actions
  startPlacement: (towerType: TowerType) => void;
  cancelPlacement: () => void;
  selectTower: (towerId: string | null) => void;
  startAbilityTargeting: () => void;
  cancelAbilityTargeting: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedTowerType: null,
  placementMode: false,
  selectedTowerId: null,
  abilityTargeting: false,

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
}));
