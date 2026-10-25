/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

  // Target raise amount on this street
  const minTargetRaise = Math.min(chips + currentBet, Math.max(minRaise, highestBet + bigBlind));
  const maxTargetRaise = chips + currentBet;

  const [betSize, setBetSize] = useState<number>(minTargetRaise);

  // Sync bet size when turn starts or highest bet changes
  useEffect(() => {
    setBetSize(minTargetRaise);
  }, [minTargetRaise, isMyTurn]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isMyTurn || isHandEnded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
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
      <div className="w-full max-w-xl mx-auto p-4 flex items-center justify-center">
        <button
          onClick={() => {
            sounds.playCardSlide();
            onNextHand?.();
          }}
          data-start="true"
          className="px-8 py-3.5 rounded-xl font-bold text-base md:text-lg text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_25px_rgba(251,191,36,0.6)] transform hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
        >
          <span>Следующая раздача</span>
          <span className="text-xl">➔</span>
        </button>
      </div>
    );
  }

  // Quick Bet presets based on current pot size
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

  const disabledClass = !isMyTurn ? 'opacity-40 pointer-events-none' : '';

  return (
    <div
      className={`w-full max-w-4xl mx-auto p-3 md:p-4 rounded-2xl bg-black/85 border border-amber-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 ${disabledClass}`}
      data-testid="poker-control-panel"
    >
      {/* Top Slider & Quick Bet Presets Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 pb-2 md:pb-3 border-b border-stone-800">
        {/* Quick Bet Buttons - horizontally swipeable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-0.5 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={() => {
              setBetSize(minTargetRaise);
              sounds.playChipClick();
            }}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Мин (${minTargetRaise})
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.25)}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.5)}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(0.75)}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => applyQuickBet(1.0)}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Банк (${totalPot})
          </button>
          <button
            type="button"
            onClick={() => {
              setBetSize(maxTargetRaise);
              sounds.playChipClick();
            }}
            className="px-2 md:px-2.5 py-1 text-[11px] md:text-xs font-bold rounded-lg bg-red-950 hover:bg-red-900 text-red-200 border border-red-700/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
            className="w-full md:w-44 accent-amber-500 cursor-pointer h-5"
          />
          <div className="flex items-center gap-1 font-mono font-bold text-amber-400 bg-stone-900 px-2.5 py-0.5 md:py-1 rounded-lg border border-amber-500/40 tabular-nums shrink-0 text-xs md:text-sm">
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
              className="w-14 md:w-16 bg-transparent text-amber-400 text-right focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Main Action Buttons Row - min 44px touch targets on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 pt-2 md:pt-3">
        {/* Fold Button */}
        <button
          type="button"
          onClick={handleFold}
          className="flex flex-col items-center justify-center min-h-[44px] py-1.5 md:py-3 px-2 md:px-3 rounded-xl font-bold bg-gradient-to-b from-rose-900 via-rose-950 to-black hover:from-rose-800 hover:to-rose-900 text-rose-200 border border-rose-700/60 shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-xs md:text-base">Фолд (Сброс)</span>
          <span className="hidden md:inline text-[10px] text-rose-400/80 font-normal">[F]</span>
        </button>

        {/* Check or Call Button */}
        {canCheck ? (
          <button
            type="button"
            onClick={handleCheck}
            className="flex flex-col items-center justify-center min-h-[44px] py-1.5 md:py-3 px-2 md:px-3 rounded-xl font-bold bg-gradient-to-b from-emerald-800 via-emerald-950 to-black hover:from-emerald-700 hover:to-emerald-900 text-emerald-200 border border-emerald-500/60 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span className="text-xs md:text-base">Чек</span>
            <span className="hidden md:inline text-[10px] text-emerald-400/80 font-normal">[C] Пропустить</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCall}
            className="flex flex-col items-center justify-center min-h-[44px] py-1.5 md:py-3 px-2 md:px-3 rounded-xl font-bold bg-gradient-to-b from-blue-800 via-blue-950 to-black hover:from-blue-700 hover:to-blue-900 text-blue-100 border border-blue-500/60 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span className="text-xs md:text-base">Колл ${actualCallCost}</span>
            <span className="hidden md:inline text-[10px] text-blue-300/80 font-normal">[C] Уравнять</span>
          </button>
        )}

        {/* Bet or Raise Button */}
        <button
          type="button"
          onClick={handleBetRaise}
          className="flex flex-col items-center justify-center min-h-[44px] py-1.5 md:py-3 px-2 md:px-3 rounded-xl font-bold bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black border border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-xs md:text-base">
            {highestBet > 0 ? `Рейз $${betSize}` : `Ставка $${betSize}`}
          </span>
          <span className="hidden md:inline text-[10px] text-amber-950/80 font-normal">[R] Повысить</span>
        </button>

        {/* All-In Button */}
        <button
          type="button"
          onClick={handleAllIn}
          className="flex flex-col items-center justify-center min-h-[44px] py-1.5 md:py-3 px-2 md:px-3 rounded-xl font-bold bg-gradient-to-b from-red-700 via-red-900 to-black hover:from-red-600 hover:to-red-800 text-white border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-xs md:text-base">All-In (${chips})</span>
          <span className="hidden md:inline text-[10px] text-red-200/80 font-normal font-mono">[A]</span>
        </button>
      </div>
    </div>
  );
};
