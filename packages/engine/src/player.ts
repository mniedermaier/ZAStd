import { PlayerSnapshot } from './types';
import { STARTING_MONEY, BASE_INTEREST_RATE } from './constants';
import { TECH_UPGRADES } from './economy';

export class Player {
  playerId: string;
  name: string;
  slot: number;

  money = STARTING_MONEY;
  lumber = 0;
  governor: string | null = null;
  techUpgrades: Record<string, number> = {};

  // Derived bonuses
  globalDamageMult = 1.0;
  globalRangeMult = 1.0;
  interestRate = BASE_INTEREST_RATE;
  costReduction = 0;
  ultimateUnlocked = false;

  // Governor passive bonuses
  govSlowDurMult = 1.0;
  govChainBonus = 0;
  govPoisonDmgMult = 1.0;
  govExecuteBonus = 0;
  govStunDurMult = 1.0;
  govMagicDmgBonus = 0;
  govAuraRangeMult = 1.0;

  // State
  ready = false;
  connected = true;

  // Ability state
  abilityCooldownEnd = 0;
  abilityActiveUntil = 0;
  abilityDamageBuffMult = 1.0;

  // Stats
  kills = 0;
  towersPlaced = 0;
  damageDealt = 0;

  constructor(playerId: string, name: string, slot: number) {
    this.playerId = playerId;
    this.name = name;
    this.slot = slot;
  }

  serialize(): PlayerSnapshot {
    const now = Date.now() / 1000;
    return {
      playerId: this.playerId,
      name: this.name,
      slot: this.slot,
      money: this.money,
      lumber: this.lumber,
      governor: this.governor,
      techUpgrades: { ...this.techUpgrades },
      ready: this.ready,
      connected: this.connected,
      kills: this.kills,
      towersPlaced: this.towersPlaced,
      damageDealt: this.damageDealt,
      ultimateUnlocked: this.ultimateUnlocked,
      abilityCooldownRemaining: Math.max(0, this.abilityCooldownEnd - now),
      abilityDamageBuffMult: now < this.abilityActiveUntil ? this.abilityDamageBuffMult : 1.0,
      bonuses: {
        damageMult: this.globalDamageMult,
        rangeMult: this.globalRangeMult,
        interestRate: this.interestRate,
        costReduction: this.costReduction,
      },
    };
  }

  recalculateBonuses(): void {
    this.globalDamageMult = 1.0;
    this.globalRangeMult = 1.0;
    this.interestRate = BASE_INTEREST_RATE;
    this.costReduction = 0;
    this.ultimateUnlocked = false;

    // Reset governor passive bonuses
    this.govSlowDurMult = 1.0;
    this.govChainBonus = 0;
    this.govPoisonDmgMult = 1.0;
    this.govExecuteBonus = 0;
    this.govStunDurMult = 1.0;
    this.govMagicDmgBonus = 0;
    this.govAuraRangeMult = 1.0;

    // Apply governor passive
    if (this.governor) {
      switch (this.governor) {
        case 'fire': this.globalDamageMult += 0.05; break;
        case 'ice': this.govSlowDurMult = 1.1; break;
        case 'thunder': this.govChainBonus = 1; break;
        case 'poison': this.govPoisonDmgMult = 1.1; break;
        case 'death': this.govExecuteBonus = 0.02; break;
        case 'nature': this.govStunDurMult = 1.1; break;
        case 'arcane': this.govMagicDmgBonus = 0.05; break;
        case 'holy': this.govAuraRangeMult = 1.05; break;
      }
    }

    for (const [techId, stacks] of Object.entries(this.techUpgrades)) {
      const tech = TECH_UPGRADES[techId];
      if (!tech) continue;
      switch (tech.effectType) {
        case 'damage':
          this.globalDamageMult += tech.effectValue * stacks;
          break;
        case 'range':
          this.globalRangeMult += tech.effectValue * stacks;
          break;
        case 'interest':
          this.interestRate += tech.effectValue * stacks;
          break;
        case 'cost_reduction':
          this.costReduction += tech.effectValue * stacks;
          break;
        case 'ultimate':
          this.ultimateUnlocked = true;
          break;
      }
    }
  }

  buyTech(techId: string): boolean {
    const tech = TECH_UPGRADES[techId];
    if (!tech) return false;
    const currentStacks = this.techUpgrades[techId] ?? 0;
    if (currentStacks >= tech.maxStacks) return false;
    if (this.lumber < tech.lumberCost) return false;
    this.lumber -= tech.lumberCost;
    this.techUpgrades[techId] = currentStacks + 1;
    this.recalculateBonuses();
    return true;
  }

  getCostMult(): number {
    return Math.max(0.5, 1.0 - this.costReduction);
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  spendMoney(amount: number): boolean {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  addLumber(amount: number): void {
    this.lumber += amount;
  }
}
