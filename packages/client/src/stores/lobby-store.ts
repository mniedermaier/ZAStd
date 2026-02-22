import { create } from 'zustand';
import type { RoomAdvertisement } from '../networking/protocol';

export type AppPhase =
  | 'main_menu'
  | 'room_browser'
  | 'create_room'
  | 'join_by_code'
  | 'solo_lobby'
  | 'solo_game'
  | 'daily_lobby'
  | 'daily_game'
  | 'endless_lobby'
  | 'endless_game'
  | 'lobby'
  | 'game'
  | 'tutorial_lobby'
  | 'tutorial_game'
  | 'weekly_lobby'
  | 'weekly_game'
  | 'replay_viewer'
  | 'spectating';

interface LobbyStore {
  playerName: string;
  roomId: string | null;
  inGame: boolean;

  // Multiplayer state
  appPhase: AppPhase;
  availableRooms: RoomAdvertisement[];
  currentRoomCode: string | null;
  isHost: boolean;
  joinError: string | null;
  isLoading: boolean;
  loadingMessage: string;
  isReconnecting: boolean;
  isSpectating: boolean;

  setPlayerName: (name: string) => void;
  setRoomId: (id: string | null) => void;
  setInGame: (v: boolean) => void;
  setAppPhase: (phase: AppPhase) => void;
  setAvailableRooms: (rooms: RoomAdvertisement[]) => void;
  setCurrentRoom: (code: string, isHost: boolean) => void;
  clearCurrentRoom: () => void;
  setJoinError: (error: string | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setReconnecting: (v: boolean) => void;
  setSpectating: (v: boolean) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  playerName: localStorage.getItem('zastd-player-name') || '',
  roomId: null,
  inGame: false,

  appPhase: 'main_menu',
  availableRooms: [],
  currentRoomCode: null,
  isHost: false,
  joinError: null,
  isLoading: false,
  loadingMessage: '',
  isReconnecting: false,
  isSpectating: false,

  setPlayerName: (name) => {
    localStorage.setItem('zastd-player-name', name);
    set({ playerName: name });
  },
  setRoomId: (id) => set({ roomId: id }),
  setInGame: (v) => set({ inGame: v }),
  setAppPhase: (phase) => set({ appPhase: phase }),
  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
  setCurrentRoom: (code, isHost) => set({ currentRoomCode: code, isHost, joinError: null }),
  clearCurrentRoom: () => set({ currentRoomCode: null, isHost: false, joinError: null }),
  setJoinError: (error) => set({ joinError: error }),
  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),
  setReconnecting: (v) => set({ isReconnecting: v }),
  setSpectating: (v) => set({ isSpectating: v }),
}));
