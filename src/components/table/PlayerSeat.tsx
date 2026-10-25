/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player } from '../../game/engine/Player.ts';
import { CardComponent, type CardBackStyle } from '../cards/CardComponent.tsx';
import { ChipStack } from '../chips/ChipStack.tsx';
import { X } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  isWinner: boolean;
  backStyle?: CardBackStyle;
  cardSize?: 'sm' | 'md';
  onRemoveBot?: (botId: string) => void;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isActive,
  isDealer,
  isSB,
  isBB,
  isWinner,
  backStyle = 'classic-royal',
  cardSize = 'sm',
  onRemoveBot,
}) => {
  const isHuman = player.isHuman;
  const isFolded = player.folded;
  const isAllIn = player.isAllIn;

  // Avatar gradient styles based on avatarSeed
  const avatarGradients = [
    'from-amber-600 to-yellow-800',
    'from-emerald-600 to-teal-800',
    'from-blue-600 to-indigo-800',
    'from-purple-600 to-fuchsia-900',
    'from-rose-600 to-red-900',
    'from-cyan-600 to-sky-900',
    'from-amber-500 to-orange-700',
    'from-slate-600 to-stone-800',
    'from-violet-600 to-purple-800',
    'from-teal-500 to-emerald-900',
  ];
  const avatarBg = avatarGradients[player.avatarSeed % avatarGradients.length];

  return (
    <div
      className={`relative flex flex-col items-center select-none transition-all duration-300 ${
        isFolded ? 'opacity-40 grayscale-[50%]' : 'opacity-100'
      }`}
      data-testid={`player-seat-${player.id}`}
    >
      {/* Winner Fanfare Glow */}
      {isWinner && (
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/30 via-yellow-300/40 to-amber-500/30 rounded-full blur-xl animate-pulse pointer-events-none" />
      )}

      {/* Hole Cards */}
      <div className="relative flex items-center justify-center -space-x-4 mb-1 z-10">
        {player.holeCards.map((card, idx) => {
          const rotation = idx === 0 ? '-rotate-6' : 'rotate-6';
          const isWinningCard = isWinner;
          return (
            <div
              key={card.id || idx}
              className={`transform transition-transform duration-300 ${rotation} ${
                isWinner ? '-translate-y-2' : ''
              }`}
            >
              <CardComponent
                card={card}
                faceDown={!player.showCards}
                isWinning={isWinningCard}
                size={cardSize}
                backStyle={backStyle}
              />
            </div>
          );
        })}
      </div>

      {/* Main Seat Badge */}
      <div
        className={`relative flex items-center gap-1.5 md:gap-2 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl border backdrop-blur-md transition-all duration-300 min-w-[85px] md:min-w-[140px] ${
          isActive
            ? 'bg-amber-950/80 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] ring-1 md:ring-2 ring-amber-400/50'
            : isWinner
            ? 'bg-amber-900/80 border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.6)]'
            : 'bg-black/75 border-stone-700/60 shadow-lg'
        }`}
      >
        {/* Active Player Timer Ring */}
        {isActive && (
          <div className="absolute -inset-1 rounded-xl md:rounded-2xl border-2 border-amber-400 animate-pulse pointer-events-none" />
        )}

        {/* Avatar with Difficulty / Human indicator */}
        <div className="relative shrink-0">
          <div
            className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${avatarBg} border ${
              isActive ? 'border-amber-300' : 'border-stone-500'
            } flex items-center justify-center text-white font-bold text-[10px] md:text-xs shadow-inner`}
          >
            {isHuman ? '★' : player.name.charAt(0)}
          </div>

          {/* Difficulty pill indicator on bot */}
          {!isHuman && (
            <span
              className={`absolute -bottom-1 -right-1 text-[7px] md:text-[8px] px-0.5 md:px-1 font-mono font-bold rounded uppercase ${
                player.difficulty === 'pro'
                  ? 'bg-rose-900 text-rose-200 border border-rose-500'
                  : player.difficulty === 'medium'
                  ? 'bg-blue-900 text-blue-200 border border-blue-500'
                  : 'bg-stone-800 text-stone-300 border border-stone-600'
              }`}
            >
              {player.difficulty === 'pro' ? 'P' : player.difficulty === 'medium' ? 'M' : 'N'}
            </span>
          )}
        </div>

        {/* Player Name and Chip Balance */}
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className={`text-[10px] md:text-xs font-semibold truncate ${
              isHuman ? 'text-amber-300 font-bold' : 'text-stone-200'
            }`}
          >
            {player.name}
          </span>

          <span className="font-mono text-[9px] md:text-xs font-bold text-amber-400 tabular-nums leading-none">
            ${player.chips.toLocaleString()}
          </span>
        </div>

        {/* Role Tokens: Dealer, SB, BB */}
        {isDealer && (
          <div
            className="absolute -top-2.5 -right-2 w-5 h-5 rounded-full bg-amber-400 border border-amber-200 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md"
            title="Dealer Button"
          >
            D
          </div>
        )}
        {isSB && (
          <div
            className="absolute -top-2.5 -right-2 w-5 h-5 rounded-full bg-purple-600 border border-purple-300 text-white text-[9px] font-black flex items-center justify-center shadow-md"
            title="Small Blind"
          >
            SB
          </div>
        )}
        {isBB && (
          <div
            className="absolute -top-2.5 -right-2 w-5 h-5 rounded-full bg-orange-600 border border-orange-300 text-white text-[9px] font-black flex items-center justify-center shadow-md"
            title="Big Blind"
          >
            BB
          </div>
        )}

        {/* Bot Removal Button */}
        {!isHuman && onRemoveBot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveBot(player.id);
            }}
            className="absolute -top-2 -left-2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-rose-950/90 hover:bg-rose-800 border border-rose-600 text-rose-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md opacity-80 hover:opacity-100"
            title={`Удалить ${player.name} со стола`}
            aria-label={`Удалить ${player.name} со стола`}
          >
            <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
          </button>
        )}
      </div>

      {/* Action / Status Pill Banner */}
      {player.lastAction && !isFolded && (
        <div
          className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md animate-fade-in ${
            player.lastAction === 'all-in'
              ? 'bg-red-700 text-white border border-red-400 animate-bounce'
              : player.lastAction === 'raise' || player.lastAction === 'bet'
              ? 'bg-amber-600 text-black font-extrabold border border-amber-300'
              : player.lastAction === 'call'
              ? 'bg-blue-600 text-white border border-blue-400'
              : 'bg-stone-700 text-stone-200 border border-stone-500'
          }`}
        >
          {player.lastAction === 'all-in'
            ? 'ALL-IN'
            : player.lastAction === 'raise'
            ? `RAISE $${player.lastActionAmount}`
            : player.lastAction === 'bet'
            ? `BET $${player.lastActionAmount}`
            : player.lastAction === 'call'
            ? `CALL $${player.lastActionAmount}`
            : 'CHECK'}
        </div>
      )}

      {isFolded && (
        <div className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-800 text-stone-400 border border-stone-700">
          FOLD
        </div>
      )}

      {/* Active Street Bet Chips */}
      {player.currentBet > 0 && (
        <div className="mt-1.5 z-20">
          <ChipStack amount={player.currentBet} size="xs" showLabel={true} />
        </div>
      )}
    </div>
  );
};
