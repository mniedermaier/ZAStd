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
      <span style={{ fontWeight: 700, fontSize: 13 }}>{gov.name}</span>
      <span style={{ fontSize: 10, color: '#8888aa', textAlign: 'center' }}>{gov.passiveBonus}</span>
      {tier && (
        <span style={{ fontSize: 9, color: tier.color, fontWeight: 600 }}>
          {tier.name} ({mastery!.gamesWon}W/{mastery!.gamesPlayed}G)
        </span>
      )}
    </button>
  );
}
