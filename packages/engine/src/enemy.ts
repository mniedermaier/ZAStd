import { EnemyType, EnemyStats, EnemySnapshot, WaveProperties, DamageType } from './types';
import {
  DIFFICULTY_MULTIPLIER_PER_WAVE, PLAYER_MULTIPLIER_SCALING,
  DEFAULT_SPAWN_INTERVAL, DAMAGE_TYPE_PHYSICAL, DAMAGE_TYPE_MAGIC,
  POISON_ANTI_HEAL, ARMOR_DEBUFF_DURATION,
  MUTATOR_START_WAVE, MAX_MUTATORS_PER_WAVE, ALL_MUTATOR_TYPES,
  ENDLESS_BOSS_INTERVAL,
} from './constants';
import type { WaveMutatorType } from './types';

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyStats> = {
  [EnemyType.Basic]: { enemyType: EnemyType.Basic, maxHealth: 40, speed: 2.0, reward: 5, damage: 1, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Fast]: { enemyType: EnemyType.Fast, maxHealth: 25, speed: 4.0, reward: 6, damage: 1, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Tank]: { enemyType: EnemyType.Tank, maxHealth: 150, speed: 1.0, reward: 12, damage: 2, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Swarm]: { enemyType: EnemyType.Swarm, maxHealth: 15, speed: 2.5, reward: 3, damage: 1, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Boss]: { enemyType: EnemyType.Boss, maxHealth: 1200, speed: 0.8, reward: 50, damage: 8, armor: 0.25, magicResist: 0.25, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Armored]: { enemyType: EnemyType.Armored, maxHealth: 100, speed: 1.5, reward: 10, damage: 1, armor: 0.50, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.MagicResist]: { enemyType: EnemyType.MagicResist, maxHealth: 80, speed: 2.0, reward: 10, damage: 1, armor: 0, magicResist: 0.50, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Flying]: { enemyType: EnemyType.Flying, maxHealth: 50, speed: 3.0, reward: 8, damage: 1, armor: 0, magicResist: 0, isFlying: true, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Healer]: { enemyType: EnemyType.Healer, maxHealth: 60, speed: 1.8, reward: 12, damage: 1, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 5.0, splitInto: null, splitCount: 0 },
  [EnemyType.Berserker]: { enemyType: EnemyType.Berserker, maxHealth: 70, speed: 2.0, reward: 9, damage: 2, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: null, splitCount: 0 },
  [EnemyType.Splitter]: { enemyType: EnemyType.Splitter, maxHealth: 80, speed: 1.8, reward: 7, damage: 1, armor: 0, magicResist: 0, isFlying: false, healPerSecond: 0, splitInto: 'basic', splitCount: 2 },
};

export class EnemyInstance {
  enemyId: string;
  enemyType: EnemyType;
  stats: EnemyStats;
  x: number;
  y: number;
  waveNumber: number;
  pathIndex = 0;
  pathVersion = 0;
  currentHealth: number;
  isAlive = true;
  isFlying: boolean;

  // Status effects
  slowMultiplier = 1.0;
  slowEndTime = 0;
  poisonDamage = 0;
  poisonEndTime = 0;
  poisonLastTick = 0;
  stunEndTime = 0;
  armorDebuff = 0;
  armorDebuffEndTime = 0;
  hitsTaken = 0;
  isSentCreep = false;
  sentByPlayerId: string | null = null;

  constructor(
    enemyId: string,
    enemyType: EnemyType,
    stats: EnemyStats,
    x: number,
    y: number,
    waveNumber = 1,
    pathVersion = 0,
  ) {
    this.enemyId = enemyId;
    this.enemyType = enemyType;
    this.stats = stats;
    this.x = x;
    this.y = y;
    this.waveNumber = waveNumber;
    this.pathVersion = pathVersion;
    this.currentHealth = stats.maxHealth;
    this.isFlying = stats.isFlying;
  }

  serialize(currentTime?: number): EnemySnapshot {
    const now = currentTime ?? Date.now() / 1000;
    return {
      enemyId: this.enemyId,
      enemyType: this.enemyType,
      waveNumber: this.waveNumber,
      x: this.x,
      y: this.y,
      currentHealth: this.currentHealth,
      maxHealth: this.stats.maxHealth,
      isAlive: this.isAlive,
      isFlying: this.isFlying,
      slowMultiplier: this.slowMultiplier,
      poisonDamage: this.poisonDamage,
      stunned: now < this.stunEndTime,
      pathIndex: this.pathIndex,
      hitsTaken: this.hitsTaken,
      slowEndTime: this.slowEndTime,
      poisonEndTime: this.poisonEndTime,
      poisonLastTick: this.poisonLastTick,
      stunEndTime: this.stunEndTime,
      armorDebuff: this.armorDebuff,
      armorDebuffEndTime: this.armorDebuffEndTime,
      isSentCreep: this.isSentCreep || undefined,
      sentByPlayerId: this.sentByPlayerId,
      stats: {
        speed: this.stats.speed,
        reward: this.stats.reward,
        damage: this.stats.damage,
        armor: this.stats.armor,
        magicResist: this.stats.magicResist,
      },
    };
  }

  takeDamage(damage: number, damageType: DamageType = DAMAGE_TYPE_PHYSICAL): boolean {
    const effectiveArmor = Math.max(0, this.stats.armor - this.armorDebuff);
    if (damageType === DAMAGE_TYPE_PHYSICAL) {
      damage = Math.floor(damage * (1.0 - effectiveArmor));
    } else if (damageType === DAMAGE_TYPE_MAGIC) {
      damage = Math.floor(damage * (1.0 - this.stats.magicResist));
    }
    this.currentHealth -= Math.max(1, damage);
    this.hitsTaken++;
    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.isAlive = false;
      return true;
    }
    return false;
  }

  checkExecute(threshold: number): boolean {
    if (threshold <= 0) return false;
    return (this.currentHealth / this.stats.maxHealth) <= threshold;
  }

  applySlow(slowAmount: number, duration: number, currentTime: number): void {
    const newSlow = 1.0 - slowAmount;
    if (newSlow < this.slowMultiplier || currentTime > this.slowEndTime) {
      this.slowMultiplier = newSlow;
      this.slowEndTime = currentTime + duration;
    }
  }

  updateSlow(currentTime: number): void {
    if (currentTime > this.slowEndTime) {
      this.slowMultiplier = 1.0;
    }
  }

  applyStun(duration: number, currentTime: number): void {
    const newEnd = currentTime + duration;
    if (newEnd > this.stunEndTime) {
      this.stunEndTime = newEnd;
    }
  }

  isStunned(currentTime: number): boolean {
    return currentTime < this.stunEndTime;
  }

  applyArmorDebuff(reduction: number, currentTime: number): void {
    if (reduction >= this.armorDebuff || currentTime >= this.armorDebuffEndTime) {
      this.armorDebuff = reduction;
      this.armorDebuffEndTime = currentTime + ARMOR_DEBUFF_DURATION;
    }
  }

  updateArmorDebuff(currentTime: number): void {
    if (this.armorDebuff > 0 && currentTime >= this.armorDebuffEndTime) {
      this.armorDebuff = 0;
    }
  }

  applyPoison(poisonDps: number, duration: number, currentTime: number): void {
    if (poisonDps > this.poisonDamage || currentTime > this.poisonEndTime) {
      this.poisonDamage = poisonDps;
      this.poisonEndTime = currentTime + duration;
      this.poisonLastTick = currentTime;
    }
  }

  updatePoison(currentTime: number): number {
    if (currentTime > this.poisonEndTime) {
      this.poisonDamage = 0;
      return 0;
    }
    if (currentTime - this.poisonLastTick >= 1.0) {
      this.poisonLastTick = currentTime;
      return this.poisonDamage;
    }
    return 0;
  }

  updateHeal(deltaTime: number): void {
    if (this.stats.healPerSecond > 0 && this.isAlive) {
      // Poison reduces healing effectiveness
      const antiHeal = this.poisonDamage > 0 ? (1.0 - POISON_ANTI_HEAL) : 1.0;
      const heal = this.stats.healPerSecond * deltaTime * antiHeal;
      this.currentHealth = Math.min(this.stats.maxHealth, Math.floor(this.currentHealth + heal));
    }
  }

  getEffectiveSpeed(): number {
    let base = this.stats.speed * this.slowMultiplier;
    if (this.enemyType === EnemyType.Berserker && this.hitsTaken > 0) {
      base *= Math.min(2.0, 1.0 + this.hitsTaken * 0.05);
    }
    return base;
  }
}

// Wave class
export class Wave {
  waveNumber: number;
  enemies: [EnemyType, number][];
  spawnInterval: number;
  started = false;
  completed = false;
  spawnIndex = 0;
  lastSpawnTime = 0;
  properties: WaveProperties | null;

  constructor(waveNumber: number, enemies: [EnemyType, number][], properties: WaveProperties | null = null) {
    this.waveNumber = waveNumber;
    this.enemies = enemies;
    this.spawnInterval = DEFAULT_SPAWN_INTERVAL;
    this.properties = properties;
  }

  serialize() {
    return {
      waveNumber: this.waveNumber,
      started: this.started,
      completed: this.completed,
      totalEnemies: this.enemies.reduce((sum, [, count]) => sum + count, 0),
      spawned: this.spawnIndex,
      properties: this.properties,
    };
  }
}

export function generateWave(waveNumber: number, playerCount: number, options?: { forcedMutators?: string[] }): Wave {
  const diffMult = 1 + waveNumber * DIFFICULTY_MULTIPLIER_PER_WAVE;
  const playerMult = 1 + Math.max(0, playerCount - 1) * PLAYER_MULTIPLIER_SCALING;
  const totalMult = diffMult * playerMult;

  const enemies: [EnemyType, number][] = [];
  const props: WaveProperties = { name: `Wave ${waveNumber}`, tags: [] };

  // Boss waves: 10, 20, 30, 40 — brutal multi-type encounters
  if (waveNumber === 10) {
    enemies.push([EnemyType.Boss, 2]);
    enemies.push([EnemyType.Tank, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(3 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(2 * totalMult)]);
    props.name = 'The Warden';
    props.tags = ['boss', 'tank', 'armored', 'healer'];
  } else if (waveNumber === 20) {
    enemies.push([EnemyType.Boss, 3]);
    enemies.push([EnemyType.Tank, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(3 * totalMult)]);
    enemies.push([EnemyType.Flying, Math.floor(5 * totalMult)]);
    props.name = 'The Siege';
    props.tags = ['boss', 'tank', 'armored', 'magic_resist', 'flying'];
  } else if (waveNumber === 30) {
    enemies.push([EnemyType.Boss, 5]);
    enemies.push([EnemyType.Tank, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Flying, Math.floor(6 * totalMult)]);
    props.name = 'Apocalypse';
    props.tags = ['boss', 'tank', 'armored', 'berserker', 'flying'];
  } else if (waveNumber === 40) {
    enemies.push([EnemyType.Boss, 8]);
    enemies.push([EnemyType.Tank, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Flying, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Splitter, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Swarm, Math.floor(15 * totalMult)]);
    props.name = 'Final Stand';
    props.tags = ['boss', 'final'];
  } else if (waveNumber % ENDLESS_BOSS_INTERVAL === 0) {
    // Boss waves: 10, 20, 30, 40, and every 10 waves in endless
    const bossCount = Math.max(1, Math.floor(waveNumber / 10));
    enemies.push([EnemyType.Boss, bossCount]);
    enemies.push([EnemyType.Tank, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(4 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(3 * totalMult)]);
    if (waveNumber > 40) {
      enemies.push([EnemyType.Flying, Math.floor(6 * totalMult)]);
      enemies.push([EnemyType.Berserker, Math.floor(5 * totalMult)]);
      enemies.push([EnemyType.Splitter, Math.floor(4 * totalMult)]);
    }
    if (waveNumber >= 70) {
      enemies.push([EnemyType.MagicResist, Math.floor(6 * totalMult)]);
      enemies.push([EnemyType.Swarm, Math.floor(10 * totalMult)]);
    }
    const bossNames: Record<number, string> = {
      50: 'The Eternal', 60: 'Doom Herald', 70: 'Abyssal Lord',
      80: 'World Breaker', 90: 'Infinity', 100: 'The Omega',
    };
    props.name = bossNames[waveNumber] || `Boss Wave ${waveNumber}`;
    props.tags = ['boss'];
  } else if (waveNumber === 1) {
    enemies.push([EnemyType.Basic, Math.max(8, Math.floor(8 * playerMult))]);
    props.tags = ['basic'];
  } else if (waveNumber === 2) {
    enemies.push([EnemyType.Basic, Math.floor(10 * totalMult)]);
    props.tags = ['basic'];
  } else if (waveNumber === 3) {
    enemies.push([EnemyType.Fast, Math.floor(12 * totalMult)]);
    props.name = 'Speed Rush';
    props.tags = ['fast'];
  } else if (waveNumber === 4) {
    enemies.push([EnemyType.Basic, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Swarm, Math.floor(10 * totalMult)]);
    props.tags = ['swarm'];
  } else if (waveNumber === 5) {
    enemies.push([EnemyType.Armored, Math.floor(8 * totalMult)]);
    props.name = 'Iron Wall';
    props.tags = ['armored'];
  } else if (waveNumber === 6) {
    enemies.push([EnemyType.MagicResist, Math.floor(8 * totalMult)]);
    props.name = 'Arcane Shield';
    props.tags = ['magic_resist'];
  } else if (waveNumber === 7) {
    enemies.push([EnemyType.Flying, Math.floor(10 * totalMult)]);
    props.name = 'Air Raid';
    props.tags = ['flying'];
  } else if (waveNumber === 8) {
    enemies.push([EnemyType.Healer, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Basic, Math.floor(8 * totalMult)]);
    props.name = 'Regeneration';
    props.tags = ['healer'];
  } else if (waveNumber === 9) {
    enemies.push([EnemyType.Berserker, Math.floor(8 * totalMult)]);
    props.name = 'Berserker Rage';
    props.tags = ['berserker'];
  } else if (waveNumber === 11) {
    enemies.push([EnemyType.Splitter, Math.floor(6 * totalMult)]);
    props.name = 'Division';
    props.tags = ['splitter'];
  } else if (waveNumber === 12) {
    enemies.push([EnemyType.Armored, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Fast, Math.floor(8 * totalMult)]);
    props.tags = ['armored', 'fast'];
  } else if (waveNumber === 13) {
    enemies.push([EnemyType.Flying, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(5 * totalMult)]);
    props.name = 'Sky Guard';
    props.tags = ['flying', 'magic_resist'];
  } else if (waveNumber === 14) {
    enemies.push([EnemyType.Tank, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(4 * totalMult)]);
    props.tags = ['tank', 'healer'];
  } else if (waveNumber === 15) {
    enemies.push([EnemyType.Armored, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(8 * totalMult)]);
    props.name = 'Dual Shields';
    props.tags = ['armored', 'magic_resist'];
  } else if (waveNumber === 16) {
    enemies.push([EnemyType.Swarm, Math.floor(25 * totalMult)]);
    props.name = 'Swarm Tide';
    props.tags = ['swarm'];
  } else if (waveNumber === 17) {
    enemies.push([EnemyType.Berserker, Math.floor(10 * totalMult)]);
    enemies.push([EnemyType.Fast, Math.floor(8 * totalMult)]);
    props.tags = ['berserker', 'fast'];
  } else if (waveNumber === 18) {
    enemies.push([EnemyType.Flying, Math.floor(12 * totalMult)]);
    props.name = 'Aerial Assault';
    props.tags = ['flying'];
  } else if (waveNumber === 19) {
    enemies.push([EnemyType.Splitter, Math.floor(5 * totalMult)]);
    enemies.push([EnemyType.Basic, Math.floor(6 * totalMult)]);
    props.name = 'Splitting Tide';
    props.tags = ['splitter'];
  } else if (waveNumber === 21) {
    enemies.push([EnemyType.Armored, Math.floor(10 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(6 * totalMult)]);
    props.name = 'Fortified Healers';
    props.tags = ['armored', 'healer'];
  } else if (waveNumber === 22) {
    enemies.push([EnemyType.Flying, Math.floor(10 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(8 * totalMult)]);
    props.tags = ['flying', 'berserker'];
  } else if (waveNumber === 23) {
    enemies.push([EnemyType.Splitter, Math.floor(10 * totalMult)]);
    props.name = 'Endless Division';
    props.tags = ['splitter'];
  } else if (waveNumber === 24) {
    enemies.push([EnemyType.MagicResist, Math.floor(10 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(10 * totalMult)]);
    props.name = 'Full Armor';
    props.tags = ['armored', 'magic_resist'];
  } else if (waveNumber === 25) {
    enemies.push([EnemyType.Tank, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(6 * totalMult)]);
    props.name = 'Juggernaut';
    props.tags = ['tank', 'healer', 'armored'];
  } else if (waveNumber === 26) {
    enemies.push([EnemyType.Swarm, Math.floor(30 * totalMult)]);
    enemies.push([EnemyType.Fast, Math.floor(15 * totalMult)]);
    props.name = 'Flood';
    props.tags = ['swarm', 'fast'];
  } else if (waveNumber === 27) {
    enemies.push([EnemyType.Flying, Math.floor(15 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(8 * totalMult)]);
    props.name = 'Sky Fortress';
    props.tags = ['flying', 'magic_resist'];
  } else if (waveNumber === 28) {
    enemies.push([EnemyType.Berserker, Math.floor(12 * totalMult)]);
    enemies.push([EnemyType.Splitter, Math.floor(8 * totalMult)]);
    props.tags = ['berserker', 'splitter'];
  } else if (waveNumber === 29) {
    enemies.push([EnemyType.Tank, Math.floor(6 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.MagicResist, Math.floor(8 * totalMult)]);
    props.name = 'Wall of Steel';
    props.tags = ['tank', 'armored', 'magic_resist'];
  } else if (waveNumber === 31) {
    enemies.push([EnemyType.Flying, Math.floor(15 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(8 * totalMult)]);
    props.name = 'Healing Wings';
    props.tags = ['flying', 'healer'];
  } else if (waveNumber === 32) {
    enemies.push([EnemyType.Splitter, Math.floor(12 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(10 * totalMult)]);
    props.tags = ['splitter', 'berserker'];
  } else if (waveNumber === 33) {
    enemies.push([EnemyType.Swarm, Math.floor(40 * totalMult)]);
    props.name = 'Locust Plague';
    props.tags = ['swarm'];
  } else if (waveNumber === 34) {
    enemies.push([EnemyType.Armored, Math.floor(12 * totalMult)]);
    enemies.push([EnemyType.Tank, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(6 * totalMult)]);
    props.name = 'Fortress';
    props.tags = ['armored', 'tank', 'healer'];
  } else if (waveNumber === 35) {
    enemies.push([EnemyType.Flying, Math.floor(15 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(12 * totalMult)]);
    enemies.push([EnemyType.Splitter, Math.floor(8 * totalMult)]);
    props.name = 'Chaos';
    props.tags = ['flying', 'berserker', 'splitter'];
  } else if (waveNumber === 36) {
    enemies.push([EnemyType.MagicResist, Math.floor(15 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(15 * totalMult)]);
    props.name = 'Impervious';
    props.tags = ['magic_resist', 'armored'];
  } else if (waveNumber === 37) {
    enemies.push([EnemyType.Tank, Math.floor(10 * totalMult)]);
    enemies.push([EnemyType.Healer, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Berserker, Math.floor(10 * totalMult)]);
    props.name = 'Onslaught';
    props.tags = ['tank', 'healer', 'berserker'];
  } else if (waveNumber === 38) {
    enemies.push([EnemyType.Flying, Math.floor(20 * totalMult)]);
    enemies.push([EnemyType.Swarm, Math.floor(30 * totalMult)]);
    props.name = 'Air & Ground';
    props.tags = ['flying', 'swarm'];
  } else if (waveNumber === 39) {
    enemies.push([EnemyType.Splitter, Math.floor(15 * totalMult)]);
    enemies.push([EnemyType.Tank, Math.floor(8 * totalMult)]);
    enemies.push([EnemyType.Armored, Math.floor(10 * totalMult)]);
    props.name = 'The Gauntlet';
    props.tags = ['splitter', 'tank', 'armored'];
  } else {
    // Generic scaling — enhanced variety for endless waves
    const base = Math.floor(8 * totalMult);
    enemies.push([EnemyType.Basic, base]);
    if (waveNumber > 5) enemies.push([EnemyType.Fast, Math.floor(4 * totalMult)]);
    if (waveNumber > 10) enemies.push([EnemyType.Armored, Math.floor(3 * totalMult)]);
    if (waveNumber > 40) {
      enemies.push([EnemyType.Splitter, Math.floor(3 * totalMult)]);
      enemies.push([EnemyType.Tank, Math.floor(2 * totalMult)]);
      enemies.push([EnemyType.Flying, Math.floor(3 * totalMult)]);
    }
    if (waveNumber > 50) {
      enemies.push([EnemyType.Berserker, Math.floor(4 * totalMult)]);
      enemies.push([EnemyType.Healer, Math.floor(2 * totalMult)]);
    }
    if (waveNumber > 60) {
      enemies.push([EnemyType.MagicResist, Math.floor(3 * totalMult)]);
      enemies.push([EnemyType.Swarm, Math.floor(8 * totalMult)]);
    }
    // Named endless milestone waves
    const milestoneNames: Record<number, string> = {
      41: 'Beyond the Veil', 42: 'Relentless', 45: 'Undying Horde',
      55: 'Infernal March', 65: 'Eternal Night', 75: 'The Abyss',
      85: 'Shattered Realm', 95: 'Endgame',
    };
    if (milestoneNames[waveNumber]) {
      props.name = milestoneNames[waveNumber];
    }
    props.tags = ['mixed'];
  }

  // Roll mutators for non-boss waves >= MUTATOR_START_WAVE
  const isBoss = waveNumber % 10 === 0;
  if (!isBoss && waveNumber >= MUTATOR_START_WAVE) {
    let chosen: WaveMutatorType[] | null = null;

    // Use forced mutators if provided (daily challenge), otherwise random roll
    if (options?.forcedMutators) {
      chosen = options.forcedMutators as WaveMutatorType[];
    } else {
      const mutatorCount = Math.floor(Math.random() * (MAX_MUTATORS_PER_WAVE + 1)); // 0, 1, or 2
      if (mutatorCount > 0) {
        const available = [...ALL_MUTATOR_TYPES];
        chosen = [];
        for (let i = 0; i < mutatorCount && available.length > 0; i++) {
          const idx = Math.floor(Math.random() * available.length);
          chosen.push(available[idx] as WaveMutatorType);
          available.splice(idx, 1);
        }
      }
    }

    if (chosen && chosen.length > 0) {
      props.mutators = chosen;

      // Apply swarm mutator: double enemies, half HP (mark in properties only,
      // actual HP halving applied at spawn time in game-loop)
      if (chosen.includes('swarm')) {
        for (let i = 0; i < enemies.length; i++) {
          enemies[i] = [enemies[i][0], enemies[i][1] * 2];
        }
      }

      // Apply chaos mutator: randomize enemy types
      if (chosen.includes('chaos')) {
        const allTypes = [EnemyType.Basic, EnemyType.Fast, EnemyType.Tank, EnemyType.Swarm,
          EnemyType.Armored, EnemyType.MagicResist, EnemyType.Berserker, EnemyType.Splitter];
        for (let i = 0; i < enemies.length; i++) {
          enemies[i] = [allTypes[Math.floor(Math.random() * allTypes.length)], enemies[i][1]];
        }
      }
    }
  }

  return new Wave(waveNumber, enemies, props);
}

export function createEnemy(
  enemyType: EnemyType,
  enemyId: string,
  spawnX: number,
  spawnY: number,
  waveNumber = 1,
  pathVersion = 0,
  difficultyHealthMult = 1.0,
  difficultySpeedMult = 1.0,
): EnemyInstance {
  const baseStats = ENEMY_DEFINITIONS[enemyType];
  const healthScale = 1 + (waveNumber - 1) * DIFFICULTY_MULTIPLIER_PER_WAVE;
  const scaledHealth = Math.floor(baseStats.maxHealth * healthScale * difficultyHealthMult);
  const scaledSpeed = baseStats.speed * difficultySpeedMult;
  const scaledStats: EnemyStats = {
    ...baseStats,
    maxHealth: scaledHealth,
    speed: scaledSpeed,
  };
  return new EnemyInstance(enemyId, enemyType, scaledStats, spawnX, spawnY, waveNumber, pathVersion);
}

export function getWavePreview(waveNumber: number, playerCount: number) {
  const wave = generateWave(waveNumber, playerCount);
  return {
    waveNumber,
    totalEnemies: wave.enemies.reduce((sum, [, count]) => sum + count, 0),
    enemyTypes: wave.enemies.map(([et, c]) => ({ type: et, count: c })),
    properties: wave.properties,
  };
}
