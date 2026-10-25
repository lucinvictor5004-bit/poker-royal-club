/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type NetworkPlayer, type RoomConfig } from './NetworkProtocol.ts';
import { PokerEngine } from '../engine/PokerEngine.ts';
import { Player } from '../engine/Player.ts';

export class RoomManager {
  private rooms: Map<string, { config: RoomConfig; players: NetworkPlayer[]; engine?: PokerEngine }> = new Map();

  createRoom(config: Omit<RoomConfig, 'roomId'>): RoomConfig {
    const roomId = 'room_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    const fullConfig: RoomConfig = {
      ...config,
      roomId,
      inviteCode,
    };

    this.rooms.set(roomId, {
      config: fullConfig,
      players: [],
    });

    return fullConfig;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, player: NetworkPlayer): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Check capacity
    const seatedCount = room.players.filter((p) => !p.isSpectator).length;
    if (!player.isSpectator && seatedCount >= room.config.maxPlayers) {
      player.isSpectator = true; // Auto-downgrade to spectator if table is full
    }

    room.players.push(player);
    return true;
  }

  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.socketId !== socketId);
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  initializeGameEngine(roomId: string): PokerEngine | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const enginePlayers = room.players
      .filter((p) => !p.isSpectator)
      .map(
        (p) =>
          new Player({
            id: p.userId,
            name: p.username,
            isHuman: true,
            chips: p.chips,
            avatarSeed: p.avatarSeed,
          })
      );

    const engine = new PokerEngine({
      smallBlind: room.config.smallBlind,
      bigBlind: room.config.bigBlind,
      players: enginePlayers,
    });

    room.engine = engine;
    return engine;
  }
}

export const roomManager = new RoomManager();
