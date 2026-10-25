/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface ChipConfig {
  value: number;
  label: string;
  bgColor: string;
  edgeColor: string;
  textColor: string;
  accentColor: string;
}

export const CHIP_DENOMINATIONS: ChipConfig[] = [
  { value: 5000, label: '5k', bgColor: 'bg-cyan-800', edgeColor: 'border-cyan-300', textColor: 'text-cyan-100', accentColor: 'bg-cyan-400' },
  { value: 1000, label: '1k', bgColor: 'bg-amber-700', edgeColor: 'border-yellow-300', textColor: 'text-yellow-100', accentColor: 'bg-amber-300' },
  { value: 500, label: '500', bgColor: 'bg-purple-800', edgeColor: 'border-purple-300', textColor: 'text-purple-100', accentColor: 'bg-purple-400' },
  { value: 100, label: '100', bgColor: 'bg-neutral-900', edgeColor: 'border-neutral-400', textColor: 'text-white', accentColor: 'bg-white' },
  { value: 25, label: '25', bgColor: 'bg-emerald-800', edgeColor: 'border-emerald-300', textColor: 'text-emerald-100', accentColor: 'bg-emerald-400' },
  { value: 5, label: '5', bgColor: 'bg-red-800', edgeColor: 'border-red-300', textColor: 'text-red-100', accentColor: 'bg-white' },
  { value: 1, label: '1', bgColor: 'bg-stone-300', edgeColor: 'border-stone-500', textColor: 'text-stone-900', accentColor: 'bg-blue-600' },
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

  // If there's still remainder less than $1
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
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
  }[size];

  return (
    <div
      className={`relative rounded-full select-none flex items-center justify-center font-bold font-mono shadow-md border-2 ${config.edgeColor} ${config.bgColor} ${sizeMap} ${className}`}
      style={{
        boxShadow: '0 2px 5px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
      }}
    >
      {/* Decorative dashed edge markings */}
      <div className="absolute inset-0 rounded-full border border-dashed border-white/40 pointer-events-none" />

      {/* Inner metallic / ring inlay */}
      <div className="w-2/3 h-2/3 rounded-full border border-white/50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
        <span className={`leading-none drop-shadow-sm ${config.textColor}`}>
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
    <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
      <div className="flex items-center -space-x-3.5">
        {chipGroups.slice(0, 3).map((group, groupIdx) => (
          <div key={groupIdx} className="relative flex flex-col items-center">
            {Array.from({ length: Math.min(4, group.count) }).map((_, chipIdx) => (
              <div
                key={chipIdx}
                className={chipIdx > 0 ? '-mt-4.5' : ''}
                style={{
                  zIndex: chipIdx + groupIdx * 5,
                  transform: `translateY(${chipIdx * -1.5}px)`,
                }}
              >
                <SingleChip config={group.config} size={size} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {showLabel && (
        <span className="font-mono font-semibold text-xs md:text-sm text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/30">
          ${amount.toLocaleString()}
        </span>
      )}
    </div>
  );
};
