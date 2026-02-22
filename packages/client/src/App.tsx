import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState, GameLoop, TowerType, GamePhase,
  getAvailableTowers, getRegularTowers, COMMON_TOWERS,
  WAVE_BASE_INCOME, WAVE_INCOME_PER_WAVE, DIFFICULTY_SCALING,
  generateDailyChallenge, ReplayRecorder,
} from '@zastd/engine';
import type { ReplayData } from '@zastd/engine';
import type { DailyChallengeConfig } from '@zastd/engine';
import type { TargetingMode } from '@zastd/engine';
import { useGameStore } from './stores/game-store';
import { useLobbyStore } from './stores/lobby-store';
import { useUIStore } from './stores/ui-store';
import { useSettingsStore } from './stores/settings-store';
import { useStatsStore } from './stores/stats-store';
import { isSupabaseConfigured } from './supabase';
import { RoomManager } from './networking/room-manager';
import { LobbyDiscovery } from './networking/lobby-discovery';
import type { RoomAdvertisement } from './networking/protocol';
import { LobbyPage } from './ui/lobby/LobbyPage';
import { GamePage } from './ui/game/GamePage';
import { GameOverModal } from './ui/shared/GameOverModal';
import { AnimatedBackground } from './ui/shared/AnimatedBackground';
import { MainMenu } from './ui/lobby/MainMenu';
import { CreateRoomForm } from './ui/lobby/CreateRoomForm';
import { RoomList } from './ui/lobby/RoomList';
import { JoinByCode } from './ui/lobby/JoinByCode';
import { PasswordPrompt } from './ui/lobby/PasswordPrompt';
import {
  initAudio, startMusic, stopMusic,
  playPlaceTower, playUpgradeTower, playSellTower,
  playWaveStart, playWaveComplete, playVictory, playDefeat,
  playUIClick,
} from './audio/SoundManager';

function haptic(ms: number | number[] = 15) {
  try { navigator.vibrate?.(ms); } catch {}
}
import { useChatStore } from './ui/game/ChatPanel';
import { ErrorBoundary } from './ui/shared/ErrorBoundary';
import { ActionToast, useToastStore } from './ui/shared/ActionToast';
import { LoadingSpinner } from './ui/shared/LoadingSpinner';
import { TutorialOverlay } from './ui/game/TutorialOverlay';
import { ReplayViewer } from './ui/game/ReplayViewer';
import { useReplayStore } from './stores/replay-store';

const SOLO_PLAYER_ID = 'local-player';

export function App() {
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const hasSupabase = isSupabaseConfigured();
  const isGamePhase = appPhase === 'solo_game' || appPhase === 'game' || appPhase === 'daily_game' || appPhase === 'endless_game' || appPhase === 'tutorial_game' || appPhase === 'replay_viewer';

  // Initialize audio on first interaction
  useEffect(() => { initAudio(); }, []);

  // Start/stop music based on game phase
  useEffect(() => {
    if (isGamePhase) {
      startMusic();
    } else {
      stopMusic();
    }
  }, [isGamePhase]);

  // On mount: go directly to solo_lobby if no Supabase, or try reconnect
  useEffect(() => {
    if (!hasSupabase) {
      setAppPhase('solo_lobby');
      return;
    }
    // Attempt reconnect from saved session
    const saved = RoomManager.getSavedSession();
    if (saved && saved.roomCode) {
      const { setReconnecting } = useLobbyStore.getState();
      setReconnecting(true);
      const rm = new RoomManager(saved.playerId, saved.playerName);
      rm.attemptReconnect().then((success) => {
        setReconnecting(false);
        if (success) {
          (window as any).__roomManager = rm;
          (window as any).__playerId = saved.playerId;
          // Detect phase from snapshot instead of hardcoding 'game'
          const snap = useGameStore.getState().snapshot;
          const phase = snap?.phase;
          if (phase && phase !== 'lobby') {
            setAppPhase('game');
          } else {
            setAppPhase('lobby');
          }
        }
      }).catch(() => {
        setReconnecting(false);
      });
    }
  }, [hasSupabase, setAppPhase]);

  let content: React.ReactNode;
  switch (appPhase) {
    case 'main_menu':
      content = <MainMenuRouter />;
      break;
    case 'room_browser':
      content = <RoomBrowserRouter />;
      break;
    case 'create_room':
      content = <CreateRoomRouter />;
      break;
    case 'join_by_code':
      content = <JoinByCodeRouter />;
      break;
    case 'solo_lobby':
    case 'solo_game':
      content = <SoloMode />;
      break;
    case 'daily_lobby':
    case 'daily_game':
      content = <DailyMode />;
      break;
    case 'endless_lobby':
    case 'endless_game':
      content = <EndlessMode />;
      break;
    case 'tutorial_lobby':
    case 'tutorial_game':
      content = <TutorialMode />;
      break;
    case 'replay_viewer':
      content = <ReplayViewerMode />;
      break;
    case 'lobby':
    case 'game':
      content = <MultiplayerMode />;
      break;
    default:
      content = <MainMenuRouter />;
  }

  const isLoading = useLobbyStore((s) => s.isLoading);
  const loadingMessage = useLobbyStore((s) => s.loadingMessage);
  const isReconnecting = useLobbyStore((s) => s.isReconnecting);

  return (
    <ErrorBoundary>
      {!isGamePhase && <AnimatedBackground />}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {content}
      </div>
      <ActionToast />
      {isLoading && <LoadingSpinner message={loadingMessage || 'Loading...'} />}
      {isReconnecting && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', background: 'rgba(10, 10, 26, 0.92)',
          border: '1px solid #ffaa44', borderRadius: 8, color: '#ffaa44',
          fontSize: 13, fontWeight: 600, zIndex: 200,
        }}>
          Reconnecting...
        </div>
      )}
    </ErrorBoundary>
  );
}

// --- Main Menu Router ---

function MainMenuRouter() {
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);

  return (
    <MainMenu
      onBrowseRooms={() => setAppPhase('room_browser')}
      onCreateRoom={() => setAppPhase('create_room')}
      onJoinByCode={() => setAppPhase('join_by_code')}
      onPlaySolo={() => setAppPhase('solo_lobby')}
      onPlayDaily={() => setAppPhase('daily_lobby')}
      onPlayEndless={() => setAppPhase('endless_lobby')}
      onPlayTutorial={() => setAppPhase('tutorial_lobby')}
    />
  );
}

// --- Room Browser ---

function RoomBrowserRouter() {
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const availableRooms = useLobbyStore((s) => s.availableRooms);
  const setAvailableRooms = useLobbyStore((s) => s.setAvailableRooms);
  const discoveryRef = useRef<LobbyDiscovery | null>(null);
  const roomManagerRef = useRef<RoomManager | null>(null);
  const [pendingRoom, setPendingRoom] = useState<RoomAdvertisement | null>(null);
  const joinError = useLobbyStore((s) => s.joinError);
  const setJoinError = useLobbyStore((s) => s.setJoinError);

  useEffect(() => {
    const d = new LobbyDiscovery();
    discoveryRef.current = d;
    d.subscribe((rooms) => setAvailableRooms(rooms));
    return () => { d.unsubscribe(); };
  }, [setAvailableRooms]);

  const handleJoinRoom = useCallback((room: RoomAdvertisement) => {
    if (room.hasPassword) {
      setPendingRoom(room);
      setJoinError(null);
    } else {
      doJoin(room.roomCode);
    }
  }, []);

  const doJoin = useCallback(async (code: string, password?: string) => {
    const { playerName } = useLobbyStore.getState();
    const playerId = crypto.randomUUID();
    const rm = new RoomManager(playerId, playerName || 'Player');
    roomManagerRef.current = rm;
    try {
      await rm.joinRoom(code, password);
      setAppPhase('lobby');
      (window as any).__roomManager = rm;
      (window as any).__playerId = playerId;
    } catch (e: any) {
      setJoinError(e.message || 'Failed to join room');
    }
  }, []);

  return (
    <>
      <RoomList
        rooms={availableRooms}
        onJoinRoom={handleJoinRoom}
        onBack={() => setAppPhase('main_menu')}
      />
      {pendingRoom && (
        <PasswordPrompt
          roomName={pendingRoom.roomName}
          error={joinError}
          onSubmit={(pw) => doJoin(pendingRoom.roomCode, pw)}
          onCancel={() => { setPendingRoom(null); setJoinError(null); }}
        />
      )}
    </>
  );
}

// --- Create Room ---

function CreateRoomRouter() {
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);

  const handleCreate = useCallback(async (config: {
    roomName: string;
    password?: string;
    mapSize: string;
    difficulty: string;
  }) => {
    const { playerName, setLoading } = useLobbyStore.getState();
    const playerId = crypto.randomUUID();
    const rm = new RoomManager(playerId, playerName || 'Player');
    setLoading(true, 'Creating room...');
    try {
      await rm.createRoom({
        roomName: config.roomName,
        password: config.password,
        mapSize: config.mapSize,
        difficulty: config.difficulty,
      });
      (window as any).__roomManager = rm;
      (window as any).__playerId = playerId;
      setAppPhase('lobby');
    } catch (e: any) {
      useToastStore.getState().addToast(e.message || 'Failed to create room', 'error');
    } finally {
      useLobbyStore.getState().setLoading(false);
    }
  }, []);

  return (
    <CreateRoomForm
      onCancel={() => setAppPhase('main_menu')}
      onCreate={handleCreate}
    />
  );
}

// --- Join By Code ---

function JoinByCodeRouter() {
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const joinError = useLobbyStore((s) => s.joinError);
  const setJoinError = useLobbyStore((s) => s.setJoinError);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleJoin = useCallback(async (code: string, password?: string) => {
    const { playerName } = useLobbyStore.getState();
    const playerId = crypto.randomUUID();
    const rm = new RoomManager(playerId, playerName || 'Player');
    try {
      await rm.joinRoom(code, password);
      (window as any).__roomManager = rm;
      (window as any).__playerId = playerId;
      setAppPhase('lobby');
    } catch (e: any) {
      const msg = e.message || 'Failed to join';
      if (msg.includes('Incorrect password')) {
        setPendingCode(code);
        setNeedsPassword(true);
        setJoinError(msg);
      } else {
        setJoinError(msg);
      }
    }
  }, []);

  if (needsPassword && pendingCode) {
    return (
      <PasswordPrompt
        roomName={`Room ${pendingCode}`}
        error={joinError}
        onSubmit={(pw) => handleJoin(pendingCode, pw)}
        onCancel={() => { setNeedsPassword(false); setPendingCode(null); setJoinError(null); }}
      />
    );
  }

  return (
    <JoinByCode
      error={joinError}
      onJoin={(code) => handleJoin(code)}
      onCancel={() => { setJoinError(null); setAppPhase('main_menu'); }}
    />
  );
}

// --- Solo Mode ---

function SoloMode() {
  const [gameState] = useState(() => new GameState());
  const gameLoopRef = useRef<GameLoop | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const playerName = useLobbyStore((s) => s.playerName);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);
  const togglePause = useSettingsStore((s) => s.togglePause);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const recordGameEnd = useStatsStore((s) => s.recordGameEnd);
  const inGame = appPhase === 'solo_game';

  const [gameOver, setGameOver] = useState<{ victory: boolean; stats: Record<string, any>; waveReached?: number; livesRemaining?: number; difficulty?: string; mapSize?: string; playerCount?: number; replayData?: ReplayData | null } | null>(null);
  const [prevWaveNumber, setPrevWaveNumber] = useState(0);
  const ultimateNotifiedRef = useRef(false);

  useEffect(() => {
    gameState.addPlayer(SOLO_PLAYER_ID, playerName || 'Player');
    setSnapshot(gameState.serialize());
  }, []);

  // Sync game speed from settings to game loop
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setSpeed(useSettingsStore.getState().gameSpeed);
    }
    return useSettingsStore.subscribe((s) => {
      if (gameLoopRef.current) gameLoopRef.current.setSpeed(s.gameSpeed);
    });
  }, [inGame]);

  useEffect(() => {
    if (!inGame) return;
    const interval = setInterval(() => {
      const snap = gameState.serialize();
      setSnapshot(snap);

      // Detect wave completion for sound + reward toast
      if (snap.waveNumber > prevWaveNumber && prevWaveNumber > 0) {
        playWaveComplete();
        const ds = DIFFICULTY_SCALING[snap.settings.difficulty] ?? DIFFICULTY_SCALING.normal;
        const income = Math.floor((WAVE_BASE_INCOME + prevWaveNumber * WAVE_INCOME_PER_WAVE) * ds.incomeMult);
        useToastStore.getState().addToast(`Wave ${prevWaveNumber} complete! +${income}g`, 'success', 3000);
      }
      setPrevWaveNumber(snap.waveNumber);

      // Detect ultimate unlock
      const player = snap.players[SOLO_PLAYER_ID];
      if (player?.ultimateUnlocked && !ultimateNotifiedRef.current) {
        ultimateNotifiedRef.current = true;
        useToastStore.getState().addToast('Ultimate Tower unlocked!', 'warning', 5000);
      }

      if (gameLoopRef.current) {
        const events = gameLoopRef.current.drainEvents();
        for (const ev of events) {
          if (ev.type === 'game_over') {
            const victory = ev.victory as boolean;
            if (victory) playVictory(); else playDefeat();
            const gameCtx = { difficulty: snap.settings.difficulty, mapSize: snap.settings.mapSize, playerCount: Object.keys(snap.players).length, gameSpeed: useSettingsStore.getState().gameSpeed };
            recordGameEnd(victory, ev.stats as any, snap.waveNumber, SOLO_PLAYER_ID, gameCtx);
            setGameOver({ victory, stats: ev.stats as any, waveReached: snap.waveNumber, livesRemaining: snap.sharedLives, ...gameCtx, replayData: (ev as any).replayData ?? replayRecorderRef.current?.getData() ?? null });
          }
          if (ev.type === 'game_reset') {
            stopRef.current?.();
            gameLoopRef.current = null;
            replayRecorderRef.current = null;
            setGameOver(null);
            setAppPhase('solo_lobby');
          }
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [inGame, gameState, setSnapshot, prevWaveNumber]);

  useEffect(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) player.name = playerName || 'Player';
  }, [playerName, gameState]);

  const handleSelectGovernor = useCallback((element: string) => {
    gameState.selectGovernor(SOLO_PLAYER_ID, element);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleReady = useCallback(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) {
      gameState.setPlayerReady(SOLO_PLAYER_ID, !player.ready);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleStartGame = useCallback(() => {
    gameState.startGame();
    const loop = new GameLoop(gameState);
    const recorder = new ReplayRecorder();
    loop.replayRecorder = recorder;
    replayRecorderRef.current = recorder;
    gameLoopRef.current = loop;
    stopRef.current = loop.start();
    setAppPhase('solo_game');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot]);

  const handleUpdateSettings = useCallback((settings: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }) => {
    gameState.updateSettings(settings);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handlePlaceTower = useCallback((data: { x: number; y: number; towerType: string }) => {
    const [canPlace, reason] = gameState.canPlaceTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (!canPlace) {
      useToastStore.getState().addToast(reason, 'error', 2000);
      return;
    }
    const result = gameState.placeTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (result) {
      playPlaceTower();
      haptic(15);
      cancelPlacement();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot, cancelPlacement]);

  const handleUpgradeTower = useCallback((towerId: string) => {
    gameState.upgradeTower(SOLO_PLAYER_ID, towerId);
    playUpgradeTower();
    haptic([10, 30, 10]);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSellTower = useCallback((towerId: string) => {
    if (!gameState.sellTower(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Cannot sell yet (cooldown)', 'warning', 1500);
      return;
    }
    playSellTower();
    haptic(25);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSetTargeting = useCallback((towerId: string, mode: string) => {
    gameState.setTowerTargeting(SOLO_PLAYER_ID, towerId, mode as TargetingMode);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleStartWave = useCallback(() => {
    if (gameState.canManuallyStartWave()) {
      gameState.lastManualWaveStartTime = Date.now() / 1000;
      gameState.startNextWave();
      playWaveStart();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleBuyTech = useCallback((techId: string) => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player?.buyTech(techId)) {
      playUIClick();
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Not enough lumber or already maxed', 'warning', 2000);
    }
  }, [gameState, setSnapshot]);

  const handleUseAbility = useCallback((targetX?: number, targetY?: number) => {
    if (gameState.useAbility(SOLO_PLAYER_ID, targetX, targetY)) {
      haptic([15, 30, 15]);
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Ability not ready', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleSendCreeps = useCallback((enemyType: string, count: number) => {
    if (gameState.sendCreeps(SOLO_PLAYER_ID, enemyType, count)) {
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Cannot send creeps', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleQueueUpgrade = useCallback((towerId: string) => {
    if (gameState.queueUpgrade(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Upgrade queued', 'success', 1500);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleCancelQueue = useCallback((towerId: string) => {
    if (gameState.cancelQueuedUpgrade(SOLO_PLAYER_ID, towerId)) {
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleGameOverClose = useCallback(() => {
    setGameOver(null);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    gameState.resetGame();
    setAppPhase('solo_lobby');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot]);

  const handleQuit = useCallback(() => {
    setIsPaused(false);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    gameState.resetGame();
    setAppPhase('solo_lobby');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot, setIsPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle keyboard when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (useSettingsStore.getState().showHelp) {
          setShowHelp(false);
        } else if (inGame) {
          togglePause();
        } else {
          cancelPlacement();
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (inGame) setShowHelp(!useSettingsStore.getState().showHelp);
      }
      if (useSettingsStore.getState().isPaused || useSettingsStore.getState().showHelp) return;
      if (e.key === ' ' && inGame) {
        e.preventDefault();
        handleStartWave();
      }
      if (e.key === 'q' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) handleUpgradeTower(selected);
      }
      if (e.key === 'e' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) {
          handleSellTower(selected);
          useUIStore.getState().selectTower(null);
        }
      }
      if (inGame && e.key >= '1' && e.key <= '9') {
        const player = gameState.players.get(SOLO_PLAYER_ID);
        if (!player) return;
        const gov = player.governor;
        const available = gov
          ? (player.ultimateUnlocked ? getAvailableTowers(gov) : getRegularTowers(gov))
          : [...COMMON_TOWERS];
        const idx = parseInt(e.key) - 1;
        if (idx < available.length) {
          useUIStore.getState().startPlacement(available[idx] as TowerType);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelPlacement, inGame, handleStartWave, handleUpgradeTower, handleSellTower, gameState, togglePause, setShowHelp]);

  const snapshot = useGameStore((s) => s.snapshot);

  if (!inGame) {
    const players: Record<string, { name: string; governor: string | null; ready: boolean }> = {};
    if (snapshot) {
      for (const [pid, p] of Object.entries(snapshot.players)) {
        players[pid] = { name: p.name, governor: p.governor, ready: p.ready };
      }
    }

    return (
      <LobbyPage
        playerId={SOLO_PLAYER_ID}
        players={players}
        onSelectGovernor={handleSelectGovernor}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onUpdateSettings={handleUpdateSettings}
        settings={snapshot?.settings ?? { mapSize: 'tiny', mapLayout: 'classic', difficulty: 'normal', moneySharing: false }}
        allReady={gameState.allPlayersReady()}
        isHost={true}
        onLeave={isSupabaseConfigured() ? () => {
          setAppPhase('main_menu');
          gameState.resetGame();
          setSnapshot(gameState.serialize());
        } : undefined}
      />
    );
  }

  return (
    <>
      <GamePage
        playerId={SOLO_PLAYER_ID}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onSellTower={handleSellTower}
        onSetTargeting={handleSetTargeting}
        onStartWave={handleStartWave}
        onBuyTech={handleBuyTech}
        onUseAbility={handleUseAbility}
        onQuit={handleQuit}
        onSendCreeps={handleSendCreeps}
        onQueueUpgrade={handleQueueUpgrade}
        onCancelQueue={handleCancelQueue}
        isSolo
      />
      {gameOver && (
        <GameOverModal
          victory={gameOver.victory}
          stats={gameOver.stats}
          onClose={handleGameOverClose}
          waveReached={gameOver.waveReached}
          livesRemaining={gameOver.livesRemaining}
          difficulty={gameOver.difficulty}
          replayData={gameOver.replayData}
        />
      )}
    </>
  );
}

// --- Daily Challenge Mode ---

function DailyMode() {
  const [dailyConfig] = useState(() => generateDailyChallenge());
  const [gameState] = useState(() => {
    const gs = new GameState();
    gs.updateSettings({
      mapSize: dailyConfig.mapSize,
      mapLayout: dailyConfig.mapLayout,
      difficulty: dailyConfig.difficulty,
    });
    gs.waveMutatorOverrides = dailyConfig.waveMutators;
    return gs;
  });
  const gameLoopRef = useRef<GameLoop | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const playerName = useLobbyStore((s) => s.playerName);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);
  const togglePause = useSettingsStore((s) => s.togglePause);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const recordGameEnd = useStatsStore((s) => s.recordGameEnd);
  const inGame = appPhase === 'daily_game';

  const [gameOver, setGameOver] = useState<{ victory: boolean; stats: Record<string, any>; waveReached?: number; livesRemaining?: number; difficulty?: string; mapSize?: string; playerCount?: number; replayData?: ReplayData | null } | null>(null);
  const [prevWaveNumber, setPrevWaveNumber] = useState(0);
  const ultimateNotifiedRef = useRef(false);

  useEffect(() => {
    gameState.addPlayer(SOLO_PLAYER_ID, playerName || 'Player');
    // Auto-select featured governor
    gameState.selectGovernor(SOLO_PLAYER_ID, dailyConfig.featuredGovernor);
    setSnapshot(gameState.serialize());
  }, []);

  // Sync game speed from settings to game loop
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setSpeed(useSettingsStore.getState().gameSpeed);
    }
    return useSettingsStore.subscribe((s) => {
      if (gameLoopRef.current) gameLoopRef.current.setSpeed(s.gameSpeed);
    });
  }, [inGame]);

  useEffect(() => {
    if (!inGame) return;
    const interval = setInterval(() => {
      const snap = gameState.serialize();
      setSnapshot(snap);

      if (snap.waveNumber > prevWaveNumber && prevWaveNumber > 0) {
        playWaveComplete();
        const ds = DIFFICULTY_SCALING[snap.settings.difficulty] ?? DIFFICULTY_SCALING.normal;
        const income = Math.floor((WAVE_BASE_INCOME + prevWaveNumber * WAVE_INCOME_PER_WAVE) * ds.incomeMult);
        useToastStore.getState().addToast(`Wave ${prevWaveNumber} complete! +${income}g`, 'success', 3000);
      }
      setPrevWaveNumber(snap.waveNumber);

      const player = snap.players[SOLO_PLAYER_ID];
      if (player?.ultimateUnlocked && !ultimateNotifiedRef.current) {
        ultimateNotifiedRef.current = true;
        useToastStore.getState().addToast('Ultimate Tower unlocked!', 'warning', 5000);
      }

      if (gameLoopRef.current) {
        const events = gameLoopRef.current.drainEvents();
        for (const ev of events) {
          if (ev.type === 'game_over') {
            const victory = ev.victory as boolean;
            if (victory) playVictory(); else playDefeat();
            const gameCtx = { difficulty: snap.settings.difficulty, mapSize: snap.settings.mapSize, playerCount: 1, gameSpeed: useSettingsStore.getState().gameSpeed };
            recordGameEnd(victory, ev.stats as any, snap.waveNumber, SOLO_PLAYER_ID, gameCtx);
            setGameOver({ victory, stats: ev.stats as any, waveReached: snap.waveNumber, livesRemaining: snap.sharedLives, ...gameCtx, replayData: (ev as any).replayData ?? replayRecorderRef.current?.getData() ?? null });
          }
          if (ev.type === 'game_reset') {
            stopRef.current?.();
            gameLoopRef.current = null;
            replayRecorderRef.current = null;
            setGameOver(null);
            setAppPhase('daily_lobby');
          }
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [inGame, gameState, setSnapshot, prevWaveNumber]);

  useEffect(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) player.name = playerName || 'Player';
  }, [playerName, gameState]);

  const handleSelectGovernor = useCallback((element: string) => {
    gameState.selectGovernor(SOLO_PLAYER_ID, element);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleReady = useCallback(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) {
      gameState.setPlayerReady(SOLO_PLAYER_ID, !player.ready);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleStartGame = useCallback(() => {
    gameState.startGame();
    const loop = new GameLoop(gameState);
    const recorder = new ReplayRecorder();
    loop.replayRecorder = recorder;
    replayRecorderRef.current = recorder;
    gameLoopRef.current = loop;
    stopRef.current = loop.start();
    setAppPhase('daily_game');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot]);

  const handlePlaceTower = useCallback((data: { x: number; y: number; towerType: string }) => {
    const [canPlace, reason] = gameState.canPlaceTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (!canPlace) {
      useToastStore.getState().addToast(reason, 'error', 2000);
      return;
    }
    const result = gameState.placeTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (result) {
      playPlaceTower();
      haptic(15);
      cancelPlacement();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot, cancelPlacement]);

  const handleUpgradeTower = useCallback((towerId: string) => {
    gameState.upgradeTower(SOLO_PLAYER_ID, towerId);
    playUpgradeTower();
    haptic([10, 30, 10]);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSellTower = useCallback((towerId: string) => {
    if (!gameState.sellTower(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Cannot sell yet (cooldown)', 'warning', 1500);
      return;
    }
    playSellTower();
    haptic(25);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSetTargeting = useCallback((towerId: string, mode: string) => {
    gameState.setTowerTargeting(SOLO_PLAYER_ID, towerId, mode as TargetingMode);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleStartWave = useCallback(() => {
    if (gameState.canManuallyStartWave()) {
      gameState.lastManualWaveStartTime = Date.now() / 1000;
      gameState.startNextWave();
      playWaveStart();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleBuyTech = useCallback((techId: string) => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player?.buyTech(techId)) {
      playUIClick();
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Not enough lumber or already maxed', 'warning', 2000);
    }
  }, [gameState, setSnapshot]);

  const handleUseAbility = useCallback((targetX?: number, targetY?: number) => {
    if (gameState.useAbility(SOLO_PLAYER_ID, targetX, targetY)) {
      haptic([15, 30, 15]);
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Ability not ready', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleSendCreeps = useCallback((enemyType: string, count: number) => {
    if (gameState.sendCreeps(SOLO_PLAYER_ID, enemyType, count)) {
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Cannot send creeps', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleQueueUpgrade = useCallback((towerId: string) => {
    if (gameState.queueUpgrade(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Upgrade queued', 'success', 1500);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleCancelQueue = useCallback((towerId: string) => {
    if (gameState.cancelQueuedUpgrade(SOLO_PLAYER_ID, towerId)) {
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleGameOverClose = useCallback(() => {
    setGameOver(null);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    setAppPhase('main_menu');
  }, [setAppPhase]);

  const handleQuit = useCallback(() => {
    setIsPaused(false);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    setAppPhase('main_menu');
  }, [setAppPhase, setIsPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (useSettingsStore.getState().showHelp) {
          setShowHelp(false);
        } else if (inGame) {
          togglePause();
        } else {
          cancelPlacement();
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (inGame) setShowHelp(!useSettingsStore.getState().showHelp);
      }
      if (useSettingsStore.getState().isPaused || useSettingsStore.getState().showHelp) return;
      if (e.key === ' ' && inGame) {
        e.preventDefault();
        handleStartWave();
      }
      if (e.key === 'q' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) handleUpgradeTower(selected);
      }
      if (e.key === 'e' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) {
          handleSellTower(selected);
          useUIStore.getState().selectTower(null);
        }
      }
      if (inGame && e.key >= '1' && e.key <= '9') {
        const player = gameState.players.get(SOLO_PLAYER_ID);
        if (!player) return;
        const gov = player.governor;
        const available = gov
          ? (player.ultimateUnlocked ? getAvailableTowers(gov) : getRegularTowers(gov))
          : [...COMMON_TOWERS];
        const idx = parseInt(e.key) - 1;
        if (idx < available.length) {
          useUIStore.getState().startPlacement(available[idx] as TowerType);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelPlacement, inGame, handleStartWave, handleUpgradeTower, handleSellTower, gameState, togglePause, setShowHelp]);

  const snapshot = useGameStore((s) => s.snapshot);

  if (!inGame) {
    const players: Record<string, { name: string; governor: string | null; ready: boolean }> = {};
    if (snapshot) {
      for (const [pid, p] of Object.entries(snapshot.players)) {
        players[pid] = { name: p.name, governor: p.governor, ready: p.ready };
      }
    }

    return (
      <LobbyPage
        playerId={SOLO_PLAYER_ID}
        players={players}
        onSelectGovernor={handleSelectGovernor}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onUpdateSettings={() => {}} // no-op: settings locked in daily mode
        settings={snapshot?.settings ?? { mapSize: dailyConfig.mapSize, mapLayout: dailyConfig.mapLayout, difficulty: dailyConfig.difficulty, moneySharing: false }}
        allReady={gameState.allPlayersReady()}
        isHost={false}
        onLeave={() => setAppPhase('main_menu')}
        dailyInfo={{ dateString: dailyConfig.dateString, featuredGovernor: dailyConfig.featuredGovernor }}
      />
    );
  }

  return (
    <>
      <GamePage
        playerId={SOLO_PLAYER_ID}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onSellTower={handleSellTower}
        onSetTargeting={handleSetTargeting}
        onStartWave={handleStartWave}
        onBuyTech={handleBuyTech}
        onUseAbility={handleUseAbility}
        onQuit={handleQuit}
        onSendCreeps={handleSendCreeps}
        onQueueUpgrade={handleQueueUpgrade}
        onCancelQueue={handleCancelQueue}
        isSolo
      />
      {gameOver && (
        <GameOverModal
          victory={gameOver.victory}
          stats={gameOver.stats}
          onClose={handleGameOverClose}
          waveReached={gameOver.waveReached}
          livesRemaining={gameOver.livesRemaining}
          difficulty={gameOver.difficulty}
          replayData={gameOver.replayData}
        />
      )}
    </>
  );
}

// --- Endless Mode ---

function EndlessMode() {
  const [gameState] = useState(() => {
    const gs = new GameState();
    gs.endlessMode = true;
    return gs;
  });
  const gameLoopRef = useRef<GameLoop | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const replayRecorderRef = useRef<ReplayRecorder | null>(null);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const playerName = useLobbyStore((s) => s.playerName);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);
  const togglePause = useSettingsStore((s) => s.togglePause);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const recordGameEnd = useStatsStore((s) => s.recordGameEnd);
  const inGame = appPhase === 'endless_game';

  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<{ victory: boolean; stats: Record<string, any>; waveReached?: number; livesRemaining?: number; difficulty?: string; mapSize?: string; playerCount?: number; scoreMultiplier?: number; replayData?: ReplayData | null } | null>(null);
  const [prevWaveNumber, setPrevWaveNumber] = useState(0);
  const ultimateNotifiedRef = useRef(false);

  useEffect(() => {
    gameState.addPlayer(SOLO_PLAYER_ID, playerName || 'Player');
    setSnapshot(gameState.serialize());
  }, []);

  // Sync game speed from settings to game loop
  useEffect(() => {
    if (gameLoopRef.current) {
      gameLoopRef.current.setSpeed(useSettingsStore.getState().gameSpeed);
    }
    return useSettingsStore.subscribe((s) => {
      if (gameLoopRef.current) gameLoopRef.current.setSpeed(s.gameSpeed);
    });
  }, [inGame]);

  useEffect(() => {
    if (!inGame) return;
    const interval = setInterval(() => {
      const snap = gameState.serialize();
      setSnapshot(snap);

      if (snap.waveNumber > prevWaveNumber && prevWaveNumber > 0) {
        playWaveComplete();
        const ds = DIFFICULTY_SCALING[snap.settings.difficulty] ?? DIFFICULTY_SCALING.normal;
        const income = Math.floor((WAVE_BASE_INCOME + prevWaveNumber * WAVE_INCOME_PER_WAVE) * ds.incomeMult);
        useToastStore.getState().addToast(`Wave ${prevWaveNumber} complete! +${income}g`, 'success', 3000);
      }
      setPrevWaveNumber(snap.waveNumber);

      const player = snap.players[SOLO_PLAYER_ID];
      if (player?.ultimateUnlocked && !ultimateNotifiedRef.current) {
        ultimateNotifiedRef.current = true;
        useToastStore.getState().addToast('Ultimate Tower unlocked!', 'warning', 5000);
      }

      if (gameLoopRef.current) {
        const events = gameLoopRef.current.drainEvents();
        for (const ev of events) {
          if (ev.type === 'game_over') {
            const victory = ev.victory as boolean;
            if (victory) playVictory(); else playDefeat();
            const gameCtx = {
              difficulty: snap.settings.difficulty, mapSize: snap.settings.mapSize,
              playerCount: Object.keys(snap.players).length,
              isEndless: true, gameSpeed: useSettingsStore.getState().gameSpeed,
              modifierCount: gameState.activeModifiers.length,
            };
            recordGameEnd(victory, ev.stats as any, snap.waveNumber, SOLO_PLAYER_ID, gameCtx);
            setGameOver({
              victory, stats: ev.stats as any, waveReached: snap.waveNumber,
              livesRemaining: snap.sharedLives, ...gameCtx,
              scoreMultiplier: snap.scoreMultiplier,
              replayData: (ev as any).replayData ?? replayRecorderRef.current?.getData() ?? null,
            });
          }
          if (ev.type === 'game_reset') {
            stopRef.current?.();
            gameLoopRef.current = null;
            replayRecorderRef.current = null;
            setGameOver(null);
            setAppPhase('endless_lobby');
          }
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [inGame, gameState, setSnapshot, prevWaveNumber]);

  useEffect(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) player.name = playerName || 'Player';
  }, [playerName, gameState]);

  const handleSelectGovernor = useCallback((element: string) => {
    gameState.selectGovernor(SOLO_PLAYER_ID, element);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleReady = useCallback(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) {
      gameState.setPlayerReady(SOLO_PLAYER_ID, !player.ready);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleStartGame = useCallback(() => {
    gameState.activeModifiers = selectedModifiers;
    gameState.applyModifiers();
    gameState.startGame();
    const loop = new GameLoop(gameState);
    const recorder = new ReplayRecorder();
    loop.replayRecorder = recorder;
    replayRecorderRef.current = recorder;
    gameLoopRef.current = loop;
    stopRef.current = loop.start();
    setAppPhase('endless_game');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot, selectedModifiers]);

  const handleUpdateSettings = useCallback((settings: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }) => {
    gameState.updateSettings(settings);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handlePlaceTower = useCallback((data: { x: number; y: number; towerType: string }) => {
    const [canPlace, reason] = gameState.canPlaceTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (!canPlace) {
      useToastStore.getState().addToast(reason, 'error', 2000);
      return;
    }
    const result = gameState.placeTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (result) {
      playPlaceTower();
      haptic(15);
      cancelPlacement();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot, cancelPlacement]);

  const handleUpgradeTower = useCallback((towerId: string) => {
    gameState.upgradeTower(SOLO_PLAYER_ID, towerId);
    playUpgradeTower();
    haptic([10, 30, 10]);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSellTower = useCallback((towerId: string) => {
    if (!gameState.sellTower(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Cannot sell yet (cooldown)', 'warning', 1500);
      return;
    }
    playSellTower();
    haptic(25);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSetTargeting = useCallback((towerId: string, mode: string) => {
    gameState.setTowerTargeting(SOLO_PLAYER_ID, towerId, mode as TargetingMode);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleStartWave = useCallback(() => {
    if (gameState.canManuallyStartWave()) {
      gameState.lastManualWaveStartTime = Date.now() / 1000;
      gameState.startNextWave();
      playWaveStart();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleBuyTech = useCallback((techId: string) => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player?.buyTech(techId)) {
      playUIClick();
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Not enough lumber or already maxed', 'warning', 2000);
    }
  }, [gameState, setSnapshot]);

  const handleUseAbility = useCallback((targetX?: number, targetY?: number) => {
    if (gameState.useAbility(SOLO_PLAYER_ID, targetX, targetY)) {
      haptic([15, 30, 15]);
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Ability not ready', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleSendCreeps = useCallback((enemyType: string, count: number) => {
    if (gameState.sendCreeps(SOLO_PLAYER_ID, enemyType, count)) {
      setSnapshot(gameState.serialize());
    } else {
      useToastStore.getState().addToast('Cannot send creeps', 'warning', 1500);
    }
  }, [gameState, setSnapshot]);

  const handleQueueUpgrade = useCallback((towerId: string) => {
    if (gameState.queueUpgrade(SOLO_PLAYER_ID, towerId)) {
      useToastStore.getState().addToast('Upgrade queued', 'success', 1500);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleCancelQueue = useCallback((towerId: string) => {
    if (gameState.cancelQueuedUpgrade(SOLO_PLAYER_ID, towerId)) {
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleGameOverClose = useCallback(() => {
    setGameOver(null);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    gameState.resetGame();
    gameState.endlessMode = true;
    setAppPhase('endless_lobby');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot]);

  const handleQuit = useCallback(() => {
    setIsPaused(false);
    stopRef.current?.();
    gameLoopRef.current = null;
    replayRecorderRef.current = null;
    gameState.resetGame();
    gameState.endlessMode = true;
    setAppPhase('endless_lobby');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot, setIsPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (useSettingsStore.getState().showHelp) {
          setShowHelp(false);
        } else if (inGame) {
          togglePause();
        } else {
          cancelPlacement();
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (inGame) setShowHelp(!useSettingsStore.getState().showHelp);
      }
      if (useSettingsStore.getState().isPaused || useSettingsStore.getState().showHelp) return;
      if (e.key === ' ' && inGame) {
        e.preventDefault();
        handleStartWave();
      }
      if (e.key === 'q' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) handleUpgradeTower(selected);
      }
      if (e.key === 'e' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) {
          handleSellTower(selected);
          useUIStore.getState().selectTower(null);
        }
      }
      if (inGame && e.key >= '1' && e.key <= '9') {
        const player = gameState.players.get(SOLO_PLAYER_ID);
        if (!player) return;
        const gov = player.governor;
        const available = gov
          ? (player.ultimateUnlocked ? getAvailableTowers(gov) : getRegularTowers(gov))
          : [...COMMON_TOWERS];
        const idx = parseInt(e.key) - 1;
        if (idx < available.length) {
          useUIStore.getState().startPlacement(available[idx] as TowerType);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelPlacement, inGame, handleStartWave, handleUpgradeTower, handleSellTower, gameState, togglePause, setShowHelp]);

  const snapshot = useGameStore((s) => s.snapshot);

  if (!inGame) {
    const players: Record<string, { name: string; governor: string | null; ready: boolean }> = {};
    if (snapshot) {
      for (const [pid, p] of Object.entries(snapshot.players)) {
        players[pid] = { name: p.name, governor: p.governor, ready: p.ready };
      }
    }

    return (
      <LobbyPage
        playerId={SOLO_PLAYER_ID}
        players={players}
        onSelectGovernor={handleSelectGovernor}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onUpdateSettings={handleUpdateSettings}
        settings={snapshot?.settings ?? { mapSize: 'tiny', mapLayout: 'classic', difficulty: 'normal', moneySharing: false }}
        allReady={gameState.allPlayersReady()}
        isHost={true}
        onLeave={isSupabaseConfigured() ? () => {
          setAppPhase('main_menu');
          gameState.resetGame();
          gameState.endlessMode = true;
          setSnapshot(gameState.serialize());
        } : undefined}
        endlessMode
        showModifiers
        selectedModifiers={selectedModifiers}
        onUpdateModifiers={setSelectedModifiers}
      />
    );
  }

  return (
    <>
      <GamePage
        playerId={SOLO_PLAYER_ID}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onSellTower={handleSellTower}
        onSetTargeting={handleSetTargeting}
        onStartWave={handleStartWave}
        onBuyTech={handleBuyTech}
        onUseAbility={handleUseAbility}
        onQuit={handleQuit}
        onSendCreeps={handleSendCreeps}
        onQueueUpgrade={handleQueueUpgrade}
        onCancelQueue={handleCancelQueue}
        isSolo
      />
      {gameOver && (
        <GameOverModal
          victory={gameOver.victory}
          stats={gameOver.stats}
          onClose={handleGameOverClose}
          waveReached={gameOver.waveReached}
          livesRemaining={gameOver.livesRemaining}
          difficulty={gameOver.difficulty}
          endlessMode
          scoreMultiplier={gameOver.scoreMultiplier}
          replayData={gameOver.replayData}
        />
      )}
    </>
  );
}

// --- Multiplayer Mode ---

function MultiplayerMode() {
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const currentRoomCode = useLobbyStore((s) => s.currentRoomCode);
  const isHost = useLobbyStore((s) => s.isHost);
  const snapshot = useGameStore((s) => s.snapshot);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);
  const togglePause = useSettingsStore((s) => s.togglePause);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const recordGameEnd = useStatsStore((s) => s.recordGameEnd);

  const [gameOver, setGameOver] = useState<{ victory: boolean; stats: Record<string, any>; waveReached?: number; livesRemaining?: number; difficulty?: string; mapSize?: string; playerCount?: number } | null>(null);

  const rm = (window as any).__roomManager as RoomManager | undefined;
  const playerId = ((window as any).__playerId as string) || 'unknown';

  // Set up game over callback
  useEffect(() => {
    if (rm) {
      (rm as any).onGameOver = (victory: boolean, stats: Record<string, any>) => {
        if (victory) playVictory(); else playDefeat();
        const snap = useGameStore.getState().snapshot;
        const gameCtx = { difficulty: snap?.settings.difficulty ?? 'normal', mapSize: snap?.settings.mapSize ?? 'medium', playerCount: snap ? Object.keys(snap.players).length : 1 };
        recordGameEnd(victory, stats, snap?.waveNumber ?? 0, playerId, gameCtx);
        setGameOver({ victory, stats, waveReached: snap?.waveNumber, livesRemaining: snap?.sharedLives, ...gameCtx });
      };
    }
  }, [rm]);

  const handleSelectGovernor = useCallback((governor: string) => {
    rm?.selectGovernor(governor);
  }, [rm]);

  const handleReady = useCallback(() => {
    rm?.toggleReady();
  }, [rm]);

  const handleStartGame = useCallback(() => {
    rm?.startGame();
  }, [rm]);

  const handleUpdateSettings = useCallback((settings: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }) => {
    rm?.updateSettings(settings);
  }, [rm]);

  const handlePlaceTower = useCallback((data: { x: number; y: number; towerType: string }) => {
    rm?.placeTower(data.x, data.y, data.towerType);
    playPlaceTower();
    haptic(15);
    cancelPlacement();
  }, [rm, cancelPlacement]);

  const handleUpgradeTower = useCallback((towerId: string) => {
    rm?.upgradeTower(towerId);
    playUpgradeTower();
    haptic([10, 30, 10]);
  }, [rm]);

  const handleSellTower = useCallback((towerId: string) => {
    rm?.sellTower(towerId);
    playSellTower();
    haptic(25);
  }, [rm]);

  const handleStartWave = useCallback(() => {
    rm?.startWave();
    playWaveStart();
  }, [rm]);

  const handleBuyTech = useCallback((techId: string) => {
    rm?.buyTech(techId);
    playUIClick();
  }, [rm]);

  const handleLeave = useCallback(async () => {
    await rm?.leaveRoom();
    (window as any).__roomManager = undefined;
    (window as any).__playerId = undefined;
  }, [rm]);

  const handleGameOverClose = useCallback(async () => {
    setGameOver(null);
    await rm?.leaveRoom();
    (window as any).__roomManager = undefined;
    (window as any).__playerId = undefined;
  }, [rm]);

  const handleQuit = useCallback(async () => {
    setIsPaused(false);
    await rm?.leaveRoom();
    (window as any).__roomManager = undefined;
    (window as any).__playerId = undefined;
  }, [rm, setIsPaused]);

  const handleSetTargeting = useCallback((towerId: string, mode: string) => {
    rm?.setTargeting(towerId, mode);
  }, [rm]);

  const handleUseAbility = useCallback((targetX?: number, targetY?: number) => {
    rm?.useAbility(targetX, targetY);
    haptic([15, 30, 15]);
  }, [rm]);

  const handleSendCreeps = useCallback((enemyType: string, count: number) => {
    rm?.sendCreeps(enemyType, count);
  }, [rm]);

  const handleQueueUpgrade = useCallback((towerId: string) => {
    rm?.queueUpgrade(towerId);
    useToastStore.getState().addToast('Upgrade queued', 'success', 1500);
  }, [rm]);

  const handleCancelQueue = useCallback((towerId: string) => {
    rm?.cancelQueuedUpgrade(towerId);
  }, [rm]);

  const handleSendChat = useCallback((text: string) => {
    rm?.sendChat(text);
  }, [rm]);

  const handlePing = useCallback((data: { x: number; y: number; pingType: string }) => {
    rm?.sendPing(data.x, data.y, data.pingType);
  }, [rm]);

  // Keyboard shortcuts (game phase only)
  const inGame = appPhase === 'game';
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (useSettingsStore.getState().showHelp) {
          setShowHelp(false);
        } else if (inGame) {
          togglePause();
        } else {
          cancelPlacement();
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (inGame) setShowHelp(!useSettingsStore.getState().showHelp);
      }
      if (useSettingsStore.getState().isPaused || useSettingsStore.getState().showHelp) return;
      if (e.key === ' ' && inGame) {
        e.preventDefault();
        handleStartWave();
      }
      if (e.key === 'q' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) handleUpgradeTower(selected);
      }
      if (e.key === 'e' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) {
          handleSellTower(selected);
          useUIStore.getState().selectTower(null);
        }
      }
      if (inGame && e.key >= '1' && e.key <= '9') {
        const snap = useGameStore.getState().snapshot;
        const p = snap?.players[playerId];
        if (!p) return;
        const gov = p.governor;
        const available = gov
          ? (p.ultimateUnlocked ? getAvailableTowers(gov) : getRegularTowers(gov))
          : [...COMMON_TOWERS];
        const idx = parseInt(e.key) - 1;
        if (idx < available.length) {
          useUIStore.getState().startPlacement(available[idx] as TowerType);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelPlacement, inGame, handleStartWave, handleUpgradeTower, handleSellTower, playerId, togglePause, setShowHelp]);

  if (appPhase === 'lobby') {
    const players: Record<string, { name: string; governor: string | null; ready: boolean }> = {};
    if (snapshot) {
      for (const [pid, p] of Object.entries(snapshot.players)) {
        players[pid] = { name: p.name, governor: p.governor, ready: p.ready };
      }
    }

    const allReady = snapshot
      ? Object.values(snapshot.players).length > 0 && Object.values(snapshot.players).every(p => p.ready)
      : false;

    return (
      <LobbyPage
        playerId={playerId}
        players={players}
        onSelectGovernor={handleSelectGovernor}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onUpdateSettings={handleUpdateSettings}
        settings={snapshot?.settings ?? { mapSize: 'tiny', mapLayout: 'classic', difficulty: 'normal', moneySharing: false }}
        allReady={allReady}
        isHost={isHost}
        roomCode={currentRoomCode ?? undefined}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <>
      <GamePage
        playerId={playerId}
        playerName={useLobbyStore.getState().playerName || 'Player'}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onSellTower={handleSellTower}
        onSetTargeting={handleSetTargeting}
        onStartWave={handleStartWave}
        onBuyTech={handleBuyTech}
        onUseAbility={handleUseAbility}
        onQuit={handleQuit}
        onSendChat={handleSendChat}
        onPing={handlePing}
        onSendCreeps={handleSendCreeps}
        onQueueUpgrade={handleQueueUpgrade}
        onCancelQueue={handleCancelQueue}
        showChat={true}
      />
      {gameOver && (
        <GameOverModal
          victory={gameOver.victory}
          stats={gameOver.stats}
          onClose={handleGameOverClose}
          waveReached={gameOver.waveReached}
          livesRemaining={gameOver.livesRemaining}
          difficulty={gameOver.difficulty}
        />
      )}
    </>
  );
}

// --- Tutorial Mode ---

function TutorialMode() {
  const [gameState] = useState(() => {
    const gs = new GameState();
    gs.isTutorial = true;
    gs.updateSettings({ mapSize: 'tiny', difficulty: 'easy' });
    return gs;
  });
  const gameLoopRef = useRef<GameLoop | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const appPhase = useLobbyStore((s) => s.appPhase);
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const playerName = useLobbyStore((s) => s.playerName);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);
  const togglePause = useSettingsStore((s) => s.togglePause);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const inGame = appPhase === 'tutorial_game';

  const [gameOver, setGameOver] = useState<{ victory: boolean; stats: Record<string, any>; waveReached?: number; livesRemaining?: number } | null>(null);

  useEffect(() => {
    gameState.addPlayer(SOLO_PLAYER_ID, playerName || 'Player');
    setSnapshot(gameState.serialize());
  }, []);

  useEffect(() => {
    if (!inGame) return;
    const interval = setInterval(() => {
      const snap = gameState.serialize();
      setSnapshot(snap);

      if (gameLoopRef.current) {
        const events = gameLoopRef.current.drainEvents();
        for (const ev of events) {
          if (ev.type === 'game_over') {
            const victory = ev.victory as boolean;
            if (victory) playVictory(); else playDefeat();
            setGameOver({ victory, stats: ev.stats as any, waveReached: snap.waveNumber, livesRemaining: snap.sharedLives });
          }
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [inGame, gameState, setSnapshot]);

  const handleSelectGovernor = useCallback((element: string) => {
    gameState.selectGovernor(SOLO_PLAYER_ID, element);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleReady = useCallback(() => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player) {
      gameState.setPlayerReady(SOLO_PLAYER_ID, !player.ready);
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleStartGame = useCallback(() => {
    gameState.startGame();
    const loop = new GameLoop(gameState);
    gameLoopRef.current = loop;
    stopRef.current = loop.start();
    setAppPhase('tutorial_game');
    setSnapshot(gameState.serialize());
  }, [gameState, setAppPhase, setSnapshot]);

  const handlePlaceTower = useCallback((data: { x: number; y: number; towerType: string }) => {
    const [canPlace, reason] = gameState.canPlaceTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (!canPlace) {
      useToastStore.getState().addToast(reason, 'error', 2000);
      return;
    }
    const result = gameState.placeTower(SOLO_PLAYER_ID, data.x, data.y, data.towerType as TowerType);
    if (result) {
      playPlaceTower();
      haptic(15);
      cancelPlacement();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot, cancelPlacement]);

  const handleUpgradeTower = useCallback((towerId: string) => {
    gameState.upgradeTower(SOLO_PLAYER_ID, towerId);
    playUpgradeTower();
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSellTower = useCallback((towerId: string) => {
    if (!gameState.sellTower(SOLO_PLAYER_ID, towerId)) return;
    playSellTower();
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleSetTargeting = useCallback((towerId: string, mode: string) => {
    gameState.setTowerTargeting(SOLO_PLAYER_ID, towerId, mode as TargetingMode);
    setSnapshot(gameState.serialize());
  }, [gameState, setSnapshot]);

  const handleStartWave = useCallback(() => {
    if (gameState.canManuallyStartWave()) {
      gameState.lastManualWaveStartTime = Date.now() / 1000;
      gameState.startNextWave();
      playWaveStart();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleBuyTech = useCallback((techId: string) => {
    const player = gameState.players.get(SOLO_PLAYER_ID);
    if (player?.buyTech(techId)) {
      playUIClick();
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleUseAbility = useCallback((targetX?: number, targetY?: number) => {
    if (gameState.useAbility(SOLO_PLAYER_ID, targetX, targetY)) {
      setSnapshot(gameState.serialize());
    }
  }, [gameState, setSnapshot]);

  const handleGameOverClose = useCallback(() => {
    setGameOver(null);
    stopRef.current?.();
    gameLoopRef.current = null;
    setAppPhase('main_menu');
  }, [setAppPhase]);

  const handleQuit = useCallback(() => {
    setIsPaused(false);
    stopRef.current?.();
    gameLoopRef.current = null;
    setAppPhase('main_menu');
  }, [setAppPhase, setIsPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        if (useSettingsStore.getState().showHelp) setShowHelp(false);
        else if (inGame) togglePause();
        else cancelPlacement();
      }
      if (useSettingsStore.getState().isPaused || useSettingsStore.getState().showHelp) return;
      if (e.key === ' ' && inGame) { e.preventDefault(); handleStartWave(); }
      if (e.key === 'q' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) handleUpgradeTower(selected);
      }
      if (e.key === 'e' && inGame) {
        const selected = useUIStore.getState().selectedTowerId;
        if (selected) { handleSellTower(selected); useUIStore.getState().selectTower(null); }
      }
      if (inGame && e.key >= '1' && e.key <= '9') {
        const player = gameState.players.get(SOLO_PLAYER_ID);
        if (!player) return;
        const gov = player.governor;
        const available = gov
          ? (player.ultimateUnlocked ? getAvailableTowers(gov) : getRegularTowers(gov))
          : [...COMMON_TOWERS];
        const idx = parseInt(e.key) - 1;
        if (idx < available.length) useUIStore.getState().startPlacement(available[idx] as TowerType);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancelPlacement, inGame, handleStartWave, handleUpgradeTower, handleSellTower, gameState, togglePause, setShowHelp]);

  const snapshot = useGameStore((s) => s.snapshot);

  if (!inGame) {
    const players: Record<string, { name: string; governor: string | null; ready: boolean }> = {};
    if (snapshot) {
      for (const [pid, p] of Object.entries(snapshot.players)) {
        players[pid] = { name: p.name, governor: p.governor, ready: p.ready };
      }
    }

    return (
      <LobbyPage
        playerId={SOLO_PLAYER_ID}
        players={players}
        onSelectGovernor={handleSelectGovernor}
        onReady={handleReady}
        onStartGame={handleStartGame}
        onUpdateSettings={() => {}}
        settings={snapshot?.settings ?? { mapSize: 'tiny', mapLayout: 'classic', difficulty: 'easy', moneySharing: false }}
        allReady={gameState.allPlayersReady()}
        isHost={true}
        onLeave={() => setAppPhase('main_menu')}
      />
    );
  }

  return (
    <>
      <GamePage
        playerId={SOLO_PLAYER_ID}
        onPlaceTower={handlePlaceTower}
        onUpgradeTower={handleUpgradeTower}
        onSellTower={handleSellTower}
        onSetTargeting={handleSetTargeting}
        onStartWave={handleStartWave}
        onBuyTech={handleBuyTech}
        onUseAbility={handleUseAbility}
        onQuit={handleQuit}
        isSolo
      />
      <TutorialOverlay playerId={SOLO_PLAYER_ID} />
      {gameOver && (
        <GameOverModal
          victory={gameOver.victory}
          stats={gameOver.stats}
          onClose={handleGameOverClose}
          waveReached={gameOver.waveReached}
          livesRemaining={gameOver.livesRemaining}
        />
      )}
    </>
  );
}

// --- Replay Viewer Mode ---

function ReplayViewerMode() {
  const setAppPhase = useLobbyStore((s) => s.setAppPhase);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const { currentReplay, currentFrameIndex } = useReplayStore();

  // Feed replay frame into game store
  useEffect(() => {
    if (currentReplay && currentReplay.frames[currentFrameIndex]) {
      setSnapshot(currentReplay.frames[currentFrameIndex].snapshot);
    }
  }, [currentReplay, currentFrameIndex, setSnapshot]);

  if (!currentReplay) {
    setAppPhase('main_menu');
    return null;
  }

  return (
    <>
      <GamePage
        playerId="replay-viewer"
        onPlaceTower={() => {}}
        onUpgradeTower={() => {}}
        onSellTower={() => {}}
        onStartWave={() => {}}
        onBuyTech={() => {}}
        onQuit={() => {
          useReplayStore.getState().closeReplay();
          setAppPhase('main_menu');
        }}
        isSpectating
        isSolo
      />
      <ReplayViewer onClose={() => setAppPhase('main_menu')} />
    </>
  );
}
