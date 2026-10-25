/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trophy, TrendingUp, Award, DollarSign, RotateCcw } from 'lucide-react';

export interface PokerStats {
  gamesPlayed: number;
  handsWon: number;
  largestPotWon: number;
  bestHandName: string;
  totalProfit: number;
}

const DEFAULT_STATS: PokerStats = {
  gamesPlayed: 0,
  handsWon: 0,
  largestPotWon: 0,
  bestHandName: '—',
  totalProfit: 0,
};

export function loadPokerStats(): PokerStats {
  try {
    const raw = localStorage.getItem('royal_poker_stats');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_STATS;
}

export function savePokerStats(stats: PokerStats): void {
  try {
    localStorage.setItem('royal_poker_stats', JSON.stringify(stats));
  } catch {
    // ignore
  }
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PokerStats;
  onResetStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, onResetStats }) => {
  if (!isOpen) return null;

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.handsWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Статистика игрока</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Hands Played */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-xs text-stone-400">Сыграно раздач</span>
              <div className="text-xl md:text-2xl font-black font-mono text-stone-100 tabular-nums mt-0.5">
                {stats.gamesPlayed}
              </div>
            </div>

            {/* Hands Won */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-xs text-stone-400">Выиграно раздач</span>
              <div className="text-xl md:text-2xl font-black font-mono text-amber-400 tabular-nums mt-0.5">
                {stats.handsWon}
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Процент побед</span>
              </div>
              <div className="text-xl md:text-2xl font-black font-mono text-emerald-400 tabular-nums mt-0.5">
                {winRate}%
              </div>
            </div>

            {/* Largest Pot */}
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>Крупнейший банк</span>
              </div>
              <div className="text-xl md:text-2xl font-black font-mono text-amber-300 tabular-nums mt-0.5">
                ${stats.largestPotWon.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Best Combination */}
          <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-stone-400">Лучшая победная рука</span>
            </div>
            <span className="font-bold text-amber-300 text-sm">{stats.bestHandName}</span>
          </div>

          {/* Net Profit */}
          <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-400">Чистый доход (Net Profit)</span>
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.totalProfit >= 0 ? `+$${stats.totalProfit.toLocaleString()}` : `-$${Math.abs(stats.totalProfit).toLocaleString()}`}
            </span>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onResetStats}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить статистику</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
