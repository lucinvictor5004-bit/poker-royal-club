/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Layers, Users, Play, DollarSign } from 'lucide-react';
import { type GameMode } from '../../services/supabase.ts';
import { sounds } from '../../utils/soundEffects.ts';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (params: {
    mode: GameMode;
    hostName: string;
    smallBlind?: number;
    bigBlind?: number;
    ante?: number;
    startingChips?: number;
    maxPlayers?: number;
  }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
}) => {
  const [mode, setMode] = useState<GameMode>('texas_holdem');
  const [hostName, setHostName] = useState(() => {
    try {
      return localStorage.getItem('poker_player_name') || 'Игрок 1';
    } catch {
      return 'Игрок 1';
    }
  });
  const [startingChips, setStartingChips] = useState(1000);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [blindOption, setBlindOption] = useState<{ sb: number; bb: number; ante: number }>({
    sb: 10,
    bb: 20,
    ante: 25,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = hostName.trim() || 'Хост';
    try {
      localStorage.setItem('poker_player_name', finalName);
    } catch {
      // ignore
    }

    sounds.playWinFanfare();
    onCreateRoom({
      mode,
      hostName: finalName,
      smallBlind: blindOption.sb,
      bigBlind: blindOption.bb,
      ante: blindOption.ante,
      startingChips,
      maxPlayers: mode === 'three_card' ? 7 : maxPlayers,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-[#141518] border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800/80 flex items-center justify-between bg-[#0e0f12]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#C5A880]" />
            <h2 className="text-base md:text-lg font-bold text-stone-100">Создать покерную комнату</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Game Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400">Выберите режим игры:</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sounds.playChipClick();
                  setMode('texas_holdem');
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  mode === 'texas_holdem'
                    ? 'bg-[#1e2026] border-[#C5A880] ring-1 ring-[#C5A880]/40 text-stone-100'
                    : 'bg-[#18191f] border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">♠</span>
                  <span className="text-xs font-bold text-[#C5A880]">Техасский Холдем</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1 leading-snug">
                  Классический покер с общими картами (2 карманные + 5 на столе)
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playChipClick();
                  setMode('three_card');
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  mode === 'three_card'
                    ? 'bg-[#1e2026] border-[#C5A880] ring-1 ring-[#C5A880]/40 text-stone-100'
                    : 'bg-[#18191f] border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#C5A880]" />
                  <span className="text-xs font-bold text-[#C5A880]">Трёхкарточный</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1 leading-snug">
                  Быстрый покер против дилера: Ante, Play и бонус Pair Plus
                </p>
              </button>
            </div>
          </div>

          {/* Host Name */}
          <div className="space-y-1">
            <label htmlFor="host-name-input" className="text-xs font-semibold text-stone-400">
              Ваше имя за столом:
            </label>
            <input
              id="host-name-input"
              type="text"
              required
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Введите ваше имя"
              className="w-full bg-[#18191f] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          {/* Starting Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Стартовый стек фишек:</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[500, 1000, 2500, 5000].map((stack) => (
                <button
                  key={stack}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setStartingChips(stack);
                  }}
                  className={`py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                    startingChips === stack
                      ? 'bg-[#1e2026] border-[#C5A880] text-[#C5A880]'
                      : 'bg-[#18191f] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  ${stack}
                </button>
              ))}
            </div>
          </div>

          {/* Stakes / Blinds / Ante */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-400">
              {mode === 'texas_holdem' ? 'Блайнды (Малый / Большой):' : 'Базовая ставка (Ante):'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: mode === 'texas_holdem' ? '$5 / $10' : 'Ante $10', sb: 5, bb: 10, ante: 10 },
                { label: mode === 'texas_holdem' ? '$10 / $20' : 'Ante $25', sb: 10, bb: 20, ante: 25 },
                { label: mode === 'texas_holdem' ? '$25 / $50' : 'Ante $50', sb: 25, bb: 50, ante: 50 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    sounds.playChipClick();
                    setBlindOption(opt);
                  }}
                  className={`py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                    (mode === 'texas_holdem' ? blindOption.bb === opt.bb : blindOption.ante === opt.ante)
                      ? 'bg-[#1e2026] border-[#C5A880] text-[#C5A880]'
                      : 'bg-[#18191f] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Players (Texas only) */}
          {mode === 'texas_holdem' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Вместимость стола:</span>
                </span>
                <span className="font-mono text-xs font-bold text-[#C5A880]">{maxPlayers} игроков</span>
              </label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      sounds.playChipClick();
                      setMaxPlayers(n);
                    }}
                    className={`py-1 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                      maxPlayers === n
                        ? 'bg-[#1e2026] border-[#C5A880] text-[#C5A880]'
                        : 'bg-[#18191f] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Создать лобби комнаты</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
