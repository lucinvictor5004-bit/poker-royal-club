/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../../game/engine/Card.ts';
import { Player } from '../../game/engine/Player.ts';
import { type PotSlice } from '../../game/engine/PotManager.ts';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import { PlayerSeat } from './PlayerSeat.tsx';

export type TableFeltColor = 'emerald' | 'sapphire' | 'burgundy' | 'midnight';

interface PokerTableProps {
  players: Player[];
  currentPlayerId?: string;
  communityCards: Card[];
  totalPot: number;
  pots: PotSlice[];
  activePlayerIdx: number;
  dealerIdx: number;
  sbIdx: number;
  bbIdx: number;
  winnerPlayerIds: string[];
  winnerDescriptions: string[];
  feltColor?: TableFeltColor;
  backStyle?: CardBackStyle;
  onRemoveBot?: (botId: string) => void;
  onAddBot?: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  players,
  currentPlayerId,
  communityCards,
  totalPot,
  pots,
  activePlayerIdx,
  dealerIdx,
  sbIdx,
  bbIdx,
  winnerPlayerIds,
  winnerDescriptions,
  feltColor = 'emerald',
  backStyle = 'classic-royal',
  onRemoveBot,
}) => {
  // Realistic casino wool felt palettes
  const feltThemes: Record<
    TableFeltColor,
    {
      outerFelt: string;
      lineColor: string;
    }
  > = {
    emerald: {
      outerFelt: 'from-[#0a4027] via-[#07301d] to-[#03190e]',
      lineColor: 'border-[#C5A880]/30',
    },
    sapphire: {
      outerFelt: 'from-[#0d2d4d] via-[#082038] to-[#04101e]',
      lineColor: 'border-[#C5A880]/30',
    },
    burgundy: {
      outerFelt: 'from-[#4a121d] via-[#330b13] to-[#1a0408]',
      lineColor: 'border-[#C5A880]/30',
    },
    midnight: {
      outerFelt: 'from-[#1f2128] via-[#15171c] to-[#0b0c0f]',
      lineColor: 'border-[#C5A880]/30',
    },
  };

  const currentTheme = feltThemes[feltColor];

  // Anchor on currentPlayerId so each player sees themselves at bottom center
  const myIdx = currentPlayerId ? players.findIndex((p) => p.id === currentPlayerId) : -1;
  const humanIdx = myIdx !== -1 ? myIdx : players.findIndex((p) => p.isHuman);
  const anchorIdx = humanIdx !== -1 ? humanIdx : 0;
  const numPlayers = players.length;

  const getSeatGeometry = (index: number) => {
    const relativePos = (index - anchorIdx + numPlayers) % numPlayers;
    const angle = (relativePos / numPlayers) * 2 * Math.PI + Math.PI / 2;

    const rx = 36;
    const ry = 30;

    const isBottomSeat = relativePos === 0;
    const isTopSeat = Math.abs(relativePos - numPlayers / 2) < 0.6;

    let yOffset = 0;
    if (isBottomSeat) yOffset = 4;
    if (isTopSeat) yOffset = 2;

    const x = 50 + rx * Math.cos(angle);
    const y = 50 + ry * Math.sin(angle) + yOffset;

    // Approximate vector from top-center Dealer Shoe (50%, 10%) to seat (x%, y%)
    const dealFromX = Math.round((50 - x) * 3.2);
    const dealFromY = Math.round((12 - y) * 2.4);

    return {
      pos: { left: `${x}%`, top: `${y}%` },
      dealFromX,
      dealFromY,
      relativePos,
    };
  };

  return (
    <div className="relative w-full max-w-6xl md:max-w-7xl h-full max-h-[60vh] md:max-h-[72vh] min-h-[280px] md:aspect-[16/9] mx-auto select-none p-1 md:p-3 flex items-center justify-center">
      {/* Outer Polished Mahogany Wooden Rail */}
      <div className="relative w-full h-full rounded-[64px] md:rounded-[220px] p-2.5 md:p-6 mahogany-rail border-2 border-[#542b1c]">
        {/* Brass Accent Trim Line */}
        <div className="relative w-full h-full rounded-[56px] md:rounded-[196px] p-1.5 md:p-3 leather-armrest border border-[#C5A880]/25">
          {/* Main Casino Felt Surface */}
          <div
            className={`relative w-full h-full rounded-[48px] md:rounded-[178px] bg-gradient-to-b ${currentTheme.outerFelt} casino-felt-surface border-2 border-[#C5A880]/25 overflow-hidden flex flex-col items-center justify-center`}
          >
            {/* Brass Silk-Screened Betting Line & Inner Corner Accents */}
            <div
              className={`absolute inset-4 md:inset-12 rounded-[38px] md:rounded-[144px] border ${currentTheme.lineColor} pointer-events-none`}
            />
            <div
              className={`absolute inset-5 md:inset-[52px] rounded-[36px] md:rounded-[140px] border border-dashed ${currentTheme.lineColor} opacity-45 pointer-events-none`}
            />

            {/* Physical Dealer Shoe & Deck at Top Center of Table */}
            <div className="absolute top-2.5 md:top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-xl bg-black/55 border border-[#C5A880]/30 shadow-lg backdrop-blur-xs pointer-events-none">
              <div className="relative w-5 h-7 md:w-6 md:h-8 rounded-[3px] bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#C5A880]/70 shadow-md flex items-center justify-center">
                <div className="absolute -top-[2px] -left-[2px] w-full h-full rounded-[3px] bg-[#141b2d] border border-[#C5A880]/50 flex items-center justify-center">
                  <span className="text-[9px] text-[#C5A880] font-serif">♠</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] md:text-[10px] font-serif font-bold tracking-widest text-[#C5A880] uppercase leading-none">
                  Колода дилера
                </span>
                <span className="text-[8px] md:text-[9px] text-stone-400 font-mono leading-tight">
                  52 карты · 6-Max
                </span>
              </div>
            </div>

            {/* Center Pot & Community Cards Area */}
            <div className="relative z-10 flex flex-col items-center gap-2 -translate-y-2 md:-translate-y-4">
              {/* Total Pot Plaque */}
              <motion.div
                key={`pot-${totalPot}`}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#0b0d10]/85 border border-[#C5A880]/45 shadow-[0_8px_24px_rgba(0,0,0,0.75)] backdrop-blur-md">
                  <span className="text-[10px] md:text-[11px] font-serif font-bold text-[#C5A880] uppercase tracking-widest">
                    Банк
                  </span>
                  <span className="font-mono text-sm md:text-base font-extrabold text-[#F3E5AB] tabular-nums">
                    ${totalPot.toLocaleString()}
                  </span>
                  {totalPot > 0 && <ChipStack amount={totalPot} size="xs" showLabel={false} />}
                </div>

                {/* Side Pots breakdown if any */}
                {pots.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-stone-300">
                    {pots.map((pot, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-black/60 border border-stone-700 tabular-nums"
                      >
                        {idx === 0 ? 'Осн.' : `Побоч. ${idx}`}: ${pot.amount}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Community Cards Brass Frame Rack with Staggered Dealing */}
              <div className="flex items-center gap-1.5 md:gap-2.5 p-1.5 md:p-2.5 rounded-2xl bg-black/45 border border-[#C5A880]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.7)] backdrop-blur-xs scale-90 sm:scale-100">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const card = communityCards[idx];
                  // Flop cards (0, 1, 2) deal with 210ms stagger; Turn (3) and River (4) deal immediately with 100ms delay
                  const dealDelayMs = idx < 3 ? idx * 210 : 90;
                  return (
                    <div key={card ? card.id : `empty-slot-${idx}`} className="relative">
                      {card ? (
                        <CardComponent
                          card={card}
                          faceDown={false}
                          size="md"
                          backStyle={backStyle}
                          isWinning={winnerPlayerIds.length > 0}
                          dealDelayMs={dealDelayMs}
                          dealFromX={(2 - idx) * 28}
                          dealFromY={-85}
                          playDealSound={true}
                        />
                      ) : (
                        <div className="w-11 h-16 md:w-15 md:h-22 rounded-[6px] md:rounded-[9px] border border-[#C5A880]/20 bg-black/25 flex flex-col items-center justify-center text-[#C5A880]/30 shadow-inner">
                          <span className="text-[8px] md:text-[9px] font-serif uppercase font-bold tracking-widest">
                            {idx < 3 ? 'Flop' : idx === 3 ? 'Turn' : 'River'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Winner Announcement Banner */}
              <AnimatePresence>
                {winnerDescriptions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#241c0e] via-[#332712] to-[#241c0e] text-[#F3E5AB] font-serif font-bold text-xs md:text-sm shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37] text-center max-w-md"
                  >
                    {winnerDescriptions.join(' · ')}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Radial Player Seats */}
            {players.map((player, idx) => {
              const { pos, dealFromX, dealFromY, relativePos } = getSeatGeometry(idx);
              const isActive = idx === activePlayerIdx;
              const isDealer = idx === dealerIdx;
              const isSB = idx === sbIdx;
              const isBB = idx === bbIdx;
              const isWinner = winnerPlayerIds.includes(player.id);
              const isMe = currentPlayerId ? player.id === currentPlayerId : idx === anchorIdx;
              const isShowdown = winnerPlayerIds.length > 0 && !player.folded;

              return (
                <div
                  key={player.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500 ease-out"
                  style={pos}
                >
                  <PlayerSeat
                    player={player}
                    isActive={isActive}
                    isDealer={isDealer}
                    isSB={isSB}
                    isBB={isBB}
                    isWinner={isWinner}
                    isCurrentPlayer={isMe}
                    showHoleCards={isMe || isShowdown}
                    backStyle={backStyle}
                    cardSize={isMe ? 'md' : 'sm'}
                    seatDealOrder={relativePos}
                    dealFromX={dealFromX}
                    dealFromY={dealFromY}
                    onRemoveBot={onRemoveBot}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
