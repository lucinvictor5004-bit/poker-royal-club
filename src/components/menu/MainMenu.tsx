/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { PlusCircle, KeyRound, Users, Settings as SettingsIcon, BookOpen, Trophy } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

interface MainMenuProps {
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onOpenFriends: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onCreateRoom,
  onJoinByCode,
  onOpenFriends,
  onOpenRules,
  onOpenStats,
  onOpenSettings,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onCreateRoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreateRoom]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden select-none bg-[#0a0b0d] text-stone-200">
      {/* Background Subtle Radial Atmosphere (Muted Luxury Dark Casino) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25 overflow-hidden">
        <div className="w-[850px] h-[850px] rounded-full border border-stone-800 bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(8,48,29,0.2),transparent_75%)]" />
      </div>

      {/* Top Bar / Clean Header */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[#C5A880] text-xl font-serif">♠</span>
          <span className="font-serif font-black tracking-widest text-base md:text-lg text-stone-100 uppercase">
            Royal Club Poker
          </span>
        </div>

        {/* Top actions: Friends, Join by code, Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onJoinByCode();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141518] hover:bg-[#1a1b22] text-stone-300 hover:text-[#C5A880] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Войти по коду</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onOpenFriends();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141518] hover:bg-[#1a1b22] text-stone-300 hover:text-[#C5A880] border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Друзья</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onOpenSettings();
            }}
            className="p-2 rounded-xl bg-[#141518] hover:bg-[#1a1b22] text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
            aria-label="Настройки"
            title="Настройки"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Hero Lockup & Actions */}
      <main className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto my-auto py-6">
        {/* Emblem Crest */}
        <div className="relative mb-5">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-[#C5A880]/50 bg-gradient-to-b from-[#1c1d24] via-[#121316] to-[#0c0d0f] shadow-[0_4px_25px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <span className="text-4xl md:text-5xl text-[#C5A880] font-serif leading-none drop-shadow">
              ♠
            </span>
          </div>
          <div className="absolute -inset-1.5 rounded-full border border-dashed border-[#C5A880]/20 pointer-events-none" />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-black font-serif text-stone-100 tracking-tight uppercase">
          Royal Club Poker
        </h1>

        <p className="mt-2 text-xs md:text-sm text-stone-400 max-w-md leading-relaxed font-sans">
          Онлайн покер для реальных игроков без ботов. Техасский Холдем и Трёхкарточный покер с закрытыми лобби и входом по коду.
        </p>

        {/* Main Action Buttons */}
        <div className="mt-7 w-full max-w-xs space-y-2.5">
          {/* Create Room Primary CTA */}
          <button
            type="button"
            onClick={() => {
              sounds.playWinFanfare();
              onCreateRoom();
            }}
            data-start="true"
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm md:text-base text-stone-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] shadow-[0_4px_20px_rgba(197,168,128,0.25)] transform hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <PlusCircle className="w-5 h-5 fill-stone-950" />
            <span>Создать комнату</span>
          </button>

          {/* Dedicated Separate Button: Join by Code */}
          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onJoinByCode();
            }}
            className="w-full py-3 px-6 rounded-2xl font-semibold text-xs md:text-sm text-stone-200 bg-[#141518] hover:bg-[#1a1b22] border border-stone-800 hover:border-[#C5A880]/50 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <KeyRound className="w-4 h-4 text-[#C5A880]" />
            <span>Войти по коду</span>
          </button>

          {/* Dedicated Separate Button: Friends List */}
          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onOpenFriends();
            }}
            className="w-full py-3 px-6 rounded-2xl font-semibold text-xs md:text-sm text-stone-300 bg-[#141518] hover:bg-[#1a1b22] border border-stone-800 hover:border-stone-700 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Users className="w-4 h-4 text-stone-400" />
            <span>Список друзей</span>
          </button>

          {/* Secondary Utilities: Rules & Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sounds.playButtonClick();
                onOpenRules();
              }}
              className="py-2.5 px-3 rounded-xl font-medium text-xs text-stone-400 hover:text-stone-200 bg-[#121316] hover:bg-[#18191f] border border-stone-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Правила</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playButtonClick();
                onOpenStats();
              }}
              className="py-2.5 px-3 rounded-xl font-medium text-xs text-stone-400 hover:text-stone-200 bg-[#121316] hover:bg-[#18191f] border border-stone-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Статистика</span>
            </button>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 w-full max-w-xl text-center py-3 text-xs text-stone-400">
        <span>Создайте лобби или введите код для совместной онлайн игры</span>
      </footer>
    </div>
  );
};
