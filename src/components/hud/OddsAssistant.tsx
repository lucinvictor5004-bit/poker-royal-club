/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../../game/engine/Card.ts';
import { HandOdds } from '../../game/engine/HandOdds.ts';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface OddsAssistantProps {
  holeCards: Card[];
  communityCards: Card[];
  totalPot: number;
  callAmount: number;
  opponentsCount: number;
  enabled?: boolean;
}

export const OddsAssistant: React.FC<OddsAssistantProps> = ({
  holeCards,
  communityCards,
  totalPot,
  callAmount,
  opponentsCount,
  enabled = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const analysis = useMemo(() => {
    if (holeCards.length < 2) return null;
    return HandOdds.analyzeHand(
      holeCards,
      communityCards,
      totalPot,
      callAmount,
      opponentsCount
    );
  }, [holeCards, communityCards, totalPot, callAmount, opponentsCount]);

  if (!enabled || !analysis) return null;

  const winPct = Math.round(analysis.winProbability * 100);
  const potOddsPct = Math.round(analysis.potOdds * 100);

  return (
    <div className="select-none bg-black/85 border border-amber-500/30 rounded-xl backdrop-blur-md shadow-xl text-xs overflow-hidden max-w-sm transition-all duration-300">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-amber-300 font-bold hover:bg-white/5 transition-colors cursor-pointer gap-2"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Ассистент</span>
          {!isExpanded && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ml-1 ${
                winPct >= 60
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                  : winPct >= 35
                  ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                  : 'bg-rose-950 text-rose-300 border border-rose-600/50'
              }`}
            >
              {winPct}% победа
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-stone-800">
          {/* Current Combination */}
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-stone-400">Текущая рука:</span>
            <span className="font-semibold text-amber-200">
              {analysis.currentHand ? analysis.currentHand.description : 'Стартовые карты (Pre-flop)'}
            </span>
          </div>

          {/* Win Probability Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono">
              <span className="text-stone-400">Шанс на победу:</span>
              <span
                className={`font-bold tabular-nums ${
                  winPct >= 60 ? 'text-emerald-400' : winPct >= 35 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {winPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  winPct >= 60 ? 'bg-emerald-500' : winPct >= 35 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${winPct}%` }}
              />
            </div>
          </div>

          {/* Outs info if on flop or turn */}
          {analysis.outsCount > 0 && (
            <div className="text-stone-300">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Ауты на усиление:</span>
                <span className="font-mono font-bold text-amber-400">{analysis.outsCount} карт</span>
              </div>
              {analysis.outsDescription.length > 0 && (
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {analysis.outsDescription.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Pot Odds comparison */}
          {callAmount > 0 && (
            <div className="p-2 rounded bg-stone-900/80 border border-stone-700/60 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-400">Цена колла (Пот-оддсы):</span>
                <span className="font-mono font-bold text-stone-200 tabular-nums">{potOddsPct}%</span>
              </div>
              <div className="text-stone-300">
                Совет:{' '}
                <span
                  className={`font-semibold ${
                    analysis.isPotOddsFavorable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {analysis.isPotOddsFavorable
                    ? '✓ Математически выгодно коллировать'
                    : '⚠ Шанс банка не оправдывает ставку'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
