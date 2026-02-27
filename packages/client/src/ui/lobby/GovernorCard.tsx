import { GOVERNORS } from '@zastd/engine';
import { useStatsStore, getMasteryLevel } from '../../stores/stats-store';

interface GovernorCardProps {
  element: string;
  selected: boolean;
  onSelect: (element: string) => void;
}

export function GovernorCard({ element, selected, onSelect }: GovernorCardProps) {
  const gov = GOVERNORS[element];
  const mastery = useStatsStore((s) => s.governorMastery[element]);
  if (!gov) return null;

  const tier = mastery ? getMasteryLevel(mastery.gamesPlayed) : null;

  return (
    <button
      onClick={() => onSelect(element)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 14px',
        width: '100%',
        background: selected ? `${gov.color}22` : 'rgba(26, 26, 58, 0.9)',
        border: selected ? `2px solid ${gov.color}` : '1px solid #333366',
        borderRadius: 8,
        color: selected ? gov.color : '#e0e0f0',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 20 }}>
        {element === 'fire' ? '🔥' : element === 'ice' ? '❄️' : element === 'thunder' ? '⚡' :
         element === 'poison' ? '☠️' : element === 'death' ? '💀' : element === 'nature' ? '🌿' :
         element === 'arcane' ? '✨' : '✝️'}
      </span>
      <span style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        {gov.name}
        {tier && (
          <span style={{
            fontSize: 8,
            color: tier.color,
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: 3,
            background: `${tier.color}15`,
            border: `1px solid ${tier.color}33`,
            lineHeight: 1.2,
          }}>
            {tier.name}
          </span>
        )}
      </span>
      <span style={{ fontSize: 10, color: '#8888aa', textAlign: 'center' }}>{gov.passiveBonus}</span>
      {mastery && mastery.gamesPlayed > 0 && (
        <span style={{ fontSize: 9, color: '#8888aa' }}>
          {mastery.gamesWon}W / {mastery.gamesPlayed}G
        </span>
      )}
    </button>
  );
}
