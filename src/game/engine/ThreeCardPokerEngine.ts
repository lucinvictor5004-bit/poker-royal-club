/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';
import { Deck } from './Deck.ts';
import {
  ThreeCardPokerEvaluator,
  ThreeCardRank,
  type EvaluatedThreeCardHand,
} from './ThreeCardPokerEvaluator.ts';

export type ThreeCardPhase = 'betting' | 'decision' | 'showdown' | 'ended';

export interface ThreeCardPayoutSummary {
  antePayout: number;
  playPayout: number;
  anteBonus: number;
  pairPlusPayout: number;
  totalWon: number;
  netProfit: number;
  message: string;
}

export interface ThreeCardSnapshot {
  phase: ThreeCardPhase;
  playerCards: Card[];
  dealerCards: Card[];
  dealerRevealed: boolean;
  anteBet: number;
  pairPlusBet: number;
  playBet: number;
  playerChips: number;
  playerHand: EvaluatedThreeCardHand | null;
  dealerHand: EvaluatedThreeCardHand | null;
  dealerQualified: boolean;
  payoutSummary: ThreeCardPayoutSummary | null;
}

export class ThreeCardPokerEngine {
  deck: Deck = new Deck();

  phase: ThreeCardPhase = 'betting';
  playerCards: Card[] = [];
  dealerCards: Card[] = [];
  dealerRevealed: boolean = false;

  anteBet: number = 25;
  pairPlusBet: number = 0;
  playBet: number = 0;
  playerChips: number = 1000;

  playerHand: EvaluatedThreeCardHand | null = null;
  dealerHand: EvaluatedThreeCardHand | null = null;
  dealerQualified: boolean = false;
  payoutSummary: ThreeCardPayoutSummary | null = null;

  constructor(options?: number | { startingChips?: number; playerChips?: number; defaultAnte?: number }) {
    if (typeof options === 'number') {
      this.playerChips = options;
    } else if (options) {
      this.playerChips = options.startingChips ?? options.playerChips ?? 1000;
      if (options.defaultAnte) {
        this.anteBet = options.defaultAnte;
      }
    }
  }

  setBets(ante: number, pairPlus: number = 0): boolean {
    if (this.phase !== 'betting') return false;
    const totalRequired = ante + pairPlus;
    if (totalRequired > this.playerChips || ante <= 0) return false;

    this.anteBet = ante;
    this.pairPlusBet = pairPlus;
    return true;
  }

  deal(): boolean {
    return this.dealHand();
  }

  playerAction(action: 'play' | 'fold'): boolean {
    return this.playAction(action);
  }

  newRound(): void {
    this.resetForNewRound();
  }

  dealHand(): boolean {
    if (this.phase !== 'betting') return false;
    const totalCost = this.anteBet + this.pairPlusBet;
    if (this.playerChips < totalCost) return false;

    // Deduct initial bets
    this.playerChips -= totalCost;
    this.playBet = 0;
    this.dealerRevealed = false;
    this.payoutSummary = null;

    // Shuffle and deal 3 to player, 3 to dealer
    this.deck.reset();
    this.deck.shuffle();

    this.playerCards = [this.deck.draw(), this.deck.draw(), this.deck.draw()];
    this.dealerCards = [this.deck.draw(), this.deck.draw(), this.deck.draw()];

    this.playerHand = ThreeCardPokerEvaluator.evaluate(this.playerCards);
    this.dealerHand = null;

    this.phase = 'decision';
    return true;
  }

  playAction(action: 'play' | 'fold'): boolean {
    if (this.phase !== 'decision') return false;

    if (action === 'fold') {
      this.dealerRevealed = true;
      this.dealerHand = ThreeCardPokerEvaluator.evaluate(this.dealerCards);
      this.phase = 'ended';

      const lost = this.anteBet + this.pairPlusBet;
      this.payoutSummary = {
        antePayout: 0,
        playPayout: 0,
        anteBonus: 0,
        pairPlusPayout: 0,
        totalWon: 0,
        netProfit: -lost,
        message: 'Вы сбросили карты (Fold). Ставки Ante и Pair Plus потеряны.',
      };
      return true;
    }

    // Play action: player matches Ante
    if (this.playerChips < this.anteBet) {
      // All-in play
      this.playBet = this.playerChips;
      this.playerChips = 0;
    } else {
      this.playBet = this.anteBet;
      this.playerChips -= this.anteBet;
    }

    // Reveal dealer hand
    this.dealerRevealed = true;
    this.dealerHand = ThreeCardPokerEvaluator.evaluate(this.dealerCards);
    this.dealerQualified = ThreeCardPokerEvaluator.dealerQualifies(this.dealerHand);

    // Resolve outcome
    const outcome = this.resolveShowdown();
    this.payoutSummary = outcome;
    this.phase = 'ended';
    return true;
  }

  private resolveShowdown(): ThreeCardPayoutSummary {
    if (!this.playerHand || !this.dealerHand) {
      throw new Error('Showdown without evaluated hands');
    }

    let anteReturn = 0;
    let playReturn = 0;
    let anteBonus = 0;
    let pairPlusPayout = 0;
    let message = '';

    // 1. Ante Bonus (independent of dealer hand)
    const anteBonusMult = ThreeCardPokerEvaluator.getAnteBonusMultiplier(this.playerHand.rank);
    if (anteBonusMult > 0) {
      anteBonus = this.anteBet * anteBonusMult;
    }

    // 2. Pair Plus Bonus (independent of dealer hand)
    if (this.pairPlusBet > 0) {
      const pairPlusMult = ThreeCardPokerEvaluator.getPairPlusMultiplier(this.playerHand.rank);
      if (pairPlusMult > 0) {
        pairPlusPayout = this.pairPlusBet + this.pairPlusBet * pairPlusMult;
      }
    }

    // 3. Main game comparison vs Dealer
    const comp = ThreeCardPokerEvaluator.compare(this.playerHand, this.dealerHand);

    if (!this.dealerQualified) {
      // Dealer does not qualify (needs Queen or higher)
      // Ante pays 1:1 (returns 2x Ante), Play pushes (returns 1x Play)
      anteReturn = this.anteBet * 2;
      playReturn = this.playBet; // Push
      message = `Дилер не квалифицировался (нет Дамы). Ante выплачено 1:1, ставка Play возвращена.`;
    } else {
      // Dealer qualifies
      if (comp > 0) {
        // Player wins
        anteReturn = this.anteBet * 2;
        playReturn = this.playBet * 2;
        message = `Победа! Ваша рука (${this.playerHand.name}) бьет дилера (${this.dealerHand.name}).`;
      } else if (comp < 0) {
        // Dealer wins
        anteReturn = 0;
        playReturn = 0;
        message = `Дилер побеждает (${this.dealerHand.name} против ${this.playerHand.name}).`;
      } else {
        // Tie / Push
        anteReturn = this.anteBet;
        playReturn = this.playBet;
        message = `Ничья с дилером (Push). Ставки возвращены.`;
      }
    }

    const totalWon = anteReturn + playReturn + anteBonus + pairPlusPayout;
    const totalCommitted = this.anteBet + this.pairPlusBet + this.playBet;
    const netProfit = totalWon - totalCommitted;

    // Credit chips to player
    this.playerChips += totalWon;

    return {
      antePayout: anteReturn,
      playPayout: playReturn,
      anteBonus,
      pairPlusPayout,
      totalWon,
      netProfit,
      message,
    };
  }

  resetForNewRound(): void {
    this.phase = 'betting';
    this.playerCards = [];
    this.dealerCards = [];
    this.dealerRevealed = false;
    this.playBet = 0;
    this.playerHand = null;
    this.dealerHand = null;
    this.payoutSummary = null;
  }

  getSnapshot(): ThreeCardSnapshot {
    return {
      phase: this.phase,
      playerCards: [...this.playerCards],
      dealerCards: [...this.dealerCards],
      dealerRevealed: this.dealerRevealed,
      anteBet: this.anteBet,
      pairPlusBet: this.pairPlusBet,
      playBet: this.playBet,
      playerChips: this.playerChips,
      playerHand: this.playerHand,
      dealerHand: this.dealerHand,
      dealerQualified: this.dealerQualified,
      payoutSummary: this.payoutSummary ? { ...this.payoutSummary } : null,
    };
  }
}
