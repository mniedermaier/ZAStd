import {
  TowerType, TowerStats, TowerSnapshot, DamageType, TargetingMode,
} from './types';
import {
  DAMAGE_TYPE_PHYSICAL, DAMAGE_TYPE_MAGIC, MAX_TOWER_LEVEL,
  UPGRADE_COST_MULTIPLIER, UPGRADE_DAMAGE_BOOST, UPGRADE_RANGE_BOOST,
  UPGRADE_FIRE_RATE_BOOST, UPGRADE_SPLASH_BOOST, UPGRADE_SLOW_BOOST,
  UPGRADE_POISON_BOOST, UPGRADE_RANGE_SUPPORT_BOOST, UPGRADE_DAMAGE_SUPPORT_BOOST,
  SELL_REFUND_PERCENTAGE, EXECUTE_THRESHOLD_CAP,
} from './constants';

function stats(
  towerType: TowerType,
  cost: number,
  damage: number,
  range: number,
  fireRate: number,
  projectileSpeed: number,
  damageType: DamageType = DAMAGE_TYPE_PHYSICAL,
  overrides: Partial<TowerStats> = {},
): TowerStats {
  return {
    towerType,
    cost,
    damage,
    range,
    fireRate,
    projectileSpeed,
    damageType,
    splashRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    poisonDamage: 0,
    poisonDuration: 0,
    chainCount: 0,
    stunDuration: 0,
    executeThreshold: 0,
    armorReduction: 0,
    teleportDistance: 0,
    auraRange: 0,
    auraDamageBoost: 0,
    auraSpeedBoost: 0,
    maxLevel: MAX_TOWER_LEVEL,
    ...overrides,
  };
}

export const TOWER_DEFINITIONS: Record<TowerType, TowerStats> = {
  // Common
  [TowerType.Arrow]: stats(TowerType.Arrow, 10, 12, 3.5, 1.2, 8.0),
  [TowerType.Cannon]: stats(TowerType.Cannon, 25, 30, 3.0, 0.6, 6.0, DAMAGE_TYPE_PHYSICAL, { splashRadius: 1.5 }),
  [TowerType.FrostTrap]: stats(TowerType.FrostTrap, 50, 8, 3.5, 1.0, 10.0, DAMAGE_TYPE_MAGIC, { slowAmount: 0.4, slowDuration: 2.0 }),

  // Fire
  [TowerType.FireArrow]: stats(TowerType.FireArrow, 35, 18, 4.0, 1.5, 10.0),
  [TowerType.Inferno]: stats(TowerType.Inferno, 80, 35, 3.0, 0.8, 7.0, DAMAGE_TYPE_MAGIC, { splashRadius: 2.0 }),
  [TowerType.Meteor]: stats(TowerType.Meteor, 160, 80, 5.0, 0.3, 4.0, DAMAGE_TYPE_MAGIC, { splashRadius: 2.5, stunDuration: 0.5 }),
  [TowerType.Volcano]: stats(TowerType.Volcano, 300, 120, 4.0, 0.4, 5.0, DAMAGE_TYPE_MAGIC, { splashRadius: 3.0, stunDuration: 0.8 }),

  // Ice
  [TowerType.IceShard]: stats(TowerType.IceShard, 35, 14, 4.0, 1.2, 9.0, DAMAGE_TYPE_MAGIC, { slowAmount: 0.3, slowDuration: 2.0 }),
  [TowerType.Blizzard]: stats(TowerType.Blizzard, 90, 20, 4.5, 0.7, 6.0, DAMAGE_TYPE_MAGIC, { splashRadius: 2.0, slowAmount: 0.5, slowDuration: 3.0 }),
  [TowerType.Glacier]: stats(TowerType.Glacier, 180, 10, 3.5, 0.5, 8.0, DAMAGE_TYPE_MAGIC, { splashRadius: 2.5, stunDuration: 1.5 }),
  [TowerType.Avalanche]: stats(TowerType.Avalanche, 320, 50, 5.0, 0.4, 5.0, DAMAGE_TYPE_MAGIC, { splashRadius: 3.5, slowAmount: 0.6, slowDuration: 4.0, stunDuration: 1.0 }),

  // Thunder
  [TowerType.Spark]: stats(TowerType.Spark, 40, 16, 4.0, 1.3, 15.0, DAMAGE_TYPE_MAGIC, { chainCount: 1 }),
  [TowerType.Lightning]: stats(TowerType.Lightning, 100, 28, 5.0, 0.9, 20.0, DAMAGE_TYPE_MAGIC, { chainCount: 3 }),
  [TowerType.Storm]: stats(TowerType.Storm, 200, 40, 5.5, 0.7, 20.0, DAMAGE_TYPE_MAGIC, { chainCount: 5 }),
  [TowerType.Tempest]: stats(TowerType.Tempest, 350, 60, 6.0, 0.8, 25.0, DAMAGE_TYPE_MAGIC, { chainCount: 8, stunDuration: 0.3 }),

  // Poison
  [TowerType.Venom]: stats(TowerType.Venom, 35, 8, 4.0, 1.0, 7.0, DAMAGE_TYPE_MAGIC, { poisonDamage: 12, poisonDuration: 3.0 }),
  [TowerType.Plague]: stats(TowerType.Plague, 80, 10, 4.5, 0.8, 6.0, DAMAGE_TYPE_MAGIC, { poisonDamage: 20, poisonDuration: 4.0, splashRadius: 1.5 }),
  [TowerType.Miasma]: stats(TowerType.Miasma, 180, 5, 5.0, 0.6, 5.0, DAMAGE_TYPE_MAGIC, { poisonDamage: 35, poisonDuration: 5.0, splashRadius: 2.0, armorReduction: 0.2 }),
  [TowerType.Pandemic]: stats(TowerType.Pandemic, 320, 15, 5.5, 0.5, 5.0, DAMAGE_TYPE_MAGIC, { poisonDamage: 50, poisonDuration: 6.0, splashRadius: 3.0, armorReduction: 0.3 }),

  // Death
  [TowerType.SoulDrain]: stats(TowerType.SoulDrain, 40, 15, 3.5, 1.0, 8.0, DAMAGE_TYPE_MAGIC, { executeThreshold: 0.05 }),
  [TowerType.Necrosis]: stats(TowerType.Necrosis, 90, 25, 4.0, 0.8, 7.0, DAMAGE_TYPE_MAGIC, { executeThreshold: 0.10, armorReduction: 0.15 }),
  [TowerType.Wraith]: stats(TowerType.Wraith, 190, 40, 4.5, 0.6, 9.0, DAMAGE_TYPE_MAGIC, { executeThreshold: 0.15 }),
  [TowerType.Reaper]: stats(TowerType.Reaper, 350, 60, 5.0, 0.5, 10.0, DAMAGE_TYPE_MAGIC, { executeThreshold: 0.20 }),

  // Nature
  [TowerType.Thorn]: stats(TowerType.Thorn, 30, 14, 3.5, 1.2, 8.0, DAMAGE_TYPE_PHYSICAL, { stunDuration: 0.3 }),
  [TowerType.Entangle]: stats(TowerType.Entangle, 80, 10, 4.0, 0.7, 7.0, DAMAGE_TYPE_PHYSICAL, { stunDuration: 1.5, slowAmount: 0.4, slowDuration: 3.0 }),
  [TowerType.Decay]: stats(TowerType.Decay, 170, 20, 4.5, 0.6, 6.0, DAMAGE_TYPE_MAGIC, { poisonDamage: 15, poisonDuration: 4.0, armorReduction: 0.25 }),
  [TowerType.WorldTree]: stats(TowerType.WorldTree, 320, 30, 6.0, 0.5, 6.0, DAMAGE_TYPE_MAGIC, { stunDuration: 2.0, splashRadius: 2.5, auraRange: 5.0, auraDamageBoost: 0.10, auraSpeedBoost: 0.10 }),

  // Arcane
  [TowerType.ArcaneBolt]: stats(TowerType.ArcaneBolt, 35, 18, 4.5, 1.1, 12.0, DAMAGE_TYPE_MAGIC),
  [TowerType.ManaDrain]: stats(TowerType.ManaDrain, 90, 25, 5.0, 0.9, 10.0, DAMAGE_TYPE_MAGIC, { armorReduction: 0.20 }),
  [TowerType.Rift]: stats(TowerType.Rift, 190, 45, 4.0, 0.5, 8.0, DAMAGE_TYPE_MAGIC, { teleportDistance: 5.0 }),
  [TowerType.Singularity]: stats(TowerType.Singularity, 350, 70, 5.0, 0.4, 6.0, DAMAGE_TYPE_MAGIC, { splashRadius: 3.0, teleportDistance: 8.0 }),

  // Holy
  [TowerType.Smite]: stats(TowerType.Smite, 35, 16, 4.0, 1.0, 15.0, DAMAGE_TYPE_MAGIC),
  [TowerType.AuraTower]: stats(TowerType.AuraTower, 100, 12, 3.0, 0.5, 10.0, DAMAGE_TYPE_MAGIC, { auraRange: 5.0, auraDamageBoost: 0.15, auraSpeedBoost: 0.10 }),
  [TowerType.Divine]: stats(TowerType.Divine, 180, 35, 5.0, 0.8, 12.0, DAMAGE_TYPE_MAGIC, { splashRadius: 1.5 }),
  [TowerType.Seraph]: stats(TowerType.Seraph, 350, 50, 6.0, 0.7, 15.0, DAMAGE_TYPE_MAGIC, { splashRadius: 2.0, auraRange: 6.0, auraDamageBoost: 0.20, auraSpeedBoost: 0.15 }),
};

export function getUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.floor(baseCost * UPGRADE_COST_MULTIPLIER * currentLevel);
}

function cloneStats(base: TowerStats): TowerStats {
  return { ...base };
}

export class TowerInstance {
  towerId: string;
  towerType: TowerType;
  ownerId: string;
  x: number;
  y: number;
  stats: TowerStats;
  lastFireTime = 0;
  currentTarget: string | null = null;
  level = 1;
  auraDamageMult = 1.0;
  auraFireRateMult = 1.0;
  targetingMode: TargetingMode = 'first';
  placedAt = 0;
  activeSynergies: string[] = [];

  constructor(towerId: string, towerType: TowerType, ownerId: string, x: number, y: number, costMult = 1.0) {
    this.towerId = towerId;
    this.towerType = towerType;
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    const base = TOWER_DEFINITIONS[towerType];
    this.stats = cloneStats(base);
    this.stats.cost = Math.floor(base.cost * costMult);
  }

  serialize(): TowerSnapshot {
    return {
      towerId: this.towerId,
      towerType: this.towerType,
      ownerId: this.ownerId,
      x: this.x,
      y: this.y,
      level: this.level,
      lastFireTime: this.lastFireTime,
      currentTarget: this.currentTarget,
      targetingMode: this.targetingMode,
      activeSynergies: this.activeSynergies,
      stats: {
        cost: this.stats.cost,
        damage: this.stats.damage,
        damageType: this.stats.damageType,
        range: this.stats.range,
        fireRate: this.stats.fireRate,
        splashRadius: this.stats.splashRadius,
        chainCount: this.stats.chainCount,
        stunDuration: this.stats.stunDuration,
        executeThreshold: this.stats.executeThreshold,
        slowAmount: this.stats.slowAmount,
        slowDuration: this.stats.slowDuration,
        poisonDamage: this.stats.poisonDamage,
        poisonDuration: this.stats.poisonDuration,
        armorReduction: this.stats.armorReduction,
        teleportDistance: this.stats.teleportDistance,
        auraRange: this.stats.auraRange,
        auraDamageBoost: this.stats.auraDamageBoost,
        auraSpeedBoost: this.stats.auraSpeedBoost,
        auraDamageMult: this.auraDamageMult,
        auraFireRateMult: this.auraFireRateMult,
      },
    };
  }

  canFire(currentTime: number): boolean {
    if (this.stats.fireRate === 0) return false;
    const effectiveRate = this.stats.fireRate * this.auraFireRateMult;
    return (currentTime - this.lastFireTime) >= (1.0 / effectiveRate);
  }

  getEffectiveDamage(ownerDamageMult = 1.0): number {
    return Math.floor(this.stats.damage * this.auraDamageMult * ownerDamageMult);
  }

  getDistanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isInRange(x: number, y: number, rangeModifier = 0): boolean {
    return this.getDistanceTo(x, y) <= this.stats.range + rangeModifier;
  }

  getSellValue(): number {
    let baseValue = Math.floor(this.stats.cost * SELL_REFUND_PERCENTAGE);
    let upgradeValue = 0;
    for (let lvl = 2; lvl <= this.level; lvl++) {
      upgradeValue += Math.floor(getUpgradeCost(this.stats.cost, lvl - 1) * SELL_REFUND_PERCENTAGE);
    }
    return baseValue + upgradeValue;
  }

  getUpgradeCost(): number {
    return getUpgradeCost(this.stats.cost, this.level);
  }

  canUpgrade(): boolean {
    return this.level < this.stats.maxLevel;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    this.level++;
    this.stats.damage = Math.floor(this.stats.damage * (1 + UPGRADE_DAMAGE_BOOST));
    this.stats.range = +(this.stats.range * (1 + UPGRADE_RANGE_BOOST)).toFixed(2);
    this.stats.fireRate = +(this.stats.fireRate * (1 + UPGRADE_FIRE_RATE_BOOST)).toFixed(2);
    if (this.stats.splashRadius > 0)
      this.stats.splashRadius = +(this.stats.splashRadius * (1 + UPGRADE_SPLASH_BOOST)).toFixed(2);
    if (this.stats.slowAmount > 0)
      this.stats.slowAmount = Math.min(0.9, +(this.stats.slowAmount * (1 + UPGRADE_SLOW_BOOST)).toFixed(2));
    if (this.stats.poisonDamage > 0)
      this.stats.poisonDamage = Math.floor(this.stats.poisonDamage * (1 + UPGRADE_POISON_BOOST));
    if (this.stats.chainCount > 0)
      this.stats.chainCount++;
    if (this.stats.executeThreshold > 0)
      this.stats.executeThreshold = Math.min(EXECUTE_THRESHOLD_CAP, +(this.stats.executeThreshold + 0.02).toFixed(2));
    if (this.stats.auraRange > 0)
      this.stats.auraRange = +(this.stats.auraRange * (1 + UPGRADE_RANGE_SUPPORT_BOOST)).toFixed(2);
    if (this.stats.auraDamageBoost > 0)
      this.stats.auraDamageBoost = +(this.stats.auraDamageBoost * (1 + UPGRADE_DAMAGE_SUPPORT_BOOST)).toFixed(2);
  }
}

export interface Projectile {
  projectileId: string;
  towerId: string;
  targetId: string;
  x: number;
  y: number;
  speed: number;
  damage: number;
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
  targetLastX: number;
  targetLastY: number;
}

export function createProjectile(
  projectileId: string,
  tower: TowerInstance,
  targetId: string,
  targetX: number,
  targetY: number,
  effectiveDamage: number,
): Projectile {
  return {
    projectileId,
    towerId: tower.towerId,
    targetId,
    x: tower.x,
    y: tower.y,
    speed: tower.stats.projectileSpeed,
    damage: effectiveDamage,
    damageType: tower.stats.damageType,
    splashRadius: tower.stats.splashRadius,
    slowAmount: tower.stats.slowAmount,
    slowDuration: tower.stats.slowDuration,
    poisonDamage: tower.stats.poisonDamage,
    poisonDuration: tower.stats.poisonDuration,
    chainCount: tower.stats.chainCount,
    stunDuration: tower.stats.stunDuration,
    executeThreshold: tower.stats.executeThreshold,
    armorReduction: tower.stats.armorReduction,
    teleportDistance: tower.stats.teleportDistance,
    targetLastX: targetX,
    targetLastY: targetY,
  };
}
