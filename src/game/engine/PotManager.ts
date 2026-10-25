/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type EvaluatedHand, HandEvaluator } from './HandEvaluator.ts';

export interface PotSlice {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PotPayout {
  playerId: string;
  amount: number;
  potIndex: number;
  hand?: EvaluatedHand;
}

export class PotManager {
  // Maps playerId -> total chips contributed to current hand across all streets
  private contributions: Map<string, number> = new Map();

  reset(): void {
    this.contributions.clear();
  }

  addContribution(playerId: string, amount: number): void {
    if (amount <= 0) return;
    const current = this.contributions.get(playerId) || 0;
    this.contributions.set(playerId, current + amount);
  }

  getContribution(playerId: string): number {
    return this.contributions.get(playerId) || 0;
  }

  getTotalPot(): number {
    let total = 0;
    for (const amt of this.contributions.values()) {
      total += amt;
    }
    return total;
  }

  /**
   * Calculates main pot and all side pots based on player contributions and fold states.
   * activePlayerIds: all players who have NOT folded
   */
  calculatePots(activePlayerIds: string[]): PotSlice[] {
    const activeSet = new Set(activePlayerIds);
    // Find all distinct non-zero contribution levels
    const contribEntries = Array.from(this.contributions.entries())
      .filter(([_, amount]) => amount > 0)
      .map(([playerId, amount]) => ({ playerId, amount }));

    if (contribEntries.length === 0) {
      return [];
    }

    // Get unique contribution amounts sorted ascending
    const levels = Array.from(new Set(contribEntries.map((e) => e.amount))).sort((a, b) => a - b);

    const pots: PotSlice[] = [];
    let previousLevel = 0;

    for (const level of levels) {
      const sliceSize = level - previousLevel;
      if (sliceSize <= 0) continue;

      let potAmount = 0;
      const eligible: string[] = [];

      for (const entry of contribEntries) {
        if (entry.amount >= level) {
          potAmount += sliceSize;
          if (activeSet.has(entry.playerId)) {
            eligible.push(entry.playerId);
          }
        } else if (entry.amount > previousLevel) {
          potAmount += entry.amount - previousLevel;
          if (activeSet.has(entry.playerId)) {
            eligible.push(entry.playerId);
          }
        }
      }

      if (potAmount > 0) {
        // If there are eligible players, record the pot slice
        // If there are no active players (everyone folded), the last unfolded player takes it
        pots.push({
          amount: potAmount,
          eligiblePlayerIds: eligible.length > 0 ? eligible : Array.from(activeSet),
        });
      }

      previousLevel = level;
    }

    // Merge adjacent pots with identical eligible players
    const mergedPots: PotSlice[] = [];
    for (const pot of pots) {
      if (mergedPots.length === 0) {
        mergedPots.push({ ...pot });
      } else {
        const last = mergedPots[mergedPots.length - 1];
        const sameEligible =
          last.eligiblePlayerIds.length === pot.eligiblePlayerIds.length &&
          last.eligiblePlayerIds.every((id) => pot.eligiblePlayerIds.includes(id));

        if (sameEligible) {
          last.amount += pot.amount;
        } else {
          mergedPots.push({ ...pot });
        }
      }
    }

    return mergedPots;
  }

  /**
   * Distributes all pots to winners.
   * playerHands: Map of playerId -> EvaluatedHand for showdown
   * activePlayerIds: Players still in hand (not folded)
   */
  distributePots(
    playerHands: Map<string, EvaluatedHand>,
    activePlayerIds: string[]
  ): PotPayout[] {
    const pots = this.calculatePots(activePlayerIds);
    const payouts: PotPayout[] = [];

    // If only 1 player is left active (everyone else folded)
    if (activePlayerIds.length === 1) {
      const soleWinner = activePlayerIds[0];
      const total = this.getTotalPot();
      payouts.push({
        playerId: soleWinner,
        amount: total,
        potIndex: 0,
      });
      return payouts;
    }

    // Process each pot from main pot to side pots
    for (let i = 0; i < pots.length; i++) {
      const pot = pots[i];
      if (pot.amount <= 0) continue;

      // Find highest hand among eligible players
      const eligibleHands = pot.eligiblePlayerIds
        .map((id) => ({ id, hand: playerHands.get(id) }))
        .filter((entry): entry is { id: string; hand: EvaluatedHand } => entry.hand !== undefined);

      if (eligibleHands.length === 0) {
        // Fallback: distribute to first active player if hand missing
        if (activePlayerIds.length > 0) {
          payouts.push({
            playerId: activePlayerIds[0],
            amount: pot.amount,
            potIndex: i,
          });
        }
        continue;
      }

      // Sort eligible hands descending
      eligibleHands.sort((a, b) => HandEvaluator.compareHands(b.hand, a.hand));
      const winningHand = eligibleHands[0].hand;

      // Find all tied winners
      const winners = eligibleHands.filter(
        (entry) => HandEvaluator.compareHands(entry.hand, winningHand) === 0
      );

      const splitAmount = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount % winners.length;

      for (const winner of winners) {
        let winShare = splitAmount;
        if (remainder > 0) {
          winShare += 1;
          remainder--;
        }
        payouts.push({
          playerId: winner.id,
          amount: winShare,
          potIndex: i,
          hand: winner.hand,
        });
      }
    }

    return payouts;
  }
}
