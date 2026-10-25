/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Share2, Trash2 } from 'lucide-react';
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

interface FriendsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
}

export const FriendsListModal: React.FC<FriendsListModalProps> = ({
  isOpen,
  onClose,
  currentRoomCode,
}) => {
  const [newFriendName, setNewFriendName] = useState('');
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
    if (currentRoomCode) {
      setInviteSuccessMsg(`Приглашение в комнату ${currentRoomCode} отправлено ${friend.name}!`);
    } else {
      setInviteSuccessMsg(`Приглашение отправлено ${friend.name}!`);
    }
    setTimeout(() => setInviteSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#141518] border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 border-b border-stone-800/80 flex items-center justify-between bg-[#0e0f12]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C5A880]" />
            <h2 className="text-base font-bold text-stone-100">Список друзей ({friends.length})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Add Friend Form */}
          <form onSubmit={handleAddFriend} className="flex gap-2">
            <input
              type="text"
              placeholder="Имя или никнейм друга..."
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              className="flex-1 bg-[#18191f] border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#C5A880]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl font-bold text-xs bg-stone-800 hover:bg-stone-700 text-[#C5A880] border border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </form>

          {/* Status alert */}
          {inviteSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs text-center font-medium">
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
                  className="p-2.5 rounded-xl bg-[#18191f] border border-stone-800/80 flex items-center justify-between gap-2"
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
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#262118] hover:bg-[#332b1f] text-[#C5A880] border border-[#C5A880]/30 transition-colors cursor-pointer flex items-center gap-1"
                      title="Пригласить за стол"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Пригласить</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
