/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, type DataConnection } from 'peerjs';

/**
 * Online Room & Real-Time Sync Service (PeerJS WebRTC P2P + BroadcastChannel + LocalStorage)
 * Supports cross-device multiplayer on Vercel (PC + Mobile) as well as multi-tab testing.
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

const BROADCAST_NAME = 'supabase_poker_realtime_v1';
const PEER_PREFIX = 'royal-club-poker-v2-';

const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(BROADCAST_NAME)
    : null;

/**
 * Normalizes any user code input:
 * "4821" -> "ROYAL-4821"
 * "royal 4821" -> "ROYAL-4821"
 * "ROYAL4821" -> "ROYAL-4821"
 * "royal-4821" -> "ROYAL-4821"
 */
export function normalizeRoomCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  if (/^\d{4}$/.test(cleaned)) {
    return `ROYAL-${cleaned}`;
  }
  const match = cleaned.match(/^ROYAL[-_]?(\d{4})$/);
  if (match) {
    return `ROYAL-${match[1]}`;
  }
  return cleaned;
}

export class SupabasePokerService {
  private listeners: Map<string, Set<(event: { type: string; payload: any }) => void>> = new Map();
  private pendingJoinResolvers: Map<
    string,
    (res: { success: boolean; room?: RoomRecord; player?: RoomPlayerRecord; players?: RoomPlayerRecord[]; error?: string }) => void
  > = new Map();

  // Host PeerJS state
  private hostPeer: Peer | null = null;
  private hostRoomCode: string | null = null;
  private clientConnections: Set<DataConnection> = new Set();

  // Client PeerJS state
  private clientPeer: Peer | null = null;
  private hostConnection: DataConnection | null = null;

  // In-memory cache of rooms so host always has authoritative copy even if localStorage is restricted
  private memoryRooms: Map<string, RoomRecord> = new Map();
  private memoryPlayers: Map<string, RoomPlayerRecord[]> = new Map();

  constructor() {
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        const { channel, message } = event.data || {};
        if (!channel || !message) return;
        this.handleIncomingNetworkMessage(channel, message, 'broadcast');
      };
    }

    // Listen to storage events across tabs in the same browser
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('room_players_') && e.newValue) {
          const code = e.key.replace('room_players_', '');
          try {
            const players = JSON.parse(e.newValue);
            this.memoryPlayers.set(code, players);
            this.notifyLocalListeners(code, {
              type: 'PLAYERS_UPDATED',
              payload: { players },
            });
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private handleIncomingNetworkMessage(
    channel: string,
    message: { type: string; payload: any },
    source: 'broadcast' | 'peer',
    senderConn?: DataConnection
  ): void {
    // Handle cross-tab or P2P join requests if we are the host of this room
    if (message.type === 'JOIN_ROOM_REQUEST') {
      const room = this.getRoom(channel);
      if (room && this.hostRoomCode === channel) {
        const { playerId, playerName, requestId } = message.payload || {};
        const result = this.processHostJoin(channel, playerId, playerName);

        const responseMsg = {
          type: 'JOIN_ROOM_RESPONSE',
          payload: {
            requestId,
            ...result,
          },
        };

        if (source === 'peer' && senderConn && senderConn.open) {
          senderConn.send({ channel, message: responseMsg });
        }
        if (broadcastChannel) {
          broadcastChannel.postMessage({ channel, message: responseMsg });
        }

        if (result.success && result.room && result.players) {
          this.broadcast(channel, {
            type: 'PLAYER_JOINED',
            payload: {
              room: result.room,
              players: result.players,
              newPlayer: result.player,
            },
          });
        }
      }
      return;
    }

    if (message.type === 'JOIN_ROOM_RESPONSE') {
      const { requestId, success, room, player, players, error } = message.payload || {};
      if (requestId && this.pendingJoinResolvers.has(requestId)) {
        const resolve = this.pendingJoinResolvers.get(requestId)!;
        this.pendingJoinResolvers.delete(requestId);
        if (success && room && players) {
          this.saveRoom(room);
          this.saveRoomPlayers(room.code, players);
        }
        resolve({ success, room, player, players, error });
      }
      return;
    }

    // Keep local room & player caches updated when receiving state updates
    if (message.type === 'PLAYER_JOINED' || message.type === 'PLAYERS_UPDATED' || message.type === 'PLAYER_LEFT') {
      if (message.payload?.room) {
        this.saveRoom(message.payload.room);
      }
      if (message.payload?.players) {
        this.saveRoomPlayers(channel, message.payload.players);
      }
    } else if (message.type === 'GAME_STARTED' && message.payload?.room) {
      this.saveRoom(message.payload.room);
    }

    // If we are the Host and received a message from one PeerJS client, relay it to all other PeerJS clients and BroadcastChannel
    if (this.hostRoomCode === channel && source === 'peer') {
      this.clientConnections.forEach((conn) => {
        if (conn !== senderConn && conn.open) {
          try {
            conn.send({ channel, message });
          } catch {
            // ignore
          }
        }
      });
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ channel, message });
        } catch {
          // ignore
        }
      }
    }

    this.notifyLocalListeners(channel, message);
  }

  private processHostJoin(
    code: string,
    playerId: string,
    playerName: string
  ): { success: boolean; room?: RoomRecord; player?: RoomPlayerRecord; players?: RoomPlayerRecord[]; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { success: false, error: 'Комната с таким кодом не найдена' };
    }

    const currentPlayers = this.getRoomPlayers(code);
    const existing = currentPlayers.find((p) => p.id === playerId);
    if (existing) {
      return { success: true, room, player: existing, players: currentPlayers };
    }

    if (currentPlayers.length >= room.maxPlayers) {
      return { success: false, error: 'В комнате нет свободных мест' };
    }

    const newPlayer: RoomPlayerRecord = {
      id: playerId || `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      roomCode: code,
      name: playerName || `Игрок ${currentPlayers.length + 1}`,
      chips: room.startingChips,
      isHost: false,
      isReady: true,
      seatIndex: currentPlayers.length,
      joinedAt: Date.now(),
    };

    const updatedPlayers = [...currentPlayers, newPlayer];
    this.saveRoomPlayers(code, updatedPlayers);

    return {
      success: true,
      room,
      player: newPlayer,
      players: updatedPlayers,
    };
  }

  /**
   * Generates a 4-digit readable room code like "ROYAL-4821"
   */
  generateRoomCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `ROYAL-${num}`;
  }

  /**
   * Create a new room lobby and register P2P Host
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
    this.cleanupPeers();

    const code = this.generateRoomCode();
    const hostId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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

    this.hostRoomCode = code;
    this.saveRoom(room);
    this.saveRoomPlayers(code, [hostPlayer]);

    // Initialize PeerJS Host so players on any device/network can join by code
    this.setupHostPeer(code);

    this.broadcast(code, {
      type: 'ROOM_CREATED',
      payload: { room, players: [hostPlayer] },
    });

    return { room, hostPlayer };
  }

  private setupHostPeer(code: string): void {
    if (typeof window === 'undefined') return;
    try {
      const peerId = `${PEER_PREFIX}${code}`;
      const peer = new Peer(peerId);
      this.hostPeer = peer;

      peer.on('connection', (conn) => {
        this.clientConnections.add(conn);

        conn.on('data', (data: any) => {
          if (data && data.channel && data.message) {
            this.handleIncomingNetworkMessage(data.channel, data.message, 'peer', conn);
          }
        });

        conn.on('close', () => {
          this.clientConnections.delete(conn);
        });

        conn.on('error', () => {
          this.clientConnections.delete(conn);
        });
      });

      peer.on('error', () => {
        // Fallback to BroadcastChannel/localStorage if PeerJS cloud is unreachable
      });
    } catch {
      // Ignore PeerJS init errors in restricted environments
    }
  }

  /**
   * Get room by code
   */
  getRoom(code: string): RoomRecord | null {
    const normalized = normalizeRoomCode(code);
    if (this.memoryRooms.has(normalized)) {
      return this.memoryRooms.get(normalized)!;
    }
    try {
      const raw = localStorage.getItem(`room_${normalized}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memoryRooms.set(normalized, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Get players in room
   */
  getRoomPlayers(code: string): RoomPlayerRecord[] {
    const normalized = normalizeRoomCode(code);
    try {
      const raw = localStorage.getItem(`room_players_${normalized}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memoryPlayers.set(normalized, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    if (this.memoryPlayers.has(normalized)) {
      return this.memoryPlayers.get(normalized)!;
    }
    return [];
  }

  /**
   * Join a room by code across same browser, BroadcastChannel, or PeerJS WebRTC P2P
   */
  async joinRoom(
    rawCode: string,
    playerName: string
  ): Promise<{ success: boolean; room?: RoomRecord; player?: RoomPlayerRecord; error?: string }> {
    const formattedCode = normalizeRoomCode(rawCode);
    if (!formattedCode) {
      return { success: false, error: 'Введите корректный код комнаты' };
    }

    const playerId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const trimmedName = playerName.trim() || 'Игрок';

    // 1. Check local storage first (instant if same browser)
    const localRoom = this.getRoom(formattedCode);
    if (localRoom) {
      const currentPlayers = this.getRoomPlayers(formattedCode);
      if (currentPlayers.length >= localRoom.maxPlayers) {
        return { success: false, error: 'В комнате нет свободных мест' };
      }

      const newPlayer: RoomPlayerRecord = {
        id: playerId,
        roomCode: formattedCode,
        name: trimmedName,
        chips: localRoom.startingChips,
        isHost: false,
        isReady: true,
        seatIndex: currentPlayers.length,
        joinedAt: Date.now(),
      };

      const updatedPlayers = [...currentPlayers, newPlayer];
      this.saveRoomPlayers(formattedCode, updatedPlayers);

      // Also connect to Host Peer if we are not the host
      if (this.hostRoomCode !== formattedCode) {
        this.connectClientPeerToHost(formattedCode);
      }

      this.broadcast(formattedCode, {
        type: 'PLAYER_JOINED',
        payload: { room: localRoom, players: updatedPlayers, newPlayer },
      });

      return { success: true, room: localRoom, player: newPlayer };
    }

    // 2. Query BroadcastChannel + PeerJS P2P simultaneously for cross-context / cross-device rooms
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return new Promise((resolve) => {
      let settled = false;

      const finish = (result: {
        success: boolean;
        room?: RoomRecord;
        player?: RoomPlayerRecord;
        error?: string;
      }) => {
        if (settled) return;
        settled = true;
        this.pendingJoinResolvers.delete(requestId);
        resolve(result);
      };

      this.pendingJoinResolvers.set(requestId, (res) => {
        finish(res);
      });

      // Try BroadcastChannel first
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({
            channel: formattedCode,
            message: {
              type: 'JOIN_ROOM_REQUEST',
              payload: { requestId, playerId, playerName: trimmedName },
            },
          });
        } catch {
          // ignore
        }
      }

      // Connect via PeerJS P2P to Host across devices/networks
      try {
        if (this.clientPeer) {
          this.clientPeer.destroy();
        }
        const clientPeer = new Peer();
        this.clientPeer = clientPeer;

        clientPeer.on('open', () => {
          if (settled) return;
          const hostPeerId = `${PEER_PREFIX}${formattedCode}`;
          const conn = clientPeer.connect(hostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            if (settled) return;
            conn.send({
              channel: formattedCode,
              message: {
                type: 'JOIN_ROOM_REQUEST',
                payload: { requestId, playerId, playerName: trimmedName },
              },
            });
          });

          conn.on('data', (data: any) => {
            if (data && data.channel && data.message) {
              this.handleIncomingNetworkMessage(data.channel, data.message, 'peer', conn);
            }
          });

          conn.on('error', () => {
            if (!settled) {
              finish({
                success: false,
                error: `Комната ${formattedCode} не найдена. Проверьте код у хоста.`,
              });
            }
          });
        });

        clientPeer.on('error', () => {
          // If PeerJS fails and BroadcastChannel hasn't answered within 1.2s, fail gracefully
          setTimeout(() => {
            if (!settled) {
              finish({
                success: false,
                error: `Комната ${formattedCode} не найдена. Убедитесь, что хост открыл лобби.`,
              });
            }
          }, 1200);
        });
      } catch {
        // Fallback timeout
      }

      // Overall timeout (4.5 seconds for P2P handshake across mobile/desktop networks)
      setTimeout(() => {
        if (!settled) {
          finish({
            success: false,
            error: `Комната ${formattedCode} не найдена или хост не в сети.`,
          });
        }
      }, 4500);
    });
  }

  private connectClientPeerToHost(formattedCode: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.clientPeer) {
        this.clientPeer.destroy();
      }
      const clientPeer = new Peer();
      this.clientPeer = clientPeer;
      clientPeer.on('open', () => {
        const conn = clientPeer.connect(`${PEER_PREFIX}${formattedCode}`, { reliable: true });
        this.hostConnection = conn;
        conn.on('data', (data: any) => {
          if (data && data.channel && data.message) {
            this.handleIncomingNetworkMessage(data.channel, data.message, 'peer', conn);
          }
        });
      });
    } catch {
      // ignore
    }
  }

  /**
   * Toggle player ready status
   */
  toggleReady(code: string, playerId: string): void {
    const normalized = normalizeRoomCode(code);
    const players = this.getRoomPlayers(normalized);
    const updated = players.map((p) => (p.id === playerId ? { ...p, isReady: !p.isReady } : p));
    this.saveRoomPlayers(normalized, updated);

    this.broadcast(normalized, {
      type: 'PLAYERS_UPDATED',
      payload: { players: updated },
    });
  }

  /**
   * Host starts game
   */
  startGame(code: string): void {
    const normalized = normalizeRoomCode(code);
    const room = this.getRoom(normalized);
    if (!room) return;

    room.status = 'in_game';
    this.saveRoom(room);

    const players = this.getRoomPlayers(normalized);

    this.broadcast(normalized, {
      type: 'GAME_STARTED',
      payload: { room, players },
    });
  }

  /**
   * Leave room
   */
  leaveRoom(code: string, playerId: string): void {
    const normalized = normalizeRoomCode(code);
    const room = this.getRoom(normalized);
    if (!room) {
      this.cleanupPeers();
      return;
    }

    const players = this.getRoomPlayers(normalized).filter((p) => p.id !== playerId);
    this.saveRoomPlayers(normalized, players);

    if (players.length === 0) {
      this.memoryRooms.delete(normalized);
      this.memoryPlayers.delete(normalized);
      try {
        localStorage.removeItem(`room_${normalized}`);
        localStorage.removeItem(`room_players_${normalized}`);
      } catch {
        // ignore
      }
    } else if (room.hostId === playerId) {
      players[0].isHost = true;
      room.hostId = players[0].id;
      room.hostName = players[0].name;
      this.saveRoom(room);
      this.saveRoomPlayers(normalized, players);
    }

    this.broadcast(normalized, {
      type: 'PLAYER_LEFT',
      payload: { playerId, players, room },
    });

    this.cleanupPeers();
  }

  private cleanupPeers(): void {
    this.hostRoomCode = null;
    this.clientConnections.forEach((c) => {
      try {
        c.close();
      } catch {
        // ignore
      }
    });
    this.clientConnections.clear();

    if (this.hostPeer) {
      try {
        this.hostPeer.destroy();
      } catch {
        // ignore
      }
      this.hostPeer = null;
    }

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // ignore
      }
      this.hostConnection = null;
    }

    if (this.clientPeer) {
      try {
        this.clientPeer.destroy();
      } catch {
        // ignore
      }
      this.clientPeer = null;
    }
  }

  /**
   * Broadcast in-game real-time event (bets, actions, snapshots)
   */
  broadcastGameEvent(roomCode: string, type: string, payload: unknown): void {
    const normalized = normalizeRoomCode(roomCode);
    this.broadcast(normalized, { type, payload });
  }

  /**
   * Update chip stack of a player in a room
   */
  updatePlayerChips(code: string, playerId: string, newChips: number): void {
    const normalized = normalizeRoomCode(code);
    const players = this.getRoomPlayers(normalized);
    const updated = players.map((p) => (p.id === playerId ? { ...p, chips: newChips } : p));
    this.saveRoomPlayers(normalized, updated);
  }

  /**
   * Subscribe to real-time events for a room
   */
  subscribe(roomCode: string, callback: (event: { type: string; payload: any }) => void): () => void {
    const normalized = normalizeRoomCode(roomCode);
    if (!this.listeners.has(normalized)) {
      this.listeners.set(normalized, new Set());
    }
    this.listeners.get(normalized)!.add(callback);

    return () => {
      const set = this.listeners.get(normalized);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(normalized);
        }
      }
    };
  }

  private notifyLocalListeners(channel: string, message: { type: string; payload: any }): void {
    const set = this.listeners.get(channel);
    if (set) {
      set.forEach((cb) => cb(message));
    }
  }

  private broadcast(channel: string, message: { type: string; payload: any }): void {
    // 1. Local listeners in current tab
    this.notifyLocalListeners(channel, message);

    // 2. Cross-tab BroadcastChannel
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ channel, message });
      } catch {
        // ignore
      }
    }

    // 3. PeerJS WebRTC P2P connections (Host -> Clients or Client -> Host)
    this.clientConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({ channel, message });
        } catch {
          // ignore
        }
      }
    });

    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send({ channel, message });
      } catch {
        // ignore
      }
    }
  }

  private saveRoom(room: RoomRecord): void {
    const normalized = normalizeRoomCode(room.code);
    this.memoryRooms.set(normalized, room);
    try {
      localStorage.setItem(`room_${normalized}`, JSON.stringify(room));
    } catch {
      // ignore
    }
  }

  private saveRoomPlayers(code: string, players: RoomPlayerRecord[]): void {
    const normalized = normalizeRoomCode(code);
    this.memoryPlayers.set(normalized, players);
    try {
      localStorage.setItem(`room_players_${normalized}`, JSON.stringify(players));
    } catch {
      // ignore
    }
  }
}

export const supabasePoker = new SupabasePokerService();
