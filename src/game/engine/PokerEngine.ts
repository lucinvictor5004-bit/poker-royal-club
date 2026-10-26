/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';
import { Deck } from './Deck.ts';
import { Player, type PlayerActionType } from './Player.ts';
import { HandEvaluator, type EvaluatedHand } from './HandEvaluator.ts';
import { PotManager, type PotPayout, type PotSlice } from './PotManager.ts';
import { BotAI } from './BotAI.ts';

export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand_ended';

export interface ActionLogItem {
  id: string;
  timestamp: number;
  playerId?: string;
  playerName?: string;
  message: string;
  type: 'action' | 'deal' | 'win' | 'system';
}

export interface TableSnapshot {
  phase: GamePhase;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  dealerIdx: number;
  sbIdx: number;
  bbIdx: number;
  activePlayerIdx: number;
  highestBet: number;
  minRaise: number;
  totalPot: number;
  pots: PotSlice[];
  communityCards: Card[];
  players: Player[];
  actionLog: ActionLogItem[];
  lastPayouts: PotPayout[];
  winnerPlayerIds: string[];
  winnerDescriptions: string[];
}

export interface EngineConfig {
  smallBlind?: number;
  bigBlind?: number;
  players: Player[];
}

export class PokerEngine {
  deck: Deck = new Deck();
  potManager: PotManager = new PotManager();

  players: Player[] = [];
  communityCards: Card[] = [];
  phase: GamePhase = 'idle';

  smallBlind: number = 10;
  bigBlind: number = 20;
  handNumber: number = 0;

  dealerIdx: number = 0;
  sbIdx: number = 0;
  bbIdx: number = 0;
  activePlayerIdx: number = -1;

  highestBetThisStreet: number = 0;
  lastRaiseDelta: number = 20;

  actionLog: ActionLogItem[] = [];
  lastPayouts: PotPayout[] = [];
  winnerPlayerIds: string[] = [];
  winnerDescriptions: string[] = [];

  constructor(config: EngineConfig) {
    this.smallBlind = config.smallBlind ?? 10;
    this.bigBlind = config.bigBlind ?? 20;
    this.players = config.players;
    this.lastRaiseDelta = this.bigBlind;
  }

  logMessage(message: string, type: 'action' | 'deal' | 'win' | 'system' = 'system', playerId?: string, playerName?: string): void {
    this.actionLog.push({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      message,
      type,
      playerId,
      playerName,
    });
    // Keep last 100 log items
    if (this.actionLog.length > 100) {
      this.actionLog.shift();
    }
  }

  getActivePlayers(): Player[] {
    return this.players.filter((p) => !p.folded && !p.isSittingOut && p.chips + p.currentBet > 0);
  }

  getPlayersInHand(): Player[] {
    return this.players.filter((p) => !p.folded && !p.isSittingOut);
  }

  /**
   * Remove a player or bot from the table.
   */
  removePlayer(playerId: string): boolean {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return false;

    const player = this.players[idx];
    // If table is in active hand and player hasn't folded, fold them first
    if (this.phase !== 'idle' && this.phase !== 'hand_ended' && !player.folded) {
      this.executeAction(playerId, 'fold');
    }

    this.players.splice(idx, 1);
    this.logMessage(`${player.name} покинул стол`, 'system');

    // Bound indices safely
    if (this.players.length > 0) {
      this.dealerIdx = this.dealerIdx % this.players.length;
      this.sbIdx = this.sbIdx % this.players.length;
      this.bbIdx = this.bbIdx % this.players.length;
      if (this.activePlayerIdx >= this.players.length) {
        this.activePlayerIdx = 0;
      }
    } else {
      this.phase = 'idle';
      this.activePlayerIdx = -1;
    }

    return true;
  }

  /**
   * Add a new bot to the table if seats are available (max 9).
   */
  addBot(name?: string, difficulty: 'beginner' | 'medium' | 'pro' = 'medium', startingChips: number = 1000): Player | null {
    if (this.players.length >= 9) return null;

    const botName = name || `Бот ${this.players.length + 1}`;
    const newBot = new Player({
      id: `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: botName,
      isHuman: false,
      chips: startingChips,
      avatarSeed: this.players.length,
      difficulty,
    });

    this.players.push(newBot);
    this.logMessage(`${botName} сел за стол`, 'system');
    return newBot;
  }

  /**
   * Starts a brand new hand.
   */
  startNewHand(): void {
    // Reset players who have zero chips: if human rebuy, if bot rebuy
    for (const p of this.players) {
      if (p.chips <= 0) {
        p.chips = 1000;
        this.logMessage(`${p.name} делает докупку (Rebuy) на 1,000$`, 'system', p.id, p.name);
      }
      p.resetForNewHand();
    }

    const availablePlayers = this.players.filter((p) => !p.isSittingOut && p.chips > 0);
    if (availablePlayers.length < 2) {
      this.phase = 'idle';
      this.logMessage('Недостаточно игроков для начала партии', 'system');
      return;
    }

    this.handNumber++;
    this.deck.reset();
    this.deck.shuffle();
    this.potManager.reset();
    this.communityCards = [];
    this.lastPayouts = [];
    this.winnerPlayerIds = [];
    this.winnerDescriptions = [];

    // Advance dealer button to next active player
    let nextDealer = (this.dealerIdx + 1) % this.players.length;
    while (this.players[nextDealer].isSittingOut || this.players[nextDealer].chips <= 0) {
      nextDealer = (nextDealer + 1) % this.players.length;
    }
    this.dealerIdx = nextDealer;

    // Determine SB and BB positions
    if (availablePlayers.length === 2) {
      // Heads-up rules: Dealer is Small Blind and acts first preflop, second postflop
      this.sbIdx = this.dealerIdx;
      let bb = (this.dealerIdx + 1) % this.players.length;
      while (this.players[bb].isSittingOut || this.players[bb].chips <= 0) {
        bb = (bb + 1) % this.players.length;
      }
      this.bbIdx = bb;
    } else {
      let sb = (this.dealerIdx + 1) % this.players.length;
      while (this.players[sb].isSittingOut || this.players[sb].chips <= 0) {
        sb = (sb + 1) % this.players.length;
      }
      this.sbIdx = sb;

      let bb = (sb + 1) % this.players.length;
      while (this.players[bb].isSittingOut || this.players[bb].chips <= 0) {
        bb = (bb + 1) % this.players.length;
      }
      this.bbIdx = bb;
    }

    // Assign roles
    this.players.forEach((p, idx) => {
      if (idx === this.dealerIdx) p.role = 'dealer';
      else if (idx === this.sbIdx) p.role = 'sb';
      else if (idx === this.bbIdx) p.role = 'bb';
      else p.role = 'none';
    });

    // Post blinds
    const sbPlayer = this.players[this.sbIdx];
    const sbCommitted = sbPlayer.commitChips(this.smallBlind);
    this.potManager.addContribution(sbPlayer.id, sbCommitted);
    sbPlayer.lastAction = 'bet';
    sbPlayer.lastActionAmount = sbCommitted;
    this.logMessage(`${sbPlayer.name} ставит малый блайнд $${sbCommitted}`, 'action', sbPlayer.id, sbPlayer.name);

    const bbPlayer = this.players[this.bbIdx];
    const bbCommitted = bbPlayer.commitChips(this.bigBlind);
    this.potManager.addContribution(bbPlayer.id, bbCommitted);
    bbPlayer.lastAction = 'bet';
    bbPlayer.lastActionAmount = bbCommitted;
    this.logMessage(`${bbPlayer.name} ставит большой блайнд $${bbCommitted}`, 'action', bbPlayer.id, bbPlayer.name);

    this.highestBetThisStreet = this.bigBlind;
    this.lastRaiseDelta = this.bigBlind;

    // Deal 2 hole cards to each active player
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (!p.isSittingOut && p.chips + p.currentBet > 0) {
          p.holeCards.push(this.deck.draw());
        }
      }
    }

    // Set active player to first to act preflop (Under the Gun)
    let firstActor = (this.bbIdx + 1) % this.players.length;
    if (availablePlayers.length === 2) {
      firstActor = this.sbIdx; // Heads-up: dealer/SB acts first preflop
    }
    while (this.players[firstActor].folded || this.players[firstActor].isSittingOut || this.players[firstActor].isAllIn) {
      firstActor = (firstActor + 1) % this.players.length;
    }

    this.activePlayerIdx = firstActor;
    this.phase = 'preflop';
    this.logMessage(`Раздача #${this.handNumber}. Раунд Pre-Flop. Ход: ${this.players[firstActor].name}`, 'system');
  }

  /**
   * Executes an action for a player.
   */
  executeAction(playerId: string, actionType: PlayerActionType, betAmount: number = 0): boolean {
    const activePlayer = this.players[this.activePlayerIdx];
    if (!activePlayer || activePlayer.id !== playerId) {
      return false;
    }

    const callDifference = this.highestBetThisStreet - activePlayer.currentBet;

    switch (actionType) {
      case 'fold': {
        activePlayer.folded = true;
        activePlayer.lastAction = 'fold';
        activePlayer.lastActionAmount = 0;
        this.logMessage(`${activePlayer.name} сбрасывает карты (Fold)`, 'action', activePlayer.id, activePlayer.name);
        break;
      }

      case 'check': {
        if (callDifference > 0) {
          // Cannot check when facing a bet
          return false;
        }
        activePlayer.lastAction = 'check';
        activePlayer.lastActionAmount = 0;
        activePlayer.hasActedThisStreet = true;
        this.logMessage(`${activePlayer.name} чек (Check)`, 'action', activePlayer.id, activePlayer.name);
        break;
      }

      case 'call': {
        if (callDifference <= 0) {
          // Calling 0 is a check
          return this.executeAction(playerId, 'check', 0);
        }
        const committed = activePlayer.commitChips(callDifference);
        this.potManager.addContribution(activePlayer.id, committed);
        activePlayer.lastAction = activePlayer.isAllIn ? 'all-in' : 'call';
        activePlayer.lastActionAmount = committed;
        activePlayer.hasActedThisStreet = true;
        this.logMessage(
          activePlayer.isAllIn
            ? `${activePlayer.name} коллирует All-In $${committed}`
            : `${activePlayer.name} колл $${committed}`,
          'action',
          activePlayer.id,
          activePlayer.name
        );
        break;
      }

      case 'bet':
      case 'raise': {
        // betAmount is the TOTAL bet on this street (e.g. raise to $100)
        let totalTargetBet = Math.max(betAmount, this.highestBetThisStreet + this.lastRaiseDelta);
        const additionalChipsNeeded = totalTargetBet - activePlayer.currentBet;

        if (additionalChipsNeeded <= 0) {
          return false;
        }

        // If not enough chips for full raise, becomes All-In
        if (additionalChipsNeeded >= activePlayer.chips) {
          return this.executeAction(playerId, 'all-in', 0);
        }

        const committed = activePlayer.commitChips(additionalChipsNeeded);
        this.potManager.addContribution(activePlayer.id, committed);

        const raiseDelta = activePlayer.currentBet - this.highestBetThisStreet;
        if (raiseDelta > 0) {
          this.lastRaiseDelta = Math.max(this.bigBlind, raiseDelta);
        }
        this.highestBetThisStreet = activePlayer.currentBet;

        activePlayer.lastAction = actionType;
        activePlayer.lastActionAmount = committed;
        activePlayer.hasActedThisStreet = true;

        // Reset hasActedThisStreet for everyone else still able to act
        for (const p of this.players) {
          if (p.id !== activePlayer.id && !p.folded && !p.isAllIn) {
            p.hasActedThisStreet = false;
          }
        }

        this.logMessage(
          `${activePlayer.name} ${actionType === 'bet' ? 'ставит' : 'повышает до'} $${activePlayer.currentBet}`,
          'action',
          activePlayer.id,
          activePlayer.name
        );
        break;
      }

      case 'all-in': {
        const chipsLeft = activePlayer.chips;
        if (chipsLeft <= 0) return false;

        const committed = activePlayer.commitChips(chipsLeft);
        this.potManager.addContribution(activePlayer.id, committed);

        // If this all-in is higher than current highest bet
        if (activePlayer.currentBet > this.highestBetThisStreet) {
          const raiseDelta = activePlayer.currentBet - this.highestBetThisStreet;
          if (raiseDelta >= this.lastRaiseDelta) {
            this.lastRaiseDelta = raiseDelta;
            // Re-opens betting for other players
            for (const p of this.players) {
              if (p.id !== activePlayer.id && !p.folded && !p.isAllIn) {
                p.hasActedThisStreet = false;
              }
            }
          }
          this.highestBetThisStreet = activePlayer.currentBet;
        }

        activePlayer.lastAction = 'all-in';
        activePlayer.lastActionAmount = committed;
        activePlayer.hasActedThisStreet = true;
        this.logMessage(`${activePlayer.name} идет ALL-IN на $${committed}!`, 'action', activePlayer.id, activePlayer.name);
        break;
      }

      default:
        return false;
    }

    // Check if only 1 player remains unfolded
    const unfoldedPlayers = this.players.filter((p) => !p.folded && !p.isSittingOut);
    if (unfoldedPlayers.length === 1) {
      this.resolveSingleWinner(unfoldedPlayers[0]);
      return true;
    }

    // Check if betting round for this street is complete
    if (this.isStreetBettingComplete()) {
      this.advanceToNextStreet();
    } else {
      this.advanceToNextPlayer();
    }

    return true;
  }

  isStreetBettingComplete(): boolean {
    const playersInHand = this.players.filter((p) => !p.folded && !p.isSittingOut);
    const nonAllInPlayers = playersInHand.filter((p) => !p.isAllIn);

    // If only 0 or 1 player is NOT all-in, and all bets are matched
    if (nonAllInPlayers.length <= 1) {
      const allMatched = playersInHand.every(
        (p) => p.isAllIn || (p.hasActedThisStreet && p.currentBet === this.highestBetThisStreet)
      );
      if (allMatched) return true;
    }

    // Everyone who is not folded and not all-in must have acted and matched the highest bet
    return nonAllInPlayers.every(
      (p) => p.hasActedThisStreet && p.currentBet === this.highestBetThisStreet
    );
  }

  advanceToNextPlayer(): void {
    let nextIdx = (this.activePlayerIdx + 1) % this.players.length;
    let safetyCounter = 0;

    while (
      (this.players[nextIdx].folded ||
        this.players[nextIdx].isSittingOut ||
        this.players[nextIdx].isAllIn) &&
      safetyCounter < this.players.length * 2
    ) {
      nextIdx = (nextIdx + 1) % this.players.length;
      safetyCounter++;
    }

    this.activePlayerIdx = nextIdx;
  }

  advanceToNextStreet(): void {
    // Reset player street bets
    for (const p of this.players) {
      p.resetForNewStreet();
    }
    this.highestBetThisStreet = 0;
    this.lastRaiseDelta = this.bigBlind;

    // Check how many players can make actions (not all-in and not folded)
    const activeContenders = this.players.filter((p) => !p.folded && !p.isSittingOut && !p.isAllIn);

    switch (this.phase) {
      case 'preflop': {
        this.phase = 'flop';
        this.deck.burn();
        this.communityCards.push(this.deck.draw(), this.deck.draw(), this.deck.draw());
        this.logMessage(
          `Флоп: [${this.communityCards.map((c) => c.toString()).join(' ')}]`,
          'deal'
        );
        break;
      }

      case 'flop': {
        this.phase = 'turn';
        this.deck.burn();
        const turnCard = this.deck.draw();
        this.communityCards.push(turnCard);
        this.logMessage(`Терн: [${turnCard.toString()}]`, 'deal');
        break;
      }

      case 'turn': {
        this.phase = 'river';
        this.deck.burn();
        const riverCard = this.deck.draw();
        this.communityCards.push(riverCard);
        this.logMessage(`Ривер: [${riverCard.toString()}]`, 'deal');
        break;
      }

      case 'river': {
        this.resolveShowdown();
        return;
      }

      default:
        return;
    }

    // If 0 or 1 players are able to bet (others are all-in), run out remaining streets automatically
    if (activeContenders.length <= 1) {
      this.advanceToNextStreet();
      return;
    }

    // Reset first to act postflop (first active player to left of dealer)
    let firstActor = (this.dealerIdx + 1) % this.players.length;
    while (
      this.players[firstActor].folded ||
      this.players[firstActor].isSittingOut ||
      this.players[firstActor].isAllIn
    ) {
      firstActor = (firstActor + 1) % this.players.length;
    }
    this.activePlayerIdx = firstActor;
  }

  resolveSingleWinner(winner: Player): void {
    this.phase = 'hand_ended';
    const totalPot = this.potManager.getTotalPot();
    winner.awardChips(totalPot);
    this.winnerPlayerIds = [winner.id];
    this.winnerDescriptions = [`${winner.name} побеждает, все соперники сбросили карты ($${totalPot})`];
    this.lastPayouts = [{ playerId: winner.id, amount: totalPot, potIndex: 0 }];
    this.logMessage(this.winnerDescriptions[0], 'win', winner.id, winner.name);
  }

  resolveShowdown(): void {
    this.phase = 'showdown';
    const contenders = this.players.filter((p) => !p.folded && !p.isSittingOut);

    // Reveal cards
    for (const p of contenders) {
      p.showCards = true;
    }

    const handMap = new Map<string, EvaluatedHand>();
    for (const p of contenders) {
      const fullCards = [...p.holeCards, ...this.communityCards];
      const evaluated = HandEvaluator.evaluate(fullCards);
      handMap.set(p.id, evaluated);
    }

    const payouts = this.potManager.distributePots(
      handMap,
      contenders.map((p) => p.id)
    );

    this.lastPayouts = payouts;
    const winnerIdSet = new Set<string>();
    const descriptions: string[] = [];

    for (const payout of payouts) {
      const player = this.players.find((p) => p.id === payout.playerId);
      if (player) {
        player.awardChips(payout.amount);
        winnerIdSet.add(player.id);
        const hand = payout.hand || handMap.get(player.id);
        const desc = hand
          ? `${player.name} выигрывает $${payout.amount} (${hand.description})`
          : `${player.name} выигрывает $${payout.amount}`;
        descriptions.push(desc);
        this.logMessage(desc, 'win', player.id, player.name);
      }
    }

    this.winnerPlayerIds = Array.from(winnerIdSet);
    this.winnerDescriptions = descriptions;
    this.phase = 'hand_ended';
  }

  getSnapshot(): TableSnapshot {
    const activeContenders = this.players.filter((p) => !p.folded && !p.isSittingOut);
    const pots = this.potManager.calculatePots(activeContenders.map((p) => p.id));

    return {
      phase: this.phase,
      handNumber: this.handNumber,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      dealerIdx: this.dealerIdx,
      sbIdx: this.sbIdx,
      bbIdx: this.bbIdx,
      activePlayerIdx: this.activePlayerIdx,
      highestBet: this.highestBetThisStreet,
      minRaise: Math.max(this.bigBlind, this.highestBetThisStreet + this.lastRaiseDelta),
      totalPot: this.potManager.getTotalPot(),
      pots,
      communityCards: [...this.communityCards],
      players: this.players.map((p) => p.clone()),
      actionLog: [...this.actionLog],
      lastPayouts: [...this.lastPayouts],
      winnerPlayerIds: [...this.winnerPlayerIds],
      winnerDescriptions: [...this.winnerDescriptions],
    };
  }

  static hydrateSnapshot(snap: TableSnapshot): TableSnapshot {
    return {
      ...snap,
      communityCards: (snap.communityCards || []).map((c: any) =>
        c instanceof Card ? c : new Card(c.suit, c.rank)
      ),
      players: (snap.players || []).map((rawP: any) => {
        if (rawP instanceof Player) return rawP.clone();
        const p = new Player({
          id: rawP.id,
          name: rawP.name,
          isHuman: rawP.isHuman,
          chips: rawP.chips,
          avatarSeed: rawP.avatarSeed,
          difficulty: rawP.difficulty,
        });
        p.holeCards = (rawP.holeCards || []).map((c: any) =>
          c instanceof Card ? c : new Card(c.suit, c.rank)
        );
        p.currentBet = rawP.currentBet ?? 0;
        p.totalHandBet = rawP.totalHandBet ?? 0;
        p.folded = Boolean(rawP.folded);
        p.isAllIn = Boolean(rawP.isAllIn);
        p.isSittingOut = Boolean(rawP.isSittingOut);
        p.role = rawP.role || 'none';
        p.lastAction = rawP.lastAction ?? null;
        p.lastActionAmount = rawP.lastActionAmount ?? 0;
        p.showCards = Boolean(rawP.showCards);
        p.hasActedThisStreet = Boolean(rawP.hasActedThisStreet);
        return p;
      }),
    };
  }

  applySnapshot(rawSnap: TableSnapshot): TableSnapshot {
    const snap = PokerEngine.hydrateSnapshot(rawSnap);
    this.phase = snap.phase;
    this.handNumber = snap.handNumber;
    this.smallBlind = snap.smallBlind;
    this.bigBlind = snap.bigBlind;
    this.dealerIdx = snap.dealerIdx;
    this.sbIdx = snap.sbIdx;
    this.bbIdx = snap.bbIdx;
    this.activePlayerIdx = snap.activePlayerIdx;
    this.highestBetThisStreet = snap.highestBet;
    this.communityCards = snap.communityCards;
    this.players = snap.players;
    this.actionLog = snap.actionLog || [];
    this.lastPayouts = snap.lastPayouts || [];
    this.winnerPlayerIds = snap.winnerPlayerIds || [];
    this.winnerDescriptions = snap.winnerDescriptions || [];
    return snap;
  }

  /**
   * Helper for Bot AI turn calculation
   */
  getBotDecision(bot: Player): { action: PlayerActionType; amount: number } {
    const isPreflop = this.phase === 'preflop';
    const activePlayersCount = this.players.filter((p) => !p.folded && !p.isSittingOut).length;
    // Determine position: in-position if closer to the dealer button than other contenders
    const isInPosition = this.activePlayerIdx === this.dealerIdx || this.activePlayerIdx > this.dealerIdx;

    return BotAI.decide({
      bot,
      communityCards: this.communityCards,
      currentPot: this.potManager.getTotalPot(),
      highestBet: this.highestBetThisStreet,
      minRaise: this.lastRaiseDelta,
      bigBlind: this.bigBlind,
      activePlayersCount,
      isPreflop,
      isInPosition,
    });
  }
}
