// Server Configuration
export const MAX_PLAYERS = 16;
export const TICK_RATE = 20;

// Player Starting Resources
export const STARTING_MONEY = 100;
export const STARTING_LIVES = 30;

// Wave Configuration
export const INITIAL_BUILD_TIME = 20.0;
export const AUTO_START_DELAY = 10.0;
export const MANUAL_START_COOLDOWN = 5.0;
export const VICTORY_WAVE = 40;

// Map Sizes
export const MAP_SIZES: Record<string, { width: number; height: number }> = {
  tiny: { width: 30, height: 20 },
  small: { width: 50, height: 30 },
  medium: { width: 80, height: 50 },
  large: { width: 120, height: 80 },
};

export const DEFAULT_MAP_WIDTH = 30;
export const DEFAULT_MAP_HEIGHT = 20;

// Difficulty & Map Validation
export const VALID_DIFFICULTIES = ['easy', 'normal', 'hard', 'extreme', 'endless'] as const;
export const VALID_MAP_SIZES = ['tiny', 'small', 'medium', 'large'] as const;

// Difficulty scaling: { healthMult, speedMult, incomeMult, startingMoneyMult }
export const DIFFICULTY_SCALING: Record<string, { healthMult: number; speedMult: number; incomeMult: number; startingMoneyMult: number }> = {
  easy:    { healthMult: 0.7,  speedMult: 0.9, incomeMult: 1.5, startingMoneyMult: 1.5 },
  normal:  { healthMult: 1.0,  speedMult: 1.0, incomeMult: 1.0, startingMoneyMult: 1.0 },
  hard:    { healthMult: 1.6,  speedMult: 1.15, incomeMult: 0.75, startingMoneyMult: 0.8 },
  extreme: { healthMult: 2.5,  speedMult: 1.3, incomeMult: 0.5, startingMoneyMult: 0.6 },
  endless: { healthMult: 1.0,  speedMult: 1.0, incomeMult: 1.0, startingMoneyMult: 1.0 },
};

// Projectile Constants
export const PROJECTILE_HIT_DISTANCE = 0.1;

// Tower Upgrade Constants
export const UPGRADE_COST_MULTIPLIER = 0.75;
export const UPGRADE_DAMAGE_BOOST = 0.20;
export const UPGRADE_RANGE_BOOST = 0.10;
export const UPGRADE_FIRE_RATE_BOOST = 0.06;
export const UPGRADE_SPLASH_BOOST = 0.06;
export const UPGRADE_SLOW_BOOST = 0.08;
export const UPGRADE_POISON_BOOST = 0.20;
export const UPGRADE_RANGE_SUPPORT_BOOST = 0.08;
export const UPGRADE_DAMAGE_SUPPORT_BOOST = 0.06;
export const SELL_REFUND_PERCENTAGE = 0.7;
export const MAX_TOWER_LEVEL = 4;

// Wave Income
export const WAVE_BASE_INCOME = 40;
export const WAVE_INCOME_PER_WAVE = 8;

// Enemy Spawning
export const DEFAULT_SPAWN_INTERVAL = 0.5;

// Wave Scaling
export const DIFFICULTY_MULTIPLIER_PER_WAVE = 0.18;
export const PLAYER_MULTIPLIER_SCALING = 0.60;

// Damage Types
export const DAMAGE_TYPE_PHYSICAL = 'physical' as const;
export const DAMAGE_TYPE_MAGIC = 'magic' as const;

// Economy
export const LUMBER_WAVE_INTERVAL = 5;
export const LUMBER_PER_AWARD = 1;
export const BASE_INTEREST_RATE = 0.01;
export const INTEREST_CAP_BASE = 100;
export const INTEREST_CAP_PER_WAVE = 10;

// Endless Mode
export const ENDLESS_BOSS_INTERVAL = 10;

// Elite Enemies
export const ELITE_WAVE_INTERVAL = 10;
export const ELITE_WAVE_OFFSET = 5;
export const ELITE_HP_MULT = 5;
export const ELITE_SPEED_MULT = 0.7;
export const ELITE_REWARD_MULT = 3;

// Elite Affix Parameters
export const DEFLECTOR_CHANCE = 0.4;
export const SHIELD_HP_PCT = 0.5;
export const SHIELD_REGEN_RATE = 0.05; // 5% maxHP per second
export const SHIELD_REGEN_DELAY = 3.0; // seconds after last damage
export const PHASE_CYCLE = 4.0; // seconds per cycle
export const PHASE_DURATION = 1.5; // invulnerable duration per cycle

export const ALL_ELITE_AFFIXES = ['deflector', 'shielded', 'juggernaut', 'phase_shifter'] as const;

export const ELITE_AFFIX_DEFINITIONS: Record<string, { name: string; description: string; color: string }> = {
  deflector:     { name: 'Deflector',     description: '40% chance to negate projectile damage',     color: '#44bbff' },
  shielded:      { name: 'Shielded',      description: 'Regenerating shield absorbs damage',         color: '#6688ff' },
  juggernaut:    { name: 'Juggernaut',    description: 'Immune to slow, stun, and knockback',        color: '#ff8844' },
  phase_shifter: { name: 'Phase Shifter', description: 'Periodically becomes invulnerable',          color: '#cc44ff' },
};

// Enemy Trait Constants
export const DODGE_CHANCE = 0.20;
export const DODGE_COOLDOWN = 2.0;
export const RALLY_RANGE = 3.0;
export const RALLY_SPEED_BUFF = 0.25;
export const BURROW_SKIP_CELLS = 8;
export const BURROW_COOLDOWN = 10.0;
export const MIRROR_REFLECT_PCT = 0.15;

// Zone Ability Definitions
export const ZONE_DEFINITIONS: Record<string, {
  radius: number; duration: number; damagePerTick: number;
  slowAmount: number; slowDuration: number; cooldown: number;
}> = {
  fire_lava: { radius: 3.5, duration: 8, damagePerTick: 25, slowAmount: 0, slowDuration: 0, cooldown: 90 },
  ice_frost: { radius: 4, duration: 10, damagePerTick: 0, slowAmount: 0.6, slowDuration: 2, cooldown: 75 },
};

// Challenge Modifiers
export const CHALLENGE_MODIFIERS: Record<string, { name: string; description: string; scoreMultiplier: number }> = {
  no_sell:      { name: 'No Sell',       description: "Can't sell towers",                scoreMultiplier: 1.5 },
  glass_cannon: { name: 'Glass Cannon',  description: 'Start with 10 lives instead of 30', scoreMultiplier: 1.3 },
  poverty:      { name: 'Poverty',       description: 'Start with 50 gold instead of 100', scoreMultiplier: 1.3 },
  speed_demon:  { name: 'Speed Demon',   description: 'Enemies move 30% faster',          scoreMultiplier: 1.4 },
  no_upgrades:  { name: 'No Upgrades',   description: "Can't upgrade towers",             scoreMultiplier: 1.5 },
};

// Creep Sending for Income
export interface CreepSendDefinition {
  type: string;
  cost: number;
  incomeBonus: number;
  unlockWave: number;
}

export const CREEP_SEND_DEFINITIONS: CreepSendDefinition[] = [
  { type: 'basic',     cost: 20,  incomeBonus: 8,  unlockWave: 1 },
  { type: 'fast',      cost: 30,  incomeBonus: 12, unlockWave: 3 },
  { type: 'tank',      cost: 60,  incomeBonus: 25, unlockWave: 5 },
  { type: 'armored',   cost: 80,  incomeBonus: 35, unlockWave: 8 },
  { type: 'flying',    cost: 100, incomeBonus: 45, unlockWave: 10 },
  { type: 'berserker', cost: 120, incomeBonus: 55, unlockWave: 15 },
];

// Tutorial
export const TUTORIAL_WAVES: [string, number][] = [
  ['basic', 5],           // Wave 1: Learn placement
  ['basic', 8],           // Wave 2: Upgrading & selling
  ['fast', 8],            // Wave 3: Fast enemies → Frost Trap
  ['basic', 10],          // Wave 4: Governor towers (Fire Arrow)
  ['tank', 4],            // Wave 5: Tanks + lumber award
  ['armored', 6],         // Wave 6: Armored (physical resist)
  ['magic_resist', 6],    // Wave 7: Magic resist
  ['flying', 8],          // Wave 8: Flying (ignore maze)
  ['healer', 4],          // Wave 9: Healers (regen)
  ['berserker', 6],       // Wave 10: Berserkers + lumber #2
  ['splitter', 5],        // Wave 11: Splitters
  ['boss', 1],            // Wave 12: Boss fight
];

export const TUTORIAL_HINTS: { step: number; text: string; trigger: string; subtext?: string; phase?: string }[] = [
  { step: 1, phase: 'Basics', text: 'Place an Arrow Tower on the grid', subtext: 'Press 1 or click Arrow (10g). Towers block the path to create a maze.', trigger: 'tower_placed' },
  { step: 2, text: 'Start the first wave', subtext: 'Press Space or click Send Wave. Enemies walk from green spawn to red exit.', trigger: 'wave_started' },
  { step: 3, text: 'Watch your towers attack! Wait for the wave to end.', subtext: 'Enemies killed give gold. If they reach the exit, you lose lives (30 total).', trigger: 'wave_1_complete' },
  { step: 4, text: 'Select your tower and press Q to upgrade it', subtext: 'Click a tower then press Q. Upgrades boost damage +20%, range +10%. Max level 4.', trigger: 'tower_upgraded' },
  { step: 5, text: 'Try selling a tower — select it and press E', subtext: 'Selling returns 70% of gold invested. Useful for rearranging your maze.', trigger: 'tower_sold' },
  { step: 6, text: 'Build 3+ towers to extend the maze path', subtext: 'Longer paths = more shots from your towers. The path must always remain open!', trigger: 'towers_3' },
  { step: 7, text: 'Send Wave 2 and see your maze in action', subtext: 'You earn gold per wave: 40 + 8×wave. Plus interest on savings each wave!', trigger: 'wave_2_complete' },
  { step: 8, text: 'Wave 3 brings Fast enemies — twice the speed!', subtext: 'Build a Frost Trap (press 3, 50g) to slow them down.', trigger: 'wave_3_complete' },
  { step: 9, phase: 'Governor Towers', text: 'You have the Fire Governor! Press 4 to build a Fire Arrow', subtext: 'Each governor has 4 unique towers. Fire Arrow (35g) deals magic damage.', trigger: 'governor_tower_placed' },
  { step: 10, text: 'Send Wave 4 — see magic damage in action', subtext: 'Common towers deal physical damage. Governor towers deal magic damage.', trigger: 'wave_4_complete' },
  { step: 11, phase: 'Economy', text: 'Wave 5: Tank enemies — very high HP, very slow', subtext: 'Focus fire with many towers. You earn Lumber every 5 waves for tech upgrades!', trigger: 'wave_5_complete' },
  { step: 12, text: 'You earned Lumber! Open Tech panel and buy an upgrade', subtext: 'Tech upgrades are permanent: +damage, +range, +interest, -cost, or unlock ultimate tower.', trigger: 'tech_bought' },
  { step: 13, phase: 'Damage Types', text: 'Wave 6: Armored enemies resist 50% physical damage!', subtext: 'Use Fire towers (magic damage) against them. Mix damage types!', trigger: 'wave_6_complete' },
  { step: 14, text: 'Wave 7: Magic Resist enemies resist 50% magic damage!', subtext: 'Use Arrow and Cannon (physical) against these. A good defense needs both!', trigger: 'wave_7_complete' },
  { step: 15, phase: 'Tower Control', text: 'Select a tower and change its targeting mode', subtext: 'Options: First, Last, Closest, Strongest, Weakest. Click targeting in the tower info panel.', trigger: 'targeting_changed' },
  { step: 16, phase: 'Special Enemies', text: 'Wave 8: Flying enemies ignore your maze!', subtext: 'They fly direct to exit. Place towers near their flight path.', trigger: 'wave_8_complete' },
  { step: 17, text: 'Wave 9: Healers regenerate HP! Kill them first.', subtext: 'High burst damage counters healing. Poison reduces healing by 50%.', trigger: 'wave_9_complete' },
  { step: 18, phase: 'Governor Ability', text: 'Use your Governor Ability! Click the ability button.', subtext: 'Fire: Meteor Strike — 300 magic damage in a large area. 75s cooldown.', trigger: 'ability_used' },
  { step: 19, text: 'Wave 10: Berserkers get faster with every hit!', subtext: 'Kill them quickly. High damage towers like Cannon and Inferno work best.', trigger: 'wave_10_complete' },
  { step: 20, phase: 'Advanced', text: 'Build an Inferno tower (press 5, 80g) — splash + stun!', subtext: 'Tier 2 governor towers have powerful effects: splash, chain, stun, poison, execute.', trigger: 'tier2_tower_placed' },
  { step: 21, text: 'Wave 11: Splitters break into 2 Basic enemies on death!', subtext: 'Splash damage towers handle splits well.', trigger: 'wave_11_complete' },
  { step: 22, phase: 'Boss Fight', text: 'BOSS WAVE! High HP, armor AND magic resist!', subtext: 'Use everything: abilities, upgrades, both damage types. Final test!', trigger: 'wave_12_complete' },
  { step: 23, text: "Congratulations! You've mastered the basics!", subtext: 'Real games: 40 waves, 8 governors, synergies, elite enemies, multiplayer. Try Solo mode!', trigger: 'tutorial_complete' },
];

// Vote timing
export const VOTE_TIMEOUT = 30.0;

// Aura caps
export const MAX_AURA_DAMAGE_MULT = 2.0;
export const MAX_AURA_SPEED_MULT = 1.5;

// Combat derived constants
export const CHAIN_INITIAL_MULT = 0.6;
export const CHAIN_DECAY_MULT = 0.7;
export const SPLASH_DAMAGE_MULT = 0.5;
export const CHAIN_RANGE = 4.0;
export const ARMOR_DEBUFF_DURATION = 5.0;
export const EXECUTE_THRESHOLD_CAP = 0.35;
export const TOWER_SELL_COOLDOWN = 3.0;

// Healer counterplay: poison reduces healing by this fraction
export const POISON_ANTI_HEAL = 0.5;

// Pathfinding — entry and exit on left; 4 corner waypoints
export const SPAWN_POINT: [number, number] = [0, 12];
export const END_POINT: [number, number] = [0, 38];

// Map layouts
export const VALID_MAP_LAYOUTS = ['classic', 'spiral', 'crossroads'] as const;

// Classic: 4 corner waypoints, spawn/end on left side
export const MAP_WAYPOINTS: Record<string, [number, number][]> = {
  tiny:   [[3, 2],  [26, 2],  [26, 17], [3, 17]],
  small:  [[4, 3],  [45, 3],  [45, 26], [4, 26]],
  medium: [[6, 6],  [73, 6],  [73, 43], [6, 43]],
  large:  [[8, 8],  [111, 8], [111, 71], [8, 71]],
};

export const MAP_SPAWN_END: Record<string, { spawn: [number, number]; end: [number, number] }> = {
  tiny:   { spawn: [0, 5],  end: [0, 14] },
  small:  { spawn: [0, 7],  end: [0, 22] },
  medium: { spawn: [0, 12], end: [0, 38] },
  large:  { spawn: [0, 16], end: [0, 64] },
};

// Spiral: path spirals from outer edge to center
export const SPIRAL_WAYPOINTS: Record<string, [number, number][]> = {
  tiny:   [[3, 2], [26, 2], [26, 17], [6, 17], [6, 6], [20, 6], [20, 13]],
  small:  [[4, 3], [45, 3], [45, 26], [8, 26], [8, 8], [38, 8], [38, 20], [15, 20]],
  medium: [[6, 6], [73, 6], [73, 43], [12, 43], [12, 14], [60, 14], [60, 36], [22, 36], [22, 22], [50, 22]],
  large:  [[8, 8], [111, 8], [111, 71], [16, 71], [16, 18], [100, 18], [100, 62], [26, 62], [26, 28], [88, 28], [88, 52], [36, 52]],
};

export const SPIRAL_SPAWN_END: Record<string, { spawn: [number, number]; end: [number, number] }> = {
  tiny:   { spawn: [0, 2],   end: [15, 10] },
  small:  { spawn: [0, 3],   end: [25, 15] },
  medium: { spawn: [0, 6],   end: [40, 25] },
  large:  { spawn: [0, 8],   end: [60, 40] },
};

// Crossroads: two entry points, paths cross in the middle
export const CROSSROADS_WAYPOINTS: Record<string, [number, number][]> = {
  tiny:   [[14, 2], [14, 17]],
  small:  [[22, 3], [22, 26]],
  medium: [[38, 6], [38, 43]],
  large:  [[56, 8], [56, 71]],
};

export const CROSSROADS_SPAWN_END: Record<string, { spawn: [number, number]; end: [number, number] }> = {
  tiny:   { spawn: [0, 10],  end: [29, 10] },
  small:  { spawn: [0, 15],  end: [49, 15] },
  medium: { spawn: [0, 25],  end: [79, 25] },
  large:  { spawn: [0, 40],  end: [119, 40] },
};

// Wave Mutators
export const MUTATOR_START_WAVE = 5;
export const MAX_MUTATORS_PER_WAVE = 2;

export const MUTATOR_DEFINITIONS: Record<string, { name: string; description: string; color: string }> = {
  swift:        { name: 'Swift',        description: 'Enemies move 25% faster',    color: '#ffaa22' },
  fortified:    { name: 'Fortified',    description: 'Enemies have 30% more HP',   color: '#886644' },
  thrifty:      { name: 'Thrifty',      description: 'Tower costs +20%',           color: '#ffdd44' },
  frugal:       { name: 'Frugal',       description: 'Kill rewards -25%',          color: '#888888' },
  swarm:        { name: 'Swarm',        description: 'Double enemies, half HP',    color: '#ff6688' },
  regenerating: { name: 'Regenerating', description: 'All enemies heal 2 HP/sec',  color: '#44ff88' },
  shielded:     { name: 'Shielded',     description: 'Enemies start with 15% armor', color: '#6688aa' },
  chaos:        { name: 'Chaos',        description: 'Random enemy types',         color: '#cc44ff' },
};

export const ALL_MUTATOR_TYPES = Object.keys(MUTATOR_DEFINITIONS) as string[];

// Active Abilities (one per governor)
export const ABILITY_DEFINITIONS: Record<string, {
  governor: string;
  name: string;
  targetType: 'global' | 'point_aoe';
  cooldown: number;
  radius: number;
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
}> = {
  fire: {
    governor: 'fire', name: 'Meteor Strike', targetType: 'point_aoe', cooldown: 75, radius: 4,
    damage: 300, magicDamage: true, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: '300 magic damage in radius 4',
  },
  ice: {
    governor: 'ice', name: 'Blizzard', targetType: 'point_aoe', cooldown: 60, radius: 5,
    damage: 0, magicDamage: true, slowAmount: 0.7, slowDuration: 4, stunDuration: 1.5,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: '70% slow + 1.5s stun in radius 5 for 4s',
  },
  thunder: {
    governor: 'thunder', name: 'Chain Storm', targetType: 'global', cooldown: 70, radius: 0,
    damage: 200, magicDamage: true, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: '200 magic damage to 10 random enemies',
  },
  poison: {
    governor: 'poison', name: 'Plague Cloud', targetType: 'point_aoe', cooldown: 65, radius: 5,
    damage: 0, magicDamage: true, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 30, poisonDuration: 8, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: '30 DPS poison for 8s in radius 5',
  },
  death: {
    governor: 'death', name: 'Reap', targetType: 'global', cooldown: 90, radius: 0,
    damage: 0, magicDamage: true, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0.15, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: 'Instant kill all enemies ≤15% HP',
  },
  nature: {
    governor: 'nature', name: 'Overgrowth', targetType: 'global', cooldown: 80, radius: 0,
    damage: 0, magicDamage: false, slowAmount: 0, slowDuration: 0, stunDuration: 3,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: 'Stun all enemies for 3s',
  },
  arcane: {
    governor: 'arcane', name: 'Mana Bomb', targetType: 'point_aoe', cooldown: 70, radius: 4,
    damage: 400, magicDamage: true, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 0, towerBuffMult: 0, towerBuffDuration: 0,
    description: '400 magic damage in radius 4',
  },
  holy: {
    governor: 'holy', name: 'Divine Intervention', targetType: 'global', cooldown: 90, radius: 0,
    damage: 0, magicDamage: false, slowAmount: 0, slowDuration: 0, stunDuration: 0,
    poisonDps: 0, poisonDuration: 0, executeThreshold: 0, healLives: 5, towerBuffMult: 0.2, towerBuffDuration: 10,
    description: 'Heal 5 lives + 20% tower damage buff for 10s',
  },
};

export function getAbilityForGovernor(governor: string) {
  return ABILITY_DEFINITIONS[governor] ?? null;
}

// ===== TOWER SYNERGIES =====

export interface SynergyDefinition {
  id: string;
  name: string;
  governors: [string, string];
  description: string;
  // Bonus effects (applied as multipliers)
  splashRadiusMult: number;
  damageMult: number;  // extra damage to slowed targets, or flat magic damage
  executeThresholdBonus: number;
  armorDebuffBonus: number;
  stunDurationMult: number;
  magicDamageMult: number;
}

export const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  {
    id: 'wildfire', name: 'Wildfire', governors: ['fire', 'nature'],
    description: '+15% splash radius',
    splashRadiusMult: 1.15, damageMult: 1.0, executeThresholdBonus: 0, armorDebuffBonus: 0, stunDurationMult: 1.0, magicDamageMult: 1.0,
  },
  {
    id: 'shatter', name: 'Shatter', governors: ['ice', 'thunder'],
    description: '+20% damage to slowed enemies',
    splashRadiusMult: 1.0, damageMult: 1.2, executeThresholdBonus: 0, armorDebuffBonus: 0, stunDurationMult: 1.0, magicDamageMult: 1.0,
  },
  {
    id: 'blight', name: 'Blight', governors: ['poison', 'death'],
    description: '+5% execute threshold',
    splashRadiusMult: 1.0, damageMult: 1.0, executeThresholdBonus: 0.05, armorDebuffBonus: 0, stunDurationMult: 1.0, magicDamageMult: 1.0,
  },
  {
    id: 'radiance', name: 'Radiance', governors: ['arcane', 'holy'],
    description: '+15% magic damage',
    splashRadiusMult: 1.0, damageMult: 1.0, executeThresholdBonus: 0, armorDebuffBonus: 0, stunDurationMult: 1.0, magicDamageMult: 1.15,
  },
  {
    id: 'thermal_shock', name: 'Thermal Shock', governors: ['fire', 'ice'],
    description: '+10% armor debuff',
    splashRadiusMult: 1.0, damageMult: 1.0, executeThresholdBonus: 0, armorDebuffBonus: 0.10, stunDurationMult: 1.0, magicDamageMult: 1.0,
  },
  {
    id: 'stormroot', name: 'Stormroot', governors: ['thunder', 'nature'],
    description: '+15% stun duration',
    splashRadiusMult: 1.0, damageMult: 1.0, executeThresholdBonus: 0, armorDebuffBonus: 0, stunDurationMult: 1.15, magicDamageMult: 1.0,
  },
];

/** Static lookup: synergy id → SynergyDefinition (avoids .find() per projectile) */
export const SYNERGY_BY_ID = new Map<string, SynergyDefinition>();
for (const syn of SYNERGY_DEFINITIONS) {
  SYNERGY_BY_ID.set(syn.id, syn);
}

/** Static lookup: creep type → CreepSendDefinition (avoids .find() per kill) */
export const CREEP_SEND_BY_TYPE = new Map<string, CreepSendDefinition>();
for (const def of CREEP_SEND_DEFINITIONS) {
  CREEP_SEND_BY_TYPE.set(def.type, def);
}
