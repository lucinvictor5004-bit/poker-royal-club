/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Черви',
  diamonds: 'Бубны',
  clubs: 'Трефы',
  spades: 'Пики',
};

export const RANK_NAMES: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export class Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly id: string;

  constructor(suit: Suit, rank: Rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${rank}_${suit}`;
  }

  get isRed(): boolean {
    return this.suit === 'hearts' || this.suit === 'diamonds';
  }

  get symbol(): string {
    return SUIT_SYMBOLS[this.suit];
  }

  get rankLabel(): string {
    return RANK_NAMES[this.rank];
  }

  toString(): string {
    const suitCode = this.suit[0];
    return `${this.rankLabel}${suitCode}`;
  }

  static fromString(str: string): Card {
    const s = str.trim();
    const suitChar = s.slice(-1).toLowerCase();
    const rankStr = s.slice(0, -1).toUpperCase();

    let suit: Suit = 'spades';
    if (suitChar === 'h') suit = 'hearts';
    else if (suitChar === 'd') suit = 'diamonds';
    else if (suitChar === 'c') suit = 'clubs';
    else if (suitChar === 's') suit = 'spades';

    let rank: Rank = 14;
    if (rankStr === 'A') rank = 14;
    else if (rankStr === 'K') rank = 13;
    else if (rankStr === 'Q') rank = 12;
    else if (rankStr === 'J') rank = 11;
    else if (rankStr === 'T' || rankStr === '10') rank = 10;
    else {
      const num = parseInt(rankStr, 10);
      if (num >= 2 && num <= 9) rank = num as Rank;
    }

    return new Card(suit, rank);
  }
}
