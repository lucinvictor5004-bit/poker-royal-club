/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Player, type PlayerActionType } from '../../game/engine/Player.ts';
import { sounds } from '../../utils/soundEffects.ts';

interface ControlPanelProps {
  player: Player | null;
  isMyTurn: boolean;
  highestBet: number;
  minRaise: number;
  totalPot: number;
  bigBlind: number;
  onAction: (action: PlayerActionType, amount?: number) => void;
  onNextHand?: () => void;
  isHandEnded?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  player,
  isMyTurn,
  highestBet,
  minRaise,
  totalPot,
  bigBlind,
  onAction,
  onNextHand,
  isHandEnded = false,
}) => {
  if (!player) return null;

  const chips = player.chips;
  const currentBet = player.currentBet;
  const callAmount = Math.max(0, highestBet - currentBet);
  const canCheck = callAmount === 0;
  const actualCallCost = Math.min(chips, callAmount);

  const minTargetRaise = Math.min(chips + currentBet, Math.max(minRaise, highestBet + bigBlind));
  const maxTargetRaise = chips + currentBet;

  const [betSize, setBetSize] = useState<number>(minTargetRaise);

  useEffect(() => {
    setBetSize(minTargetRaise);
  }, [minTargetRaise, isMyTurn]);

  useEffect(() => {
    if (!isMyTurn || isHandEnded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'f') {
        sounds.playButtonClick();
        onAction('fold');
      } else if (key === 'c' || key === ' ') {
        sounds.playButtonClick();
        if (canCheck) {
          sounds.playCheckKnock();
          onAction('check');
        } else {
          sounds.playChipsToss();
          onAction('call');
        }
      } else if (key === 'r' || key === 'b') {
        sounds.playChipsToss();
        onAction(highestBet > 0 ? 'raise' : 'bet', betSize);
      } else if (key === 'a') {
        sounds.playAllInSound();
        onAction('all-in', chips);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, isHandEnded, canCheck, betSize, chips, highestBet, onAction]);

  if (isHandEnded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl mx-auto p-3 flex items-center justify-center"
      >
        <button
          onClick={() => {
            sounds.playCardSlide();
            onNextHand?.();
          }}
          data-start="true"
          className="px-8 py-3.5 rounded-xl font-bold text-sm md:text-base text-stone-950 bg-gradient-to-r from-[#D4AF37] via-[#e2c15a] to-[#C5A880] hover:from-[#e5c247] hover:to-[#d4b88e] shadow-[0_8px_30px_rgba(212,175,55,0.4)] transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5"
        >
          <span>Следующая раздача</span>
          <span className="text-lg">➔</span>
        </button>
      </motion.div>
    );
  }

  const applyQuickBet = (fraction: number) => {
    const rawTarget = currentBet + Math.floor(totalPot * fraction);
    const clamped = Math.min(maxTargetRaise, Math.max(minTargetRaise, rawTarget));
    setBetSize(clamped);
    sounds.playChipClick();
  };

  const handleFold = () => {
    sounds.playButtonClick();
    onAction('fold');
  };

  const handleCheck = () => {
    sounds.playCheckKnock();
    onAction('check');
  };

  const handleCall = () => {
    sounds.playChipsToss();
    onAction('call');
  };

  const handleBetRaise = () => {
    sounds.playChipsToss();
    const actionType = highestBet > 0 ? 'raise' : 'bet';
    onAction(actionType, betSize);
  };

  const handleAllIn = () => {
    sounds.playAllInSound();
    onAction('all-in', chips);
  };

  const disabledClass = !isMyTurn ? 'opacity-45 pointer-events-none' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isMyTurn ? 1 : 0.45, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full max-w-4xl mx-auto p-2.5 md:p-3.5 rounded-2xl bg-[#0b0d10]/92 border border-[#C5A880]/35 shadow-[0_14px_40px_rgba(0,0,0,0.9)] backdrop-blur-md transition-opacity duration-300 ${disabledClass}`}
      data-testid="poker-control-panel"
    >
      {/* Top Slider & Quick Bet Presets Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 pb-2 border-b border-stone-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-0.5 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={() => {
              setBetSize(minTargetRaise);
              sounds.playChipClick();
            }}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-semibold rounded-lg bg-[#14161b] hover:bg-[#1c1f26] text-stone-200 border border-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
          >
            Мин (${minTargetRaise})
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.25)}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-semibold rounded-lg bg-[#14161b] hover:bg-[#1c1f26] text-stone-200 border border-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.5)}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-semibold rounded-lg bg-[#14161b] hover:bg-[#1c1f26] text-stone-200 border border-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.75)}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-semibold rounded-lg bg-[#14161b] hover:bg-[#1c1f26] text-stone-200 border border-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(1.0)}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-semibold rounded-lg bg-[#221b10] hover:bg-[#2d2415] text-[#F3E5AB] border border-[#C5A880]/40 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
          >
            Банк (${totalPot})
          </button>
          <button
            type="button"
            onClick={() => {
              setBetSize(maxTargetRaise);
              sounds.playChipClick();
            }}
            className="px-2.5 py-1 text-[11px] md:text-xs font-mono font-bold rounded-lg bg-[#2b1014] hover:bg-[#3b151a] text-rose-200 border border-rose-800/60 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
          >
            All-In (${maxTargetRaise})
          </button>
        </div>

        {/* Bet Slider and Value Input */}
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <input
            type="range"
            min={minTargetRaise}
            max={maxTargetRaise}
            step={Math.max(1, Math.floor(bigBlind / 2))}
            value={betSize}
            onChange={(e) => setBetSize(Number(e.target.value))}
            aria-label="Размер ставки"
            className="w-full md:w-44 accent-[#D4AF37] cursor-pointer h-5"
          />
          <div className="flex items-center gap-1 font-mono font-bold text-[#F3E5AB] bg-[#14161b] px-2.5 py-1 rounded-lg border border-[#C5A880]/40 tabular-nums shrink-0 text-xs md:text-sm">
            <span>$</span>
            <input
              type="number"
              min={minTargetRaise}
              max={maxTargetRaise}
              value={betSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) setBetSize(Math.min(maxTargetRaise, Math.max(minTargetRaise, val)));
              }}
              aria-label="Ввести ставку числом"
              className="w-14 md:w-16 bg-transparent text-[#F3E5AB] text-right focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Main Action Buttons Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleFold}
          className="flex flex-col items-center justify-center min-h-[44px] py-2 md:py-2.5 px-3 rounded-xl font-bold bg-[#1f1215] hover:bg-[#2b171b] text-rose-200 border border-rose-800/60 shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <span className="text-xs md:text-sm">Фолд (Пас)</span>
          <span className="hidden md:inline text-[10px] text-rose-300/70 font-normal">[F] Сбросить</span>
        </button>

        {canCheck ? (
          <button
            type="button"
            onClick={handleCheck}
            className="flex flex-col items-center justify-center min-h-[44px] py-2 md:py-2.5 px-3 rounded-xl font-bold bg-[#11261b] hover:bg-[#163324] text-emerald-200 border border-emerald-700/60 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="text-xs md:text-sm">Чек</span>
            <span className="hidden md:inline text-[10px] text-emerald-300/70 font-normal">
              [C] Пропустить
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCall}
            className="flex flex-col items-center justify-center min-h-[44px] py-2 md:py-2.5 px-3 rounded-xl font-bold bg-[#122238] hover:bg-[#172d4a] text-sky-100 border border-sky-700/60 shadow-md active:scale-[0.98] transition-all cursor-pointer tabular-nums"
          >
            <span className="text-xs md:text-sm">Колл ${actualCallCost}</span>
            <span className="hidden md:inline text-[10px] text-sky-300/70 font-normal">
              [C] Уравнять
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleBetRaise}
          className="flex flex-col items-center justify-center min-h-[44px] py-2 md:py-2.5 px-3 rounded-xl font-bold bg-gradient-to-b from-[#D4AF37] to-[#b5902b] hover:from-[#e0be48] hover:to-[#c49f36] text-stone-950 border border-[#F3E5AB]/60 shadow-[0_4px_16px_rgba(212,175,55,0.3)] active:scale-[0.98] transition-all cursor-pointer tabular-nums"
        >
          <span className="text-xs md:text-sm font-extrabold">
            {highestBet > 0 ? `Рейз $${betSize}` : `Ставка $${betSize}`}
          </span>
          <span className="hidden md:inline text-[10px] text-stone-900/80 font-semibold">
            [R] Повысить
          </span>
        </button>

        <button
          type="button"
          onClick={handleAllIn}
          className="flex flex-col items-center justify-center min-h-[44px] py-2 md:py-2.5 px-3 rounded-xl font-bold bg-gradient-to-b from-[#6e1414] to-[#450a0a] hover:from-[#821818] hover:to-[#570d0d] text-red-100 border border-red-500/60 shadow-md active:scale-[0.98] transition-all cursor-pointer tabular-nums"
        >
          <span className="text-xs md:text-sm">All-In (${chips})</span>
          <span className="hidden md:inline text-[10px] text-red-200/75 font-mono">[A] Ва-банк</span>
        </button>
      </div>
    </motion.div>
  );
};
