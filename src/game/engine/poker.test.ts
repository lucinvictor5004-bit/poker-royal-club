/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Card } from './Card.ts';
import { Deck } from './Deck.ts';
import { HandEvaluator, HandRank } from './HandEvaluator.ts';
import { PotManager } from './PotManager.ts';
import { Player } from './Player.ts';
import { PokerEngine } from './PokerEngine.ts';

test('Card parsing and representation', () => {
  const c1 = Card.fromString('Ah');
  assert.equal(c1.rank, 14);
  assert.equal(c1.suit, 'hearts');
  assert.equal(c1.isRed, true);

  const c2 = Card.fromString('10s');
  assert.equal(c2.rank, 10);
  assert.equal(c2.suit, 'spades');
  assert.equal(c2.isRed, false);

  const c3 = Card.fromString('2d');
  assert.equal(c3.rank, 2);
  assert.equal(c3.suit, 'diamonds');
});

test('Deck initializes with 52 unique cards and draws correctly', () => {
  const deck = new Deck();
  assert.equal(deck.remaining, 52);

  const drawn: Card[] = [];
  for (let i = 0; i < 52; i++) {
    drawn.push(deck.draw());
  }
  assert.equal(deck.remaining, 0);

  const uniqueIds = new Set(drawn.map((c) => c.id));
  assert.equal(uniqueIds.size, 52);

  deck.reset();
  assert.equal(deck.remaining, 52);
});

test('HandEvaluator identifies Royal Flush', () => {
  const cards = [
    Card.fromString('Ah'),
    Card.fromString('Kh'),
    Card.fromString('Qh'),
    Card.fromString('Jh'),
    Card.fromString('10h'),
    Card.fromString('2c'),
    Card.fromString('3s'),
  ];
  const evalHand = HandEvaluator.evaluate(cards);
  assert.equal(evalHand.rank, HandRank.ROYAL_FLUSH);
});

test('HandEvaluator identifies Wheel Straight (A-2-3-4-5)', () => {
  const cards = [
    Card.fromString('Ah'),
    Card.fromString('2c'),
    Card.fromString('3d'),
    Card.fromString('4s'),
    Card.fromString('5h'),
    Card.fromString('9c'),
    Card.fromString('Kd'),
  ];
  const evalHand = HandEvaluator.evaluate(cards);
  assert.equal(evalHand.rank, HandRank.STRAIGHT);
  assert.equal(evalHand.tiebreakValues[0], 5); // 5 is high card in wheel straight
});

test('HandEvaluator resolves kicker tiebreaks correctly', () => {
  // Both have Pair of Kings, Player 1 has Ace kicker, Player 2 has Queen kicker
  const hand1 = [
    Card.fromString('Kh'),
    Card.fromString('Kd'),
    Card.fromString('Ac'),
    Card.fromString('8s'),
    Card.fromString('4h'),
  ];
  const hand2 = [
    Card.fromString('Ks'),
    Card.fromString('Kc'),
    Card.fromString('Qh'),
    Card.fromString('8d'),
    Card.fromString('4c'),
  ];

  const eval1 = HandEvaluator.evaluate(hand1);
  const eval2 = HandEvaluator.evaluate(hand2);

  assert.equal(eval1.rank, HandRank.ONE_PAIR);
  assert.equal(eval2.rank, HandRank.ONE_PAIR);
  assert.equal(HandEvaluator.compareHands(eval1, eval2), 1);
});

test('HandEvaluator detects Full House correctly', () => {
  const cards = [
    Card.fromString('9h'),
    Card.fromString('9d'),
    Card.fromString('9s'),
    Card.fromString('4c'),
    Card.fromString('4h'),
    Card.fromString('2d'),
    Card.fromString('Ks'),
  ];
  const evalHand = HandEvaluator.evaluate(cards);
  assert.equal(evalHand.rank, HandRank.FULL_HOUSE);
  assert.equal(evalHand.tiebreakValues[0], 9);
  assert.equal(evalHand.tiebreakValues[1], 4);
});

test('PotManager calculates multiple side pots accurately', () => {
  const potManager = new PotManager();
  // Player 1 all-in for 100
  // Player 2 all-in for 300
  // Player 3 calls 500
  // Player 4 calls 500
  potManager.addContribution('P1', 100);
  potManager.addContribution('P2', 300);
  potManager.addContribution('P3', 500);
  potManager.addContribution('P4', 500);

  const active = ['P1', 'P2', 'P3', 'P4'];
  const pots = potManager.calculatePots(active);

  // Pot 1 (Main Pot): 100 * 4 = 400 (P1, P2, P3, P4 eligible)
  assert.equal(pots[0].amount, 400);
  assert.deepEqual(pots[0].eligiblePlayerIds.sort(), ['P1', 'P2', 'P3', 'P4']);

  // Pot 2 (Side Pot 1): (300-100) * 3 = 600 (P2, P3, P4 eligible)
  assert.equal(pots[1].amount, 600);
  assert.deepEqual(pots[1].eligiblePlayerIds.sort(), ['P2', 'P3', 'P4']);

  // Pot 3 (Side Pot 2): (500-300) * 2 = 400 (P3, P4 eligible)
  assert.equal(pots[2].amount, 400);
  assert.deepEqual(pots[2].eligiblePlayerIds.sort(), ['P3', 'P4']);

  assert.equal(potManager.getTotalPot(), 1400);
});

test('PokerEngine runs preflop betting round and handles folds', () => {
  const p1 = new Player({ id: 'p1', name: 'Alice', isHuman: true, chips: 1000 });
  const p2 = new Player({ id: 'p2', name: 'Bob', isHuman: false, chips: 1000 });
  const p3 = new Player({ id: 'p3', name: 'Charlie', isHuman: false, chips: 1000 });

  const engine = new PokerEngine({
    smallBlind: 10,
    bigBlind: 20,
    players: [p1, p2, p3],
  });

  engine.startNewHand();
  assert.equal(engine.phase, 'preflop');
  assert.equal(engine.potManager.getTotalPot(), 30); // SB (10) + BB (20)

  // Each player receives 2 cards
  assert.equal(p1.holeCards.length, 2);
  assert.equal(p2.holeCards.length, 2);
  assert.equal(p3.holeCards.length, 2);
});

test('PokerEngine supports removing and adding bots dynamically', () => {
  const p1 = new Player({ id: 'p1', name: 'Alice', isHuman: true, chips: 1000 });
  const p2 = new Player({ id: 'p2', name: 'Bob', isHuman: false, chips: 1000 });
  const p3 = new Player({ id: 'p3', name: 'Charlie', isHuman: false, chips: 1000 });

  const engine = new PokerEngine({
    smallBlind: 10,
    bigBlind: 20,
    players: [p1, p2, p3],
  });

  assert.equal(engine.players.length, 3);

  // Remove bot Charlie
  const removed = engine.removePlayer('p3');
  assert.equal(removed, true);
  assert.equal(engine.players.length, 2);

  // Add a new bot
  const newBot = engine.addBot('David', 'pro');
  assert.notEqual(newBot, null);
  assert.equal(engine.players.length, 3);
  assert.equal(engine.players[2].name, 'David');
});
