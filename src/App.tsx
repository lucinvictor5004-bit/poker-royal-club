/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { FriendsListModal } from './components/modals/FriendsListModal.tsx';
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
  Users,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'menu' | 'lobby' | 'game'>('menu');

  // Supabase Online Room state
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayerRecord[]>([]);
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
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
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

  // Sync dataset.state with current view
  useEffect(() => {
    document.body.dataset.state = view === 'menu' ? 'title' : 'playing';
  }, [view]);

  // Save current player ID
  useEffect(() => {
    try {
      localStorage.setItem('poker_player_id', currentPlayerId);
    } catch {
      // ignore
    }
  }, [currentPlayerId]);

  // Subscribe to real-time events for active room
  useEffect(() => {
    if (!activeRoom) return;

    const unsubscribe = supabasePoker.subscribe(activeRoom.code, (event: any) => {
      if (!event) return;

      if (event.type === 'PLAYER_JOINED' || event.type === 'PLAYERS_UPDATED') {
        if (event.payload?.players) {
          setRoomPlayers(event.payload.players);
        }
      } else if (event.type === 'GAME_STARTED') {
        const updatedRoom = event.payload?.room || activeRoom;
        setActiveRoom({ ...updatedRoom, status: 'in_game' });
        launchGameForMode(updatedRoom);
      } else if (event.type === 'PLAYER_LEFT') {
        if (event.payload?.players) {
          setRoomPlayers(event.payload.players);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoom?.code]);

  // Initialize or launch game based on room mode
  const launchGameForMode = useCallback(
    (room: RoomRecord) => {
      if (room.mode === 'three_card') {
        const engine = new ThreeCardPokerEngine({
          playerChips: room.startingChips,
          defaultAnte: room.ante || 25,
        });
        threeCardEngineRef.current = engine;
        setThreeCardSnapshot(engine.getSnapshot());
        setView('game');
        setIsVictoryAnim(false);
      } else {
        // Texas Hold'em with real human room players (NO bots!)
        const playersList = supabasePoker.getRoomPlayers(room.code);
        const effectivePlayers = playersList.length > 0 ? playersList : roomPlayers;

        const players: Player[] = effectivePlayers.map((p, idx) => {
          return new Player({
            id: p.id,
            name: p.name,
            isHuman: true,
            chips: p.chips,
            avatarSeed: idx,
          });
        });

        // If host started solo, ensure at least 2 participant seats are prepared for play
        if (players.length < 2) {
          players.push(
            new Player({
              id: 'player_seat_2',
              name: 'Ожидание игрока...',
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
        engine.startNewHand();
        setSnapshot(engine.getSnapshot());
        setView('game');
        setIsVictoryAnim(false);
      }
    },
    [roomPlayers]
  );

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
    const { room, hostPlayer } = await supabasePoker.createRoom(params);
    setCurrentPlayerId(hostPlayer.id);
    setActiveRoom(room);
    setRoomPlayers([hostPlayer]);
    setView('lobby');
  };

  // Join room by code
  const handleJoinByCode = async (
    code: string,
    playerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await supabasePoker.joinRoom(code, playerName);
    if (!res.success || !res.room || !res.player) {
      return { success: false, error: res.error || 'Не удалось войти в комнату' };
    }

    setCurrentPlayerId(res.player.id);
    setActiveRoom(res.room);
    setRoomPlayers(supabasePoker.getRoomPlayers(res.room.code));

    if (res.room.status === 'in_game') {
      launchGameForMode(res.room);
    } else {
      setView('lobby');
    }

    return { success: true };
  };

  // Host starts game from lobby
  const handleHostStartGame = () => {
    if (!activeRoom) return;
    supabasePoker.startGame(activeRoom.code);
    launchGameForMode(activeRoom);
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
    if (!engineRef.current) return;
    setIsVictoryAnim(false);
    engineRef.current.startNewHand();
    setSnapshot(engineRef.current.getSnapshot());
  }, []);

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
    if (!engineRef.current || !snapshot) return;

    const activePlayer = snapshot.players[snapshot.activePlayerIdx];
    if (!activePlayer) return;

    const success = engineRef.current.executeAction(activePlayer.id, action, amount);
    if (success) {
      const nextSnap = engineRef.current.getSnapshot();
      setSnapshot(nextSnap);

      if (action === 'check') sounds.playCheckKnock();
      else if (action === 'fold') sounds.playCardSlide();
      else if (action === 'all-in') sounds.playAllInSound();
      else sounds.playChipsToss();
    }
  };

  // Three Card Poker Handlers
  const handleThreeCardSetBets = (ante: number, pairPlus: number) => {
    if (!threeCardEngineRef.current) return;
    threeCardEngineRef.current.setBets(ante, pairPlus);
    setThreeCardSnapshot(threeCardEngineRef.current.getSnapshot());
  };

  const handleThreeCardDeal = () => {
    if (!threeCardEngineRef.current) return;
    threeCardEngineRef.current.deal();
    setThreeCardSnapshot(threeCardEngineRef.current.getSnapshot());
  };

  const handleThreeCardAction = (action: 'play' | 'fold') => {
    if (!threeCardEngineRef.current) return;
    threeCardEngineRef.current.playerAction(action);
    const snap = threeCardEngineRef.current.getSnapshot();
    setThreeCardSnapshot(snap);

    if (snap.payoutSummary && snap.payoutSummary.netProfit > 0) {
      sounds.playWinFanfare();
      setIsVictoryAnim(true);
    }

    // Record stats
    setStats((prev) => {
      const profit = snap.payoutSummary?.netProfit || 0;
      const isWin = profit > 0;
      const updated: PokerStats = {
        gamesPlayed: prev.gamesPlayed + 1,
        handsWon: isWin ? prev.handsWon + 1 : prev.handsWon,
        largestPotWon: Math.max(prev.largestPotWon, snap.payoutSummary?.totalWon || 0),
        bestHandName: snap.playerHand?.name || prev.bestHandName,
        totalProfit: prev.totalProfit + profit,
      };
      savePokerStats(updated);
      return updated;
    });
  };

  const handleThreeCardNewRound = () => {
    if (!threeCardEngineRef.current) return;
    setIsVictoryAnim(false);
    threeCardEngineRef.current.newRound();
    setThreeCardSnapshot(threeCardEngineRef.current.getSnapshot());
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
  const isMyTurn = Boolean(
    snapshot &&
    snapshot.phase !== 'hand_ended' &&
    snapshot.activePlayerIdx >= 0 &&
    (activePlayer?.id === currentPlayerId || snapshot.players.length === 1 || !activePlayer)
  );

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#0a0b0d] text-stone-200 font-sans overflow-hidden flex flex-col justify-between select-none">
      {/* 60 FPS Subtle Canvas Atmosphere */}
      <AtmosphereCanvas isVictory={isVictoryAnim} />

      {/* VIEW: MAIN MENU */}
      {view === 'menu' && (
        <MainMenu
          onCreateRoom={() => setIsCreateRoomOpen(true)}
          onJoinByCode={() => setIsJoinCodeOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* VIEW: LOBBY ROOM */}
      {view === 'lobby' && activeRoom && (
        <LobbyRoom
          room={activeRoom}
          players={roomPlayers}
          currentPlayerId={currentPlayerId}
          onStartGame={handleHostStartGame}
          onToggleReady={handleToggleReady}
          onLeaveLobby={handleLeaveLobby}
          onOpenFriends={() => setIsFriendsOpen(true)}
        />
      )}

      {/* VIEW: IN-GAME */}
      {view === 'game' && (
        <div className="relative z-20 flex-1 h-full max-h-full flex flex-col justify-between p-2 md:p-3 max-w-7xl mx-auto w-full overflow-hidden">
          {/* Top In-Game Bar with Room Code prominently on top-right */}
          <header className="shrink-0 flex items-center justify-between gap-3 py-1.5 px-3 rounded-2xl bg-[#141518]/90 border border-stone-800/80 backdrop-blur-md">
            {/* Left Zone: Return to menu & Mode name */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sounds.playButtonClick();
                  setView('menu');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#C5A880] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">В меню</span>
              </button>
              <span className="font-serif font-black tracking-wider text-stone-100 text-xs md:text-sm uppercase whitespace-nowrap">
                {activeRoom?.mode === 'three_card' ? 'Трёхкарточный покер' : "Texas Hold'em"}
              </span>
            </div>

            {/* Center Zone: Table stakes / info */}
            <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
              {activeRoom?.mode === 'three_card' ? (
                <>
                  <span className="text-[#C5A880] font-bold">VIP Стол vs Дилер</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-stone-300">
                    Фишки: ${(threeCardSnapshot?.playerChips || 0).toLocaleString()}
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

            {/* Right Zone: Room Code prominent + 2 separate buttons (Join by Code & Friends) + Mute/Settings */}
            <div className="flex items-center gap-2">
              {/* Prominent Room Code Display */}
              {activeRoom && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1a1b22] border border-[#C5A880]/40">
                  <span className="text-[10px] uppercase font-bold text-stone-400 hidden lg:inline">
                    Код:
                  </span>
                  <span className="font-mono text-xs md:text-sm font-bold text-[#C5A880]">
                    {activeRoom.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 rounded text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
                    title="Скопировать код лобби"
                  >
                    {codeCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Distinct Button 1: Enter Code */}
              <button
                type="button"
                onClick={() => setIsJoinCodeOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#C5A880] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
                title="Войти по коду"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="hidden sm:inline">Код</span>
              </button>

              {/* Distinct Button 2: Friends */}
              <button
                type="button"
                onClick={() => setIsFriendsOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#C5A880] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
                title="Список друзей"
              >
                <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="hidden sm:inline">Друзья</span>
              </button>

              {/* Quick Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  const newMuted = !settings.isMuted;
                  sounds.setMuted(newMuted);
                  handleUpdateSettings({ isMuted: newMuted });
                }}
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#C5A880] border border-stone-800 transition-colors cursor-pointer"
                title={settings.isMuted ? 'Включить звук' : 'Без звука'}
              >
                {settings.isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Action Log Drawer for Texas Hold'em */}
              {activeRoom?.mode !== 'three_card' && snapshot && (
                <ActionLogDrawer
                  logs={snapshot.actionLog}
                  handNumber={snapshot.handNumber}
                />
              )}

              {/* Rules Button */}
              <button
                type="button"
                onClick={() => setIsRulesOpen(true)}
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#C5A880] border border-stone-800 transition-colors cursor-pointer"
                title="Правила игры"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-[#C5A880] border border-stone-800 transition-colors cursor-pointer"
                title="Настройки"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* TABLE DISPLAY BASED ON ACTIVE GAME MODE */}
          {activeRoom?.mode === 'three_card' ? (
            /* Three Card Poker Table */
            <main className="relative flex-1 min-h-0 flex items-center justify-center py-1 md:py-2 overflow-hidden">
              {threeCardSnapshot && (
                <ThreeCardPokerTable
                  snapshot={threeCardSnapshot}
                  onSetBets={handleThreeCardSetBets}
                  onDeal={handleThreeCardDeal}
                  onAction={handleThreeCardAction}
                  onNewRound={handleThreeCardNewRound}
                  backStyle={settings.backStyle}
                />
              )}
            </main>
          ) : (
            /* Texas Hold'em Table & Controls (Strictly for real people, NO bots!) */
            <>
              <main className="relative flex-1 min-h-0 flex items-center justify-center py-1 md:py-2 overflow-hidden">
                {snapshot && (
                  <PokerTable
                    players={snapshot.players}
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

              {/* Bottom Texas Hold'em Action Area */}
              <footer className="relative shrink-0 flex items-center justify-center pt-1 pb-2 z-30 w-full max-w-4xl mx-auto px-2">
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
        </div>
      )}

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

      <FriendsListModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        currentRoomCode={activeRoom?.code}
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
