import { useState, useRef, useEffect } from 'react';
import { TowerType, TOWER_DEFINITIONS, GOVERNORS, COMMON_TOWERS, getRegularTowers, getAvailableTowers } from '@zastd/engine';
import { useUIStore } from '../../stores/ui-store';
import { useGameStore } from '../../stores/game-store';

interface TowerBuildBarProps {
  playerId: string;
}

const TOWER_DISPLAY_NAMES: Record<string, string> = {
  arrow: 'Arrow', cannon: 'Cannon', frost_trap: 'Frost',
  fire_arrow: 'F.Arrow', inferno: 'Inferno', meteor: 'Meteor', volcano: 'Volcano',
  ice_shard: 'Ice', blizzard: 'Blizzard', glacier: 'Glacier', avalanche: 'Avalanche',
  spark: 'Spark', lightning: 'Lightning', storm: 'Storm', tempest: 'Tempest',
  venom: 'Venom', plague: 'Plague', miasma: 'Miasma', pandemic: 'Pandemic',
  soul_drain: 'Soul', necrosis: 'Necrosis', wraith: 'Wraith', reaper: 'Reaper',
  thorn: 'Thorn', entangle: 'Entangle', decay: 'Decay', world_tree: 'W.Tree',
  arcane_bolt: 'Arcane', mana_drain: 'M.Drain', rift: 'Rift', singularity: 'Singular',
  smite: 'Smite', aura_tower: 'Aura', divine: 'Divine', seraph: 'Seraph',
};

function getTowerAbilityText(stats: typeof TOWER_DEFINITIONS[TowerType]): string {
  const parts: string[] = [];
  parts.push(`${stats.damageType === 'magic' ? 'Magic' : 'Physical'} dmg`);
  if (stats.splashRadius > 0) parts.push(`Splash ${stats.splashRadius.toFixed(1)}`);
  if (stats.chainCount > 0) parts.push(`Chain ${stats.chainCount}`);
  if (stats.stunDuration > 0) parts.push(`Stun ${stats.stunDuration}s`);
  if (stats.slowDuration > 0) parts.push(`Slow ${(stats.slowAmount * 100).toFixed(0)}%`);
  if (stats.poisonDamage > 0) parts.push(`Poison ${stats.poisonDamage}/s`);
  if (stats.executeThreshold > 0) parts.push(`Execute <${(stats.executeThreshold * 100).toFixed(0)}%`);
  if (stats.teleportDistance > 0) parts.push(`Teleport`);
  if (stats.armorReduction > 0) parts.push(`-${stats.armorReduction} armor`);
  if (stats.auraRange > 0) parts.push(`Aura +${(stats.auraDamageBoost * 100).toFixed(0)}% dmg`);
  return parts.join(' | ');
}

const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function TowerBuildBar({ playerId }: TowerBuildBarProps) {
  const { startPlacement, placementMode, selectedTowerType, cancelPlacement } = useUIStore();
  const snapshot = useGameStore((s) => s.snapshot);
  const [hoveredTower, setHoveredTower] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkScroll = () => {
      setShowLeftFade(el.scrollLeft > 4);
      setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, []);

  if (!snapshot) return null;
  const player = snapshot.players[playerId];
  if (!player) return null;

  const governor = player.governor;
  const available = governor
    ? (player.ultimateUnlocked ? getAvailableTowers(governor) : getRegularTowers(governor))
    : [...COMMON_TOWERS];

  const govColor = governor ? GOVERNORS[governor]?.color : '#888899';
  const isTouch = isTouchDevice();

  // Info strip for the selected tower (shown on mobile when in placement mode)
  const selectedStats = selectedTowerType ? TOWER_DEFINITIONS[selectedTowerType as TowerType] : null;
  const selectedIsGov = selectedTowerType && governor && GOVERNORS[governor]?.towerTypes.includes(selectedTowerType);

  return (
    <div className="tower-build-bar" style={{
      position: 'absolute',
      bottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      padding: '6px 10px',
      background: 'rgba(10, 10, 26, 0.9)',
      borderRadius: 8,
      border: '1px solid #333366',
      zIndex: 10,
      maxWidth: '100vw',
      overflow: 'hidden',
    }}>
      {/* Mobile info strip: shows selected tower stats above the buttons */}
      {isTouch && placementMode && selectedStats && (
        <div style={{
          padding: '4px 6px',
          marginBottom: 4,
          fontSize: 10,
          color: '#e0e0f0',
          borderBottom: '1px solid #333366',
          textAlign: 'center',
        }}>
          <span style={{ fontWeight: 700, color: selectedIsGov ? govColor : '#e0e0f0' }}>
            {TOWER_DISPLAY_NAMES[selectedTowerType!] || selectedTowerType}
          </span>
          {' — '}
          <span style={{ color: '#8888aa' }}>
            Dmg: {selectedStats.damage} | Rng: {selectedStats.range} | Rate: {selectedStats.fireRate.toFixed(1)}/s
          </span>
          {' '}
          <span style={{ color: selectedStats.damageType === 'magic' ? '#cc88ff' : '#ffaa88' }}>
            {getTowerAbilityText(selectedStats)}
          </span>
        </div>
      )}
      {/* Left scroll fade */}
      {showLeftFade && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, zIndex: 1,
          background: 'linear-gradient(to right, rgba(10, 10, 26, 0.9), transparent)',
          pointerEvents: 'none', borderRadius: '8px 0 0 8px',
        }} />
      )}
      {/* Right scroll fade */}
      {showRightFade && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 20, zIndex: 1,
          background: 'linear-gradient(to left, rgba(10, 10, 26, 0.9), transparent)',
          pointerEvents: 'none', borderRadius: '0 8px 8px 0',
        }} />
      )}
      <div ref={scrollRef} style={{
        display: 'flex', gap: 4, overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
      {available.map((tt, idx) => {
        const towerType = tt as TowerType;
        const stats = TOWER_DEFINITIONS[towerType];
        if (!stats) return null;
        const isSelected = placementMode && selectedTowerType === towerType;
        const canAfford = player.money >= Math.floor(stats.cost * (1 - (player.bonuses.costReduction ?? 0)));
        const isGovernor = governor && GOVERNORS[governor]?.towerTypes.includes(tt);
        const isHovered = hoveredTower === tt;

        return (
          <div key={tt} style={{ position: 'relative' }}
            onMouseEnter={isTouch ? undefined : () => setHoveredTower(tt)}
            onMouseLeave={isTouch ? undefined : () => setHoveredTower(null)}
          >
            <button
              onClick={() => isSelected ? cancelPlacement() : startPlacement(towerType)}
              disabled={!canAfford}
              style={{
                padding: '6px 8px',
                minWidth: 56,
                fontSize: 11,
                border: isSelected ? `2px solid ${govColor}` : '1px solid #333366',
                background: isSelected ? 'rgba(68, 187, 255, 0.15)' : 'rgba(26, 26, 58, 0.9)',
                color: canAfford ? (isGovernor ? govColor : '#e0e0f0') : '#555577',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
              }}
            >
              {isGovernor && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 6, height: 6, borderRadius: '50%',
                  background: govColor, opacity: canAfford ? 0.9 : 0.3,
                }} />
              )}
              <span style={{ fontWeight: 600 }}>{TOWER_DISPLAY_NAMES[tt] || tt}</span>
              <span style={{ fontSize: 10, color: '#ffdd44' }}>
                {Math.floor(stats.cost * (1 - (player.bonuses.costReduction ?? 0)))}g
              </span>
              {!isTouch && <span style={{ fontSize: 8, color: '#8888aa' }}>[{idx + 1}]</span>}
            </button>
            {/* Desktop-only hover tooltip */}
            {!isTouch && isHovered && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 6,
                padding: '8px 10px',
                background: 'rgba(10, 10, 26, 0.95)',
                border: '1px solid #44bbff',
                borderRadius: 6,
                fontSize: 10,
                color: '#e0e0f0',
                whiteSpace: 'nowrap',
                zIndex: 20,
                pointerEvents: 'none',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 3, color: isGovernor ? govColor : '#e0e0f0' }}>
                  {TOWER_DISPLAY_NAMES[tt] || tt}
                </div>
                <div style={{ color: '#8888aa', marginBottom: 2 }}>
                  Dmg: {stats.damage} | Range: {stats.range} | Rate: {stats.fireRate.toFixed(1)}/s
                </div>
                <div style={{ color: stats.damageType === 'magic' ? '#cc88ff' : '#ffaa88' }}>
                  {getTowerAbilityText(stats)}
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
