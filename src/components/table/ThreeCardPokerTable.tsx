/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import {
  type ThreeCardSnapshot,
  type ThreeCardPlayerState,
} from '../../game/engine/ThreeCardPokerEngine.ts';
import { sounds } from '../../utils/soundEffects.ts';
import { Play, Sparkles, Award, Coins, Crown, Check } from 'lucide-react';

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
    roundNumber,
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

  const avatarGradients = [
    'from-[#3d2b1f] to-[#1a110b]',
    'from-[#133829] to-[#081b13]',
    'from-[#172a45] to-[#0a1322]',
    'from-[#351b42] to-[#170b1d]',
    'from-[#47161e] to-[#1f080c]',
    'from-[#163642] to-[#09181e]',
  ];

  return (
    <div className="relative w-full max-w-6xl h-full max-h-[86vh] mx-auto select-none p-1 md:p-2 flex items-center justify-center">
      {/* Outer Polished Mahogany Wooden Rail */}
      <div className="relative w-full h-full rounded-[54px] md:rounded-[110px] p-2 md:p-4 mahogany-rail border-2 border-[#542b1c] flex flex-col justify-center">
        {/* Stitched Leather Padded Armrest */}
        <div className="relative w-full h-full rounded-[44px] md:rounded-[96px] p-1 md:p-2.5 leather-armrest border border-[#C5A880]/25 flex flex-col justify-center">
          {/* Main Casino Felt Surface */}
          <div className="relative w-full h-full rounded-[38px] md:rounded-[84px] bg-gradient-to-b from-[#093b23] via-[#062b19] to-[#03170d] casino-felt-surface border-2 border-[#C5A880]/25 overflow-hidden flex flex-col items-center justify-between py-2 px-2 md:py-3 md:px-4">
            {/* Brass Silk-Screened Betting Arc */}
            <div className="absolute inset-3 md:inset-6 rounded-[32px] md:rounded-[72px] border border-[#C5A880]/25 pointer-events-none" />
            <div className="absolute inset-4 md:inset-7 rounded-[30px] md:rounded-[68px] border border-dashed border-[#C5A880]/20 pointer-events-none" />

            {/* TOP FELT SECTION: Dealer Casino Area & Shoe */}
            <div className="relative z-10 flex flex-col items-center shrink-0">
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0b0d10]/85 border border-[#C5A880]/40 text-[10px] md:text-xs font-semibold text-stone-300 backdrop-blur-md shadow-lg">
                <span className="font-serif font-bold text-[#C5A880] tracking-wider uppercase">
                  Дилер казино
                </span>
                <span className="text-stone-400">· Игра от Дамы (Q+)</span>
              </div>

              {/* Dealer Cards with Staggered Dealing & Showdown Flip */}
              <div className="flex items-center gap-2 md:gap-2.5 mt-1.5">
                {dealerCards.length > 0
                  ? dealerCards.map((c, i) => (
                      <div key={`dealer-${roundNumber}-${i}-${dealerRevealed ? 'rev' : 'hid'}`}>
                        <CardComponent
                          card={c}
                          faceDown={!dealerRevealed}
                          size="md"
                          backStyle={backStyle}
                          isWinning={phase === 'ended' && !dealerQualified}
                          dealDelayMs={dealerRevealed ? i * 190 : i * 160}
                          dealFromX={(1 - i) * 24}
                          dealFromY={dealerRevealed ? -12 : -55}
                          playDealSound={i === 0}
                        />
                      </div>
                    ))
                  : Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-11 h-16 md:w-15 md:h-22 rounded-[6px] md:rounded-[9px] border border-[#C5A880]/20 bg-black/25 flex items-center justify-center text-[#C5A880]/30 font-serif text-xs shadow-inner"
                      >
                        ♠
                      </div>
                    ))}
              </div>

              <AnimatePresence>
                {dealerRevealed && dealerHand && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1 text-[11px] font-mono font-bold text-[#F3E5AB] bg-[#0b0d10]/90 px-3 py-0.5 rounded-md border border-[#C5A880]/45 shadow-md"
                  >
                    {dealerHand.name} {!dealerQualified && '· Нет квалификации'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* MULTI-PLAYER SEATS AREA OR SINGLE VIP FELT LAYOUT */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center my-1 px-1 overflow-x-auto overflow-y-hidden max-h-[38vh]">
              {hasMultiplePlayers ? (
                <div className="flex items-center justify-center gap-2.5 md:gap-4 flex-wrap max-w-full">
                  {players.map((p, idx) => {
                    const isMe = p.id === currentPlayerId;
                    const hasCards = p.cards && p.cards.length === 3;
                    const isWinner = (p.payoutSummary?.netProfit || 0) > 0;
                    const isFolded = p.decision === 'fold';

                    return (
                      <motion.div
                        layout
                        key={p.id}
                        className={`relative flex flex-col items-center p-2 md:p-2.5 rounded-2xl border transition-all ${
                          isMe
                            ? 'bg-[#0e1014]/90 border-[#D4AF37]/75 shadow-[0_8px_24px_rgba(0,0,0,0.85)]'
                            : 'bg-[#0b0d10]/75 border-stone-800/90 shadow-md'
                        } ${isFolded ? 'opacity-45 grayscale-[45%]' : 'opacity-100'}`}
                        style={{ minWidth: '136px', maxWidth: '176px' }}
                      >
                        {/* Player Header */}
                        <div className="flex items-center gap-1.5 w-full mb-1">
                          <div
                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${
                              avatarGradients[idx % avatarGradients.length]
                            } border border-[#C5A880]/50 flex items-center justify-center text-[10px] font-serif font-bold text-[#F3E5AB] shadow`}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-stone-100 truncate">
                              <span className="truncate">{p.name}</span>
                              {p.isHost && <Crown className="w-2.5 h-2.5 text-[#D4AF37] shrink-0" />}
                            </div>
                            <div className="text-[10px] font-mono text-[#C5A880] tabular-nums truncate">
                              ${p.chips.toLocaleString()}
                            </div>
                          </div>
                          {isMe && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#C5A880]/20 text-[#F3E5AB] uppercase">
                              Вы
                            </span>
                          )}
                        </div>

                        {/* Player 3 Cards with Staggered Dealing */}
                        <div className="relative flex items-center -space-x-2 my-1">
                          {hasCards
                            ? p.cards.map((c, cIdx) => (
                                <div
                                  key={c.id || `${p.id}-${roundNumber}-${cIdx}`}
                                  className={`transform transition-transform ${
                                    cIdx === 0 ? '-rotate-6' : cIdx === 2 ? 'rotate-6' : ''
                                  }`}
                                >
                                  <CardComponent
                                    card={c}
                                    faceDown={!isMe && phase !== 'ended'}
                                    size="sm"
                                    backStyle={backStyle}
                                    isWinning={phase === 'ended' && isWinner}
                                    dealDelayMs={420 + idx * 140 + cIdx * 165}
                                    dealFromX={0}
                                    dealFromY={-80}
                                    playDealSound={isMe && cIdx === 0}
                                  />
                                </div>
                              ))
                            : Array.from({ length: 3 }).map((_, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="w-8 h-12 rounded border border-[#C5A880]/20 bg-black/25 flex items-center justify-center text-[#C5A880]/25 text-[9px] font-serif"
                                >
                                  ♠
                                </div>
                              ))}
                        </div>

                        {/* Hand Name (visible to owner or at Showdown) */}
                        {p.hand && hasCards && (isMe || phase === 'ended') && (
                          <div className="text-[9px] font-semibold text-[#F3E5AB] truncate max-w-[140px] text-center mb-1">
                            {p.hand.description}
                          </div>
                        )}

                        {/* Betting Spots Summary */}
                        <div className="flex items-center gap-1.5 text-[9px] font-mono bg-black/55 px-2 py-0.5 rounded-md border border-stone-800 mb-1 tabular-nums">
                          <span className="text-[#C5A880]">A:${p.anteBet}</span>
                          {p.pairPlusBet > 0 && <span className="text-amber-300">P+:${p.pairPlusBet}</span>}
                          {p.playBet > 0 && <span className="text-emerald-300">Pl:${p.playBet}</span>}
                        </div>

                        {/* Decision / Outcome Status */}
                        <div className="w-full text-center">
                          {phase === 'betting' && (
                            <span className="text-[10px] text-stone-400">
                              {p.isReady ? (
                                <span className="text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Ставка принята
                                </span>
                              ) : (
                                'Выбирает ставку...'
                              )}
                            </span>
                          )}

                          {phase === 'decision' && (
                            <span>
                              {p.decision === 'waiting' && (
                                <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-200 text-[10px] font-bold border border-amber-700/50">
                                  Принимает решение...
                                </span>
                              )}
                              {p.decision === 'play' && (
                                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 text-[10px] font-bold border border-emerald-700/60">
                                  ИГРАЕТ
                                </span>
                              )}
                              {p.decision === 'fold' && (
                                <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 text-[10px] font-bold border border-rose-800/60">
                                  ПАС
                                </span>
                              )}
                            </span>
                          )}

                          {phase === 'ended' && p.payoutSummary && (
                            <div className="text-[10px] font-mono font-bold tabular-nums">
                              {p.payoutSummary.netProfit > 0 ? (
                                <span className="text-emerald-400">+${p.payoutSummary.totalWon}</span>
                              ) : p.payoutSummary.netProfit < 0 ? (
                                <span className="text-rose-400">
                                  -${Math.abs(p.payoutSummary.netProfit)}
                                </span>
                              ) : (
                                <span className="text-stone-400">Возврат $0</span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Single Player Authentic Casino Felt Spots */
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-4 md:gap-8 my-auto">
                    {/* Paytable Plaque */}
                    <div className="hidden lg:flex flex-col p-2.5 rounded-xl bg-[#0b0d10]/80 border border-[#C5A880]/30 text-[10px] text-stone-300 font-mono space-y-0.5 shadow-lg">
                      <div className="text-[#C5A880] font-serif font-bold pb-1 mb-0.5 border-b border-stone-800 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>Выплаты Pair Plus</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Стрит-Флеш</span>
                        <span className="text-[#F3E5AB] font-bold">40 к 1</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Тройка (Trips)</span>
                        <span className="text-[#F3E5AB] font-bold">30 к 1</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Стрит</span>
                        <span className="text-[#F3E5AB] font-bold">6 к 1</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Флеш</span>
                        <span className="text-[#F3E5AB] font-bold">3 к 1</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Пара</span>
                        <span className="text-[#F3E5AB] font-bold">1 к 1</span>
                      </div>
                    </div>

                    {/* 3 Silk-Screened Casino Betting Spots */}
                    <div className="flex items-center gap-3.5 md:gap-6">
                      {/* Ante Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-13 h-13 md:w-16 md:h-16 rounded-full border-2 border-[#C5A880]/70 bg-black/45 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.75)]">
                          <span className="text-[9px] md:text-[10px] font-serif font-bold text-[#C5A880] uppercase tracking-wider">
                            Ante
                          </span>
                          <span className="font-mono text-xs font-bold text-[#F3E5AB] tabular-nums">
                            ${myPlayer.anteBet}
                          </span>
                        </div>
                        {myPlayer.anteBet > 0 && (
                          <div className="mt-1">
                            <ChipStack amount={myPlayer.anteBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>

                      {/* Pair Plus Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-13 h-13 md:w-16 md:h-16 rotate-45 rounded-xl border-2 border-[#D4AF37]/65 bg-black/45 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.75)]">
                          <div className="-rotate-45 flex flex-col items-center">
                            <span className="text-[8px] md:text-[9px] font-serif font-bold text-[#D4AF37] uppercase leading-none">
                              Pair+
                            </span>
                            <span className="font-mono text-xs font-bold text-[#F3E5AB] mt-0.5 tabular-nums">
                              ${myPlayer.pairPlusBet}
                            </span>
                          </div>
                        </div>
                        {myPlayer.pairPlusBet > 0 && (
                          <div className="mt-1">
                            <ChipStack amount={myPlayer.pairPlusBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>

                      {/* Play Spot */}
                      <div className="flex flex-col items-center">
                        <div className="w-13 h-13 md:w-16 md:h-16 rounded-2xl border-2 border-emerald-400/50 bg-black/45 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.75)]">
                          <span className="text-[9px] md:text-[10px] font-serif font-bold text-emerald-300 uppercase tracking-wider">
                            Play
                          </span>
                          <span className="font-mono text-xs font-bold text-stone-100 tabular-nums">
                            ${myPlayer.playBet > 0 ? myPlayer.playBet : '—'}
                          </span>
                        </div>
                        {myPlayer.playBet > 0 && (
                          <div className="mt-1">
                            <ChipStack amount={myPlayer.playBet} size="xs" showLabel={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Player Cards with Staggered Dealing */}
                  <div className="flex items-center -space-x-2.5 mt-2">
                    {myPlayer.cards.map((c, i) => (
                      <div
                        key={c.id || `my-${roundNumber}-${i}`}
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
                          dealDelayMs={460 + i * 180}
                          dealFromX={(1 - i) * 24}
                          dealFromY={-110}
                          playDealSound={true}
                        />
                      </div>
                    ))}
                  </div>

                  {myPlayer.hand && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 px-3 py-0.5 rounded-full bg-[#0b0d10]/90 border border-[#C5A880]/55 text-[11px] font-semibold text-[#F3E5AB] shadow-md"
                    >
                      {myPlayer.hand.description}
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* LOWER FELT SECTION: INTEGRATED CONTROL CONSOLE DOCK */}
            <div className="relative z-20 w-full max-w-lg shrink-0 mt-1">
              <AnimatePresence>
                {myPlayer.payoutSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1.5 px-3.5 py-1.5 rounded-xl bg-[#0e1014]/95 border border-[#D4AF37] text-[11px] font-bold text-stone-100 shadow-xl max-w-md mx-auto text-center"
                  >
                    <span>{myPlayer.payoutSummary.message}</span>
                    {myPlayer.payoutSummary.totalWon > 0 && (
                      <span className="text-[#F3E5AB] ml-2 font-mono">
                        +${myPlayer.payoutSummary.totalWon}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Integrated Control Console */}
              <div className="w-full bg-[#0b0d10]/90 border border-[#C5A880]/40 rounded-2xl p-2.5 md:p-3 shadow-[0_12px_32px_rgba(0,0,0,0.9)] backdrop-blur-md">
                <div className="flex items-center justify-between text-[11px] pb-1.5 mb-2 border-b border-stone-800/80">
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Coins className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span className="text-stone-300 font-bold">{myPlayer.name}:</span>
                    <span className="font-mono font-bold text-[#F3E5AB] tabular-nums">
                      ${myPlayer.chips.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono tabular-nums">
                    Ставка:{' '}
                    <span className="text-[#C5A880] font-bold">
                      $
                      {phase === 'betting'
                        ? selectedAnte + selectedPairPlus
                        : myPlayer.anteBet + myPlayer.pairPlusBet + myPlayer.playBet}
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
                            className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              selectedAnte === amt
                                ? 'bg-[#2a2112] border-[#D4AF37] text-[#F3E5AB] shadow-sm'
                                : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>

                      {/* Pair Plus Selector */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-[#D4AF37] font-semibold text-[11px] flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Pair+:</span>
                        </span>
                        {[0, 10, 25, 50].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handlePairPlusChange(amt)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              selectedPairPlus === amt
                                ? 'bg-[#2a2112] border-[#D4AF37] text-[#F3E5AB] shadow-sm'
                                : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            {amt === 0 ? '0' : `$${amt}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isHost ? (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playCardSlide();
                          onDeal();
                        }}
                        disabled={myPlayer.chips < selectedAnte + selectedPairPlus}
                        className="w-full min-h-[44px] py-2 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
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
                        <span className="text-stone-300 font-medium">Ваша ставка готова</span>
                        <span className="text-[#C5A880] font-semibold">
                          Ожидание раздачи хостом...
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
                          Сбросить (Fold)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            sounds.playChipsToss();
                            onAction('play', myPlayer.id);
                          }}
                          disabled={myPlayer.chips < myPlayer.anteBet}
                          className="min-h-[44px] py-2.5 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 shadow-[0_0_15px_rgba(197,168,128,0.35)] transition-all cursor-pointer flex items-center justify-center gap-1 text-center disabled:opacity-50"
                        >
                          <span>Играть (${myPlayer.anteBet})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs flex items-center justify-between">
                        <span className="text-stone-300 font-medium">
                          Ваш ход:{' '}
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
                        <span className="text-[#C5A880] text-[11px]">
                          Ожидание остальных игроков...
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
                        Следующая раздача ➔
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-center text-[#C5A880] font-medium">
                        Раздача завершена · Ожидание старта нового раунда хостом
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
