/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supabase Service & Real-time Room Sync Architecture
 * Designed for PostgreSQL tables:
 * - rooms (code, mode, host_id, host_name, status, small_blind, big_blind, ante, starting_chips)
 * - room_players (room_code, user_id, user_name, chips, is_ready, seat_index)
 */

export type GameMode = 'texas_holdem' | 'three_card';

export interface RoomRecord {
  code: string;
  name: string;
  mode: GameMode;
  hostId: string;
  hostName: string;
  status: 'waiting' | 'in_game';
  smallBlind: number;
  bigBlind: number;
  ante: number;
  startingChips: number;
  maxPlayers: number;
  createdAt: number;
}

export interface RoomPlayerRecord {
  id: string;
  roomCode: string;
  name: string;
  chips: number;
  isHost: boolean;
  isReady: boolean;
  seatIndex: number;
  joinedAt: number;
}

// Local BroadcastChannel for instant cross-tab real-time sync without requiring external keys
const BROADCAST_NAME = 'supabase_poker_realtime_v1';
const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(BROADCAST_NAME)
    : null;

export class SupabasePokerService {
  private listeners: Map<string, Set<(event: { type: string; payload: unknown }) => void>> = new Map();

  constructor() {
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        const { channel, message } = event.data || {};
        if (channel && message) {
          const callbacks = this.listeners.get(channel);
          if (callbacks) {
            callbacks.forEach((cb) => cb(message));
          }
        }
      };
    }
  }

  /**
   * Generates a 4-digit readable room code like "ROYAL-4821"
   */
  generateRoomCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `ROYAL-${num}`;
  }

  /**
   * Create a new room lobby
   */
  async createRoom(params: {
    mode: GameMode;
    hostName: string;
    smallBlind?: number;
    bigBlind?: number;
    ante?: number;
    startingChips?: number;
    maxPlayers?: number;
  }): Promise<{ room: RoomRecord; hostPlayer: RoomPlayerRecord }> {
    const code = this.generateRoomCode();
    const hostId = `user_${Date.now()}`;
    const startingChips = params.startingChips ?? 1000;

    const room: RoomRecord = {
      code,
      name: `VIP Стол ${params.hostName}`,
      mode: params.mode,
      hostId,
      hostName: params.hostName,
      status: 'waiting',
      smallBlind: params.smallBlind ?? 10,
      bigBlind: params.bigBlind ?? 20,
      ante: params.ante ?? 25,
      startingChips,
      maxPlayers: params.mode === 'three_card' ? 7 : (params.maxPlayers ?? 6),
      createdAt: Date.now(),
    };

    const hostPlayer: RoomPlayerRecord = {
      id: hostId,
      roomCode: code,
      name: params.hostName,
      chips: startingChips,
      isHost: true,
      isReady: true,
      seatIndex: 0,
      joinedAt: Date.now(),
    };

    // Save in storage
    this.saveRoom(room);
    this.saveRoomPlayers(code, [hostPlayer]);

    this.broadcast(code, {
      type: 'ROOM_CREATED',
      payload: { room, players: [hostPlayer] },
    });

    return { room, hostPlayer };
  }

  /**
   * Get room by code
   */
  getRoom(code: string): RoomRecord | null {
    try {
      const raw = localStorage.getItem(`room_${code}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Get players in room
   */
  getRoomPlayers(code: string): RoomPlayerRecord[] {
    try {
      const raw = localStorage.getItem(`room_players_${code}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Join a room by code
   */
  async joinRoom(code: string, playerName: string): Promise<{ success: boolean; room?: RoomRecord; player?: RoomPlayerRecord; error?: string }> {
    const formattedCode = code.trim().toUpperCase();
    const room = this.getRoom(formattedCode);

    if (!room) {
      return { success: false, error: 'Комната с таким кодом не найдена' };
    }

    const currentPlayers = this.getRoomPlayers(formattedCode);
    if (currentPlayers.length >= room.maxPlayers) {
      return { success: false, error: 'В комнате нет свободных мест' };
    }

    const playerId = `user_${Date.now()}`;
    const newPlayer: RoomPlayerRecord = {
      id: playerId,
      roomCode: formattedCode,
      name: playerName || `Игрок ${currentPlayers.length + 1}`,
      chips: room.startingChips,
      isHost: false,
      isReady: false,
      seatIndex: currentPlayers.length,
      joinedAt: Date.now(),
    };

    const updatedPlayers = [...currentPlayers, newPlayer];
    this.saveRoomPlayers(formattedCode, updatedPlayers);

    this.broadcast(formattedCode, {
      type: 'PLAYER_JOINED',
      payload: { room, players: updatedPlayers, newPlayer },
    });

    return { success: true, room, player: newPlayer };
  }

  /**
   * Toggle player ready status
   */
  toggleReady(code: string, playerId: string): void {
    const players = this.getRoomPlayers(code);
    const updated = players.map((p) => (p.id === playerId ? { ...p, isReady: !p.isReady } : p));
    this.saveRoomPlayers(code, updated);

    this.broadcast(code, {
      type: 'PLAYERS_UPDATED',
      payload: { players: updated },
    });
  }

  /**
   * Host starts game
   */
  startGame(code: string): void {
    const room = this.getRoom(code);
    if (!room) return;

    room.status = 'in_game';
    this.saveRoom(room);

    this.broadcast(code, {
      type: 'GAME_STARTED',
      payload: { room },
    });
  }

  /**
   * Leave room
   */
  leaveRoom(code: string, playerId: string): void {
    const room = this.getRoom(code);
    if (!room) return;

    const players = this.getRoomPlayers(code).filter((p) => p.id !== playerId);
    this.saveRoomPlayers(code, players);

    if (players.length === 0) {
      localStorage.removeItem(`room_${code}`);
      localStorage.removeItem(`room_players_${code}`);
    } else if (room.hostId === playerId) {
      // Pass host to next player
      players[0].isHost = true;
      room.hostId = players[0].id;
      room.hostName = players[0].name;
      this.saveRoom(room);
      this.saveRoomPlayers(code, players);
    }

    this.broadcast(code, {
      type: 'PLAYER_LEFT',
      payload: { playerId, players },
    });
  }

  /**
   * Broadcast in-game real-time event (bets, actions, snapshots)
   */
  broadcastGameEvent(roomCode: string, type: string, payload: unknown): void {
    this.broadcast(roomCode, { type, payload });
  }

  /**
   * Update chip stack of a player in a room
   */
  updatePlayerChips(code: string, playerId: string, newChips: number): void {
    const players = this.getRoomPlayers(code);
    const updated = players.map((p) => (p.id === playerId ? { ...p, chips: newChips } : p));
    this.saveRoomPlayers(code, updated);
  }

  /**
   * Subscribe to real-time events for a room (Supabase Realtime Channel emulation)
   */
  subscribe(roomCode: string, callback: (event: { type: string; payload: unknown }) => void): () => void {
    if (!this.listeners.has(roomCode)) {
      this.listeners.set(roomCode, new Set());
    }
    this.listeners.get(roomCode)!.add(callback);

    return () => {
      const set = this.listeners.get(roomCode);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(roomCode);
        }
      }
    };
  }

  private broadcast(channel: string, message: { type: string; payload: unknown }): void {
    // Local callbacks
    const set = this.listeners.get(channel);
    if (set) {
      set.forEach((cb) => cb(message));
    }
    // Cross-tab broadcast
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ channel, message });
      } catch {
        // ignore
      }
    }
  }

  private saveRoom(room: RoomRecord): void {
    try {
      localStorage.setItem(`room_${room.code}`, JSON.stringify(room));
    } catch {
      // ignore
    }
  }

  private saveRoomPlayers(code: string, players: RoomPlayerRecord[]): void {
    try {
      localStorage.setItem(`room_players_${code}`, JSON.stringify(players));
    } catch {
      // ignore
    }
  }
}

export const supabasePoker = new SupabasePokerService();
