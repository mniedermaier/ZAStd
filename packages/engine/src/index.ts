// Types & enums
export * from './types';
export * from './constants';
export type { WaveMutatorType, WaveMutatorDefinition } from './types';
export type { SynergyDefinition } from './constants';

// Game modules
export { TOWER_DEFINITIONS, TowerInstance, getUpgradeCost, createProjectile } from './tower';
export type { Projectile } from './tower';
export { ENEMY_DEFINITIONS, EnemyInstance, Wave, generateWave, createEnemy, getWavePreview } from './enemy';
export { Path, OccupancyGrid, calculateDistance, moveTowards, updateEnemyPosition, getFlyingPath } from './pathfinding';
export { Player } from './player';
export { TECH_UPGRADES, calculateInterest, shouldAwardLumber, getLumberAward } from './economy';
export { GOVERNORS, COMMON_TOWERS, ULTIMATE_TOWERS, getGovernor, getAvailableTowers, getRegularTowers, isUltimateTower } from './governor';
export { GameState } from './game-state';
export { GameLoop } from './game-loop';
export type { GameEvent } from './game-loop';
export { gameStateFromSnapshot } from './serialization';
