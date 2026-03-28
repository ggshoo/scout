import { Card, HandCard } from 'shared';

/**
 * Build the full Scout deck.
 * 45 cards: all pairs (lo, hi) where 1 ≤ lo < hi ≤ 10.
 */
export function buildFullDeck(): Card[] {
  const deck: Card[] = [];
  for (let lo = 1; lo <= 10; lo++) {
    for (let hi = lo + 1; hi <= 10; hi++) {
      deck.push({ id: `${lo}-${hi}`, lo, hi });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle (in-place).
 */
export function shuffle<T>(arr: T[], rng?: () => number): T[] {
  const rand = rng ?? Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deal cards for a 2-player game.
 * Uses 26 cards (first 26 after shuffle), giving 11 cards to each player
 * and discarding 4.  Returns hands in default orientation (face = 'lo').
 */
export function dealCards(): { hand0: HandCard[]; hand1: HandCard[] } {
  const deck = shuffle(buildFullDeck());
  const subset = deck.slice(0, 26); // 26 cards for 2-player game

  const toHandCards = (cards: Card[]): HandCard[] =>
    cards.map((c) => ({ ...c, face: 'lo' as const }));

  return {
    hand0: toHandCards(subset.slice(0, 11)),
    hand1: toHandCards(subset.slice(11, 22)),
    // subset[22..25] are set aside (not dealt)
  };
}
