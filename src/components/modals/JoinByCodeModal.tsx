/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, KeyRound, LogIn, AlertCircle } from 'lucide-react';
import { normalizeRoomCode } from '../../services/supabase.ts';
import { sounds } from '../../utils/soundEffects.ts';

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinByCode: (code: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  isOpen,
  onClose,
  onJoinByCode,
}) => {
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('poker_player_name') || 'Гость';
    } catch {
      return 'Гость';
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const normalizedPreview = normalizeRoomCode(code);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = normalizeRoomCode(code);
    if (!formattedCode) return;

    const trimmedName = playerName.trim() || 'Гость';
    try {
      localStorage.setItem('poker_player_name', trimmedName);
    } catch {
      // ignore
    }

    setError(null);
    setIsSubmitting(true);
    sounds.playButtonClick();

    const res = await onJoinByCode(formattedCode, trimmedName);
    setIsSubmitting(false);

    if (res.success) {
      sounds.playWinFanfare();
      setCode('');
      onClose();
    } else {
      setError(res.error || 'Не удалось войти в комнату. Проверьте код.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#141518] border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800/80 flex items-center justify-between bg-[#0e0f12]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#C5A880]" />
            <h2 className="text-base font-bold text-stone-100">Вход в комнату по коду</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">
            Введите код комнаты целиком (<span className="font-mono text-[#C5A880]">ROYAL-4821</span>) или только 4 цифры (<span className="font-mono text-[#C5A880]">4821</span>), которые сообщил хост.
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-room-code" className="text-xs font-semibold text-stone-400">
                Код комнаты:
              </label>
              {normalizedPreview && (
                <span className="text-[11px] font-mono text-[#C5A880]">
                  Будет выполнен вход в: <strong>{normalizedPreview}</strong>
                </span>
              )}
            </div>
            <input
              id="input-room-code"
              type="text"
              required
              autoFocus
              placeholder="ROYAL-4821 или 4821"
              value={code}
              onChange={(e) => {
                setError(null);
                setCode(e.target.value.toUpperCase());
              }}
              className="w-full bg-[#18191f] border border-stone-800 rounded-xl px-3.5 py-3 text-base font-mono text-[#C5A880] tracking-wider uppercase focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="input-player-name" className="text-xs font-semibold text-stone-400">
              Ваше имя за столом:
            </label>
            <input
              id="input-player-name"
              type="text"
              required
              placeholder="Введите никнейм"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-[#18191f] border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="min-h-[48px] w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Поиск комнаты и подключение...' : 'Войти в лобби'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
