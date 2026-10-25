/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type PlayerActionType } from '../engine/Player.ts';
import { type TableSnapshot } from '../engine/PokerEngine.ts';

/**
 * Socket.IO Multiplayer Protocol Definitions
 * Server-authoritative Texas Hold'em Poker network layer.
 */

export interface NetworkPlayer {
  socketId: string;
  userId: string;
  username: string;
  avatarSeed: number;
  seatIndex: number;
  chips: number;
  isSpectator: boolean;
  reconnectToken: string;
}

export interface RoomConfig {
  roomId: string;
  roomName: string;
  maxPlayers: number; // 2 to 9
  smallBlind: number;
  bigBlind: number;
  turnTimeoutSeconds: number; // e.g. 20s
  isPrivate: boolean;
  inviteCode?: string;
}

// Client -> Server Events
export interface ClientToServerEvents {
  'room:create': (config: Omit<RoomConfig, 'roomId'>, callback: (res: { success: boolean; roomId?: string; error?: string }) => void) => void;
  'room:join': (payload: { roomId: string; inviteCode?: string; username: string; asSpectator?: boolean }, callback: (res: { success: boolean; room?: RoomConfig; error?: string }) => void) => void;
  'room:leave': () => void;
  'game:sit': (seatIndex: number, buyInChips: number, callback: (res: { success: boolean; error?: string }) => void) => void;
  'game:action': (action: { type: PlayerActionType; amount?: number; clientTimestamp: number }) => void;
  'game:showCardsToggle': (show: boolean) => void;
  'chat:send': (message: string) => void;
  'ping:sync': (clientTime: number, callback: (serverTime: number) => void) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  'room:updated': (config: RoomConfig, players: NetworkPlayer[]) => void;
  'game:stateSync': (snapshot: TableSnapshot) => void;
  'game:turnTimer': (playerId: string, remainingSeconds: number, totalSeconds: number) => void;
  'game:playerAction': (playerId: string, action: PlayerActionType, amount: number) => void;
  'game:cardsDealt': (cardCount: number) => void;
  'chat:message': (sender: string, text: string, timestamp: number) => void;
  'error:notification': (error: { code: string; message: string }) => void;
}

/**
 * Authoritative Server Security and Anti-Cheat Validator
 */
export class AntiCheatValidator {
  /**
   * Validate that an action is legal and within the player's bounds.
   */
  static validateAction(
    playerId: string,
    action: PlayerActionType,
    amount: number,
    playerChips: number,
    currentBet: number,
    highestBet: number,
    minRaise: number
  ): { valid: boolean; reason?: string } {
    if (!action) return { valid: false, reason: 'Invalid action' };

    const toCall = highestBet - currentBet;

    if (action === 'check') {
      if (toCall > 0) return { valid: false, reason: 'Cannot check when facing a bet' };
      return { valid: true };
    }

    if (action === 'call') {
      if (toCall <= 0) return { valid: false, reason: 'Nothing to call, must check' };
      return { valid: true };
    }

    if (action === 'bet' || action === 'raise') {
      if (amount <= highestBet) {
        return { valid: false, reason: 'Bet/Raise must be greater than current highest bet' };
      }
      const needed = amount - currentBet;
      if (needed > playerChips) {
        return { valid: false, reason: 'Not enough chips, must declare all-in' };
      }
      return { valid: true };
    }

    if (action === 'all-in') {
      if (playerChips <= 0) return { valid: false, reason: 'No chips to go all-in' };
      return { valid: true };
    }

    if (action === 'fold') {
      return { valid: true };
    }

    return { valid: false, reason: 'Unknown action' };
  }
}
