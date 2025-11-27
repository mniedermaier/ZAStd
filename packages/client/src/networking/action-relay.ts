import { GameState, TowerType, GamePhase } from '@zastd/engine';
import type { ClientAction } from './protocol';

/**
 * Processes client actions on the host's GameState.
 * Returns success/failure for feedback.
 */
export function processAction(gameState: GameState, action: ClientAction): { success: boolean; message?: string } {
  switch (action.type) {
    case 'place_tower': {
      const tower = gameState.placeTower(action.playerId, action.x, action.y, action.towerType as TowerType);
      return tower ? { success: true } : { success: false, message: 'Cannot place tower' };
    }

    case 'sell_tower': {
      const sold = gameState.sellTower(action.playerId, action.towerId);
      return sold ? { success: true } : { success: false, message: 'Cannot sell tower' };
    }

    case 'upgrade_tower': {
      const upgraded = gameState.upgradeTower(action.playerId, action.towerId);
      return upgraded ? { success: true } : { success: false, message: 'Cannot upgrade tower' };
    }

    case 'start_wave': {
      if (!gameState.canManuallyStartWave()) return { success: false, message: 'Cooldown active' };
      const phase = gameState.phase;
      if (phase !== GamePhase.Playing && phase !== GamePhase.WaveComplete) {
        return { success: false, message: 'Cannot start wave now' };
      }
      gameState.lastManualWaveStartTime = Date.now() / 1000;
      gameState.startNextWave();
      return { success: true };
    }

    case 'buy_tech': {
      const player = gameState.players.get(action.playerId);
      if (!player) return { success: false, message: 'Player not found' };
      const bought = player.buyTech(action.techId);
      return bought ? { success: true } : { success: false, message: 'Cannot buy tech' };
    }

    case 'select_governor': {
      const selected = gameState.selectGovernor(action.playerId, action.governor);
      return selected ? { success: true } : { success: false, message: 'Cannot select governor' };
    }

    case 'ready': {
      gameState.setPlayerReady(action.playerId, action.ready);
      return { success: true };
    }

    case 'update_settings': {
      const updated = gameState.updateSettings({
        mapSize: action.mapSize,
        mapLayout: action.mapLayout,
        difficulty: action.difficulty,
        moneySharing: action.moneySharing,
      });
      return updated ? { success: true } : { success: false, message: 'Cannot update settings' };
    }

    case 'use_ability': {
      const used = gameState.useAbility(action.playerId, action.targetX, action.targetY);
      return used ? { success: true } : { success: false, message: 'Ability not ready' };
    }

    case 'chat':
    case 'join_request':
      // Handled separately by room-manager, not via action-relay
      return { success: true };

    default:
      return { success: false, message: 'Unknown action' };
  }
}
