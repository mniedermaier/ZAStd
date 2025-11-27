import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../supabase';
import type { RoomAdvertisement } from './protocol';

const DISCOVERY_CHANNEL = 'lobby:discovery';

export class LobbyDiscovery {
  private channel: RealtimeChannel | null = null;
  private onRoomsChanged?: (rooms: RoomAdvertisement[]) => void;

  subscribe(onRoomsChanged: (rooms: RoomAdvertisement[]) => void): void {
    const supabase = getSupabase();
    if (!supabase) return;

    this.onRoomsChanged = onRoomsChanged;

    this.channel = supabase.channel(DISCOVERY_CHANNEL);

    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState<RoomAdvertisement>();
      const rooms: RoomAdvertisement[] = [];
      for (const list of Object.values(state)) {
        for (const ad of list as RoomAdvertisement[]) {
          if (ad.roomCode) rooms.push(ad);
        }
      }
      this.onRoomsChanged?.(rooms);
    });

    this.channel.subscribe();
  }

  async advertise(ad: RoomAdvertisement): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!this.channel) {
      this.channel = supabase.channel(DISCOVERY_CHANNEL);
      this.channel.on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState<RoomAdvertisement>();
        const rooms: RoomAdvertisement[] = [];
        for (const list of Object.values(state)) {
          for (const ad of list as RoomAdvertisement[]) {
            if (ad.roomCode) rooms.push(ad);
          }
        }
        this.onRoomsChanged?.(rooms);
      });

      await new Promise<void>((resolve) => {
        this.channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      });
    }

    await this.channel.track(ad as any);
  }

  async updateAdvertisement(partial: Partial<RoomAdvertisement>): Promise<void> {
    if (!this.channel) return;
    // Supabase track replaces the entire presence, so we need full object
    // The caller should pass the full updated ad
    await this.channel.track(partial as any);
  }

  async stopAdvertising(): Promise<void> {
    if (this.channel) {
      await this.channel.untrack();
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.onRoomsChanged = undefined;
  }
}
