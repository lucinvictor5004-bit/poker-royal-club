/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PokerEngine, type TableSnapshot } from './game/engine/PokerEngine.ts';
import { Player, type PlayerActionType } from './game/engine/Player.ts';
import { ThreeCardPokerEngine, type ThreeCardSnapshot } from './game/engine/ThreeCardPokerEngine.ts';
import { PokerTable } from './components/table/PokerTable.tsx';
import { ThreeCardPokerTable } from './components/table/ThreeCardPokerTable.tsx';
import { ControlPanel } from './components/hud/ControlPanel.tsx';
import { ActionLogDrawer } from './components/hud/ActionLogDrawer.tsx';
import { AtmosphereCanvas } from './components/effects/AtmosphereCanvas.tsx';
import { MainMenu } from './components/menu/MainMenu.tsx';
import { LobbyRoom } from './components/lobby/LobbyRoom.tsx';
import { CreateRoomModal } from './components/modals/CreateRoomModal.tsx';
import { JoinByCodeModal } from './components/modals/JoinByCodeModal.tsx';
import { RulesModal } from './components/modals/RulesModal.tsx';
import {
  StatsModal,
  loadPokerStats,
  savePokerStats,
  type PokerStats,
} from './components/modals/StatsModal.tsx';
import {
  SettingsModal,
  type GameSettings,
} from './components/modals/SettingsModal.tsx';
import {
  supabasePoker,
  type RoomRecord,
  type RoomPlayerRecord,
  type GameMode,
} from './services/supabase.ts';
import { sounds } from './utils/soundEffects.ts';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Settings as SettingsIcon,
  Home,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');
  const viewRef = useRef<'menu' | 'lobby' | 'game'>('menu');

  // Online Room state
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRecord[]>([]);
  const roomPlayersRef = useRef<RoomPlayerRecord[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>(() => {
    try {
      return localStorage.getItem('poker_player_id') || `user_${Date.now()}`;
    } catch {
      return `user_${Date.now()}`;
    }
  });

  // Modals state
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Stats state
  const [stats, setStats] = useState<PokerStats>(loadPokerStats);

  // Settings state
  const [settings, setSettings] = useState<GameSettings>({
    volume: sounds.getVolume(),
    isMuted: sounds.getMuted(),
    feltColor: 'emerald',
    backStyle: 'classic-royal',
    animSpeed: 'normal',
    showTrainingOdds: true,
  });

  // Texas Hold'em Engine instance
  const engineRef = useRef<PokerEngine | null>(null);
  const [snapshot, setSnapshot] = useState<TableSnapshot | null>(null);
  const [isVictoryAnim, setIsVictoryAnim] = useState(false);

  // Three Card Poker Engine instance
  const threeCardEngineRef = useRef<ThreeCardPokerEngine | null>(null);
  const [threeCardSnapshot, setThreeCardSnapshot] = useState<ThreeCardSnapshot | null>(null);

  // Keep refs in sync so event listeners never read stale state or force re-subscriptions
  useEffect(() => {
    viewRef.current = view;
    document.body.dataset.state = view === 'menu' ? 'title' : 'playing';
  }, [view]);

  useEffect(() => {
    roomPlayersRef.current = roomPlayers;
  }, [roomPlayers]);

  // Save current player ID
  useEffect(() => {
    try {
      localStorage.setItem('poker_player_id', currentPlayerId);
    } catch {
      // ignore
    }
  }, [currentPlayerId]);

  // Initialize or launch game based on room mode
  const launchGameForMode = useCallback(
    (room: RoomRecord, explicitPlayers?: RoomPlayerRecord[]) => {
      const playersFromService = supabasePoker.getRoomPlayers(room.code);
      const playersList =
        explicitPlayers && explicitPlayers.length >= playersFromService.length
          ? explicitPlayers
          : playersFromService;
      const effectivePlayers =
        playersList.length > 0 ? playersList : roomPlayersRef.current;
      const isHost = room.hostId === currentPlayerId;

      if (room.mode === 'three_card') {
        if (!threeCardEngineRef.current) {
          const engine = new ThreeCardPokerEngine({
            players: effectivePlayers.map((p, idx) => ({
              id: p.id,
              name: p.name,
              chips: p.chips,
              isHost: p.isHost ?? idx === 0,
              seatIndex: idx,
            })),
            startingChips: room.startingChips,
            defaultAnte: room.ante || 25,
          });
          threeCardEngineRef.current = engine;
        } else {
          threeCardEngineRef.current.syncRoomPlayers(effectivePlayers);
        }

        const snap = threeCardEngineRef.current.getSnapshot();
        setThreeCardSnapshot(snap);
        setView('game');
        viewRef.current = 'game';
        setIsVictoryAnim(false);

        if (isHost) {
          supabasePoker.broadcastGameEvent(room.code, 'THREE_CARD_SYNC_STATE', { snapshot: snap });
        } else {
          supabasePoker.broadcastGameEvent(room.code, 'REQUEST_STATE_SYNC', {
            requesterId: currentPlayerId,
          });
          setTimeout(() => {
            supabasePoker.broadcastGameEvent(room.code, 'REQUEST_STATE_SYNC', {
              requesterId: currentPlayerId,
            });
          }, 600);
        }
      } else {
        // Texas Hold'em with real human room players (NO bots!)
        if (!engineRef.current) {
          const players: Player[] = effectivePlayers.map((p, idx) => {
            return new Player({
              id: p.id,
              name: p.name,
              isHuman: true,
              chips: p.chips,
              avatarSeed: idx,
            });
          });

          if (players.length < 2) {
            players.push(
              new Player({
                id: 'player_seat_2',
                name: 'Игрок 2',
                isHuman: true,
                chips: room.startingChips,
                avatarSeed: 1,
              })
            );
          }

          const engine = new PokerEngine({
            smallBlind: room.smallBlind,
            bigBlind: room.bigBlind,
            players,
          });

          engineRef.current = engine;
          if (isHost) {
            engine.startNewHand();
            const snap = engine.getSnapshot();
            setSnapshot(snap);
            supabasePoker.broadcastGameEvent(room.code, 'TEXAS_SYNC_STATE', { snapshot: snap });
          } else {
            setSnapshot(engine.getSnapshot());
            supabasePoker.broadcastGameEvent(room.code, 'REQUEST_STATE_SYNC', {
              requesterId: currentPlayerId,
            });
            setTimeout(() => {
              supabasePoker.broadcastGameEvent(room.code, 'REQUEST_STATE_SYNC', {
                requesterId: currentPlayerId,
              });
            }, 600);
          }
        } else {
          engineRef.current.syncRoomPlayers(effectivePlayers);
          setSnapshot(engineRef.current.getSnapshot());
        }

        setView('game');
        viewRef.current = 'game';
        setIsVictoryAnim(false);
      }
    },
    [currentPlayerId]
  );

  // Subscribe to real-time events for active room
  useEffect(() => {
    if (!activeRoom) return;

    const unsubscribe = supabasePoker.subscribe(activeRoom.code, (event: any) => {
      if (!event) return;
      const isHost = activeRoom.hostId === currentPlayerId;

      if (event.type === 'REQUEST_STATE_SYNC') {
        if (isHost) {
          if (activeRoom.mode === 'three_card' && threeCardEngineRef.current) {
            supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
              snapshot: threeCardEngineRef.current.getSnapshot(),
            });
          } else if (activeRoom.mode !== 'three_card' && engineRef.current) {
            supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', {
              snapshot: engineRef.current.getSnapshot(),
            });
          }
        }
      } else if (event.type === 'PLAYER_JOINED' || event.type === 'PLAYERS_UPDATED') {
        const incomingPlayers = event.payload?.players;
        if (incomingPlayers) {
          setRoomPlayers(incomingPlayers);
          roomPlayersRef.current = incomingPlayers;

          if (threeCardEngineRef.current && activeRoom.mode === 'three_card') {
            threeCardEngineRef.current.syncRoomPlayers(incomingPlayers);
            const snap = threeCardEngineRef.current.getSnapshot();
            setThreeCardSnapshot(snap);
            if (isHost) {
              supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
                snapshot: snap,
              });
            }
          } else if (engineRef.current && activeRoom.mode !== 'three_card') {
            const changed = engineRef.current.syncRoomPlayers(incomingPlayers);
            if (changed) {
              const snap = engineRef.current.getSnapshot();
              setSnapshot(snap);
              if (isHost) {
                supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', {
                  snapshot: snap,
                });
              }
            }
          }
        }

        // If the updated room payload shows the game has already started, immediately transition from lobby to game!
        if (event.payload?.room?.status === 'in_game' && viewRef.current !== 'game') {
          const startedRoom: RoomRecord = { ...event.payload.room, status: 'in_game' };
          setActiveRoom(startedRoom);
          launchGameForMode(startedRoom, incomingPlayers);
        }
      } else if (event.type === 'GAME_STARTED') {
        const updatedRoom: RoomRecord = {
          ...(event.payload?.room || activeRoom),
          status: 'in_game',
        };
        const playersFromEvent = event.payload?.players;
        if (playersFromEvent) {
          setRoomPlayers(playersFromEvent);
          roomPlayersRef.current = playersFromEvent;
        }
        setActiveRoom(updatedRoom);
        if (viewRef.current !== 'game') {
          launchGameForMode(updatedRoom, playersFromEvent);
        }
      } else if (event.type === 'PLAYER_LEFT') {
        if (event.payload?.players) {
          setRoomPlayers(event.payload.players);
          roomPlayersRef.current = event.payload.players;
          if (threeCardEngineRef.current && activeRoom.mode === 'three_card') {
            threeCardEngineRef.current.syncRoomPlayers(event.payload.players);
            setThreeCardSnapshot(threeCardEngineRef.current.getSnapshot());
          }
        }
      } else if (event.type === 'THREE_CARD_SYNC_STATE') {
        if (event.payload?.snapshot) {
          // If the guest is still in the lobby when THREE_CARD_SYNC_STATE arrives, initialize engine and enter game immediately!
          if (!threeCardEngineRef.current) {
            const effectivePlayers =
              event.payload.snapshot.players?.length > 0
                ? event.payload.snapshot.players
                : roomPlayersRef.current;
            threeCardEngineRef.current = new ThreeCardPokerEngine({
              players: effectivePlayers.map((p: any, idx: number) => ({
                id: p.id,
                name: p.name,
                chips: p.chips,
                isHost: p.isHost ?? idx === 0,
                seatIndex: idx,
              })),
              startingChips: activeRoom.startingChips,
              defaultAnte: activeRoom.ante || 25,
            });
          }
          threeCardEngineRef.current.applySnapshot(event.payload.snapshot);
          setThreeCardSnapshot(threeCardEngineRef.current.getSnapshot());
          if (viewRef.current !== 'game') {
            setActiveRoom((prev) => (prev ? { ...prev, status: 'in_game' } : prev));
            setView('game');
            viewRef.current = 'game';
          }
        }
      } else if (event.type === 'THREE_CARD_SET_BET') {
        if (isHost && threeCardEngineRef.current) {
          threeCardEngineRef.current.setBets(
            event.payload.ante,
            event.payload.pairPlus,
            event.payload.playerId
          );
          const snap = threeCardEngineRef.current.getSnapshot();
          setThreeCardSnapshot(snap);
          supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
            snapshot: snap,
          });
        }
      } else if (event.type === 'THREE_CARD_ACTION') {
        if (isHost && threeCardEngineRef.current) {
          threeCardEngineRef.current.playAction(event.payload.action, event.payload.playerId);
          const snap = threeCardEngineRef.current.getSnapshot();
          setThreeCardSnapshot(snap);
          snap.players.forEach((p) => {
            supabasePoker.updatePlayerChips(activeRoom.code, p.id, p.chips);
          });
          supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
            snapshot: snap,
          });
        }
      } else if (event.type === 'THREE_CARD_DEAL') {
        if (isHost && threeCardEngineRef.current) {
          threeCardEngineRef.current.deal();
          const snap = threeCardEngineRef.current.getSnapshot();
          setThreeCardSnapshot(snap);
          supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
            snapshot: snap,
          });
        }
      } else if (event.type === 'THREE_CARD_NEW_ROUND') {
        if (isHost && threeCardEngineRef.current) {
          threeCardEngineRef.current.newRound();
          const snap = threeCardEngineRef.current.getSnapshot();
          setThreeCardSnapshot(snap);
          supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', {
            snapshot: snap,
          });
        }
      } else if (event.type === 'TEXAS_SYNC_STATE') {
        if (event.payload?.snapshot) {
          const hydrated = PokerEngine.hydrateSnapshot(event.payload.snapshot);
          if (!engineRef.current) {
            engineRef.current = new PokerEngine({
              smallBlind: hydrated.smallBlind,
              bigBlind: hydrated.bigBlind,
              players: hydrated.players,
            });
          }
          engineRef.current.applySnapshot(hydrated);
          setSnapshot(engineRef.current.getSnapshot());
          if (viewRef.current !== 'game') {
            setActiveRoom((prev) => (prev ? { ...prev, status: 'in_game' } : prev));
            setView('game');
            viewRef.current = 'game';
          }
        }
      } else if (event.type === 'TEXAS_ACTION') {
        if (isHost && engineRef.current) {
          const { playerId, action, amount } = event.payload;
          const ok = engineRef.current.executeAction(playerId, action, amount);
          if (ok) {
            const snap = engineRef.current.getSnapshot();
            setSnapshot(snap);
            snap.players.forEach((p) => {
              supabasePoker.updatePlayerChips(activeRoom.code, p.id, p.chips);
            });
            supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', {
              snapshot: snap,
            });
          }
        }
      } else if (event.type === 'TEXAS_NEW_HAND') {
        if (isHost && engineRef.current) {
          engineRef.current.startNewHand();
          const snap = engineRef.current.getSnapshot();
          setSnapshot(snap);
          supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', {
            snapshot: snap,
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoom?.code, activeRoom?.hostId, activeRoom?.mode, currentPlayerId, launchGameForMode]);

  // Safety check in lobby: if room status in service becomes 'in_game', transition immediately
  useEffect(() => {
    if (view !== 'lobby' || !activeRoom) return;
    const interval = setInterval(() => {
      const latestRoom = supabasePoker.getRoom(activeRoom.code);
      const latestPlayers = supabasePoker.getRoomPlayers(activeRoom.code);
      if (latestPlayers.length > 0) {
        setRoomPlayers(latestPlayers);
      }
      if (latestRoom && latestRoom.status === 'in_game' && viewRef.current === 'lobby') {
        setActiveRoom(latestRoom);
        launchGameForMode(latestRoom, latestPlayers);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [view, activeRoom, launchGameForMode]);

  // Host creates room
  const handleCreateRoom = async (params: {
    mode: GameMode;
    hostName: string;
    smallBlind?: number;
    bigBlind?: number;
    ante?: number;
    startingChips?: number;
    maxPlayers?: number;
  }) => {
    engineRef.current = null;
    threeCardEngineRef.current = null;
    setSnapshot(null);
    setThreeCardSnapshot(null);

    const { room, hostPlayer } = await supabasePoker.createRoom(params);
    setCurrentPlayerId(hostPlayer.id);
    setActiveRoom(room);
    setRoomPlayers([hostPlayer]);
    roomPlayersRef.current = [hostPlayer];
    setView('lobby');
  };

  // Join room by code
  const handleJoinByCode = async (
    code: string,
    playerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    engineRef.current = null;
    threeCardEngineRef.current = null;
    setSnapshot(null);
    setThreeCardSnapshot(null);

    const res = await supabasePoker.joinRoom(code, playerName);
    if (!res.success || !res.room || !res.player) {
      return { success: false, error: res.error || 'Не удалось войти в комнату' };
    }

    setCurrentPlayerId(res.player.id);
    setActiveRoom(res.room);
    const updatedPlayers = supabasePoker.getRoomPlayers(res.room.code);
    setRoomPlayers(updatedPlayers);
    roomPlayersRef.current = updatedPlayers;

    if (res.room.status === 'in_game') {
      launchGameForMode(res.room, updatedPlayers);
    } else {
      setView('lobby');
    }

    return { success: true };
  };

  // Host starts game from lobby
  const handleHostStartGame = () => {
    if (!activeRoom) return;
    const startedRoom: RoomRecord = { ...activeRoom, status: 'in_game' };
    setActiveRoom(startedRoom);
    const latestPlayers = supabasePoker.getRoomPlayers(activeRoom.code);
    const effectivePlayers = latestPlayers.length >= roomPlayers.length ? latestPlayers : roomPlayers;
    launchGameForMode(startedRoom, effectivePlayers);
    supabasePoker.startGame(activeRoom.code);
  };

  // Toggle ready status
  const handleToggleReady = () => {
    if (!activeRoom) return;
    supabasePoker.toggleReady(activeRoom.code, currentPlayerId);
    setRoomPlayers(supabasePoker.getRoomPlayers(activeRoom.code));
  };

  // Leave lobby
  const handleLeaveLobby = () => {
    if (activeRoom) {
      supabasePoker.leaveRoom(activeRoom.code, currentPlayerId);
    }
    engineRef.current = null;
    threeCardEngineRef.current = null;
    setActiveRoom(null);
    setRoomPlayers([]);
    setView('menu');
  };

  // Copy Room Code helper
  const handleCopyCode = async () => {
    if (!activeRoom) return;
    sounds.playButtonClick();
    try {
      await navigator.clipboard.writeText(activeRoom.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Next Hand in Texas Hold'em
  const handleNextHand = useCallback(() => {
    setIsVictoryAnim(false);
    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;
    if (isHost && engineRef.current) {
      engineRef.current.startNewHand();
      const snap = engineRef.current.getSnapshot();
      setSnapshot(snap);
      if (activeRoom) {
        supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', { snapshot: snap });
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_NEW_HAND', {});
    }
  }, [activeRoom, currentPlayerId]);

  // Texas Hold'em Hand Ended Statistics recording
  useEffect(() => {
    if (!snapshot || snapshot.phase !== 'hand_ended') return;

    const myPlayer = snapshot.players.find((p) => p.id === currentPlayerId) || snapshot.players[0];
    const isWinner = snapshot.winnerPlayerIds.includes(myPlayer?.id || '');

    if (isWinner) {
      sounds.playWinFanfare();
      setIsVictoryAnim(true);
    }

    setStats((prev) => {
      const gamesPlayed = prev.gamesPlayed + 1;
      const handsWon = isWinner ? prev.handsWon + 1 : prev.handsWon;
      const totalPotWon = isWinner
        ? snapshot.lastPayouts
            .filter((p) => p.playerId === myPlayer?.id)
            .reduce((sum, p) => sum + p.amount, 0)
        : 0;

      const largestPotWon = Math.max(prev.largestPotWon, totalPotWon);
      const bestHandPayout = snapshot.lastPayouts.find((p) => p.playerId === myPlayer?.id && p.hand);
      const bestHandName = bestHandPayout?.hand?.name || prev.bestHandName;

      const profitDelta = isWinner
        ? totalPotWon - (myPlayer?.totalHandBet || 0)
        : -(myPlayer?.totalHandBet || 0);

      const updated: PokerStats = {
        gamesPlayed,
        handsWon,
        largestPotWon,
        bestHandName,
        totalProfit: prev.totalProfit + profitDelta,
      };

      savePokerStats(updated);
      return updated;
    });
  }, [snapshot?.phase]);

  // Texas Hold'em Player Action handler
  const handleHumanAction = (action: PlayerActionType, amount: number = 0) => {
    if (!snapshot) return;

    const activePlayer = snapshot.players[snapshot.activePlayerIdx];
    if (!activePlayer) return;

    if (action === 'check') sounds.playCheckKnock();
    else if (action === 'fold') sounds.playCardSlide();
    else if (action === 'all-in') sounds.playAllInSound();
    else sounds.playChipsToss();

    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;
    if (isHost && engineRef.current) {
      const success = engineRef.current.executeAction(activePlayer.id, action, amount);
      if (success) {
        const nextSnap = engineRef.current.getSnapshot();
        setSnapshot(nextSnap);
        if (activeRoom) {
          nextSnap.players.forEach((p) => {
            supabasePoker.updatePlayerChips(activeRoom.code, p.id, p.chips);
          });
          supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_SYNC_STATE', { snapshot: nextSnap });
        }
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'TEXAS_ACTION', {
        playerId: activePlayer.id,
        action,
        amount,
      });
    }
  };

  // Three Card Poker Handlers
  const handleThreeCardSetBets = (ante: number, pairPlus: number, playerId?: string) => {
    const targetId = playerId || currentPlayerId;
    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;

    if (isHost && threeCardEngineRef.current) {
      threeCardEngineRef.current.setBets(ante, pairPlus, targetId);
      const snap = threeCardEngineRef.current.getSnapshot();
      setThreeCardSnapshot(snap);
      if (activeRoom) {
        supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', { snapshot: snap });
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SET_BET', {
        playerId: targetId,
        ante,
        pairPlus,
      });
    }
  };

  const handleThreeCardDeal = () => {
    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;
    if (isHost && threeCardEngineRef.current) {
      threeCardEngineRef.current.deal();
      const snap = threeCardEngineRef.current.getSnapshot();
      setThreeCardSnapshot(snap);
      if (activeRoom) {
        supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', { snapshot: snap });
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_DEAL', {});
    }
  };

  const handleThreeCardAction = (action: 'play' | 'fold', playerId?: string) => {
    const targetId = playerId || currentPlayerId;
    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;

    if (isHost && threeCardEngineRef.current) {
      threeCardEngineRef.current.playAction(action, targetId);
      const snap = threeCardEngineRef.current.getSnapshot();
      setThreeCardSnapshot(snap);

      if (activeRoom) {
        snap.players.forEach((p) => {
          supabasePoker.updatePlayerChips(activeRoom.code, p.id, p.chips);
        });
        supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', { snapshot: snap });
      }

      const myP = snap.players.find((p) => p.id === currentPlayerId);
      if (myP?.payoutSummary && myP.payoutSummary.netProfit > 0) {
        sounds.playWinFanfare();
        setIsVictoryAnim(true);
      }

      // Record stats for local player
      if (myP?.payoutSummary) {
        setStats((prev) => {
          const profit = myP.payoutSummary?.netProfit || 0;
          const isWin = profit > 0;
          const updated: PokerStats = {
            gamesPlayed: prev.gamesPlayed + 1,
            handsWon: isWin ? prev.handsWon + 1 : prev.handsWon,
            largestPotWon: Math.max(prev.largestPotWon, myP.payoutSummary?.totalWon || 0),
            bestHandName: myP.hand?.name || prev.bestHandName,
            totalProfit: prev.totalProfit + profit,
          };
          savePokerStats(updated);
          return updated;
        });
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_ACTION', {
        playerId: targetId,
        action,
      });
    }
  };

  const handleThreeCardNewRound = () => {
    setIsVictoryAnim(false);
    const isHost = activeRoom?.hostId === currentPlayerId || !activeRoom;
    if (isHost && threeCardEngineRef.current) {
      threeCardEngineRef.current.newRound();
      const snap = threeCardEngineRef.current.getSnapshot();
      setThreeCardSnapshot(snap);
      if (activeRoom) {
        supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_SYNC_STATE', { snapshot: snap });
      }
    } else if (activeRoom) {
      supabasePoker.broadcastGameEvent(activeRoom.code, 'THREE_CARD_NEW_ROUND', {});
    }
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetStats = () => {
    const emptyStats: PokerStats = {
      gamesPlayed: 0,
      handsWon: 0,
      largestPotWon: 0,
      bestHandName: '—',
      totalProfit: 0,
    };
    savePokerStats(emptyStats);
    setStats(emptyStats);
  };

  // Find active player for Texas Hold'em
  const activePlayer = snapshot?.players[snapshot.activePlayerIdx] || null;
  const realHumanCount = snapshot?.players.filter((p) => p.id !== 'player_seat_2').length || 0;
  const isMyTurn = Boolean(
    snapshot &&
      snapshot.phase !== 'hand_ended' &&
      snapshot.activePlayerIdx >= 0 &&
      (activePlayer?.id === currentPlayerId ||
        (realHumanCount <= 1 && activePlayer?.id === 'player_seat_2'))
  );

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#0a0b0d] text-stone-200 font-sans overflow-hidden flex flex-col justify-between select-none">
      {/* 60 FPS Subtle Canvas Atmosphere */}
      <AtmosphereCanvas isVictory={isVictoryAnim} />

      <AnimatePresence mode="wait">
        {/* VIEW: MAIN MENU */}
        {view === 'menu' && (
          <motion.div
            key="view-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 w-full h-full"
          >
            <MainMenu
              onCreateRoom={() => setIsCreateRoomOpen(true)}
              onJoinByCode={() => setIsJoinCodeOpen(true)}
              onOpenRules={() => setIsRulesOpen(true)}
              onOpenStats={() => setIsStatsOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </motion.div>
        )}

        {/* VIEW: LOBBY ROOM */}
        {view === 'lobby' && activeRoom && (
          <motion.div
            key="view-lobby"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 w-full h-full"
          >
            <LobbyRoom
              room={activeRoom}
              players={roomPlayers}
              currentPlayerId={currentPlayerId}
              onStartGame={handleHostStartGame}
              onToggleReady={handleToggleReady}
              onLeaveLobby={handleLeaveLobby}
            />
          </motion.div>
        )}

        {/* VIEW: IN-GAME */}
        {view === 'game' && (
          <motion.div
            key="view-game"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 flex-1 h-full max-h-full flex flex-col justify-between p-1.5 sm:p-2 md:p-3 max-w-7xl mx-auto w-full overflow-hidden"
          >
            {/* Top In-Game Bar with Room Code prominently on top-right */}
            <header className="shrink-0 flex items-center justify-between gap-1.5 sm:gap-3 py-1.5 px-2.5 sm:px-3 rounded-2xl bg-[#111318]/90 border border-[#C5A880]/25 backdrop-blur-md shadow-xl">
              {/* Left Zone: Return to menu & Mode name */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playButtonClick();
                    handleLeaveLobby();
                  }}
                  className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#F3E5AB] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">В меню</span>
                </button>
                <span className="font-serif font-bold tracking-wider text-[#F3E5AB] text-[11px] sm:text-xs md:text-sm uppercase truncate">
                  {activeRoom?.mode === 'three_card' ? '3-Card Poker' : "Texas Hold'em"}
                </span>
              </div>

              {/* Center Zone: Table stakes / info */}
              <div className="hidden md:flex items-center gap-2 text-xs text-stone-400 font-mono tabular-nums">
                {activeRoom?.mode === 'three_card' ? (
                  <>
                    <span className="text-[#C5A880] font-bold">VIP Стол vs Дилер</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-stone-300">
                      Фишки: $
                      {(
                        threeCardSnapshot?.players?.find((p) => p.id === currentPlayerId)?.chips ??
                        threeCardSnapshot?.playerChips ??
                        0
                      ).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-stone-300 font-bold">Раздача #{snapshot?.handNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#C5A880]">
                      Блайнды ${snapshot?.smallBlind}/${snapshot?.bigBlind}
                    </span>
                  </>
                )}
              </div>

              {/* Right Zone: Room Code prominent + Enter Code + Mute/Settings */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {activeRoom && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#181a22] hover:bg-[#222530] border border-[#C5A880]/40 transition-colors cursor-pointer"
                    title="Нажмите, чтобы скопировать код комнаты"
                  >
                    <span className="text-[10px] uppercase font-bold text-stone-400 hidden lg:inline">
                      Код:
                    </span>
                    <span className="font-mono text-xs md:text-sm font-bold text-[#F3E5AB]">
                      {activeRoom.code}
                    </span>
                    {codeCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#C5A880]" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsJoinCodeOpen(true)}
                  className="min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#F3E5AB] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
                  title="Войти по коду"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span className="hidden sm:inline">Код</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newMuted = !settings.isMuted;
                    sounds.setMuted(newMuted);
                    handleUpdateSettings({ isMuted: newMuted });
                  }}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#F3E5AB] border border-stone-800 transition-colors cursor-pointer"
                  title={settings.isMuted ? 'Включить звук' : 'Без звука'}
                >
                  {settings.isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {activeRoom?.mode !== 'three_card' && snapshot && (
                  <ActionLogDrawer logs={snapshot.actionLog} handNumber={snapshot.handNumber} />
                )}

                <button
                  type="button"
                  onClick={() => setIsRulesOpen(true)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#F3E5AB] border border-stone-800 transition-colors cursor-pointer"
                  title="Правила игры"
                >
                  <BookOpen className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#F3E5AB] border border-stone-800 transition-colors cursor-pointer"
                  title="Настройки"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* TABLE DISPLAY BASED ON ACTIVE GAME MODE */}
            {activeRoom?.mode === 'three_card' ? (
              <main className="relative flex-1 min-h-0 flex items-center justify-center py-1 md:py-2 overflow-hidden">
                {threeCardSnapshot && (
                  <ThreeCardPokerTable
                    snapshot={threeCardSnapshot}
                    currentPlayerId={currentPlayerId}
                    isHost={activeRoom?.hostId === currentPlayerId || !activeRoom}
                    onSetBets={handleThreeCardSetBets}
                    onDeal={handleThreeCardDeal}
                    onAction={handleThreeCardAction}
                    onNewRound={handleThreeCardNewRound}
                    backStyle={settings.backStyle}
                  />
                )}
              </main>
            ) : (
              <>
                <main className="relative flex-1 min-h-0 flex items-center justify-center py-1 md:py-2 overflow-hidden">
                  {snapshot && (
                    <PokerTable
                      players={snapshot.players}
                      currentPlayerId={currentPlayerId}
                      communityCards={snapshot.communityCards}
                      totalPot={snapshot.totalPot}
                      pots={snapshot.pots}
                      activePlayerIdx={snapshot.activePlayerIdx}
                      dealerIdx={snapshot.dealerIdx}
                      sbIdx={snapshot.sbIdx}
                      bbIdx={snapshot.bbIdx}
                      winnerPlayerIds={snapshot.winnerPlayerIds}
                      winnerDescriptions={snapshot.winnerDescriptions}
                      feltColor={settings.feltColor}
                      backStyle={settings.backStyle}
                    />
                  )}
                </main>

                <footer className="relative shrink-0 flex items-center justify-center pt-1 pb-1.5 z-30 w-full max-w-4xl mx-auto px-1.5 sm:px-2">
                  <div className="w-full z-30">
                    {snapshot && (
                      <ControlPanel
                        player={activePlayer}
                        isMyTurn={isMyTurn}
                        highestBet={snapshot.highestBet}
                        minRaise={snapshot.minRaise}
                        totalPot={snapshot.totalPot}
                        bigBlind={snapshot.bigBlind}
                        onAction={handleHumanAction}
                        onNextHand={handleNextHand}
                        isHandEnded={snapshot.phase === 'hand_ended'}
                      />
                    )}
                  </div>
                </footer>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreateRoom={handleCreateRoom}
      />

      <JoinByCodeModal
        isOpen={isJoinCodeOpen}
        onClose={() => setIsJoinCodeOpen(false)}
        onJoinByCode={handleJoinByCode}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        onResetStats={handleResetStats}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
