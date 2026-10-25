/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, type Rank } from './Card.ts';

export enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'Старшая карта',
  [HandRank.ONE_PAIR]: 'Пара',
  [HandRank.TWO_PAIR]: 'Две пары',
  [HandRank.THREE_OF_A_KIND]: 'Сет (Тройка)',
  [HandRank.STRAIGHT]: 'Стрит',
  [HandRank.FLUSH]: 'Флеш',
  [HandRank.FULL_HOUSE]: 'Фулл-Хаус',
  [HandRank.FOUR_OF_A_KIND]: 'Каре',
  [HandRank.STRAIGHT_FLUSH]: 'Стрит-Флеш',
  [HandRank.ROYAL_FLUSH]: 'Роял-Флеш',
};

export const HAND_RANK_NAMES_EN: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.ONE_PAIR]: 'One Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush',
};

export interface EvaluatedHand {
  rank: HandRank;
  name: string;
  nameEn: string;
  score: number; // Single comparable score
  description: string;
  scoringCards: Card[];
  bestCards: Card[]; // Exactly 5 cards forming the best hand
  tiebreakValues: number[]; // Ranks used for breaking ties in order
}

export class HandEvaluator {
  /**
   * Evaluates any set of 5 to 7 cards to find the best 5-card Texas Hold'em hand.
   */
  static evaluate(cards: Card[]): EvaluatedHand {
    if (cards.length < 5) {
      throw new Error('At least 5 cards required to evaluate a poker hand');
    }

    // Generate all 5-card combinations if > 5 cards
    const combos = this.get5CardCombinations(cards);
    let bestHand: EvaluatedHand | null = null;

    for (const combo of combos) {
      const evaluated = this.evaluate5CardHand(combo);
      if (!bestHand || this.compareHands(evaluated, bestHand) > 0) {
        bestHand = evaluated;
      }
    }

    return bestHand!;
  }

  /**
   * Compares two evaluated hands: returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie.
   */
  static compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank > hand2.rank ? 1 : -1;
    }

    const len = Math.max(hand1.tiebreakValues.length, hand2.tiebreakValues.length);
    for (let i = 0; i < len; i++) {
      const v1 = hand1.tiebreakValues[i] || 0;
      const v2 = hand2.tiebreakValues[i] || 0;
      if (v1 !== v2) {
        return v1 > v2 ? 1 : -1;
      }
    }

    return 0;
  }

  private static evaluate5CardHand(cards: Card[]): EvaluatedHand {
    // Sort descending by rank
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);

    const isFlush = sorted.every((c) => c.suit === sorted[0].suit);
    const straightHigh = this.getStraightHighCard(sorted);
    const isStraight = straightHigh !== null;

    // Check Straight Flush & Royal Flush
    if (isFlush && isStraight) {
      if (straightHigh === 14) {
        return {
          rank: HandRank.ROYAL_FLUSH,
          name: HAND_RANK_NAMES[HandRank.ROYAL_FLUSH],
          nameEn: HAND_RANK_NAMES_EN[HandRank.ROYAL_FLUSH],
          score: this.computeScore(HandRank.ROYAL_FLUSH, [14]),
          description: 'Роял-Флеш',
          scoringCards: sorted,
          bestCards: sorted,
          tiebreakValues: [14],
        };
      }
      return {
        rank: HandRank.STRAIGHT_FLUSH,
        name: HAND_RANK_NAMES[HandRank.STRAIGHT_FLUSH],
        nameEn: HAND_RANK_NAMES_EN[HandRank.STRAIGHT_FLUSH],
        score: this.computeScore(HandRank.STRAIGHT_FLUSH, [straightHigh]),
        description: `Стрит-Флеш, старшая ${this.rankName(straightHigh)}`,
        scoringCards: sorted,
        bestCards: sorted,
        tiebreakValues: [straightHigh],
      };
    }

    // Rank counts
    const counts: Record<number, number> = {};
    for (const c of sorted) {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
    }

    const rankGroups = Object.entries(counts)
      .map(([rankStr, count]) => ({ rank: Number(rankStr) as Rank, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.rank - a.rank;
      });

    // Four of a kind
    if (rankGroups[0].count === 4) {
      const quadRank = rankGroups[0].rank;
      const kicker = rankGroups[1].rank;
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        name: HAND_RANK_NAMES[HandRank.FOUR_OF_A_KIND],
        nameEn: HAND_RANK_NAMES_EN[HandRank.FOUR_OF_A_KIND],
        score: this.computeScore(HandRank.FOUR_OF_A_KIND, [quadRank, kicker]),
        description: `Каре ${this.rankPlural(quadRank)}, кикер ${this.rankName(kicker)}`,
        scoringCards: sorted.filter((c) => c.rank === quadRank),
        bestCards: sorted,
        tiebreakValues: [quadRank, kicker],
      };
    }

    // Full house
    if (rankGroups[0].count === 3 && rankGroups[1].count === 2) {
      const tripsRank = rankGroups[0].rank;
      const pairRank = rankGroups[1].rank;
      return {
        rank: HandRank.FULL_HOUSE,
        name: HAND_RANK_NAMES[HandRank.FULL_HOUSE],
        nameEn: HAND_RANK_NAMES_EN[HandRank.FULL_HOUSE],
        score: this.computeScore(HandRank.FULL_HOUSE, [tripsRank, pairRank]),
        description: `Фулл-Хаус, ${this.rankPlural(tripsRank)} и ${this.rankPlural(pairRank)}`,
        scoringCards: sorted,
        bestCards: sorted,
        tiebreakValues: [tripsRank, pairRank],
      };
    }

    // Flush
    if (isFlush) {
      const tiebreaks = sorted.map((c) => c.rank);
      return {
        rank: HandRank.FLUSH,
        name: HAND_RANK_NAMES[HandRank.FLUSH],
        nameEn: HAND_RANK_NAMES_EN[HandRank.FLUSH],
        score: this.computeScore(HandRank.FLUSH, tiebreaks),
        description: `Флеш, старшая ${this.rankName(tiebreaks[0])}`,
        scoringCards: sorted,
        bestCards: sorted,
        tiebreakValues: tiebreaks,
      };
    }

    // Straight
    if (isStraight) {
      return {
        rank: HandRank.STRAIGHT,
        name: HAND_RANK_NAMES[HandRank.STRAIGHT],
        nameEn: HAND_RANK_NAMES_EN[HandRank.STRAIGHT],
        score: this.computeScore(HandRank.STRAIGHT, [straightHigh]),
        description: `Стрит, старшая ${this.rankName(straightHigh)}`,
        scoringCards: sorted,
        bestCards: sorted,
        tiebreakValues: [straightHigh],
      };
    }

    // Three of a kind
    if (rankGroups[0].count === 3) {
      const tripsRank = rankGroups[0].rank;
      const kickers = rankGroups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
      return {
        rank: HandRank.THREE_OF_A_KIND,
        name: HAND_RANK_NAMES[HandRank.THREE_OF_A_KIND],
        nameEn: HAND_RANK_NAMES_EN[HandRank.THREE_OF_A_KIND],
        score: this.computeScore(HandRank.THREE_OF_A_KIND, [tripsRank, ...kickers]),
        description: `Сет ${this.rankPlural(tripsRank)}`,
        scoringCards: sorted.filter((c) => c.rank === tripsRank),
        bestCards: sorted,
        tiebreakValues: [tripsRank, ...kickers],
      };
    }

    // Two pair
    if (rankGroups[0].count === 2 && rankGroups[1].count === 2) {
      const highPair = Math.max(rankGroups[0].rank, rankGroups[1].rank);
      const lowPair = Math.min(rankGroups[0].rank, rankGroups[1].rank);
      const kicker = rankGroups[2].rank;
      return {
        rank: HandRank.TWO_PAIR,
        name: HAND_RANK_NAMES[HandRank.TWO_PAIR],
        nameEn: HAND_RANK_NAMES_EN[HandRank.TWO_PAIR],
        score: this.computeScore(HandRank.TWO_PAIR, [highPair, lowPair, kicker]),
        description: `Две пары, ${this.rankPlural(highPair)} и ${this.rankPlural(lowPair)}`,
        scoringCards: sorted.filter((c) => c.rank === highPair || c.rank === lowPair),
        bestCards: sorted,
        tiebreakValues: [highPair, lowPair, kicker],
      };
    }

    // One pair
    if (rankGroups[0].count === 2) {
      const pairRank = rankGroups[0].rank;
      const kickers = rankGroups.slice(1).map((g) => g.rank).sort((a, b) => b - a);
      return {
        rank: HandRank.ONE_PAIR,
        name: HAND_RANK_NAMES[HandRank.ONE_PAIR],
        nameEn: HAND_RANK_NAMES_EN[HandRank.ONE_PAIR],
        score: this.computeScore(HandRank.ONE_PAIR, [pairRank, ...kickers]),
        description: `Пара ${this.rankPlural(pairRank)}`,
        scoringCards: sorted.filter((c) => c.rank === pairRank),
        bestCards: sorted,
        tiebreakValues: [pairRank, ...kickers],
      };
    }

    // High card
    const kickers = sorted.map((c) => c.rank);
    return {
      rank: HandRank.HIGH_CARD,
      name: HAND_RANK_NAMES[HandRank.HIGH_CARD],
      nameEn: HAND_RANK_NAMES_EN[HandRank.HIGH_CARD],
      score: this.computeScore(HandRank.HIGH_CARD, kickers),
      description: `Старшая карта ${this.rankName(kickers[0])}`,
      scoringCards: [sorted[0]],
      bestCards: sorted,
      tiebreakValues: kickers,
    };
  }

  private static getStraightHighCard(sorted5: Card[]): number | null {
    const ranks = sorted5.map((c) => c.rank);
    // Standard straight check: consecutive descending
    if (
      ranks[0] - 1 === ranks[1] &&
      ranks[1] - 1 === ranks[2] &&
      ranks[2] - 1 === ranks[3] &&
      ranks[3] - 1 === ranks[4]
    ) {
      return ranks[0];
    }
    // Ace-low wheel straight: A, 5, 4, 3, 2 -> 14, 5, 4, 3, 2
    if (
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      return 5; // In wheel, 5 is the highest card of the straight
    }
    return null;
  }

  private static computeScore(rank: HandRank, tiebreaks: number[]): number {
    let score = rank * 10000000000;
    let multiplier = 100000000;
    for (const tb of tiebreaks) {
      score += tb * multiplier;
      multiplier /= 100;
    }
    return score;
  }

  private static get5CardCombinations(cards: Card[]): Card[][] {
    const results: Card[][] = [];
    const n = cards.length;

    function combine(start: number, combo: Card[]) {
      if (combo.length === 5) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i < n; i++) {
        combo.push(cards[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }

    combine(0, []);
    return results;
  }

  private static rankName(rank: number): string {
    const map: Record<number, string> = {
      14: 'Туз',
      13: 'Король',
      12: 'Дама',
      11: 'Валет',
      10: 'Десятка',
      9: 'Девятка',
      8: 'Восьмерка',
      7: 'Семерка',
      6: 'Шестерка',
      5: 'Пятерка',
      4: 'Четверка',
      3: 'Тройка',
      2: 'Двойка',
    };
    return map[rank] || String(rank);
  }

  private static rankPlural(rank: number): string {
    const map: Record<number, string> = {
      14: 'Тузов',
      13: 'Королей',
      12: 'Дам',
      11: 'Валетов',
      10: 'Десяток',
      9: 'Девяток',
      8: 'Восьмерок',
      7: 'Семерок',
      6: 'Шестерок',
      5: 'Пятерок',
      4: 'Четверок',
      3: 'Троек',
      2: 'Двоек',
    };
    return map[rank] || String(rank);
  }
}
