import { useRef, useCallback } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useGameStore } from '../../stores/game-store';
import { UPGRADE_DAMAGE_BOOST, UPGRADE_RANGE_BOOST, UPGRADE_FIRE_RATE_BOOST, UPGRADE_COST_MULTIPLIER, SYNERGY_DEFINITIONS } from '@zastd/engine';

const TARGETING_MODES = [
  { value: 'first', label: 'First', desc: 'Closest to exit' },
  { value: 'last', label: 'Last', desc: 'Closest to spawn' },
  { value: 'closest', label: 'Close', desc: 'Nearest to tower' },
  { value: 'strongest', label: 'Strong', desc: 'Highest HP' },
  { value: 'weakest', label: 'Weak', desc: 'Lowest HP' },
  { value: 'most_hp_pct', label: 'Fresh', desc: 'Highest HP %' },
] as const;

interface TowerInfoPanelProps {
  playerId: string;
  onUpgrade?: (towerId: string) => void;
  onSell?: (towerId: string) => void;
  onSetTargeting?: (towerId: string, mode: string) => void;
  onQueueUpgrade?: (towerId: string) => void;
  onCancelQueue?: (towerId: string) => void;
}

export function TowerInfoPanel({ playerId, onUpgrade, onSell, onSetTargeting, onQueueUpgrade, onCancelQueue }: TowerInfoPanelProps) {
  const selectedTowerId = useUIStore((s) => s.selectedTowerId);
  const snapshot = useGameStore((s) => s.snapshot);
  const selectTower = useUIStore((s) => s.selectTower);
  const touchStartY = useRef<number | null>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow vertical scrolling within the panel
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 50) {
        selectTower(null);
      }
      touchStartY.current = null;
    }
  }, [selectTower]);

  if (!selectedTowerId || !snapshot) return null;
  const tower = snapshot.towers[selectedTowerId];
  if (!tower) return null;
  const isOwner = tower.ownerId === playerId;
  const player = snapshot.players[playerId];

  const dmgTypeColor = tower.stats.damageType === 'magic' ? '#cc88ff' : '#ffaa88';
  const dmgTypeLabel = tower.stats.damageType === 'magic' ? 'Magic' : 'Physical';

  const upgradeCost = tower.level < 4 ? Math.floor(tower.stats.cost * UPGRADE_COST_MULTIPLIER * tower.level) : 0;
  const canAffordUpgrade = tower.level < 4 && player && player.money >= upgradeCost;

  // Content sections shared by both layouts
  const headerSection = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          {tower.towerType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
        <span style={{ color: '#8888aa' }}>Lv.{tower.level}</span>
      </div>

      {/* Damage type badge */}
      <div style={{
        display: 'inline-block',
        padding: '1px 6px',
        fontSize: 10,
        borderRadius: 3,
        background: `${dmgTypeColor}22`,
        color: dmgTypeColor,
        marginBottom: 8,
        border: `1px solid ${dmgTypeColor}44`,
      }}>
        {dmgTypeLabel} Damage
      </div>
    </>
  );

  const statsSection = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
      <StatRow label="Damage" value={tower.stats.damage} color="#ff8844" />
      <StatRow label="Range" value={tower.stats.range.toFixed(1)} color="#44bbff" />
      <StatRow label="Fire Rate" value={`${tower.stats.fireRate.toFixed(2)}/s`} color="#88ff44" />
    </div>
  );

  const hasAbilities = tower.stats.splashRadius > 0 || tower.stats.chainCount > 0 || tower.stats.stunDuration > 0 ||
    tower.stats.executeThreshold > 0 || tower.stats.auraRange > 0 || tower.stats.slowAmount > 0 ||
    tower.stats.poisonDamage > 0 || tower.stats.armorReduction > 0 || tower.stats.teleportDistance > 0;

  const abilitiesSection = hasAbilities ? (
    <div style={{ marginBottom: 8, padding: '4px 0', borderTop: '1px solid #333366' }}>
      <div style={{ fontSize: 9, color: '#8888aa', textTransform: 'uppercase', marginBottom: 3 }}>Abilities</div>
      {tower.stats.splashRadius > 0 && (
        <AbilityRow text={`Area splash in ${tower.stats.splashRadius.toFixed(1)} radius`} color="#ff8844" />
      )}
      {tower.stats.chainCount > 0 && (
        <AbilityRow text={`Lightning chains to ${tower.stats.chainCount} targets`} color="#ffee00" />
      )}
      {tower.stats.stunDuration > 0 && (
        <AbilityRow text={`Stuns for ${tower.stats.stunDuration}s`} color="#ffdd44" />
      )}
      {tower.stats.slowAmount > 0 && (
        <AbilityRow text={`Slows ${(tower.stats.slowAmount * 100).toFixed(0)}% for ${tower.stats.slowDuration}s`} color="#44bbff" />
      )}
      {tower.stats.poisonDamage > 0 && (
        <AbilityRow text={`Poison ${tower.stats.poisonDamage} dmg/s for ${tower.stats.poisonDuration}s`} color="#88ff00" />
      )}
      {tower.stats.armorReduction > 0 && (
        <AbilityRow text={`Reduces armor by ${tower.stats.armorReduction.toFixed(2)}`} color="#cc88ff" />
      )}
      {tower.stats.teleportDistance > 0 && (
        <AbilityRow text={`Teleports enemy back ${tower.stats.teleportDistance} cells`} color="#aa44ff" />
      )}
      {tower.stats.executeThreshold > 0 && (
        <AbilityRow text={`Executes below ${(tower.stats.executeThreshold * 100).toFixed(0)}% HP`} color="#ff4466" />
      )}
      {tower.stats.auraRange > 0 && (
        <AbilityRow text={`Boosts nearby: +${(tower.stats.auraDamageBoost * 100).toFixed(0)}% dmg, +${(tower.stats.auraSpeedBoost * 100).toFixed(0)}% speed`} color="#44ff88" />
      )}
    </div>
  ) : null;

  const hasSynergies = tower.activeSynergies && tower.activeSynergies.length > 0;
  const synergySection = hasSynergies ? (
    <div style={{ marginBottom: 8, padding: '4px 0', borderTop: '1px solid #333366' }}>
      <div style={{ fontSize: 9, color: '#ffdd44', textTransform: 'uppercase', marginBottom: 3 }}>Synergies</div>
      {tower.activeSynergies.map((synId: string) => {
        const syn = SYNERGY_DEFINITIONS.find(s => s.id === synId);
        if (!syn) return null;
        return (
          <div key={synId} style={{ fontSize: 10, color: '#ffdd44', marginBottom: 2 }}>
            {syn.name}: {syn.description}
          </div>
        );
      })}
    </div>
  ) : null;

  // Queue info
  const hasQueuedUpgrade = snapshot.upgradeQueue?.some(q => q.towerId === selectedTowerId);
  const queuedTarget = snapshot.upgradeQueue?.find(q => q.towerId === selectedTowerId)?.targetLevel;

  const effectivenessSection = (
    <div style={{ marginBottom: 6, fontSize: 9 }}>
      <span style={{ color: '#44ff88' }}>
        {tower.stats.damageType === 'magic' ? 'Strong vs: Armored' : 'Strong vs: Magic Resist'}
      </span>
      {' / '}
      <span style={{ color: '#ff4466' }}>
        {tower.stats.damageType === 'magic' ? 'Weak vs: Magic Resist' : 'Weak vs: Armored'}
      </span>
    </div>
  );

  const targetingSection = isOwner && tower.stats.fireRate > 0 && onSetTargeting ? (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: isMobile ? 10 : 9, color: '#8888aa', textTransform: 'uppercase', marginBottom: 3 }}>Target Priority</div>
      <div style={{ display: 'flex', gap: isMobile ? 4 : 3 }}>
        {TARGETING_MODES.map((m) => {
          const active = (tower.targetingMode ?? 'first') === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onSetTargeting(selectedTowerId, m.value)}
              title={m.desc}
              style={{
                flex: 1, padding: isMobile ? '4px 2px' : '3px 2px',
                fontSize: isMobile ? 10 : 9, minHeight: isMobile ? 30 : 'auto',
                background: active ? 'rgba(68, 187, 255, 0.2)' : 'transparent',
                border: active ? '1px solid #44bbff' : '1px solid #333366',
                color: active ? '#44bbff' : '#8888aa',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}
            >
              <span style={{ fontWeight: active ? 700 : 400 }}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const upgradePreviewSection = !isMobile && isOwner && tower.level < 4 ? (
    <div style={{ marginBottom: 6, padding: '4px 6px', background: 'rgba(68, 187, 255, 0.08)', borderRadius: 4, fontSize: 10, color: '#8888aa' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', marginBottom: 2, color: '#44bbff' }}>Next Level</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span>Dmg: <span style={{ color: '#ff8844' }}>{Math.floor(tower.stats.damage * (1 + UPGRADE_DAMAGE_BOOST))}</span></span>
        <span>Rng: <span style={{ color: '#44bbff' }}>{(tower.stats.range * (1 + UPGRADE_RANGE_BOOST)).toFixed(1)}</span></span>
        <span>Rate: <span style={{ color: '#88ff44' }}>{(tower.stats.fireRate * (1 + UPGRADE_FIRE_RATE_BOOST)).toFixed(2)}/s</span></span>
      </div>
      <div style={{ color: '#ffdd44', marginTop: 2 }}>
        Cost: {upgradeCost}g
      </div>
    </div>
  ) : null;

  const actionButtons = isOwner && onUpgrade && onSell ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {hasQueuedUpgrade && (
        <div style={{ fontSize: 10, color: '#ffdd44', textAlign: 'center' }}>
          Queued to Lv.{queuedTarget}
          {onCancelQueue && (
            <button
              onClick={() => onCancelQueue(selectedTowerId)}
              style={{ marginLeft: 8, fontSize: 9, color: '#ff4466', padding: '1px 6px', background: 'transparent', border: '1px solid #ff4466', borderRadius: 3, cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={(e) => {
            if (e.shiftKey && onQueueUpgrade) {
              onQueueUpgrade(selectedTowerId);
            } else {
              onUpgrade(selectedTowerId);
            }
          }}
          disabled={tower.level >= 4 || (!canAffordUpgrade && !onQueueUpgrade)}
          style={{ flex: 1 }}
          title={onQueueUpgrade ? 'Shift+click to queue' : undefined}
        >
          {tower.level >= 4 ? 'Max Level' : `Upgrade (${upgradeCost}g)`}
        </button>
        <button
          className="danger"
          onClick={() => { onSell(selectedTowerId); selectTower(null); }}
          style={{ flex: 1 }}
        >
          Sell
        </button>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <>
        {/* Backdrop — tap to deselect */}
        <div
          onClick={() => selectTower(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 50,
          }}
        />

        {/* Fixed drawer panel */}
        <div
          className="tower-info-panel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 12,
            background: 'rgba(10, 10, 26, 0.95)',
            borderTop: '1px solid #333366',
            borderRadius: '12px 12px 0 0',
            zIndex: 51,
            fontSize: 12,
          }}
        >
          {/* Swipe indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, flexShrink: 0 }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: '#555577' }} />
          </div>

          {/* Scrollable content */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {headerSection}
            {statsSection}
            {targetingSection}
            {abilitiesSection}
            {synergySection}
            {effectivenessSection}
          </div>

          {/* Pinned action buttons — always visible */}
          <div style={{ flexShrink: 0, paddingTop: 8, borderTop: '1px solid #333366' }}>
            {actionButtons}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className="tower-info-panel"
      style={{
        position: 'absolute',
        bottom: 80,
        right: 8,
        width: 230,
        borderRadius: 8,
        padding: 12,
        background: 'rgba(10, 10, 26, 0.92)',
        border: '1px solid #333366',
        zIndex: 10,
        fontSize: 12,
      }}
    >
      {headerSection}
      {statsSection}
      {abilitiesSection}
      {synergySection}
      {effectivenessSection}
      {targetingSection}
      {upgradePreviewSection}
      {actionButtons}
      <button
        onClick={() => selectTower(null)}
        style={{ width: '100%', marginTop: 6, fontSize: 11, color: '#8888aa' }}
      >
        Close
      </button>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <span style={{ color: '#8888aa', fontSize: 10 }}>{label}: </span>
      <span style={{ color: color ?? '#e0e0f0', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function AbilityRow({ text, color }: { text: string; color: string }) {
  return (
    <div style={{ fontSize: 10, color, marginBottom: 2 }}>
      {text}
    </div>
  );
}
