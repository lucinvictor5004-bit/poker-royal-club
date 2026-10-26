/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, type DataConnection } from 'peerjs';
import mqtt, { type MqttClient } from 'mqtt';
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

/**
 * Multi-Transport Online Room & Real-Time Sync Service
 *
 * Works across ANY network in the world (different cities, mobile 4G/5G, home Wi-Fi, symmetric NATs):
 * 1. Global Cloud WebSocket Relay (MQTT over WSS port 443/8084/8884 — bypasses all NATs & firewalls, zero config)
 * 2. Supabase Realtime Broadcast (automatically active if VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are provided)
 * 3. PeerJS WebRTC DataChannel with STUN + TURN Relay Servers (TCP/TLS 443 & UDP)
 * 4. BroadcastChannel + LocalStorage (instant sync across tabs on the same device)
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

const BROADCAST_NAME = 'supabase_poker_realtime_v3';
const PEER_PREFIX = 'royal-club-poker-v3-';
const MQTT_TOPIC_PREFIX = 'royal-club-poker-v3/room';

const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

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

interface NetworkEnvelope {
  msgId: string;
  senderInstanceId: string;
  channel: string;
  message: {
    type: string;
    payload: any;
  };
  timestamp: number;
}

export class SupabasePokerService {
  private instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  private seenMessageIds: Set<string> = new Set();

  private listeners: Map<string, Set<(event: { type: string; payload: any }) => void>> = new Map();
  private pendingJoinResolvers: Map<
    string,
    (res: {
      success: boolean;
      room?: RoomRecord;
      player?: RoomPlayerRecord;
      players?: RoomPlayerRecord[];
      error?: string;
    }) => void
  > = new Map();

  // Cloud MQTT WebSocket Clients (works across any NAT / Mobile 4G / WAN)
  private mqttClients: MqttClient[] = [];
  private subscribedRooms: Set<string> = new Set();
  private directorySnapshots: Map<
    string,
    { room: RoomRecord; players: RoomPlayerRecord[]; updatedAt: number }
  > = new Map();

  // Optional official Supabase client
  private supabaseClient: SupabaseClient | null = null;
  private supabaseChannels: Map<string, RealtimeChannel> = new Map();

  // Host PeerJS state
  private hostPeer: Peer | null = null;
  private hostRoomCode: string | null = null;
  private clientConnections: Set<DataConnection> = new Set();

  // Client PeerJS state
  private clientPeer: Peer | null = null;
  private hostConnection: DataConnection | null = null;

  // In-memory cache of rooms & players
  private memoryRooms: Map<string, RoomRecord> = new Map();
  private memoryPlayers: Map<string, RoomPlayerRecord[]> = new Map();

  constructor() {
    this.initCloudRelays();
    this.initSupabaseClient();

    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        const env = event.data as NetworkEnvelope;
        if (!env || !env.channel || !env.message) return;
        this.receiveEnvelope(env, 'broadcast');
      };
    }

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

  /**
   * Connects to redundant global MQTT-over-WSS brokers so players on any network
   * (Wi-Fi, 4G/5G cellular, different cities/ISPs) can discover and play together
   * without NAT traversal issues.
   */
  private initCloudRelays(): void {
    if (typeof window === 'undefined') return;

    MQTT_BROKERS.forEach((brokerUrl, idx) => {
      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `rcp_${this.instanceId}_${idx}`,
          clean: true,
          connectTimeout: 5000,
          reconnectPeriod: 3000,
          keepalive: 30,
        });

        client.on('connect', () => {
          // Re-subscribe to any active rooms
          this.subscribedRooms.forEach((code) => {
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${code}/events`, { qos: 1 });
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${code}/directory`, { qos: 1 });
          });

          // If we are hosting a room, publish retained directory state
          if (this.hostRoomCode) {
            this.publishRetainedRoomDirectory(this.hostRoomCode);
          }
        });

        client.on('message', (topic, payloadBuffer) => {
          try {
            const text = payloadBuffer.toString();
            if (!text) return;
            const parsed = JSON.parse(text);

            if (topic.endsWith('/directory')) {
              const { room, players, updatedAt } = parsed || {};
              if (room && room.code && Array.isArray(players)) {
                const code = normalizeRoomCode(room.code);
                const prev = this.directorySnapshots.get(code);
                if (!prev || (updatedAt && updatedAt >= prev.updatedAt)) {
                  this.directorySnapshots.set(code, {
                    room,
                    players,
                    updatedAt: updatedAt || Date.now(),
                  });
                }
              }
              return;
            }

            if (topic.endsWith('/events') && parsed && parsed.channel && parsed.message) {
              this.receiveEnvelope(parsed as NetworkEnvelope, 'mqtt');
            }
          } catch {
            // ignore malformed packet
          }
        });

        client.on('error', () => {
          // Redundant brokers handle failover silently
        });

        this.mqttClients.push(client);
      } catch {
        // ignore broker init error
      }
    });
  }

  private initSupabaseClient(): void {
    try {
      const env = (import.meta as any).env || {};
      const url = env.VITE_SUPABASE_URL;
      const key = env.VITE_SUPABASE_ANON_KEY;
      if (url && key && typeof url === 'string' && typeof key === 'string') {
        this.supabaseClient = createClient(url, key);
      }
    } catch {
      // ignore
    }
  }

  private ensureRoomNetworkSubscription(code: string): void {
    const normalized = normalizeRoomCode(code);
    if (!normalized) return;

    if (!this.subscribedRooms.has(normalized)) {
      this.subscribedRooms.add(normalized);
      this.mqttClients.forEach((client) => {
        try {
          if (client.connected) {
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${normalized}/events`, { qos: 1 });
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${normalized}/directory`, { qos: 1 });
          } else {
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${normalized}/events`, { qos: 1 });
            client.subscribe(`${MQTT_TOPIC_PREFIX}/${normalized}/directory`, { qos: 1 });
          }
        } catch {
          // ignore
        }
      });
    }

    if (this.supabaseClient && !this.supabaseChannels.has(normalized)) {
      try {
        const channel = this.supabaseClient.channel(`poker_room_${normalized}`, {
          config: { broadcast: { self: false } },
        });
        channel
          .on('broadcast', { event: 'room_event' }, ({ payload }) => {
            if (payload && payload.channel && payload.message) {
              this.receiveEnvelope(payload as NetworkEnvelope, 'supabase');
            }
          })
          .subscribe();
        this.supabaseChannels.set(normalized, channel);
      } catch {
        // ignore
      }
    }
  }

  private publishRetainedRoomDirectory(code: string): void {
    const normalized = normalizeRoomCode(code);
    const room = this.getRoom(normalized);
    if (!room) return;
    const players = this.getRoomPlayers(normalized);
    const payload = JSON.stringify({
      room,
      players,
      updatedAt: Date.now(),
    });

    this.mqttClients.forEach((client) => {
      try {
        client.publish(`${MQTT_TOPIC_PREFIX}/${normalized}/directory`, payload, {
          qos: 1,
          retain: true,
        });
      } catch {
        // ignore
      }
    });
  }

  private receiveEnvelope(
    env: NetworkEnvelope,
    source: 'broadcast' | 'peer' | 'mqtt' | 'supabase',
    senderConn?: DataConnection
  ): void {
    if (!env || !env.msgId || !env.channel || !env.message) return;
    if (env.senderInstanceId === this.instanceId) return;
    if (this.seenMessageIds.has(env.msgId)) return;

    this.seenMessageIds.add(env.msgId);
    if (this.seenMessageIds.size > 2000) {
      const first = this.seenMessageIds.values().next().value;
      if (first) this.seenMessageIds.delete(first);
    }

    this.handleIncomingNetworkMessage(env.channel, env.message, source, senderConn);
  }

  private handleIncomingNetworkMessage(
    channel: string,
    message: { type: string; payload: any },
    source: 'broadcast' | 'peer' | 'mqtt' | 'supabase',
    senderConn?: DataConnection
  ): void {
    const normalizedChannel = normalizeRoomCode(channel);

    // 1. Handle remote player JOIN_ROOM_REQUEST if we are the Host of this room
    if (message.type === 'JOIN_ROOM_REQUEST') {
      const room = this.getRoom(normalizedChannel);
      if (room && this.hostRoomCode === normalizedChannel) {
        const { playerId, playerName, requestId } = message.payload || {};
        const result = this.processHostJoin(normalizedChannel, playerId, playerName);

        const responseMsg = {
          type: 'JOIN_ROOM_RESPONSE',
          payload: {
            requestId,
            ...result,
          },
        };

        // Send response over all transports so the requester receives it via whichever path is fastest
        this.sendNetworkEnvelope(normalizedChannel, responseMsg, senderConn);

        if (result.success && result.room && result.players) {
          this.publishRetainedRoomDirectory(normalizedChannel);
          this.broadcast(normalizedChannel, {
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

    // 2. Handle JOIN_ROOM_RESPONSE on the joining client
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

    // 3. Keep local room & player caches updated when receiving state updates
    if (
      message.type === 'PLAYER_JOINED' ||
      message.type === 'PLAYERS_UPDATED' ||
      message.type === 'PLAYER_LEFT'
    ) {
      if (message.payload?.room) {
        this.saveRoom(message.payload.room);
      }
      if (message.payload?.players) {
        this.saveRoomPlayers(normalizedChannel, message.payload.players);
      }
      if (this.hostRoomCode === normalizedChannel) {
        this.publishRetainedRoomDirectory(normalizedChannel);
      }
    } else if (message.type === 'GAME_STARTED' && message.payload?.room) {
      this.saveRoom(message.payload.room);
      if (message.payload?.players) {
        this.saveRoomPlayers(normalizedChannel, message.payload.players);
      }
      if (this.hostRoomCode === normalizedChannel) {
        this.publishRetainedRoomDirectory(normalizedChannel);
      }
    }

    // 4. If we are the Host and received a message from one PeerJS client, relay it
    if (this.hostRoomCode === normalizedChannel && source === 'peer') {
      this.sendNetworkEnvelope(normalizedChannel, message);
    }

    this.notifyLocalListeners(normalizedChannel, message);
  }

  private processHostJoin(
    code: string,
    playerId: string,
    playerName: string
  ): {
    success: boolean;
    room?: RoomRecord;
    player?: RoomPlayerRecord;
    players?: RoomPlayerRecord[];
    error?: string;
  } {
    const normalized = normalizeRoomCode(code);
    const room = this.getRoom(normalized);
    if (!room) {
      return { success: false, error: 'Комната с таким кодом не найдена' };
    }

    const currentPlayers = this.getRoomPlayers(normalized);
    const existing = currentPlayers.find((p) => p.id === playerId);
    if (existing) {
      return { success: true, room, player: existing, players: currentPlayers };
    }

    if (currentPlayers.length >= room.maxPlayers) {
      return { success: false, error: 'В комнате нет свободных мест' };
    }

    const newPlayer: RoomPlayerRecord = {
      id: playerId || `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      roomCode: normalized,
      name: playerName || `Игрок ${currentPlayers.length + 1}`,
      chips: room.startingChips,
      isHost: false,
      isReady: true,
      seatIndex: currentPlayers.length,
      joinedAt: Date.now(),
    };

    const updatedPlayers = [...currentPlayers, newPlayer];
    this.saveRoomPlayers(normalized, updatedPlayers);

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
   * Create a new room lobby and register across Cloud Relay + PeerJS + Supabase
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

    // Subscribe to Cloud WSS Relay & Supabase channel for this room code
    this.ensureRoomNetworkSubscription(code);
    this.publishRetainedRoomDirectory(code);

    // Initialize PeerJS Host with TURN servers as secondary P2P transport
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
      const peer = new Peer(peerId, {
        config: {
          iceServers: ICE_SERVERS,
        },
      });
      this.hostPeer = peer;

      peer.on('connection', (conn) => {
        this.clientConnections.add(conn);

        conn.on('data', (data: any) => {
          if (data && data.channel && data.message) {
            const env: NetworkEnvelope = data.msgId
              ? data
              : {
                  msgId: `peer_${Date.now()}_${Math.random()}`,
                  senderInstanceId: 'remote_peer',
                  channel: data.channel,
                  message: data.message,
                  timestamp: Date.now(),
                };
            this.receiveEnvelope(env, 'peer', conn);
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
        // Cloud WSS Relay (MQTT / Supabase) handles traffic seamlessly if PeerJS fails
      });
    } catch {
      // Ignore PeerJS init errors
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
    if (this.memoryPlayers.has(normalized)) {
      return this.memoryPlayers.get(normalized)!;
    }
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
    return [];
  }

  /**
   * Join a room by code from ANY network (Internet WAN, Mobile 4G/5G, different Wi-Fi, or local tab)
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

    // Ensure we are subscribed to Cloud Relay & Supabase channels for this room code
    this.ensureRoomNetworkSubscription(formattedCode);

    // 1. Check if the room is already cached locally (e.g., same browser)
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

      if (this.hostRoomCode !== formattedCode) {
        this.connectClientPeerToHost(formattedCode);
      }

      this.broadcast(formattedCode, {
        type: 'PLAYER_JOINED',
        payload: { room: localRoom, players: updatedPlayers, newPlayer },
      });

      return { success: true, room: localRoom, player: newPlayer };
    }

    // 2. Query Global Cloud Relay (MQTT over WSS) + Supabase + PeerJS TURN + BroadcastChannel simultaneously
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return new Promise((resolve) => {
      let settled = false;
      let retryInterval: ReturnType<typeof setInterval> | null = null;

      const finish = (result: {
        success: boolean;
        room?: RoomRecord;
        player?: RoomPlayerRecord;
        error?: string;
      }) => {
        if (settled) return;
        settled = true;
        if (retryInterval) clearInterval(retryInterval);
        this.pendingJoinResolvers.delete(requestId);
        resolve(result);
      };

      this.pendingJoinResolvers.set(requestId, (res) => {
        finish(res);
      });

      const sendJoinRequest = () => {
        if (settled) return;
        this.sendNetworkEnvelope(formattedCode, {
          type: 'JOIN_ROOM_REQUEST',
          payload: { requestId, playerId, playerName: trimmedName },
        });
      };

      // Send immediately and retry every 1.1s in case the broker subscription just opened
      sendJoinRequest();
      retryInterval = setInterval(() => {
        sendJoinRequest();

        // Also check if the MQTT retained directory already delivered the room snapshot!
        const dir = this.directorySnapshots.get(formattedCode);
        if (dir && dir.room && !settled) {
          const existingPlayers = dir.players || [];
          if (existingPlayers.length >= dir.room.maxPlayers) {
            finish({ success: false, error: 'В комнате нет свободных мест' });
            return;
          }
          const newPlayer: RoomPlayerRecord = {
            id: playerId,
            roomCode: formattedCode,
            name: trimmedName,
            chips: dir.room.startingChips,
            isHost: false,
            isReady: true,
            seatIndex: existingPlayers.length,
            joinedAt: Date.now(),
          };
          const updatedPlayers = [
            ...existingPlayers.filter((p) => p.id !== playerId),
            newPlayer,
          ];
          this.saveRoom(dir.room);
          this.saveRoomPlayers(formattedCode, updatedPlayers);
          this.broadcast(formattedCode, {
            type: 'PLAYER_JOINED',
            payload: { room: dir.room, players: updatedPlayers, newPlayer },
          });
          finish({ success: true, room: dir.room, player: newPlayer });
        }
      }, 900);

      // Also initiate PeerJS WebRTC connection with TURN servers in parallel
      try {
        if (this.clientPeer) {
          this.clientPeer.destroy();
        }
        const clientPeer = new Peer({
          config: {
            iceServers: ICE_SERVERS,
          },
        });
        this.clientPeer = clientPeer;

        clientPeer.on('open', () => {
          if (settled) return;
          const hostPeerId = `${PEER_PREFIX}${formattedCode}`;
          const conn = clientPeer.connect(hostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            if (settled) return;
            const env: NetworkEnvelope = {
              msgId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              senderInstanceId: this.instanceId,
              channel: formattedCode,
              message: {
                type: 'JOIN_ROOM_REQUEST',
                payload: { requestId, playerId, playerName: trimmedName },
              },
              timestamp: Date.now(),
            };
            conn.send(env);
          });

          conn.on('data', (data: any) => {
            if (data && data.channel && data.message) {
              const env: NetworkEnvelope = data.msgId
                ? data
                : {
                    msgId: `peer_${Date.now()}_${Math.random()}`,
                    senderInstanceId: 'remote_peer',
                    channel: data.channel,
                    message: data.message,
                    timestamp: Date.now(),
                  };
              this.receiveEnvelope(env, 'peer', conn);
            }
          });

          conn.on('error', () => {
            // Do not abort here; Cloud WebSocket Relay (MQTT/Supabase) may still resolve
          });
        });

        clientPeer.on('error', () => {
          // Do not abort here; Cloud WebSocket Relay (MQTT/Supabase) handles WAN traffic
        });
      } catch {
        // Ignore PeerJS init errors
      }

      // Overall timeout (7.5 seconds to allow mobile 4G/5G networks to complete handshake)
      setTimeout(() => {
        if (!settled) {
          finish({
            success: false,
            error: `Комната ${formattedCode} не найдена. Проверьте код и убедитесь, что хост не закрыл вкладку с лобби.`,
          });
        }
      }, 7500);
    });
  }

  private connectClientPeerToHost(formattedCode: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.clientPeer) {
        this.clientPeer.destroy();
      }
      const clientPeer = new Peer({
        config: {
          iceServers: ICE_SERVERS,
        },
      });
      this.clientPeer = clientPeer;
      clientPeer.on('open', () => {
        const conn = clientPeer.connect(`${PEER_PREFIX}${formattedCode}`, { reliable: true });
        this.hostConnection = conn;
        conn.on('data', (data: any) => {
          if (data && data.channel && data.message) {
            const env: NetworkEnvelope = data.msgId
              ? data
              : {
                  msgId: `peer_${Date.now()}_${Math.random()}`,
                  senderInstanceId: 'remote_peer',
                  channel: data.channel,
                  message: data.message,
                  timestamp: Date.now(),
                };
            this.receiveEnvelope(env, 'peer', conn);
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

    if (this.hostRoomCode === normalized) {
      this.publishRetainedRoomDirectory(normalized);
    }

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
    this.publishRetainedRoomDirectory(normalized);

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
      this.directorySnapshots.delete(normalized);
      try {
        localStorage.removeItem(`room_${normalized}`);
        localStorage.removeItem(`room_players_${normalized}`);
      } catch {
        // ignore
      }
      // Clear retained room directory on MQTT brokers
      this.mqttClients.forEach((client) => {
        try {
          client.publish(`${MQTT_TOPIC_PREFIX}/${normalized}/directory`, '', {
            qos: 1,
            retain: true,
          });
        } catch {
          // ignore
        }
      });
    } else if (room.hostId === playerId) {
      players[0].isHost = true;
      room.hostId = players[0].id;
      room.hostName = players[0].name;
      this.saveRoom(room);
      this.saveRoomPlayers(normalized, players);
      this.publishRetainedRoomDirectory(normalized);
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
  subscribe(
    roomCode: string,
    callback: (event: { type: string; payload: any }) => void
  ): () => void {
    const normalized = normalizeRoomCode(roomCode);
    this.ensureRoomNetworkSubscription(normalized);

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

  private sendNetworkEnvelope(
    channel: string,
    message: { type: string; payload: any },
    specificPeerConn?: DataConnection
  ): void {
    const normalized = normalizeRoomCode(channel);
    const env: NetworkEnvelope = {
      msgId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      senderInstanceId: this.instanceId,
      channel: normalized,
      message,
      timestamp: Date.now(),
    };

    this.seenMessageIds.add(env.msgId);

    // 1. Cross-tab BroadcastChannel
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(env);
      } catch {
        // ignore
      }
    }

    // 2. Global Cloud WebSocket Relay (MQTT over WSS — works across any WAN/Mobile/NAT)
    const serialized = JSON.stringify(env);
    this.mqttClients.forEach((client) => {
      try {
        client.publish(`${MQTT_TOPIC_PREFIX}/${normalized}/events`, serialized, { qos: 1 });
      } catch {
        // ignore
      }
    });

    // 3. Official Supabase Realtime Channel (if configured)
    const supaChannel = this.supabaseChannels.get(normalized);
    if (supaChannel) {
      try {
        supaChannel.send({
          type: 'broadcast',
          event: 'room_event',
          payload: env,
        });
      } catch {
        // ignore
      }
    }

    // 4. PeerJS WebRTC P2P connections (with TURN fallback)
    if (specificPeerConn && specificPeerConn.open) {
      try {
        specificPeerConn.send(env);
      } catch {
        // ignore
      }
    } else {
      this.clientConnections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(env);
          } catch {
            // ignore
          }
        }
      });

      if (this.hostConnection && this.hostConnection.open) {
        try {
          this.hostConnection.send(env);
        } catch {
          // ignore
        }
      }
    }
  }

  private broadcast(channel: string, message: { type: string; payload: any }): void {
    const normalized = normalizeRoomCode(channel);
    // 1. Notify local listeners in current tab
    this.notifyLocalListeners(normalized, message);
    // 2. Send across all network transports
    this.sendNetworkEnvelope(normalized, message);
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
