import { TECH_UPGRADES } from '@zastd/engine';
import { useGameStore } from '../../stores/game-store';

interface TechPanelProps {
  playerId: string;
  onBuyTech: (techId: string) => void;
}

export function TechPanel({ playerId, onBuyTech }: TechPanelProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  if (!snapshot) return null;
  const player = snapshot.players[playerId];
  if (!player) return null;

  const hasLumber = player.lumber > 0;

  return (
    <div className="tech-panel" style={{
      width: 200,
      padding: 10,
      background: 'rgba(10, 10, 26, 0.9)',
      borderRadius: 8,
      border: '1px solid #333366',
      fontSize: 12,
      pointerEvents: 'auto',
      opacity: hasLumber ? 1 : 0.7,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#88ff44' }}>
        Tech Upgrades (Lumber: {player.lumber})
      </div>
      {!hasLumber && (
        <div style={{ fontSize: 9, color: '#8888aa', marginBottom: 6, fontStyle: 'italic' }}>
          Lumber awarded every 5 waves
        </div>
      )}
      {Object.values(TECH_UPGRADES).map(tech => {
        const current = player.techUpgrades[tech.techId] ?? 0;
        const maxed = current >= tech.maxStacks;
        const canBuy = !maxed && player.lumber >= tech.lumberCost;

        return (
          <div key={tech.techId} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            borderBottom: '1px solid #222244',
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{tech.name}</div>
              <div style={{ color: '#8888aa', fontSize: 10 }}>{tech.description}</div>
              <div style={{ color: '#555577', fontSize: 10 }}>{current}/{tech.maxStacks} | Cost: {tech.lumberCost} lumber</div>
            </div>
            <button
              onClick={() => onBuyTech(tech.techId)}
              disabled={!canBuy}
              style={{ padding: '4px 8px', fontSize: 10 }}
            >
              {maxed ? 'Max' : 'Buy'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
