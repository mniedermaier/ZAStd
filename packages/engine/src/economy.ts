import { TechUpgrade } from './types';
import { LUMBER_WAVE_INTERVAL, LUMBER_PER_AWARD, INTEREST_CAP_BASE, INTEREST_CAP_PER_WAVE } from './constants';

export const TECH_UPGRADES: Record<string, TechUpgrade> = {
  forge_weapons: {
    techId: 'forge_weapons',
    name: 'Forge Weapons',
    lumberCost: 1,
    effectType: 'damage',
    effectValue: 0.10,
    maxStacks: 3,
    description: '+10% damage to all towers',
  },
  eagle_eye: {
    techId: 'eagle_eye',
    name: 'Eagle Eye',
    lumberCost: 1,
    effectType: 'range',
    effectValue: 0.10,
    maxStacks: 3,
    description: '+10% range to all towers',
  },
  banking: {
    techId: 'banking',
    name: 'Banking',
    lumberCost: 1,
    effectType: 'interest',
    effectValue: 0.01,
    maxStacks: 3,
    description: '+1% interest per wave',
  },
  efficient_building: {
    techId: 'efficient_building',
    name: 'Efficient Building',
    lumberCost: 1,
    effectType: 'cost_reduction',
    effectValue: 0.10,
    maxStacks: 2,
    description: '-10% tower build cost',
  },
  ultimate_power: {
    techId: 'ultimate_power',
    name: 'Ultimate Power',
    lumberCost: 3,
    effectType: 'ultimate',
    effectValue: 1.0,
    maxStacks: 1,
    description: "Unlock your governor's ultimate tower",
  },
};

export function calculateInterest(money: number, interestRate: number, waveNumber = 0): number {
  const cap = INTEREST_CAP_BASE + waveNumber * INTEREST_CAP_PER_WAVE;
  return Math.min(Math.floor(money * interestRate), cap);
}

export function shouldAwardLumber(waveNumber: number): boolean {
  return waveNumber > 0 && waveNumber % LUMBER_WAVE_INTERVAL === 0;
}

export function getLumberAward(): number {
  return LUMBER_PER_AWARD;
}
