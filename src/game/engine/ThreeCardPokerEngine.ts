/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';
import { Deck } from './Deck.ts';
import {
  ThreeCardPokerEvaluator,
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

export interface ThreeCardPlayerState {
  id: string;
  name: string;
  chips: number;
  isHost: boolean;
  seatIndex: number;
  anteBet: number;
  pairPlusBet: number;
  playBet: number;
  cards: Card[];
  hand: EvaluatedThreeCardHand | null;
  decision: 'none' | 'waiting' | 'play' | 'fold';
  isReady: boolean;
  payoutSummary: ThreeCardPayoutSummary | null;
}

export interface MultiplayerThreeCardSnapshot {
  phase: ThreeCardPhase;
  players: ThreeCardPlayerState[];
  dealerCards: Card[];
  dealerRevealed: boolean;
  dealerHand: EvaluatedThreeCardHand | null;
  dealerQualified: boolean;
  roundNumber: number;
  defaultAnte: number;
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
  players: ThreeCardPlayerState[];
  roundNumber: number;
}

export interface ThreeCardEngineOptions {
  startingChips?: number;
  playerChips?: number;
  defaultAnte?: number;
  players?: Array<{
    id: string;
    name: string;
    chips: number;
    isHost?: boolean;
    seatIndex?: number;
  }>;
}

export class ThreeCardPokerEngine {
  deck: Deck = new Deck();

  phase: ThreeCardPhase = 'betting';
  dealerCards: Card[] = [];
  dealerRevealed: boolean = false;
  dealerHand: EvaluatedThreeCardHand | null = null;
  dealerQualified: boolean = false;

  roundNumber: number = 1;
  defaultAnte: number = 25;
  players: ThreeCardPlayerState[] = [];

  constructor(options?: number | ThreeCardEngineOptions) {
    let startingChips = 1000;
    let defAnte = 25;

    if (typeof options === 'number') {
      startingChips = options;
    } else if (options) {
      startingChips = options.startingChips ?? options.playerChips ?? 1000;
      if (options.defaultAnte) {
        defAnte = options.defaultAnte;
      }
    }

    this.defaultAnte = defAnte;

    if (typeof options === 'object' && options?.players && options.players.length > 0) {
      this.players = options.players.map((p, idx) => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        isHost: Boolean(p.isHost ?? idx === 0),
        seatIndex: p.seatIndex ?? idx,
        anteBet: defAnte,
        pairPlusBet: 0,
        playBet: 0,
        cards: [],
        hand: null,
        decision: 'none',
        isReady: false,
        payoutSummary: null,
      }));
    } else {
      this.players = [
        {
          id: 'player_1',
          name: 'Игрок',
          chips: startingChips,
          isHost: true,
          seatIndex: 0,
          anteBet: defAnte,
          pairPlusBet: 0,
          playBet: 0,
          cards: [],
          hand: null,
          decision: 'none',
          isReady: false,
          payoutSummary: null,
        },
      ];
    }
  }

  // Getters/Setters for single-player backward compatibility
  get playerCards(): Card[] {
    return this.players[0]?.cards || [];
  }
  set playerCards(cards: Card[]) {
    if (this.players[0]) this.players[0].cards = cards;
  }

  get anteBet(): number {
    return this.players[0]?.anteBet || 0;
  }
  set anteBet(val: number) {
    if (this.players[0]) this.players[0].anteBet = val;
  }

  get pairPlusBet(): number {
    return this.players[0]?.pairPlusBet || 0;
  }
  set pairPlusBet(val: number) {
    if (this.players[0]) this.players[0].pairPlusBet = val;
  }

  get playBet(): number {
    return this.players[0]?.playBet || 0;
  }
  set playBet(val: number) {
    if (this.players[0]) this.players[0].playBet = val;
  }

  get playerChips(): number {
    return this.players[0]?.chips || 0;
  }
  set playerChips(val: number) {
    if (this.players[0]) this.players[0].chips = val;
  }

  get playerHand(): EvaluatedThreeCardHand | null {
    return this.players[0]?.hand || null;
  }
  set playerHand(h: EvaluatedThreeCardHand | null) {
    if (this.players[0]) this.players[0].hand = h;
  }

  get payoutSummary(): ThreeCardPayoutSummary | null {
    return this.players[0]?.payoutSummary || null;
  }
  set payoutSummary(p: ThreeCardPayoutSummary | null) {
    if (this.players[0]) this.players[0].payoutSummary = p;
  }

  /**
   * Set bets for a specific player (or default first player)
   */
  setBets(ante: number, pairPlus: number = 0, playerId?: string): boolean {
    if (this.phase !== 'betting') return false;
    const targetPlayer = playerId
      ? this.players.find((p) => p.id === playerId)
      : this.players[0];

    if (!targetPlayer) return false;
    const totalRequired = ante + pairPlus;
    if (totalRequired > targetPlayer.chips || ante <= 0) return false;

    targetPlayer.anteBet = ante;
    targetPlayer.pairPlusBet = pairPlus;
    targetPlayer.isReady = true;
    return true;
  }

  /**
   * Add or update players in the room
   */
  syncRoomPlayers(roomPlayers: Array<{ id: string; name: string; chips: number; isHost?: boolean; seatIndex?: number }>): void {
    const existingMap = new Map(this.players.map((p) => [p.id, p]));
    this.players = roomPlayers.map((rp, idx) => {
      const existing = existingMap.get(rp.id);
      if (existing) {
        return {
          ...existing,
          name: rp.name,
          chips: existing.chips, // keep current table chip count
          isHost: Boolean(rp.isHost ?? idx === 0),
          seatIndex: rp.seatIndex ?? idx,
        };
      }
      return {
        id: rp.id,
        name: rp.name,
        chips: rp.chips,
        isHost: Boolean(rp.isHost ?? idx === 0),
        seatIndex: rp.seatIndex ?? idx,
        anteBet: this.defaultAnte,
        pairPlusBet: 0,
        playBet: 0,
        cards: [],
        hand: null,
        decision: 'none',
        isReady: false,
        payoutSummary: null,
      };
    });
  }

  deal(): boolean {
    return this.dealHand();
  }

  dealHand(): boolean {
    if (this.phase !== 'betting') return false;

    // Filter players who can participate
    const eligiblePlayers = this.players.filter(
      (p) => p.anteBet > 0 && p.chips >= p.anteBet + p.pairPlusBet
    );

    if (eligiblePlayers.length === 0) return false;

    // Deduct initial bets
    for (const player of eligiblePlayers) {
      const totalCost = player.anteBet + player.pairPlusBet;
      player.chips -= totalCost;
      player.playBet = 0;
      player.decision = 'waiting';
      player.payoutSummary = null;
    }

    this.dealerRevealed = false;
    this.dealerHand = null;
    this.dealerQualified = false;

    // Shuffle and deal 3 cards to each eligible player, then 3 to dealer
    this.deck.reset();
    this.deck.shuffle();

    for (const player of eligiblePlayers) {
      player.cards = [this.deck.draw(), this.deck.draw(), this.deck.draw()];
      player.hand = ThreeCardPokerEvaluator.evaluate(player.cards);
    }

    this.dealerCards = [this.deck.draw(), this.deck.draw(), this.deck.draw()];

    this.phase = 'decision';
    return true;
  }

  playerAction(action: 'play' | 'fold', playerId?: string): boolean {
    return this.playAction(action, playerId);
  }

  playAction(action: 'play' | 'fold', playerId?: string): boolean {
    if (this.phase !== 'decision') return false;

    const targetPlayer = playerId
      ? this.players.find((p) => p.id === playerId)
      : this.players[0];

    if (!targetPlayer || targetPlayer.decision !== 'waiting') return false;

    if (action === 'fold') {
      targetPlayer.decision = 'fold';
      const lost = targetPlayer.anteBet + targetPlayer.pairPlusBet;
      targetPlayer.payoutSummary = {
        antePayout: 0,
        playPayout: 0,
        anteBonus: 0,
        pairPlusPayout: 0,
        totalWon: 0,
        netProfit: -lost,
        message: 'Вы сбросили карты (Fold). Ставки Ante и Pair Plus потеряны.',
      };
    } else {
      // Play action: player matches Ante
      targetPlayer.decision = 'play';
      if (targetPlayer.chips < targetPlayer.anteBet) {
        // All-in play
        targetPlayer.playBet = targetPlayer.chips;
        targetPlayer.chips = 0;
      } else {
        targetPlayer.playBet = targetPlayer.anteBet;
        targetPlayer.chips -= targetPlayer.anteBet;
      }
    }

    // Check if all players with cards have decided
    const pendingPlayers = this.players.filter(
      (p) => p.cards.length === 3 && p.decision === 'waiting'
    );

    if (pendingPlayers.length === 0) {
      this.resolveShowdown();
    }

    return true;
  }

  resolveShowdown(): void {
    // Reveal dealer hand
    this.dealerRevealed = true;
    this.dealerHand = ThreeCardPokerEvaluator.evaluate(this.dealerCards);
    this.dealerQualified = ThreeCardPokerEvaluator.dealerQualifies(this.dealerHand);

    // Resolve outcome for each player who made 'play' decision
    for (const player of this.players) {
      if (player.decision === 'play' && player.hand) {
        player.payoutSummary = this.calculatePlayerPayout(player, this.dealerHand, this.dealerQualified);
      }
    }

    this.phase = 'ended';
  }

  private calculatePlayerPayout(
    player: ThreeCardPlayerState,
    dealerHand: EvaluatedThreeCardHand,
    dealerQualified: boolean
  ): ThreeCardPayoutSummary {
    if (!player.hand) {
      throw new Error('Showdown without player hand');
    }

    let anteReturn = 0;
    let playReturn = 0;
    let anteBonus = 0;
    let pairPlusPayout = 0;
    let message = '';

    // 1. Ante Bonus (independent of dealer hand)
    const anteBonusMult = ThreeCardPokerEvaluator.getAnteBonusMultiplier(player.hand.rank);
    if (anteBonusMult > 0) {
      anteBonus = player.anteBet * anteBonusMult;
    }

    // 2. Pair Plus Bonus (independent of dealer hand)
    if (player.pairPlusBet > 0) {
      const pairPlusMult = ThreeCardPokerEvaluator.getPairPlusMultiplier(player.hand.rank);
      if (pairPlusMult > 0) {
        pairPlusPayout = player.pairPlusBet + player.pairPlusBet * pairPlusMult;
      }
    }

    // 3. Main game comparison vs Dealer
    const comp = ThreeCardPokerEvaluator.compare(player.hand, dealerHand);

    if (!dealerQualified) {
      // Dealer does not qualify (needs Queen or higher)
      anteReturn = player.anteBet * 2;
      playReturn = player.playBet; // Push
      message = `Дилер не квалифицировался (нет Дамы). Ante 1:1, Play возврат.`;
    } else {
      // Dealer qualifies
      if (comp > 0) {
        // Player wins
        anteReturn = player.anteBet * 2;
        playReturn = player.playBet * 2;
        message = `Победа! Рука (${player.hand.name}) бьет дилера (${dealerHand.name}).`;
      } else if (comp < 0) {
        // Dealer wins
        anteReturn = 0;
        playReturn = 0;
        message = `Дилер побеждает (${dealerHand.name} против ${player.hand.name}).`;
      } else {
        // Tie / Push
        anteReturn = player.anteBet;
        playReturn = player.playBet;
        message = `Ничья с дилером (Push). Ставки возвращены.`;
      }
    }

    const totalWon = anteReturn + playReturn + anteBonus + pairPlusPayout;
    const totalCommitted = player.anteBet + player.pairPlusBet + player.playBet;
    const netProfit = totalWon - totalCommitted;

    // Credit chips to player
    player.chips += totalWon;

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

  newRound(): void {
    this.resetForNewRound();
  }

  resetForNewRound(): void {
    this.phase = 'betting';
    this.roundNumber++;
    this.dealerCards = [];
    this.dealerRevealed = false;
    this.dealerHand = null;
    this.dealerQualified = false;

    for (const player of this.players) {
      player.cards = [];
      player.hand = null;
      player.playBet = 0;
      player.decision = 'none';
      player.isReady = false;
      player.payoutSummary = null;
      if (player.chips < player.anteBet) {
        player.anteBet = Math.min(this.defaultAnte, player.chips);
      }
    }
  }

  getSnapshot(): ThreeCardSnapshot {
    const p0 = this.players[0];
    return {
      phase: this.phase,
      playerCards: p0 ? [...p0.cards] : [],
      dealerCards: [...this.dealerCards],
      dealerRevealed: this.dealerRevealed,
      anteBet: p0?.anteBet || 0,
      pairPlusBet: p0?.pairPlusBet || 0,
      playBet: p0?.playBet || 0,
      playerChips: p0?.chips || 0,
      playerHand: p0?.hand || null,
      dealerHand: this.dealerHand,
      dealerQualified: this.dealerQualified,
      payoutSummary: p0?.payoutSummary ? { ...p0.payoutSummary } : null,
      players: this.players.map((p) => ({
        ...p,
        cards: [...p.cards],
        hand: p.hand ? { ...p.hand, tiebreaks: [...p.hand.tiebreaks] } : null,
        payoutSummary: p.payoutSummary ? { ...p.payoutSummary } : null,
      })),
      roundNumber: this.roundNumber,
    };
  }

  getMultiplayerSnapshot(): MultiplayerThreeCardSnapshot {
    return {
      phase: this.phase,
      players: this.players.map((p) => ({
        ...p,
        cards: [...p.cards],
        hand: p.hand ? { ...p.hand, tiebreaks: [...p.hand.tiebreaks] } : null,
        payoutSummary: p.payoutSummary ? { ...p.payoutSummary } : null,
      })),
      dealerCards: [...this.dealerCards],
      dealerRevealed: this.dealerRevealed,
      dealerHand: this.dealerHand ? { ...this.dealerHand, tiebreaks: [...this.dealerHand.tiebreaks] } : null,
      dealerQualified: this.dealerQualified,
      roundNumber: this.roundNumber,
      defaultAnte: this.defaultAnte,
    };
  }

  applySnapshot(snap: MultiplayerThreeCardSnapshot | ThreeCardSnapshot): void {
    this.phase = snap.phase;
    this.dealerCards = [...snap.dealerCards];
    this.dealerRevealed = snap.dealerRevealed;
    this.dealerHand = snap.dealerHand;
    this.dealerQualified = snap.dealerQualified;
    this.roundNumber = snap.roundNumber;

    if (snap.players && snap.players.length > 0) {
      this.players = snap.players.map((p) => ({
        ...p,
        cards: [...p.cards],
        hand: p.hand,
        payoutSummary: p.payoutSummary ? { ...p.payoutSummary } : null,
      }));
    }
  }
}
