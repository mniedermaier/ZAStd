import Phaser from 'phaser';
import type { GameStateSnapshot, TowerSnapshot, EnemySnapshot, ProjectileSnapshot } from '@zastd/engine';
import { TOWER_DEFINITIONS, TowerType, GOVERNORS, ABILITY_DEFINITIONS, OccupancyGrid } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import {
  showImpact, showChainLightning, showDeathBurst, showSplitterSplit, showUpgradeFlash,
  showMeteorStrike, showBlizzardEffect, showChainStorm, showPlagueCloud,
  showReapEffect, showOvergrowthEffect, showManaBomb, showDivineIntervention,
} from '../effects/ImpactEffect';
import { showDamageNumber, showGoldGain } from '../effects/DamageNumber';
import {
  playTowerAttack, playEnemyDeath,
  playAbilityFire, playAbilityIce, playAbilityThunder, playAbilityPoison,
  playAbilityDeath, playAbilityNature, playAbilityArcane, playAbilityHoly,
  playPingAlert, playPingHere, playPingHelp, playSynergyActivation,
} from '../../audio/SoundManager';

const CELL_SIZE = 24;

// Governor colors for towers
const GOVERNOR_TOWER_COLORS: Record<string, number> = {};
for (const [key, gov] of Object.entries(GOVERNORS)) {
  const color = parseInt(gov.color.slice(1), 16);
  for (const t of gov.towerTypes) {
    GOVERNOR_TOWER_COLORS[t] = color;
  }
}
const COMMON_COLOR = 0x888899;

function getTowerColor(towerType: string): number {
  return GOVERNOR_TOWER_COLORS[towerType] ?? COMMON_COLOR;
}

function getGovernorForTower(towerType: string | undefined): string | null {
  if (!towerType) return null;
  for (const [key, gov] of Object.entries(GOVERNORS)) {
    if (gov.towerTypes.includes(towerType)) return key;
  }
  return null;
}

// Enemy walk bobbing parameters per type
const ENEMY_BOB_PARAMS: Record<string, { amp: number; freq: number }> = {
  tank: { amp: 1, freq: 1.5 },
  fast: { amp: 3, freq: 5 },
  swarm: { amp: 2, freq: 6 },
  boss: { amp: 1.5, freq: 1 },
};
const DEFAULT_BOB = { amp: 2, freq: 3 };

// Colorblind-safe enemy palette (deuteranopia-friendly: avoids red-green)
const ENEMY_COLORS_CB: Record<string, number> = {
  basic: 0xe69f00,    // orange
  fast: 0xf0e442,     // yellow
  tank: 0x886644,     // brown
  swarm: 0xcc79a7,    // pink
  boss: 0xd55e00,     // vermillion
  armored: 0x56b4e9,  // sky blue
  magic_resist: 0xcc79a7, // pink
  flying: 0x56b4e9,   // sky blue
  healer: 0x009e73,   // teal
  berserker: 0xd55e00,// vermillion
  splitter: 0xf0e442, // yellow
};

function getEnemyColor(enemyType: string): number {
  const cb = useSettingsStore.getState().colorblindMode;
  if (cb) return ENEMY_COLORS_CB[enemyType] ?? 0xe69f00;
  const colors: Record<string, number> = {
    basic: 0xcc4444,
    fast: 0xffaa22,
    tank: 0x886644,
    swarm: 0xff6688,
    boss: 0xff2222,
    armored: 0x6688aa,
    magic_resist: 0xaa66dd,
    flying: 0x44ddff,
    healer: 0x44ff88,
    berserker: 0xff4400,
    splitter: 0xdddd44,
  };
  return colors[enemyType] ?? 0xcc4444;
}

const STAR_COUNT = 80;
const STAR_COLORS = [0x44bbff, 0x44ff88, 0xff4466, 0xaa44ff];
const PATH_FLOW_DOT_COUNT = 15;
const TRAIL_LENGTH = 5;

interface Star {
  x: number;
  y: number;
  phase: number;
  color: number;
  radius: number;
  twinkleTimer: number;
  twinkleActive: boolean;
}

export class GameScene extends Phaser.Scene {
  private towerSprites = new Map<string, Phaser.GameObjects.Container>();
  private enemySprites = new Map<string, Phaser.GameObjects.Container>();
  private projectileSprites = new Map<string, Phaser.GameObjects.Arc>();
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private ghostGraphics!: Phaser.GameObjects.Graphics;

  private lastSnapshot: GameStateSnapshot | null = null;
  private cameraControls = { dragging: false, lastX: 0, lastY: 0 };
  private pinchState = { active: false, prevDist: 0, prevMidX: 0, prevMidY: 0 };

  // Path preview for tower placement
  private _lastPreviewCellX = -1;
  private _lastPreviewCellY = -1;
  private _previewPathCells: number[][] | null = null;

  // Enemy interpolation
  private enemyPrevPos = new Map<string, { x: number; y: number; time: number }>();

  // Background stars
  private starGraphics!: Phaser.GameObjects.Graphics;
  private stars: Star[] = [];
  private starsInitialized = false;

  // FPS counter
  private fpsText!: Phaser.GameObjects.Text;
  private fpsUpdateTimer = 0;

  // --- New graphics layers ---
  private effectsGraphics!: Phaser.GameObjects.Graphics;
  private towerGlowGraphics!: Phaser.GameObjects.Graphics;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private pathFlowGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;

  // --- Snapshot diffing state ---
  private prevEnemyIds = new Set<string>();
  private prevEnemyHealth = new Map<string, number>();
  private prevTowerFireTimes = new Map<string, number>();
  private prevProjectileIds = new Set<string>();
  private projectileLastPos = new Map<string, { x: number; y: number }>();

  // --- Dying enemies (deferred destroy for death animation) ---
  private dyingEnemies = new Set<string>();

  // --- Projectile trails ---
  private projectileTrails = new Map<string, { x: number; y: number }[]>();

  // --- Path flow dots ---
  private pathFlowOffset = 0;

  // --- Marker animation ---
  private markerPhase = 0;

  // --- Tower glow animation ---
  private towerGlowPhase = 0;

  // --- Tower selection highlight ---
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionPhase = 0;

  // --- Phase 2: Kill streak ---
  private killStreakCount = 0;
  private killStreakTimer = 0;
  private killStreakThreshold = 10;

  // --- Phase 2: Previous lives (for screen shake on life loss) ---
  private prevSharedLives: number | null = null;

  // --- Phase 2: Previous wave started flag (for wave start fanfare) ---
  private prevWaveStarted = false;

  // --- Phase 2: Previous tower levels (for upgrade flash) ---
  private prevTowerLevels = new Map<string, number>();

  // --- Phase 4: Previous ability cooldowns (for ability VFX detection) ---
  private prevAbilityCooldowns = new Map<string, number>();

  // --- Cached keyboard keys ---
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // --- Ping rendering ---
  private pingGraphics!: Phaser.GameObjects.Graphics;
  private pingLabels: Phaser.GameObjects.Text[] = [];
  private prevPingCount = 0;

  // --- Synergy detection ---
  private prevTowerSynergies = new Map<string, string[]>();

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Layers ordered by depth
    this.starGraphics = this.add.graphics().setDepth(-1);
    this.gridGraphics = this.add.graphics();
    this.pathFlowGraphics = this.add.graphics().setDepth(0.3);
    this.markerGraphics = this.add.graphics().setDepth(0.5);
    this.pathGraphics = this.add.graphics().setDepth(1);
    this.towerGlowGraphics = this.add.graphics().setDepth(1.5);
    // Tower containers at depth 2 (set on creation)
    // Enemy containers at depth 3 (set on creation)
    this.effectsGraphics = this.add.graphics().setDepth(3.5);
    this.trailGraphics = this.add.graphics().setDepth(4);
    // Projectiles at depth 4 (set on creation)
    this.ghostGraphics = this.add.graphics().setDepth(5);
    this.selectionGraphics = this.add.graphics().setDepth(6);
    // Effects (impacts, lightning, numbers) at depth 8-10 (set in effect functions)
    this.pingGraphics = this.add.graphics().setDepth(15);

    // Cache keyboard keys
    if (this.input.keyboard) {
      this.keyW = this.input.keyboard.addKey('W');
      this.keyA = this.input.keyboard.addKey('A');
      this.keyS = this.input.keyboard.addKey('S');
      this.keyD = this.input.keyboard.addKey('D');
    }

    // FPS counter — positioned manually each frame relative to camera scroll
    // (setScrollFactor(0) is unreliable with Scale.RESIZE on mobile)
    this.fpsText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#44bbff',
      padding: { x: 4, y: 2 },
      resolution: 3,
    }).setDepth(100).setAlpha(0.5).setOrigin(1, 0);

    // Camera
    this.cameras.main.setBackgroundColor(0x0a0a1a);

    // Enable second pointer for pinch-to-zoom
    this.input.addPointer(1);

    // Input: pointer for tower placement / selection
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.cameraControls.dragging = true;
        this.cameraControls.lastX = pointer.x;
        this.cameraControls.lastY = pointer.y;
        return;
      }
      if (this.input.pointer2.isDown) return;
      this.handleClick(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      if (p1.isDown && p2.isDown) {
        const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        if (!this.pinchState.active) {
          this.pinchState.active = true;
          this.pinchState.prevDist = dist;
          this.pinchState.prevMidX = midX;
          this.pinchState.prevMidY = midY;
        } else {
          const cam = this.cameras.main;
          if (this.pinchState.prevDist > 0) {
            const zoomDelta = dist / this.pinchState.prevDist;
            cam.setZoom(Phaser.Math.Clamp(cam.zoom * zoomDelta, 0.3, 3));
          }
          const dx = midX - this.pinchState.prevMidX;
          const dy = midY - this.pinchState.prevMidY;
          cam.scrollX -= dx / cam.zoom;
          cam.scrollY -= dy / cam.zoom;
          this.pinchState.prevDist = dist;
          this.pinchState.prevMidX = midX;
          this.pinchState.prevMidY = midY;
        }
        return;
      }

      if (this.cameraControls.dragging) {
        const dx = pointer.x - this.cameraControls.lastX;
        const dy = pointer.y - this.cameraControls.lastY;
        this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
        this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
        this.cameraControls.lastX = pointer.x;
        this.cameraControls.lastY = pointer.y;
      }
      this.updateGhost(pointer);
    });

    this.input.on('pointerup', () => {
      this.cameraControls.dragging = false;
      this.pinchState.active = false;
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, _dy: number, dz: number) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - dz * 0.001, 0.3, 3);
      cam.setZoom(newZoom);
    });

    this.input.keyboard?.addKeys('W,A,S,D');

    // Re-adapt camera on resize (orientation change, browser resize)
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
      if (this.lastSnapshot) {
        const mw = this.lastSnapshot.map.width;
        const mh = this.lastSnapshot.map.height;
        const cam = this.cameras.main;
        const fitZoom = Math.min(cam.width / (mw * CELL_SIZE), cam.height / (mh * CELL_SIZE)) * 0.9;
        cam.setZoom(Phaser.Math.Clamp(fitZoom, 0.3, 3));
        cam.centerOn((mw * CELL_SIZE) / 2, (mh * CELL_SIZE) / 2);
        // Re-initialize stars for new map dimensions
        this.initStars(this.lastSnapshot);
      }
    });
  }

  update(_time: number, _delta: number) {
    const snapshot = useGameStore.getState().snapshot;
    if (!snapshot) return;

    // Camera WASD
    const cam = this.cameras.main;
    const panSpeed = 400 / cam.zoom;
    if (this.keyW?.isDown) cam.scrollY -= panSpeed * (_delta / 1000);
    if (this.keyS?.isDown) cam.scrollY += panSpeed * (_delta / 1000);
    if (this.keyA?.isDown) cam.scrollX -= panSpeed * (_delta / 1000);
    if (this.keyD?.isDown) cam.scrollX += panSpeed * (_delta / 1000);

    // Pan to minimap click target
    const panTarget = useUIStore.getState().panTarget;
    if (panTarget) {
      const targetWorldX = panTarget.x * CELL_SIZE;
      const targetWorldY = panTarget.y * CELL_SIZE;
      const dx = targetWorldX - (cam.scrollX + cam.width / (2 * cam.zoom));
      const dy = targetWorldY - (cam.scrollY + cam.height / (2 * cam.zoom));
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        cam.centerOn(targetWorldX, targetWorldY);
        useUIStore.getState().clearPanTarget();
      } else {
        cam.scrollX += dx * 0.1;
        cam.scrollY += dy * 0.1;
      }
    }

    // FPS counter — throttle setText (expensive texture churn) but reposition every frame
    this.fpsUpdateTimer += _delta;
    if (this.fpsUpdateTimer >= 500) {
      this.fpsUpdateTimer = 0;
      this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
    }
    // Position in world coords tracking the camera so it stays fixed on screen (top-right)
    const screenX = cam.scrollX + (cam.width - 8) / cam.zoom;
    const screenY = cam.scrollY + 4 / cam.zoom;
    this.fpsText.setPosition(screenX, screenY);
    this.fpsText.setScale(1 / cam.zoom);

    // Initialize stars once when map size is known
    if (!this.starsInitialized) {
      this.initStars(snapshot);
      this.starsInitialized = true;
    }
    this.updateStars(_delta);

    // Render pings
    this.updatePings();

    // Only redraw grid/path if snapshot changed
    if (snapshot !== this.lastSnapshot) {
      if (!this.lastSnapshot || snapshot.map.pathVersion !== this.lastSnapshot.map.pathVersion || snapshot.map.width !== this.lastSnapshot.map.width) {
        this.drawGrid(snapshot);
        this.drawPath(snapshot);
      }
      this.detectEvents(snapshot);
      this.reconcileTowers(snapshot);
      this.reconcileProjectiles(snapshot);
      this.lastSnapshot = snapshot;
    }

    // Kill streak timer decay
    if (this.killStreakTimer > 0) {
      this.killStreakTimer -= _delta / 1000;
      if (this.killStreakTimer <= 0) {
        this.killStreakCount = 0;
      } else if (this.killStreakCount >= this.killStreakThreshold) {
        this.showKillStreak(this.killStreakCount);
        // Reset to next threshold
        this.killStreakCount = 0;
      }
    }

    // Always update enemies (for interpolation)
    this.reconcileEnemies(snapshot);

    // Animated overlays (every frame)
    this.drawStatusEffects(snapshot);
    this.drawTowerGlow(snapshot, _delta);
    this.drawMarkers(snapshot, _delta);
    this.drawPathFlow(snapshot, _delta);
    this.drawProjectileTrails(snapshot);
    this.drawTowerSelection(snapshot, _delta);
    this.updateTowerIdle(snapshot, _delta);
  }

  // ===== SNAPSHOT DIFFING =====

  private detectEvents(snap: GameStateSnapshot) {
    const currentEnemyIds = new Set(Object.keys(snap.enemies));
    const currentProjectileIds = new Set(Object.keys(snap.projectiles));

    // Enemy deaths: IDs in previous but not current (or not alive)
    for (const id of this.prevEnemyIds) {
      const enemy = snap.enemies[id];
      if (!enemy || !enemy.isAlive) {
        if (this.dyingEnemies.has(id)) continue; // Already animating death
        const prevHealth = this.prevEnemyHealth.get(id);
        if (prevHealth !== undefined && prevHealth > 0) {
          const sprite = this.enemySprites.get(id);
          if (sprite) {
            const ex = sprite.x;
            const ey = sprite.y;
            const color = enemy ? getEnemyColor(enemy.enemyType) : 0xcc4444;
            const isBoss = enemy?.enemyType === 'boss';
            const isSplitter = enemy?.enemyType === 'splitter';

            // Mark as dying so reconcileEnemies doesn't destroy it yet
            this.dyingEnemies.add(id);

            if (isBoss) {
              // Boss: white flash circle expanding + camera shake + large burst
              const flash = this.add.circle(ex, ey, 4, 0xffffff, 0.9);
              flash.setDepth(9);
              this.tweens.add({
                targets: flash,
                scaleX: 8,
                scaleY: 8,
                alpha: 0,
                duration: 400,
                onComplete: () => flash.destroy(),
              });
              this.cameras.main.shake(300, 0.008);
              showDeathBurst(this, ex, ey, color, 16);
            } else {
              showDeathBurst(this, ex, ey, color);
            }

            if (isSplitter) {
              showSplitterSplit(this, ex, ey, color);
            }

            showImpact(this, ex, ey, color, 10);
            playEnemyDeath();
            const reward = enemy?.stats.reward ?? 5;
            showGoldGain(this, ex, ey - 8, reward);

            // Death tween: shrink + spin + fade (boss gets no spin, just fade)
            this.tweens.add({
              targets: sprite,
              scaleX: 0,
              scaleY: 0,
              rotation: sprite.rotation + (isBoss ? 0 : Math.PI),
              alpha: 0,
              duration: isBoss ? 300 : 200,
              onComplete: () => {
                this.dyingEnemies.delete(id);
                sprite.destroy();
                this.enemySprites.delete(id);
                this.enemyPrevPos.delete(id);
              },
            });
          }
        }
      }
    }

    // Tower firing: lastFireTime changed
    for (const [id, ts] of Object.entries(snap.towers)) {
      const prevTime = this.prevTowerFireTimes.get(id);
      if (prevTime !== undefined && ts.lastFireTime !== prevTime && ts.lastFireTime > 0) {
        // Tower just fired — muzzle flash + sound + recoil
        const tx = ts.x * CELL_SIZE + CELL_SIZE / 2;
        const ty = ts.y * CELL_SIZE + CELL_SIZE / 2;
        const color = getTowerColor(ts.towerType);
        this.showMuzzleFlash(tx, ty, color);
        playTowerAttack();

        // Attack recoil squash
        const towerSprite = this.towerSprites.get(id);
        if (towerSprite) {
          this.tweens.add({
            targets: towerSprite,
            scaleX: 0.92,
            scaleY: 0.92,
            duration: 50,
            yoyo: true,
          });
        }

        // Chain lightning effect
        if (ts.stats.chainCount > 0 && ts.currentTarget) {
          const target = snap.enemies[ts.currentTarget];
          if (target && target.isAlive) {
            showChainLightning(this, tx, ty, target.x * CELL_SIZE, target.y * CELL_SIZE);
          }
        }

        // Splash ring at target
        if (ts.stats.splashRadius > 0 && ts.currentTarget) {
          const target = snap.enemies[ts.currentTarget];
          if (target && target.isAlive) {
            this.showSplashRing(target.x * CELL_SIZE, target.y * CELL_SIZE, ts.stats.splashRadius * CELL_SIZE, color);
          }
        }
      }
      this.prevTowerFireTimes.set(id, ts.lastFireTime);
    }
    // Clean up removed towers
    for (const id of this.prevTowerFireTimes.keys()) {
      if (!snap.towers[id]) this.prevTowerFireTimes.delete(id);
    }

    // Projectile removal: ID in prev but not current → impact at last known position
    for (const id of this.prevProjectileIds) {
      if (!currentProjectileIds.has(id)) {
        const lastPos = this.projectileLastPos.get(id);
        if (lastPos) {
          // Look up the tower color from the projectile's towerId
          const trail = this.projectileTrails.get(id);
          // We stored the towerId in projectileLastPos, so find color from prev snapshot
          const prevSnap = this.lastSnapshot;
          let color = 0xffffff;
          if (prevSnap) {
            const proj = prevSnap.projectiles[id];
            if (proj) {
              const tower = prevSnap.towers[proj.towerId] ?? snap.towers[proj.towerId];
              if (tower) color = getTowerColor(tower.towerType);
            }
          }
          showImpact(this, lastPos.x, lastPos.y, color, 5);
        }
        this.projectileLastPos.delete(id);
        this.projectileTrails.delete(id);
      }
    }

    // Enemy damage: currentHealth decreased
    for (const [id, es] of Object.entries(snap.enemies)) {
      if (!es.isAlive) continue;
      const prevHp = this.prevEnemyHealth.get(id);
      if (prevHp !== undefined && es.currentHealth < prevHp) {
        const dmg = Math.round(prevHp - es.currentHealth);
        if (dmg > 0) {
          const sprite = this.enemySprites.get(id);
          const ex = sprite ? sprite.x : es.x * CELL_SIZE;
          const ey = sprite ? sprite.y : es.y * CELL_SIZE;
          showDamageNumber(this, ex, ey - 10, dmg);
        }
      }
    }

    // --- Phase 2: Kill streak counter ---
    let killsThisTick = 0;
    for (const id of this.prevEnemyIds) {
      const enemy = snap.enemies[id];
      if (!enemy || !enemy.isAlive) {
        const prevHealth = this.prevEnemyHealth.get(id);
        if (prevHealth !== undefined && prevHealth > 0) killsThisTick++;
      }
    }
    if (killsThisTick > 0) {
      this.killStreakCount += killsThisTick;
      this.killStreakTimer = 2.0; // 2s window
    }

    // --- Phase 2: Screen shake on life loss ---
    if (this.prevSharedLives !== null && snap.sharedLives < this.prevSharedLives) {
      const lost = this.prevSharedLives - snap.sharedLives;
      this.cameras.main.shake(200, Math.min(0.012, 0.003 * lost));
    }
    this.prevSharedLives = snap.sharedLives;

    // --- Phase 2: Wave start fanfare ---
    const waveStarted = snap.currentWave?.started ?? false;
    if (waveStarted && !this.prevWaveStarted) {
      this.showWaveFanfare(snap.waveNumber);
    }
    this.prevWaveStarted = waveStarted;

    // --- Phase 2: Tower upgrade flash ---
    for (const [id, ts] of Object.entries(snap.towers)) {
      const prevLevel = this.prevTowerLevels.get(id);
      if (prevLevel !== undefined && ts.level > prevLevel) {
        const cx = ts.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = ts.y * CELL_SIZE + CELL_SIZE / 2;
        const color = getTowerColor(ts.towerType);
        showUpgradeFlash(this, cx, cy, color);
      }
      this.prevTowerLevels.set(id, ts.level);
    }
    // Clean up removed towers from prevTowerLevels
    for (const id of this.prevTowerLevels.keys()) {
      if (!snap.towers[id]) this.prevTowerLevels.delete(id);
    }

    // --- Synergy activation detection ---
    for (const [id, ts] of Object.entries(snap.towers)) {
      const prevSynergies = this.prevTowerSynergies.get(id) ?? [];
      const currentSynergies = ts.activeSynergies ?? [];
      for (const synId of currentSynergies) {
        if (!prevSynergies.includes(synId)) {
          // New synergy activated on this tower
          playSynergyActivation();
          const cx = ts.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = ts.y * CELL_SIZE + CELL_SIZE / 2;
          showUpgradeFlash(this, cx, cy, 0xffdd44);
          break; // One sound per tick is enough
        }
      }
      this.prevTowerSynergies.set(id, [...currentSynergies]);
    }
    // Clean up removed towers from prevTowerSynergies
    for (const id of this.prevTowerSynergies.keys()) {
      if (!snap.towers[id]) this.prevTowerSynergies.delete(id);
    }

    // --- Phase 4: Ability VFX detection ---
    for (const [pid, ps] of Object.entries(snap.players)) {
      const prevCd = this.prevAbilityCooldowns.get(pid) ?? 0;
      // Ability just used: cooldown jumped from 0 to > 0
      if (prevCd <= 0 && ps.abilityCooldownRemaining > 0 && ps.governor) {
        const ability = (ABILITY_DEFINITIONS as Record<string, any>)[ps.governor];
        if (ability) {
          this.showAbilityVFX(ps.governor, ability);
        }
      }
      this.prevAbilityCooldowns.set(pid, ps.abilityCooldownRemaining);
    }

    // Update tracking state
    this.prevEnemyIds = new Set<string>();
    this.prevEnemyHealth.clear();
    for (const [id, es] of Object.entries(snap.enemies)) {
      if (es.isAlive) {
        this.prevEnemyIds.add(id);
        this.prevEnemyHealth.set(id, es.currentHealth);
      }
    }
    this.prevProjectileIds = currentProjectileIds;

    // Update projectile last positions
    for (const [id, ps] of Object.entries(snap.projectiles)) {
      this.projectileLastPos.set(id, { x: ps.x * CELL_SIZE, y: ps.y * CELL_SIZE });
    }
  }

  private showMuzzleFlash(x: number, y: number, color: number) {
    const flash = this.add.circle(x, y, 6, 0xffffff, 0.7);
    flash.setDepth(9);
    this.tweens.add({
      targets: flash,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  private showSplashRing(x: number, y: number, radius: number, color: number) {
    const ring = this.add.circle(x, y, 2, undefined, 0);
    ring.setStrokeStyle(2, color, 0.6);
    ring.setDepth(9);
    this.tweens.add({
      targets: ring,
      radius: radius,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onUpdate: () => {
        ring.setStrokeStyle(2, color, ring.alpha * 0.6);
      },
      onComplete: () => ring.destroy(),
    });
  }

  // ===== WAVE FANFARE =====

  private showWaveFanfare(waveNumber: number) {
    // Camera zoom pulse
    const cam = this.cameras.main;
    const origZoom = cam.zoom;
    this.tweens.add({
      targets: cam,
      zoom: origZoom * 1.03,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // "WAVE X" text center screen
    const cx = cam.scrollX + cam.width / (2 * cam.zoom);
    const cy = cam.scrollY + cam.height / (2 * cam.zoom);
    const text = this.add.text(cx, cy, `WAVE ${waveNumber}`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 3,
    }).setOrigin(0.5).setDepth(100).setScale(1 / cam.zoom);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: cy - 30 / cam.zoom,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // ===== KILL STREAK =====

  private showKillStreak(count: number) {
    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / (2 * cam.zoom);
    const cy = cam.scrollY + cam.height / (3 * cam.zoom);
    const text = this.add.text(cx, cy, `${count}x COMBO!`, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 3,
    }).setOrigin(0.5).setDepth(100).setScale(1 / cam.zoom);

    this.tweens.add({
      targets: text,
      alpha: 0,
      scaleX: text.scaleX * 1.5,
      scaleY: text.scaleY * 1.5,
      y: cy - 20 / cam.zoom,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // ===== ABILITY VFX =====

  private showAbilityVFX(governor: string, ability: any) {
    const cam = this.cameras.main;
    const cx = cam.worldView.centerX;
    const cy = cam.worldView.centerY;

    // Play governor-specific ability sound
    switch (governor) {
      case 'fire': playAbilityFire(); break;
      case 'ice': playAbilityIce(); break;
      case 'thunder': playAbilityThunder(); break;
      case 'poison': playAbilityPoison(); break;
      case 'death': playAbilityDeath(); break;
      case 'nature': playAbilityNature(); break;
      case 'arcane': playAbilityArcane(); break;
      case 'holy': playAbilityHoly(); break;
    }

    switch (governor) {
      case 'fire':
        // Meteor effect at center (actual targeting VFX is from the targeting circle)
        showMeteorStrike(this, cx, cy, (ability.radius ?? 4) * CELL_SIZE);
        break;
      case 'ice':
        showBlizzardEffect(this, cx, cy, (ability.radius ?? 5) * CELL_SIZE);
        break;
      case 'thunder': {
        // Chain Storm: random enemy positions
        const snapshot = useGameStore.getState().snapshot;
        const targets: Array<{ x: number; y: number }> = [];
        if (snapshot) {
          const aliveEnemies = Object.values(snapshot.enemies).filter(e => e.isAlive);
          const count = Math.min(10, aliveEnemies.length);
          const shuffled = [...aliveEnemies].sort(() => Math.random() - 0.5);
          for (let i = 0; i < count; i++) {
            targets.push({ x: shuffled[i].x * CELL_SIZE, y: shuffled[i].y * CELL_SIZE });
          }
        }
        if (targets.length > 0) showChainStorm(this, targets);
        break;
      }
      case 'poison':
        showPlagueCloud(this, cx, cy, (ability.radius ?? 5) * CELL_SIZE);
        break;
      case 'death':
        showReapEffect(this);
        break;
      case 'nature':
        showOvergrowthEffect(this);
        break;
      case 'arcane':
        showManaBomb(this, cx, cy, (ability.radius ?? 4) * CELL_SIZE);
        break;
      case 'holy':
        showDivineIntervention(this);
        break;
    }
  }

  // ===== STATUS EFFECTS OVERLAY =====

  private drawStatusEffects(snap: GameStateSnapshot) {
    const g = this.effectsGraphics;
    g.clear();

    for (const [id, es] of Object.entries(snap.enemies)) {
      if (!es.isAlive) continue;
      const sprite = this.enemySprites.get(id);
      if (!sprite) continue;
      const ex = sprite.x;
      const ey = sprite.y;
      const time = this.time.now / 1000;

      // Slowed: blue ring + ice dots
      if (es.slowMultiplier < 1) {
        g.lineStyle(1.5, 0x44bbff, 0.5);
        g.strokeCircle(ex, ey, 9);
        for (let i = 0; i < 3; i++) {
          const angle = time * 2 + (i * Math.PI * 2) / 3;
          const dx = Math.cos(angle) * 7;
          const dy = Math.sin(angle) * 7;
          g.fillStyle(0x88ddff, 0.6);
          g.fillCircle(ex + dx, ey + dy, 1.5);
        }
      }

      // Poisoned: green bubbles rising
      if (es.poisonDamage > 0) {
        for (let i = 0; i < 3; i++) {
          const bx = ex + Math.sin(time * 3 + i * 2) * 5;
          const by = ey - 4 - ((time * 12 + i * 5) % 12);
          g.fillStyle(0x88ff00, 0.4 + 0.2 * Math.sin(time * 4 + i));
          g.fillCircle(bx, by, 1.5 + Math.sin(time * 5 + i) * 0.5);
        }
      }

      // Stunned: yellow spinning stars
      if (es.stunned) {
        for (let i = 0; i < 3; i++) {
          const angle = time * 4 + (i * Math.PI * 2) / 3;
          const sx = ex + Math.cos(angle) * 8;
          const sy = ey - 12 + Math.sin(angle * 0.5) * 2;
          g.fillStyle(0xffee00, 0.7);
          // Draw a tiny star shape (4-point)
          g.fillCircle(sx, sy, 2);
          g.fillRect(sx - 0.5, sy - 3, 1, 6);
          g.fillRect(sx - 3, sy - 0.5, 6, 1);
        }
      }

      // 2e. Healer beam: pulsing green line to nearest damaged ally
      if (es.enemyType === 'healer') {
        let nearestDamaged: { x: number; y: number; dist: number } | null = null;
        for (const [oid, oes] of Object.entries(snap.enemies)) {
          if (oid === id || !oes.isAlive || oes.currentHealth >= oes.maxHealth) continue;
          const oSprite = this.enemySprites.get(oid);
          if (!oSprite) continue;
          const dist = Math.sqrt((oSprite.x - ex) ** 2 + (oSprite.y - ey) ** 2);
          if (dist < 5 * CELL_SIZE && (!nearestDamaged || dist < nearestDamaged.dist)) {
            nearestDamaged = { x: oSprite.x, y: oSprite.y, dist };
          }
        }
        if (nearestDamaged) {
          const pulseAlpha = 0.3 + 0.2 * Math.sin(time * 6);
          g.lineStyle(2, 0x44ff88, pulseAlpha);
          g.beginPath();
          g.moveTo(ex, ey);
          g.lineTo(nearestDamaged.x, nearestDamaged.y);
          g.strokePath();
        }
      }

      // 2f. Berserker rage: scale + red glow based on hitsTaken
      if (es.enemyType === 'berserker' && es.hitsTaken > 0) {
        const rageScale = Math.min(1.2, 1 + es.hitsTaken * 0.01);
        const container = this.enemySprites.get(id);
        if (container && !this.dyingEnemies.has(id)) {
          container.setScale(rageScale);
        }
        const rageAlpha = Math.min(0.4, es.hitsTaken * 0.02);
        g.fillStyle(0xff2200, rageAlpha);
        g.fillCircle(ex, ey, 10);
      }
    }

    // 2d. Governor tower VFX — viewport-culled particles
    const cam = this.cameras.main;
    const viewLeft = cam.worldView.x - CELL_SIZE * 2;
    const viewRight = cam.worldView.x + cam.worldView.width + CELL_SIZE * 2;
    const viewTop = cam.worldView.y - CELL_SIZE * 2;
    const viewBottom = cam.worldView.y + cam.worldView.height + CELL_SIZE * 2;
    const time = this.time.now / 1000;

    for (const [, ts] of Object.entries(snap.towers)) {
      const cx = ts.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = ts.y * CELL_SIZE + CELL_SIZE / 2;
      if (cx < viewLeft || cx > viewRight || cy < viewTop || cy > viewBottom) continue;
      const gov = getGovernorForTower(ts.towerType);
      if (!gov) continue;

      switch (gov) {
        case 'fire': {
          // Rising flame dots
          for (let i = 0; i < 2; i++) {
            const fx = cx + (Math.sin(time * 3 + i * 2 + cx) * 4);
            const fy = cy - 3 - ((time * 15 + i * 7) % 14);
            g.fillStyle(0xff6600, 0.3 + 0.15 * Math.sin(time * 5 + i));
            g.fillCircle(fx, fy, 1.5);
          }
          break;
        }
        case 'ice': {
          // Falling frost sparkles
          for (let i = 0; i < 2; i++) {
            const fx = cx + Math.sin(time * 2 + i * 3 + cx) * 5;
            const fy = cy - 6 + ((time * 8 + i * 5) % 14);
            g.fillStyle(0x88ddff, 0.25 + 0.1 * Math.sin(time * 4 + i));
            g.fillCircle(fx, fy, 1);
          }
          break;
        }
        case 'poison': {
          // Dripping green
          const dx = cx + Math.sin(time * 1.5 + cx) * 3;
          const dy = cy + 6 + ((time * 6 + cx) % 10);
          g.fillStyle(0x88ff00, 0.2);
          g.fillCircle(dx, dy, 1.5);
          break;
        }
        case 'holy': {
          // Golden halo glow
          const haloAlpha = 0.08 + 0.05 * Math.sin(time * 2 + cx);
          g.fillStyle(0xffdd88, haloAlpha);
          g.fillCircle(cx, cy, CELL_SIZE * 0.6);
          break;
        }
        default: {
          // Subtle colored emission for other governors
          const color = getTowerColor(ts.towerType);
          const px = cx + Math.sin(time * 2 + cx * 0.1) * 4;
          const py = cy - 4 - ((time * 10 + cx) % 10);
          g.fillStyle(color, 0.15);
          g.fillCircle(px, py, 1);
          break;
        }
      }
    }
  }

  // ===== TOWER GLOW =====

  private drawTowerGlow(snap: GameStateSnapshot, delta: number) {
    const g = this.towerGlowGraphics;
    g.clear();
    this.towerGlowPhase += delta / 1000;

    for (const [id, ts] of Object.entries(snap.towers)) {
      const color = getTowerColor(ts.towerType);
      const cx = ts.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = ts.y * CELL_SIZE + CELL_SIZE / 2;
      const alpha = 0.05 + 0.1 * (0.5 + 0.5 * Math.sin(this.towerGlowPhase * 1.5 + cx * 0.01));
      const radius = CELL_SIZE * 0.7;
      g.fillStyle(color, alpha);
      g.fillCircle(cx, cy, radius);

      // Draw aura range for aura towers
      if (ts.stats.auraRange > 0) {
        const auraRadius = ts.stats.auraRange * CELL_SIZE;
        const auraAlpha = 0.04 + 0.03 * Math.sin(this.towerGlowPhase * 2);
        g.lineStyle(1, 0x44ff88, auraAlpha * 3);
        g.strokeCircle(cx, cy, auraRadius);
        g.fillStyle(0x44ff88, auraAlpha);
        g.fillCircle(cx, cy, auraRadius);
      }
    }

    // Draw synergy lines between adjacent towers with active synergies
    const drawnPairs = new Set<string>();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [id, ts] of Object.entries(snap.towers)) {
      if (!ts.activeSynergies || ts.activeSynergies.length === 0) continue;
      const cx = ts.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = ts.y * CELL_SIZE + CELL_SIZE / 2;
      for (const [dx, dy] of dirs) {
        const nx = ts.x + dx;
        const ny = ts.y + dy;
        const neighbor = Object.values(snap.towers).find(t => t.x === nx && t.y === ny);
        if (!neighbor || !neighbor.activeSynergies || neighbor.activeSynergies.length === 0) continue;
        // Deduplicate lines
        const pairKey = [id, neighbor.towerId].sort().join('-');
        if (drawnPairs.has(pairKey)) continue;
        drawnPairs.add(pairKey);

        const ncx = nx * CELL_SIZE + CELL_SIZE / 2;
        const ncy = ny * CELL_SIZE + CELL_SIZE / 2;
        const synAlpha = 0.3 + 0.2 * Math.sin(this.towerGlowPhase * 3);
        g.lineStyle(2, 0xffdd44, synAlpha);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(ncx, ncy);
        g.strokePath();
      }
    }
  }

  // ===== TOWER SELECTION HIGHLIGHT =====

  private drawTowerSelection(snap: GameStateSnapshot, delta: number) {
    const g = this.selectionGraphics;
    g.clear();
    this.selectionPhase += delta / 1000;

    const selectedId = useUIStore.getState().selectedTowerId;
    if (!selectedId) return;
    const tower = snap.towers[selectedId];
    if (!tower) return;

    const cx = tower.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = tower.y * CELL_SIZE + CELL_SIZE / 2;
    const color = getTowerColor(tower.towerType);

    // Pulsing selection ring
    const pulse = 0.5 + 0.5 * Math.sin(this.selectionPhase * 4);
    const alpha = 0.4 + 0.4 * pulse;
    const radius = CELL_SIZE * 0.6 + pulse * 2;

    g.lineStyle(2.5, color, alpha);
    g.strokeCircle(cx, cy, radius);

    // Corner brackets
    const half = CELL_SIZE / 2 + 1;
    const bracketLen = 6;
    g.lineStyle(2, 0xffffff, 0.5 + 0.3 * pulse);
    // Top-left
    g.beginPath();
    g.moveTo(cx - half, cy - half + bracketLen);
    g.lineTo(cx - half, cy - half);
    g.lineTo(cx - half + bracketLen, cy - half);
    g.strokePath();
    // Top-right
    g.beginPath();
    g.moveTo(cx + half - bracketLen, cy - half);
    g.lineTo(cx + half, cy - half);
    g.lineTo(cx + half, cy - half + bracketLen);
    g.strokePath();
    // Bottom-left
    g.beginPath();
    g.moveTo(cx - half, cy + half - bracketLen);
    g.lineTo(cx - half, cy + half);
    g.lineTo(cx - half + bracketLen, cy + half);
    g.strokePath();
    // Bottom-right
    g.beginPath();
    g.moveTo(cx + half - bracketLen, cy + half);
    g.lineTo(cx + half, cy + half);
    g.lineTo(cx + half, cy + half - bracketLen);
    g.strokePath();

    // Range circle for selected tower
    g.lineStyle(1, color, 0.2 + 0.1 * pulse);
    g.strokeCircle(cx, cy, tower.stats.range * CELL_SIZE);
  }

  // ===== TOWER IDLE ANIMATION =====

  private updateTowerIdle(snap: GameStateSnapshot, delta: number) {
    const time = this.time.now / 1000;
    for (const [id, ts] of Object.entries(snap.towers)) {
      const container = this.towerSprites.get(id);
      if (!container) continue;
      const target = ts.currentTarget ? snap.enemies[ts.currentTarget] : null;
      const hasTarget = target && target.isAlive;
      if (!hasTarget) {
        // Breathing pulse: 1.0 → 1.015 → 1.0 (2s sine cycle)
        const breathe = 1.0 + 0.015 * Math.sin(time * Math.PI);
        container.setScale(breathe);
        // Slow turret scan rotation
        container.rotation += 0.003 * (delta / 16.67);
      }
    }
  }

  // ===== ANIMATED SPAWN / END / WAYPOINT MARKERS =====

  private drawMarkers(snap: GameStateSnapshot, delta: number) {
    const g = this.markerGraphics;
    g.clear();
    this.markerPhase += delta / 1000;

    const spawnX = snap.map.spawn[0] * CELL_SIZE + CELL_SIZE / 2;
    const spawnY = snap.map.spawn[1] * CELL_SIZE + CELL_SIZE / 2;
    const endX = snap.map.end[0] * CELL_SIZE + CELL_SIZE / 2;
    const endY = snap.map.end[1] * CELL_SIZE + CELL_SIZE / 2;

    // Draw pulsing rings for spawn (green) and end (red)
    for (let i = 0; i < 3; i++) {
      const phase = this.markerPhase * 1.5 + (i * Math.PI * 2) / 3;
      const t = (Math.sin(phase) + 1) / 2; // 0..1
      const radius = 4 + t * 10;
      const alpha = 0.3 * (1 - t);

      g.lineStyle(1.5, 0x44ff88, alpha);
      g.strokeCircle(spawnX, spawnY, radius);

      g.lineStyle(1.5, 0xff4466, alpha);
      g.strokeCircle(endX, endY, radius);
    }

    // Draw checkpoint waypoint markers (diamond + pulsing ring)
    const checkpoints = snap.map.checkpoints ?? [];
    const wpColors = [0xffdd44, 0xff8844, 0x44bbff, 0xcc88ff];
    for (let wi = 0; wi < checkpoints.length; wi++) {
      const [cpx, cpy] = checkpoints[wi];
      const cx = cpx * CELL_SIZE + CELL_SIZE / 2;
      const cy = cpy * CELL_SIZE + CELL_SIZE / 2;
      const color = wpColors[wi % wpColors.length];

      // Pulsing ring
      for (let i = 0; i < 2; i++) {
        const phase = this.markerPhase * 1.2 + (i * Math.PI);
        const t = (Math.sin(phase) + 1) / 2;
        const radius = 6 + t * 12;
        const alpha = 0.25 * (1 - t);
        g.lineStyle(2, color, alpha);
        g.strokeCircle(cx, cy, radius);
      }

      // Solid diamond
      const ds = 7;
      const pulseAlpha = 0.5 + 0.3 * Math.sin(this.markerPhase * 2 + wi);
      g.fillStyle(color, pulseAlpha);
      g.fillPoints([
        new Phaser.Geom.Point(cx, cy - ds),
        new Phaser.Geom.Point(cx + ds, cy),
        new Phaser.Geom.Point(cx, cy + ds),
        new Phaser.Geom.Point(cx - ds, cy),
      ], true);

      // Label
      g.lineStyle(1, color, 0.8);
      g.strokePoints([
        new Phaser.Geom.Point(cx, cy - ds),
        new Phaser.Geom.Point(cx + ds, cy),
        new Phaser.Geom.Point(cx, cy + ds),
        new Phaser.Geom.Point(cx - ds, cy),
        new Phaser.Geom.Point(cx, cy - ds),
      ]);
    }
  }

  // ===== ANIMATED PATH FLOW =====

  private drawPathFlow(snap: GameStateSnapshot, delta: number) {
    const g = this.pathFlowGraphics;
    g.clear();

    const path = snap.map.path;
    if (path.length < 2) return;

    this.pathFlowOffset += delta / 1000 * 2; // speed of flow

    // Calculate total path length
    let totalLen = 0;
    const segLens: number[] = [0];
    for (let i = 1; i < path.length; i++) {
      const dx = (path[i][0] - path[i - 1][0]) * CELL_SIZE;
      const dy = (path[i][1] - path[i - 1][1]) * CELL_SIZE;
      totalLen += Math.sqrt(dx * dx + dy * dy);
      segLens.push(totalLen);
    }
    if (totalLen === 0) return;

    for (let i = 0; i < PATH_FLOW_DOT_COUNT; i++) {
      const t = ((i / PATH_FLOW_DOT_COUNT) + this.pathFlowOffset / (totalLen / CELL_SIZE)) % 1;
      const dist = t * totalLen;

      // Find which segment this distance falls on
      let segIdx = 0;
      for (let s = 1; s < segLens.length; s++) {
        if (segLens[s] >= dist) {
          segIdx = s - 1;
          break;
        }
      }
      const segStart = segLens[segIdx];
      const segEnd = segLens[segIdx + 1] ?? totalLen;
      const segT = segEnd > segStart ? (dist - segStart) / (segEnd - segStart) : 0;

      const px = Phaser.Math.Linear(path[segIdx][0], path[segIdx + 1]?.[0] ?? path[segIdx][0], segT) * CELL_SIZE;
      const py = Phaser.Math.Linear(path[segIdx][1], path[segIdx + 1]?.[1] ?? path[segIdx][1], segT) * CELL_SIZE;

      g.fillStyle(0x44bbff, 0.3);
      g.fillCircle(px, py, 2);
    }
  }

  // ===== PROJECTILE TRAILS =====

  private drawProjectileTrails(snap: GameStateSnapshot) {
    const g = this.trailGraphics;
    g.clear();

    for (const [id, ps] of Object.entries(snap.projectiles)) {
      const px = ps.x * CELL_SIZE;
      const py = ps.y * CELL_SIZE;

      // Get or create trail
      let trail = this.projectileTrails.get(id);
      if (!trail) {
        trail = [];
        this.projectileTrails.set(id, trail);
      }
      trail.push({ x: px, y: py });
      if (trail.length > TRAIL_LENGTH) trail.shift();

      // Determine color from tower
      let color = 0xffffff;
      const tower = snap.towers[ps.towerId];
      if (tower) color = getTowerColor(tower.towerType);

      // Draw trail
      for (let i = 0; i < trail.length - 1; i++) {
        const alpha = ((i + 1) / trail.length) * 0.4;
        const size = ((i + 1) / trail.length) * 2;
        g.fillStyle(color, alpha);
        g.fillCircle(trail[i].x, trail[i].y, size);
      }
    }
  }

  // ===== STARS =====

  private initStars(snap: GameStateSnapshot) {
    const mapW = snap.map.width * CELL_SIZE;
    const mapH = snap.map.height * CELL_SIZE;
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * mapW,
        y: Math.random() * mapH,
        phase: Math.random() * Math.PI * 2,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        radius: 1 + Math.random() * 2,
        twinkleTimer: Math.random() * 8,
        twinkleActive: false,
      });
    }
  }

  private updateStars(delta: number) {
    const g = this.starGraphics;
    g.clear();
    const dt = delta / 1000;
    for (const star of this.stars) {
      star.phase += dt * 1.5;

      // Twinkle: random bright flashes
      star.twinkleTimer -= dt;
      if (star.twinkleTimer <= 0) {
        star.twinkleActive = !star.twinkleActive;
        star.twinkleTimer = star.twinkleActive ? 0.1 + Math.random() * 0.15 : 3 + Math.random() * 5;
      }

      let alpha: number;
      if (star.twinkleActive) {
        alpha = 0.5;
      } else {
        alpha = 0.08 + 0.17 * Math.sin(star.phase);
      }
      g.fillStyle(star.color, Math.max(0, alpha));
      g.fillCircle(star.x, star.y, star.radius);
    }
  }

  // ===== GRID / PATH =====

  private drawGrid(snap: GameStateSnapshot) {
    const g = this.gridGraphics;
    g.clear();
    const w = snap.map.width;
    const h = snap.map.height;

    // Background fill
    g.fillStyle(0x0d0d20, 1);
    g.fillRect(0, 0, w * CELL_SIZE, h * CELL_SIZE);

    // Grid lines
    g.lineStyle(1, 0x1a1a40, 0.3);
    for (let x = 0; x <= w; x++) {
      g.moveTo(x * CELL_SIZE, 0);
      g.lineTo(x * CELL_SIZE, h * CELL_SIZE);
    }
    for (let y = 0; y <= h; y++) {
      g.moveTo(0, y * CELL_SIZE);
      g.lineTo(w * CELL_SIZE, y * CELL_SIZE);
    }
    g.strokePath();

    // Spawn/end base fills (markers animate on top)
    g.fillStyle(0x44ff88, 0.15);
    g.fillRect(snap.map.spawn[0] * CELL_SIZE, snap.map.spawn[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    g.fillStyle(0xff4466, 0.15);
    g.fillRect(snap.map.end[0] * CELL_SIZE, snap.map.end[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    // Center camera on map
    const cam = this.cameras.main;
    if (!this.lastSnapshot) {
      cam.centerOn((w * CELL_SIZE) / 2, (h * CELL_SIZE) / 2);
      cam.setZoom(Math.min(cam.width / (w * CELL_SIZE), cam.height / (h * CELL_SIZE)) * 0.9);
    }
  }

  private drawPath(snap: GameStateSnapshot) {
    const g = this.pathGraphics;
    g.clear();

    // Draw path cells
    g.fillStyle(0x44bbff, 0.08);
    for (const [cx, cy] of snap.map.pathCells) {
      g.fillRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Draw path line
    if (snap.map.path.length >= 2) {
      g.lineStyle(2, 0x44bbff, 0.25);
      g.beginPath();
      g.moveTo(snap.map.path[0][0] * CELL_SIZE, snap.map.path[0][1] * CELL_SIZE);
      for (let i = 1; i < snap.map.path.length; i++) {
        g.lineTo(snap.map.path[i][0] * CELL_SIZE, snap.map.path[i][1] * CELL_SIZE);
      }
      g.strokePath();
    }
  }

  // ===== TOWERS =====

  private reconcileTowers(snap: GameStateSnapshot) {
    const current = new Set(Object.keys(snap.towers));
    // Determine local player ID for ownership highlighting
    const localPlayerId = (window as any).__playerId || 'local-player';

    for (const [id, sprite] of this.towerSprites) {
      if (!current.has(id)) {
        sprite.destroy();
        this.towerSprites.delete(id);
      }
    }

    for (const [id, ts] of Object.entries(snap.towers)) {
      let container = this.towerSprites.get(id);
      const isOwner = ts.ownerId === localPlayerId;
      if (!container) {
        container = this.createTowerSprite(ts, isOwner);
        this.towerSprites.set(id, container);
      } else {
        // Update level text if level changed
        const levelText = container.getByName('levelText') as Phaser.GameObjects.Text | null;
        if (levelText && levelText.text !== `${ts.level}`) {
          levelText.setText(`${ts.level}`);
        }
      }
      container.setPosition(ts.x * CELL_SIZE + CELL_SIZE / 2, ts.y * CELL_SIZE + CELL_SIZE / 2);

      // Rotate turret toward current target, or back to default when idle
      const turret = container.getByName('turret') as Phaser.GameObjects.Rectangle | null;
      if (turret) {
        const target = ts.currentTarget ? snap.enemies[ts.currentTarget] : null;
        if (target && target.isAlive) {
          const tx = ts.x * CELL_SIZE + CELL_SIZE / 2;
          const ty = ts.y * CELL_SIZE + CELL_SIZE / 2;
          const ex = target.x * CELL_SIZE;
          const ey = target.y * CELL_SIZE;
          const angle = Math.atan2(ey - ty, ex - tx) + Math.PI / 2;
          const currentAngle = container.rotation;
          const diff = Phaser.Math.Angle.Wrap(angle - currentAngle);
          container.rotation += diff * 0.15;
        } else {
          // Smoothly return to default orientation (0)
          const diff = Phaser.Math.Angle.Wrap(0 - container.rotation);
          if (Math.abs(diff) > 0.01) {
            container.rotation += diff * 0.05;
          } else {
            container.rotation = 0;
          }
        }
      }
    }
  }

  private createTowerSprite(ts: TowerSnapshot, isOwner = false): Phaser.GameObjects.Container {
    const color = getTowerColor(ts.towerType);
    const container = this.add.container(
      ts.x * CELL_SIZE + CELL_SIZE / 2,
      ts.y * CELL_SIZE + CELL_SIZE / 2,
    );
    container.setDepth(2);

    const levelScale = 1 + (ts.level - 1) * 0.06;
    const s = (CELL_SIZE / 2 - 2) * levelScale;
    const bAlpha = isOwner ? 0.6 : 0.15;
    const bColor = isOwner ? 0x44bbff : 0xffffff;
    const bWidth = isOwner ? 2 : 1;

    const g = this.add.graphics();
    g.fillStyle(color, 0.9);
    g.lineStyle(bWidth, bColor, bAlpha);

    // Each tower type has a unique shape
    switch (ts.towerType) {
      // === COMMON TOWERS ===
      case 'arrow': {
        // Triangle (arrowhead)
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.8, s * 0.6);
        g.lineTo(0, s * 0.3);
        g.lineTo(-s * 0.8, s * 0.6);
        g.closePath();
        g.fillPath(); g.strokePath();
        break;
      }
      case 'cannon': {
        // Thick circle with center dot (barrel view)
        g.fillCircle(0, 0, s * 0.9);
        g.strokeCircle(0, 0, s * 0.9);
        g.fillStyle(0x222233, 0.8);
        g.fillCircle(0, 0, s * 0.35);
        break;
      }
      case 'frost_trap': {
        // Square with X inside (trap)
        g.fillRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
        g.strokeRect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6);
        g.lineStyle(1.5, 0x88ddff, 0.6);
        g.beginPath();
        g.moveTo(-s * 0.5, -s * 0.5); g.lineTo(s * 0.5, s * 0.5);
        g.moveTo(s * 0.5, -s * 0.5); g.lineTo(-s * 0.5, s * 0.5);
        g.strokePath();
        break;
      }

      // === FIRE TOWERS (upward triangle family) ===
      case 'fire_arrow': {
        // Simple triangle
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, s * 0.7); g.lineTo(-s, s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        break;
      }
      case 'inferno': {
        // Triangle with inner flame dot
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, s * 0.7); g.lineTo(-s, s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(0xffaa00, 0.7);
        g.fillCircle(0, s * 0.15, s * 0.25);
        break;
      }
      case 'meteor': {
        // Triangle with inner V lines
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, s * 0.7); g.lineTo(-s, s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.lineStyle(1.5, 0xffcc00, 0.5);
        g.beginPath();
        g.moveTo(-s * 0.4, s * 0.3); g.lineTo(0, -s * 0.2); g.lineTo(s * 0.4, s * 0.3);
        g.strokePath();
        break;
      }
      case 'volcano': {
        // Wide triangle with caldera (ultimate)
        g.beginPath();
        g.moveTo(0, -s * 1.1); g.lineTo(s * 1.1, s * 0.7); g.lineTo(-s * 1.1, s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(0xff3300, 0.6);
        g.fillCircle(0, -s * 0.2, s * 0.3);
        g.fillStyle(0xffaa00, 0.5);
        g.fillCircle(0, -s * 0.2, s * 0.15);
        break;
      }

      // === ICE TOWERS (hexagon family) ===
      case 'ice_shard': {
        // Simple hexagon
        this.drawPolygon(g, 6, s, -Math.PI / 6);
        break;
      }
      case 'blizzard': {
        // Hexagon with inner snowflake lines
        this.drawPolygon(g, 6, s, -Math.PI / 6);
        g.lineStyle(1, 0xaaddff, 0.5);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI;
          g.beginPath();
          g.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
          g.lineTo(-Math.cos(a) * s * 0.5, -Math.sin(a) * s * 0.5);
          g.strokePath();
        }
        break;
      }
      case 'glacier': {
        // Hexagon with inner hexagon
        this.drawPolygon(g, 6, s, -Math.PI / 6);
        g.lineStyle(1, 0x88ccff, 0.4);
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = Math.cos(a) * s * 0.45;
          const py = Math.sin(a) * s * 0.45;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath(); g.strokePath();
        break;
      }
      case 'avalanche': {
        // Large hexagon with crystal pattern (ultimate)
        this.drawPolygon(g, 6, s * 1.05, -Math.PI / 6);
        g.fillStyle(0xcceeFF, 0.3);
        this.drawPolygon(g, 6, s * 0.5, 0);
        g.fillStyle(0xffffff, 0.2);
        g.fillCircle(0, 0, s * 0.2);
        break;
      }

      // === THUNDER TOWERS (star family) ===
      case 'spark': {
        // 4-pointed star
        this.drawStar(g, 4, s, s * 0.4);
        break;
      }
      case 'lightning': {
        // 5-pointed star
        this.drawStar(g, 5, s, s * 0.45);
        break;
      }
      case 'storm': {
        // 6-pointed star with center dot
        this.drawStar(g, 6, s, s * 0.5);
        g.fillStyle(0xffff00, 0.5);
        g.fillCircle(0, 0, s * 0.2);
        break;
      }
      case 'tempest': {
        // 8-pointed star (ultimate)
        this.drawStar(g, 8, s * 1.05, s * 0.5);
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(0, 0, s * 0.25);
        break;
      }

      // === POISON TOWERS (pentagon family) ===
      case 'venom': {
        // Simple pentagon
        this.drawPolygon(g, 5, s, -Math.PI / 2);
        break;
      }
      case 'plague': {
        // Pentagon with dot in center
        this.drawPolygon(g, 5, s, -Math.PI / 2);
        g.fillStyle(0xccff00, 0.5);
        g.fillCircle(0, 0, s * 0.2);
        break;
      }
      case 'miasma': {
        // Pentagon with inner ring
        this.drawPolygon(g, 5, s, -Math.PI / 2);
        g.lineStyle(1.5, 0xaaff00, 0.4);
        g.strokeCircle(0, 0, s * 0.45);
        break;
      }
      case 'pandemic': {
        // Large pentagon with biohazard lines (ultimate)
        this.drawPolygon(g, 5, s * 1.05, -Math.PI / 2);
        g.lineStyle(1, 0xccff00, 0.5);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
          g.strokePath();
        }
        break;
      }

      // === DEATH TOWERS (inverted triangle family) ===
      case 'soul_drain': {
        // Inverted triangle
        g.beginPath();
        g.moveTo(0, s); g.lineTo(s, -s * 0.7); g.lineTo(-s, -s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        break;
      }
      case 'necrosis': {
        // Inverted triangle with skull dot
        g.beginPath();
        g.moveTo(0, s); g.lineTo(s, -s * 0.7); g.lineTo(-s, -s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(0xccaadd, 0.5);
        g.fillCircle(0, -s * 0.1, s * 0.2);
        break;
      }
      case 'wraith': {
        // Inverted triangle with ghost lines
        g.beginPath();
        g.moveTo(0, s); g.lineTo(s, -s * 0.7); g.lineTo(-s, -s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.lineStyle(1, 0xddbbff, 0.4);
        g.beginPath();
        g.moveTo(0, s * 0.6); g.lineTo(0, -s * 0.4);
        g.strokePath();
        g.beginPath();
        g.moveTo(-s * 0.3, -s * 0.1); g.lineTo(s * 0.3, -s * 0.1);
        g.strokePath();
        break;
      }
      case 'reaper': {
        // Wide inverted triangle with scythe arc (ultimate)
        g.beginPath();
        g.moveTo(0, s * 1.1); g.lineTo(s * 1.1, -s * 0.7); g.lineTo(-s * 1.1, -s * 0.7);
        g.closePath(); g.fillPath(); g.strokePath();
        g.lineStyle(1.5, 0xddaaff, 0.5);
        g.beginPath();
        g.arc(0, -s * 0.1, s * 0.4, -Math.PI * 0.8, Math.PI * 0.1);
        g.strokePath();
        break;
      }

      // === NATURE TOWERS (circle family) ===
      case 'thorn': {
        // Circle
        g.fillCircle(0, 0, s);
        g.strokeCircle(0, 0, s);
        break;
      }
      case 'entangle': {
        // Circle with inner spiral lines
        g.fillCircle(0, 0, s);
        g.strokeCircle(0, 0, s);
        g.lineStyle(1, 0x44ff44, 0.4);
        g.beginPath();
        g.arc(0, 0, s * 0.4, 0, Math.PI);
        g.strokePath();
        g.beginPath();
        g.arc(0, 0, s * 0.4, Math.PI, Math.PI * 2);
        g.strokePath();
        break;
      }
      case 'decay': {
        // Circle with inner cross
        g.fillCircle(0, 0, s);
        g.strokeCircle(0, 0, s);
        g.lineStyle(1.5, 0x66cc44, 0.4);
        g.beginPath();
        g.moveTo(0, -s * 0.5); g.lineTo(0, s * 0.5);
        g.moveTo(-s * 0.5, 0); g.lineTo(s * 0.5, 0);
        g.strokePath();
        break;
      }
      case 'world_tree': {
        // Large circle with inner ring + dot (ultimate)
        g.fillCircle(0, 0, s * 1.05);
        g.strokeCircle(0, 0, s * 1.05);
        g.lineStyle(1.5, 0xffffff, 0.25);
        g.strokeCircle(0, 0, s * 0.55);
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(0, 0, s * 0.2);
        break;
      }

      // === ARCANE TOWERS (diamond family) ===
      case 'arcane_bolt': {
        // Diamond
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, 0); g.lineTo(0, s); g.lineTo(-s, 0);
        g.closePath(); g.fillPath(); g.strokePath();
        break;
      }
      case 'mana_drain': {
        // Diamond with inner diamond
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, 0); g.lineTo(0, s); g.lineTo(-s, 0);
        g.closePath(); g.fillPath(); g.strokePath();
        g.lineStyle(1, 0xdd88ff, 0.4);
        g.beginPath();
        const is = s * 0.4;
        g.moveTo(0, -is); g.lineTo(is, 0); g.lineTo(0, is); g.lineTo(-is, 0);
        g.closePath(); g.strokePath();
        break;
      }
      case 'rift': {
        // Diamond with portal ring
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s, 0); g.lineTo(0, s); g.lineTo(-s, 0);
        g.closePath(); g.fillPath(); g.strokePath();
        g.lineStyle(1.5, 0xbb66ff, 0.5);
        g.strokeCircle(0, 0, s * 0.5);
        break;
      }
      case 'singularity': {
        // Large diamond with void center (ultimate)
        g.beginPath();
        g.moveTo(0, -s * 1.1); g.lineTo(s * 1.1, 0); g.lineTo(0, s * 1.1); g.lineTo(-s * 1.1, 0);
        g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(0x110022, 0.8);
        g.fillCircle(0, 0, s * 0.35);
        g.lineStyle(1, 0xcc88ff, 0.5);
        g.strokeCircle(0, 0, s * 0.35);
        break;
      }

      // === HOLY TOWERS (cross family) ===
      case 'smite': {
        // Simple cross
        this.drawCross(g, s, s * 0.35);
        break;
      }
      case 'aura_tower': {
        // Cross with inner circle
        this.drawCross(g, s, s * 0.35);
        g.lineStyle(1, 0xffeeaa, 0.4);
        g.strokeCircle(0, 0, s * 0.35);
        break;
      }
      case 'divine': {
        // Cross with radial lines
        this.drawCross(g, s, s * 0.35);
        g.lineStyle(1, 0xffddaa, 0.35);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6);
          g.strokePath();
        }
        break;
      }
      case 'seraph': {
        // Wide cross with halo (ultimate)
        this.drawCross(g, s * 1.05, s * 0.38);
        g.lineStyle(1.5, 0xffffff, 0.35);
        g.strokeCircle(0, 0, s * 0.75);
        g.fillStyle(0xffeeaa, 0.25);
        g.fillCircle(0, 0, s * 0.2);
        break;
      }

      default: {
        // Fallback square
        g.fillRect(-s, -s, s * 2, s * 2);
        g.strokeRect(-s, -s, s * 2, s * 2);
        break;
      }
    }

    container.add(g);

    // Turret (rotates with container)
    const turretWidth = 2 + ts.level;
    const turretLen = CELL_SIZE * (0.3 + ts.level * 0.04);
    const turret = this.add.rectangle(0, -turretLen / 2 - 2, turretWidth, turretLen, 0xffffff, 0.6);
    turret.setName('turret');
    container.add(turret);

    // Level number
    const levelText = this.add.text(0, CELL_SIZE * 0.28, `${ts.level}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffdd44',
      fontStyle: 'bold',
      resolution: 3,
    }).setOrigin(0.5).setAlpha(0.9);
    levelText.setName('levelText');
    container.add(levelText);

    if (ts.stats.auraRange > 0) {
      const auraCircle = this.add.circle(0, 0, ts.stats.auraRange * CELL_SIZE, color, 0.05);
      auraCircle.setStrokeStyle(1, color, 0.15);
      container.add(auraCircle);
    }

    return container;
  }

  // Helper: draw regular polygon
  private drawPolygon(g: Phaser.GameObjects.Graphics, sides: number, r: number, startAngle: number) {
    g.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + startAngle;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  // Helper: draw star shape
  private drawStar(g: Phaser.GameObjects.Graphics, points: number, outerR: number, innerR: number) {
    g.beginPath();
    for (let i = 0; i < points; i++) {
      const outerA = (i / points) * Math.PI * 2 - Math.PI / 2;
      const innerA = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
      const ox = Math.cos(outerA) * outerR;
      const oy = Math.sin(outerA) * outerR;
      const ix = Math.cos(innerA) * innerR;
      const iy = Math.sin(innerA) * innerR;
      if (i === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy);
      g.lineTo(ix, iy);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  // Helper: draw cross/plus shape
  private drawCross(g: Phaser.GameObjects.Graphics, size: number, arm: number) {
    g.beginPath();
    g.moveTo(-arm, -size);
    g.lineTo(arm, -size);
    g.lineTo(arm, -arm);
    g.lineTo(size, -arm);
    g.lineTo(size, arm);
    g.lineTo(arm, arm);
    g.lineTo(arm, size);
    g.lineTo(-arm, size);
    g.lineTo(-arm, arm);
    g.lineTo(-size, arm);
    g.lineTo(-size, -arm);
    g.lineTo(-arm, -arm);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  // ===== ENEMIES =====

  private reconcileEnemies(snap: GameStateSnapshot) {
    const current = new Set(Object.keys(snap.enemies));
    const now = Date.now();

    for (const [id, sprite] of this.enemySprites) {
      if (this.dyingEnemies.has(id)) continue; // Don't destroy during death animation
      if (!current.has(id) || !snap.enemies[id]?.isAlive) {
        sprite.destroy();
        this.enemySprites.delete(id);
        this.enemyPrevPos.delete(id);
      }
    }

    for (const [id, es] of Object.entries(snap.enemies)) {
      if (!es.isAlive) continue;
      if (this.dyingEnemies.has(id)) continue;

      const targetX = es.x * CELL_SIZE;
      const targetY = es.y * CELL_SIZE;

      let container = this.enemySprites.get(id);
      if (!container) {
        container = this.createEnemySprite(es);
        this.enemySprites.set(id, container);
        container.setPosition(targetX, targetY);
        this.enemyPrevPos.set(id, { x: targetX, y: targetY, time: now });
        container.setScale(1);
      } else {
        const prev = this.enemyPrevPos.get(id);
        const lerpFactor = 0.2;
        const newX = Phaser.Math.Linear(container.x, targetX, lerpFactor);
        const newY = Phaser.Math.Linear(container.y, targetY, lerpFactor);

        // 1b. Enemy rotation toward movement direction
        if (prev) {
          const dx = newX - prev.x;
          const dy = newY - prev.y;
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const targetAngle = Math.atan2(dy, dx);
            const diff = Phaser.Math.Angle.Wrap(targetAngle - container.rotation);
            container.rotation += diff * 0.15;
          }
        }

        // Update prev position (without bob)
        this.enemyPrevPos.set(id, { x: newX, y: newY, time: now });

        // 1a. Walk bobbing — sine-wave Y offset per enemy type
        const bobParams = ENEMY_BOB_PARAMS[es.enemyType] ?? DEFAULT_BOB;
        const bob = Math.sin(this.time.now / 1000 * bobParams.freq * Math.PI * 2) * bobParams.amp;
        container.setPosition(newX, newY + bob);

        this.updateEnemyHealthBar(container, es);
      }
    }

    // Viewport culling: hide enemies outside camera view (with margin)
    const cam = this.cameras.main;
    const margin = CELL_SIZE * 3;
    const left = cam.worldView.x - margin;
    const right = cam.worldView.x + cam.worldView.width + margin;
    const top = cam.worldView.y - margin;
    const bottom = cam.worldView.y + cam.worldView.height + margin;
    for (const [, container] of this.enemySprites) {
      const inView = container.x >= left && container.x <= right && container.y >= top && container.y <= bottom;
      container.setVisible(inView);
    }
  }

  private createEnemySprite(es: EnemySnapshot): Phaser.GameObjects.Container {
    const color = getEnemyColor(es.enemyType);
    const container = this.add.container(0, 0);
    container.setDepth(3);

    // Draw distinct shapes per enemy type
    const g = this.add.graphics();
    switch (es.enemyType) {
      case 'boss': {
        // Large octagon
        g.fillStyle(color, 0.9);
        g.lineStyle(2, 0xffffff, 0.5);
        const r = 10;
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      }
      case 'tank': {
        // Square (sturdy)
        g.fillStyle(color, 0.9);
        g.lineStyle(1.5, 0xffffff, 0.3);
        g.fillRect(-6, -6, 12, 12);
        g.strokeRect(-6, -6, 12, 12);
        break;
      }
      case 'armored': {
        // Hexagon (armored plate)
        g.fillStyle(color, 0.9);
        g.lineStyle(1.5, 0xccddee, 0.6);
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = Math.cos(a) * 7;
          const py = Math.sin(a) * 7;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      }
      case 'fast': {
        // Triangle pointing right (speedy)
        g.fillStyle(color, 0.9);
        g.beginPath();
        g.moveTo(7, 0);
        g.lineTo(-5, -5);
        g.lineTo(-5, 5);
        g.closePath();
        g.fillPath();
        break;
      }
      case 'swarm': {
        // Small circle
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 4);
        break;
      }
      case 'healer': {
        // Circle with cross
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 6);
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(-1, -4, 2, 8);
        g.fillRect(-4, -1, 8, 2);
        break;
      }
      case 'splitter': {
        // Diamond shape
        g.fillStyle(color, 0.9);
        g.beginPath();
        g.moveTo(0, -7);
        g.lineTo(6, 0);
        g.lineTo(0, 7);
        g.lineTo(-6, 0);
        g.closePath();
        g.fillPath();
        // Division line
        g.lineStyle(1, 0xffffff, 0.4);
        g.beginPath();
        g.moveTo(0, -7);
        g.lineTo(0, 7);
        g.strokePath();
        break;
      }
      case 'magic_resist': {
        // Circle with magic aura
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 6);
        g.lineStyle(1.5, 0xcc88ff, 0.5);
        g.strokeCircle(0, 0, 8);
        break;
      }
      case 'berserker': {
        // Spiky pentagon
        g.fillStyle(color, 0.9);
        g.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 8 : 5;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        break;
      }
      case 'flying': {
        // Circle with wings
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 5);
        g.lineStyle(1.5, 0x44ddff, 0.8);
        // Wing lines
        g.beginPath();
        g.moveTo(-3, -2);
        g.lineTo(-8, -6);
        g.moveTo(3, -2);
        g.lineTo(8, -6);
        g.strokePath();
        break;
      }
      default: {
        // Basic: simple circle
        g.fillStyle(color, 0.9);
        g.fillCircle(0, 0, 6);
        break;
      }
    }
    container.add(g);

    // Flying glow ring
    if (es.isFlying && es.enemyType !== 'flying') {
      g.lineStyle(1.5, 0x44ddff, 0.6);
      g.strokeCircle(0, 0, 9);
    }

    // Health bar
    const hbY = es.enemyType === 'boss' ? -15 : -11;
    const hbBg = this.add.rectangle(0, hbY, 16, 3, 0x000000, 0.7);
    container.add(hbBg);
    const hpPct = es.currentHealth / es.maxHealth;
    const hbFill = this.add.rectangle(-8 + 8 * hpPct, hbY, 16 * hpPct, 3, 0x44ff88, 0.9);
    hbFill.setName('hpBar');
    container.add(hbFill);

    return container;
  }

  private updateEnemyHealthBar(container: Phaser.GameObjects.Container, es: EnemySnapshot) {
    const hpBar = container.getByName('hpBar') as Phaser.GameObjects.Rectangle | null;
    if (hpBar) {
      const pct = Math.max(0, es.currentHealth / es.maxHealth);
      hpBar.width = 16 * pct;
      hpBar.x = -8 + 8 * pct;
      if (pct > 0.5) hpBar.fillColor = 0x44ff88;
      else if (pct > 0.25) hpBar.fillColor = 0xffdd44;
      else hpBar.fillColor = 0xff4466;
    }
  }

  // ===== PROJECTILES =====

  private reconcileProjectiles(snap: GameStateSnapshot) {
    const current = new Set(Object.keys(snap.projectiles));

    for (const [id, sprite] of this.projectileSprites) {
      if (!current.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    for (const [id, ps] of Object.entries(snap.projectiles)) {
      const px = ps.x * CELL_SIZE;
      const py = ps.y * CELL_SIZE;

      // Determine color, governor, and visual style from tower
      let color = 0xffffff;
      const tower = snap.towers[ps.towerId];
      if (tower) color = getTowerColor(tower.towerType);
      const gov = tower ? getGovernorForTower(tower.towerType) : null;

      // Governor-specific projectile shapes
      let radius = 3.5, alpha = 0.8, sx = 1, sy = 1, elongated = false;
      switch (gov) {
        case 'fire': radius = 4; alpha = 0.95; break;
        case 'ice': radius = 3; sx = 0.5; sy = 1.5; elongated = true; break;
        case 'thunder': radius = 2; sx = 0.3; sy = 2.0; elongated = true; break;
        case 'poison': radius = 3.5; alpha = 0.85; break;
        case 'death': radius = 3; alpha = 0.5; break;
        case 'nature': radius = 3; sx = 0.7; sy = 1.3; elongated = true; break;
        case 'arcane': radius = 3; alpha = 0.95; break;
        case 'holy': radius = 2; sx = 0.5; sy = 3.0; elongated = true; break;
      }

      let sprite = this.projectileSprites.get(id);
      if (!sprite) {
        sprite = this.add.circle(px, py, radius, color, alpha);
        sprite.setDepth(4);
        sprite.setScale(sx, sy);
        this.projectileSprites.set(id, sprite);
      }
      sprite.setPosition(px, py);
      sprite.setFillStyle(color, alpha);

      // Rotate elongated projectiles toward their target
      if (elongated) {
        const target = snap.enemies[ps.targetId];
        if (target && target.isAlive) {
          const angle = Math.atan2(target.y * CELL_SIZE - py, target.x * CELL_SIZE - px);
          sprite.setRotation(angle + Math.PI / 2);
        }
      } else {
        sprite.setRotation(0);
        sprite.setScale(sx, sy);
      }
    }
  }

  // ===== INPUT =====

  private handleClick(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cellX = Math.floor(worldPoint.x / CELL_SIZE);
    const cellY = Math.floor(worldPoint.y / CELL_SIZE);

    const uiStore = useUIStore.getState();
    const snapshot = useGameStore.getState().snapshot;
    if (!snapshot) return;

    // Ping: alt+click = "here", shift+click = "alert"
    const altDown = this.input.keyboard?.keys?.[Phaser.Input.Keyboard.KeyCodes.ALT]?.isDown;
    const shiftDown = this.input.keyboard?.keys?.[Phaser.Input.Keyboard.KeyCodes.SHIFT]?.isDown;
    if (altDown || shiftDown) {
      const pingType = shiftDown ? 'alert' : 'here';
      this.events.emit('ping', { x: cellX, y: cellY, pingType });
      // Also add locally for immediate feedback
      useUIStore.getState().addPing({
        id: crypto.randomUUID(),
        x: cellX, y: cellY,
        playerName: 'You',
        pingType: pingType as 'alert' | 'here' | 'help',
        time: Date.now(),
      });
      return;
    }

    // Ability targeting: click to use point AoE ability
    if (uiStore.abilityTargeting) {
      this.events.emit('use-ability', { targetX: cellX, targetY: cellY });
      uiStore.cancelAbilityTargeting();
      return;
    }

    if (uiStore.placementMode && uiStore.selectedTowerType) {
      this.events.emit('place-tower', {
        x: cellX,
        y: cellY,
        towerType: uiStore.selectedTowerType,
      });
      return;
    }

    for (const [id, ts] of Object.entries(snapshot.towers)) {
      if (ts.x === cellX && ts.y === cellY) {
        uiStore.selectTower(id);
        return;
      }
    }

    uiStore.selectTower(null);
  }

  private updateGhost(pointer: Phaser.Input.Pointer) {
    this.ghostGraphics.clear();
    const uiStore = useUIStore.getState();

    // Ability targeting ghost: show AoE radius circle
    if (uiStore.abilityTargeting) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const cellX = Math.floor(worldPoint.x / CELL_SIZE);
      const cellY = Math.floor(worldPoint.y / CELL_SIZE);
      const cx = cellX * CELL_SIZE + CELL_SIZE / 2;
      const cy = cellY * CELL_SIZE + CELL_SIZE / 2;

      // Find player's governor and ability radius
      const snapshot = useGameStore.getState().snapshot;
      const localPlayerId = (window as any).__playerId || 'local-player';
      const player = snapshot?.players[localPlayerId];
      const gov = player?.governor;
      const ability = gov ? (ABILITY_DEFINITIONS as Record<string, any>)[gov] : null;
      const radius = (ability?.radius ?? 4) * CELL_SIZE;
      const govData = gov ? (GOVERNORS as Record<string, { color: string }>)[gov] : null;
      const color = govData ? parseInt(govData.color.slice(1), 16) : 0x44bbff;

      // Pulsing targeting circle
      const pulse = 0.4 + 0.15 * Math.sin(this.time.now / 200);
      this.ghostGraphics.lineStyle(2, color, pulse + 0.2);
      this.ghostGraphics.strokeCircle(cx, cy, radius);
      this.ghostGraphics.fillStyle(color, pulse * 0.15);
      this.ghostGraphics.fillCircle(cx, cy, radius);

      // Crosshair at center
      this.ghostGraphics.lineStyle(1.5, 0xffffff, 0.5);
      this.ghostGraphics.beginPath();
      this.ghostGraphics.moveTo(cx - 6, cy); this.ghostGraphics.lineTo(cx + 6, cy);
      this.ghostGraphics.moveTo(cx, cy - 6); this.ghostGraphics.lineTo(cx, cy + 6);
      this.ghostGraphics.strokePath();
      return;
    }

    if (!uiStore.placementMode || !uiStore.selectedTowerType) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cellX = Math.floor(worldPoint.x / CELL_SIZE);
    const cellY = Math.floor(worldPoint.y / CELL_SIZE);

    const snapshot = useGameStore.getState().snapshot;
    if (!snapshot) return;

    const inBounds = cellX >= 0 && cellX < snapshot.map.width && cellY >= 0 && cellY < snapshot.map.height;

    // Check if placement would be invalid
    let blocked = !inBounds;
    if (inBounds) {
      // Check if cell has a tower
      for (const ts of Object.values(snapshot.towers)) {
        if (ts.x === cellX && ts.y === cellY) { blocked = true; break; }
      }
      // Check if cell is spawn or end
      if (!blocked) {
        const [sx, sy] = snapshot.map.spawn;
        const [ex, ey] = snapshot.map.end;
        if ((cellX === sx && cellY === sy) || (cellX === ex && cellY === ey)) blocked = true;
      }
      // Check if cell is on a checkpoint
      if (!blocked && snapshot.map.checkpoints) {
        for (const [cx, cy] of snapshot.map.checkpoints) {
          if (cellX === cx && cellY === cy) { blocked = true; break; }
        }
      }
    }

    const towerColor = getTowerColor(uiStore.selectedTowerType);
    const color = blocked ? 0xff4466 : towerColor;
    const alpha = blocked ? 0.35 : 0.4;
    this.ghostGraphics.fillStyle(color, alpha);
    this.ghostGraphics.fillRect(
      cellX * CELL_SIZE + 2,
      cellY * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );

    // X mark for invalid placement
    if (blocked) {
      const cx = cellX * CELL_SIZE + CELL_SIZE / 2;
      const cy = cellY * CELL_SIZE + CELL_SIZE / 2;
      this.ghostGraphics.lineStyle(2, 0xff4466, 0.6);
      this.ghostGraphics.beginPath();
      this.ghostGraphics.moveTo(cx - 5, cy - 5);
      this.ghostGraphics.lineTo(cx + 5, cy + 5);
      this.ghostGraphics.moveTo(cx + 5, cy - 5);
      this.ghostGraphics.lineTo(cx - 5, cy + 5);
      this.ghostGraphics.strokePath();
    }

    const stats = TOWER_DEFINITIONS[uiStore.selectedTowerType as TowerType];
    if (stats) {
      this.ghostGraphics.lineStyle(1, blocked ? 0xff4466 : towerColor, 0.3);
      this.ghostGraphics.strokeCircle(
        cellX * CELL_SIZE + CELL_SIZE / 2,
        cellY * CELL_SIZE + CELL_SIZE / 2,
        stats.range * CELL_SIZE,
      );
    }

    // Path preview: show how enemy path changes with this tower placement
    if (!blocked && inBounds && (cellX !== this._lastPreviewCellX || cellY !== this._lastPreviewCellY)) {
      this._lastPreviewCellX = cellX;
      this._lastPreviewCellY = cellY;
      try {
        const spawn: [number, number] = [snapshot.map.spawn[0], snapshot.map.spawn[1]];
        const end: [number, number] = [snapshot.map.end[0], snapshot.map.end[1]];
        const waypoints: [number, number][] = snapshot.map.checkpoints.map(([x, y]) => [x, y] as [number, number]);
        const grid = new OccupancyGrid(snapshot.map.width, snapshot.map.height, spawn, end, waypoints);
        // Block existing towers
        for (const ts of Object.values(snapshot.towers)) grid.placeTower(ts.x, ts.y);
        // Block ghost cell
        if (grid.canPlace(cellX, cellY)) {
          grid.placeTower(cellX, cellY);
          this._previewPathCells = grid.getPathCells().map(([x, y]) => [x, y]);
        } else {
          this._previewPathCells = null;
        }
      } catch {
        this._previewPathCells = null;
      }
    }
    if (blocked || !inBounds) {
      this._lastPreviewCellX = -1;
      this._lastPreviewCellY = -1;
      this._previewPathCells = null;
    }

    // Draw preview path
    if (this._previewPathCells && this._previewPathCells.length > 1) {
      this.ghostGraphics.lineStyle(2, 0xffdd44, 0.5);
      this.ghostGraphics.beginPath();
      const [fx, fy] = this._previewPathCells[0];
      this.ghostGraphics.moveTo(fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE + CELL_SIZE / 2);
      for (let i = 1; i < this._previewPathCells.length; i++) {
        const [px, py] = this._previewPathCells[i];
        this.ghostGraphics.lineTo(px * CELL_SIZE + CELL_SIZE / 2, py * CELL_SIZE + CELL_SIZE / 2);
      }
      this.ghostGraphics.strokePath();
    }
  }

  // ===== PINGS =====

  private static readonly PING_DURATION = 4000;
  private static readonly PING_COLORS: Record<string, number> = {
    alert: 0xff4466,
    here: 0x44bbff,
    help: 0xffdd44,
  };

  private updatePings() {
    this.pingGraphics.clear();
    const uiStore = useUIStore.getState();
    uiStore.clearExpiredPings();
    const pings = uiStore.pings;
    const now = Date.now();

    // Play sound for new pings
    if (pings.length > this.prevPingCount) {
      const newestPing = pings[pings.length - 1];
      if (newestPing && now - newestPing.time < 500) {
        switch (newestPing.pingType) {
          case 'alert': playPingAlert(); break;
          case 'here': playPingHere(); break;
          case 'help': playPingHelp(); break;
        }
      }
    }
    this.prevPingCount = pings.length;

    // Clean up stale labels
    while (this.pingLabels.length > pings.length) {
      this.pingLabels.pop()?.destroy();
    }

    for (let i = 0; i < pings.length; i++) {
      const p = pings[i];
      const elapsed = now - p.time;
      const progress = elapsed / GameScene.PING_DURATION;
      if (progress >= 1) continue;

      const cx = p.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
      const color = GameScene.PING_COLORS[p.pingType] ?? 0x44bbff;

      // Pulsing ring: expands from 8 to 20px radius, fading out
      const alpha = 1 - progress;
      const radius = 8 + progress * 12;
      this.pingGraphics.lineStyle(2, color, alpha * 0.8);
      this.pingGraphics.strokeCircle(cx, cy, radius);

      // Inner dot
      this.pingGraphics.fillStyle(color, alpha * 0.6);
      this.pingGraphics.fillCircle(cx, cy, 3);

      // Player name label
      if (i < this.pingLabels.length) {
        this.pingLabels[i].setPosition(cx, cy - 16).setAlpha(alpha).setVisible(true);
        this.pingLabels[i].setText(p.playerName);
      } else {
        const label = this.add.text(cx, cy - 16, p.playerName, {
          fontSize: '8px',
          color: '#' + color.toString(16).padStart(6, '0'),
          fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(15).setAlpha(alpha);
        this.pingLabels.push(label);
      }
    }

    // Hide unused labels
    for (let i = pings.length; i < this.pingLabels.length; i++) {
      this.pingLabels[i].setVisible(false);
    }
  }
}
