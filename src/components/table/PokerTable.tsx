/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card } from '../../game/engine/Card.ts';
import { Player } from '../../game/engine/Player.ts';
import { type PotSlice } from '../../game/engine/PotManager.ts';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import { PlayerSeat } from './PlayerSeat.tsx';

export type TableFeltColor = 'emerald' | 'sapphire' | 'burgundy' | 'midnight';

interface PokerTableProps {
  players: Player[];
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
  onAddBot,
}) => {
  // Felt color theme configurations
  const feltThemes: Record<
    TableFeltColor,
    {
      outerFelt: string;
      innerFelt: string;
      lineColor: string;
      ringGlow: string;
    }
  > = {
    emerald: {
      outerFelt: 'from-emerald-950 via-[#073820] to-[#042414]',
      innerFelt: 'bg-[#084226]',
      lineColor: 'border-emerald-500/25',
      ringGlow: 'shadow-[inset_0_0_80px_rgba(4,40,20,0.8)]',
    },
    sapphire: {
      outerFelt: 'from-slate-950 via-[#0a2540] to-[#061528]',
      innerFelt: 'bg-[#0c2f50]',
      lineColor: 'border-cyan-500/25',
      ringGlow: 'shadow-[inset_0_0_80px_rgba(6,25,50,0.8)]',
    },
    burgundy: {
      outerFelt: 'from-red-950 via-[#3a0d16] to-[#20050b]',
      innerFelt: 'bg-[#48121c]',
      lineColor: 'border-red-400/25',
      ringGlow: 'shadow-[inset_0_0_80px_rgba(45,10,18,0.8)]',
    },
    midnight: {
      outerFelt: 'from-neutral-950 via-[#18181b] to-[#09090b]',
      innerFelt: 'bg-[#1e1e24]',
      lineColor: 'border-amber-400/20',
      ringGlow: 'shadow-[inset_0_0_80px_rgba(0,0,0,0.9)]',
    },
  };

  const currentTheme = feltThemes[feltColor];

  // Radial positioning of players around oval
  // We want the human player (usually at index 0 or first human) placed at bottom center
  const humanIdx = players.findIndex((p) => p.isHuman);
  const anchorIdx = humanIdx !== -1 ? humanIdx : 0;
  const numPlayers = players.length;

  const getSeatPosition = (index: number) => {
    // Relative offset so human is at angle 90 degrees (bottom)
    const relativePos = (index - anchorIdx + numPlayers) % numPlayers;
    const angle = (relativePos / numPlayers) * 2 * Math.PI + Math.PI / 2;

    // Oval radii percentages
    const rx = 36; // horizontal % radius
    const ry = 30; // vertical % radius

    // Add extra inner padding for top and bottom seats
    const isBottomSeat = relativePos === 0;
    const isTopSeat = Math.abs(relativePos - numPlayers / 2) < 0.6;

    let yOffset = 0;
    if (isBottomSeat) yOffset = 4; // Place human seat cleanly below community cards
    if (isTopSeat) yOffset = 1; // Keep top seat away from top rail

    const x = 50 + rx * Math.cos(angle);
    const y = 50 + ry * Math.sin(angle) + yOffset;

    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="relative w-full max-w-6xl md:max-w-7xl h-full max-h-[58vh] md:max-h-[71vh] min-h-[270px] md:aspect-[16/9] mx-auto select-none p-1 md:p-3 flex items-center justify-center transition-all duration-500 ease-out">
      {/* Outer Polished Mahogany Wooden Rail */}
      <div
        className="relative w-full h-full rounded-[60px] md:rounded-[220px] p-2 md:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-amber-950/80 bg-gradient-to-b from-[#2a140e] via-[#1a0a06] to-[#0e0503] transition-all duration-500"
        style={{
          boxShadow:
            '0 30px 80px rgba(0, 0, 0, 0.95), inset 0 2px 4px rgba(255, 215, 0, 0.2), inset 0 -4px 10px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Leather Padded Armrest Ring */}
        <div
          className="relative w-full h-full rounded-[52px] md:rounded-[190px] p-1 md:p-3 bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-stone-800"
          style={{
            boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Main Felt Surface */}
          <div
            className={`relative w-full h-full rounded-[46px] md:rounded-[170px] bg-gradient-to-b ${currentTheme.outerFelt} ${currentTheme.ringGlow} border-2 border-stone-800/80 overflow-hidden flex flex-col items-center justify-center`}
          >
            {/* Table Betting Line Arc */}
            <div
              className={`absolute inset-4 md:inset-14 rounded-[38px] md:rounded-[140px] border-2 border-dashed ${currentTheme.lineColor} pointer-events-none opacity-60`}
            />

            {/* Subtle Royal Crest / Felt Watermark */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-10">
              <span className="text-6xl md:text-8xl text-amber-200 font-serif">♠</span>
              <span className="text-xs md:text-sm font-serif tracking-[0.3em] uppercase text-amber-100 font-bold mt-2">
                Royal Texas Hold'em
              </span>
            </div>

            {/* Center Pot & Community Cards Area */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 -translate-y-4 md:-translate-y-6">
              {/* Pot Display */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/75 border border-amber-500/40 shadow-xl backdrop-blur-md">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Банк:
                  </span>
                  <span className="font-mono text-sm md:text-base font-black text-amber-300 tabular-nums">
                    ${totalPot.toLocaleString()}
                  </span>
                  {totalPot > 0 && (
                    <ChipStack amount={totalPot} size="xs" showLabel={false} />
                  )}
                </div>

                {/* Side Pots breakdown if any */}
                {pots.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-stone-300">
                    {pots.map((pot, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-black/50 border border-stone-700 tabular-nums"
                      >
                        {idx === 0 ? 'Main' : `Side ${idx}`}: ${pot.amount}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Community Cards Rack */}
              <div className="flex items-center gap-1 md:gap-2.5 p-1 md:p-2 rounded-xl md:rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-xs scale-90 sm:scale-100">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const card = communityCards[idx];
                  return (
                    <div key={idx} className="relative">
                      {card ? (
                        <CardComponent
                          card={card}
                          faceDown={false}
                          size="md"
                          backStyle={backStyle}
                          isWinning={winnerPlayerIds.length > 0}
                        />
                      ) : (
                        <div className="w-10 h-14 md:w-14 md:h-20 rounded-md md:rounded-lg border-2 border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-white/20">
                          <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider">
                            {idx < 3 ? 'Flop' : idx === 3 ? 'Turn' : 'River'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Winner Announcement Banner */}
              {winnerDescriptions.length > 0 && (
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-extrabold text-xs md:text-sm shadow-[0_0_25px_rgba(251,191,36,0.8)] border border-yellow-200 animate-pulse text-center max-w-md">
                  {winnerDescriptions.join(' · ')}
                </div>
              )}
            </div>

            {/* Radial Player Seats */}
            {players.map((player, idx) => {
              const pos = getSeatPosition(idx);
              const isActive = idx === activePlayerIdx;
              const isDealer = idx === dealerIdx;
              const isSB = idx === sbIdx;
              const isBB = idx === bbIdx;
              const isWinner = winnerPlayerIds.includes(player.id);

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
                    backStyle={backStyle}
                    cardSize={player.isHuman ? 'md' : 'sm'}
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
