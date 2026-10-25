/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, type Rank, type Suit } from './Card.ts';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  draw(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new Error('Deck is empty');
    }
    return card;
  }

  burn(): void {
    if (this.cards.length > 0) {
      this.cards.pop();
    }
  }

  get remaining(): number {
    return this.cards.length;
  }
}
