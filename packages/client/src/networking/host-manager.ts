import type { PresencePayload } from './protocol';

/**
 * Determines which player is the host based on earliest joinedAt.
 * Handles host election and migration.
 */
export class HostManager {
  private presences: Record<string, PresencePayload[]> = {};
  private myPlayerId: string;
  private _isHost = false;
  private _hostId: string | null = null;
  private onHostChanged?: (newHostId: string, isMe: boolean) => void;

  constructor(myPlayerId: string, onHostChanged?: (newHostId: string, isMe: boolean) => void) {
    this.myPlayerId = myPlayerId;
    this.onHostChanged = onHostChanged;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get hostId(): string | null {
    return this._hostId;
  }

  updatePresences(presences: Record<string, PresencePayload[]>): void {
    this.presences = presences;
    this._electHost();
  }

  private _electHost(): void {
    // Flatten all presences and find the one with earliest joinedAt
    const allPresences: PresencePayload[] = [];
    for (const list of Object.values(this.presences)) {
      allPresences.push(...list);
    }

    if (allPresences.length === 0) {
      this._isHost = false;
      this._hostId = null;
      return;
    }

    allPresences.sort((a, b) => a.joinedAt - b.joinedAt);
    const elected = allPresences[0];
    const prevHostId = this._hostId;

    this._hostId = elected.playerId;
    this._isHost = elected.playerId === this.myPlayerId;

    if (prevHostId !== this._hostId) {
      this.onHostChanged?.(this._hostId, this._isHost);
    }
  }

  getPlayerIds(): string[] {
    const ids = new Set<string>();
    for (const list of Object.values(this.presences)) {
      for (const p of list) ids.add(p.playerId);
    }
    return [...ids];
  }

  getPresenceList(): PresencePayload[] {
    const all: PresencePayload[] = [];
    for (const list of Object.values(this.presences)) {
      all.push(...list);
    }
    return all;
  }
}
