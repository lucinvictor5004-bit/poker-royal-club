/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export interface ChipConfig {
  value: number;
  label: string;
  bgColor: string;
  edgeColor: string;
  textColor: string;
  accentColor: string;
}

export const CHIP_DENOMINATIONS: ChipConfig[] = [
  {
    value: 5000,
    label: '5K',
    bgColor: 'bg-[#0e4f5c]',
    edgeColor: 'border-[#67e8f9]',
    textColor: 'text-cyan-50',
    accentColor: 'bg-cyan-400',
  },
  {
    value: 1000,
    label: '1K',
    bgColor: 'bg-[#92600e]',
    edgeColor: 'border-[#fde047]',
    textColor: 'text-amber-50',
    accentColor: 'bg-amber-300',
  },
  {
    value: 500,
    label: '500',
    bgColor: 'bg-[#4c1d6e]',
    edgeColor: 'border-[#d8b4fe]',
    textColor: 'text-purple-50',
    accentColor: 'bg-purple-400',
  },
  {
    value: 100,
    label: '100',
    bgColor: 'bg-[#17171a]',
    edgeColor: 'border-[#C5A880]',
    textColor: 'text-[#C5A880]',
    accentColor: 'bg-[#C5A880]',
  },
  {
    value: 25,
    label: '25',
    bgColor: 'bg-[#0b4f32]',
    edgeColor: 'border-[#6ee7b7]',
    textColor: 'text-emerald-50',
    accentColor: 'bg-emerald-400',
  },
  {
    value: 5,
    label: '5',
    bgColor: 'bg-[#7f1d1d]',
    edgeColor: 'border-[#fca5a5]',
    textColor: 'text-red-50',
    accentColor: 'bg-white',
  },
  {
    value: 1,
    label: '1',
    bgColor: 'bg-[#d6d3cd]',
    edgeColor: 'border-[#57534e]',
    textColor: 'text-stone-900',
    accentColor: 'bg-blue-600',
  },
];

export function breakAmountIntoChips(amount: number): { config: ChipConfig; count: number }[] {
  let remaining = amount;
  const result: { config: ChipConfig; count: number }[] = [];

  for (const denom of CHIP_DENOMINATIONS) {
    if (remaining >= denom.value) {
      const count = Math.min(5, Math.floor(remaining / denom.value));
      if (count > 0) {
        result.push({ config: denom, count });
        remaining -= count * denom.value;
      }
    }
  }

  if (result.length === 0 && amount > 0) {
    result.push({ config: CHIP_DENOMINATIONS[CHIP_DENOMINATIONS.length - 1], count: 1 });
  }

  return result;
}

export const SingleChip: React.FC<{
  config: ChipConfig;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ config, size = 'sm', className = '' }) => {
  const sizeMap = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-7 h-7 text-[9px]',
    md: 'w-9 h-9 text-[11px]',
  }[size];

  return (
    <div
      className={`relative rounded-full select-none flex items-center justify-center font-extrabold font-mono border-2 ${config.edgeColor} ${config.bgColor} ${sizeMap} ${className}`}
      style={{
        boxShadow:
          '0 3px 6px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {/* Clay chip edge notches */}
      <div className="absolute inset-[1px] rounded-full border border-dashed border-white/45 pointer-events-none" />

      {/* Recessed center medallion */}
      <div className="w-[70%] h-[70%] rounded-full border border-[#C5A880]/60 flex items-center justify-center bg-black/40 shadow-inner">
        <span className={`leading-none tracking-tighter ${config.textColor}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
};

export const ChipStack: React.FC<{
  amount: number;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}> = ({ amount, size = 'sm', showLabel = true, className = '' }) => {
  if (amount <= 0) return null;

  const chipGroups = breakAmountIntoChips(amount);

  return (
    <motion.div
      key={amount}
      initial={{ opacity: 0.6, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
    >
      <div className="flex items-center -space-x-3">
        {chipGroups.slice(0, 3).map((group, groupIdx) => (
          <div key={groupIdx} className="relative flex flex-col items-center">
            {Array.from({ length: Math.min(4, group.count) }).map((_, chipIdx) => (
              <div
                key={chipIdx}
                className={chipIdx > 0 ? '-mt-4.5' : ''}
                style={{
                  zIndex: chipIdx + groupIdx * 5,
                  transform: `translateY(${chipIdx * -1.8}px)`,
                }}
              >
                <SingleChip config={group.config} size={size} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {showLabel && (
        <span className="font-mono font-bold text-[11px] md:text-xs text-[#E5C99B] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tabular-nums px-2 py-0.5 rounded-md bg-black/75 border border-[#C5A880]/40 shadow-md">
          ${amount.toLocaleString()}
        </span>
      )}
    </motion.div>
  );
};
