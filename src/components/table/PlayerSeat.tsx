/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  isCurrentPlayer?: boolean;
  showHoleCards?: boolean;
  backStyle?: CardBackStyle;
  cardSize?: 'sm' | 'md';
  seatDealOrder?: number;
  dealFromX?: number;
  dealFromY?: number;
  onRemoveBot?: (botId: string) => void;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isActive,
  isDealer,
  isSB,
  isBB,
  isWinner,
  isCurrentPlayer = false,
  showHoleCards,
  backStyle = 'classic-royal',
  cardSize = 'sm',
  seatDealOrder = 0,
  dealFromX = 0,
  dealFromY = -75,
  onRemoveBot,
}) => {
  const isHuman = isCurrentPlayer || player.isHuman;
  const isFolded = player.folded;
  const shouldShowCards = showHoleCards !== undefined ? showHoleCards : player.showCards;

  const avatarGradients = [
    'from-[#3d2b1f] to-[#1a110b]',
    'from-[#133829] to-[#081b13]',
    'from-[#172a45] to-[#0a1322]',
    'from-[#351b42] to-[#170b1d]',
    'from-[#47161e] to-[#1f080c]',
    'from-[#163642] to-[#09181e]',
  ];
  const avatarBg = avatarGradients[(player.avatarSeed || 0) % avatarGradients.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{
        opacity: isFolded ? 0.45 : 1,
        scale: isActive ? 1.03 : 1,
      }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex flex-col items-center select-none ${
        isFolded ? 'grayscale-[55%]' : ''
      }`}
      data-testid={`player-seat-${player.id}`}
    >
      {/* Winner Spotlight Aura */}
      <AnimatePresence>
        {isWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute -inset-4 bg-[radial-gradient(circle,rgba(212,175,55,0.38)_0%,transparent_70%)] rounded-full blur-md pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Hole Cards with Staggered Dealing from Dealer Shoe */}
      <div className="relative flex items-center justify-center -space-x-3 md:-space-x-3.5 mb-1.5 z-10">
        {(player.holeCards || []).map((card, idx) => {
          const rotation = idx === 0 ? '-rotate-6' : 'rotate-6';
          const dealDelayMs = seatDealOrder * 150 + idx * 180;
          return (
            <div
              key={card.id || `${player.id}-card-${idx}`}
              className={`transform transition-transform duration-300 ${rotation} ${
                isWinner ? '-translate-y-2' : ''
              }`}
            >
              <CardComponent
                card={card}
                faceDown={!shouldShowCards}
                isWinning={isWinner}
                size={cardSize}
                backStyle={backStyle}
                dealDelayMs={dealDelayMs}
                dealFromX={dealFromX}
                dealFromY={dealFromY}
                playDealSound={idx === 0 && seatDealOrder < 3}
              />
            </div>
          );
        })}
      </div>

      {/* Main Luxury Seat Plaque */}
      <div
        className={`relative flex items-center gap-1.5 md:gap-2.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border backdrop-blur-md transition-all duration-300 min-w-[92px] md:min-w-[144px] ${
          isActive
            ? 'bg-[#191610]/95 border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.45),0_8px_20px_rgba(0,0,0,0.85)]'
            : isWinner
            ? 'bg-[#1f1a10]/95 border-[#facc15] shadow-[0_0_28px_rgba(250,204,21,0.55)]'
            : 'bg-[#0e1014]/90 border-stone-700/70 shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
        }`}
      >
        {/* Smooth Active Turn Border Ring */}
        {isActive && (
          <motion.div
            layoutId="active-turn-ring"
            className="absolute -inset-[2px] rounded-xl border border-[#D4AF37]/80 pointer-events-none"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {/* Player Medallion Avatar */}
        <div className="relative shrink-0">
          <div
            className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${avatarBg} border ${
              isActive ? 'border-[#D4AF37]' : 'border-[#C5A880]/50'
            } flex items-center justify-center text-[#F3E5AB] font-serif font-bold text-[10px] md:text-xs shadow-inner`}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Player Name & Tabular Stack */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] md:text-xs font-semibold truncate ${
                isCurrentPlayer ? 'text-[#F3E5AB] font-bold' : 'text-stone-200'
              }`}
            >
              {player.name}
            </span>
          </div>

          <span className="font-mono text-[10px] md:text-xs font-bold text-[#C5A880] tabular-nums leading-tight">
            ${player.chips.toLocaleString()}
          </span>
        </div>

        {/* Casino Table Role Buttons: Dealer, SB, BB */}
        {isDealer && (
          <div
            className="absolute -top-2.5 -right-2 w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-b from-[#fdfbf7] to-[#d6ceb8] border-2 border-[#8c734b] text-stone-950 text-[9px] md:text-[10px] font-serif font-black flex items-center justify-center shadow-[0_3px_6px_rgba(0,0,0,0.75)]"
            title="Кнопка дилера (DEALER)"
          >
            D
          </div>
        )}
        {isSB && !isDealer && (
          <div
            className="absolute -top-2.5 -right-2 w-5 h-5 rounded-full bg-[#1e293b] border border-[#94a3b8] text-slate-100 text-[8px] font-mono font-bold flex items-center justify-center shadow-md"
            title="Малый блайнд (Small Blind)"
          >
            SB
          </div>
        )}
        {isBB && (
          <div
            className="absolute -top-2.5 -left-2 w-5 h-5 rounded-full bg-[#3b1d11] border border-[#C5A880] text-[#F3E5AB] text-[8px] font-mono font-bold flex items-center justify-center shadow-md"
            title="Большой блайнд (Big Blind)"
          >
            BB
          </div>
        )}

        {/* Optional Seat Removal */}
        {!isHuman && onRemoveBot && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveBot(player.id);
            }}
            className="absolute -top-2 -left-2 w-4 h-4 md:w-5 md:h-5 rounded-full bg-rose-950/90 hover:bg-rose-800 border border-rose-600 text-rose-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
            title={`Убрать ${player.name}`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Action Callout Tag */}
      <AnimatePresence mode="wait">
        {player.lastAction && !isFolded && (
          <motion.div
            key={`${player.lastAction}-${player.lastActionAmount}`}
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`mt-1 px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-wider shadow-md ${
              player.lastAction === 'all-in'
                ? 'bg-[#7f1d1d] text-red-100 border border-red-400/60'
                : player.lastAction === 'raise' || player.lastAction === 'bet'
                ? 'bg-[#2a2112] text-[#F3E5AB] border border-[#D4AF37]/60'
                : player.lastAction === 'call'
                ? 'bg-[#132a1f] text-emerald-200 border border-emerald-500/40'
                : 'bg-stone-900/90 text-stone-300 border border-stone-700'
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
          </motion.div>
        )}
      </AnimatePresence>

      {isFolded && (
        <div className="mt-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-stone-900/90 text-stone-400 border border-stone-800">
          ПАС
        </div>
      )}

      {/* Committed Street Chips */}
      <AnimatePresence>
        {player.currentBet > 0 && (
          <motion.div
            key={`bet-${player.currentBet}`}
            initial={{ opacity: 0, y: -6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 z-20"
          >
            <ChipStack amount={player.currentBet} size="xs" showLabel={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
