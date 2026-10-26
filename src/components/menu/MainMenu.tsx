/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, KeyRound, Settings as SettingsIcon, BookOpen, Trophy } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

interface MainMenuProps {
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onCreateRoom,
  onJoinByCode,
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden select-none bg-[#07080a] text-stone-200">
      {/* Subtle Luxury Casino Spotlight Atmosphere */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[900px] h-[900px] rounded-full border border-[#C5A880]/10 bg-[radial-gradient(circle_at_center,rgba(197,168,128,0.09),transparent_68%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(9,59,35,0.22),transparent_70%)]" />
      </div>

      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2.5"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[#D4AF37] text-xl font-serif">♠</span>
          <span className="font-serif font-bold tracking-widest text-sm sm:text-base md:text-lg text-stone-100 uppercase">
            Royal Club Poker
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onJoinByCode();
            }}
            className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#12141a] hover:bg-[#191c24] text-stone-200 hover:text-[#F3E5AB] border border-[#C5A880]/30 text-xs font-semibold transition-all cursor-pointer shadow-md"
            title="Войти по коду"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Войти по коду</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onOpenSettings();
            }}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-[#12141a] hover:bg-[#191c24] text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
            aria-label="Настройки"
            title="Настройки"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      {/* Center Hero Lockup & Actions */}
      <motion.main
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto my-auto py-4"
      >
        {/* Realistic Casino Medallion Crest */}
        <div className="relative mb-6">
          <div className="w-22 h-22 md:w-26 md:h-26 rounded-full border-2 border-[#C5A880]/60 bg-gradient-to-b from-[#1e2028] via-[#111318] to-[#090a0d] shadow-[0_14px_40px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.15)] flex items-center justify-center">
            <div className="w-[82%] h-[82%] rounded-full border border-dashed border-[#C5A880]/40 flex items-center justify-center bg-[#0b291a]/60">
              <span className="text-4xl md:text-5xl text-[#D4AF37] font-serif leading-none drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)]">
                ♠
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif text-[#F3E5AB] tracking-wider uppercase">
          Royal Club Poker
        </h1>

        <p className="mt-2.5 text-xs md:text-sm text-stone-400 max-w-md leading-relaxed font-sans px-2">
          Приватный покерный клуб для игры с друзьями онлайн. Классический Texas Hold'em и Трёхкарточный покер с мгновенным подключением по коду лобби.
        </p>

        {/* Main Action Buttons */}
        <div className="mt-8 w-full max-w-xs space-y-3 px-2 sm:px-0">
          <button
            type="button"
            onClick={() => {
              sounds.playWinFanfare();
              onCreateRoom();
            }}
            data-start="true"
            className="min-h-[50px] w-full py-3.5 px-6 rounded-2xl font-bold text-sm md:text-base text-stone-950 bg-gradient-to-r from-[#D4AF37] via-[#e2c15a] to-[#C5A880] hover:from-[#e3c14d] hover:to-[#d2b48c] shadow-[0_8px_28px_rgba(212,175,55,0.28)] transform hover:scale-[1.015] active:scale-[0.985] transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <PlusCircle className="w-5 h-5 fill-stone-950" />
            <span>Создать комнату</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playButtonClick();
              onJoinByCode();
            }}
            className="min-h-[50px] w-full py-3.5 px-6 rounded-2xl font-semibold text-sm text-stone-100 bg-[#12141a] hover:bg-[#191c24] border border-[#C5A880]/35 hover:border-[#D4AF37]/70 shadow-lg transform hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <KeyRound className="w-4 h-4 text-[#D4AF37]" />
            <span>Войти по коду</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={() => {
                sounds.playButtonClick();
                onOpenRules();
              }}
              className="min-h-[42px] py-2.5 px-3 rounded-xl font-medium text-xs text-stone-300 hover:text-[#F3E5AB] bg-[#101217] hover:bg-[#161920] border border-stone-800/90 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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
              className="min-h-[42px] py-2.5 px-3 rounded-xl font-medium text-xs text-stone-300 hover:text-[#F3E5AB] bg-[#101217] hover:bg-[#161920] border border-stone-800/90 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Статистика</span>
            </button>
          </div>
        </div>
      </motion.main>

      {/* Clean Footer */}
      <footer className="relative z-10 w-full max-w-xl text-center py-2.5 text-xs text-stone-400">
        <span>Создайте приватный стол и передайте 4-значный код комнаты друзьям</span>
      </footer>
    </div>
  );
};
