import type { GameStateSnapshot } from './types';

export interface ReplayFrame {
  waveNumber: number;
  timestamp: number;
  snapshot: GameStateSnapshot;
}

export interface ReplayData {
  version: number;
  settings: { mapSize: string; mapLayout: string; difficulty: string };
  players: Array<{ playerId: string; name: string; governor: string | null }>;
  frames: ReplayFrame[];
  result: string;
  totalWaves: number;
}

export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private result = '';
  private settings: { mapSize: string; mapLayout: string; difficulty: string } = { mapSize: 'medium', mapLayout: 'classic', difficulty: 'normal' };
  private players: Array<{ playerId: string; name: string; governor: string | null }> = [];
  private finalized = false;

  recordFrame(waveNumber: number, snapshot: GameStateSnapshot): void {
    if (this.finalized) return;

    // Capture settings from first frame
    if (this.frames.length === 0) {
      this.settings = { ...snapshot.settings };
      this.players = Object.entries(snapshot.players).map(([pid, p]) => ({
        playerId: pid, name: p.name, governor: p.governor,
      }));
    }

    this.frames.push({
      waveNumber,
      timestamp: snapshot.timestamp,
      snapshot,
    });
  }

  finalize(result: string): ReplayData {
    this.finalized = true;
    this.result = result;
    return this.getData();
  }

  getData(): ReplayData {
    return {
      version: 1,
      settings: this.settings,
      players: this.players,
      frames: this.frames,
      result: this.result,
      totalWaves: this.frames.length,
    };
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}
