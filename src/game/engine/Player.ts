/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';

export type PlayerRole = 'dealer' | 'sb' | 'bb' | 'none';
export type PlayerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | null;

export interface PlayerConfig {
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
  avatarSeed?: number;
  difficulty?: 'beginner' | 'medium' | 'pro';
}

export class Player {
  readonly id: string;
  name: string;
  readonly isHuman: boolean;
  chips: number;
  avatarSeed: number;
  difficulty: 'beginner' | 'medium' | 'pro';

  holeCards: Card[] = [];
  currentBet: number = 0;
  totalHandBet: number = 0;
  folded: boolean = false;
  isAllIn: boolean = false;
  isSittingOut: boolean = false;
  role: PlayerRole = 'none';
  lastAction: PlayerActionType = null;
  lastActionAmount: number = 0;
  showCards: boolean = false;
  hasActedThisStreet: boolean = false;

  constructor(config: PlayerConfig) {
    this.id = config.id;
    this.name = config.name;
    this.isHuman = config.isHuman;
    this.chips = config.chips;
    this.avatarSeed = config.avatarSeed ?? Math.floor(Math.random() * 10);
    this.difficulty = config.difficulty || 'medium';
  }

  resetForNewHand(): void {
    this.holeCards = [];
    this.currentBet = 0;
    this.totalHandBet = 0;
    this.folded = false;
    this.isAllIn = false;
    this.role = 'none';
    this.lastAction = null;
    this.lastActionAmount = 0;
    this.showCards = this.isHuman;
    this.hasActedThisStreet = false;
  }

  resetForNewStreet(): void {
    this.currentBet = 0;
    this.hasActedThisStreet = false;
    this.lastAction = null;
    this.lastActionAmount = 0;
  }

  commitChips(amount: number): number {
    const toCommit = Math.min(this.chips, amount);
    this.chips -= toCommit;
    this.currentBet += toCommit;
    this.totalHandBet += toCommit;
    if (this.chips === 0) {
      this.isAllIn = true;
    }
    return toCommit;
  }

  awardChips(amount: number): void {
    this.chips += amount;
  }

  clone(): Player {
    const p = new Player({
      id: this.id,
      name: this.name,
      isHuman: this.isHuman,
      chips: this.chips,
      avatarSeed: this.avatarSeed,
      difficulty: this.difficulty,
    });
    p.holeCards = [...this.holeCards];
    p.currentBet = this.currentBet;
    p.totalHandBet = this.totalHandBet;
    p.folded = this.folded;
    p.isAllIn = this.isAllIn;
    p.isSittingOut = this.isSittingOut;
    p.role = this.role;
    p.lastAction = this.lastAction;
    p.lastActionAmount = this.lastActionAmount;
    p.showCards = this.showCards;
    p.hasActedThisStreet = this.hasActedThisStreet;
    return p;
  }
}
