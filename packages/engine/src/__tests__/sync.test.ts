import { describe, it, expect } from 'vitest';
import {
  GameState, GamePhase, TowerType, GameLoop,
  gameStateFromSnapshot, VALID_MAP_SIZES, VALID_MAP_LAYOUTS,
} from '../index';
import type { GameStateSnapshot } from '../index';

/**
 * Strip wall-clock-derived fields that vary between serialize() calls.
 * These are computed from Date.now() and are expected to differ.
 */
function stripVolatile(snap: GameStateSnapshot): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(snap));
  delete copy.timestamp;
  delete copy.nextWaveCountdown;
  delete copy.manualStartCooldown;
  // currentWave is not reconstructed by gameStateFromSnapshot (wave state
  // is ephemeral during host migration — new host starts fresh spawning)
  delete copy.currentWave;
  // pathVersion counter is not restored (blocked cells are added directly)
  if (copy.map) delete copy.map.pathVersion;
  for (const p of Object.values(copy.players) as Record<string, unknown>[]) {
    delete p.abilityCooldownRemaining;
  }
  return copy;
}

/** Set up a game state with players, towers, and active enemies. */
function createActiveGame(opts: { mapSize?: string; mapLayout?: string } = {}): GameState {
  const gs = new GameState();
  if (opts.mapSize || opts.mapLayout) {
    gs.updateSettings({ mapSize: opts.mapSize, mapLayout: opts.mapLayout });
  }

  // Add two players with governors
  const p1 = gs.addPlayer('p1', 'Alice')!;
  gs.selectGovernor('p1', 'fire');
  const p2 = gs.addPlayer('p2', 'Bob')!;
  gs.selectGovernor('p2', 'ice');

  // Give them money and place towers
  p1.money = 5000;
  p2.money = 5000;

  gs.placeTower('p1', 5, 5, TowerType.Arrow);
  gs.placeTower('p1', 6, 5, TowerType.FireArrow);
  gs.placeTower('p2', 7, 5, TowerType.IceShard);
  gs.placeTower('p2', 8, 5, TowerType.Cannon);

  // Upgrade a tower
  const firstTower = [...gs.towers.values()][0];
  gs.upgradeTower(firstTower.ownerId, firstTower.towerId);

  // Start the game and a wave
  gs.setPlayerReady('p1', true);
  gs.setPlayerReady('p2', true);
  gs.startGame();
  const wave = gs.startNextWave();
  wave.lastSpawnTime = 0;

  // Tick to spawn some enemies
  const loop = new GameLoop(gs);
  loop.tick(0.05);
  loop.tick(0.5);
  loop.tick(0.5);

  return gs;
}

describe('Multiplayer Sync', () => {
  it('round-trip preserves game state', () => {
    const gs = createActiveGame();
    const snapshot = gs.serialize();
    const restored = gameStateFromSnapshot(snapshot);

    // Core state
    expect(restored.phase).toBe(gs.phase);
    expect(restored.waveNumber).toBe(gs.waveNumber);
    expect(restored.sharedLives).toBe(gs.sharedLives);
    expect(restored.mapSize).toBe(gs.mapSize);
    expect(restored.mapLayout).toBe(gs.mapLayout);
    expect(restored.difficulty).toBe(gs.difficulty);
    expect(restored.gridWidth).toBe(gs.gridWidth);
    expect(restored.gridHeight).toBe(gs.gridHeight);

    // Players
    expect(restored.players.size).toBe(gs.players.size);
    for (const [pid, origPlayer] of gs.players) {
      const restoredPlayer = restored.players.get(pid);
      expect(restoredPlayer).toBeDefined();
      expect(restoredPlayer!.name).toBe(origPlayer.name);
      expect(restoredPlayer!.money).toBe(origPlayer.money);
      expect(restoredPlayer!.lumber).toBe(origPlayer.lumber);
      expect(restoredPlayer!.governor).toBe(origPlayer.governor);
      expect(restoredPlayer!.kills).toBe(origPlayer.kills);
      expect(restoredPlayer!.towersPlaced).toBe(origPlayer.towersPlaced);
      expect(restoredPlayer!.damageDealt).toBe(origPlayer.damageDealt);
    }

    // Towers
    expect(restored.towers.size).toBe(gs.towers.size);
    for (const [tid, origTower] of gs.towers) {
      const restoredTower = restored.towers.get(tid);
      expect(restoredTower).toBeDefined();
      expect(restoredTower!.towerType).toBe(origTower.towerType);
      expect(restoredTower!.ownerId).toBe(origTower.ownerId);
      expect(restoredTower!.x).toBe(origTower.x);
      expect(restoredTower!.y).toBe(origTower.y);
      expect(restoredTower!.level).toBe(origTower.level);
    }

    // Enemies
    expect(restored.enemies.size).toBe(gs.enemies.size);
    for (const [eid, origEnemy] of gs.enemies) {
      const restoredEnemy = restored.enemies.get(eid);
      expect(restoredEnemy).toBeDefined();
      expect(restoredEnemy!.enemyType).toBe(origEnemy.enemyType);
      expect(restoredEnemy!.currentHealth).toBe(origEnemy.currentHealth);
      expect(restoredEnemy!.isAlive).toBe(origEnemy.isAlive);
      expect(restoredEnemy!.x).toBeCloseTo(origEnemy.x, 1);
      expect(restoredEnemy!.y).toBeCloseTo(origEnemy.y, 1);
    }
  });

  it('double-serialize produces identical snapshots', () => {
    const gs = createActiveGame();
    const snap1 = gs.serialize();
    const restored = gameStateFromSnapshot(snap1);
    const snap2 = restored.serialize();

    expect(stripVolatile(snap2)).toEqual(stripVolatile(snap1));
  });

  it('grid integrity after reconstruction', () => {
    const gs = createActiveGame();
    const snapshot = gs.serialize();
    const restored = gameStateFromSnapshot(snapshot);

    // All tower positions are blocked
    for (const tower of restored.towers.values()) {
      expect(restored.occupancyGrid.isBlocked(tower.x, tower.y)).toBe(true);
    }

    // Path is still valid (has waypoints)
    const path = restored.occupancyGrid.getPath();
    expect(path.totalWaypoints).toBeGreaterThan(1);

    // Grid dimensions match
    expect(restored.gridWidth).toBe(gs.gridWidth);
    expect(restored.gridHeight).toBe(gs.gridHeight);
  });

  it('all map sizes round-trip correctly', () => {
    for (const size of VALID_MAP_SIZES) {
      const gs = new GameState();
      gs.updateSettings({ mapSize: size });
      gs.addPlayer('p1', 'Alice');
      gs.selectGovernor('p1', 'fire');

      const snapshot = gs.serialize();
      const restored = gameStateFromSnapshot(snapshot);

      expect(restored.mapSize).toBe(size);
      expect(restored.gridWidth).toBe(gs.gridWidth);
      expect(restored.gridHeight).toBe(gs.gridHeight);
    }
  });

  it('all map layouts round-trip correctly', () => {
    for (const layout of VALID_MAP_LAYOUTS) {
      const gs = new GameState();
      gs.updateSettings({ mapLayout: layout });
      gs.addPlayer('p1', 'Alice');
      gs.selectGovernor('p1', 'fire');

      const snapshot = gs.serialize();
      const restored = gameStateFromSnapshot(snapshot);

      expect(restored.mapLayout).toBe(layout);

      // Path should be valid
      const path = restored.occupancyGrid.getPath();
      expect(path.totalWaypoints).toBeGreaterThan(1);
    }
  });

  it('tech upgrades preserved through round-trip', () => {
    const gs = new GameState();
    const p = gs.addPlayer('p1', 'Alice')!;
    gs.selectGovernor('p1', 'fire');
    p.lumber = 10;
    p.buyTech('forge_weapons');
    p.buyTech('forge_weapons');
    p.buyTech('crystal_optics');

    const snapshot = gs.serialize();
    const restored = gameStateFromSnapshot(snapshot);
    const rp = restored.players.get('p1')!;

    expect(rp.techUpgrades).toEqual(p.techUpgrades);
    expect(rp.globalDamageMult).toBeCloseTo(p.globalDamageMult);
    expect(rp.globalRangeMult).toBeCloseTo(p.globalRangeMult);
  });
});
