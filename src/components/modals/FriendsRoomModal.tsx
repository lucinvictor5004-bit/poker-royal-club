/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, UserPlus, LogIn, Share2, Trash2 } from 'lucide-react';
import { sounds } from '../../utils/soundEffects.ts';

export interface FriendItem {
  id: string;
  name: string;
  status: 'online' | 'in_game' | 'offline';
}

const DEFAULT_FRIENDS: FriendItem[] = [
  { id: 'f1', name: 'Александр (Shark)', status: 'online' },
  { id: 'f2', name: 'Михаил (AllIn)', status: 'in_game' },
  { id: 'f3', name: 'Анна (Royal)', status: 'online' },
];

interface FriendsRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onJoinRoom: (code: string) => void;
}

export const FriendsRoomModal: React.FC<FriendsRoomModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onJoinRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'room' | 'friends'>('room');
  const [inputCode, setInputCode] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  const [friends, setFriends] = useState<FriendItem[]>(() => {
    try {
      const saved = localStorage.getItem('poker_friends_list');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_FRIENDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('poker_friends_list', JSON.stringify(friends));
    } catch {
      // ignore
    }
  }, [friends]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    sounds.playButtonClick();
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    sounds.playWinFanfare();
    onJoinRoom(inputCode.trim().toUpperCase());
    onClose();
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFriendName.trim();
    if (!name) return;

    sounds.playChipClick();
    const newFriend: FriendItem = {
      id: `friend_${Date.now()}`,
      name,
      status: 'online',
    };
    setFriends((prev) => [newFriend, ...prev]);
    setNewFriendName('');
  };

  const handleRemoveFriend = (id: string) => {
    sounds.playButtonClick();
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleInviteFriend = (friend: FriendItem) => {
    sounds.playCardSlide();
    setInviteSuccessMsg(`Приглашение в комнату ${roomCode} отправлено ${friend.name}!`);
    setTimeout(() => setInviteSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Комната и друзья</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 bg-stone-900/60">
          <button
            type="button"
            onClick={() => setActiveTab('room')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'room'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Код комнаты & Вход
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Список друзей ({friends.length})
          </button>
        </div>

        {/* Tab 1: Room Code & Join */}
        {activeTab === 'room' && (
          <div className="p-5 space-y-5">
            {/* Current Room Code */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-stone-800 text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-stone-400 font-bold">
                Код текущей комнаты
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl md:text-3xl font-black text-amber-300 tracking-wider">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/50 shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Скопировать код"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-stone-400">
                Передайте этот код друзьям, чтобы они могли сесть за ваш стол.
              </p>
            </div>

            {/* Notification alert */}
            {inviteSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs text-center font-medium animate-fade-in">
                {inviteSuccessMsg}
              </div>
            )}

            {/* Join Room by Code Form */}
            <form onSubmit={handleJoinSubmit} className="space-y-3 pt-2 border-t border-stone-800">
              <label htmlFor="room-code-input" className="block text-xs font-semibold text-stone-300">
                Войти в комнату друга по коду:
              </label>
              <div className="flex gap-2">
                <input
                  id="room-code-input"
                  type="text"
                  placeholder="Например: ROYAL-4821"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Friends Management */}
        {activeTab === 'friends' && (
          <div className="p-5 space-y-4">
            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="text"
                placeholder="Имя или никнейм друга..."
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl font-bold text-xs bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </form>

            {/* Notification alert */}
            {inviteSuccessMsg && (
              <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs text-center font-medium animate-fade-in">
                {inviteSuccessMsg}
              </div>
            )}

            {/* Friends List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {friends.length === 0 ? (
                <div className="text-center text-xs text-stone-500 py-6">
                  Список друзей пуст. Добавьте друзей выше!
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-2.5 rounded-xl bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-stone-200 truncate">
                        {friend.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInviteFriend(friend)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 transition-colors cursor-pointer flex items-center gap-1"
                        title="Пригласить за стол"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Пригласить</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Удалить из друзей"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
