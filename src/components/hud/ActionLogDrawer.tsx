/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { type ActionLogItem } from '../../game/engine/PokerEngine.ts';
import { ScrollText, X } from 'lucide-react';

interface ActionLogDrawerProps {
  logs: ActionLogItem[];
  handNumber: number;
}

export const ActionLogDrawer: React.FC<ActionLogDrawerProps> = ({ logs, handNumber }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-700/60 shadow-lg text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
        aria-label="Открыть журнал действий"
      >
        <ScrollText className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">История (Раздача #{handNumber})</span>
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-80 md:w-96 bg-black/95 border-l border-amber-500/30 shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-amber-200 text-sm">Журнал партии</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-stone-500 py-8">История пуста</div>
            ) : (
              logs.slice().reverse().map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                let badgeColor = 'text-stone-400';
                if (log.type === 'action') badgeColor = 'text-amber-300';
                else if (log.type === 'win') badgeColor = 'text-yellow-400 font-bold';
                else if (log.type === 'deal') badgeColor = 'text-cyan-400 font-semibold';

                return (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-stone-900/60 border border-stone-800/80 leading-relaxed"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                      <span>{log.playerName || 'Система'}</span>
                      <span>{timeStr}</span>
                    </div>
                    <div className={badgeColor}>{log.message}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};
