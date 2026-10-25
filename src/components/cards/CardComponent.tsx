/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card } from '../../game/engine/Card.ts';

export type CardBackStyle = 'classic-royal' | 'geometric-gold' | 'crimson-dragon' | 'midnight-stars';

interface CardProps {
  card?: Card;
  faceDown?: boolean;
  isWinning?: boolean;
  dimmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  backStyle?: CardBackStyle;
  className?: string;
}

export const CardComponent: React.FC<CardProps> = ({
  card,
  faceDown = false,
  isWinning = false,
  dimmed = false,
  size = 'md',
  backStyle = 'classic-royal',
  className = '',
}) => {
  // Dimensions
  const sizeClasses = {
    sm: 'w-8 h-11 md:w-10 md:h-14 text-[10px] md:text-xs rounded-sm md:rounded-md',
    md: 'w-10 h-14 md:w-14 md:h-20 text-xs md:text-sm rounded-md md:rounded-lg',
    lg: 'w-16 h-22 md:w-20 md:h-28 text-sm md:text-base rounded-lg md:rounded-xl',
  }[size];

  if (faceDown || !card) {
    return (
      <div
        className={`relative select-none shadow-xl border border-amber-900/40 overflow-hidden transform-gpu transition-all duration-300 ${sizeClasses} ${className}`}
        style={{ perspective: 1000 }}
      >
        <CardBackPattern backStyle={backStyle} size={size} />
      </div>
    );
  }

  const isRed = card.isRed;
  const suitColor = isRed ? 'text-red-600' : 'text-slate-900';
  const glowStyle = isWinning
    ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-105 z-10'
    : 'shadow-lg hover:shadow-xl';
  const dimStyle = dimmed ? 'opacity-40 grayscale-[40%]' : 'opacity-100';

  return (
    <div
      className={`relative select-none bg-gradient-to-br from-stone-50 via-white to-stone-100 border border-stone-300/80 font-sans flex flex-col justify-between p-1 md:p-1.5 transition-all duration-300 transform-gpu ${sizeClasses} ${glowStyle} ${dimStyle} ${className}`}
      data-testid={`card-${card.toString()}`}
    >
      {/* Top Left Corner */}
      <div className={`flex flex-col items-center leading-none ${suitColor}`}>
        <span className="font-bold tracking-tighter">{card.rankLabel}</span>
        <span className="text-[10px] md:text-xs">{card.symbol}</span>
      </div>

      {/* Center Art / Large Suit */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`opacity-20 font-serif leading-none select-none ${suitColor} ${
            size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-5xl'
          }`}
        >
          {card.symbol}
        </span>
      </div>

      {/* Court card insignia accent */}
      {card.rank >= 11 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5/6 h-5/6 border border-amber-500/20 rounded flex items-center justify-center">
            <span className={`font-serif font-black opacity-30 ${suitColor}`}>
              {card.rankLabel}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Right Corner (inverted) */}
      <div className={`flex flex-col items-center leading-none rotate-180 self-end ${suitColor}`}>
        <span className="font-bold tracking-tighter">{card.rankLabel}</span>
        <span className="text-[10px] md:text-xs">{card.symbol}</span>
      </div>

      {/* Subtle glossy sheen line */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
    </div>
  );
};

const CardBackPattern: React.FC<{ backStyle: CardBackStyle; size: 'sm' | 'md' | 'lg' }> = ({
  backStyle,
}) => {
  switch (backStyle) {
    case 'geometric-gold':
      return (
        <div className="w-full h-full bg-slate-950 p-1 flex items-center justify-center">
          <div className="w-full h-full border border-amber-500/70 rounded flex items-center justify-center bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:6px_6px]">
            <div className="w-4 h-4 border border-amber-400 rotate-45 flex items-center justify-center">
              <span className="text-amber-400 text-[8px] -rotate-45">♠</span>
            </div>
          </div>
        </div>
      );
    case 'crimson-dragon':
      return (
        <div className="w-full h-full bg-red-950 p-1 flex items-center justify-center">
          <div className="w-full h-full border border-red-500/60 rounded flex items-center justify-center bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:5px_5px]">
            <div className="w-5 h-5 rounded-full border border-amber-400/80 flex items-center justify-center">
              <span className="text-amber-300 text-[10px]">♦</span>
            </div>
          </div>
        </div>
      );
    case 'midnight-stars':
      return (
        <div className="w-full h-full bg-indigo-950 p-1 flex items-center justify-center">
          <div className="w-full h-full border border-indigo-400/50 rounded flex items-center justify-center bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:6px_6px]">
            <div className="w-4 h-4 rounded-sm border border-cyan-300/80 rotate-45 flex items-center justify-center">
              <span className="text-cyan-200 text-[8px] -rotate-45">★</span>
            </div>
          </div>
        </div>
      );
    case 'classic-royal':
    default:
      return (
        <div className="w-full h-full bg-blue-950 p-1 flex items-center justify-center">
          <div className="w-full h-full border-2 border-amber-400/60 rounded flex flex-col items-center justify-center bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:5px_5px]">
            <div className="w-5 h-5 rounded-full border border-amber-300/90 flex items-center justify-center bg-blue-900/80">
              <span className="text-amber-300 text-[10px] leading-none">♠</span>
            </div>
          </div>
        </div>
      );
  }
};
