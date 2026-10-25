/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { type RoomRecord, type RoomPlayerRecord } from '../../services/supabase.ts';
import { Copy, Check, Users, Play, Crown, LogOut, Share2 } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

interface LobbyRoomProps {
  room: RoomRecord;
  players: RoomPlayerRecord[];
  currentPlayerId: string;
  onStartGame: () => void;
  onToggleReady: () => void;
  onLeaveLobby: () => void;
  onOpenFriends: () => void;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  room,
  players,
  currentPlayerId,
  onStartGame,
  onToggleReady,
  onLeaveLobby,
  onOpenFriends,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === currentPlayerId;
  const currentPlayer = players.find((p) => p.id === currentPlayerId);

  const handleCopy = async () => {
    sounds.playButtonClick();
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const modeTitle = room.mode === 'three_card' ? 'Трёхкарточный покер' : "Texas Hold'em";
  const stakesTitle =
    room.mode === 'three_card'
      ? `Ante $${room.ante}`
      : `Блайнды $${room.smallBlind}/$${room.bigBlind}`;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-8 bg-[#0c0d0f] text-stone-200 select-none">
      {/* Top Bar with Room Code prominent on top-right */}
      <header className="flex items-center justify-between gap-4 p-3 md:p-4 rounded-2xl bg-[#141518]/90 border border-stone-800/80 max-w-4xl mx-auto w-full backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onLeaveLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
          <div>
            <h1 className="text-xs md:text-sm font-bold text-stone-100 flex items-center gap-1.5">
              <span>{modeTitle}</span>
              <span className="text-[10px] text-stone-500 font-mono">({stakesTitle})</span>
            </h1>
          </div>
        </div>

        {/* 2. Код лобби справа сверху */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1b22] border border-[#C5A880]/40 shadow-inner">
            <span className="text-[10px] uppercase font-bold text-stone-400 hidden sm:inline">
              Код лобби:
            </span>
            <span className="font-mono text-sm md:text-base font-black text-[#C5A880] tracking-wider">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-md hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer ml-1"
              title="Скопировать код"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFriends}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-[#C5A880] border border-stone-800 transition-colors cursor-pointer"
            title="Пригласить друзей"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Lobby Room Box */}
      <main className="flex-1 flex items-center justify-center py-6 px-2">
        <div className="w-full max-w-xl bg-[#141518] border border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl md:text-2xl font-bold font-serif text-[#C5A880]">
              Ожидание игроков в лобби
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Сообщите код комнаты <span className="font-mono text-stone-100 font-bold">{room.code}</span> друзьям, чтобы они ввели его в поле «Войти по коду».
            </p>
          </div>

          {/* Players Table / List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-400 px-2 font-medium">
              <span>Игроки за столом ({players.length} из {room.maxPlayers})</span>
              <span>Стек фишек</span>
            </div>

            <div className="space-y-2">
              {players.map((p, idx) => {
                const isCurrent = p.id === currentPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-[#1b1c24] border-[#C5A880]/60 ring-1 ring-[#C5A880]/30'
                        : 'bg-[#18191f] border-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-xs text-stone-300">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs md:text-sm font-semibold text-stone-100">
                          {p.name}
                        </span>
                        {p.isHost && (
                          <span title="Хост комнаты">
                            <Crown className="w-3.5 h-3.5 text-[#C5A880]" />
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-stone-400 font-normal">(Вы)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs md:text-sm font-bold text-[#C5A880] tabular-nums">
                        ${p.chips.toLocaleString()}
                      </span>
                      {p.isHost ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/30">
                          ХОСТ
                        </span>
                      ) : p.isReady ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          ГОТОВ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                          ЖДЁТ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty seats indicator */}
              {Array.from({ length: Math.max(0, Math.min(3, room.maxPlayers - players.length)) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl border border-dashed border-stone-800/60 bg-[#121316]/50 flex items-center justify-between text-xs text-stone-400 px-4"
                  >
                    <span>Свободное место #{players.length + i + 1}</span>
                    <span className="text-[11px]">Ожидание подключения...</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {isHost ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playWinFanfare();
                  onStartGame();
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span>Начать игру за столом</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sounds.playButtonClick();
                  onToggleReady();
                }}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  currentPlayer?.isReady
                    ? 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-600'
                    : 'bg-[#C5A880] hover:bg-[#d6bb96] text-stone-950'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{currentPlayer?.isReady ? 'Вы готовы к игре' : 'Я готов'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenFriends}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-semibold text-xs text-stone-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Users className="w-4 h-4 text-[#C5A880]" />
              <span>Позвать друга</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-400 py-3">
        <span>Хост управляет запуском партии · Все участники видят обновления в реальном времени</span>
      </footer>
    </div>
  );
};
