/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Volume2, VolumeX, Sliders, Palette, Zap, Sparkles } from 'lucide-react';
import { type TableFeltColor } from '../table/PokerTable.tsx';
import { type CardBackStyle } from '../cards/CardComponent.tsx';
import { sounds } from '../../utils/soundEffects.ts';

export interface GameSettings {
  volume: number;
  isMuted: boolean;
  feltColor: TableFeltColor;
  backStyle: CardBackStyle;
  animSpeed: 'normal' | 'fast' | 'instant';
  showTrainingOdds?: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const feltOptions: { id: TableFeltColor; label: string; previewClass: string }[] = [
    { id: 'emerald', label: 'Изумрудный (Классика)', previewClass: 'bg-emerald-800' },
    { id: 'sapphire', label: 'Сапфировый (Royal Blue)', previewClass: 'bg-blue-800' },
    { id: 'burgundy', label: 'Бордо (VIP Casino)', previewClass: 'bg-red-900' },
    { id: 'midnight', label: 'Полуночный (Obsidian)', previewClass: 'bg-neutral-900' },
  ];

  const cardBackOptions: { id: CardBackStyle; label: string; bgClass: string }[] = [
    { id: 'classic-royal', label: 'Королевский синий', bgClass: 'bg-blue-900' },
    { id: 'geometric-gold', label: 'Золотой орнамент', bgClass: 'bg-amber-800' },
    { id: 'crimson-dragon', label: 'Красный бархат', bgClass: 'bg-red-900' },
    { id: 'midnight-stars', label: 'Ночные звезды', bgClass: 'bg-indigo-950' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Настройки игры</h2>
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
          {/* Audio Volume & Mute */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5 text-stone-300">
                {settings.isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
                <span>Громкость звуков</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const newMuted = !settings.isMuted;
                  sounds.setMuted(newMuted);
                  onUpdateSettings({ isMuted: newMuted });
                }}
                className={`text-xs px-2.5 py-1 rounded font-semibold cursor-pointer transition-colors ${
                  settings.isMuted
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {settings.isMuted ? 'Включить' : 'Без звука'}
              </button>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={settings.isMuted}
              value={settings.volume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                sounds.setVolume(vol);
                onUpdateSettings({ volume: vol });
              }}
              aria-label="Громкость звуков"
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Table Felt Color Selection */}
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-1.5 text-stone-300">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Цвет сукна покерного стола</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {feltOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    sounds.playButtonClick();
                    onUpdateSettings({ feltColor: opt.id });
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    settings.feltColor === opt.id
                      ? 'bg-stone-800/90 border-amber-400 ring-2 ring-amber-400/40 text-amber-200'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border border-white/20 ${opt.previewClass}`} />
                  <span className="text-xs font-medium truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Back Style Selection */}
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-1.5 text-stone-300">
              <span>Рубашка игральных карт</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {cardBackOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    sounds.playButtonClick();
                    onUpdateSettings({ backStyle: opt.id });
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    settings.backStyle === opt.id
                      ? 'bg-stone-800/90 border-amber-400 ring-2 ring-amber-400/40 text-amber-200'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className={`w-4 h-6 rounded-xs border border-white/30 ${opt.bgClass}`} />
                  <span className="text-xs font-medium truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Animation & Bot Speed */}
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-1.5 text-stone-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Скорость анимаций и ходов ботов</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'fast', 'instant'] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    sounds.playButtonClick();
                    onUpdateSettings({ animSpeed: spd });
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                    settings.animSpeed === spd
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {spd === 'normal' ? 'Обычная (1.2с)' : spd === 'fast' ? 'Быстрая (0.6с)' : 'Мгновенно'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
