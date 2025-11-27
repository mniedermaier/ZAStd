import { describe, it, expect } from 'vitest';
import {
  OccupancyGrid, calculateDistance, updateEnemyPosition, Path,
  GameState, TowerType, EnemyType, GamePhase,
  TOWER_DEFINITIONS, ENEMY_DEFINITIONS, generateWave, createEnemy,
  getUpgradeCost, TowerInstance, Player,
  GOVERNORS, getAvailableTowers, getRegularTowers, isUltimateTower,
  TECH_UPGRADES, calculateInterest, shouldAwardLumber,
  GameLoop,
} from '../index';

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
    expect(baseSell).toBe(Math.floor(40 * 0.7));
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
    // Cap scales with wave: base 200 + wave * 20
    expect(calculateInterest(100000, 0.01, 0)).toBe(200); // wave 0, cap = 200
    expect(calculateInterest(100000, 0.01, 20)).toBe(600); // wave 20, cap = 200 + 400 = 600
    expect(calculateInterest(100000, 0.01, 40)).toBe(1000); // wave 40, cap = 200 + 800 = 1000
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
