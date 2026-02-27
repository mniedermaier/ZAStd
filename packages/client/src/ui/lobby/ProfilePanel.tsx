import { useMemo } from 'react';
import { useStatsStore, BADGES, getUnlockedBadges, MASTERY_TIERS, getMasteryLevel } from '../../stores/stats-store';
import { GOVERNORS } from '@zastd/engine';

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const stats = useStatsStore((s) => ({
    gamesPlayed: s.gamesPlayed,
    gamesWon: s.gamesWon,
    totalKills: s.totalKills,
    totalTowersPlaced: s.totalTowersPlaced,
    totalDamageDealt: s.totalDamageDealt,
    bestWaveReached: s.bestWaveReached,
  }));
  const leaderboard = useStatsStore((s) => s.leaderboard);
  const governorMastery = useStatsStore((s) => s.governorMastery);
  const unlockedBadges = useMemo(() => getUnlockedBadges(stats, leaderboard), [stats, leaderboard]);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

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
        width: 'min(480px, 95vw)',
        maxHeight: '85vh',
        padding: 20,
        background: 'rgba(10, 10, 26, 0.95)',
        borderRadius: 10,
        border: '1px solid #333366',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <h2 style={{ margin: 0, marginBottom: 14, fontSize: 20, color: '#44bbff', textAlign: 'center' }}>
          Profile
        </h2>

        {/* Lifetime Stats */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(26, 26, 58, 0.4)',
          borderRadius: 6,
          border: '1px solid #222244',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Lifetime Stats
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 16px',
            fontSize: 12,
          }}>
            <span style={{ color: '#8888aa' }}>Games Played</span>
            <span style={{ textAlign: 'right', color: '#e0e0f0' }}>{stats.gamesPlayed}</span>
            <span style={{ color: '#8888aa' }}>Games Won</span>
            <span style={{ textAlign: 'right', color: '#44ff88' }}>{stats.gamesWon}</span>
            <span style={{ color: '#8888aa' }}>Win Rate</span>
            <span style={{ textAlign: 'right', color: '#44bbff' }}>{winRate}%</span>
            <span style={{ color: '#8888aa' }}>Total Kills</span>
            <span style={{ textAlign: 'right', color: '#cc88ff' }}>{stats.totalKills.toLocaleString()}</span>
            <span style={{ color: '#8888aa' }}>Total Towers</span>
            <span style={{ textAlign: 'right', color: '#44bbff' }}>{stats.totalTowersPlaced.toLocaleString()}</span>
            <span style={{ color: '#8888aa' }}>Total Damage</span>
            <span style={{ textAlign: 'right', color: '#ff8844' }}>{stats.totalDamageDealt.toLocaleString()}</span>
            <span style={{ color: '#8888aa' }}>Best Wave</span>
            <span style={{ textAlign: 'right', color: '#ffdd44', fontWeight: 600 }}>{stats.bestWaveReached}</span>
          </div>
        </div>

        {/* Governor Mastery */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(26, 26, 58, 0.4)',
          borderRadius: 6,
          border: '1px solid #222244',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Governor Mastery
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(GOVERNORS).map(([key, gov]) => {
              const mastery = governorMastery[key];
              const gamesPlayed = mastery?.gamesPlayed ?? 0;
              const gamesWon = mastery?.gamesWon ?? 0;
              const tier = getMasteryLevel(gamesPlayed);

              // Calculate progress to next tier
              let progressPct = 0;
              let nextTierName: string = MASTERY_TIERS[0].name;
              let nextTierGames: number = MASTERY_TIERS[0].minGames;
              if (gamesPlayed === 0) {
                progressPct = 0;
                nextTierName = MASTERY_TIERS[0].name;
                nextTierGames = MASTERY_TIERS[0].minGames;
              } else {
                // Find current tier index and next tier
                let currentIdx = -1;
                for (let i = MASTERY_TIERS.length - 1; i >= 0; i--) {
                  if (gamesPlayed >= MASTERY_TIERS[i].minGames) {
                    currentIdx = i;
                    break;
                  }
                }
                if (currentIdx >= MASTERY_TIERS.length - 1) {
                  // Max tier reached
                  progressPct = 100;
                  nextTierName = '';
                  nextTierGames = 0;
                } else {
                  const prevMin = currentIdx >= 0 ? MASTERY_TIERS[currentIdx].minGames : 0;
                  const nextMin = MASTERY_TIERS[currentIdx + 1].minGames;
                  nextTierName = MASTERY_TIERS[currentIdx + 1].name;
                  nextTierGames = nextMin;
                  progressPct = Math.min(100, ((gamesPlayed - prevMin) / (nextMin - prevMin)) * 100);
                }
              }

              const barColor = tier?.color ?? '#333366';

              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
                    {key === 'fire' ? '\uD83D\uDD25' : key === 'ice' ? '\u2744\uFE0F' : key === 'thunder' ? '\u26A1' :
                     key === 'poison' ? '\u2620\uFE0F' : key === 'death' ? '\uD83D\uDC80' : key === 'nature' ? '\uD83C\uDF3F' :
                     key === 'arcane' ? '\u2728' : '\u271D\uFE0F'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: '#e0e0f0', fontWeight: 600 }}>
                        {gov.name}
                        {tier && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: tier.color, fontWeight: 700 }}>
                            {tier.name}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 10, color: '#8888aa' }}>
                        {gamesWon}W / {gamesPlayed}G
                        {nextTierName && ` \u2192 ${nextTierName} (${nextTierGames}G)`}
                      </span>
                    </div>
                    <div style={{
                      height: 4,
                      background: 'rgba(40, 40, 60, 0.8)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: 2,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(26, 26, 58, 0.4)',
          borderRadius: 6,
          border: '1px solid #222244',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Badges ({unlockedBadges.length}/{BADGES.length})
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
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
        </div>

        <button
          onClick={onClose}
          style={{ padding: '8px 16px', fontSize: 13, alignSelf: 'center' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
