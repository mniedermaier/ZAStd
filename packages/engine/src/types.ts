// Damage types
export type DamageType = 'physical' | 'magic';

// Tower targeting modes
export type TargetingMode = 'first' | 'last' | 'closest' | 'strongest';

// Game phases
export enum GamePhase {
  Lobby = 'lobby',
  Playing = 'playing',
  WaveActive = 'wave_active',
  WaveComplete = 'wave_complete',
  GameOver = 'game_over',
  Victory = 'victory',
}

// Tower type enum
export enum TowerType {
  // Common
  Arrow = 'arrow',
  Cannon = 'cannon',
  FrostTrap = 'frost_trap',
  // Fire
  FireArrow = 'fire_arrow',
  Inferno = 'inferno',
  Meteor = 'meteor',
  Volcano = 'volcano',
  // Ice
  IceShard = 'ice_shard',
  Blizzard = 'blizzard',
  Glacier = 'glacier',
  Avalanche = 'avalanche',
  // Thunder
  Spark = 'spark',
  Lightning = 'lightning',
  Storm = 'storm',
  Tempest = 'tempest',
  // Poison
  Venom = 'venom',
  Plague = 'plague',
  Miasma = 'miasma',
  Pandemic = 'pandemic',
  // Death
  SoulDrain = 'soul_drain',
  Necrosis = 'necrosis',
  Wraith = 'wraith',
  Reaper = 'reaper',
  // Nature
  Thorn = 'thorn',
  Entangle = 'entangle',
  Decay = 'decay',
  WorldTree = 'world_tree',
  // Arcane
  ArcaneBolt = 'arcane_bolt',
  ManaDrain = 'mana_drain',
  Rift = 'rift',
  Singularity = 'singularity',
  // Holy
  Smite = 'smite',
  AuraTower = 'aura_tower',
  Divine = 'divine',
  Seraph = 'seraph',
}

// Enemy type enum
export enum EnemyType {
  Basic = 'basic',
  Fast = 'fast',
  Tank = 'tank',
  Swarm = 'swarm',
  Boss = 'boss',
  Armored = 'armored',
  MagicResist = 'magic_resist',
  Flying = 'flying',
  Healer = 'healer',
  Berserker = 'berserker',
  Splitter = 'splitter',
}

// Tower stats definition
export interface TowerStats {
  towerType: TowerType;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  damageType: DamageType;
  splashRadius: number;
  slowAmount: number;
  slowDuration: number;
  poisonDamage: number;
  poisonDuration: number;
  chainCount: number;
  stunDuration: number;
  executeThreshold: number;
  armorReduction: number;
  teleportDistance: number;
  auraRange: number;
  auraDamageBoost: number;
  auraSpeedBoost: number;
  maxLevel: number;
}

// Enemy stats definition
export interface EnemyStats {
  enemyType: EnemyType;
  maxHealth: number;
  speed: number;
  reward: number;
  damage: number;
  armor: number;
  magicResist: number;
  isFlying: boolean;
  healPerSecond: number;
  splitInto: string | null;
  splitCount: number;
}

// Serialized forms for network transfer
export interface TowerSnapshot {
  towerId: string;
  towerType: string;
  ownerId: string;
  x: number;
  y: number;
  level: number;
  lastFireTime: number;
  currentTarget: string | null;
  targetingMode?: string;
  activeSynergies: string[];
  stats: {
    cost: number;
    damage: number;
    damageType: string;
    range: number;
    fireRate: number;
    splashRadius: number;
    chainCount: number;
    stunDuration: number;
    executeThreshold: number;
    slowAmount: number;
    slowDuration: number;
    poisonDamage: number;
    poisonDuration: number;
    armorReduction: number;
    teleportDistance: number;
    auraRange: number;
    auraDamageBoost: number;
    auraSpeedBoost: number;
    auraDamageMult: number;
    auraFireRateMult: number;
  };
}

export interface EnemySnapshot {
  enemyId: string;
  enemyType: string;
  waveNumber: number;
  x: number;
  y: number;
  currentHealth: number;
  maxHealth: number;
  isAlive: boolean;
  isFlying: boolean;
  slowMultiplier: number;
  poisonDamage: number;
  stunned: boolean;
  // Host migration fields
  pathIndex: number;
  hitsTaken: number;
  slowEndTime: number;
  poisonEndTime: number;
  poisonLastTick: number;
  stunEndTime: number;
  armorDebuff: number;
  armorDebuffEndTime: number;
  stats: {
    speed: number;
    reward: number;
    damage: number;
    armor: number;
    magicResist: number;
  };
}

export interface ProjectileSnapshot {
  projectileId: string;
  towerId: string;
  targetId: string;
  x: number;
  y: number;
}

export interface PlayerSnapshot {
  playerId: string;
  name: string;
  slot: number;
  money: number;
  lumber: number;
  governor: string | null;
  techUpgrades: Record<string, number>;
  ready: boolean;
  connected: boolean;
  kills: number;
  towersPlaced: number;
  damageDealt: number;
  ultimateUnlocked: boolean;
  abilityCooldownRemaining: number;
  abilityDamageBuffMult: number;
  bonuses: {
    damageMult: number;
    rangeMult: number;
    interestRate: number;
    costReduction: number;
  };
}

export interface WaveSnapshot {
  waveNumber: number;
  started: boolean;
  completed: boolean;
  totalEnemies: number;
  spawned: number;
  properties: {
    name: string;
    tags: string[];
    mutators?: WaveMutatorType[];
  } | null;
}

export interface GameStateSnapshot {
  phase: string;
  waveNumber: number;
  sharedLives: number;
  nextWaveCountdown: number | null;
  manualStartCooldown: number | null;
  players: Record<string, PlayerSnapshot>;
  towers: Record<string, TowerSnapshot>;
  enemies: Record<string, EnemySnapshot>;
  projectiles: Record<string, ProjectileSnapshot>;
  currentWave: WaveSnapshot | null;
  settings: {
    mapSize: string;
    mapLayout: string;
    difficulty: string;
    moneySharing: boolean;
  };
  map: {
    width: number;
    height: number;
    path: number[][];
    pathVersion: number;
    pathCells: number[][];
    spawn: number[];
    end: number[];
    checkpoints: number[][];
  };
  timestamp: number;
}

// Ability definitions
export type AbilityTargetType = 'global' | 'point_aoe';

export interface AbilityDefinition {
  governor: string;
  name: string;
  targetType: AbilityTargetType;
  cooldown: number;
  radius: number; // for point_aoe; 0 for global
  damage: number;
  magicDamage: boolean;
  slowAmount: number;
  slowDuration: number;
  stunDuration: number;
  poisonDps: number;
  poisonDuration: number;
  executeThreshold: number;
  healLives: number;
  towerBuffMult: number;
  towerBuffDuration: number;
  description: string;
}

// Tech upgrade definition
export interface TechUpgrade {
  techId: string;
  name: string;
  lumberCost: number;
  effectType: 'damage' | 'range' | 'interest' | 'cost_reduction' | 'ultimate';
  effectValue: number;
  maxStacks: number;
  description: string;
}

// Governor definition
export interface GovernorDefinition {
  name: string;
  element: string;
  description: string;
  color: string;
  towerTypes: string[];
  passiveBonus: string;
}

// Wave mutators
export type WaveMutatorType = 'swift' | 'fortified' | 'thrifty' | 'frugal' | 'swarm' | 'regenerating' | 'shielded' | 'chaos';

export interface WaveMutatorDefinition {
  type: WaveMutatorType;
  name: string;
  description: string;
  color: string;
}

// Wave properties
export interface WaveProperties {
  name: string;
  tags: string[];
  mutators?: WaveMutatorType[];
}
