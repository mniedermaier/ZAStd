import { describe, it, expect } from 'vitest';
import {
  OccupancyGrid, calculateDistance, updateEnemyPosition, Path,
  GameState, TowerType, EnemyType, GamePhase,
  TOWER_DEFINITIONS, ENEMY_DEFINITIONS, generateWave, createEnemy,
  getUpgradeCost, TowerInstance, Player,
  GOVERNORS, getAvailableTowers, getRegularTowers, isUltimateTower,
  TECH_UPGRADES, calculateInterest, shouldAwardLumber,
  GameLoop, EnemyInstance, createProjectile,
} from '../index';
import {
  CHAIN_INITIAL_MULT, CHAIN_DECAY_MULT, CHAIN_RANGE,
  MAX_AURA_DAMAGE_MULT, MAX_AURA_SPEED_MULT,
  ABILITY_DEFINITIONS, SYNERGY_DEFINITIONS,
  MUTATOR_START_WAVE,
} from '../constants';
import { CHALLENGE_MODIFIERS } from '../constants';
import { SeededRNG, dateSeed, generateDailyChallenge } from '../daily-challenge';
import { ReplayRecorder } from '../replay';

describe('Pathfinding', () => {
  it('finds a path on empty grid', () => {
    const grid = new OccupancyGrid(10, 10, [0, 5], [9, 5]);
    const path = grid.getPath();
    expect(path.totalWaypoints).toBeGreaterThan(0);
    expect(path.getSpawnPosition()).toEqual([0.5, 5.5]);
    expect(path.getEndPosition()).toEqual([9.5, 5.5]);
  });

  it('can place tower without blocking path', () => {
    const grid = new OccupancyGrid(10, 10, [0, 5], [9, 5]);
    expect(grid.canPlace(5, 3)).toBe(true);
    expect(grid.placeTower(5, 3)).toBe(true);
    expect(grid.isBlocked(5, 3)).toBe(true);
    expect(grid.version).toBe(1);
  });

  it('rejects placement that would block path', () => {
    const grid = new OccupancyGrid(3, 1, [0, 0], [2, 0]);
    // Blocking middle cell blocks the only path
    expect(grid.canPlace(1, 0)).toBe(false);
  });

  it('rejects spawn/end placement', () => {
    const grid = new OccupancyGrid(10, 10, [0, 5], [9, 5]);
    expect(grid.canPlace(0, 5)).toBe(false);
    expect(grid.canPlace(9, 5)).toBe(false);
  });

  it('removes tower and reroutes', () => {
    const grid = new OccupancyGrid(10, 10, [0, 5], [9, 5]);
    grid.placeTower(5, 5);
    const v1 = grid.version;
    grid.removeTower(5, 5);
    expect(grid.version).toBe(v1 + 1);
    expect(grid.isBlocked(5, 5)).toBe(false);
  });

  it('simplifies straight-line path', () => {
    const grid = new OccupancyGrid(10, 1, [0, 0], [9, 0]);
    const path = grid.getPath();
    // Straight line should simplify to just start and end
    expect(path.totalWaypoints).toBe(2);
  });
});

describe('calculateDistance', () => {
  it('computes euclidean distance', () => {
    expect(calculateDistance(0, 0, 3, 4)).toBeCloseTo(5.0);
    expect(calculateDistance(1, 1, 1, 1)).toBeCloseTo(0);
  });
});

describe('updateEnemyPosition', () => {
  it('moves enemy along path', () => {
    const path = new Path([[0, 0], [10, 0]]);
    const [x, y, idx, end] = updateEnemyPosition(0, 0, 0, path, 5, 1.0);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(0);
    expect(end).toBe(false);
  });

  it('reaches end of path', () => {
    const path = new Path([[0, 0], [2, 0]]);
    const [x, y, idx, end] = updateEnemyPosition(0, 0, 0, path, 10, 1.0);
    expect(x).toBeCloseTo(2);
    expect(end).toBe(true);
  });
});

describe('Tower Definitions', () => {
  it('has 35 tower types', () => {
    expect(Object.keys(TOWER_DEFINITIONS).length).toBe(35);
  });

  it('each tower has valid stats', () => {
    for (const [type, stats] of Object.entries(TOWER_DEFINITIONS)) {
      expect(stats.cost).toBeGreaterThan(0);
      expect(stats.maxLevel).toBeGreaterThan(0);
      expect(stats.range).toBeGreaterThan(0);
    }
  });
});

describe('TowerInstance', () => {
  it('upgrade increases stats', () => {
    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 5, 5);
    const origDmg = tower.stats.damage;
    tower.upgrade();
    expect(tower.level).toBe(2);
    expect(tower.stats.damage).toBeGreaterThan(origDmg);
  });

  it('cannot upgrade past max level', () => {
    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 5, 5);
    for (let i = 0; i < 10; i++) tower.upgrade();
    expect(tower.level).toBe(tower.stats.maxLevel);
  });

  it('sell value based on cost and upgrades', () => {
    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 5, 5);
    const baseSell = tower.getSellValue();
    expect(baseSell).toBe(Math.floor(10 * 0.7));
    tower.upgrade();
    expect(tower.getSellValue()).toBeGreaterThan(baseSell);
  });

  it('canFire respects fire rate', () => {
    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 5, 5);
    tower.lastFireTime = 100;
    // Immediately after firing should not be ready
    expect(tower.canFire(100)).toBe(false);
    // After enough time passes
    expect(tower.canFire(100 + 1 / tower.stats.fireRate + 0.01)).toBe(true);
  });
});

describe('Enemy Definitions', () => {
  it('has 11 enemy types', () => {
    expect(Object.keys(ENEMY_DEFINITIONS).length).toBe(11);
  });
});

describe('EnemyInstance', () => {
  it('takes physical damage with armor', () => {
    const enemy = createEnemy(EnemyType.Armored, 'e1', 0, 0, 1);
    const startHp = enemy.currentHealth;
    enemy.takeDamage(100, 'physical');
    // Armored has 0.50 armor, so 50 damage, min 1
    expect(enemy.currentHealth).toBe(startHp - 50);
  });

  it('takes magic damage with resist', () => {
    const enemy = createEnemy(EnemyType.MagicResist, 'e1', 0, 0, 1);
    const startHp = enemy.currentHealth;
    enemy.takeDamage(100, 'magic');
    expect(enemy.currentHealth).toBe(startHp - 50);
  });

  it('always deals at least 1 damage', () => {
    const enemy = createEnemy(EnemyType.Armored, 'e1', 0, 0, 1);
    const startHp = enemy.currentHealth;
    enemy.takeDamage(1, 'physical');
    expect(enemy.currentHealth).toBe(startHp - 1);
  });

  it('execute threshold works', () => {
    const enemy = createEnemy(EnemyType.Basic, 'e1', 0, 0, 1);
    enemy.currentHealth = 1;
    expect(enemy.checkExecute(0.10)).toBe(true);
    enemy.currentHealth = enemy.stats.maxHealth;
    expect(enemy.checkExecute(0.10)).toBe(false);
  });

  it('berserker speeds up when hit', () => {
    const enemy = createEnemy(EnemyType.Berserker, 'e1', 0, 0, 1);
    const baseSpeed = enemy.getEffectiveSpeed();
    enemy.hitsTaken = 10;
    expect(enemy.getEffectiveSpeed()).toBeGreaterThan(baseSpeed);
  });

  it('splitter has split config', () => {
    const enemy = createEnemy(EnemyType.Splitter, 'e1', 0, 0, 1);
    expect(enemy.stats.splitInto).toBe('basic');
    expect(enemy.stats.splitCount).toBe(2);
  });
});

describe('Wave Generation', () => {
  it('generates 40 waves without error', () => {
    for (let i = 1; i <= 40; i++) {
      const wave = generateWave(i, 1);
      expect(wave.waveNumber).toBe(i);
      expect(wave.enemies.length).toBeGreaterThan(0);
      const total = wave.enemies.reduce((s, [, c]) => s + c, 0);
      expect(total).toBeGreaterThan(0);
    }
  });

  it('boss waves at 10/20/30/40', () => {
    for (const n of [10, 20, 30, 40]) {
      const wave = generateWave(n, 1);
      expect(wave.properties?.tags).toContain('boss');
    }
  });

  it('scales with player count', () => {
    const w1 = generateWave(5, 1);
    const w4 = generateWave(5, 4);
    const total1 = w1.enemies.reduce((s, [, c]) => s + c, 0);
    const total4 = w4.enemies.reduce((s, [, c]) => s + c, 0);
    expect(total4).toBeGreaterThan(total1);
  });
});

describe('Governor', () => {
  it('has 8 governors', () => {
    expect(Object.keys(GOVERNORS).length).toBe(8);
  });

  it('getAvailableTowers includes common + governor towers', () => {
    const towers = getAvailableTowers('fire');
    expect(towers).toContain('arrow');
    expect(towers).toContain('fire_arrow');
    expect(towers).toContain('volcano');
    expect(towers.length).toBe(7); // 3 common + 4 fire
  });

  it('getRegularTowers excludes ultimate', () => {
    const towers = getRegularTowers('fire');
    expect(towers).not.toContain('volcano');
    expect(towers.length).toBe(6); // 3 common + 3 regular
  });

  it('isUltimateTower identifies ultimates', () => {
    expect(isUltimateTower('volcano')).toBe(true);
    expect(isUltimateTower('arrow')).toBe(false);
    expect(isUltimateTower('fire_arrow')).toBe(false);
  });
});

describe('Economy', () => {
  it('calculates interest', () => {
    expect(calculateInterest(1000, 0.01)).toBe(10);
    // Cap scales with wave: base 100 + wave * 10
    expect(calculateInterest(100000, 0.01, 0)).toBe(100); // wave 0, cap = 100
    expect(calculateInterest(100000, 0.01, 20)).toBe(300); // wave 20, cap = 100 + 200 = 300
    expect(calculateInterest(100000, 0.01, 40)).toBe(500); // wave 40, cap = 100 + 400 = 500
  });

  it('awards lumber every 5 waves', () => {
    expect(shouldAwardLumber(5)).toBe(true);
    expect(shouldAwardLumber(10)).toBe(true);
    expect(shouldAwardLumber(3)).toBe(false);
    expect(shouldAwardLumber(0)).toBe(false);
  });

  it('has 5 tech upgrades', () => {
    expect(Object.keys(TECH_UPGRADES).length).toBe(5);
  });
});

describe('Player', () => {
  it('buys tech with lumber', () => {
    const p = new Player('p1', 'Test', 0);
    p.lumber = 3;
    expect(p.buyTech('forge_weapons')).toBe(true);
    expect(p.lumber).toBe(2);
    expect(p.globalDamageMult).toBeCloseTo(1.1);
  });

  it('cannot buy tech without lumber', () => {
    const p = new Player('p1', 'Test', 0);
    p.lumber = 0;
    expect(p.buyTech('forge_weapons')).toBe(false);
  });

  it('cannot exceed max stacks', () => {
    const p = new Player('p1', 'Test', 0);
    p.lumber = 10;
    expect(p.buyTech('forge_weapons')).toBe(true);
    expect(p.buyTech('forge_weapons')).toBe(true);
    expect(p.buyTech('forge_weapons')).toBe(true);
    expect(p.buyTech('forge_weapons')).toBe(false); // max 3
  });
});

describe('GameState', () => {
  it('creates and adds players', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice');
    expect(p).not.toBeNull();
    expect(gs.players.size).toBe(1);
    expect(p!.slot).toBe(0);
  });

  it('selects governor', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    expect(gs.selectGovernor('p1', 'fire')).toBe(true);
    expect(gs.players.get('p1')!.governor).toBe('fire');
  });

  it('places and sells towers', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    const tower = gs.placeTower('p1', 5, 5, TowerType.Arrow);
    expect(tower).not.toBeNull();
    expect(gs.towers.size).toBe(1);
    expect(gs.occupancyGrid.isBlocked(5, 5)).toBe(true);

    const sold = gs.sellTower('p1', tower!.towerId);
    expect(sold).toBe(true);
    expect(gs.towers.size).toBe(0);
    expect(gs.occupancyGrid.isBlocked(5, 5)).toBe(false);
  });

  it('rejects tower on blocked path', () => {
    const gs = new GameState();
    gs.updateSettings({ mapSize: 'small' });
    gs.addPlayer('p1', 'Alice');
    // spawn is (0,7) on small map — can't place on spawn
    const [canPlace] = gs.canPlaceTower('p1', 0, 7, TowerType.Arrow);
    expect(canPlace).toBe(false); // Can't place on spawn
  });

  it('starts game and wave', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.setPlayerReady('p1', true);
    gs.startGame();
    expect(gs.phase).toBe(GamePhase.Playing);
    const wave = gs.startNextWave();
    expect(wave.waveNumber).toBe(1);
    expect(gs.phase).toBe(GamePhase.WaveActive);
  });

  it('upgrades tower', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice')!;
    p.money = 1000;
    gs.selectGovernor('p1', 'fire');
    const tower = gs.placeTower('p1', 5, 5, TowerType.Arrow)!;
    expect(gs.upgradeTower('p1', tower.towerId)).toBe(true);
    expect(tower.level).toBe(2);
  });

  it('serializes and deserializes', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    const snapshot = gs.serialize();
    expect(snapshot.phase).toBe('lobby');
    expect(snapshot.players['p1'].name).toBe('Alice');
    expect(snapshot.map.width).toBe(80);
  });
});

describe('GameLoop', () => {
  it('ticks without error when idle', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    const loop = new GameLoop(gs);
    // Should not throw
    loop.tick(0.05);
    loop.tick(0.05);
  });

  it('spawns enemies during wave', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    const wave = gs.startNextWave();
    // Manually set lastSpawnTime to past so spawning triggers
    wave.lastSpawnTime = 0;

    const loop = new GameLoop(gs);
    loop.tick(0.05);
    // Should have spawned at least one enemy
    expect(gs.enemies.size).toBeGreaterThan(0);
  });
});

// =====================================================================
// NEW TESTS: Chain Lightning, Abilities, Splitters, Synergies, Auras,
//            Poison Anti-Heal, Wave Mutators, Daily Challenge
// =====================================================================

/** Helper: set up a game state with one player in wave-active phase */
function setupGameInWave(governor = 'fire'): { gs: GameState; loop: GameLoop; playerId: string } {
  const gs = new GameState();
  const p = gs.addPlayer('p1', 'Alice')!;
  p.money = 100000;
  gs.selectGovernor('p1', governor);
  gs.startGame();
  // Start wave manually to get into WaveActive phase
  gs.startNextWave();
  // Clear spawned enemies so we control them manually
  gs.enemies.clear();
  gs.currentWave!.completed = true;
  const loop = new GameLoop(gs);
  return { gs, loop, playerId: 'p1' };
}

describe('Chain Lightning', () => {
  it('chain hits nearby enemies', () => {
    const { gs, loop } = setupGameInWave('thunder');
    const player = gs.players.get('p1')!;

    // Place a Spark tower (chainCount=1)
    const tower = new TowerInstance('t1', TowerType.Spark, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    // Create two enemies nearby
    const e1 = createEnemy(EnemyType.Basic, 'e1', 10.05, 10.05, 1);
    e1.stats = { ...e1.stats, maxHealth: 10000 };
    e1.currentHealth = 10000;
    const e2 = createEnemy(EnemyType.Basic, 'e2', 11, 10, 1);
    e2.stats = { ...e2.stats, maxHealth: 10000 };
    e2.currentHealth = 10000;
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);

    // Create projectile that hits e1 and chains to e2
    const proj = createProjectile('p1', tower, 'e1', e1.x, e1.y, tower.stats.damage);
    proj.x = e1.x;
    proj.y = e1.y;
    gs.projectiles.set('p1', proj);

    const e2HpBefore = e2.currentHealth;
    loop.tick(0.016); // small tick to process projectile hit

    // e2 should have taken chain damage
    expect(e2.currentHealth).toBeLessThan(e2HpBefore);
  });

  it('chain damage decays per hop', () => {
    const { gs, loop } = setupGameInWave('thunder');

    const tower = new TowerInstance('t1', TowerType.Lightning, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    // Create 4 enemies in a line, all within CHAIN_RANGE of impact point
    const enemies: EnemyInstance[] = [];
    for (let i = 0; i < 4; i++) {
      const e = createEnemy(EnemyType.Basic, `e${i}`, 10.05 + i * 1.5, 10, 1);
      e.stats = { ...e.stats, maxHealth: 50000 };
      e.currentHealth = 50000;
      gs.enemies.set(`e${i}`, e);
      enemies.push(e);
    }

    const baseDamage = tower.stats.damage;
    const proj = createProjectile('proj1', tower, 'e0', enemies[0].x, enemies[0].y, baseDamage);
    proj.x = enemies[0].x;
    proj.y = enemies[0].y;
    gs.projectiles.set('proj1', proj);

    const hpBefore = enemies.map(e => e.currentHealth);
    loop.tick(0.016);

    // Chain targets get decaying damage: baseDamage * 0.6 * 0.7^i
    const chain0Dmg = Math.floor(baseDamage * CHAIN_INITIAL_MULT * Math.pow(CHAIN_DECAY_MULT, 0));
    const chain1Dmg = Math.floor(baseDamage * CHAIN_INITIAL_MULT * Math.pow(CHAIN_DECAY_MULT, 1));

    // First chain target (e1) takes more than second chain target (e2)
    const e1Loss = hpBefore[1] - enemies[1].currentHealth;
    const e2Loss = hpBefore[2] - enemies[2].currentHealth;
    expect(e1Loss).toBeGreaterThan(e2Loss);
  });

  it('chain respects CHAIN_RANGE', () => {
    const { gs, loop } = setupGameInWave('thunder');

    const tower = new TowerInstance('t1', TowerType.Spark, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    const e1 = createEnemy(EnemyType.Basic, 'e1', 10.05, 10.05, 1);
    e1.stats = { ...e1.stats, maxHealth: 10000 };
    e1.currentHealth = 10000;
    // e2 is beyond CHAIN_RANGE (4.0 cells)
    const e2 = createEnemy(EnemyType.Basic, 'e2', 10 + CHAIN_RANGE + 2, 10, 1);
    e2.stats = { ...e2.stats, maxHealth: 10000 };
    e2.currentHealth = 10000;
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);

    const proj = createProjectile('p1', tower, 'e1', e1.x, e1.y, tower.stats.damage);
    proj.x = e1.x;
    proj.y = e1.y;
    gs.projectiles.set('p1', proj);

    const e2HpBefore = e2.currentHealth;
    loop.tick(0.016);

    // e2 should NOT have taken any chain damage (too far)
    expect(e2.currentHealth).toBe(e2HpBefore);
  });

  it('chain skips dead enemies', () => {
    const { gs, loop } = setupGameInWave('thunder');

    const tower = new TowerInstance('t1', TowerType.Spark, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    const e1 = createEnemy(EnemyType.Basic, 'e1', 10.05, 10.05, 1);
    e1.stats = { ...e1.stats, maxHealth: 10000 };
    e1.currentHealth = 10000;
    const e2 = createEnemy(EnemyType.Basic, 'e2', 11, 10, 1);
    e2.isAlive = false; // already dead
    e2.currentHealth = 0;
    const e3 = createEnemy(EnemyType.Basic, 'e3', 12, 10, 1);
    e3.stats = { ...e3.stats, maxHealth: 10000 };
    e3.currentHealth = 10000;
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);
    gs.enemies.set('e3', e3);

    const proj = createProjectile('p1', tower, 'e1', e1.x, e1.y, tower.stats.damage);
    proj.x = e1.x;
    proj.y = e1.y;
    gs.projectiles.set('p1', proj);

    const e3HpBefore = e3.currentHealth;
    loop.tick(0.016);

    // Chain should skip dead e2 and hit e3
    expect(e3.currentHealth).toBeLessThan(e3HpBefore);
  });

  it('chain stun applies at half duration', () => {
    const { gs, loop } = setupGameInWave('thunder');

    // Tempest has chainCount=8 and stunDuration=0.3
    const tower = new TowerInstance('t1', TowerType.Tempest, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    const e1 = createEnemy(EnemyType.Basic, 'e1', 10.05, 10.05, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    const e2 = createEnemy(EnemyType.Basic, 'e2', 11, 10, 1);
    e2.stats = { ...e2.stats, maxHealth: 50000 };
    e2.currentHealth = 50000;
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);

    const proj = createProjectile('proj1', tower, 'e1', e1.x, e1.y, tower.stats.damage);
    proj.x = e1.x;
    proj.y = e1.y;
    gs.projectiles.set('proj1', proj);

    loop.tick(0.016);

    const now = Date.now() / 1000;
    // Primary target gets full stun
    expect(e1.stunEndTime).toBeGreaterThan(now);
    // Chain target gets half stun duration
    if (e2.stunEndTime > 0) {
      const primaryStunRemaining = e1.stunEndTime - now;
      const chainStunRemaining = e2.stunEndTime - now;
      expect(chainStunRemaining).toBeLessThanOrEqual(primaryStunRemaining);
    }
  });
});

describe('Governor Abilities', () => {
  it('Meteor Strike deals magic AoE damage', () => {
    const { gs, loop } = setupGameInWave('fire');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 20, 20, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    gs.enemies.set('e1', e1);

    gs.useAbility('p1', 20, 20);
    loop.tick(0.05);

    // Meteor Strike deals 300 magic damage
    expect(e1.currentHealth).toBeLessThan(50000);
    expect(50000 - e1.currentHealth).toBe(300);
  });

  it('Meteor Strike does not affect enemies outside radius', () => {
    const { gs, loop } = setupGameInWave('fire');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 30, 30, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    gs.enemies.set('e1', e1);

    // Target far from enemy (radius 4)
    gs.useAbility('p1', 10, 10);
    loop.tick(0.05);

    expect(e1.currentHealth).toBe(50000);
  });

  it('Blizzard applies slow and stun', () => {
    const { gs, loop } = setupGameInWave('ice');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 20, 20, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    gs.enemies.set('e1', e1);

    gs.useAbility('p1', 20, 20);
    loop.tick(0.05);

    expect(e1.slowMultiplier).toBeLessThan(1.0);
    const now = Date.now() / 1000;
    expect(e1.stunEndTime).toBeGreaterThan(now);
  });

  it('Chain Storm deals damage to random enemies', () => {
    const { gs, loop } = setupGameInWave('thunder');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    // Create 15 enemies
    for (let i = 0; i < 15; i++) {
      const e = createEnemy(EnemyType.Basic, `e${i}`, 10 + i, 10, 1);
      e.stats = { ...e.stats, maxHealth: 50000 };
      e.currentHealth = 50000;
      gs.enemies.set(`e${i}`, e);
    }

    gs.useAbility('p1');
    loop.tick(0.05);

    // Should hit up to 10 enemies
    let damaged = 0;
    for (const e of gs.enemies.values()) {
      if (e.currentHealth < 50000) damaged++;
    }
    expect(damaged).toBeLessThanOrEqual(10);
    expect(damaged).toBeGreaterThan(0);
  });

  it('Plague Cloud applies poison', () => {
    const { gs, loop } = setupGameInWave('poison');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 20, 20, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    gs.enemies.set('e1', e1);

    gs.useAbility('p1', 20, 20);
    loop.tick(0.05);

    expect(e1.poisonDamage).toBe(30);
    expect(e1.poisonEndTime).toBeGreaterThan(0);
  });

  it('Reap kills enemies at or below 15% HP', () => {
    const { gs, loop } = setupGameInWave('death');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 10, 10, 1);
    e1.stats = { ...e1.stats, maxHealth: 1000 };
    e1.currentHealth = 100; // 10% — should die
    const e2 = createEnemy(EnemyType.Basic, 'e2', 12, 10, 1);
    e2.stats = { ...e2.stats, maxHealth: 1000 };
    e2.currentHealth = 500; // 50% — should survive
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);

    gs.useAbility('p1');
    loop.tick(0.05);

    expect(e1.isAlive).toBe(false);
    expect(e2.isAlive).toBe(true);
  });

  it('Overgrowth stuns all enemies', () => {
    const { gs, loop } = setupGameInWave('nature');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 10, 10, 1);
    const e2 = createEnemy(EnemyType.Basic, 'e2', 30, 30, 1);
    gs.enemies.set('e1', e1);
    gs.enemies.set('e2', e2);

    gs.useAbility('p1');
    loop.tick(0.05);

    const now = Date.now() / 1000;
    expect(e1.stunEndTime).toBeGreaterThan(now);
    expect(e2.stunEndTime).toBeGreaterThan(now);
  });

  it('Mana Bomb deals magic AoE', () => {
    const { gs, loop } = setupGameInWave('arcane');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    const e1 = createEnemy(EnemyType.Basic, 'e1', 20, 20, 1);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    gs.enemies.set('e1', e1);

    gs.useAbility('p1', 20, 20);
    loop.tick(0.05);

    // Mana Bomb deals 400 magic damage
    expect(50000 - e1.currentHealth).toBe(400);
  });

  it('Divine Intervention heals lives and buffs damage', () => {
    const { gs, loop } = setupGameInWave('holy');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;
    gs.sharedLives = 20;

    gs.useAbility('p1');
    loop.tick(0.05);

    expect(gs.sharedLives).toBe(25); // +5
    expect(player.abilityDamageBuffMult).toBeCloseTo(1.2);
  });

  it('cooldown prevents reuse', () => {
    const { gs } = setupGameInWave('fire');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    expect(gs.useAbility('p1', 10, 10)).toBe(true);
    // Immediately try again
    expect(gs.useAbility('p1', 10, 10)).toBe(false);
  });

  it('point AoE requires coordinates', () => {
    const { gs } = setupGameInWave('fire');
    const player = gs.players.get('p1')!;
    player.abilityCooldownEnd = 0;

    // Fire is point_aoe — should fail without coords
    expect(gs.useAbility('p1')).toBe(false);
  });
});

describe('Splitter Enemies', () => {
  it('splitter spawns children on death', () => {
    const { gs, loop } = setupGameInWave();

    const splitter = createEnemy(EnemyType.Splitter, 'sp1', 10, 10, 1);
    splitter.stats = { ...splitter.stats, maxHealth: 10 };
    splitter.currentHealth = 10;
    splitter.pathIndex = 3;
    gs.enemies.set('sp1', splitter);

    // Kill it via damage
    splitter.takeDamage(100, 'physical');

    // Simulate _onEnemyKilled through a loop tick (which processes dead enemies)
    // Instead, directly test via a tower projectile kill
    // Reset: use a fresh approach
    gs.enemies.clear();

    const sp2 = createEnemy(EnemyType.Splitter, 'sp2', 10, 10, 5);
    sp2.stats = { ...sp2.stats, maxHealth: 1 };
    sp2.currentHealth = 1;
    sp2.pathIndex = 2;
    gs.enemies.set('sp2', sp2);

    // Place a tower that will kill it
    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 10, 10);
    gs.towers.set('t1', tower);

    const proj = createProjectile('proj1', tower, 'sp2', sp2.x, sp2.y, 1000);
    proj.x = sp2.x;
    proj.y = sp2.y;
    gs.projectiles.set('proj1', proj);

    loop.tick(0.016);

    // Should have spawned 2 basic children (splitter has splitCount=2, splitInto='basic')
    const children = [...gs.enemies.values()].filter(e => e.enemyType === EnemyType.Basic);
    expect(children.length).toBe(2);
  });

  it('children inherit wave/path state', () => {
    const { gs, loop } = setupGameInWave();

    const sp = createEnemy(EnemyType.Splitter, 'sp1', 15, 15, 7);
    sp.stats = { ...sp.stats, maxHealth: 1 };
    sp.currentHealth = 1;
    sp.pathIndex = 4;
    gs.enemies.set('sp1', sp);

    const tower = new TowerInstance('t1', TowerType.Arrow, 'p1', 15, 15);
    gs.towers.set('t1', tower);

    const proj = createProjectile('proj1', tower, 'sp1', sp.x, sp.y, 1000);
    proj.x = sp.x;
    proj.y = sp.y;
    gs.projectiles.set('proj1', proj);

    loop.tick(0.016);

    const children = [...gs.enemies.values()].filter(e => e.enemyType === EnemyType.Basic);
    expect(children.length).toBe(2);
    for (const child of children) {
      expect(child.waveNumber).toBe(7);
      expect(child.pathIndex).toBe(4);
    }
  });

  it('children do not split further', () => {
    const basic = createEnemy(EnemyType.Basic, 'b1', 0, 0, 1);
    expect(basic.stats.splitInto).toBeNull();
    expect(basic.stats.splitCount).toBe(0);
  });
});

describe('Synergies', () => {
  it('adjacent towers of different governors activate synergy', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice')!;
    p.money = 100000;
    gs.selectGovernor('p1', 'fire');

    // Place a fire tower and a nature tower adjacent (wildfire synergy: fire+nature)
    const t1 = new TowerInstance('t1', TowerType.FireArrow, 'p1', 10, 10);
    const t2 = new TowerInstance('t2', TowerType.Thorn, 'p1', 11, 10); // adjacent
    gs.towers.set('t1', t1);
    gs.towers.set('t2', t2);

    gs.recalculateSynergies();

    expect(t1.activeSynergies).toContain('wildfire');
    expect(t2.activeSynergies).toContain('wildfire');
  });

  it('non-adjacent towers do not activate synergy', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');

    const t1 = new TowerInstance('t1', TowerType.FireArrow, 'p1', 10, 10);
    const t2 = new TowerInstance('t2', TowerType.Thorn, 'p1', 15, 15); // far away
    gs.towers.set('t1', t1);
    gs.towers.set('t2', t2);

    gs.recalculateSynergies();

    expect(t1.activeSynergies).toHaveLength(0);
    expect(t2.activeSynergies).toHaveLength(0);
  });

  it('same-governor adjacency does not activate synergy', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');

    const t1 = new TowerInstance('t1', TowerType.FireArrow, 'p1', 10, 10);
    const t2 = new TowerInstance('t2', TowerType.Inferno, 'p1', 11, 10); // both fire
    gs.towers.set('t1', t1);
    gs.towers.set('t2', t2);

    gs.recalculateSynergies();

    expect(t1.activeSynergies).toHaveLength(0);
    expect(t2.activeSynergies).toHaveLength(0);
  });

  it('wildfire synergy increases splash radius multiplier', () => {
    const wildfire = SYNERGY_DEFINITIONS.find(s => s.id === 'wildfire');
    expect(wildfire).toBeDefined();
    expect(wildfire!.splashRadiusMult).toBe(1.15);
  });
});

describe('Aura Towers', () => {
  it('aura tower buffs nearby tower damage and speed', () => {
    const { gs, loop } = setupGameInWave('holy');

    // AuraTower has auraRange=5, auraDamageBoost=0.15, auraSpeedBoost=0.10
    const aura = new TowerInstance('aura', TowerType.AuraTower, 'p1', 10, 10);
    const target = new TowerInstance('target', TowerType.Arrow, 'p1', 12, 10); // dist=2, within range
    gs.towers.set('aura', aura);
    gs.towers.set('target', target);

    loop.tick(0.016);

    expect(target.auraDamageMult).toBeCloseTo(1.0 + aura.stats.auraDamageBoost);
    expect(target.auraFireRateMult).toBeCloseTo(1.0 + aura.stats.auraSpeedBoost);
  });

  it('aura does not buff self', () => {
    const { gs, loop } = setupGameInWave('holy');

    const aura = new TowerInstance('aura', TowerType.AuraTower, 'p1', 10, 10);
    gs.towers.set('aura', aura);

    loop.tick(0.016);

    // Self should remain at 1.0
    expect(aura.auraDamageMult).toBeCloseTo(1.0);
    expect(aura.auraFireRateMult).toBeCloseTo(1.0);
  });

  it('aura caps at MAX_AURA_DAMAGE_MULT and MAX_AURA_SPEED_MULT', () => {
    const { gs, loop } = setupGameInWave('holy');

    const target = new TowerInstance('target', TowerType.Arrow, 'p1', 10, 10);
    gs.towers.set('target', target);

    // Stack many aura towers
    for (let i = 0; i < 20; i++) {
      const a = new TowerInstance(`a${i}`, TowerType.AuraTower, 'p1', 10 + (i % 5 === 0 ? 1 : 0), 10 + (i % 5));
      // Force them close enough
      a.stats = { ...a.stats, auraRange: 100 };
      gs.towers.set(`a${i}`, a);
    }

    loop.tick(0.016);

    expect(target.auraDamageMult).toBeLessThanOrEqual(MAX_AURA_DAMAGE_MULT);
    expect(target.auraFireRateMult).toBeLessThanOrEqual(MAX_AURA_SPEED_MULT);
  });

  it('out-of-range tower not buffed', () => {
    const { gs, loop } = setupGameInWave('holy');

    const aura = new TowerInstance('aura', TowerType.AuraTower, 'p1', 10, 10);
    const far = new TowerInstance('far', TowerType.Arrow, 'p1', 30, 30);
    gs.towers.set('aura', aura);
    gs.towers.set('far', far);

    loop.tick(0.016);

    expect(far.auraDamageMult).toBeCloseTo(1.0);
    expect(far.auraFireRateMult).toBeCloseTo(1.0);
  });
});

describe('Poison Anti-Heal', () => {
  it('healer heals at full rate without poison', () => {
    const healer = createEnemy(EnemyType.Healer, 'h1', 0, 0, 1);
    healer.currentHealth = healer.stats.maxHealth - 20;
    const hpBefore = healer.currentHealth;
    healer.updateHeal(1.0);
    // healPerSecond = 5, so should heal 5 HP
    expect(healer.currentHealth).toBeGreaterThan(hpBefore);
    expect(healer.currentHealth - hpBefore).toBe(5);
  });

  it('poison halves healing rate', () => {
    const healer = createEnemy(EnemyType.Healer, 'h1', 0, 0, 1);
    healer.currentHealth = healer.stats.maxHealth - 20;
    healer.poisonDamage = 10; // non-zero = poisoned
    healer.poisonEndTime = Date.now() / 1000 + 999;
    const hpBefore = healer.currentHealth;
    healer.updateHeal(1.0);
    // With POISON_ANTI_HEAL=0.5, healing = 5 * (1-0.5) = 2.5, floored = 2
    expect(healer.currentHealth - hpBefore).toBe(2);
  });

  it('no over-healing past maxHealth', () => {
    const healer = createEnemy(EnemyType.Healer, 'h1', 0, 0, 1);
    healer.currentHealth = healer.stats.maxHealth;
    healer.updateHeal(10.0);
    expect(healer.currentHealth).toBe(healer.stats.maxHealth);
  });
});

describe('Wave Mutators', () => {
  it('swift mutator increases speed', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();

    // Manually create a wave with swift mutator
    gs.waveNumber = 6;
    gs.currentWave = generateWave(6, 1);
    gs.currentWave.properties = { name: 'Test', tags: [], mutators: ['swift'] };
    gs.currentWave.started = true;
    gs.currentWave.lastSpawnTime = 0;
    gs.phase = GamePhase.WaveActive;

    const spawned = gs.spawnEnemyFromWave(Date.now() / 1000);
    expect(spawned).not.toBeNull();

    const baseSpeed = ENEMY_DEFINITIONS[spawned!.enemyType].speed;
    // Difficulty speedMult = 1.0, swift = 1.25x
    expect(spawned!.stats.speed).toBeCloseTo(baseSpeed * 1.25, 1);
  });

  it('fortified mutator increases HP', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();

    gs.waveNumber = 6;
    gs.currentWave = generateWave(6, 1);
    gs.currentWave.properties = { name: 'Test', tags: [], mutators: ['fortified'] };
    gs.currentWave.started = true;
    gs.currentWave.lastSpawnTime = 0;
    gs.phase = GamePhase.WaveActive;

    const spawned = gs.spawnEnemyFromWave(Date.now() / 1000);
    expect(spawned).not.toBeNull();

    // HP should be base * wave scaling * 1.3
    expect(spawned!.currentHealth).toBe(spawned!.stats.maxHealth);
    // The fortified multiplier should result in roughly 1.3x more HP than base
    const baseMaxHp = createEnemy(spawned!.enemyType, 'test', 0, 0, 6).stats.maxHealth;
    expect(spawned!.stats.maxHealth).toBe(Math.floor(baseMaxHp * 1.3));
  });

  it('swarm mutator halves HP', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();

    gs.waveNumber = 6;
    gs.currentWave = generateWave(6, 1);
    gs.currentWave.properties = { name: 'Test', tags: [], mutators: ['swarm'] };
    gs.currentWave.started = true;
    gs.currentWave.lastSpawnTime = 0;
    gs.phase = GamePhase.WaveActive;

    const spawned = gs.spawnEnemyFromWave(Date.now() / 1000);
    expect(spawned).not.toBeNull();

    const baseMaxHp = createEnemy(spawned!.enemyType, 'test', 0, 0, 6).stats.maxHealth;
    expect(spawned!.stats.maxHealth).toBe(Math.floor(baseMaxHp * 0.5));
  });

  it('regenerating mutator adds heal per second', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();

    gs.waveNumber = 6;
    gs.currentWave = generateWave(6, 1);
    gs.currentWave.properties = { name: 'Test', tags: [], mutators: ['regenerating'] };
    gs.currentWave.started = true;
    gs.currentWave.lastSpawnTime = 0;
    gs.phase = GamePhase.WaveActive;

    const spawned = gs.spawnEnemyFromWave(Date.now() / 1000);
    expect(spawned).not.toBeNull();

    const baseHps = ENEMY_DEFINITIONS[spawned!.enemyType].healPerSecond;
    expect(spawned!.stats.healPerSecond).toBe(baseHps + 2);
  });

  it('shielded mutator adds armor', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();

    gs.waveNumber = 6;
    gs.currentWave = generateWave(6, 1);
    gs.currentWave.properties = { name: 'Test', tags: [], mutators: ['shielded'] };
    gs.currentWave.started = true;
    gs.currentWave.lastSpawnTime = 0;
    gs.phase = GamePhase.WaveActive;

    const spawned = gs.spawnEnemyFromWave(Date.now() / 1000);
    expect(spawned).not.toBeNull();

    const baseArmor = ENEMY_DEFINITIONS[spawned!.enemyType].armor;
    expect(spawned!.stats.armor).toBeCloseTo(baseArmor + 0.15);
  });

  it('mutators only roll for waves >= MUTATOR_START_WAVE', () => {
    // Waves 1-4 should never have mutators (unless forced)
    for (let i = 1; i < MUTATOR_START_WAVE; i++) {
      const wave = generateWave(i, 1);
      expect(wave.properties?.mutators ?? []).toHaveLength(0);
    }
  });
});

describe('Seeded RNG & Daily Challenge', () => {
  it('SeededRNG produces deterministic sequence', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('dateSeed produces consistent hash for same date', () => {
    expect(dateSeed('2026-02-22')).toBe(dateSeed('2026-02-22'));
    expect(dateSeed('2026-02-22')).not.toBe(dateSeed('2026-02-23'));
  });

  it('generateDailyChallenge returns identical config for same date', () => {
    const c1 = generateDailyChallenge('2026-02-22');
    const c2 = generateDailyChallenge('2026-02-22');
    expect(c1.mapSize).toBe(c2.mapSize);
    expect(c1.mapLayout).toBe(c2.mapLayout);
    expect(c1.difficulty).toBe(c2.difficulty);
    expect(c1.featuredGovernor).toBe(c2.featuredGovernor);
    expect(c1.waveMutators).toEqual(c2.waveMutators);
  });

  it('generateDailyChallenge returns different config for different dates', () => {
    const c1 = generateDailyChallenge('2026-01-01');
    const c2 = generateDailyChallenge('2026-06-15');
    // They could theoretically match, but testing many fields makes collision unlikely
    const same = c1.mapSize === c2.mapSize && c1.mapLayout === c2.mapLayout &&
      c1.difficulty === c2.difficulty && c1.featuredGovernor === c2.featuredGovernor;
    // At least one field should differ
    expect(same).toBe(false);
  });
});

// =====================================================================
// NEW TESTS: Endless Mode, Speed Multiplier, Challenge Modifiers
// =====================================================================

describe('Endless Mode', () => {
  it('checkVictory returns false in endless mode', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    gs.endlessMode = true;

    // Simulate reaching wave 40 with no enemies
    gs.waveNumber = 40;
    gs.enemies.clear();
    expect(gs.checkVictory()).toBe(false);
    expect(gs.phase).not.toBe(GamePhase.Victory);
  });

  it('generates waves past 40 without error', () => {
    for (let i = 41; i <= 60; i++) {
      const wave = generateWave(i, 1);
      expect(wave.waveNumber).toBe(i);
      expect(wave.enemies.length).toBeGreaterThan(0);
      const total = wave.enemies.reduce((s, [, c]) => s + c, 0);
      expect(total).toBeGreaterThan(0);
    }
  });

  it('generates boss at wave 50 with named wave', () => {
    const wave = generateWave(50, 1);
    expect(wave.properties?.tags).toContain('boss');
    expect(wave.enemies.some(([t]) => t === EnemyType.Boss)).toBe(true);
    expect(wave.properties?.name).toBe('The Eternal');
  });
});

describe('Speed Multiplier', () => {
  it('setSpeed clamps between 1 and 3', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    const loop = new GameLoop(gs);

    loop.setSpeed(2);
    expect(loop.speedMultiplier).toBe(2);
    loop.setSpeed(5);
    expect(loop.speedMultiplier).toBe(3);
    loop.setSpeed(0);
    expect(loop.speedMultiplier).toBe(1);
  });

  it('tick applies speed multiplier to simulation', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    gs.startNextWave();
    gs.enemies.clear();

    // Place an enemy that will move
    const e1 = createEnemy(EnemyType.Basic, 'e1', 5, 5, 1, gs.pathVersion);
    e1.stats = { ...e1.stats, maxHealth: 50000 };
    e1.currentHealth = 50000;
    e1.pathIndex = 1;
    gs.enemies.set('e1', e1);

    const loop1 = new GameLoop(gs);
    loop1.speedMultiplier = 1;
    const startX1 = e1.x;
    loop1.tick(0.1);
    const move1 = Math.abs(e1.x - startX1) + Math.abs(e1.y - 5);

    // Reset enemy position
    e1.x = 5;
    e1.y = 5;
    e1.pathIndex = 1;

    const loop2 = new GameLoop(gs);
    loop2.speedMultiplier = 2;
    loop2.tick(0.1);
    const move2 = Math.abs(e1.x - 5) + Math.abs(e1.y - 5);

    // 2x speed should move roughly twice as far
    expect(move2).toBeGreaterThan(move1 * 1.5);
  });
});

describe('Challenge Modifiers', () => {
  it('no_sell blocks sell', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice')!;
    p.money = 10000;
    gs.selectGovernor('p1', 'fire');
    gs.activeModifiers = ['no_sell'];

    const tower = gs.placeTower('p1', 5, 5, TowerType.Arrow);
    expect(tower).not.toBeNull();
    const sold = gs.sellTower('p1', tower!.towerId);
    expect(sold).toBe(false);
  });

  it('no_upgrades blocks upgrade', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice')!;
    p.money = 10000;
    gs.selectGovernor('p1', 'fire');
    gs.activeModifiers = ['no_upgrades'];

    const tower = gs.placeTower('p1', 5, 5, TowerType.Arrow);
    expect(tower).not.toBeNull();
    const upgraded = gs.upgradeTower('p1', tower!.towerId);
    expect(upgraded).toBe(false);
  });

  it('glass_cannon sets 10 lives', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.activeModifiers = ['glass_cannon'];
    gs.applyModifiers();
    expect(gs.sharedLives).toBe(10);
  });

  it('poverty sets 100 money', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.activeModifiers = ['poverty'];
    gs.applyModifiers();
    expect(gs.players.get('p1')!.money).toBe(100);
  });

  it('scoreMultiplier calculates correctly', () => {
    const gs = new GameState();
    gs.activeModifiers = [];
    expect(gs.scoreMultiplier).toBe(1.0);

    gs.activeModifiers = ['no_sell'];
    expect(gs.scoreMultiplier).toBe(1.5);

    gs.activeModifiers = ['no_sell', 'glass_cannon'];
    expect(gs.scoreMultiplier).toBeCloseTo(1.95);
  });
});

// ===== FEATURE BATCH 2 TESTS =====

describe('Creep Sending', () => {
  it('deducts cost when sending creeps', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    gs.startNextWave();
    const moneyBefore = gs.players.get('p1')!.money;
    const result = gs.sendCreeps('p1', 'basic', 1);
    expect(result).toBe(true);
    expect(gs.players.get('p1')!.money).toBe(moneyBefore - 20);
  });

  it('rejects when insufficient gold', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    gs.players.get('p1')!.money = 5;
    expect(gs.sendCreeps('p1', 'basic', 1)).toBe(false);
  });

  it('spawns enemies at entrance with sentCreep flag', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    gs.sendCreeps('p1', 'basic', 2);
    const sentEnemies = [...gs.enemies.values()].filter(e => e.isSentCreep);
    expect(sentEnemies.length).toBe(2);
    expect(sentEnemies[0].sentByPlayerId).toBe('p1');
  });

  it('sent creeps do not cause life damage on reaching end', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    gs.sendCreeps('p1', 'basic', 1);
    const loop = new GameLoop(gs);
    const sentEnemy = [...gs.enemies.values()].find(e => e.isSentCreep)!;
    // Simulate enemy reaching end
    const path = gs.sharedPath;
    sentEnemy.pathIndex = path.totalWaypoints - 1;
    const [ex, ey] = path.getEndPosition();
    sentEnemy.x = ex;
    sentEnemy.y = ey;
    const livesBefore = gs.sharedLives;
    loop.tick(0.05);
    expect(gs.sharedLives).toBe(livesBefore);
  });

  it('awards income bonus when sent creep is killed', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    gs.sendCreeps('p1', 'basic', 1);
    const sentEnemy = [...gs.enemies.values()].find(e => e.isSentCreep)!;
    sentEnemy.currentHealth = 0;
    sentEnemy.isAlive = false;
    const loop = new GameLoop(gs);
    const moneyBefore = gs.players.get('p1')!.money;
    loop['_onEnemyKilled'](sentEnemy, []);
    expect(gs.players.get('p1')!.money).toBe(moneyBefore + 8);
  });

  it('rejects locked creep type', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    // berserker unlocks at wave 15
    expect(gs.sendCreeps('p1', 'berserker', 1)).toBe(false);
  });

  it('serializes sent creep fields', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    gs.sendCreeps('p1', 'basic', 1);
    const snap = gs.serialize();
    const sentEnemy = Object.values(snap.enemies).find(e => e.isSentCreep);
    expect(sentEnemy).toBeDefined();
    expect(sentEnemy!.sentByPlayerId).toBe('p1');
  });
});

describe('Upgrade Queue', () => {
  it('adds entry to upgrade queue', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    gs.startNextWave();
    const tower = gs.placeTower('p1', 10, 10, TowerType.Arrow)!;
    expect(gs.queueUpgrade('p1', tower.towerId)).toBe(true);
    expect(gs.upgradeQueue.length).toBe(1);
    expect(gs.upgradeQueue[0].targetLevel).toBe(2);
  });

  it('processes queue when affordable', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    gs.startNextWave();
    const tower = gs.placeTower('p1', 10, 10, TowerType.Arrow)!;
    gs.players.get('p1')!.money = 5000;
    gs.queueUpgrade('p1', tower.towerId);
    gs.processUpgradeQueue();
    expect(tower.level).toBe(2);
    expect(gs.upgradeQueue.length).toBe(0);
  });

  it('skips when not affordable', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.startNextWave();
    const tower = gs.placeTower('p1', 10, 10, TowerType.Arrow)!;
    gs.players.get('p1')!.money = 0;
    gs.queueUpgrade('p1', tower.towerId);
    gs.processUpgradeQueue();
    expect(tower.level).toBe(1);
    expect(gs.upgradeQueue.length).toBe(1);
  });

  it('removes when tower is sold', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    const tower = gs.placeTower('p1', 10, 10, TowerType.Arrow)!;
    gs.queueUpgrade('p1', tower.towerId);
    gs.sellTower('p1', tower.towerId);
    gs.processUpgradeQueue();
    expect(gs.upgradeQueue.length).toBe(0);
  });

  it('caps at max level', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.players.get('p1')!.money = 50000;
    const tower = gs.placeTower('p1', 10, 10, TowerType.Arrow)!;
    // Queue up to max
    gs.queueUpgrade('p1', tower.towerId); // -> 2
    gs.queueUpgrade('p1', tower.towerId); // -> 3
    gs.queueUpgrade('p1', tower.towerId); // -> 4
    expect(gs.queueUpgrade('p1', tower.towerId)).toBe(false); // -> 5 rejected
  });
});

describe('Voting System', () => {
  it('creates a vote', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    const voteId = gs.startVote('p1', 'send_early');
    expect(voteId).not.toBeNull();
    expect(gs.activeVotes.size).toBe(1);
  });

  it('casts a vote', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    const voteId = gs.startVote('p1', 'send_early')!;
    expect(gs.castVote('p2', voteId)).toBe(true);
  });

  it('resolves on majority', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    const voteId = gs.startVote('p1', 'send_early')!;
    gs.castVote('p2', voteId);
    const results = gs.resolveVotes(Date.now() / 1000);
    expect(results.length).toBe(1);
    expect(results[0].passed).toBe(true);
  });

  it('resolves on timeout', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    gs.addPlayer('p3', 'Charlie');
    gs.startVote('p1', 'send_early');
    // Only 1 of 3 voted, not majority, but expired
    const results = gs.resolveVotes(Date.now() / 1000 + 31);
    expect(results.length).toBe(1);
    expect(results[0].passed).toBe(false);
  });

  it('rejects duplicate vote', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    const voteId = gs.startVote('p1', 'send_early')!;
    expect(gs.castVote('p1', voteId)).toBe(false); // already voted (creator auto-votes)
  });
});

describe('Send Gold', () => {
  it('deducts from sender and adds to receiver', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    const p1 = gs.players.get('p1')!;
    const p2 = gs.players.get('p2')!;
    p1.money = 200;
    p2.money = 50;
    expect(gs.sendGold('p1', 'p2', 75)).toBe(true);
    expect(p1.money).toBe(125);
    expect(p2.money).toBe(125);
  });

  it('rejects insufficient funds', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    gs.players.get('p1')!.money = 10;
    expect(gs.sendGold('p1', 'p2', 50)).toBe(false);
    expect(gs.players.get('p1')!.money).toBe(10);
  });

  it('rejects invalid player IDs', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    expect(gs.sendGold('p1', 'nonexistent', 10)).toBe(false);
    expect(gs.sendGold('nonexistent', 'p1', 10)).toBe(false);
  });

  it('rejects sending to self', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.players.get('p1')!.money = 100;
    expect(gs.sendGold('p1', 'p1', 10)).toBe(false);
  });

  it('rejects zero or negative amount', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.addPlayer('p2', 'Bob');
    gs.players.get('p1')!.money = 100;
    expect(gs.sendGold('p1', 'p2', 0)).toBe(false);
    expect(gs.sendGold('p1', 'p2', -5)).toBe(false);
  });
});

describe('Tutorial', () => {
  it('uses simplified waves (5 waves)', () => {
    const gs = new GameState();
    gs.isTutorial = true;
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    const wave = gs.startNextWave();
    expect(wave.enemies.length).toBe(1);
    expect(wave.enemies[0][0]).toBe('basic');
    expect(wave.properties?.tags).toContain('tutorial');
  });

  it('declares victory at wave 5', () => {
    const gs = new GameState();
    gs.isTutorial = true;
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    gs.waveNumber = 5;
    expect(gs.checkVictory()).toBe(true);
    expect(gs.phase).toBe(GamePhase.Victory);
  });

  it('includes isTutorial in serialization', () => {
    const gs = new GameState();
    gs.isTutorial = true;
    const snap = gs.serialize();
    expect(snap.isTutorial).toBe(true);
  });
});

describe('Replay', () => {
  it('records frames at wave boundaries', () => {
    const recorder = new ReplayRecorder();
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    recorder.recordFrame(1, gs.serialize());
    expect(recorder.getFrameCount()).toBe(1);
  });

  it('frame count matches waves', () => {
    const recorder = new ReplayRecorder();
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    recorder.recordFrame(1, gs.serialize());
    recorder.recordFrame(2, gs.serialize());
    recorder.recordFrame(3, gs.serialize());
    expect(recorder.getFrameCount()).toBe(3);
  });

  it('finalize sets result', () => {
    const recorder = new ReplayRecorder();
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.startGame();
    recorder.recordFrame(1, gs.serialize());
    const data = recorder.finalize('victory');
    expect(data.result).toBe('victory');
    expect(data.totalWaves).toBe(1);
  });

  it('replay data has correct settings and players', () => {
    const recorder = new ReplayRecorder();
    const gs = new GameState();
    gs.updateSettings({ difficulty: 'hard', mapSize: 'small' });
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.startGame();
    recorder.recordFrame(1, gs.serialize());
    const data = recorder.finalize('defeat');
    expect(data.settings.difficulty).toBe('hard');
    expect(data.settings.mapSize).toBe('small');
    expect(data.players[0].name).toBe('Alice');
    expect(data.players[0].governor).toBe('fire');
  });

  it('synergy ID round-trip in serialization', () => {
    const gs = new GameState();
    gs.addPlayer('p1', 'Alice');
    gs.selectGovernor('p1', 'fire');
    gs.addPlayer('p2', 'Bob');
    gs.selectGovernor('p2', 'nature');
    gs.startGame();
    // Place fire and nature towers adjacent
    gs.placeTower('p1', 10, 10, TowerType.FireArrow);
    gs.placeTower('p2', 11, 10, TowerType.Thorn);
    const snap = gs.serialize();
    const fireTower = Object.values(snap.towers).find(t => t.towerType === 'fire_arrow');
    expect(fireTower?.activeSynergies).toContain('wildfire');
  });

  it('SYNERGY_DEFINITIONS export integrity', () => {
    expect(SYNERGY_DEFINITIONS.length).toBeGreaterThanOrEqual(6);
    for (const syn of SYNERGY_DEFINITIONS) {
      expect(syn.id).toBeTruthy();
      expect(syn.governors.length).toBe(2);
    }
  });
});
