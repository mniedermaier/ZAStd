import { GovernorDefinition } from './types';

export const COMMON_TOWERS = ['arrow', 'cannon', 'frost_trap'] as const;

export const GOVERNORS: Record<string, GovernorDefinition> = {
  fire: {
    name: 'Fire',
    element: 'fire',
    description: 'Masters of destruction. High burst damage.',
    color: '#FF4400',
    towerTypes: ['fire_arrow', 'inferno', 'meteor', 'volcano'],
    passiveBonus: '+5% damage to all towers',
  },
  ice: {
    name: 'Ice',
    element: 'ice',
    description: 'Control specialists. Slow and freeze enemies.',
    color: '#44BBFF',
    towerTypes: ['ice_shard', 'blizzard', 'glacier', 'avalanche'],
    passiveBonus: '+10% slow duration',
  },
  thunder: {
    name: 'Thunder',
    element: 'thunder',
    description: 'Chain lightning strikes multiple foes.',
    color: '#FFEE00',
    towerTypes: ['spark', 'lightning', 'storm', 'tempest'],
    passiveBonus: '+1 chain target',
  },
  poison: {
    name: 'Poison',
    element: 'poison',
    description: 'Damage over time and debuffs.',
    color: '#88FF00',
    towerTypes: ['venom', 'plague', 'miasma', 'pandemic'],
    passiveBonus: '+10% poison damage',
  },
  death: {
    name: 'Death',
    element: 'death',
    description: 'Execute low-health enemies and drain life.',
    color: '#AA44CC',
    towerTypes: ['soul_drain', 'necrosis', 'wraith', 'reaper'],
    passiveBonus: '+2% execute threshold',
  },
  nature: {
    name: 'Nature',
    element: 'nature',
    description: 'Entangle, root, and decay enemies.',
    color: '#22CC44',
    towerTypes: ['thorn', 'entangle', 'decay', 'world_tree'],
    passiveBonus: '+10% stun duration',
  },
  arcane: {
    name: 'Arcane',
    element: 'arcane',
    description: 'Pure magic damage bypasses armor.',
    color: '#CC44FF',
    towerTypes: ['arcane_bolt', 'mana_drain', 'rift', 'singularity'],
    passiveBonus: '+5% magic damage',
  },
  holy: {
    name: 'Holy',
    element: 'holy',
    description: 'Auras that buff nearby towers.',
    color: '#FFDD88',
    towerTypes: ['smite', 'aura_tower', 'divine', 'seraph'],
    passiveBonus: '+5% aura range',
  },
};

/** Static towerType → governor key lookup (avoids O(n) scan per call) */
export const TOWER_TO_GOVERNOR = new Map<string, string>();
for (const [key, gov] of Object.entries(GOVERNORS)) {
  for (const t of gov.towerTypes) {
    TOWER_TO_GOVERNOR.set(t, key);
  }
}

export const ULTIMATE_TOWERS = new Set(
  Object.values(GOVERNORS).map(g => g.towerTypes[3]),
);

export function getGovernor(element: string): GovernorDefinition | undefined {
  return GOVERNORS[element];
}

export function getAvailableTowers(element: string): string[] {
  const gov = GOVERNORS[element];
  if (!gov) return [...COMMON_TOWERS];
  return [...COMMON_TOWERS, ...gov.towerTypes];
}

export function getRegularTowers(element: string): string[] {
  const gov = GOVERNORS[element];
  if (!gov) return [...COMMON_TOWERS];
  return [...COMMON_TOWERS, ...gov.towerTypes.slice(0, 3)];
}

export function isUltimateTower(towerType: string): boolean {
  return ULTIMATE_TOWERS.has(towerType);
}
