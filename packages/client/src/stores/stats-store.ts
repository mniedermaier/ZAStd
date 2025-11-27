import { create } from 'zustand';
import { getSupabase } from '../supabase';
import { useLobbyStore } from './lobby-store';

interface LifetimeStats {
  gamesPlayed: number;
  gamesWon: number;
  totalKills: number;
  totalTowersPlaced: number;
  totalDamageDealt: number;
  bestWaveReached: number;
}

export interface LeaderboardEntry {
  wave: number;
  kills: number;
  damageDealt: number;
  towersPlaced: number;
  governor: string | null;
  victory: boolean;
  date: string;
  playerName?: string;
  difficulty?: string;
  mapSize?: string;
  playerCount?: number;
}

export interface GlobalLeaderboardEntry {
  id: string;
  playerName: string;
  wave: number;
  kills: number;
  damageDealt: number;
  towersPlaced: number;
  governor: string | null;
  victory: boolean;
  difficulty: string;
  mapSize: string;
  playerCount: number;
  createdAt: string;
}

interface GameContext {
  difficulty: string;
  mapSize: string;
  playerCount: number;
}

interface StatsStore extends LifetimeStats {
  leaderboard: LeaderboardEntry[];
  recordGameEnd: (victory: boolean, stats: Record<string, { kills: number; damageDealt: number; towersPlaced: number; governor?: string | null }>, waveReached: number, playerId: string, gameContext?: GameContext) => void;
  fetchGlobalLeaderboard: (options?: { difficulty?: string }) => Promise<GlobalLeaderboardEntry[]>;
}

// ===== PRESTIGE BADGES =====

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Complete your first game', icon: '\u2694', color: '#cc4444' },
  { id: 'veteran', name: 'Veteran', description: 'Play 10 games', icon: '\u2605', color: '#8888aa' },
  { id: 'survivor', name: 'Survivor', description: 'Reach wave 20', icon: '\u2764', color: '#44ff88' },
  { id: 'champion', name: 'Champion', description: 'Win a game', icon: '\u2655', color: '#ffdd44' },
  { id: 'legend', name: 'Legend', description: 'Win 5 games', icon: '\u265B', color: '#ff8844' },
  { id: 'slayer', name: 'Slayer', description: 'Kill 1000 enemies total', icon: '\u2620', color: '#ff4466' },
  { id: 'architect', name: 'Architect', description: 'Place 500 towers total', icon: '\u2302', color: '#44bbff' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Win on Hard difficulty', icon: '\u2728', color: '#cc88ff' },
];

export function getUnlockedBadges(stats: LifetimeStats, leaderboard: LeaderboardEntry[]): Badge[] {
  const unlocked: Badge[] = [];
  if (stats.gamesPlayed >= 1) unlocked.push(BADGES.find(b => b.id === 'first_blood')!);
  if (stats.gamesPlayed >= 10) unlocked.push(BADGES.find(b => b.id === 'veteran')!);
  if (stats.bestWaveReached >= 20) unlocked.push(BADGES.find(b => b.id === 'survivor')!);
  if (stats.gamesWon >= 1) unlocked.push(BADGES.find(b => b.id === 'champion')!);
  if (stats.gamesWon >= 5) unlocked.push(BADGES.find(b => b.id === 'legend')!);
  if (stats.totalKills >= 1000) unlocked.push(BADGES.find(b => b.id === 'slayer')!);
  if (stats.totalTowersPlaced >= 500) unlocked.push(BADGES.find(b => b.id === 'architect')!);
  // Perfectionist: check leaderboard for any hard+ win
  const hasHardWin = leaderboard.some(e => e.victory && (e.difficulty === 'hard' || e.difficulty === 'extreme'));
  if (hasHardWin) unlocked.push(BADGES.find(b => b.id === 'perfectionist')!);
  return unlocked.filter(Boolean);
}

const MAX_LEADERBOARD = 20;

function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem('zastd:lifetimeStats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { gamesPlayed: 0, gamesWon: 0, totalKills: 0, totalTowersPlaced: 0, totalDamageDealt: 0, bestWaveReached: 0 };
}

function saveStats(stats: LifetimeStats) {
  try { localStorage.setItem('zastd:lifetimeStats', JSON.stringify(stats)); } catch {}
}

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem('zastd:leaderboard');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try { localStorage.setItem('zastd:leaderboard', JSON.stringify(entries)); } catch {}
}

async function submitScoreToGlobal(entry: LeaderboardEntry) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const lobbyName = useLobbyStore.getState().playerName;
    await supabase.from('scores').insert({
      player_name: lobbyName || 'Anonymous',
      wave: entry.wave,
      kills: entry.kills,
      damage_dealt: entry.damageDealt,
      towers_placed: entry.towersPlaced,
      governor: entry.governor,
      victory: entry.victory,
      difficulty: entry.difficulty || 'normal',
      map_size: entry.mapSize || 'medium',
      player_count: entry.playerCount || 1,
    });
  } catch {
    // Fire-and-forget: silently fail if no Supabase
  }
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  ...loadStats(),
  leaderboard: loadLeaderboard(),

  recordGameEnd: (victory, stats, waveReached, playerId, gameContext) => {
    const playerStats = stats[playerId];
    const prev = get();
    const updated: LifetimeStats = {
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + (victory ? 1 : 0),
      totalKills: prev.totalKills + (playerStats?.kills ?? 0),
      totalTowersPlaced: prev.totalTowersPlaced + (playerStats?.towersPlaced ?? 0),
      totalDamageDealt: prev.totalDamageDealt + (playerStats?.damageDealt ?? 0),
      bestWaveReached: Math.max(prev.bestWaveReached, waveReached),
    };
    saveStats(updated);

    const entry: LeaderboardEntry = {
      wave: waveReached,
      kills: playerStats?.kills ?? 0,
      damageDealt: playerStats?.damageDealt ?? 0,
      towersPlaced: playerStats?.towersPlaced ?? 0,
      governor: playerStats?.governor ?? null,
      victory,
      date: new Date().toISOString(),
      playerName: useLobbyStore.getState().playerName || 'You',
      difficulty: gameContext?.difficulty ?? 'normal',
      mapSize: gameContext?.mapSize ?? 'medium',
      playerCount: gameContext?.playerCount ?? 1,
    };
    const lb = [...prev.leaderboard, entry]
      .sort((a, b) => b.wave - a.wave || Number(b.victory) - Number(a.victory) || b.kills - a.kills)
      .slice(0, MAX_LEADERBOARD);
    saveLeaderboard(lb);

    set({ ...updated, leaderboard: lb });

    // Fire-and-forget global submission
    submitScoreToGlobal(entry);
  },

  fetchGlobalLeaderboard: async (options) => {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      let query = supabase
        .from('scores')
        .select('*')
        .order('wave', { ascending: false })
        .order('kills', { ascending: false })
        .limit(50);

      if (options?.difficulty) {
        query = query.eq('difficulty', options.difficulty);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        playerName: row.player_name,
        wave: row.wave,
        kills: row.kills,
        damageDealt: row.damage_dealt,
        towersPlaced: row.towers_placed,
        governor: row.governor,
        victory: row.victory,
        difficulty: row.difficulty,
        mapSize: row.map_size,
        playerCount: row.player_count,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },
}));
