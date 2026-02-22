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
export { SeededRNG, dateSeed, getTodayDateString, generateDailyChallenge, generateWeeklyChallenge, getCurrentWeekString } from './daily-challenge';
export type { DailyChallengeConfig, WeeklyChallengeConfig } from './daily-challenge';
export { ReplayRecorder } from './replay';
export type { ReplayData, ReplayFrame } from './replay';
export type { CreepSendDefinition } from './constants';
export { CREEP_SEND_DEFINITIONS, TUTORIAL_WAVES, TUTORIAL_HINTS, VOTE_TIMEOUT } from './constants';
