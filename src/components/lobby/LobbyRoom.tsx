/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { type RoomRecord, type RoomPlayerRecord } from '../../services/supabase.ts';
import { Copy, Check, Play, Crown, LogOut } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

interface LobbyRoomProps {
  room: RoomRecord;
  players: RoomPlayerRecord[];
  currentPlayerId: string;
  onStartGame: () => void;
  onToggleReady: () => void;
  onLeaveLobby: () => void;
}

export const LobbyRoom: React.FC<LobbyRoomProps> = ({
  room,
  players,
  currentPlayerId,
  onStartGame,
  onToggleReady,
  onLeaveLobby,
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
    <div className="relative min-h-screen w-full flex flex-col justify-between p-3 sm:p-4 md:p-8 bg-[#0c0d0f] text-stone-200 select-none">
      {/* Top Bar with Room Code prominent on top-right */}
      <header className="flex items-center justify-between gap-2 sm:gap-4 p-2.5 sm:p-3.5 rounded-2xl bg-[#141518]/90 border border-stone-800/80 max-w-4xl mx-auto w-full backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onLeaveLobby}
            className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-bold text-stone-100 flex items-center gap-1.5 truncate">
              <span className="truncate">{modeTitle}</span>
              <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">({stakesTitle})</span>
            </h1>
          </div>
        </div>

        {/* Код лобби справа сверху */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[38px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1b22] hover:bg-[#22242d] border border-[#C5A880]/40 shadow-inner transition-colors cursor-pointer"
            title="Нажмите, чтобы скопировать код лобби"
          >
            <span className="text-[10px] uppercase font-bold text-stone-400 hidden sm:inline">
              Код лобби:
            </span>
            <span className="font-mono text-sm md:text-base font-black text-[#C5A880] tracking-wider">
              {room.code}
            </span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-stone-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Lobby Room Box */}
      <main className="flex-1 flex items-center justify-center py-4 sm:py-6 px-1 sm:px-2">
        <div className="w-full max-w-xl bg-[#141518] border border-stone-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 sm:space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-serif text-[#C5A880]">
              Ожидание игроков в лобби
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
              Сообщите код комнаты{' '}
              <span className="font-mono text-stone-100 font-bold">{room.code}</span> друзьям — они могут ввести как{' '}
              <span className="font-mono text-[#C5A880]">{room.code}</span>, так и просто цифры{' '}
              <span className="font-mono text-[#C5A880]">{room.code.replace('ROYAL-', '')}</span> в окне «Войти по коду».
            </p>
          </div>

          {/* Players Table / List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-400 px-2 font-medium">
              <span>Игроки за столом ({players.length} из {room.maxPlayers})</span>
              <span>Стек фишек</span>
            </div>

            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-0.5">
              {players.map((p, idx) => {
                const isCurrent = p.id === currentPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-[#1b1c24] border-[#C5A880]/60 ring-1 ring-[#C5A880]/30'
                        : 'bg-[#18191f] border-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-xs text-stone-300 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs md:text-sm font-semibold text-stone-100 truncate">
                          {p.name}
                        </span>
                        {p.isHost && (
                          <span title="Хост комнаты" className="shrink-0">
                            <Crown className="w-3.5 h-3.5 text-[#C5A880]" />
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-stone-400 font-normal shrink-0">(Вы)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
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
                    <span className="text-[11px]">Ожидание игрока...</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {isHost ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playWinFanfare();
                  onStartGame();
                }}
                className="min-h-[48px] w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:from-[#e0be48] hover:to-[#d1b58d] text-stone-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
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
                className={`min-h-[48px] w-full py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
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
              onClick={handleCopy}
              className="min-h-[48px] w-full sm:w-auto px-5 py-3.5 rounded-2xl font-semibold text-xs text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#C5A880]" />
                  <span>Скопировать код</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-400 py-2">
        <span>Хост управляет запуском партии · Все участники синхронизируются в реальном времени</span>
      </footer>
    </div>
  );
};
