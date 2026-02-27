import { useState, useEffect, useCallback } from 'react';
import { PhaserGameLazy as PhaserGame } from '../../phaser/PhaserGameLazy';
import { HUD } from './HUD';
import { TowerBuildBar } from './TowerBuildBar';
import { TowerInfoPanel } from './TowerInfoPanel';
import { WaveInfo } from './WaveInfo';
import { TechPanel } from './TechPanel';
import { PlayerListPanel } from './PlayerListPanel';

import { PauseMenu } from './PauseMenu';
import { HelpOverlay } from './HelpOverlay';
import { WaveSummary } from './WaveSummary';
import { WavePreview } from './WavePreview';
import { EventLog } from './EventLog';
import { Minimap } from './Minimap';
import { ChatPanel } from './ChatPanel';
import { MobileTutorial } from './MobileTutorial';
import { OrientationBanner } from './OrientationBanner';
import { AbilityBar } from './AbilityBar';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';
import { useGameStore } from '../../stores/game-store';

import { MobileToolbar, MobilePanel } from './MobileToolbar';
import { MobileDrawer } from './MobileDrawer';

interface GamePageProps {
  playerId: string;
  playerName?: string;
  onPlaceTower: (data: { x: number; y: number; towerType: string }) => void;
  onUpgradeTower: (towerId: string) => void;
  onSellTower: (towerId: string) => void;
  onSetTargeting?: (towerId: string, mode: string) => void;
  onStartWave: () => void;
  onBuyTech: (techId: string) => void;
  onUseAbility?: (targetX?: number, targetY?: number) => void;
  onQuit: () => void;
  onSendChat?: (message: string) => void;
  onPing?: (data: { x: number; y: number; pingType: string }) => void;
  onSendCreeps?: (enemyType: string, count: number) => void;
  onQueueUpgrade?: (towerId: string) => void;
  onCancelQueue?: (towerId: string) => void;
  onSendGold?: (targetPlayerId: string, amount: number) => void;
  onGiftTower?: (towerId: string, targetPlayerId: string) => void;
  onRequestFunding?: (towerId: string) => void;
  onContributeFunding?: (towerId: string, amount: number) => void;
  showChat?: boolean;
  isSolo?: boolean;
  isSpectating?: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && (window.innerWidth <= 600 || window.innerHeight <= 450)
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600 || window.innerHeight <= 450);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export function GamePage({
  playerId, playerName, onPlaceTower, onUpgradeTower, onSellTower, onSetTargeting, onStartWave, onBuyTech, onUseAbility, onQuit,
  onSendChat, onPing, onSendCreeps, onQueueUpgrade, onCancelQueue, onSendGold, onGiftTower, onRequestFunding, onContributeFunding, showChat, isSolo, isSpectating,
}: GamePageProps) {
  const isPaused = useSettingsStore((s) => s.isPaused);
  const showHelp = useSettingsStore((s) => s.showHelp);
  const setIsPaused = useSettingsStore((s) => s.setIsPaused);
  const setShowHelp = useSettingsStore((s) => s.setShowHelp);
  const gameSpeed = useSettingsStore((s) => s.gameSpeed);
  const setGameSpeed = useSettingsStore((s) => s.setGameSpeed);

  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<MobilePanel | null>(null);
  const placementMode = useUIStore((s) => s.placementMode);
  const cancelPlacement = useUIStore((s) => s.cancelPlacement);

  const handleToggle = useCallback((panel: MobilePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const closeDrawer = useCallback(() => setActivePanel(null), []);

  return (
    <div className="game-active" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PhaserGame
        onPlaceTower={onPlaceTower}
        onUseAbility={onUseAbility ? (data) => onUseAbility(data.targetX, data.targetY) : undefined}
        onPing={onPing}
      />

      {/* Top-left column: HUD, player list, tech upgrades */}
      <div style={{
        position: 'absolute', top: 'max(8px, env(safe-area-inset-top, 0px))', left: 'max(8px, env(safe-area-inset-left, 0px))', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        pointerEvents: 'none', maxWidth: 'calc(50% - 120px)',
        maxHeight: 'calc(100% - 80px)', overflow: 'hidden',
      }}>
        <HUD playerId={playerId} onStartWave={onStartWave} />
        <PlayerListPanel playerId={playerId} onSendGold={onSendGold} />
        <TechPanel playerId={playerId} onBuyTech={onBuyTech} />
      </div>

      {/* Top-right column: wave info, wave preview, chat */}
      <div style={{
        position: 'absolute', top: 'max(8px, env(safe-area-inset-top, 0px))', right: 'max(8px, env(safe-area-inset-right, 0px))', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        alignItems: 'flex-end', pointerEvents: 'none',
        maxWidth: 240, maxHeight: 'calc(100% - 100px)',
        overflow: 'hidden',
      }}>
        <WaveInfo onStartWave={onStartWave} />
        {showChat && onSendChat && (
          <ChatPanel playerName={playerName || 'Player'} onSendChat={onSendChat} />
        )}
      </div>

      {/* Mobile action buttons: help + pause (top center-right, avoids HUD and WaveInfo) */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          top: 'max(4px, env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: 6,
        }}>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              width: 32, height: 32, borderRadius: 8, fontSize: 14,
              background: 'rgba(10, 10, 26, 0.85)', border: '1px solid #333366',
              color: '#44bbff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Help"
          >?</button>
          <button
            onClick={() => setIsPaused(true)}
            style={{
              width: 32, height: 32, borderRadius: 8, fontSize: 14,
              background: 'rgba(10, 10, 26, 0.85)', border: '1px solid #333366',
              color: '#aaaacc', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Pause"
          >||</button>
        </div>
      )}

      {/* Mobile cancel placement button */}
      {isMobile && placementMode && (
        <button
          onClick={cancelPlacement}
          style={{
            position: 'absolute',
            top: '50%',
            right: 'max(8px, env(safe-area-inset-right, 0px))',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: 48, height: 48, borderRadius: 24,
            background: 'rgba(255, 68, 102, 0.85)',
            border: '2px solid #ff4466',
            color: '#fff',
            fontSize: 22,
            fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Cancel placement"
        >X</button>
      )}

      {/* Bottom-left column: event log above minimap */}
      <div style={{
        position: 'absolute', bottom: 68, left: 'max(8px, env(safe-area-inset-left, 0px))', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
        pointerEvents: 'none',
      }}>
        <EventLog />
        <Minimap />
      </div>

      {/* Mobile toolbar: above the build bar */}
      {isMobile && (
        <div className="mobile-toolbar-wrapper" style={{
          position: 'absolute',
          bottom: 'calc(max(8px, env(safe-area-inset-bottom, 0px)) + 52px)',
          left: 0,
          right: 0,
          zIndex: 15,
        }}>
          <MobileToolbar playerId={playerId} activePanel={activePanel} onToggle={handleToggle} />
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && activePanel && (
        <MobileDrawer onClose={closeDrawer}>
          {activePanel === 'tech' && <TechPanel playerId={playerId} onBuyTech={onBuyTech} />}
          {activePanel === 'scout' && <WavePreview />}
          {activePanel === 'map' && <Minimap />}
          {activePanel === 'log' && <EventLog />}
          {activePanel === 'players' && <PlayerListPanel playerId={playerId} onSendGold={onSendGold} />}
        </MobileDrawer>
      )}

      {/* Ability bar */}
      {onUseAbility && (
        <AbilityBar playerId={playerId} onUseAbility={onUseAbility} />
      )}

      {/* Spectator bar */}
      {isSpectating && <SpectatorBar />}

      {/* Bottom-center: tower build bar */}
      {!isSpectating && <TowerBuildBar playerId={playerId} />}

      {/* Bottom-right: tower info panel */}
      <TowerInfoPanel
        playerId={playerId}
        onUpgrade={isSpectating ? undefined : onUpgradeTower}
        onSell={isSpectating ? undefined : onSellTower}
        onSetTargeting={isSpectating ? undefined : onSetTargeting}
        onQueueUpgrade={onQueueUpgrade}
        onCancelQueue={onCancelQueue}
        onGiftTower={isSpectating ? undefined : onGiftTower}
        onRequestFunding={isSpectating ? undefined : onRequestFunding}
        onContributeFunding={isSpectating ? undefined : onContributeFunding}
      />

      {/* Centered overlays */}
      <WaveSummary playerId={playerId} />
      {isPaused && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onHelp={() => { setIsPaused(false); setShowHelp(true); }}
          onQuit={() => { setIsPaused(false); onQuit(); }}
          isSolo={isSolo}
        />
      )}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}
      <MobileTutorial />
      <OrientationBanner />
    </div>
  );
}

function SpectatorBar() {
  const snapshot = useGameStore((s) => s.snapshot);
  const spectatorTarget = useUIStore((s) => s.spectatorTarget);
  const spectatorFreeCamera = useUIStore((s) => s.spectatorFreeCamera);
  const setSpectatorTarget = useUIStore((s) => s.setSpectatorTarget);
  const setSpectatorFreeCamera = useUIStore((s) => s.setSpectatorFreeCamera);

  const players = snapshot ? Object.values(snapshot.players) : [];

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    background: active ? 'rgba(255, 170, 68, 0.2)' : 'rgba(10, 10, 26, 0.7)',
    border: active ? '1px solid #ffaa44' : '1px solid #333366',
    color: active ? '#ffaa44' : '#8888aa',
    borderRadius: 4,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{
      position: 'absolute', top: 'max(40px, env(safe-area-inset-top, 0px))', left: '50%',
      transform: 'translateX(-50%)', zIndex: 30,
      display: 'flex', gap: 4, alignItems: 'center',
      padding: '4px 8px', background: 'rgba(10, 10, 26, 0.9)',
      border: '1px solid #ffaa44', borderRadius: 6,
    }}>
      <span style={{ color: '#ffaa44', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginRight: 4 }}>
        SPECTATING
      </span>
      <button
        onClick={() => setSpectatorFreeCamera(true)}
        style={btnStyle(spectatorFreeCamera)}
      >
        Free Cam
      </button>
      {players.map((p) => (
        <button
          key={p.playerId}
          onClick={() => setSpectatorTarget(p.playerId)}
          style={btnStyle(!spectatorFreeCamera && spectatorTarget === p.playerId)}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
