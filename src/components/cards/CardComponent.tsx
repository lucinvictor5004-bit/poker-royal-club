/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../game/engine/Card.ts';
import { sounds } from '../../utils/soundEffects.ts';

export type CardBackStyle = 'classic-royal' | 'geometric-gold' | 'crimson-dragon' | 'midnight-stars';

interface CardProps {
  card?: Card;
  faceDown?: boolean;
  isWinning?: boolean;
  dimmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  backStyle?: CardBackStyle;
  className?: string;
  /** Delay in ms for staggered dealing animation */
  dealDelayMs?: number;
  /** Starting X offset in px relative to final card position (simulates flying from dealer shoe) */
  dealFromX?: number;
  /** Starting Y offset in px relative to final card position (simulates flying from dealer shoe) */
  dealFromY?: number;
  /** Play subtle card dealing sound when animation starts */
  playDealSound?: boolean;
}

export const CardComponent: React.FC<CardProps> = ({
  card,
  faceDown = false,
  isWinning = false,
  dimmed = false,
  size = 'md',
  backStyle = 'classic-royal',
  className = '',
  dealDelayMs = 0,
  dealFromX = 0,
  dealFromY = -90,
  playDealSound = false,
}) => {
  const hasPlayedSoundRef = useRef(false);

  const rawCard = card as Card | { suit: Card['suit']; rank: Card['rank']; id?: string } | undefined;
  const hydratedCard = rawCard
    ? rawCard instanceof Card
      ? rawCard
      : new Card(rawCard.suit, rawCard.rank)
    : null;

  const cardIdentity = hydratedCard ? hydratedCard.id : 'facedown';

  useEffect(() => {
    if (!playDealSound || hasPlayedSoundRef.current) return;
    hasPlayedSoundRef.current = true;
    const timer = setTimeout(() => {
      sounds.playCardSlide();
    }, dealDelayMs);
    return () => clearTimeout(timer);
  }, [cardIdentity, dealDelayMs, playDealSound]);

  // Dimensions with classic poker bridge/jumbo proportions
  const sizeClasses = {
    sm: 'w-9 h-13 md:w-11 md:h-16 text-[10px] md:text-xs rounded-[5px] md:rounded-[7px]',
    md: 'w-11 h-16 md:w-15 md:h-22 text-xs md:text-sm rounded-[6px] md:rounded-[9px]',
    lg: 'w-16 h-23 md:w-21 md:h-30 text-sm md:text-base rounded-[8px] md:rounded-[11px]',
  }[size];

  const delaySec = Math.max(0, dealDelayMs) / 1000;

  if (faceDown || !hydratedCard) {
    return (
      <motion.div
        key={`back-${cardIdentity}`}
        initial={{
          opacity: 0,
          x: dealFromX,
          y: dealFromY,
          scale: 0.72,
          rotate: -8,
        }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
        }}
        transition={{
          duration: 0.52,
          delay: delaySec,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`relative select-none playing-card-back border border-[#C5A880]/45 overflow-hidden transform-gpu ${sizeClasses} ${className}`}
      >
        <CardBackPattern backStyle={backStyle} size={size} />
      </motion.div>
    );
  }

  const isRed = hydratedCard.isRed;
  const suitColor = isRed ? 'text-[#b91c1c]' : 'text-[#141619]';
  const glowStyle = isWinning
    ? 'ring-2 ring-[#D4AF37] shadow-[0_0_26px_rgba(212,175,55,0.85)] -translate-y-1.5 scale-105 z-20'
    : 'hover:-translate-y-0.5';
  const dimStyle = dimmed ? 'opacity-40 grayscale-[45%]' : 'opacity-100';

  return (
    <motion.div
      key={`face-${hydratedCard.id}`}
      initial={{
        opacity: 0,
        x: dealFromX,
        y: dealFromY,
        scale: 0.72,
        rotateY: 165,
        rotateZ: -6,
      }}
      animate={{
        opacity: dimmed ? 0.4 : 1,
        x: 0,
        y: isWinning ? -6 : 0,
        scale: isWinning ? 1.05 : 1,
        rotateY: 0,
        rotateZ: 0,
      }}
      transition={{
        duration: 0.56,
        delay: delaySec,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className={`relative select-none playing-card-face font-sans flex flex-col justify-between p-1 md:p-1.5 transition-shadow duration-300 transform-gpu ${sizeClasses} ${glowStyle} ${dimStyle} ${className}`}
      data-testid={`card-${hydratedCard.toString()}`}
    >
      {/* Inner subtle border frame on ivory stock */}
      <div className="absolute inset-[2px] md:inset-[3px] rounded-[4px] md:rounded-[6px] border border-stone-400/20 pointer-events-none" />

      {/* Top Left Corner Index */}
      <div className={`relative z-10 flex flex-col items-center leading-none ${suitColor}`}>
        <span className="font-extrabold tracking-tighter leading-[0.95]">
          {hydratedCard.rankLabel}
        </span>
        <span className="text-[9px] md:text-[11px] leading-none mt-0.5">
          {hydratedCard.symbol}
        </span>
      </div>

      {/* Center Art / Pip or Royal Court Frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {hydratedCard.rank >= 11 ? (
          <div className="w-[72%] h-[68%] rounded-[3px] border border-[#C5A880]/45 bg-gradient-to-b from-[#f6f0e2]/80 via-transparent to-[#efe6d2]/80 flex flex-col items-center justify-center relative overflow-hidden">
            <span
              className={`font-serif font-black leading-none select-none opacity-25 ${suitColor} ${
                size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-4xl'
              }`}
            >
              {hydratedCard.rankLabel}
            </span>
            <span
              className={`leading-none select-none ${suitColor} ${
                size === 'sm' ? 'text-xs' : size === 'md' ? 'text-base' : 'text-2xl'
              }`}
            >
              {hydratedCard.symbol}
            </span>
          </div>
        ) : (
          <span
            className={`font-serif leading-none select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${suitColor} ${
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl md:text-3xl' : 'text-4xl'
            }`}
          >
            {hydratedCard.symbol}
          </span>
        )}
      </div>

      {/* Bottom Right Corner Index (inverted) */}
      <div
        className={`relative z-10 flex flex-col items-center leading-none rotate-180 self-end ${suitColor}`}
      >
        <span className="font-extrabold tracking-tighter leading-[0.95]">
          {hydratedCard.rankLabel}
        </span>
        <span className="text-[9px] md:text-[11px] leading-none mt-0.5">
          {hydratedCard.symbol}
        </span>
      </div>

      {/* Subtle warm specular paper sheen */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
    </motion.div>
  );
};

const CardBackPattern: React.FC<{ backStyle: CardBackStyle; size: 'sm' | 'md' | 'lg' }> = ({
  backStyle,
}) => {
  switch (backStyle) {
    case 'geometric-gold':
      return (
        <div className="w-full h-full bg-[#111216] p-[3px] flex items-center justify-center">
          <div className="w-full h-full border border-[#C5A880]/70 rounded-[3px] flex items-center justify-center bg-[radial-gradient(#C5A880_1px,transparent_1px)] [background-size:6px_6px]">
            <div className="w-4 h-4 md:w-5 md:h-5 border border-[#C5A880] rotate-45 flex items-center justify-center bg-[#111216]/90 shadow-inner">
              <span className="text-[#C5A880] text-[8px] md:text-[10px] -rotate-45">♠</span>
            </div>
          </div>
        </div>
      );
    case 'crimson-dragon':
      return (
        <div className="w-full h-full bg-[#2b090e] p-[3px] flex items-center justify-center">
          <div className="w-full h-full border border-[#D4AF37]/65 rounded-[3px] flex items-center justify-center bg-[radial-gradient(#991b1b_1px,transparent_1px)] [background-size:5px_5px]">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-[#D4AF37]/90 flex items-center justify-center bg-[#2b090e]/90">
              <span className="text-[#D4AF37] text-[9px] md:text-[10px]">♦</span>
            </div>
          </div>
        </div>
      );
    case 'midnight-stars':
      return (
        <div className="w-full h-full bg-[#0c1326] p-[3px] flex items-center justify-center">
          <div className="w-full h-full border border-sky-300/50 rounded-[3px] flex items-center justify-center bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:6px_6px]">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-sm border border-sky-200/80 rotate-45 flex items-center justify-center bg-[#0c1326]/90">
              <span className="text-sky-200 text-[8px] md:text-[9px] -rotate-45">♠</span>
            </div>
          </div>
        </div>
      );
    case 'classic-royal':
    default:
      return (
        <div className="w-full h-full bg-[#141b2d] p-[3px] flex items-center justify-center">
          <div className="w-full h-full border border-[#C5A880]/75 rounded-[3px] flex flex-col items-center justify-center bg-[radial-gradient(rgba(197,168,128,0.42)_1px,transparent_1px)] [background-size:5px_5px]">
            <div className="w-4 h-4 md:w-6 md:h-6 rounded-full border border-[#C5A880] flex items-center justify-center bg-[#0f1523] shadow-md">
              <span className="text-[#C5A880] text-[9px] md:text-[11px] leading-none font-serif">
                ♠
              </span>
            </div>
          </div>
        </div>
      );
  }
};
