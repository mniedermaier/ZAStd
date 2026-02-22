import {
  GameState, GameLoop, GamePhase, gameStateFromSnapshot,
  type GameStateSnapshot,
} from '@zastd/engine';
import { RealtimeManager } from './realtime';
import { HostManager } from './host-manager';
import { LobbyDiscovery } from './lobby-discovery';
import { processAction } from './action-relay';
import type {
  ClientAction, HostBroadcast, PresencePayload, RoomAdvertisement,
} from './protocol';
import { useLobbyStore } from '../stores/lobby-store';
import { useGameStore } from '../stores/game-store';
import { useChatStore } from '../ui/game/ChatPanel';
import { useToastStore } from '../ui/shared/ActionToast';

// 4-char room code: uppercase alphanum, no ambiguous chars
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export interface RoomConfig {
  roomName: string;
  password?: string;
  mapSize?: string;
  difficulty?: string;
}

export class RoomManager {
  private playerId: string;
  private playerName: string;
  private joinedAt: number;

  private realtime: RealtimeManager | null = null;
  private hostManager: HostManager | null = null;
  private discovery: LobbyDiscovery | null = null;
  private gameState: GameState | null = null;
  private gameLoop: GameLoop | null = null;
  private stopLoop: (() => void) | null = null;

  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private password: string | null = null;
  private roomCode: string | null = null;
  private roomConfig: RoomConfig | null = null;
  private lastSnapshot: GameStateSnapshot | null = null;
  private advertisement: RoomAdvertisement | null = null;

  private onGameOver?: (victory: boolean, stats: Record<string, any>) => void;

  // Grace period: recently accepted players that haven't tracked presence yet
  private recentlyAccepted = new Map<string, number>();
  private readonly ACCEPT_GRACE_MS = 10_000;

  // Presence heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Client-side stale state detection
  private lastStateReceived = 0;
  private staleWatchdog: ReturnType<typeof setInterval> | null = null;
  private readonly STALE_THRESHOLD_MS = 5_000;

  // Reconnection state
  private reconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    playerId: string,
    playerName: string,
    opts?: { onGameOver?: (victory: boolean, stats: Record<string, any>) => void },
  ) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.joinedAt = Date.now();
    this.onGameOver = opts?.onGameOver;

    // Persist session info for potential rejoin
    this._saveSession();
  }

  private _saveSession() {
    try {
      sessionStorage.setItem('zastd:session', JSON.stringify({
        playerId: this.playerId,
        playerName: this.playerName,
        roomCode: this.roomCode,
        joinedAt: this.joinedAt,
        password: this.password,
      }));
    } catch {}
  }

  private _clearSession() {
    try { sessionStorage.removeItem('zastd:session'); } catch {}
  }

  static getSavedSession(): { playerId: string; playerName: string; roomCode: string; joinedAt: number; password?: string } | null {
    try {
      const raw = sessionStorage.getItem('zastd:session');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  async attemptReconnect(): Promise<boolean> {
    if (this.reconnecting || !this.roomCode) return false;
    this.reconnecting = true;
    this.reconnectAttempts = 0;

    const wasInGame = useLobbyStore.getState().inGame;

    // Clean up existing connection first (prevents channel leak)
    this._stopHeartbeat();
    this._stopStaleWatchdog();
    this._stopLobbyBroadcast();
    this._stopGameBroadcast();
    if (this.realtime) {
      await this.realtime.leave();
      this.realtime = null;
    }

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 8000);
      await new Promise(r => setTimeout(r, delay));

      try {
        this.realtime = new RealtimeManager(
          this.roomCode,
          (msg) => this._handleMessage(msg),
          (presences) => this._handlePresenceSync(presences),
          () => this._onChannelError(),
        );

        const presence: PresencePayload = {
          playerId: this.playerId,
          playerName: this.playerName,
          joinedAt: this.joinedAt,
          isHost: this.hostManager?.isHost ?? false,
        };

        const joined = await this.realtime.join(presence);
        if (joined) {
          this._startHeartbeat(presence);
          if (this.hostManager?.isHost) {
            // Resume broadcasting after reconnect
            if (wasInGame) this._startGameBroadcast();
            else this._startLobbyBroadcast();
          } else {
            this._startStaleWatchdog();
          }
          this.reconnecting = false;
          this.reconnectAttempts = 0;
          useToastStore.getState().addToast('Reconnected!', 'success', 2000);
          return true;
        }
      } catch {
        // Continue retrying
      }
    }

    this.reconnecting = false;
    useToastStore.getState().addToast('Failed to reconnect. Please rejoin.', 'error', 5000);
    return false;
  }

  // --- Create Room ---

  async createRoom(config: RoomConfig): Promise<string> {
    this.roomCode = generateRoomCode();
    this.roomConfig = config;
    this.password = config.password || null;

    // Create game state
    this.gameState = new GameState();
    if (config.mapSize) this.gameState.updateSettings({ mapSize: config.mapSize });
    if (config.difficulty) this.gameState.updateSettings({ difficulty: config.difficulty });
    this.gameState.addPlayer(this.playerId, this.playerName);

    // Set up host manager
    this.hostManager = new HostManager(this.playerId, (newHostId, isMe) => {
      this._onHostChanged(newHostId, isMe);
    });

    // Connect to room channel
    this.realtime = new RealtimeManager(
      this.roomCode,
      (msg) => this._handleMessage(msg),
      (presences) => this._handlePresenceSync(presences),
      () => this._onChannelError(),
    );

    const presence: PresencePayload = {
      playerId: this.playerId,
      playerName: this.playerName,
      joinedAt: this.joinedAt,
      isHost: true,
    };

    const joined = await this.realtime.join(presence);
    if (!joined) throw new Error('Failed to create room channel');

    // Start presence heartbeat
    this._startHeartbeat(presence);

    // Advertise on discovery
    this.discovery = new LobbyDiscovery();
    this.advertisement = {
      roomCode: this.roomCode,
      roomName: config.roomName,
      hostName: this.playerName,
      hostId: this.playerId,
      playerCount: 1,
      maxPlayers: this.gameState.maxPlayers,
      hasPassword: Boolean(this.password),
      mapSize: config.mapSize || 'medium',
      difficulty: config.difficulty || 'normal',
      inGame: false,
    };
    await this.discovery.advertise(this.advertisement);

    // Start lobby broadcast loop (10Hz)
    this._startLobbyBroadcast();

    // Update store
    useLobbyStore.getState().setCurrentRoom(this.roomCode, true);
    useGameStore.getState().setSnapshot(this.gameState.serialize());

    this._saveSession();
    return this.roomCode;
  }

  // --- Join Room ---

  async joinRoom(roomCode: string, password?: string): Promise<void> {
    this.roomCode = roomCode;

    this.hostManager = new HostManager(this.playerId, (newHostId, isMe) => {
      this._onHostChanged(newHostId, isMe);
    });

    // Subscribe to room channel without tracking presence (handshake first)
    this.realtime = new RealtimeManager(
      roomCode,
      (msg) => this._handleMessage(msg),
      (presences) => this._handlePresenceSync(presences),
      () => this._onChannelError(),
    );

    const subscribed = await this.realtime.subscribeOnly();
    if (!subscribed) throw new Error('Failed to connect to room');

    // Send join request via lobby event
    const joinRequest: ClientAction = {
      type: 'join_request',
      playerId: this.playerId,
      playerName: this.playerName,
      password,
    };
    this.realtime.sendLobbyMessage(joinRequest);

    // Wait for join_response
    const accepted = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 15000);

      const originalHandler = this._handleMessage.bind(this);
      const checkResponse = (msg: HostBroadcast | ClientAction) => {
        if (msg.type === 'join_response') {
          const resp = msg as Extract<HostBroadcast, { type: 'join_response' }>;
          if (resp.targetPlayerId === this.playerId) {
            cleanup();
            if (!resp.accepted) {
              useLobbyStore.getState().setJoinError(resp.reason || 'Join rejected');
            }
            resolve(resp.accepted);
            return;
          }
        }
        originalHandler(msg);
      };

      // Temporarily override message handling
      this.realtime!['onMessage'] = checkResponse;

      const cleanup = () => {
        clearTimeout(timeout);
        if (this.realtime) {
          this.realtime['onMessage'] = originalHandler;
        }
      };
    });

    if (!accepted) {
      await this.realtime.leave();
      this.realtime = null;
      throw new Error(useLobbyStore.getState().joinError || 'Room not found or join rejected');
    }

    // Now track presence in the room
    const presence: PresencePayload = {
      playerId: this.playerId,
      playerName: this.playerName,
      joinedAt: this.joinedAt,
      isHost: false,
    };
    await this.realtime.trackPresence(presence);

    // Start presence heartbeat
    this._startHeartbeat(presence);

    // Start stale state detection for client
    this._startStaleWatchdog();

    useLobbyStore.getState().setCurrentRoom(roomCode, false);
    this._saveSession();
  }

  // --- Actions (forwarded to host or processed locally) ---

  selectGovernor(governor: string): void {
    const action: ClientAction = {
      type: 'select_governor',
      playerId: this.playerId,
      governor,
    };
    this._dispatchAction(action);
  }

  toggleReady(): void {
    // Need current ready state - get from snapshot
    const snap = useGameStore.getState().snapshot;
    const currentReady = snap?.players[this.playerId]?.ready ?? false;
    const action: ClientAction = {
      type: 'ready',
      playerId: this.playerId,
      ready: !currentReady,
    };
    this._dispatchAction(action);
  }

  startGame(): void {
    if (!this.gameState || !this.hostManager?.isHost) return;
    this.gameState.startGame();
    this.gameLoop = new GameLoop(this.gameState);
    this.stopLoop = this.gameLoop.start();

    // Stop discovery advertising (game in progress)
    this._updateAdvertisement({ inGame: true });

    // Switch broadcast to game state mode
    this._stopLobbyBroadcast();
    this._startGameBroadcast();

    useLobbyStore.getState().setAppPhase('game');
    useLobbyStore.getState().setInGame(true);
  }

  placeTower(x: number, y: number, towerType: string): void {
    this._dispatchAction({
      type: 'place_tower',
      playerId: this.playerId,
      x,
      y,
      towerType,
    });
  }

  upgradeTower(towerId: string): void {
    this._dispatchAction({
      type: 'upgrade_tower',
      playerId: this.playerId,
      towerId,
    });
  }

  sellTower(towerId: string): void {
    this._dispatchAction({
      type: 'sell_tower',
      playerId: this.playerId,
      towerId,
    });
  }

  startWave(): void {
    this._dispatchAction({
      type: 'start_wave',
      playerId: this.playerId,
    });
  }

  buyTech(techId: string): void {
    this._dispatchAction({
      type: 'buy_tech',
      playerId: this.playerId,
      techId,
    });
  }

  useAbility(targetX?: number, targetY?: number): void {
    this._dispatchAction({
      type: 'use_ability',
      playerId: this.playerId,
      targetX,
      targetY,
    });
  }

  sendChat(text: string): void {
    this._dispatchAction({
      type: 'chat',
      playerId: this.playerId,
      playerName: this.playerName,
      text,
    });
  }

  sendPing(x: number, y: number, pingType: string): void {
    this._dispatchAction({
      type: 'ping',
      playerId: this.playerId,
      playerName: this.playerName,
      x,
      y,
      pingType,
    });
  }

  updateSettings(settings: { mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }): void {
    this._dispatchAction({
      type: 'update_settings',
      ...settings,
    });
  }

  // --- New Batch 2 Actions ---

  sendCreeps(enemyType: string, count: number): void {
    this._dispatchAction({
      type: 'send_creeps',
      playerId: this.playerId,
      enemyType,
      count,
    });
  }

  queueUpgrade(towerId: string): void {
    this._dispatchAction({
      type: 'queue_upgrade',
      playerId: this.playerId,
      towerId,
    });
  }

  cancelQueuedUpgrade(towerId: string): void {
    this._dispatchAction({
      type: 'cancel_queue',
      playerId: this.playerId,
      towerId,
    });
  }

  startVote(voteType: string, targetId?: string): void {
    this._dispatchAction({
      type: 'start_vote',
      playerId: this.playerId,
      voteType,
      targetId,
    });
  }

  castVote(voteId: string): void {
    this._dispatchAction({
      type: 'cast_vote',
      playerId: this.playerId,
      voteId,
    });
  }

  setTargeting(towerId: string, mode: string): void {
    this._dispatchAction({
      type: 'set_targeting',
      playerId: this.playerId,
      towerId,
      mode,
    });
  }

  // --- Cleanup ---

  async leaveRoom(): Promise<void> {
    this._clearSession();
    await this.destroy();
    useLobbyStore.getState().clearCurrentRoom();
    useLobbyStore.getState().setInGame(false);
    useLobbyStore.getState().setAppPhase('main_menu');
  }

  async destroy(): Promise<void> {
    this._stopHeartbeat();
    this._stopStaleWatchdog();
    this._stopLobbyBroadcast();
    this._stopGameBroadcast();
    this.stopLoop?.();
    this.gameLoop = null;
    this.gameState = null;
    if (this.discovery) {
      await this.discovery.stopAdvertising();
      await this.discovery.unsubscribe();
      this.discovery = null;
    }
    if (this.realtime) {
      await this.realtime.leave();
      this.realtime = null;
    }
    this.hostManager = null;
  }

  // --- Internal ---

  private _dispatchAction(action: ClientAction): void {
    if (this.hostManager?.isHost && this.gameState) {
      // Host processes locally
      if (action.type === 'chat') {
        // Chat bypasses action-relay; broadcast directly to all clients
        this.realtime?.sendLobbyMessage(action);
        return;
      }
      processAction(this.gameState, action);
      useGameStore.getState().setSnapshot(this.gameState.serialize());
    } else if (this.realtime) {
      // Client sends to host
      this.realtime.sendAction(action);
    }
  }

  private _handleMessage(msg: HostBroadcast | ClientAction): void {
    // Handle chat messages from anyone
    if (msg.type === 'chat') {
      const chatMsg = msg as Extract<ClientAction, { type: 'chat' }>;
      if (chatMsg.playerId !== this.playerId) {
        useChatStore.getState().addMessage(chatMsg.playerName, chatMsg.text, '#e0e0f0');
      }
    }

    if (this.hostManager?.isHost) {
      // Host receives client actions
      const t = msg.type as string;
      if ('playerId' in msg && t !== 'game_state' && t !== 'lobby_state') {
        this._handleClientAction(msg as ClientAction);
      }
    } else {
      // Client receives host broadcasts
      if (msg.type === 'game_state') {
        this.lastStateReceived = Date.now();
        const broadcast = msg as Extract<HostBroadcast, { type: 'game_state' }>;
        this.lastSnapshot = broadcast.snapshot;
        useGameStore.getState().setSnapshot(broadcast.snapshot);

        // Check if game started
        const phase = broadcast.snapshot.phase;
        if (phase !== 'lobby' && phase !== GamePhase.Lobby) {
          const store = useLobbyStore.getState();
          if (store.appPhase === 'lobby') {
            store.setAppPhase('game');
            store.setInGame(true);
            this._startStaleWatchdog();
          }
        }
      } else if (msg.type === 'lobby_state') {
        const broadcast = msg as Extract<HostBroadcast, { type: 'lobby_state' }>;
        // Update game store with lobby state snapshot
        if (this.lastSnapshot) {
          const updated = {
            ...this.lastSnapshot,
            players: broadcast.players,
            settings: broadcast.settings,
            phase: broadcast.phase,
          };
          useGameStore.getState().setSnapshot(updated as GameStateSnapshot);
        }
      } else if (msg.type === 'game_event') {
        const broadcast = msg as Extract<HostBroadcast, { type: 'game_event' }>;
        const ev = broadcast.event;
        if (ev.type === 'game_over') {
          this.onGameOver?.(ev.victory as boolean, ev.stats as Record<string, any>);
        }
        if (ev.type === 'game_reset') {
          useLobbyStore.getState().setAppPhase('lobby');
          useLobbyStore.getState().setInGame(false);
        }
        if (ev.type === 'ping') {
          const { useUIStore } = require('../stores/ui-store');
          useUIStore.getState().addPing({
            id: `${ev.playerId}-${Date.now()}`,
            x: ev.x,
            y: ev.y,
            playerName: ev.playerName,
            pingType: ev.pingType,
            time: Date.now(),
          });
        }
      } else if (msg.type === 'action_result') {
        const broadcast = msg as Extract<HostBroadcast, { type: 'action_result' }>;
        if (!broadcast.success && broadcast.playerId === this.playerId) {
          useToastStore.getState().addToast(broadcast.message || 'Action failed', 'error', 2000);
        }
      }
    }
  }

  private _handleClientAction(action: ClientAction): void {
    if (!this.gameState) return;

    if (action.type === 'join_request') {
      this._handleJoinRequest(action);
      return;
    }

    if (action.type === 'chat') {
      // Re-broadcast chat from client to all other clients
      this.realtime?.sendLobbyMessage(action);
      return;
    }

    if (action.type === 'ping') {
      // Relay ping to all clients as a game_event
      const { type: _, ...pingData } = action;
      this.realtime?.broadcastState({
        type: 'game_event',
        event: { type: 'ping', ...pingData },
      });
      return;
    }

    const result = processAction(this.gameState, action);
    if (!result.success) {
      // Send action result back
      this.realtime?.broadcastState({
        type: 'action_result',
        success: false,
        action: action.type,
        playerId: action.type !== 'update_settings' ? (action as any).playerId : '',
        message: result.message,
      });
    }
  }

  private _handleJoinRequest(action: Extract<ClientAction, { type: 'join_request' }>): void {
    // Validate password
    if (this.password && action.password !== this.password) {
      this.realtime?.sendLobbyMessage({
        type: 'join_response',
        targetPlayerId: action.playerId,
        accepted: false,
        reason: 'Incorrect password',
      });
      return;
    }

    // Check if game in progress
    if (this.gameState && this.gameState.phase !== GamePhase.Lobby) {
      this.realtime?.sendLobbyMessage({
        type: 'join_response',
        targetPlayerId: action.playerId,
        accepted: false,
        reason: 'Game already in progress',
      });
      return;
    }

    // Check if room is full
    if (this.gameState && this.gameState.players.size >= this.gameState.maxPlayers) {
      this.realtime?.sendLobbyMessage({
        type: 'join_response',
        targetPlayerId: action.playerId,
        accepted: false,
        reason: 'Room is full',
      });
      return;
    }

    // Accept — mark grace period so presence sync doesn't immediately remove them
    this.gameState?.addPlayer(action.playerId, action.playerName);
    this.recentlyAccepted.set(action.playerId, Date.now());
    this.realtime?.sendLobbyMessage({
      type: 'join_response',
      targetPlayerId: action.playerId,
      accepted: true,
    });

    // Update advertisement
    this._updateAdvertisement({
      playerCount: this.gameState?.players.size ?? 1,
    });
  }

  private _handlePresenceSync(presences: Record<string, PresencePayload[]>): void {
    this.hostManager?.updatePresences(presences);

    if (this.hostManager?.isHost && this.gameState) {
      // Reconcile players: add new ones, remove disconnected ones
      const currentPlayerIds = new Set(this.hostManager.getPlayerIds());
      const gamePlayerIds = new Set(this.gameState.players.keys());
      const now = Date.now();

      // Clean up expired grace entries
      for (const [pid, ts] of this.recentlyAccepted) {
        if (now - ts > this.ACCEPT_GRACE_MS) this.recentlyAccepted.delete(pid);
      }

      // Mark disconnected players and remove them
      for (const pid of gamePlayerIds) {
        if (!currentPlayerIds.has(pid)) {
          // Skip if player was recently accepted (still connecting)
          if (this.recentlyAccepted.has(pid)) continue;

          const player = this.gameState.players.get(pid);
          if (player) player.connected = false;
          this.gameState.transferTowers(pid);
          this.gameState.removePlayer(pid);
        } else {
          // Player is present — clear any grace period
          this.recentlyAccepted.delete(pid);
          const player = this.gameState.players.get(pid);
          if (player) player.connected = true;
        }
      }

      // Update advertisement
      this._updateAdvertisement({
        playerCount: this.gameState.players.size,
      });
    }
  }

  private _onHostChanged(newHostId: string, isMe: boolean): void {
    useLobbyStore.getState().setCurrentRoom(this.roomCode!, isMe);

    if (isMe && !this.gameState) {
      // Restore password from session storage on host migration
      if (!this.password) {
        const saved = RoomManager.getSavedSession();
        if (saved?.password) this.password = saved.password;
      }
      // Host migration: reconstruct state from last snapshot
      if (this.lastSnapshot) {
        this.gameState = gameStateFromSnapshot(this.lastSnapshot);
        const inGame = useLobbyStore.getState().inGame;
        if (inGame) {
          this.gameLoop = new GameLoop(this.gameState);
          this.stopLoop = this.gameLoop.start();
          this._startGameBroadcast();
        } else {
          this._startLobbyBroadcast();
        }
      }

      // Start advertising on discovery
      if (this.roomConfig || this.roomCode) {
        this.discovery = new LobbyDiscovery();
        this.advertisement = {
          roomCode: this.roomCode!,
          roomName: this.roomConfig?.roomName || `${this.playerName}'s Room`,
          hostName: this.playerName,
          hostId: this.playerId,
          playerCount: this.gameState?.players.size ?? 1,
          maxPlayers: this.gameState?.maxPlayers ?? 16,
          hasPassword: Boolean(this.password),
          mapSize: this.gameState?.mapSize || 'medium',
          difficulty: this.gameState?.difficulty || 'normal',
          inGame: useLobbyStore.getState().inGame,
        };
        this.discovery.advertise(this.advertisement);
      }
    }
  }

  private _startLobbyBroadcast(): void {
    this._stopLobbyBroadcast();
    this.broadcastInterval = setInterval(() => {
      if (!this.gameState || !this.realtime || !this.hostManager?.isHost) return;

      const snapshot = this.gameState.serialize();
      useGameStore.getState().setSnapshot(snapshot);

      this.realtime.broadcastState({
        type: 'game_state',
        snapshot,
      });
    }, 200);
  }

  private _stopLobbyBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  private _startGameBroadcast(): void {
    this._stopLobbyBroadcast();
    this.broadcastInterval = setInterval(() => {
      if (!this.gameState || !this.realtime || !this.hostManager?.isHost) return;

      // Drain events from game loop and relay to clients
      if (this.gameLoop) {
        const events = this.gameLoop.drainEvents();
        for (const ev of events) {
          if (ev.type === 'game_over') {
            this.onGameOver?.(ev.victory as boolean, ev.stats as Record<string, any>);
          }
          // Relay all events to clients
          this.realtime?.broadcastState({
            type: 'game_event',
            event: ev,
          });
        }
      }

      const snapshot = this.gameState.serialize();
      useGameStore.getState().setSnapshot(snapshot);

      this.realtime.broadcastState({
        type: 'game_state',
        snapshot,
      });
    }, 200);
  }

  private _stopGameBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  private _onChannelError(): void {
    console.warn('[RoomManager] Channel error detected, attempting reconnect...');
    useToastStore.getState().addToast('Connection lost, reconnecting...', 'warning', 3000);
    this.attemptReconnect();
  }

  private _startHeartbeat(presence: PresencePayload): void {
    this._stopHeartbeat();
    // Re-track presence every 30s to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.realtime) {
        this.realtime.trackPresence(presence).catch(() => {
          // If heartbeat fails, attempt reconnect
          this._stopHeartbeat();
          this.attemptReconnect();
        });
      }
    }, 30_000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private _startStaleWatchdog(): void {
    this._stopStaleWatchdog();
    this.lastStateReceived = Date.now();
    this.staleWatchdog = setInterval(() => {
      if (!this.hostManager?.isHost && this.lastStateReceived > 0) {
        const elapsed = Date.now() - this.lastStateReceived;
        if (elapsed > this.STALE_THRESHOLD_MS) {
          console.warn(`[RoomManager] No state received for ${elapsed}ms, reconnecting...`);
          this._stopStaleWatchdog();
          this.attemptReconnect().then((ok) => {
            if (ok) this._startStaleWatchdog();
          });
        }
      }
    }, 3_000);
  }

  private _stopStaleWatchdog(): void {
    if (this.staleWatchdog) {
      clearInterval(this.staleWatchdog);
      this.staleWatchdog = null;
    }
  }

  private _updateAdvertisement(partial: Partial<RoomAdvertisement>): void {
    if (!this.advertisement || !this.discovery) return;
    this.advertisement = { ...this.advertisement, ...partial };
    this.discovery.advertise(this.advertisement);
  }

  // --- Getters ---

  get isHost(): boolean {
    return this.hostManager?.isHost ?? false;
  }

  get currentRoomCode(): string | null {
    return this.roomCode;
  }
}
