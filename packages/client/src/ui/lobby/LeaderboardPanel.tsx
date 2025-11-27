import { useState, useMemo, useEffect } from 'react';
import { useStatsStore, LeaderboardEntry, GlobalLeaderboardEntry, BADGES, getUnlockedBadges } from '../../stores/stats-store';
import { isSupabaseConfigured } from '../../supabase';
import { shareScore } from '../../utils/share';

type SortKey = 'wave' | 'kills' | 'damageDealt' | 'towersPlaced' | 'date';
type Tab = 'local' | 'global';
type DifficultyFilter = 'all' | 'easy' | 'normal' | 'hard' | 'extreme';

interface LeaderboardPanelProps {
  onClose: () => void;
}

export function LeaderboardPanel({ onClose }: LeaderboardPanelProps) {
  const leaderboard = useStatsStore((s) => s.leaderboard);
  const stats = useStatsStore((s) => ({
    gamesPlayed: s.gamesPlayed,
    gamesWon: s.gamesWon,
    totalKills: s.totalKills,
    totalTowersPlaced: s.totalTowersPlaced,
    totalDamageDealt: s.totalDamageDealt,
    bestWaveReached: s.bestWaveReached,
  }));
  const fetchGlobalLeaderboard = useStatsStore((s) => s.fetchGlobalLeaderboard);
  const unlockedBadges = useMemo(() => getUnlockedBadges(stats, leaderboard), [stats, leaderboard]);
  const hasSupabase = isSupabaseConfigured();

  const [tab, setTab] = useState<Tab>('local');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<'all' | 'victory' | 'defeat'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');

  const [globalEntries, setGlobalEntries] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    if (tab === 'global' && hasSupabase) {
      setGlobalLoading(true);
      fetchGlobalLeaderboard(difficultyFilter !== 'all' ? { difficulty: difficultyFilter } : undefined)
        .then(setGlobalEntries)
        .finally(() => setGlobalLoading(false));
    }
  }, [tab, difficultyFilter, hasSupabase, fetchGlobalLeaderboard]);

  const sorted = useMemo(() => {
    let filtered = leaderboard;
    if (filter === 'victory') filtered = filtered.filter((e) => e.victory);
    if (filter === 'defeat') filtered = filtered.filter((e) => !e.victory);

    return [...filtered].sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case 'wave': av = a.wave; bv = b.wave; break;
        case 'kills': av = a.kills; bv = b.kills; break;
        case 'damageDealt': av = a.damageDealt ?? 0; bv = b.damageDealt ?? 0; break;
        case 'towersPlaced': av = a.towersPlaced ?? 0; bv = b.towersPlaced ?? 0; break;
        case 'date': av = new Date(a.date).getTime(); bv = new Date(b.date).getTime(); break;
        default: av = new Date(a.date).getTime(); bv = new Date(b.date).getTime();
      }
      return sortAsc ? av - bv : bv - av;
    });
  }, [leaderboard, sortKey, sortAsc, filter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const headerStyle = (key: SortKey, align: 'left' | 'right' = 'left'): React.CSSProperties => ({
    padding: '4px 6px',
    textAlign: align,
    cursor: 'pointer',
    color: sortKey === key ? '#44bbff' : '#8888aa',
    userSelect: 'none',
  });

  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? ' \u25B2' : ' \u25BC') : '';

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    minHeight: 'auto',
    background: tab === t ? 'rgba(68, 187, 255, 0.15)' : 'transparent',
    border: tab === t ? '1px solid #44bbff' : '1px solid #333366',
    color: tab === t ? '#44bbff' : '#8888aa',
    cursor: 'pointer',
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: 100,
    }}>
      <div style={{
        width: 'min(560px, 95vw)',
        maxHeight: '80vh',
        padding: 20,
        background: 'rgba(10, 10, 26, 0.95)',
        borderRadius: 10,
        border: '1px solid #333366',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#44bbff' }}>
            Leaderboard
          </h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {hasSupabase && (
              <>
                <button onClick={() => setTab('local')} style={tabStyle('local')}>Local</button>
                <button onClick={() => setTab('global')} style={tabStyle('global')}>Global</button>
              </>
            )}
          </div>
        </div>

        {/* Prestige Badges */}
        {BADGES.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 10,
            padding: '8px 10px',
            background: 'rgba(26, 26, 58, 0.4)',
            borderRadius: 6,
            border: '1px solid #222244',
          }}>
            {BADGES.map((badge) => {
              const unlocked = unlockedBadges.some((b) => b.id === badge.id);
              return (
                <span
                  key={badge.id}
                  title={`${badge.name}: ${badge.description}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: unlocked ? `${badge.color}15` : 'rgba(40, 40, 60, 0.4)',
                    border: `1px solid ${unlocked ? `${badge.color}44` : '#333344'}`,
                    color: unlocked ? badge.color : '#444466',
                    opacity: unlocked ? 1 : 0.5,
                    cursor: 'default',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{badge.icon}</span>
                  {badge.name}
                </span>
              );
            })}
          </div>
        )}

        {tab === 'local' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {(['all', 'victory', 'defeat'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '3px 8px', fontSize: 10, minHeight: 'auto',
                    background: filter === f ? 'rgba(68, 187, 255, 0.15)' : 'transparent',
                    border: filter === f ? '1px solid #44bbff' : '1px solid #333366',
                    color: filter === f ? '#44bbff' : '#8888aa',
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {sorted.length === 0 ? (
              <p style={{ color: '#8888aa', fontSize: 13, textAlign: 'center', padding: 20 }}>
                {leaderboard.length === 0 ? 'No games recorded yet. Play a game to see your scores!' : 'No matching games.'}
              </p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333366', fontSize: 10, textTransform: 'uppercase' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>#</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Name</th>
                      <th style={headerStyle('wave')} onClick={() => toggleSort('wave')}>Wave{arrow('wave')}</th>
                      <th style={headerStyle('kills')} onClick={() => toggleSort('kills')}>Kills{arrow('kills')}</th>
                      <th style={headerStyle('damageDealt', 'right')} onClick={() => toggleSort('damageDealt')}>Dmg{arrow('damageDealt')}</th>
                      <th style={headerStyle('towersPlaced', 'right')} onClick={() => toggleSort('towersPlaced')}>Towers{arrow('towersPlaced')}</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Gov</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Result</th>
                      <th style={headerStyle('date', 'right')} onClick={() => toggleSort('date')}>Date{arrow('date')}</th>
                      <th style={{ padding: '4px 6px', width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((entry, i) => (
                      <LocalLeaderboardRow key={i} entry={entry} rank={i + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'global' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {(['all', 'easy', 'normal', 'hard', 'extreme'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  style={{
                    padding: '3px 8px', fontSize: 10, minHeight: 'auto',
                    background: difficultyFilter === d ? 'rgba(68, 187, 255, 0.15)' : 'transparent',
                    border: difficultyFilter === d ? '1px solid #44bbff' : '1px solid #333366',
                    color: difficultyFilter === d ? '#44bbff' : '#8888aa',
                    textTransform: 'capitalize',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {globalLoading ? (
              <p style={{ color: '#8888aa', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
            ) : globalEntries.length === 0 ? (
              <p style={{ color: '#8888aa', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No global scores yet. Be the first!
              </p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333366', fontSize: 10, textTransform: 'uppercase' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>#</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Player</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Wave</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Kills</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', color: '#8888aa' }}>Dmg</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Gov</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', color: '#8888aa' }}>Result</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', color: '#8888aa' }}>Date</th>
                      <th style={{ padding: '4px 6px', width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {globalEntries.map((entry, i) => (
                      <GlobalLeaderboardRow key={entry.id} entry={entry} rank={i + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 12, padding: '8px 16px', fontSize: 13 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Share"
      style={{
        padding: '2px 6px',
        fontSize: 10,
        minHeight: 'auto',
        lineHeight: 1,
        background: 'transparent',
        border: '1px solid #333366',
        color: '#8888aa',
        cursor: 'pointer',
      }}
    >
      Share
    </button>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#44ff88',
  hard: '#ffaa44',
  extreme: '#ff4466',
};

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty || difficulty === 'normal') return null;
  const color = DIFFICULTY_COLORS[difficulty] || '#8888aa';
  return (
    <span style={{
      fontSize: 9,
      padding: '1px 4px',
      borderRadius: 3,
      background: `${color}15`,
      color,
      border: `1px solid ${color}33`,
      marginLeft: 4,
      textTransform: 'capitalize',
    }}>
      {difficulty}
    </span>
  );
}

function LocalLeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const rankColor = rank === 1 ? '#ffdd44' : rank === 2 ? '#cccccc' : rank === 3 ? '#cc8844' : '#8888aa';
  const date = new Date(entry.date);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  const handleShare = async () => {
    await shareScore({
      playerName: entry.playerName || 'Player',
      wave: entry.wave,
      kills: entry.kills,
      damageDealt: entry.damageDealt,
      towersPlaced: entry.towersPlaced,
      governor: entry.governor,
      victory: entry.victory,
      difficulty: entry.difficulty,
    });
  };

  return (
    <tr style={{ borderBottom: '1px solid #222244' }}>
      <td style={{ padding: '5px 6px', color: rankColor, fontWeight: rank <= 3 ? 700 : 400 }}>{rank}</td>
      <td style={{ padding: '5px 6px', color: '#e0e0f0', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.playerName || 'Player'}</td>
      <td style={{ padding: '5px 6px', color: '#44bbff', fontWeight: 600 }}>{entry.wave}</td>
      <td style={{ padding: '5px 6px', color: '#cc88ff' }}>{entry.kills}</td>
      <td style={{ padding: '5px 6px', color: '#ff8844', textAlign: 'right' }}>{entry.damageDealt ?? 0}</td>
      <td style={{ padding: '5px 6px', color: '#44bbff', textAlign: 'right' }}>{entry.towersPlaced ?? 0}</td>
      <td style={{ padding: '5px 6px', color: '#e0e0f0', textTransform: 'capitalize' }}>
        {entry.governor ?? '\u2014'}
      </td>
      <td style={{ padding: '5px 6px' }}>
        <span style={{
          fontSize: 10,
          padding: '1px 5px',
          borderRadius: 3,
          background: entry.victory ? 'rgba(68, 255, 136, 0.15)' : 'rgba(255, 68, 102, 0.15)',
          color: entry.victory ? '#44ff88' : '#ff4466',
          border: `1px solid ${entry.victory ? 'rgba(68, 255, 136, 0.3)' : 'rgba(255, 68, 102, 0.3)'}`,
        }}>
          {entry.victory ? 'Victory' : 'Defeat'}
        </span>
        <DifficultyBadge difficulty={entry.difficulty} />
      </td>
      <td style={{ padding: '5px 6px', color: '#8888aa', textAlign: 'right', fontSize: 11 }}>{dateStr}</td>
      <td style={{ padding: '5px 6px' }}><ShareButton onClick={handleShare} /></td>
    </tr>
  );
}

function GlobalLeaderboardRow({ entry, rank }: { entry: GlobalLeaderboardEntry; rank: number }) {
  const rankColor = rank === 1 ? '#ffdd44' : rank === 2 ? '#cccccc' : rank === 3 ? '#cc8844' : '#8888aa';
  const date = new Date(entry.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

  const handleShare = async () => {
    await shareScore({
      playerName: entry.playerName,
      wave: entry.wave,
      kills: entry.kills,
      damageDealt: entry.damageDealt,
      towersPlaced: entry.towersPlaced,
      governor: entry.governor,
      victory: entry.victory,
      difficulty: entry.difficulty,
    });
  };

  return (
    <tr style={{ borderBottom: '1px solid #222244' }}>
      <td style={{ padding: '5px 6px', color: rankColor, fontWeight: rank <= 3 ? 700 : 400 }}>{rank}</td>
      <td style={{ padding: '5px 6px', color: '#e0e0f0', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.playerName}</td>
      <td style={{ padding: '5px 6px', color: '#44bbff', fontWeight: 600 }}>{entry.wave}</td>
      <td style={{ padding: '5px 6px', color: '#cc88ff' }}>{entry.kills}</td>
      <td style={{ padding: '5px 6px', color: '#ff8844', textAlign: 'right' }}>{entry.damageDealt}</td>
      <td style={{ padding: '5px 6px', color: '#e0e0f0', textTransform: 'capitalize' }}>
        {entry.governor ?? '\u2014'}
      </td>
      <td style={{ padding: '5px 6px' }}>
        <span style={{
          fontSize: 10,
          padding: '1px 5px',
          borderRadius: 3,
          background: entry.victory ? 'rgba(68, 255, 136, 0.15)' : 'rgba(255, 68, 102, 0.15)',
          color: entry.victory ? '#44ff88' : '#ff4466',
          border: `1px solid ${entry.victory ? 'rgba(68, 255, 136, 0.3)' : 'rgba(255, 68, 102, 0.3)'}`,
        }}>
          {entry.victory ? 'Victory' : 'Defeat'}
        </span>
        <DifficultyBadge difficulty={entry.difficulty} />
      </td>
      <td style={{ padding: '5px 6px', color: '#8888aa', textAlign: 'right', fontSize: 11 }}>{dateStr}</td>
      <td style={{ padding: '5px 6px' }}><ShareButton onClick={handleShare} /></td>
    </tr>
  );
}
