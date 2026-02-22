import type { GameStateSnapshot } from '@zastd/engine';

// Messages from client -> host
export type ClientAction =
  | { type: 'place_tower'; playerId: string; x: number; y: number; towerType: string }
  | { type: 'sell_tower'; playerId: string; towerId: string }
  | { type: 'upgrade_tower'; playerId: string; towerId: string }
  | { type: 'start_wave'; playerId: string }
  | { type: 'buy_tech'; playerId: string; techId: string }
  | { type: 'select_governor'; playerId: string; governor: string }
  | { type: 'ready'; playerId: string; ready: boolean }
  | { type: 'update_settings'; mapSize?: string; mapLayout?: string; difficulty?: string; moneySharing?: boolean }
  | { type: 'join_request'; playerId: string; playerName: string; password?: string }
  | { type: 'chat'; playerId: string; playerName: string; text: string }
  | { type: 'use_ability'; playerId: string; targetX?: number; targetY?: number }
  | { type: 'ping'; playerId: string; playerName: string; x: number; y: number; pingType: string }
  | { type: 'spectate_request'; playerId: string; playerName: string }
  | { type: 'send_creeps'; playerId: string; enemyType: string; count: number }
  | { type: 'queue_upgrade'; playerId: string; towerId: string }
  | { type: 'cancel_queue'; playerId: string; towerId: string }
  | { type: 'start_vote'; playerId: string; voteType: string; targetId?: string }
  | { type: 'cast_vote'; playerId: string; voteId: string }
  | { type: 'set_targeting'; playerId: string; towerId: string; mode: string };

// Messages from host -> all clients
export type HostBroadcast =
  | { type: 'game_state'; snapshot: GameStateSnapshot }
  | { type: 'lobby_state'; players: Record<string, any>; settings: any; phase: string }
  | { type: 'action_result'; success: boolean; action: string; playerId: string; message?: string }
  | { type: 'game_event'; event: any }
  | { type: 'join_response'; targetPlayerId: string; accepted: boolean; reason?: string };

// Presence payload
export interface PresencePayload {
  playerId: string;
  playerName: string;
  joinedAt: number;
  isHost: boolean;
  isSpectator?: boolean;
}

// Room advertisement for lobby discovery
export interface RoomAdvertisement {
  roomCode: string;
  roomName: string;
  hostName: string;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  mapSize: string;
  difficulty: string;
  inGame: boolean;
}
