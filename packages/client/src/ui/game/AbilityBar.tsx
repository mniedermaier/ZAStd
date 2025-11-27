import { useGameStore } from '../../stores/game-store';
import { useUIStore } from '../../stores/ui-store';
import { ABILITY_DEFINITIONS, GOVERNORS } from '@zastd/engine';

interface AbilityBarProps {
  playerId: string;
  onUseAbility: (targetX?: number, targetY?: number) => void;
}

export function AbilityBar({ playerId, onUseAbility }: AbilityBarProps) {
  const snapshot = useGameStore((s) => s.snapshot);
  const abilityTargeting = useUIStore((s) => s.abilityTargeting);
  const startAbilityTargeting = useUIStore((s) => s.startAbilityTargeting);
  const cancelAbilityTargeting = useUIStore((s) => s.cancelAbilityTargeting);

  if (!snapshot) return null;
  const player = snapshot.players[playerId];
  if (!player?.governor) return null;

  const ability = (ABILITY_DEFINITIONS as Record<string, typeof ABILITY_DEFINITIONS[keyof typeof ABILITY_DEFINITIONS]>)[player.governor];
  if (!ability) return null;

  const gov = (GOVERNORS as Record<string, { color: string }>)[player.governor];
  const color = gov?.color ?? '#ffffff';
  const cooldownRemaining = player.abilityCooldownRemaining;
  const onCooldown = cooldownRemaining > 0;
  const isTargeting = abilityTargeting;
  const isBuffActive = player.abilityDamageBuffMult > 1;

  const handleClick = () => {
    if (onCooldown) return;
    if (ability.targetType === 'point_aoe') {
      if (isTargeting) {
        cancelAbilityTargeting();
      } else {
        startAbilityTargeting();
      }
    } else {
      onUseAbility();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(max(8px, env(safe-area-inset-bottom, 0px)) + 56px)',
      right: 'max(8px, env(safe-area-inset-right, 0px))',
      zIndex: 12,
      pointerEvents: 'auto',
    }}>
      <button
        onClick={handleClick}
        disabled={onCooldown}
        title={`${ability.name}: ${ability.description}`}
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: isTargeting
            ? `${color}40`
            : onCooldown
              ? 'rgba(10, 10, 26, 0.7)'
              : 'rgba(10, 10, 26, 0.85)',
          border: `2px solid ${isTargeting ? color : onCooldown ? '#333' : color}`,
          color: onCooldown ? '#666' : color,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'monospace',
          cursor: onCooldown ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {/* Cooldown overlay */}
        {onCooldown && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.min(100, (cooldownRemaining / ability.cooldown) * 100)}%`,
            background: 'rgba(0, 0, 0, 0.5)',
            transition: 'height 0.5s linear',
          }} />
        )}
        {/* Buff indicator */}
        {isBuffActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: color,
            opacity: 0.8,
          }} />
        )}
        <span style={{ fontSize: 14, lineHeight: 1, position: 'relative' }}>
          {ability.targetType === 'point_aoe' ? '\u25CE' : '\u2726'}
        </span>
        <span style={{ fontSize: 8, lineHeight: 1, position: 'relative' }}>
          {onCooldown ? `${Math.ceil(cooldownRemaining)}s` : ability.name.split(' ')[0]}
        </span>
      </button>
    </div>
  );
}
