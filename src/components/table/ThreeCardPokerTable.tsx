/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import {
  type ThreeCardSnapshot,
  type ThreeCardPlayerState,
} from '../../game/engine/ThreeCardPokerEngine.ts';
import { sounds } from '../../utils/soundEffects.ts';
import { Play, Sparkles, Award, Coins, Crown, Check, AlertCircle } from 'lucide-react';

interface ThreeCardPokerTableProps {
  snapshot: ThreeCardSnapshot;
  currentPlayerId?: string;
  isHost?: boolean;
  onSetBets: (ante: number, pairPlus: number, playerId?: string) => void;
  onDeal: () => void;
  onAction: (action: 'play' | 'fold', playerId?: string) => void;
  onNewRound: () => void;
  backStyle?: CardBackStyle;
}

export const ThreeCardPokerTable: React.FC<ThreeCardPokerTableProps> = ({
  snapshot,
  currentPlayerId = 'player_1',
  isHost = true,
  onSetBets,
  onDeal,
  onAction,
  onNewRound,
  backStyle = 'classic-royal',
}) => {
  const {
    phase,
    dealerCards,
    dealerRevealed,
    dealerHand,
    dealerQualified,
    players,
  } = snapshot;

  // Find local player in table state
  const myPlayer =
    players.find((p) => p.id === currentPlayerId) ||
    players[0] ||
    ({
      id: currentPlayerId,
      name: 'Вы',
      chips: 1000,
      isHost: true,
      seatIndex: 0,
      anteBet: 25,
      pairPlusBet: 0,
      playBet: 0,
      cards: [],
      hand: null,
      decision: 'none',
      isReady: false,
      payoutSummary: null,
    } as ThreeCardPlayerState);

  const [selectedAnte, setSelectedAnte] = useState(myPlayer.anteBet || 25);
  const [selectedPairPlus, setSelectedPairPlus] = useState(myPlayer.pairPlusBet || 0);

  // Sync selected bet state with local player
  useEffect(() => {
    if (myPlayer) {
      setSelectedAnte(myPlayer.anteBet || 25);
      setSelectedPairPlus(myPlayer.pairPlusBet || 0);
    }
  }, [myPlayer.id, phase]);

  const handleAnteChange = (val: number) => {
    setSelectedAnte(val);
    sounds.playChipClick();
    onSetBets(val, selectedPairPlus, myPlayer.id);
  };

  const handlePairPlusChange = (val: number) => {
    setSelectedPairPlus(val);
    sounds.playChipClick();
    onSetBets(selectedAnte, val, myPlayer.id);
  };

  const hasMultiplePlayers = players.length > 1;

  // Avatar backgrounds for seats
  const avatarGradients = [
    'from-amber-600 to-yellow-800',
    'from-emerald-600 to-teal-800',
    'from-blue-600 to-indigo-800',
    'from-purple-600 to-fuchsia-900',
    'from-rose-600 to-red-900',
    'from-cyan-600 to-sky-900',
    'from-amber-500 to-orange-700',
  ];

  return (
    <div className="relative w-full max-w-6xl h-full max-h-[86vh] mx-auto select-none p-1 md:p-2 flex items-center justify-center transition-all duration-500 ease-out">
      {/* Outer Polished Mahogany Wooden Rail */}
      <div
        className="relative w-full h-full rounded-[50px] md:rounded-[100px] p-2 md:p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-4 border-amber-950/80 bg-gradient-to-b from-[#241712] via-[#140b07] to-[#0a0503] flex flex-col justify-center"
        style={{
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), inset 0 2px 4px rgba(197, 168, 128, 0.25)',
        }}
      >
        {/* Leather Padded Armrest */}
        <div className="relative w-full h-full rounded-[42px] md:rounded-[88px] p-1 md:p-2 bg-gradient-to-b from-[#18191f] via-[#121316] to-[#0c0d0f] border border-stone-800 flex flex-col justify-center">
          {/* Main Felt Surface (Deep Muted Emerald Felt) */}
          <div className="relative w-full h-full rounded-[36px] md:rounded-[78px] bg-gradient-to-b from-[#08301d] via-[#052416] to-[#03170e] border-2 border-stone-800/80 overflow-hidden flex flex-col items-center justify-between py-1.5 px-2 md:py-3 md:px-4 shadow-[inset_0_0_80px_rgba(0,0,0,0.85)]">
            {/* Subtle Betting Line Arc */}
            <div className="absolute inset-2 md:inset-6 rounded-[30px] md:rounded-[70px] border border-dashed border-emerald-500/20 pointer-events-none" />

            {/* TOP FELT SECTION: Dealer Casino Area */}
            <div className="relative z-10 flex flex-col items-center shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/75 border border-stone-800 text-[10px] md:text-xs font-semibold text-stone-300 backdrop-blur-md shadow-md">
                <span className="text-[#C5A880]">ДИЛЕР КАЗИНО</span>
                <span className="text-stone-400">· Квалификация от Дамы (Q+)</span>
              </div>

              {/* Dealer Cards */}
              <div className="flex items-center gap-2 mt-1.5">
                {dealerCards.length > 0
                  ? dealerCards.map((c, i) => (
                      <div key={i} className="transform transition-transform duration-500">
                        <CardComponent
                          card={c}
                          faceDown={!dealerRevealed}
                          size="md"
                          backStyle={backStyle}
                          isWinning={phase === 'ended' && !dealerQualified}
                        />
                      </div>
                    ))
                  : Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-10 h-14 md:w-12 md:h-16 rounded-md border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-white/20 text-[10px]"
                      >
                        ?
                      </div>
                    ))}
              </div>

              {dealerRevealed && dealerHand && (
                <div className="mt-1 text-[11px] font-mono font-bold text-stone-200 bg-black/70 px-2.5 py-0.5 rounded-md border border-stone-800 shadow">
                  {dealerHand.name} {!dealerQualified && '(Не квалифицирован)'}
                </div>
              )}
            </div>

            {/* MULTI-PLAYER SEATS AREA (FRIENDS AROUND THE TABLE) */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center my-1 px-1 overflow-x-auto overflow-y-hidden max-h-[38vh]">
              {hasMultiplePlayers ? (
                /* Multiple Friends Seated at Table */
                <div className="flex items-center justify-center gap-2.5 md:gap-4 flex-wrap max-w-full">
                  {players.map((p, idx) => {
                    const isMe = p.id === currentPlayerId;
                    const hasCards = p.cards && p.cards.length === 3;
                    const isWinner = (p.payoutSummary?.netProfit || 0) > 0;
                    const isFolded = p.decision === 'fold';

                    return (
                      <div
                        key={p.id}
                        className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all ${
                          isMe
                            ? 'bg-black/60 border-[#C5A880]/60 ring-1 ring-[#C5A880]/30 shadow-lg'
                            : 'bg-black/45 border-stone-800/80'
                        } ${isFolded ? 'opacity-50 grayscale-[40%]' : 'opacity-100'}`}
                        style={{ minWidth: '130px', maxWidth: '170px' }}
                      >
                        {/* Winner Glow */}
                        {isWinner && (
                          <div className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 to-emerald-400/20 rounded-2xl blur-sm pointer-events-none" />
                        )}

                        {/* Player Header: Avatar & Name */}
                        <div className="flex items-center gap-1.5 w-full mb-1">
                          <div
                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${
                              avatarGradients[idx % avatarGradients.length]
                            } flex items-center justify-center text-[10px] font-bold text-white shadow`}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-stone-100 truncate">
                              <span>{p.name}</span>
                              {p.isHost && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] font-mono text-[#C5A880] truncate">
                              ${p.chips.toLocaleString()}
                            </div>
                          </div>
                          {isMe && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#C5A880]/20 text-[#C5A880] uppercase">
                              Вы
                            </span>
                          )}
                        </div>

                        {/* Player 3 Cards */}
                        <div className="relative flex items-center -space-x-2 my-1">
                          {hasCards
                            ? p.cards.map((c, cIdx) => (
                                <div
                                  key={c.id || cIdx}
                                  className={`transform transition-transform ${
                                    cIdx === 0 ? '-rotate-6' : cIdx === 2 ? 'rotate-6' : ''
                                  }`}
                                >
                                  <CardComponent
                                    card={c}
                                    faceDown={false}
                                    size="sm"
                                    backStyle={backStyle}
                                    isWinning={phase === 'ended' && isWinner}
                                  />
                                </div>
                              ))
                            : Array.from({ length: 3 }).map((_, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="w-7 h-10 rounded border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-white/20 text-[9px]"
                                >
                                  -
                                </div>
                              ))}
                        </div>

                        {/* Hand Name */}
                        {p.hand && hasCards && (
                          <div className="text-[9px] font-semibold text-stone-300 truncate max-w-[130px] text-center mb-1">
                            {p.hand.description}
                          </div>
                        )}

                        {/* Betting Spots for this player */}
                        <div className="flex items-center gap-1.5 text-[9px] font-mono bg-black/40 px-1.5 py-0.5 rounded-lg border border-stone-800/80 mb-1">
                          <span className="text-[#C5A880]">A:${p.anteBet}</span>
                          {p.pairPlusBet > 0 && <span className="text-amber-300">P+:${p.pairPlusBet}</span>}
                          {p.playBet > 0 && <span className="text-cyan-300">Pl:${p.playBet}</span>}
                        </div>

                        {/* Status / Decision badge */}
                        <div className="w-full text-center">
                          {phase === 'betting' && (
                            <span className="text-[10px] text-stone-400">
                              {p.isReady ? (
                                <span className="text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Готов
                                </span>
                              ) : (
                                'Ставит...'
                              )}
                            </span>
                          )}

                          {phase === 'decision' && (
                            <span>
                              {p.decision === 'waiting' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[10px] font-bold border border-amber-800/50 animate-pulse">
                                  Думает...
                                </span>
                              )}
                              {p.decision === 'play' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-[10px] font-bold border border-emerald-700/60">
                                  ИГРАЕТ
                                </span>
                              )}
                              {p.decision === 'fold' && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-bold border border-rose-800/60">
                                  СБРОС
                                </span>
                              )}
                            </span>
                          )}

                          {phase === 'ended' && p.payoutSummary && (
                            <div className="text-[10px] font-mono font-bold">
                              {p.payoutSummary.netProfit > 0 ? (
                                <span className="text-emerald-400">
                                  +${p.payoutSummary.totalWon}
                                </span>
                              ) : p.payoutSummary.netProfit < 0 ? (
                                <span className="text-rose-400">
                                  -${Math.abs(p.payoutSummary.netProfit)}
                                </span>
                              ) : (
                                <span className="text-stone-400">Push $0</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Single Player VIP Table Center Display */
                <div className="flex flex-col items-center">
                  {/* Traditional Three Card Poker Spots & Paytable */}
                  <div className="flex items-center justify-center gap-4 md:gap-8 my-auto">
                    {/* Paytable Guide badge */}
                    <div className="hidden lg:flex flex-col p-2 rounded-xl bg-black/60 border border-stone-800 text-[9px] text-stone-400 font-mono space-y-0.5 shadow-md">
                      <div className="text-[#C5A880] font-bold pb-0.5 border-b border-stone-800 flex items-center gap-1">
                        <Award className="w-2.5 h-2.5" />
                        <span>Pair Plus:</span>
                      </div>
                      <div className="flex justify-between gap-2"><span>Стр-Флеш</span><span className="text-stone-200">40:1</span></div>
                      <div className="flex justify-between gap-2"><span>Тройка</span><span className="text-stone-200">30:1</span></div>
                      <div className="flex justify-between gap-2"><span>Стрит</span><span className="text-stone-200">6:1</span></div>
                      <div className="flex justify-between gap-2"><span>Флеш</span><span className="text-stone-200">3:1</span></div>
                      <div className="flex justify-between gap-2"><span>Пара</span><span className="text-stone-200">1:1</span></div>
                    </div>

                    {/* 3 Main Table Betting Spots */}
                    <div className="flex items-center gap-3 md:gap-5">
                      {/* Ante Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-[#C5A880]/60 bg-black/50 flex flex-col items-center justify-center shadow-lg">
                          <span className="text-[9px] md:text-[10px] font-bold text-[#C5A880] uppercase">Ante</span>
                          <span className="font-mono text-[11px] md:text-xs font-bold text-stone-100">${myPlayer.anteBet}</span>
                        </div>
                        {myPlayer.anteBet > 0 && (
                          <div className="mt-0.5">
                            <ChipStack amount={myPlayer.anteBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>

                      {/* Pair Plus Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 rotate-45 rounded-lg border-2 border-dashed border-amber-400/50 bg-black/50 flex flex-col items-center justify-center shadow-lg">
                          <div className="-rotate-45 flex flex-col items-center">
                            <span className="text-[8px] md:text-[9px] font-bold text-amber-300 uppercase leading-none">
                              Pair+
                            </span>
                            <span className="font-mono text-[11px] md:text-xs font-bold text-stone-100 mt-0.5">
                              ${myPlayer.pairPlusBet}
                            </span>
                          </div>
                        </div>
                        {myPlayer.pairPlusBet > 0 && (
                          <div className="mt-0.5">
                            <ChipStack amount={myPlayer.pairPlusBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>

                      {/* Play Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-dashed border-cyan-400/40 bg-black/50 flex flex-col items-center justify-center shadow-lg">
                          <span className="text-[9px] md:text-[10px] font-bold text-cyan-300 uppercase">Play</span>
                          <span className="font-mono text-[11px] md:text-xs font-bold text-stone-100">
                            ${myPlayer.playBet > 0 ? myPlayer.playBet : '—'}
                          </span>
                        </div>
                        {myPlayer.playBet > 0 && (
                          <div className="mt-0.5">
                            <ChipStack amount={myPlayer.playBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Player Cards */}
                  <div className="flex items-center -space-x-2.5 mt-2">
                    {myPlayer.cards.map((c, i) => (
                      <div
                        key={c.id || i}
                        className={`transform transition-transform duration-300 ${
                          i === 0 ? '-rotate-6' : i === 2 ? 'rotate-6' : ''
                        }`}
                      >
                        <CardComponent
                          card={c}
                          faceDown={false}
                          size="md"
                          backStyle={backStyle}
                          isWinning={phase === 'ended' && (myPlayer.payoutSummary?.netProfit || 0) > 0}
                        />
                      </div>
                    ))}
                  </div>

                  {myPlayer.hand && (
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/80 border border-[#C5A880]/50 text-[11px] font-semibold text-[#C5A880] shadow-md">
                      {myPlayer.hand.description}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LOWER FELT SECTION: INTEGRATED CONTROL CONSOLE DOCK */}
            <div className="relative z-20 w-full max-w-lg shrink-0 mt-1">
              {/* Payout Result Banner */}
              {myPlayer.payoutSummary && (
                <div className="mb-1.5 px-3 py-1 rounded-xl bg-stone-950/90 border border-[#C5A880] text-[11px] font-bold text-stone-100 shadow-xl max-w-md mx-auto text-center">
                  <span>{myPlayer.payoutSummary.message}</span>
                  {myPlayer.payoutSummary.totalWon > 0 && (
                    <span className="text-[#C5A880] ml-2 font-mono">
                      +${myPlayer.payoutSummary.totalWon}
                    </span>
                  )}
                </div>
              )}

              {/* INTEGRATED FELT CONTROLS DOCK - STRICTLY POSITIONED ON TABLE FELT */}
              <div className="w-full bg-black/80 border border-[#C5A880]/40 rounded-2xl p-2 md:p-2.5 shadow-2xl backdrop-blur-md">
                {/* Chip Balance & Player Info */}
                <div className="flex items-center justify-between text-[11px] pb-1.5 mb-1.5 border-b border-stone-800/80">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Coins className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span className="text-stone-300 font-bold">{myPlayer.name}:</span>
                    <span className="font-mono font-bold text-stone-100">
                      ${myPlayer.chips.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Ваша ставка:{' '}
                    <span className="text-[#C5A880] font-bold">
                      ${(phase === 'betting' ? selectedAnte + selectedPairPlus : myPlayer.anteBet + myPlayer.pairPlusBet + myPlayer.playBet)}
                    </span>
                  </div>
                </div>

                {phase === 'betting' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Ante Selector */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-stone-300 font-semibold text-[11px]">Ante:</span>
                        {[10, 25, 50, 100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleAnteChange(amt)}
                            className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              selectedAnte === amt
                                ? 'bg-[#2a241b] border-[#C5A880] text-[#C5A880] shadow-sm'
                                : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>

                      {/* Pair Plus Selector */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-amber-300 font-semibold text-[11px] flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Pair+:</span>
                        </span>
                        {[0, 10, 25, 50].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handlePairPlusChange(amt)}
                            className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              selectedPairPlus === amt
                                ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-sm'
                                : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            {amt === 0 ? '0' : `$${amt}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deal / Confirm Button */}
                    {isHost ? (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playCardSlide();
                          onDeal();
                        }}
                        disabled={myPlayer.chips < selectedAnte + selectedPairPlus}
                        className="w-full min-h-[44px] py-2 rounded-xl font-bold text-xs md:text-sm bg-[#C5A880] hover:bg-[#d6bb96] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-stone-950" />
                        <span>
                          {hasMultiplePlayers
                            ? `Раздать карты всем ($${selectedAnte + selectedPairPlus})`
                            : `Раздать карты ($${selectedAnte + selectedPairPlus})`}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900/90 border border-stone-800 text-xs">
                        <span className="text-stone-300 font-medium">Ставки подтверждены</span>
                        <span className="text-amber-400 font-semibold animate-pulse">
                          Ожидание хоста для раздачи...
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {phase === 'decision' && (
                  <div>
                    {myPlayer.decision === 'waiting' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playButtonClick();
                            onAction('fold', myPlayer.id);
                          }}
                          className="min-h-[44px] py-2.5 rounded-xl font-bold text-xs md:text-sm bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 transition-all cursor-pointer text-center"
                        >
                          Сброс (Fold)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sounds.playChipsToss();
                            onAction('play', myPlayer.id);
                          }}
                          disabled={myPlayer.chips < myPlayer.anteBet}
                          className="min-h-[44px] py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#C5A880] hover:bg-[#d6bb96] text-stone-950 shadow-[0_0_15px_rgba(197,168,128,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1 text-center disabled:opacity-50"
                        >
                          <span>Играть (${myPlayer.anteBet})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs flex items-center justify-between">
                        <span className="text-stone-300 font-medium">
                          Ваш выбор:{' '}
                          <span
                            className={
                              myPlayer.decision === 'play'
                                ? 'text-emerald-400 font-bold'
                                : 'text-rose-400 font-bold'
                            }
                          >
                            {myPlayer.decision === 'play'
                              ? `Играть ($${myPlayer.anteBet})`
                              : 'Сброс (Fold)'}
                          </span>
                        </span>
                        <span className="text-amber-300 text-[11px] animate-pulse">
                          Ожидание других игроков...
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {phase === 'ended' && (
                  <div>
                    {isHost ? (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playCardSlide();
                          onNewRound();
                        }}
                        className="w-full min-h-[44px] py-2.5 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 shadow-lg transition-all cursor-pointer text-center"
                      >
                        Следующий раунд ➔
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-center text-amber-300 animate-pulse font-medium">
                        Раунд завершен. Ожидание хоста для следующего раунда...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
