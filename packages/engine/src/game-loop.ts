import { GamePhase, EnemyType } from './types';
import { GameState } from './game-state';
import { Projectile, createProjectile, TowerInstance } from './tower';
import { EnemyInstance, createEnemy } from './enemy';
import { updateEnemyPosition, calculateDistance } from './pathfinding';
import { calculateInterest, shouldAwardLumber, getLumberAward } from './economy';
import {
  TICK_RATE, PROJECTILE_HIT_DISTANCE,
  WAVE_BASE_INCOME, WAVE_INCOME_PER_WAVE,
  MAX_AURA_DAMAGE_MULT, MAX_AURA_SPEED_MULT,
  CHAIN_INITIAL_MULT, CHAIN_DECAY_MULT, SPLASH_DAMAGE_MULT, CHAIN_RANGE,
  ABILITY_DEFINITIONS, SYNERGY_DEFINITIONS,
} from './constants';

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

let _uuid = 0;
function uuid(): string {
  return `${Date.now().toString(36)}-${(++_uuid).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class GameLoop {
  gameState: GameState;
  pendingEvents: GameEvent[] = [];
  tickRate = TICK_RATE;
  tickInterval = 1.0 / TICK_RATE;

  private _gameEndTime: number | null = null;
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _lastTickTime = 0;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /** Start the game loop. Returns a function to stop it. */
  start(): () => void {
    this._lastTickTime = Date.now() / 1000;
    this._intervalId = setInterval(() => {
      const now = Date.now() / 1000;
      const dt = now - this._lastTickTime;
      if (dt >= this.tickInterval) {
        this.tick(dt);
        this._lastTickTime = now;
      }
    }, 1);
    return () => this.stop();
  }

  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /** Consume and return all pending events since last call. */
  drainEvents(): GameEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  tick(deltaTime: number): void {
    const currentTime = Date.now() / 1000;

    // Emit path_changed if path was modified
    if (this.gameState.consumePathChanged()) {
      const path = this.gameState.sharedPath;
      this.pendingEvents.push({
        type: 'path_changed',
        path: path.serialize(),
        pathVersion: this.gameState.pathVersion,
        pathCells: this.gameState.occupancyGrid.getPathCells().map(([x, y]) => [x, y]),
      });
    }

    // Auto-start wave timer
    if (this.gameState.phase === GamePhase.Playing || this.gameState.phase === GamePhase.WaveComplete) {
      if (this.gameState.nextWaveAutoStartTime !== null && currentTime >= this.gameState.nextWaveAutoStartTime) {
        const waveActive = this.gameState.currentWave?.started && !this.gameState.currentWave.completed;
        if (!waveActive) {
          const wave = this.gameState.startNextWave();
          const totalEnemies = wave.enemies.reduce((s, [, c]) => s + c, 0);
          const event: GameEvent = {
            type: 'wave_started',
            waveNumber: wave.waveNumber,
            totalEnemies,
            earlyStart: false,
          };
          if (wave.properties) {
            event.waveName = wave.properties.name;
            event.waveTags = wave.properties.tags;
          }
          this.pendingEvents.push(event);
        } else {
          this.gameState.nextWaveAutoStartTime = null;
        }
      }
    }

    if (this.gameState.phase !== GamePhase.Playing && this.gameState.phase !== GamePhase.WaveActive) return;

    // Spawn enemies
    if (this.gameState.currentWave?.started) {
      this.gameState.spawnEnemyFromWave(currentTime);
    }

    // Aura effects
    this._applyAuraEffects();

    // Process abilities
    this._processAbilities(currentTime);

    // Expire ability buffs
    this._expireAbilityBuffs(currentTime);

    // Update enemies
    this._updateEnemies(deltaTime, currentTime);

    // Tower combat
    this._updateTowers(currentTime);

    // Projectiles
    this._updateProjectiles(deltaTime, currentTime);

    // Wave completion
    if (this.gameState.currentWave?.completed && this.gameState.enemies.size === 0) {
      this._completeWave();
    }

    // Game end checks
    const gameOver = this.gameState.checkGameOver();
    const victory = this.gameState.checkVictory();

    if (gameOver || victory) {
      if (this._gameEndTime === null) {
        this._gameEndTime = currentTime;
        this.pendingEvents.push({
          type: 'game_over',
          victory,
          stats: this._buildGameStats(),
        });
      } else if (currentTime - this._gameEndTime >= 10.0) {
        this.gameState.resetGame();
        this._gameEndTime = null;
        this.pendingEvents.push({
          type: 'game_reset',
          message: 'Game has been reset. Ready up to play again!',
        });
      }
    } else {
      this._gameEndTime = null;
    }
  }

  private _applyAuraEffects(): void {
    for (const tower of this.gameState.towers.values()) {
      tower.auraDamageMult = 1.0;
      tower.auraFireRateMult = 1.0;
    }
    for (const source of this.gameState.towers.values()) {
      if (source.stats.auraRange <= 0) continue;
      // Holy governor passive: +5% aura range
      const owner = this.gameState.players.get(source.ownerId);
      const effectiveAuraRange = source.stats.auraRange * (owner?.govAuraRangeMult ?? 1.0);
      for (const target of this.gameState.towers.values()) {
        if (target.towerId === source.towerId) continue;
        const dist = source.getDistanceTo(target.x, target.y);
        if (dist <= effectiveAuraRange) {
          target.auraDamageMult += source.stats.auraDamageBoost;
          target.auraFireRateMult += source.stats.auraSpeedBoost;
        }
      }
    }
    // Cap aura bonuses
    for (const tower of this.gameState.towers.values()) {
      tower.auraDamageMult = Math.min(tower.auraDamageMult, MAX_AURA_DAMAGE_MULT);
      tower.auraFireRateMult = Math.min(tower.auraFireRateMult, MAX_AURA_SPEED_MULT);
    }
  }

  private _processAbilities(currentTime: number): void {
    const pending = this.gameState._pendingAbilities;
    this.gameState._pendingAbilities = [];
    const enemiesToSpawn: EnemyInstance[] = [];

    for (const { playerId, targetX, targetY } of pending) {
      const player = this.gameState.players.get(playerId);
      if (!player?.governor) continue;
      const ability = ABILITY_DEFINITIONS[player.governor];
      if (!ability) continue;

      this.pendingEvents.push({
        type: 'ability_used',
        playerId,
        governor: player.governor,
        abilityName: ability.name,
        targetX: targetX ?? null,
        targetY: targetY ?? null,
      });

      if (ability.targetType === 'point_aoe' && targetX !== undefined && targetY !== undefined) {
        // Point AoE: affect enemies within radius
        for (const enemy of this.gameState.enemies.values()) {
          if (!enemy.isAlive) continue;
          const dist = calculateDistance(enemy.x, enemy.y, targetX, targetY);
          if (dist <= ability.radius) {
            if (ability.damage > 0) {
              const dmgType = ability.magicDamage ? 'magic' as const : 'physical' as const;
              const killed = enemy.takeDamage(ability.damage, dmgType);
              if (killed) {
                player.kills++;
                player.addMoney(this._getReward(enemy.stats.reward));
                this._onEnemyKilled(enemy, enemiesToSpawn);
              }
            }
            if (ability.slowAmount > 0) enemy.applySlow(ability.slowAmount, ability.slowDuration, currentTime);
            if (ability.stunDuration > 0) enemy.applyStun(ability.stunDuration, currentTime);
            if (ability.poisonDps > 0) enemy.applyPoison(ability.poisonDps, ability.poisonDuration, currentTime);
          }
        }
      } else if (ability.targetType === 'global') {
        // Global abilities
        if (ability.governor === 'thunder') {
          // Chain Storm: 200 magic damage to 10 random enemies
          const alive = [...this.gameState.enemies.values()].filter(e => e.isAlive);
          const shuffled = alive.sort(() => Math.random() - 0.5).slice(0, 10);
          for (const enemy of shuffled) {
            const killed = enemy.takeDamage(ability.damage, 'magic');
            if (killed) {
              player.kills++;
              player.addMoney(this._getReward(enemy.stats.reward));
              this._onEnemyKilled(enemy, enemiesToSpawn);
            }
          }
        } else if (ability.governor === 'death') {
          // Reap: instant kill all enemies <= 15% HP
          for (const enemy of this.gameState.enemies.values()) {
            if (!enemy.isAlive) continue;
            if (enemy.currentHealth / enemy.stats.maxHealth <= ability.executeThreshold) {
              const dmg = enemy.currentHealth;
              enemy.currentHealth = 0;
              enemy.isAlive = false;
              player.kills++;
              player.addMoney(this._getReward(enemy.stats.reward));
              player.damageDealt += dmg;
              this._onEnemyKilled(enemy, enemiesToSpawn);
            }
          }
        } else if (ability.governor === 'nature') {
          // Overgrowth: stun all enemies for 3s
          for (const enemy of this.gameState.enemies.values()) {
            if (!enemy.isAlive) continue;
            enemy.applyStun(ability.stunDuration, currentTime);
          }
        } else if (ability.governor === 'holy') {
          // Divine Intervention: heal 5 lives + 20% tower buff for 10s
          this.gameState.sharedLives = Math.min(30, this.gameState.sharedLives + ability.healLives);
          player.abilityDamageBuffMult = 1.0 + ability.towerBuffMult;
          player.abilityActiveUntil = currentTime + ability.towerBuffDuration;
        }
      }
    }

    for (const e of enemiesToSpawn) this.gameState.enemies.set(e.enemyId, e);
  }

  private _expireAbilityBuffs(currentTime: number): void {
    for (const player of this.gameState.players.values()) {
      if (currentTime >= player.abilityActiveUntil) {
        player.abilityDamageBuffMult = 1.0;
      }
    }
  }

  private _updateEnemies(deltaTime: number, currentTime: number): void {
    const enemiesToRemove: string[] = [];
    const enemiesToSpawn: EnemyInstance[] = [];

    for (const [enemyId, enemy] of this.gameState.enemies) {
      if (!enemy.isAlive) {
        enemiesToRemove.push(enemyId);
        continue;
      }

      // Stunned: apply poison but skip movement
      if (enemy.isStunned(currentTime)) {
        const poisonDmg = enemy.updatePoison(currentTime);
        if (poisonDmg > 0) {
          const killed = enemy.takeDamage(poisonDmg);
          if (killed) {
            this._onEnemyKilled(enemy, enemiesToSpawn);
            enemiesToRemove.push(enemyId);
          }
        }
        continue;
      }

      enemy.updateSlow(currentTime);
      enemy.updateArmorDebuff(currentTime);

      // Poison
      const poisonDmg = enemy.updatePoison(currentTime);
      if (poisonDmg > 0) {
        const killed = enemy.takeDamage(poisonDmg);
        if (killed) {
          this._onEnemyKilled(enemy, enemiesToSpawn);
          enemiesToRemove.push(enemyId);
          continue;
        }
      }

      // Heal
      enemy.updateHeal(deltaTime);

      // Re-path if version changed (ground enemies)
      if (!enemy.isFlying && enemy.pathVersion !== this.gameState.pathVersion) {
        enemy.pathVersion = this.gameState.pathVersion;
        const path = this.gameState.sharedPath;
        if (path.totalWaypoints <= 1) {
          enemy.pathIndex = 0;
        } else {
          let bestIdx = 1;
          let bestProjDist = Infinity;
          for (let i = 0; i < path.totalWaypoints - 1; i++) {
            const [ax, ay] = path.getWaypoint(i);
            const [bx, by] = path.getWaypoint(i + 1);
            const segDx = bx - ax;
            const segDy = by - ay;
            const segLenSq = segDx * segDx + segDy * segDy;
            if (segLenSq === 0) continue;
            const t = Math.max(0, Math.min(1, ((enemy.x - ax) * segDx + (enemy.y - ay) * segDy) / segLenSq));
            const projX = ax + t * segDx;
            const projY = ay + t * segDy;
            const d = calculateDistance(enemy.x, enemy.y, projX, projY);
            if (d < bestProjDist) {
              bestProjDist = d;
              bestIdx = i + 1;
            }
          }
          enemy.pathIndex = Math.min(bestIdx, path.totalWaypoints - 1);
        }
      }

      // Move
      const speed = enemy.getEffectiveSpeed();
      const path = enemy.isFlying ? this.gameState.flyingPath : this.gameState.sharedPath;
      const [newX, newY, newIdx, reachedEnd] = updateEnemyPosition(
        enemy.x, enemy.y, enemy.pathIndex, path, speed, deltaTime,
      );
      enemy.x = newX;
      enemy.y = newY;
      enemy.pathIndex = newIdx;

      if (reachedEnd) {
        this.gameState.takeSharedDamage(enemy.stats.damage);
        enemiesToRemove.push(enemyId);
      }
    }

    for (const id of enemiesToRemove) this.gameState.removeEnemy(id);
    for (const e of enemiesToSpawn) this.gameState.enemies.set(e.enemyId, e);
  }

  private _onEnemyKilled(enemy: EnemyInstance, enemiesToSpawn: EnemyInstance[]): void {
    if (enemy.stats.splitInto && enemy.stats.splitCount > 0) {
      const splitType = enemy.stats.splitInto as EnemyType;
      if (!Object.values(EnemyType).includes(splitType)) return;
      for (let i = 0; i < enemy.stats.splitCount; i++) {
        const child = createEnemy(splitType, uuid(), enemy.x, enemy.y, enemy.waveNumber, this.gameState.pathVersion);
        child.pathIndex = enemy.pathIndex;
        enemiesToSpawn.push(child);
      }
    }
  }

  private _updateTowers(currentTime: number): void {
    for (const tower of this.gameState.towers.values()) {
      if (tower.stats.damage === 0 && tower.stats.fireRate === 0) continue;
      if (!tower.canFire(currentTime)) continue;

      const owner = this.gameState.players.get(tower.ownerId);
      const abilityBuff = owner?.abilityDamageBuffMult ?? 1.0;
      const ownerDamageMult = (owner?.globalDamageMult ?? 1.0) * abilityBuff;
      const ownerRangeMult = owner?.globalRangeMult ?? 1.0;

      const target = this._findTarget(tower, ownerRangeMult);
      if (!target) {
        tower.currentTarget = null;
        continue;
      }

      tower.currentTarget = target.enemyId;
      tower.lastFireTime = currentTime;

      const effectiveDamage = tower.getEffectiveDamage(ownerDamageMult);
      const proj = createProjectile(uuid(), tower, target.enemyId, target.x, target.y, effectiveDamage);

      // Apply governor passive bonuses to projectile
      if (owner) {
        if (proj.damageType === 'magic' && owner.govMagicDmgBonus > 0) {
          proj.damage = Math.floor(proj.damage * (1 + owner.govMagicDmgBonus));
        }
        proj.slowDuration *= owner.govSlowDurMult;
        proj.chainCount += owner.govChainBonus;
        proj.poisonDamage = Math.floor(proj.poisonDamage * owner.govPoisonDmgMult);
        proj.executeThreshold += owner.govExecuteBonus;
        proj.stunDuration *= owner.govStunDurMult;
      }

      // Apply synergy bonuses
      if (tower.activeSynergies.length > 0) {
        for (const synId of tower.activeSynergies) {
          const syn = SYNERGY_DEFINITIONS.find(s => s.id === synId);
          if (!syn) continue;
          if (syn.splashRadiusMult !== 1.0) proj.splashRadius *= syn.splashRadiusMult;
          if (syn.magicDamageMult !== 1.0 && proj.damageType === 'magic') {
            proj.damage = Math.floor(proj.damage * syn.magicDamageMult);
          }
          if (syn.executeThresholdBonus > 0) proj.executeThreshold += syn.executeThresholdBonus;
          if (syn.armorDebuffBonus > 0) proj.armorReduction += syn.armorDebuffBonus;
          if (syn.stunDurationMult !== 1.0) proj.stunDuration *= syn.stunDurationMult;
          // Shatter: damageMult applied to slowed targets (handled at hit time)
          if (syn.damageMult !== 1.0) (proj as any)._shatterMult = syn.damageMult;
        }
      }

      this.gameState.projectiles.set(proj.projectileId, proj);
    }
  }

  private _findTarget(tower: TowerInstance, rangeMult: number): EnemyInstance | null {
    const effectiveRange = tower.stats.range * rangeMult;
    let bestTarget: EnemyInstance | null = null;
    let bestScore = -Infinity;
    const mode = tower.targetingMode;

    for (const enemy of this.gameState.enemies.values()) {
      if (!enemy.isAlive) continue;
      const dist = tower.getDistanceTo(enemy.x, enemy.y);
      if (dist > effectiveRange) continue;

      let score: number;
      switch (mode) {
        case 'last':
          score = -enemy.pathIndex;
          break;
        case 'closest':
          score = -dist;
          break;
        case 'strongest':
          score = enemy.currentHealth;
          break;
        case 'first':
        default:
          score = enemy.pathIndex;
          break;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    }
    return bestTarget;
  }

  private _updateProjectiles(deltaTime: number, currentTime: number): void {
    const toRemove: string[] = [];

    for (const [projId, proj] of this.gameState.projectiles) {
      let target: EnemyInstance | undefined;
      let targetX = proj.targetLastX;
      let targetY = proj.targetLastY;

      const enemy = this.gameState.enemies.get(proj.targetId);
      if (enemy) {
        target = enemy;
        proj.targetLastX = enemy.x;
        proj.targetLastY = enemy.y;
        targetX = enemy.x;
        targetY = enemy.y;
      }

      const dx = targetX - proj.x;
      const dy = targetY - proj.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < PROJECTILE_HIT_DISTANCE) {
        this._applyProjectileDamage(proj, target ?? null, currentTime);
        toRemove.push(projId);
      } else {
        const moveDist = proj.speed * deltaTime;
        if (moveDist >= distance) {
          proj.x = targetX;
          proj.y = targetY;
          this._applyProjectileDamage(proj, target ?? null, currentTime);
          toRemove.push(projId);
        } else {
          const ratio = moveDist / distance;
          proj.x += dx * ratio;
          proj.y += dy * ratio;
        }
      }
    }

    for (const id of toRemove) this.gameState.projectiles.delete(id);
  }

  /** Get effective kill reward (applies frugal mutator) */
  private _getReward(baseReward: number): number {
    const mutators = this.gameState.currentWave?.properties?.mutators;
    if (mutators?.includes('frugal')) return Math.floor(baseReward * 0.75);
    return baseReward;
  }

  private _applyProjectileDamage(projectile: Projectile, target: EnemyInstance | null, currentTime: number): void {
    const tower = this.gameState.towers.get(projectile.towerId);
    if (!tower) return;
    const owner = this.gameState.players.get(tower.ownerId);
    const impactX = projectile.targetLastX;
    const impactY = projectile.targetLastY;
    const enemiesToSpawn: EnemyInstance[] = [];

    if (target?.isAlive) {
      // Execute check
      if (projectile.executeThreshold > 0 && target.checkExecute(projectile.executeThreshold)) {
        const executeDmg = target.currentHealth;
        target.currentHealth = 0;
        target.isAlive = false;
        if (owner) {
          owner.kills++;
          owner.addMoney(this._getReward(target.stats.reward));
          owner.damageDealt += executeDmg;
        }
        this._onEnemyKilled(target, enemiesToSpawn);
      } else {
        // Shatter synergy: bonus damage to slowed targets
        let finalDamage = projectile.damage;
        if (target.slowMultiplier < 1 && (projectile as any)._shatterMult) {
          finalDamage = Math.floor(finalDamage * (projectile as any)._shatterMult);
        }
        const hpBefore = target.currentHealth;
        const killed = target.takeDamage(finalDamage, projectile.damageType);
        const actualDamage = hpBefore - target.currentHealth;

        if (projectile.slowAmount > 0) target.applySlow(projectile.slowAmount, projectile.slowDuration, currentTime);
        if (projectile.poisonDamage > 0) target.applyPoison(projectile.poisonDamage, projectile.poisonDuration, currentTime);
        if (projectile.stunDuration > 0) target.applyStun(projectile.stunDuration, currentTime);
        if (projectile.armorReduction > 0) target.applyArmorDebuff(projectile.armorReduction, currentTime);

        // Teleport: push enemy back
        if (projectile.teleportDistance > 0 && !target.isFlying) {
          const path = this.gameState.sharedPath;
          const stepsBack = Math.floor(projectile.teleportDistance);
          target.pathIndex = Math.max(0, target.pathIndex - stepsBack);
          if (target.pathIndex < path.totalWaypoints) {
            const [wx, wy] = path.getWaypoint(target.pathIndex);
            target.x = wx;
            target.y = wy;
          }
        }

        if (owner) owner.damageDealt += actualDamage;
        if (killed) {
          if (owner) {
            owner.kills++;
            owner.addMoney(this._getReward(target.stats.reward));
          }
          this._onEnemyKilled(target, enemiesToSpawn);
        }
      }
    }

    // Chain lightning
    if (projectile.chainCount > 0) {
      const chainTargets: [number, EnemyInstance][] = [];
      for (const enemy of this.gameState.enemies.values()) {
        if (target && enemy.enemyId === target.enemyId) continue;
        if (!enemy.isAlive) continue;
        const dist = calculateDistance(enemy.x, enemy.y, impactX, impactY);
        if (dist <= CHAIN_RANGE) chainTargets.push([dist, enemy]);
      }
      chainTargets.sort((a, b) => a[0] - b[0]);

      const baseDamage = projectile.damage;
      for (let i = 0; i < Math.min(projectile.chainCount, chainTargets.length); i++) {
        const chainDamage = Math.floor(baseDamage * CHAIN_INITIAL_MULT * Math.pow(CHAIN_DECAY_MULT, i));
        const chainEnemy = chainTargets[i][1];
        const chainHpBefore = chainEnemy.currentHealth;
        const chainKilled = chainEnemy.takeDamage(chainDamage, projectile.damageType);
        if (projectile.stunDuration > 0) chainEnemy.applyStun(projectile.stunDuration * 0.5, currentTime);
        if (owner) owner.damageDealt += chainHpBefore - chainEnemy.currentHealth;
        if (chainKilled && owner) {
          owner.kills++;
          owner.addMoney(this._getReward(chainEnemy.stats.reward));
          this._onEnemyKilled(chainEnemy, enemiesToSpawn);
        }
      }
    }

    // Splash
    if (projectile.splashRadius > 0) {
      for (const enemy of this.gameState.enemies.values()) {
        if (target && enemy.enemyId === target.enemyId) continue;
        if (!enemy.isAlive) continue;
        const dist = calculateDistance(enemy.x, enemy.y, impactX, impactY);
        if (dist <= projectile.splashRadius) {
          const splashDamage = Math.floor(projectile.damage * SPLASH_DAMAGE_MULT);
          const splashHpBefore = enemy.currentHealth;
          const splashKilled = enemy.takeDamage(splashDamage, projectile.damageType);
          if (owner) owner.damageDealt += splashHpBefore - enemy.currentHealth;
          if (splashKilled && owner) {
            owner.kills++;
            owner.addMoney(this._getReward(enemy.stats.reward));
            this._onEnemyKilled(enemy, enemiesToSpawn);
          }
        }
      }
    }

    for (const e of enemiesToSpawn) this.gameState.enemies.set(e.enemyId, e);
  }

  private _completeWave(): void {
    const waveNum = this.gameState.waveNumber;
    const ds = this.gameState.difficultyScaling;
    const baseIncome = WAVE_BASE_INCOME + waveNum * WAVE_INCOME_PER_WAVE;
    const playerCount = this.gameState.players.size;

    for (const player of this.gameState.players.values()) {
      // Apply difficulty income multiplier; split if money sharing is off
      let income = Math.floor(baseIncome * ds.incomeMult);
      if (!this.gameState.moneySharing && playerCount > 1) {
        income = Math.floor(income / playerCount);
      }
      player.addMoney(income);
      const interest = calculateInterest(player.money, player.interestRate, waveNum);
      if (interest > 0) player.addMoney(interest);
      if (shouldAwardLumber(waveNum)) player.addLumber(getLumberAward());
    }

    this.gameState.phase = GamePhase.WaveComplete;
    this.gameState.currentWave = null;

    this.pendingEvents.push({
      type: 'wave_completed',
      waveNumber: waveNum,
      income: baseIncome,
      lumberAwarded: shouldAwardLumber(waveNum),
    });

    this.gameState.nextWaveAutoStartTime = Date.now() / 1000 + this.gameState.autoStartDelay;
  }

  private _buildGameStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    for (const [pid, p] of this.gameState.players) {
      stats[pid] = {
        name: p.name,
        kills: p.kills,
        damageDealt: p.damageDealt,
        towersPlaced: p.towersPlaced,
        governor: p.governor,
      };
    }
    return stats;
  }
}
