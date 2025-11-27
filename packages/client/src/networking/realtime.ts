import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../supabase';
import type { ClientAction, HostBroadcast, PresencePayload } from './protocol';

export type MessageHandler = (msg: HostBroadcast | ClientAction) => void;
export type PresenceHandler = (presences: Record<string, PresencePayload[]>) => void;
export type ErrorHandler = () => void;

export class RealtimeManager {
  private channel: RealtimeChannel | null = null;
  private roomId: string;
  private onMessage: MessageHandler;
  private onPresenceSync: PresenceHandler;
  private onError: ErrorHandler | null = null;
  private subscribed = false;

  constructor(roomId: string, onMessage: MessageHandler, onPresenceSync: PresenceHandler, onError?: ErrorHandler) {
    this.roomId = roomId;
    this.onMessage = onMessage;
    this.onPresenceSync = onPresenceSync;
    this.onError = onError ?? null;
  }

  private _setupChannel(): void {
    if (!this.channel) return;

    // Listen for broadcast messages
    this.channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      this.onMessage(payload as ClientAction);
    });

    this.channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      this.onMessage(payload as HostBroadcast);
    });

    this.channel.on('broadcast', { event: 'lobby' }, ({ payload }) => {
      this.onMessage(payload as HostBroadcast | ClientAction);
    });

    // Presence tracking
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState<PresencePayload>();
      this.onPresenceSync(state as Record<string, PresencePayload[]>);
    });
  }

  async join(presence: PresencePayload): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    this.channel = supabase.channel(`room:${this.roomId}`, {
      config: { broadcast: { self: false } },
    });

    this._setupChannel();

    // Subscribe and track presence
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      this.channel!.subscribe(async (status) => {
        if (resolved) {
          // Post-subscribe status changes (reconnect failures)
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.subscribed = false;
            this.onError?.();
          } else if (status === 'SUBSCRIBED') {
            this.subscribed = true;
          }
          return;
        }
        if (status === 'SUBSCRIBED') {
          resolved = true;
          this.subscribed = true;
          try {
            await this.channel!.track(presence);
          } catch {
            // Track failed but subscription succeeded
          }
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolved = true;
          resolve(false);
        }
      });
    });
  }

  sendAction(action: ClientAction): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'action',
      payload: action,
    });
  }

  broadcastState(state: HostBroadcast): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'state',
      payload: state,
    });
  }

  sendLobbyMessage(msg: HostBroadcast | ClientAction): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'lobby',
      payload: msg,
    });
  }

  async subscribeOnly(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    this.channel = supabase.channel(`room:${this.roomId}`, {
      config: { broadcast: { self: false } },
    });

    this._setupChannel();

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      this.channel!.subscribe((status) => {
        if (resolved) {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.subscribed = false;
            this.onError?.();
          } else if (status === 'SUBSCRIBED') {
            this.subscribed = true;
          }
          return;
        }
        if (status === 'SUBSCRIBED') {
          resolved = true;
          this.subscribed = true;
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolved = true;
          resolve(false);
        }
      });
    });
  }

  async trackPresence(presence: PresencePayload): Promise<void> {
    try {
      await this.channel?.track(presence);
    } catch {
      // Swallow track errors — heartbeat will retry
    }
  }

  async updatePresence(data: Partial<PresencePayload>): Promise<void> {
    try {
      await this.channel?.track(data as PresencePayload);
    } catch {
      // Swallow
    }
  }

  get isSubscribed(): boolean {
    return this.subscribed;
  }

  async leave(): Promise<void> {
    this.subscribed = false;
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
  }
}
