/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';

export enum ThreeCardRank {
  HIGH_CARD = 1,
  PAIR = 2,
  FLUSH = 3,
  STRAIGHT = 4,
  THREE_OF_A_KIND = 5,
  STRAIGHT_FLUSH = 6,
}

export const THREE_CARD_RANK_NAMES: Record<ThreeCardRank, string> = {
  [ThreeCardRank.HIGH_CARD]: 'Старшая карта',
  [ThreeCardRank.PAIR]: 'Пара',
  [ThreeCardRank.FLUSH]: 'Флеш',
  [ThreeCardRank.STRAIGHT]: 'Стрит',
  [ThreeCardRank.THREE_OF_A_KIND]: 'Тройка (Сет)',
  [ThreeCardRank.STRAIGHT_FLUSH]: 'Стрит-Флеш',
};

export interface EvaluatedThreeCardHand {
  rank: ThreeCardRank;
  name: string;
  tiebreaks: number[];
  score: number;
  description: string;
}

export class ThreeCardPokerEvaluator {
  /**
   * Evaluates a 3-card hand according to official Three Card Poker rules:
   * 1. Straight Flush
   * 2. Three of a Kind (Trips beat straight in 3-card poker!)
   * 3. Straight (Straight beats flush in 3-card poker!)
   * 4. Flush
   * 5. Pair
   * 6. High Card
   */
  static evaluate(cards: Card[]): EvaluatedThreeCardHand {
    if (cards.length !== 3) {
      throw new Error('Three card poker requires exactly 3 cards');
    }

    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const r = sorted.map((c) => c.rank);
    const isFlush = sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit;

    // Check Straight: consecutive or A-2-3 (14, 3, 2)
    let isStraight = false;
    let straightHigh = r[0];

    if (r[0] - 1 === r[1] && r[1] - 1 === r[2]) {
      isStraight = true;
      straightHigh = r[0];
    } else if (r[0] === 14 && r[1] === 3 && r[2] === 2) {
      // Ace-low 3-card straight: 3-2-A
      isStraight = true;
      straightHigh = 3;
    }

    // 1. Straight Flush
    if (isFlush && isStraight) {
      return {
        rank: ThreeCardRank.STRAIGHT_FLUSH,
        name: THREE_CARD_RANK_NAMES[ThreeCardRank.STRAIGHT_FLUSH],
        tiebreaks: [straightHigh],
        score: ThreeCardRank.STRAIGHT_FLUSH * 1000000 + straightHigh,
        description: `Стрит-Флеш (${straightHigh}-хай)`,
      };
    }

    // 2. Three of a kind
    if (r[0] === r[1] && r[1] === r[2]) {
      return {
        rank: ThreeCardRank.THREE_OF_A_KIND,
        name: THREE_CARD_RANK_NAMES[ThreeCardRank.THREE_OF_A_KIND],
        tiebreaks: [r[0]],
        score: ThreeCardRank.THREE_OF_A_KIND * 1000000 + r[0],
        description: `Тройка ${r[0]}`,
      };
    }

    // 3. Straight
    if (isStraight) {
      return {
        rank: ThreeCardRank.STRAIGHT,
        name: THREE_CARD_RANK_NAMES[ThreeCardRank.STRAIGHT],
        tiebreaks: [straightHigh],
        score: ThreeCardRank.STRAIGHT * 1000000 + straightHigh,
        description: `Стрит (${straightHigh}-хай)`,
      };
    }

    // 4. Flush
    if (isFlush) {
      return {
        rank: ThreeCardRank.FLUSH,
        name: THREE_CARD_RANK_NAMES[ThreeCardRank.FLUSH],
        tiebreaks: r,
        score: ThreeCardRank.FLUSH * 1000000 + r[0] * 10000 + r[1] * 100 + r[2],
        description: `Флеш, старшая ${r[0]}`,
      };
    }

    // 5. Pair
    if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
      let pairRank = r[0] === r[1] ? r[0] : r[1] === r[2] ? r[1] : r[0];
      let kicker = r.find((x) => x !== pairRank) || 0;
      return {
        rank: ThreeCardRank.PAIR,
        name: THREE_CARD_RANK_NAMES[ThreeCardRank.PAIR],
        tiebreaks: [pairRank, kicker],
        score: ThreeCardRank.PAIR * 1000000 + pairRank * 100 + kicker,
        description: `Пара ${pairRank}, кикер ${kicker}`,
      };
    }

    // 6. High Card
    return {
      rank: ThreeCardRank.HIGH_CARD,
      name: THREE_CARD_RANK_NAMES[ThreeCardRank.HIGH_CARD],
      tiebreaks: r,
      score: ThreeCardRank.HIGH_CARD * 1000000 + r[0] * 10000 + r[1] * 100 + r[2],
      description: `Старшая ${r[0]}`,
    };
  }

  /**
   * Compares two 3-card hands: 1 if hand1 wins, -1 if hand2 wins, 0 if tie.
   */
  static compare(hand1: EvaluatedThreeCardHand, hand2: EvaluatedThreeCardHand): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank > hand2.rank ? 1 : -1;
    }
    const len = Math.max(hand1.tiebreaks.length, hand2.tiebreaks.length);
    for (let i = 0; i < len; i++) {
      const v1 = hand1.tiebreaks[i] || 0;
      const v2 = hand2.tiebreaks[i] || 0;
      if (v1 !== v2) return v1 > v2 ? 1 : -1;
    }
    return 0;
  }

  /**
   * Dealer qualifies with Queen-High or better (Q-x-x or any pair+)
   */
  static dealerQualifies(hand: EvaluatedThreeCardHand): boolean {
    if (hand.rank > ThreeCardRank.HIGH_CARD) return true;
    return (hand.tiebreaks[0] || 0) >= 12; // 12 = Queen
  }

  /**
   * Calculate Pair Plus bonus multiplier (standard casino paytable):
   * Straight Flush: 40:1
   * Three of a Kind: 30:1
   * Straight: 6:1
   * Flush: 3:1
   * Pair: 1:1
   */
  static getPairPlusMultiplier(rank: ThreeCardRank): number {
    switch (rank) {
      case ThreeCardRank.STRAIGHT_FLUSH:
        return 40;
      case ThreeCardRank.THREE_OF_A_KIND:
        return 30;
      case ThreeCardRank.STRAIGHT:
        return 6;
      case ThreeCardRank.FLUSH:
        return 3;
      case ThreeCardRank.PAIR:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Calculate Ante bonus multiplier:
   * Straight Flush: 5:1
   * Three of a Kind: 4:1
   * Straight: 1:1
   */
  static getAnteBonusMultiplier(rank: ThreeCardRank): number {
    switch (rank) {
      case ThreeCardRank.STRAIGHT_FLUSH:
        return 5;
      case ThreeCardRank.THREE_OF_A_KIND:
        return 4;
      case ThreeCardRank.STRAIGHT:
        return 1;
      default:
        return 0;
    }
  }
}
