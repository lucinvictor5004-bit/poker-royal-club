/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Card } from './Card.ts';
import {
  ThreeCardPokerEvaluator,
  ThreeCardRank,
} from './ThreeCardPokerEvaluator.ts';
import { ThreeCardPokerEngine } from './ThreeCardPokerEngine.ts';

test('ThreeCardPokerEvaluator: identifies Straight Flush, Trips, Straight, and Flush', () => {
  // Straight Flush
  const sf = [Card.fromString('Qh'), Card.fromString('Jh'), Card.fromString('10h')];
  const evalSf = ThreeCardPokerEvaluator.evaluate(sf);
  assert.equal(evalSf.rank, ThreeCardRank.STRAIGHT_FLUSH);

  // Three of a Kind
  const trips = [Card.fromString('8s'), Card.fromString('8d'), Card.fromString('8c')];
  const evalTrips = ThreeCardPokerEvaluator.evaluate(trips);
  assert.equal(evalTrips.rank, ThreeCardRank.THREE_OF_A_KIND);

  // In 3-card poker, Trips beat Straight!
  assert.equal(ThreeCardPokerEvaluator.compare(evalTrips, evalSf), -1);

  // Straight
  const straight = [Card.fromString('9s'), Card.fromString('8h'), Card.fromString('7d')];
  const evalStraight = ThreeCardPokerEvaluator.evaluate(straight);
  assert.equal(evalStraight.rank, ThreeCardRank.STRAIGHT);

  // In 3-card poker, Straight beats Flush!
  const flush = [Card.fromString('As'), Card.fromString('Js'), Card.fromString('4s')];
  const evalFlush = ThreeCardPokerEvaluator.evaluate(flush);
  assert.equal(evalFlush.rank, ThreeCardRank.FLUSH);

  assert.equal(ThreeCardPokerEvaluator.compare(evalStraight, evalFlush), 1);
});

test('ThreeCardPokerEvaluator: identifies Ace-low straight (A-2-3)', () => {
  const wheel3 = [Card.fromString('Ah'), Card.fromString('3d'), Card.fromString('2s')];
  const evalWheel = ThreeCardPokerEvaluator.evaluate(wheel3);
  assert.equal(evalWheel.rank, ThreeCardRank.STRAIGHT);
  assert.equal(evalWheel.tiebreaks[0], 3);
});

test('ThreeCardPokerEvaluator: dealer qualification requires Queen or higher', () => {
  // Queen-4-2 qualifies
  const qHand = ThreeCardPokerEvaluator.evaluate([
    Card.fromString('Qs'),
    Card.fromString('4d'),
    Card.fromString('2h'),
  ]);
  assert.equal(ThreeCardPokerEvaluator.dealerQualifies(qHand), true);

  // Jack-10-8 does not qualify
  const jHand = ThreeCardPokerEvaluator.evaluate([
    Card.fromString('Jh'),
    Card.fromString('10c'),
    Card.fromString('8d'),
  ]);
  assert.equal(ThreeCardPokerEvaluator.dealerQualifies(jHand), false);

  // Pair of 2s qualifies automatically
  const pair2 = ThreeCardPokerEvaluator.evaluate([
    Card.fromString('2h'),
    Card.fromString('2d'),
    Card.fromString('4c'),
  ]);
  assert.equal(ThreeCardPokerEvaluator.dealerQualifies(pair2), true);
});

test('ThreeCardPokerEngine: deals, handles fold, and calculates payouts', () => {
  const engine = new ThreeCardPokerEngine(1000);
  engine.setBets(50, 20); // Ante 50, Pair Plus 20
  assert.equal(engine.dealHand(), true);
  assert.equal(engine.phase, 'decision');
  assert.equal(engine.playerChips, 930); // 1000 - 70

  // Fold
  engine.playAction('fold');
  assert.equal(engine.phase, 'ended');
  assert.equal(engine.playerChips, 930); // 70 lost
});

test('ThreeCardPokerEngine: multiplayer with friends at the same table', () => {
  const engine = new ThreeCardPokerEngine({
    players: [
      { id: 'user_1', name: 'Алиса (Хост)', chips: 1000, isHost: true },
      { id: 'user_2', name: 'Борис', chips: 1500, isHost: false },
      { id: 'user_3', name: 'Виктор', chips: 2000, isHost: false },
    ],
    defaultAnte: 50,
  });

  assert.equal(engine.players.length, 3);
  assert.equal(engine.phase, 'betting');

  // Friends set their bets
  assert.equal(engine.setBets(50, 25, 'user_1'), true);
  assert.equal(engine.setBets(100, 0, 'user_2'), true);
  assert.equal(engine.setBets(50, 10, 'user_3'), true);

  // Host deals cards to all
  assert.equal(engine.dealHand(), true);
  assert.equal(engine.phase, 'decision');

  // Verify all 3 players got 3 cards
  assert.equal(engine.players[0].cards.length, 3);
  assert.equal(engine.players[1].cards.length, 3);
  assert.equal(engine.players[2].cards.length, 3);
  assert.equal(engine.dealerCards.length, 3);

  // User 1 folds, User 2 plays, User 3 plays
  assert.equal(engine.playAction('fold', 'user_1'), true);
  assert.equal(engine.phase, 'decision'); // still waiting for user 2 and 3

  assert.equal(engine.playAction('play', 'user_2'), true);
  assert.equal(engine.phase, 'decision'); // still waiting for user 3

  assert.equal(engine.playAction('play', 'user_3'), true);
  // All have decided -> phase transitions to ended & dealer is revealed
  assert.equal(engine.phase, 'ended');
  assert.equal(engine.dealerRevealed, true);
  assert.ok(engine.dealerHand !== null);

  // Verify User 1 lost ante & pair plus
  assert.equal(engine.players[0].payoutSummary?.netProfit, -75);
  assert.ok(engine.players[1].payoutSummary !== null);
  assert.ok(engine.players[2].payoutSummary !== null);

  // New round resets
  engine.resetForNewRound();
  assert.equal(engine.phase, 'betting');
  assert.equal(engine.players[0].cards.length, 0);
  assert.equal(engine.dealerCards.length, 0);
});

