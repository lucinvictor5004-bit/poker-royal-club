/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, type Rank, type Suit } from './Card.ts';
import { HandEvaluator, HandRank, type EvaluatedHand } from './HandEvaluator.ts';

export interface HandAnalysis {
  currentHand: EvaluatedHand | null;
  winProbability: number; // 0 to 1
  outsCount: number;
  outsDescription: string[];
  potOdds: number; // e.g. 0.25 (25%)
  isPotOddsFavorable: boolean;
  advice: 'fold' | 'check' | 'call' | 'raise';
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export class HandOdds {
  /**
   * Fast evaluation of hand equity (win probability).
   * Uses fast Monte Carlo or analytical heuristics based on known cards.
   */
  static calculateWinProbability(
    holeCards: Card[],
    communityCards: Card[],
    opponentsCount: number = 1,
    simulations: number = 80
  ): number {
    if (holeCards.length < 2) return 0.5;

    // Build known card set
    const knownIds = new Set<string>();
    holeCards.forEach((c) => knownIds.add(c.id));
    communityCards.forEach((c) => knownIds.add(c.id));

    // Available cards in deck
    const availableCards: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const c = new Card(suit, rank);
        if (!knownIds.has(c.id)) {
          availableCards.push(c);
        }
      }
    }

    const cardsToDeal = 5 - communityCards.length;
    let wins = 0;
    let ties = 0;

    for (let sim = 0; sim < simulations; sim++) {
      // Shuffle available cards partially
      const pool = [...availableCards];
      for (let i = pool.length - 1; i > pool.length - 1 - (cardsToDeal + opponentsCount * 2); i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
      }

      // Complete community cards
      const simCommunity = [...communityCards];
      for (let i = 0; i < cardsToDeal; i++) {
        simCommunity.push(pool.pop()!);
      }

      // Evaluate hero
      const heroHand = HandEvaluator.evaluate([...holeCards, ...simCommunity]);

      // Deal and evaluate opponents
      let heroWins = true;
      let heroTies = false;

      for (let op = 0; op < opponentsCount; op++) {
        const opCard1 = pool.pop()!;
        const opCard2 = pool.pop()!;
        const opHand = HandEvaluator.evaluate([opCard1, opCard2, ...simCommunity]);

        const comp = HandEvaluator.compareHands(heroHand, opHand);
        if (comp < 0) {
          heroWins = false;
          heroTies = false;
          break;
        } else if (comp === 0) {
          heroTies = true;
        }
      }

      if (heroWins && !heroTies) {
        wins++;
      } else if (heroTies && heroWins) {
        ties++;
      }
    }

    return (wins + ties * 0.5) / simulations;
  }

  /**
   * Count outs on Flop or Turn: remaining cards that improve hand to a stronger rank.
   */
  static countOuts(holeCards: Card[], communityCards: Card[]): { count: number; descriptions: string[] } {
    if (communityCards.length < 3 || communityCards.length >= 5) {
      return { count: 0, descriptions: [] };
    }

    const currentHand = HandEvaluator.evaluate([...holeCards, ...communityCards]);
    const knownIds = new Set([...holeCards, ...communityCards].map((c) => c.id));
    const descriptions: string[] = [];

    const availableCards: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const c = new Card(suit, rank);
        if (!knownIds.has(c.id)) {
          availableCards.push(c);
        }
      }
    }

    let outsCount = 0;
    const flushOuts: Card[] = [];
    const straightOuts: Card[] = [];
    const pairTripsOuts: Card[] = [];

    for (const candidate of availableCards) {
      const nextHand = HandEvaluator.evaluate([...holeCards, ...communityCards, candidate]);
      if (nextHand.rank > currentHand.rank) {
        outsCount++;
        if (nextHand.rank === HandRank.FLUSH) {
          flushOuts.push(candidate);
        } else if (nextHand.rank === HandRank.STRAIGHT) {
          straightOuts.push(candidate);
        } else {
          pairTripsOuts.push(candidate);
        }
      }
    }

    if (flushOuts.length >= 8) {
      descriptions.push(`Флеш-дро (${flushOuts.length} аутов)`);
    }
    if (straightOuts.length >= 8) {
      descriptions.push(`Двусторонний стрит-дро (${straightOuts.length} аутов)`);
    } else if (straightOuts.length >= 4) {
      descriptions.push(`Гатшот стрит-дро (${straightOuts.length} аута)`);
    }
    if (pairTripsOuts.length > 0 && descriptions.length === 0) {
      descriptions.push(`Улучшение пары/сета (${pairTripsOuts.length} аутов)`);
    }

    return { count: outsCount, descriptions };
  }

  /**
   * Calculate full hand analysis including pot odds
   */
  static analyzeHand(
    holeCards: Card[],
    communityCards: Card[],
    pot: number,
    callAmount: number,
    opponentsCount: number = 2
  ): HandAnalysis {
    const currentHand = communityCards.length >= 3 ? HandEvaluator.evaluate([...holeCards, ...communityCards]) : null;
    const winProbability = this.calculateWinProbability(holeCards, communityCards, Math.max(1, opponentsCount), 60);
    const { count: outsCount, descriptions: outsDescription } = this.countOuts(holeCards, communityCards);

    const totalPotAfterCall = pot + callAmount;
    const potOdds = totalPotAfterCall > 0 && callAmount > 0 ? callAmount / totalPotAfterCall : 0;
    const isPotOddsFavorable = callAmount === 0 || winProbability >= potOdds;

    let advice: 'fold' | 'check' | 'call' | 'raise' = 'check';
    if (callAmount === 0) {
      advice = winProbability > 0.65 ? 'raise' : 'check';
    } else {
      if (winProbability > 0.7) {
        advice = 'raise';
      } else if (isPotOddsFavorable || winProbability > 0.35) {
        advice = 'call';
      } else {
        advice = 'fold';
      }
    }

    return {
      currentHand,
      winProbability,
      outsCount,
      outsDescription,
      potOdds,
      isPotOddsFavorable,
      advice,
    };
  }
}
