/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card } from './Card.ts';
import { Player } from './Player.ts';
import { HandEvaluator, HandRank } from './HandEvaluator.ts';
import { HandOdds } from './HandOdds.ts';

export interface BotDecision {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount: number;
}

export interface BotContext {
  bot: Player;
  communityCards: Card[];
  currentPot: number;
  highestBet: number;
  minRaise: number;
  bigBlind: number;
  activePlayersCount: number;
  isPreflop: boolean;
  isInPosition: boolean;
}

export class BotAI {
  /**
   * Decide action based on bot difficulty level and game context.
   */
  static decide(context: BotContext): BotDecision {
    const { bot } = context;
    switch (bot.difficulty) {
      case 'beginner':
        return this.decideBeginner(context);
      case 'pro':
        return this.decidePro(context);
      case 'medium':
      default:
        return this.decideMedium(context);
    }
  }

  /**
   * Beginner bot: Loose, erratic, occasional random bluffs and calls.
   */
  private static decideBeginner(ctx: BotContext): BotDecision {
    const { bot, highestBet, minRaise, bigBlind } = ctx;
    const callAmount = highestBet - bot.currentBet;
    const canCheck = callAmount <= 0;

    // Random roll
    const roll = Math.random();

    if (canCheck) {
      if (roll < 0.7) {
        return { action: 'check', amount: 0 };
      } else {
        // Casual small bet
        const betAmt = Math.min(bot.chips, bigBlind * (Math.random() > 0.5 ? 2 : 1));
        return { action: 'bet', amount: betAmt };
      }
    }

    // Facing a bet
    if (callAmount > bot.chips) {
      // Facing all-in
      if (roll < 0.25) {
        return { action: 'all-in', amount: bot.chips };
      }
      return { action: 'fold', amount: 0 };
    }

    if (roll < 0.2) {
      return { action: 'fold', amount: 0 };
    } else if (roll < 0.85) {
      return { action: 'call', amount: callAmount };
    } else {
      // Erratic raise
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise);
      return { action: 'raise', amount: raiseAmt };
    }
  }

  /**
   * Medium bot: evaluates basic hand strength, pot odds, occasional bluffs.
   */
  private static decideMedium(ctx: BotContext): BotDecision {
    const { bot, communityCards, currentPot, highestBet, minRaise, bigBlind, activePlayersCount, isPreflop } = ctx;
    const callAmount = highestBet - bot.currentBet;
    const canCheck = callAmount <= 0;

    if (isPreflop) {
      return this.evaluatePreflopMedium(bot, callAmount, canCheck, highestBet, minRaise, bigBlind);
    }

    // Postflop
    const analysis = HandOdds.analyzeHand(
      bot.holeCards,
      communityCards,
      currentPot,
      callAmount,
      activePlayersCount - 1
    );

    const { winProbability, potOdds } = analysis;
    const bluffRoll = Math.random();

    if (canCheck) {
      // If strong, bet for value
      if (winProbability > 0.65) {
        const betSize = Math.max(bigBlind, Math.floor(currentPot * 0.5));
        const finalBet = Math.min(bot.chips, betSize);
        return { action: 'bet', amount: finalBet };
      }
      // Occasional bluff when checked to
      if (bluffRoll < 0.15 && currentPot > bigBlind * 3) {
        const bluffBet = Math.min(bot.chips, Math.max(bigBlind, Math.floor(currentPot * 0.4)));
        return { action: 'bet', amount: bluffBet };
      }
      return { action: 'check', amount: 0 };
    }

    // Facing bet
    if (winProbability > 0.8 && bluffRoll > 0.4) {
      // Raise strong hand
      const raiseSize = Math.min(bot.chips, callAmount + Math.max(minRaise, Math.floor(currentPot * 0.5)));
      return { action: 'raise', amount: raiseSize };
    }

    // Call if pot odds favorable or probability decent
    if (winProbability >= potOdds || (callAmount <= bigBlind * 2 && winProbability > 0.3)) {
      if (callAmount >= bot.chips) {
        return { action: 'all-in', amount: bot.chips };
      }
      return { action: 'call', amount: callAmount };
    }

    // Small chance of calling anyway if cheap
    if (callAmount <= bigBlind && bluffRoll < 0.3) {
      return { action: 'call', amount: callAmount };
    }

    return { action: 'fold', amount: 0 };
  }

  /**
   * Pro bot: GTO-inspired heuristics, equity calculation, position advantage, semi-bluffs.
   */
  private static decidePro(ctx: BotContext): BotDecision {
    const {
      bot,
      communityCards,
      currentPot,
      highestBet,
      minRaise,
      bigBlind,
      activePlayersCount,
      isPreflop,
      isInPosition,
    } = ctx;
    const callAmount = highestBet - bot.currentBet;
    const canCheck = callAmount <= 0;

    if (isPreflop) {
      return this.evaluatePreflopPro(bot, callAmount, canCheck, highestBet, minRaise, bigBlind, isInPosition);
    }

    // Postflop
    const analysis = HandOdds.analyzeHand(
      bot.holeCards,
      communityCards,
      currentPot,
      callAmount,
      activePlayersCount - 1
    );

    const { winProbability, potOdds, outsCount } = analysis;
    const isSemiBluffOpportunity = outsCount >= 8; // Flush or open straight draw

    if (canCheck) {
      // Monster hand (> 85% equity)
      if (winProbability > 0.85) {
        // Slowplay 25% of the time if in position
        if (isInPosition && Math.random() < 0.25) {
          return { action: 'check', amount: 0 };
        }
        const betSize = Math.min(bot.chips, Math.floor(currentPot * 0.75));
        return { action: 'bet', amount: Math.max(bigBlind, betSize) };
      }

      // Strong hand (65% - 85%)
      if (winProbability > 0.65) {
        const betSize = Math.min(bot.chips, Math.floor(currentPot * 0.6));
        return { action: 'bet', amount: Math.max(bigBlind, betSize) };
      }

      // Semi-bluff with good draw (outs >= 8)
      if (isSemiBluffOpportunity && (isInPosition || Math.random() < 0.4)) {
        const betSize = Math.min(bot.chips, Math.floor(currentPot * 0.5));
        return { action: 'bet', amount: Math.max(bigBlind, betSize) };
      }

      // Pure bluff in position against 1-2 players
      if (isInPosition && activePlayersCount <= 3 && Math.random() < 0.22) {
        const betSize = Math.min(bot.chips, Math.floor(currentPot * 0.5));
        return { action: 'bet', amount: Math.max(bigBlind, betSize) };
      }

      return { action: 'check', amount: 0 };
    }

    // Facing bet:
    // Nut hand / very strong equity (> 80%)
    if (winProbability > 0.8) {
      // If large bet, maybe shove or 3-bet
      if (callAmount > currentPot * 0.5) {
        if (bot.chips <= callAmount + minRaise * 2) {
          return { action: 'all-in', amount: bot.chips };
        }
        return { action: 'raise', amount: Math.min(bot.chips, callAmount + minRaise * 2) };
      }
      return { action: 'raise', amount: Math.min(bot.chips, callAmount + Math.floor(currentPot * 0.6)) };
    }

    // Good equity or favorable pot odds
    if (winProbability >= potOdds) {
      if (callAmount >= bot.chips) {
        return { action: 'all-in', amount: bot.chips };
      }
      return { action: 'call', amount: callAmount };
    }

    // Semi-bluff raise on draw with position (implied odds)
    if (isSemiBluffOpportunity && isInPosition && Math.random() < 0.25 && bot.chips > callAmount * 3) {
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise);
      return { action: 'raise', amount: raiseAmt };
    }

    // Float / call with strong draw if implied odds are good
    if (isSemiBluffOpportunity && callAmount <= currentPot * 0.35 && bot.chips >= callAmount * 3) {
      return { action: 'call', amount: callAmount };
    }

    return { action: 'fold', amount: 0 };
  }

  private static evaluatePreflopMedium(
    bot: Player,
    callAmount: number,
    canCheck: boolean,
    highestBet: number,
    minRaise: number,
    bigBlind: number
  ): BotDecision {
    const c1 = bot.holeCards[0];
    const c2 = bot.holeCards[1];
    const highRank = Math.max(c1.rank, c2.rank);
    const lowRank = Math.min(c1.rank, c2.rank);
    const isPair = c1.rank === c2.rank;
    const isSuited = c1.suit === c2.suit;

    // Premium hands
    if (isPair && highRank >= 10) {
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise * 2);
      return { action: 'raise', amount: raiseAmt };
    }
    if (highRank === 14 && (lowRank >= 11 || (lowRank >= 10 && isSuited))) {
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise);
      return { action: 'raise', amount: raiseAmt };
    }

    // Playable hands
    if (isPair || (highRank >= 12 && lowRank >= 9) || (isSuited && highRank >= 10)) {
      if (canCheck) return { action: 'check', amount: 0 };
      if (callAmount <= bigBlind * 3) return { action: 'call', amount: callAmount };
    }

    if (canCheck) return { action: 'check', amount: 0 };
    if (callAmount <= bigBlind && (isSuited || highRank >= 10)) {
      return { action: 'call', amount: callAmount };
    }

    return { action: 'fold', amount: 0 };
  }

  private static evaluatePreflopPro(
    bot: Player,
    callAmount: number,
    canCheck: boolean,
    highestBet: number,
    minRaise: number,
    bigBlind: number,
    isInPosition: boolean
  ): BotDecision {
    const c1 = bot.holeCards[0];
    const c2 = bot.holeCards[1];
    const high = Math.max(c1.rank, c2.rank);
    const low = Math.min(c1.rank, c2.rank);
    const isPair = c1.rank === c2.rank;
    const isSuited = c1.suit === c2.suit;
    const isConnected = high - low === 1;

    // Monster pair (AA, KK, QQ)
    if (isPair && high >= 12) {
      if (highestBet > bigBlind * 5) {
        return { action: 'all-in', amount: bot.chips };
      }
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise * 3);
      return { action: 'raise', amount: raiseAmt };
    }

    // High cards (AKs, AKo, AQs, JJ, TT)
    if ((isPair && high >= 10) || (high === 14 && low >= 12)) {
      const raiseAmt = Math.min(bot.chips, callAmount + minRaise * 2);
      return { action: 'raise', amount: raiseAmt };
    }

    // Suited connectors & mid pairs (99-55, QJs, JTs, T9s, 98s, 87s)
    if (
      (isPair && high >= 5) ||
      (isSuited && (high >= 10 || (isConnected && high >= 7)))
    ) {
      if (canCheck) {
        if (isInPosition && Math.random() < 0.4) {
          return { action: 'raise', amount: Math.min(bot.chips, minRaise) };
        }
        return { action: 'check', amount: 0 };
      }
      if (callAmount <= bigBlind * 3.5) {
        return { action: 'call', amount: callAmount };
      }
    }

    if (canCheck) {
      return { action: 'check', amount: 0 };
    }

    // Defense in big blind or small call
    if (callAmount <= bigBlind && (isSuited || high >= 9 || isConnected)) {
      return { action: 'call', amount: callAmount };
    }

    return { action: 'fold', amount: 0 };
  }
}
