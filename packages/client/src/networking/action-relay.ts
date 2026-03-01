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
        modifiers: action.modifiers,
      });
      return updated ? { success: true } : { success: false, message: 'Cannot update settings' };
    }

    case 'use_ability': {
      const used = gameState.useAbility(action.playerId, action.targetX, action.targetY);
      return used ? { success: true } : { success: false, message: 'Ability not ready' };
    }

    case 'send_creeps': {
      const sent = gameState.sendCreeps(action.playerId, action.enemyType, action.count);
      return sent ? { success: true } : { success: false, message: 'Cannot send creeps' };
    }

    case 'send_gold': {
      const transferred = gameState.sendGold(action.playerId, action.targetPlayerId, action.amount);
      return transferred ? { success: true } : { success: false, message: 'Cannot send gold' };
    }

    case 'gift_tower': {
      const gifted = gameState.giftTower(action.playerId, action.towerId, action.targetPlayerId);
      return gifted ? { success: true } : { success: false, message: 'Cannot gift tower' };
    }

    case 'queue_upgrade': {
      const queued = gameState.queueUpgrade(action.playerId, action.towerId);
      return queued ? { success: true } : { success: false, message: 'Cannot queue upgrade' };
    }

    case 'cancel_queue': {
      const cancelled = gameState.cancelQueuedUpgrade(action.playerId, action.towerId);
      return cancelled ? { success: true } : { success: false, message: 'No queued upgrade' };
    }

    case 'start_vote': {
      const voteId = gameState.startVote(action.playerId, action.voteType as 'send_early' | 'kick', action.targetId);
      return voteId ? { success: true, message: voteId } : { success: false, message: 'Vote already active' };
    }

    case 'cast_vote': {
      const voted = gameState.castVote(action.playerId, action.voteId);
      return voted ? { success: true } : { success: false, message: 'Cannot cast vote' };
    }

    case 'set_targeting': {
      const { TargetingMode } = require('@zastd/engine');
      gameState.setTowerTargeting(action.playerId, action.towerId, action.mode as any);
      return { success: true };
    }

    case 'join_game_request': {
      const player = gameState.addPlayerMidGame(action.playerId, action.playerId, action.governor);
      return player ? { success: true } : { success: false, message: 'Game is full' };
    }

    case 'request_funding': {
      const requested = gameState.requestFunding(action.playerId, action.towerId);
      return requested ? { success: true } : { success: false, message: 'Cannot request funding' };
    }

    case 'contribute_funding': {
      const contributed = gameState.contributeFunding(action.playerId, action.towerId, action.amount);
      return contributed ? { success: true } : { success: false, message: 'Cannot contribute funding' };
    }

    case 'chat':
    case 'join_request':
    case 'spectate_request':
    case 'ping':
    case 'propose_placement':
      // Handled separately by room-manager, not via action-relay
      return { success: true };

    default:
      return { success: false, message: 'Unknown action' };
  }
}
