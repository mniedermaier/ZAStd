import { GamePhase, TowerType, TargetingMode, GameStateSnapshot } from './types';
import { Player } from './player';
import { TowerInstance, TOWER_DEFINITIONS, Projectile } from './tower';
import { EnemyInstance, Wave, generateWave, createEnemy } from './enemy';
import { OccupancyGrid, Path, updateEnemyPosition, getFlyingPath } from './pathfinding';
import { getAvailableTowers, getRegularTowers, isUltimateTower, COMMON_TOWERS, GOVERNORS } from './governor';
import {
  MAX_PLAYERS, MAP_SIZES, VALID_MAP_SIZES, VALID_DIFFICULTIES,
  AUTO_START_DELAY, MANUAL_START_COOLDOWN, VICTORY_WAVE,
  STARTING_MONEY, STARTING_LIVES, MAP_WAYPOINTS, MAP_SPAWN_END,
  DIFFICULTY_SCALING, TOWER_SELL_COOLDOWN, ABILITY_DEFINITIONS,
  SYNERGY_DEFINITIONS, VALID_MAP_LAYOUTS,
  SPIRAL_WAYPOINTS, SPIRAL_SPAWN_END,
  CROSSROADS_WAYPOINTS, CROSSROADS_SPAWN_END,
  CHALLENGE_MODIFIERS,
  CREEP_SEND_DEFINITIONS, TUTORIAL_WAVES, VOTE_TIMEOUT,
  MAX_TOWER_LEVEL,
} from './constants';
import { EnemyType } from './types';

let _uuid = 0;
function uuid(): string {
  return `${Date.now().toString(36)}-${(++_uuid).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class GameState {
  maxPlayers = MAX_PLAYERS;
  gridWidth: number;
  gridHeight: number;
  mapSize = 'medium';
  mapLayout = 'classic';
  difficulty = 'normal';
  moneySharing = true;
  endlessMode = false;
  activeModifiers: string[] = [];
  isTutorial = false;
  upgradeQueue: Array<{ playerId: string; towerId: string; targetLevel: number }> = [];
  activeVotes = new Map<string, { type: 'send_early' | 'kick'; targetId?: string; voters: Set<string>; startTime: number }>();

  phase: GamePhase = GamePhase.Lobby;
  sharedLives = STARTING_LIVES;

  players = new Map<string, Player>();
  playerSlots: (string | null)[];

  towers = new Map<string, TowerInstance>();
  projectiles = new Map<string, Projectile>();
  enemies = new Map<string, EnemyInstance>();

  currentWave: Wave | null = null;
  waveNumber = 0;
  waveMutatorOverrides: Record<number, string[]> | null = null;

  nextWaveAutoStartTime: number | null = null;
  autoStartDelay = AUTO_START_DELAY;
  lastManualWaveStartTime: number | null = null;
  manualStartCooldown = MANUAL_START_COOLDOWN;

  occupancyGrid!: OccupancyGrid;
  flyingPath!: Path;

  private _pendingPathChanged = false;
  _pendingAbilities: { playerId: string; targetX?: number; targetY?: number }[] = [];
  gameStartTime = 0;
  lastUpdateTime = Date.now() / 1000;

  constructor() {
    this.gridWidth = MAP_SIZES.medium.width;
    this.gridHeight = MAP_SIZES.medium.height;
    this.playerSlots = new Array(this.maxPlayers).fill(null);
    this._initGrid();
  }

  private _initGrid(): void {
    let se: { spawn: [number, number]; end: [number, number] };
    let waypoints: [number, number][];

    switch (this.mapLayout) {
      case 'spiral':
        se = SPIRAL_SPAWN_END[this.mapSize] ?? SPIRAL_SPAWN_END.medium;
        waypoints = (SPIRAL_WAYPOINTS[this.mapSize] ?? SPIRAL_WAYPOINTS.medium)
          .map(([x, y]) => [x, y] as [number, number]);
        break;
      case 'crossroads':
        se = CROSSROADS_SPAWN_END[this.mapSize] ?? CROSSROADS_SPAWN_END.medium;
        waypoints = (CROSSROADS_WAYPOINTS[this.mapSize] ?? CROSSROADS_WAYPOINTS.medium)
          .map(([x, y]) => [x, y] as [number, number]);
        break;
      default: // classic
        se = MAP_SPAWN_END[this.mapSize] ?? MAP_SPAWN_END.medium;
        waypoints = (MAP_WAYPOINTS[this.mapSize] ?? MAP_WAYPOINTS.medium)
          .map(([x, y]) => [x, y] as [number, number]);
        break;
    }

    const spawn: [number, number] = [...se.spawn];
    const end: [number, number] = [...se.end];
    this.occupancyGrid = new OccupancyGrid(this.gridWidth, this.gridHeight, spawn, end, waypoints);
    this.flyingPath = getFlyingPath(spawn, end, waypoints);
  }

  private applyMapSize(): void {
    const size = MAP_SIZES[this.mapSize];
    if (size) {
      this.gridWidth = size.width;
      this.gridHeight = size.height;
    }
  }

  get difficultyScaling() {
    return DIFFICULTY_SCALING[this.difficulty] ?? DIFFICULTY_SCALING.normal;
  }

  get activeMutators(): string[] {
    return this.currentWave?.properties?.mutators ?? [];
  }

  get scoreMultiplier(): number {
    let mult = 1.0;
    for (const mod of this.activeModifiers) {
      const def = CHALLENGE_MODIFIERS[mod];
      if (def) mult *= def.scoreMultiplier;
    }
    return Math.round(mult * 100) / 100;
  }

  canSellTower(): boolean {
    return !this.activeModifiers.includes('no_sell');
  }

  canUpgradeTower(): boolean {
    return !this.activeModifiers.includes('no_upgrades');
  }

  get sharedPath(): Path {
    return this.occupancyGrid.getPath();
  }

  get pathVersion(): number {
    return this.occupancyGrid.version;
  }

  // Settings
  updateSettings(opts: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }): boolean {
    if (this.phase !== GamePhase.Lobby) return false;
    let needReinit = false;
    if (opts.mapSize !== undefined) {
      if (!(VALID_MAP_SIZES as readonly string[]).includes(opts.mapSize)) return false;
      this.mapSize = opts.mapSize;
      this.applyMapSize();
      needReinit = true;
    }
    if (opts.mapLayout !== undefined) {
      if (!(VALID_MAP_LAYOUTS as readonly string[]).includes(opts.mapLayout)) return false;
      this.mapLayout = opts.mapLayout;
      needReinit = true;
    }
    if (needReinit) this._initGrid();
    if (opts.difficulty !== undefined) {
      if (!(VALID_DIFFICULTIES as readonly string[]).includes(opts.difficulty)) return false;
      this.difficulty = opts.difficulty;
    }
    if (opts.moneySharing !== undefined) {
      this.moneySharing = opts.moneySharing;
    }
    return true;
  }

  // Player Management
  addPlayer(playerId: string, playerName: string): Player | null {
    let slot: number | null = null;
    for (let i = 0; i < this.playerSlots.length; i++) {
      if (this.playerSlots[i] === null) { slot = i; break; }
    }
    if (slot === null) return null;

    const player = new Player(playerId, playerName, slot);
    this.players.set(playerId, player);
    this.playerSlots[slot] = playerId;
    return player;
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    this.playerSlots[player.slot] = null;
    this.players.delete(playerId);

    // Remove their towers
    const toRemove: string[] = [];
    for (const [tid, tower] of this.towers) {
      if (tower.ownerId === playerId) toRemove.push(tid);
    }
    for (const tid of toRemove) {
      const tower = this.towers.get(tid)!;
      this.occupancyGrid.removeTower(tower.x, tower.y);
      this.towers.delete(tid);
    }
    return true;
  }

  transferTowers(fromPlayerId: string): Record<string, string> {
    const playerTowers = [...this.towers.entries()].filter(([, t]) => t.ownerId === fromPlayerId);
    if (!playerTowers.length) return {};

    const remaining = [...this.players.keys()].filter(id => id !== fromPlayerId);
    if (!remaining.length) {
      for (const [tid] of playerTowers) this.towers.delete(tid);
      return {};
    }

    const transfers: Record<string, string> = {};
    playerTowers.forEach(([tid, tower], i) => {
      const newOwner = remaining[i % remaining.length];
      tower.ownerId = newOwner;
      transfers[tid] = newOwner;
    });
    return transfers;
  }

  setPlayerReady(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId);
    if (player) player.ready = ready;
  }

  allPlayersReady(): boolean {
    if (this.players.size === 0) return false;
    for (const p of this.players.values()) {
      if (!p.ready) return false;
    }
    return true;
  }

  // Governor
  selectGovernor(playerId: string, governor: string): boolean {
    if (this.phase !== GamePhase.Lobby) return false;
    const player = this.players.get(playerId);
    if (!player) return false;
    if (!(governor in GOVERNORS)) return false;
    player.governor = governor;
    player.recalculateBonuses();
    return true;
  }

  // Tower Management
  canPlaceTower(playerId: string, x: number, y: number, towerType: TowerType): [boolean, string] {
    if (!this.players.has(playerId)) return [false, 'Player not found'];
    const player = this.players.get(playerId)!;
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return [false, 'Out of bounds'];

    for (const tower of this.towers.values()) {
      if (tower.x === x && tower.y === y) return [false, 'Position occupied'];
    }

    const towerTypeStr = towerType as string;
    let available: string[];
    if (player.governor) {
      available = player.ultimateUnlocked
        ? getAvailableTowers(player.governor)
        : getRegularTowers(player.governor);
    } else {
      available = [...COMMON_TOWERS];
    }
    if (!available.includes(towerTypeStr)) return [false, 'Tower not available for your governor'];
    if (isUltimateTower(towerTypeStr) && !player.ultimateUnlocked) return [false, 'Ultimate tower not unlocked'];
    if (!this.occupancyGrid.canPlace(x, y)) return [false, 'Would block enemy path'];
    return [true, 'OK'];
  }

  placeTower(playerId: string, x: number, y: number, towerType: TowerType): TowerInstance | null {
    const [canPlace] = this.canPlaceTower(playerId, x, y, towerType);
    if (!canPlace) return null;

    const player = this.players.get(playerId)!;
    const baseCost = TOWER_DEFINITIONS[towerType].cost;
    let cost = Math.floor(baseCost * player.getCostMult());
    // Thrifty mutator: +20% tower cost during the wave
    if (this.currentWave?.properties?.mutators?.includes('thrifty')) {
      cost = Math.floor(cost * 1.2);
    }
    if (!player.spendMoney(cost)) return null;

    this.occupancyGrid.placeTower(x, y);
    this._pendingPathChanged = true;

    const towerId = uuid();
    const tower = new TowerInstance(towerId, towerType, playerId, x, y, player.getCostMult());
    tower.placedAt = Date.now() / 1000;
    this.towers.set(towerId, tower);
    player.towersPlaced++;
    this.recalculateSynergies();
    return tower;
  }

  sellTower(playerId: string, towerId: string): boolean {
    if (!this.canSellTower()) return false;
    const tower = this.towers.get(towerId);
    if (!tower || tower.ownerId !== playerId) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    // Sell cooldown: prevent selling recently-placed towers during active waves
    if (this.phase === GamePhase.WaveActive) {
      const now = Date.now() / 1000;
      if (now - tower.placedAt < TOWER_SELL_COOLDOWN) return false;
    }

    player.addMoney(tower.getSellValue());
    this.occupancyGrid.removeTower(tower.x, tower.y);
    this._pendingPathChanged = true;
    this.towers.delete(towerId);
    this.recalculateSynergies();
    return true;
  }

  setTowerTargeting(playerId: string, towerId: string, mode: TargetingMode): boolean {
    const tower = this.towers.get(towerId);
    if (!tower || tower.ownerId !== playerId) return false;
    tower.targetingMode = mode;
    return true;
  }

  upgradeTower(playerId: string, towerId: string): boolean {
    if (!this.canUpgradeTower()) return false;
    const tower = this.towers.get(towerId);
    if (!tower || tower.ownerId !== playerId || !tower.canUpgrade()) return false;
    const player = this.players.get(playerId);
    if (!player) return false;
    if (!player.spendMoney(tower.getUpgradeCost())) return false;
    tower.upgrade();
    return true;
  }

  // Synergies — check 4-adjacent towers for governor pair combos
  recalculateSynergies(): void {
    // Build grid lookup: (x,y) -> TowerInstance
    const grid = new Map<string, TowerInstance>();
    for (const tower of this.towers.values()) {
      grid.set(`${tower.x},${tower.y}`, tower);
    }

    // Clear all synergies first
    for (const tower of this.towers.values()) {
      tower.activeSynergies = [];
    }

    // For each tower, check 4-adjacent cells
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const tower of this.towers.values()) {
      const tGov = this._getGovernorForTower(tower.towerType);
      if (!tGov) continue;

      for (const [dx, dy] of dirs) {
        const neighbor = grid.get(`${tower.x + dx},${tower.y + dy}`);
        if (!neighbor) continue;
        const nGov = this._getGovernorForTower(neighbor.towerType);
        if (!nGov || nGov === tGov) continue;

        // Check if this pair matches any synergy
        for (const syn of SYNERGY_DEFINITIONS) {
          if ((syn.governors[0] === tGov && syn.governors[1] === nGov) ||
              (syn.governors[0] === nGov && syn.governors[1] === tGov)) {
            if (!tower.activeSynergies.includes(syn.id)) {
              tower.activeSynergies.push(syn.id);
            }
          }
        }
      }
    }
  }

  private _getGovernorForTower(towerType: TowerType): string | null {
    for (const [key, gov] of Object.entries(GOVERNORS)) {
      if (gov.towerTypes.includes(towerType)) return key;
    }
    return null;
  }

  // Abilities
  useAbility(playerId: string, targetX?: number, targetY?: number): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.governor) return false;
    const ability = ABILITY_DEFINITIONS[player.governor];
    if (!ability) return false;
    const now = Date.now() / 1000;
    if (now < player.abilityCooldownEnd) return false;
    // Point AoE requires target coordinates
    if (ability.targetType === 'point_aoe' && (targetX === undefined || targetY === undefined)) return false;
    player.abilityCooldownEnd = now + ability.cooldown;
    this._pendingAbilities.push({ playerId, targetX, targetY });
    return true;
  }

  // Wave & Enemy Management
  startNextWave(): Wave {
    this.waveNumber++;

    if (this.isTutorial && this.waveNumber <= TUTORIAL_WAVES.length) {
      const [type, count] = TUTORIAL_WAVES[this.waveNumber - 1];
      const enemies: [EnemyType, number][] = [[type as EnemyType, count]];
      this.currentWave = new Wave(this.waveNumber, enemies, { name: `Tutorial ${this.waveNumber}`, tags: ['tutorial'] });
    } else {
      const forcedMutators = this.waveMutatorOverrides?.[this.waveNumber];
      this.currentWave = generateWave(this.waveNumber, this.players.size, forcedMutators ? { forcedMutators } : undefined);
    }

    this.currentWave.started = true;
    this.currentWave.lastSpawnTime = Date.now() / 1000;
    this.phase = GamePhase.WaveActive;
    this.nextWaveAutoStartTime = null;
    return this.currentWave;
  }

  getNextWaveCountdown(): number | null {
    if (this.nextWaveAutoStartTime === null) return null;
    return Math.max(0, this.nextWaveAutoStartTime - Date.now() / 1000);
  }

  getManualStartCooldown(): number | null {
    if (this.lastManualWaveStartTime === null) return null;
    const elapsed = Date.now() / 1000 - this.lastManualWaveStartTime;
    const remaining = this.manualStartCooldown - elapsed;
    return remaining > 0 ? remaining : null;
  }

  canManuallyStartWave(): boolean {
    const cd = this.getManualStartCooldown();
    return cd === null || cd <= 0;
  }

  spawnEnemyFromWave(currentTime: number): EnemyInstance | null {
    if (!this.currentWave?.started || this.currentWave.completed) return null;
    if (currentTime - this.currentWave.lastSpawnTime < this.currentWave.spawnInterval) return null;

    let totalSpawned = 0;
    let enemyTypeToSpawn: typeof this.currentWave.enemies[0][0] | null = null;
    for (const [enemyType, count] of this.currentWave.enemies) {
      if (this.currentWave.spawnIndex < totalSpawned + count) {
        enemyTypeToSpawn = enemyType;
        break;
      }
      totalSpawned += count;
    }

    if (enemyTypeToSpawn === null) {
      this.currentWave.completed = true;
      return null;
    }

    const [spawnX, spawnY] = this.sharedPath.getSpawnPosition();
    const enemyId = uuid();
    const ds = this.difficultyScaling;
    const enemy = createEnemy(enemyTypeToSpawn, enemyId, spawnX, spawnY, this.waveNumber, this.pathVersion, ds.healthMult, ds.speedMult);

    // Apply wave mutator effects to spawned enemy
    const mutators = this.currentWave.properties?.mutators;
    if (mutators) {
      if (mutators.includes('swift')) {
        enemy.stats = { ...enemy.stats, speed: enemy.stats.speed * 1.25 };
      }
      if (mutators.includes('fortified')) {
        const newHp = Math.floor(enemy.stats.maxHealth * 1.3);
        enemy.stats = { ...enemy.stats, maxHealth: newHp };
        enemy.currentHealth = newHp;
      }
      if (mutators.includes('swarm')) {
        const newHp = Math.floor(enemy.stats.maxHealth * 0.5);
        enemy.stats = { ...enemy.stats, maxHealth: newHp };
        enemy.currentHealth = newHp;
      }
      if (mutators.includes('regenerating')) {
        enemy.stats = { ...enemy.stats, healPerSecond: enemy.stats.healPerSecond + 2 };
      }
      if (mutators.includes('shielded')) {
        enemy.stats = { ...enemy.stats, armor: enemy.stats.armor + 0.15 };
      }
    }

    this.enemies.set(enemyId, enemy);
    this.currentWave.spawnIndex++;
    this.currentWave.lastSpawnTime = currentTime;
    return enemy;
  }

  removeEnemy(enemyId: string): void {
    this.enemies.delete(enemyId);
  }

  takeSharedDamage(amount: number): void {
    this.sharedLives -= amount;
  }

  isGameOver(): boolean {
    return this.sharedLives <= 0;
  }

  consumePathChanged(): boolean {
    if (this._pendingPathChanged) {
      this._pendingPathChanged = false;
      return true;
    }
    return false;
  }

  // Game state transitions
  startGame(): void {
    this.phase = GamePhase.Playing;
    this.gameStartTime = Date.now() / 1000;
    this.nextWaveAutoStartTime = Date.now() / 1000 + this.autoStartDelay;
    // Apply difficulty starting money multiplier
    const ds = this.difficultyScaling;
    if (ds.startingMoneyMult !== 1.0) {
      for (const player of this.players.values()) {
        player.money = Math.floor(player.money * ds.startingMoneyMult);
      }
    }
  }

  checkGameOver(): boolean {
    if (this.sharedLives <= 0) {
      this.phase = GamePhase.GameOver;
      return true;
    }
    return false;
  }

  checkVictory(): boolean {
    if (this.endlessMode) return false;
    const victoryWave = this.isTutorial ? 5 : VICTORY_WAVE;
    if (this.waveNumber >= victoryWave && this.enemies.size === 0) {
      this.phase = GamePhase.Victory;
      return true;
    }
    return false;
  }

  // --- Gold Transfer ---
  sendGold(fromPlayerId: string, toPlayerId: string, amount: number): boolean {
    if (amount < 1) return false;
    const from = this.players.get(fromPlayerId);
    const to = this.players.get(toPlayerId);
    if (!from || !to) return false;
    if (fromPlayerId === toPlayerId) return false;
    if (!from.spendMoney(amount)) return false;
    to.addMoney(amount);
    return true;
  }

  // --- Creep Sending ---
  sendCreeps(playerId: string, enemyType: string, count: number): boolean {
    if (this.phase !== GamePhase.WaveActive && this.phase !== GamePhase.Playing && this.phase !== GamePhase.WaveComplete) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    const def = CREEP_SEND_DEFINITIONS.find(d => d.type === enemyType);
    if (!def) return false;
    if (this.waveNumber < def.unlockWave) return false;

    const totalCost = def.cost * count;
    if (!player.spendMoney(totalCost)) return false;

    const [spawnX, spawnY] = this.sharedPath.getSpawnPosition();
    for (let i = 0; i < count; i++) {
      const enemyId = uuid();
      const ds = this.difficultyScaling;
      const enemy = createEnemy(enemyType as EnemyType, enemyId, spawnX, spawnY, this.waveNumber, this.pathVersion, ds.healthMult, ds.speedMult);
      enemy.isSentCreep = true;
      enemy.sentByPlayerId = playerId;
      this.enemies.set(enemyId, enemy);
    }
    return true;
  }

  // --- Upgrade Queue ---
  queueUpgrade(playerId: string, towerId: string): boolean {
    if (!this.canUpgradeTower()) return false;
    const tower = this.towers.get(towerId);
    if (!tower || tower.ownerId !== playerId) return false;

    // Calculate target level
    const existing = this.upgradeQueue.filter(q => q.towerId === towerId);
    const currentMaxTarget = existing.length > 0
      ? Math.max(...existing.map(q => q.targetLevel))
      : tower.level;
    const targetLevel = currentMaxTarget + 1;
    if (targetLevel > MAX_TOWER_LEVEL) return false;

    this.upgradeQueue.push({ playerId, towerId, targetLevel });
    return true;
  }

  cancelQueuedUpgrade(playerId: string, towerId: string): boolean {
    const idx = this.upgradeQueue.findIndex(q => q.playerId === playerId && q.towerId === towerId);
    if (idx === -1) return false;
    this.upgradeQueue.splice(idx, 1);
    return true;
  }

  processUpgradeQueue(): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.upgradeQueue.length; i++) {
      const entry = this.upgradeQueue[i];
      const tower = this.towers.get(entry.towerId);
      if (!tower) { toRemove.push(i); continue; }
      if (tower.level >= entry.targetLevel) { toRemove.push(i); continue; }

      const player = this.players.get(entry.playerId);
      if (!player) { toRemove.push(i); continue; }

      const cost = tower.getUpgradeCost();
      if (player.money >= cost && tower.canUpgrade()) {
        player.spendMoney(cost);
        tower.upgrade();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.upgradeQueue.splice(toRemove[i], 1);
    }
  }

  // --- Voting System ---
  startVote(playerId: string, type: 'send_early' | 'kick', targetId?: string): string | null {
    // Don't allow duplicate active votes of same type
    for (const [, vote] of this.activeVotes) {
      if (vote.type === type && vote.targetId === targetId) return null;
    }
    const voteId = uuid();
    const voters = new Set<string>();
    voters.add(playerId);
    this.activeVotes.set(voteId, { type, targetId, voters, startTime: Date.now() / 1000 });
    return voteId;
  }

  castVote(playerId: string, voteId: string): boolean {
    const vote = this.activeVotes.get(voteId);
    if (!vote) return false;
    if (vote.voters.has(playerId)) return false;
    vote.voters.add(playerId);
    return true;
  }

  resolveVotes(currentTime: number): Array<{ voteId: string; passed: boolean; type: string; targetId?: string }> {
    const results: Array<{ voteId: string; passed: boolean; type: string; targetId?: string }> = [];
    const playerCount = this.players.size;
    if (playerCount === 0) return results;

    for (const [voteId, vote] of this.activeVotes) {
      const majority = vote.voters.size > playerCount / 2;
      const expired = currentTime - vote.startTime >= VOTE_TIMEOUT;

      if (majority || expired) {
        results.push({ voteId, passed: majority, type: vote.type, targetId: vote.targetId });
        this.activeVotes.delete(voteId);
      }
    }
    return results;
  }

  resetGame(): void {
    this.phase = GamePhase.Lobby;
    this.waveNumber = 0;
    this.currentWave = null;
    this.nextWaveAutoStartTime = null;
    this.lastManualWaveStartTime = null;
    this.sharedLives = STARTING_LIVES;
    this.endlessMode = false;
    this.isTutorial = false;
    this.activeModifiers = [];
    this.upgradeQueue = [];
    this.activeVotes.clear();
    this.towers.clear();
    this.projectiles.clear();
    this.enemies.clear();
    this._initGrid();

    for (const player of this.players.values()) {
      player.ready = false;
      player.money = STARTING_MONEY;
      player.lumber = 0;
      player.kills = 0;
      player.damageDealt = 0;
      player.towersPlaced = 0;
      player.governor = null;
      player.techUpgrades = {};
      player.recalculateBonuses();
    }
  }

  applyModifiers(): void {
    if (this.activeModifiers.includes('glass_cannon')) {
      this.sharedLives = 10;
    }
    if (this.activeModifiers.includes('poverty')) {
      for (const player of this.players.values()) {
        player.money = 100;
      }
    }
  }

  // Serialization
  serialize(): GameStateSnapshot {
    const players: Record<string, ReturnType<Player['serialize']>> = {};
    for (const [pid, p] of this.players) players[pid] = p.serialize();

    const towers: Record<string, ReturnType<TowerInstance['serialize']>> = {};
    for (const [tid, t] of this.towers) towers[tid] = t.serialize();

    const enemies: Record<string, ReturnType<EnemyInstance['serialize']>> = {};
    for (const [eid, e] of this.enemies) enemies[eid] = e.serialize();

    const projectiles: Record<string, { projectileId: string; towerId: string; targetId: string; x: number; y: number }> = {};
    for (const [pid, p] of this.projectiles) {
      projectiles[pid] = {
        projectileId: p.projectileId,
        towerId: p.towerId,
        targetId: p.targetId,
        x: p.x,
        y: p.y,
      };
    }

    return {
      phase: this.phase,
      waveNumber: this.waveNumber,
      sharedLives: this.sharedLives,
      nextWaveCountdown: this.getNextWaveCountdown(),
      manualStartCooldown: this.getManualStartCooldown(),
      players,
      towers,
      enemies,
      projectiles,
      currentWave: this.currentWave?.serialize() ?? null,
      settings: {
        mapSize: this.mapSize,
        mapLayout: this.mapLayout,
        difficulty: this.difficulty,
        moneySharing: this.moneySharing,
      },
      endlessMode: this.endlessMode,
      activeModifiers: this.activeModifiers,
      scoreMultiplier: this.scoreMultiplier,
      upgradeQueue: this.upgradeQueue.length > 0 ? [...this.upgradeQueue] : undefined,
      activeVotes: this.activeVotes.size > 0
        ? [...this.activeVotes.entries()].map(([voteId, v]) => ({
          voteId, type: v.type, targetId: v.targetId, voters: [...v.voters], startTime: v.startTime,
        }))
        : undefined,
      isTutorial: this.isTutorial || undefined,
      map: {
        width: this.gridWidth,
        height: this.gridHeight,
        path: this.sharedPath.serialize(),
        pathVersion: this.pathVersion,
        pathCells: this.occupancyGrid.getPathCells().map(([x, y]) => [x, y]),
        spawn: [...this.occupancyGrid.spawn],
        end: [...this.occupancyGrid.end],
        checkpoints: this.occupancyGrid.checkpoints.map(([x, y]) => [x, y]),
      },
      timestamp: Date.now() / 1000,
    };
  }
}
