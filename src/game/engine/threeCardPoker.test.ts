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
