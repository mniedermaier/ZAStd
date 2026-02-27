import { GameStateSnapshot, GamePhase, TowerType, EnemyType, TargetingMode, EliteAffix, EnemyTrait } from './types';
import { GameState } from './game-state';
import { TowerInstance, TOWER_DEFINITIONS } from './tower';
import { EnemyInstance, ENEMY_DEFINITIONS } from './enemy';
import { DIFFICULTY_MULTIPLIER_PER_WAVE, DIFFICULTY_SCALING } from './constants';

/**
 * Reconstruct a GameState from a snapshot (for host migration).
 * This creates a new GameState that matches the snapshot as closely as possible.
 */
export function gameStateFromSnapshot(snapshot: GameStateSnapshot): GameState {
  const gs = new GameState();

  // Settings
  gs.updateSettings({
    mapSize: snapshot.settings.mapSize,
    mapLayout: snapshot.settings.mapLayout,
    difficulty: snapshot.settings.difficulty,
    moneySharing: snapshot.settings.moneySharing,
  });

  // Phase
  const validPhases = Object.values(GamePhase) as string[];
  gs.phase = validPhases.includes(snapshot.phase) ? snapshot.phase as GamePhase : GamePhase.Lobby;
  gs.sharedLives = snapshot.sharedLives;
  gs.waveNumber = snapshot.waveNumber;

  // Players
  for (const [pid, ps] of Object.entries(snapshot.players)) {
    const player = gs.addPlayer(pid, ps.name);
    if (!player) continue;
    player.money = ps.money;
    player.lumber = ps.lumber;
    player.governor = ps.governor;
    player.techUpgrades = { ...ps.techUpgrades };
    player.ready = ps.ready;
    player.connected = ps.connected;
    player.kills = ps.kills;
    player.towersPlaced = ps.towersPlaced;
    player.damageDealt = ps.damageDealt;
    player.recalculateBonuses();
  }

  // Towers: reconstruct from snapshot
  for (const [tid, ts] of Object.entries(snapshot.towers)) {
    const towerType = ts.towerType as TowerType;
    if (!TOWER_DEFINITIONS[towerType]) continue;

    const tower = new TowerInstance(tid, towerType, ts.ownerId, ts.x, ts.y);
    // Apply upgrades
    for (let lvl = 1; lvl < ts.level; lvl++) {
      tower.upgrade();
    }
    tower.lastFireTime = ts.lastFireTime;
    // Validate currentTarget exists in enemies
    tower.currentTarget = (ts.currentTarget && snapshot.enemies[ts.currentTarget]) ? ts.currentTarget : null;
    // Restore targeting mode
    if (ts.targetingMode) tower.targetingMode = ts.targetingMode as TargetingMode;
    // Restore gift cooldown
    if (ts.giftCooldown) tower.giftCooldown = ts.giftCooldown;
    if (ts.autoUpgrade) tower.autoUpgrade = true;
    if (ts.fundingGoal) {
      tower.fundingGoal = ts.fundingGoal;
      tower.fundingCurrent = ts.fundingCurrent ?? 0;
      if (ts.fundingContributors) {
        for (const [pid, amt] of Object.entries(ts.fundingContributors)) {
          tower.fundingContributors.set(pid, amt as number);
        }
      }
    }
    gs.towers.set(tid, tower);

    // Mark cell as blocked in occupancy grid (without recalculating path each time)
    gs.occupancyGrid.blocked.add(`${ts.x},${ts.y}`);
  }
  // Trigger a single path recalculation after all towers are placed
  if (gs.towers.size > 0) {
    // Force recalculation by accessing the path
    gs.occupancyGrid.getPath();
  }
  // Recalculate synergies from restored tower positions
  gs.recalculateSynergies();

  // Enemies: reconstruct
  for (const [eid, es] of Object.entries(snapshot.enemies)) {
    const enemyType = es.enemyType as EnemyType;
    const baseDef = ENEMY_DEFINITIONS[enemyType];
    if (!baseDef) continue;

    const ds = DIFFICULTY_SCALING[snapshot.settings.difficulty] ?? DIFFICULTY_SCALING.normal;
    const healthScale = 1 + (es.waveNumber - 1) * DIFFICULTY_MULTIPLIER_PER_WAVE;
    const scaledHealth = Math.floor(baseDef.maxHealth * healthScale * ds.healthMult);
    const scaledSpeed = baseDef.speed * ds.speedMult;

    const enemy = new EnemyInstance(
      eid,
      enemyType,
      { ...baseDef, maxHealth: scaledHealth, speed: scaledSpeed },
      es.x,
      es.y,
      es.waveNumber,
      snapshot.map.pathVersion,
    );
    enemy.currentHealth = es.currentHealth;
    enemy.isAlive = es.isAlive;
    enemy.slowMultiplier = es.slowMultiplier;
    enemy.poisonDamage = es.poisonDamage;
    enemy.pathIndex = es.pathIndex ?? 0;
    enemy.hitsTaken = es.hitsTaken ?? 0;
    enemy.slowEndTime = es.slowEndTime ?? 0;
    enemy.poisonEndTime = es.poisonEndTime ?? 0;
    enemy.poisonLastTick = es.poisonLastTick ?? 0;
    enemy.stunEndTime = es.stunEndTime ?? 0;
    enemy.armorDebuff = es.armorDebuff ?? 0;
    enemy.armorDebuffEndTime = es.armorDebuffEndTime ?? 0;
    enemy.isSentCreep = es.isSentCreep ?? false;
    enemy.sentByPlayerId = es.sentByPlayerId ?? null;
    // Trait fields
    if (es.traits && es.traits.length > 0) {
      enemy.traits = es.traits as EnemyTrait[];
    }
    if (es.dodgeCooldownEnd) enemy.dodgeCooldownEnd = es.dodgeCooldownEnd;
    if (es.burrowCooldownEnd) enemy.burrowCooldownEnd = es.burrowCooldownEnd;
    // Elite fields
    if (es.eliteAffix) {
      enemy.eliteAffix = es.eliteAffix as EliteAffix;
      enemy.shieldHealth = es.shieldHealth ?? 0;
      enemy.shieldMaxHealth = es.shieldMaxHealth ?? 0;
      enemy.phaseActive = es.phaseActive ?? false;
    }
    gs.enemies.set(eid, enemy);
  }

  return gs;
}
