/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Users, DollarSign, Brain, Play } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

export interface GameSetupOptions {
  playerCount: number; // 2 to 9
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  botDifficulty: 'beginner' | 'medium' | 'pro';
}

interface SetupGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (options: GameSetupOptions) => void;
}

export const SetupGameModal: React.FC<SetupGameModalProps> = ({ isOpen, onClose, onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [startingChips, setStartingChips] = useState<number>(1000);
  const [blindLevel, setBlindLevel] = useState<{ sb: number; bb: number }>({ sb: 10, bb: 20 });
  const [botDifficulty, setBotDifficulty] = useState<'beginner' | 'medium' | 'pro'>('medium');

  if (!isOpen) return null;

  const stackOptions = [500, 1000, 2500, 5000, 10000];
  const blindOptions = [
    { label: '$5 / $10', sb: 5, bb: 10 },
    { label: '$10 / $20', sb: 10, bb: 20 },
    { label: '$25 / $50', sb: 25, bb: 50 },
    { label: '$50 / $100', sb: 50, bb: 100 },
  ];

  const handleStart = () => {
    sounds.playWinFanfare();
    onStartGame({
      playerCount,
      startingChips,
      smallBlind: blindLevel.sb,
      bigBlind: blindLevel.bb,
      botDifficulty,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Настройка покерного стола</h2>
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
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Number of Players */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Количество игроков за столом:</span>
              </span>
              <span className="font-mono text-base font-bold text-amber-400">{playerCount}</span>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
              {[2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setPlayerCount(num);
                  }}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    playerCount === num
                      ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Starting Chips Stack */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-stone-300 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Стартовый стек фишек:</span>
            </span>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
              {stackOptions.map((stack) => (
                <button
                  key={stack}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setStartingChips(stack);
                  }}
                  className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                    startingChips === stack
                      ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  ${stack.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Blind Structure */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-stone-300">
              Блайнды (Малый / Большой):
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {blindOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setBlindLevel({ sb: opt.sb, bb: opt.bb });
                  }}
                  className={`py-2 px-2 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                    blindLevel.bb === opt.bb
                      ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Bots Difficulty */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-stone-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-amber-400" />
              <span>Интеллект ботов (AI Difficulty):</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'beginner', title: 'Новичок', desc: 'Ошибается, блефует наугад' },
                { id: 'medium', title: 'Средний', desc: 'Считает шансы, базовые рейзы' },
                { id: 'pro', title: 'Профи (GTO)', desc: 'Pot Odds, полу-блефы, позиция' },
              ].map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setBotDifficulty(diff.id as 'beginner' | 'medium' | 'pro');
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    botDifficulty === diff.id
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className="font-bold text-xs text-amber-300">{diff.title}</span>
                  <span className="text-[10px] text-stone-400 mt-1 leading-snug">{diff.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleStart}
              data-start="true"
              className="w-full py-3.5 rounded-xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Создать и сесть за стол</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
