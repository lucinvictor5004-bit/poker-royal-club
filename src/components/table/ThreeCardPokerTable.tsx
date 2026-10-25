/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import { type ThreeCardSnapshot } from '../../game/engine/ThreeCardPokerEngine.ts';
import { sounds } from '../../utils/soundEffects.ts';
import { Play, Sparkles, Award, Coins } from 'lucide-react';

interface ThreeCardPokerTableProps {
  snapshot: ThreeCardSnapshot;
  onSetBets: (ante: number, pairPlus: number) => void;
  onDeal: () => void;
  onAction: (action: 'play' | 'fold') => void;
  onNewRound: () => void;
  backStyle?: CardBackStyle;
}

export const ThreeCardPokerTable: React.FC<ThreeCardPokerTableProps> = ({
  snapshot,
  onSetBets,
  onDeal,
  onAction,
  onNewRound,
  backStyle = 'classic-royal',
}) => {
  const {
    phase,
    playerCards,
    dealerCards,
    dealerRevealed,
    anteBet,
    pairPlusBet,
    playBet,
    playerChips,
    playerHand,
    dealerHand,
    dealerQualified,
    payoutSummary,
  } = snapshot;

  const [selectedAnte, setSelectedAnte] = useState(anteBet);
  const [selectedPairPlus, setSelectedPairPlus] = useState(pairPlusBet);

  const handleAnteChange = (val: number) => {
    setSelectedAnte(val);
    sounds.playChipClick();
    onSetBets(val, selectedPairPlus);
  };

  const handlePairPlusChange = (val: number) => {
    setSelectedPairPlus(val);
    sounds.playChipClick();
    onSetBets(selectedAnte, val);
  };

  return (
    <div className="relative w-full max-w-5xl h-full max-h-[82vh] mx-auto select-none p-2 flex items-center justify-center transition-all duration-500 ease-out">
      {/* Outer Polished Mahogany Wooden Rail */}
      <div
        className="relative w-full h-full rounded-[90px] md:rounded-[140px] p-3 md:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-4 border-amber-950/80 bg-gradient-to-b from-[#241712] via-[#140b07] to-[#0a0503] flex flex-col justify-center"
        style={{
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), inset 0 2px 4px rgba(197, 168, 128, 0.25)',
        }}
      >
        {/* Leather Padded Armrest */}
        <div className="relative w-full h-full rounded-[78px] md:rounded-[122px] p-1.5 md:p-2 bg-gradient-to-b from-[#18191f] via-[#121316] to-[#0c0d0f] border border-stone-800 flex flex-col justify-center">
          {/* Main Felt Surface (Deep Muted Emerald Felt) */}
          <div className="relative w-full h-full rounded-[70px] md:rounded-[112px] bg-gradient-to-b from-[#08301d] via-[#052416] to-[#03170e] border-2 border-stone-800/80 overflow-hidden flex flex-col items-center justify-between py-2.5 px-3 md:py-3.5 md:px-5 shadow-[inset_0_0_80px_rgba(0,0,0,0.85)]">
            {/* Subtle Betting Line Arc */}
            <div className="absolute inset-5 md:inset-8 rounded-[60px] md:rounded-[95px] border border-dashed border-emerald-500/20 pointer-events-none" />

            {/* TOP FELT SECTION: Dealer Casino Area */}
            <div className="relative z-10 flex flex-col items-center shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/75 border border-stone-800 text-[10px] md:text-xs font-semibold text-stone-300 backdrop-blur-md shadow-md">
                <span className="text-[#C5A880]">ДИЛЕР КАЗИНО</span>
                <span className="text-stone-400">· Квалификация от Дамы (Q)</span>
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
                <div className="mt-1 text-[11px] font-mono font-bold text-stone-200 bg-black/60 px-2 py-0.5 rounded-md border border-stone-800">
                  {dealerHand.name} {!dealerQualified && '(Не квалифицирован)'}
                </div>
              )}
            </div>

            {/* MID FELT SECTION: Traditional Three Card Poker Spots & Paytable */}
            <div className="relative z-10 flex items-center justify-center gap-3 md:gap-8 my-auto shrink-0">
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
                    <span className="font-mono text-[11px] md:text-xs font-bold text-stone-100">${anteBet}</span>
                  </div>
                  {anteBet > 0 && (
                    <div className="mt-0.5">
                      <ChipStack amount={anteBet} size="xs" showLabel={false} />
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
                        ${pairPlusBet}
                      </span>
                    </div>
                  </div>
                  {pairPlusBet > 0 && (
                    <div className="mt-0.5">
                      <ChipStack amount={pairPlusBet} size="xs" showLabel={false} />
                    </div>
                  )}
                </div>

                {/* Play Spot */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-dashed border-cyan-400/40 bg-black/50 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-[9px] md:text-[10px] font-bold text-cyan-300 uppercase">Play</span>
                    <span className="font-mono text-[11px] md:text-xs font-bold text-stone-100">
                      ${playBet > 0 ? playBet : '—'}
                    </span>
                  </div>
                  {playBet > 0 && (
                    <div className="mt-0.5">
                      <ChipStack amount={playBet} size="xs" showLabel={false} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LOWER FELT SECTION: Player Cards & Integrated Felt Control Console */}
            <div className="relative z-10 w-full flex flex-col items-center shrink-0">
              {/* Player 3 Cards */}
              <div className="flex items-center -space-x-2.5 mb-1.5">
                {playerCards.map((c, i) => (
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
                      isWinning={phase === 'ended' && (payoutSummary?.netProfit || 0) > 0}
                    />
                  </div>
                ))}
              </div>

              {/* Hand Evaluation Badge */}
              {playerHand && (
                <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-black/80 border border-[#C5A880]/50 text-[11px] font-semibold text-[#C5A880] shadow-md">
                  {playerHand.description}
                </div>
              )}

              {/* Payout Result Banner */}
              {payoutSummary && (
                <div className="mb-1.5 px-3 py-1 rounded-xl bg-stone-950/90 border border-[#C5A880] text-[11px] font-bold text-stone-100 shadow-xl max-w-md text-center">
                  <span>{payoutSummary.message}</span>
                  {payoutSummary.totalWon > 0 && (
                    <span className="text-[#C5A880] ml-2 font-mono">
                      +${payoutSummary.totalWon}
                    </span>
                  )}
                </div>
              )}

              {/* INTEGRATED FELT CONTROLS DOCK - STRICTLY POSITIONED ON TABLE FELT */}
              <div className="w-full max-w-md md:max-w-lg bg-black/75 border border-[#C5A880]/30 rounded-2xl p-2 md:p-2.5 shadow-2xl backdrop-blur-md">
                {/* Chip Balance Bar */}
                <div className="flex items-center justify-between text-[11px] pb-1.5 mb-1.5 border-b border-stone-800/80">
                  <div className="flex items-center gap-1 text-stone-400">
                    <Coins className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Баланс:</span>
                    <span className="font-mono font-bold text-stone-100">${playerChips.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Ставка: <span className="text-[#C5A880] font-bold">${selectedAnte + selectedPairPlus + playBet}</span>
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

                    {/* Deal Button */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playCardSlide();
                        onDeal();
                      }}
                      disabled={playerChips < selectedAnte + selectedPairPlus}
                      className="w-full py-2 rounded-xl font-bold text-xs md:text-sm bg-[#C5A880] hover:bg-[#d6bb96] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-stone-950" />
                      <span>Раздать карты (${selectedAnte + selectedPairPlus})</span>
                    </button>
                  </div>
                )}

                {phase === 'decision' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playButtonClick();
                        onAction('fold');
                      }}
                      className="py-2.5 rounded-xl font-bold text-xs md:text-sm bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 transition-all cursor-pointer text-center"
                    >
                      Сброс (Fold)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playChipsToss();
                        onAction('play');
                      }}
                      disabled={playerChips < anteBet}
                      className="py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#C5A880] hover:bg-[#d6bb96] text-stone-950 shadow-[0_0_15px_rgba(197,168,128,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1 text-center disabled:opacity-50"
                    >
                      <span>Играть (${anteBet})</span>
                    </button>
                  </div>
                )}

                {phase === 'ended' && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playCardSlide();
                      onNewRound();
                    }}
                    className="w-full py-2.5 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 shadow-lg transition-all cursor-pointer text-center"
                  >
                    Следующий раунд ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
