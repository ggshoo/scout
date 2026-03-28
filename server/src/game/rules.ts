import {
  HandCard,
  TableShow,
  visibleValue,
  ShowAction,
  ScoutAction,
} from 'shared';

// ─── Set Validation ───────────────────────────────────────────────────────────

/**
 * A set of cards from your hand is valid if:
 *  - all cards show the same value, OR
 *  - the values form a strictly consecutive ascending sequence.
 * The cards must also be a contiguous slice of the hand (indices are consecutive).
 */
export function isValidSet(cards: HandCard[]): boolean {
  if (cards.length === 0) return false;
  const values = cards.map(visibleValue);

  // Check all-same
  if (values.every((v) => v === values[0])) return true;

  // Check consecutive run (ascending)
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Returns the "strength" of a set for comparison purposes.
 * Higher size is always better.  For same-size sets we compare
 * [minValue, maxValue] lexicographically.
 */
function setStrength(cards: HandCard[]): [number, number, number] {
  const values = cards.map(visibleValue);
  return [cards.length, Math.min(...values), Math.max(...values)];
}

/**
 * Returns true if `challenger` beats `incumbent`.
 * Rules:
 *  1. More cards always wins.
 *  2. Same card count → higher minimum value wins.
 *  3. Still tied → higher maximum value wins.
 */
export function beatsShow(challenger: HandCard[], incumbent: TableShow): boolean {
  const [cLen, cMin, cMax] = setStrength(challenger);
  const [iLen, iMin, iMax] = setStrength(incumbent.cards);

  if (cLen !== iLen) return cLen > iLen;
  if (cMin !== iMin) return cMin > iMin;
  return cMax > iMax;
}

// ─── Index Validation ────────────────────────────────────────────────────────

/**
 * Ensure `indices` is a non-empty, contiguous, in-bounds ascending slice.
 */
export function validateShowIndices(hand: HandCard[], indices: number[]): string | null {
  if (indices.length === 0) return 'Must select at least one card.';

  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] < 0 || sorted[i] >= hand.length) return 'Card index out of range.';
    if (i > 0 && sorted[i] !== sorted[i - 1] + 1) return 'Selected cards must be consecutive in hand.';
  }
  return null;
}

// ─── Hand Flip ────────────────────────────────────────────────────────────────

/**
 * Flip the entire hand: reverse order and toggle each card's face.
 */
export function flipHand(hand: HandCard[]): HandCard[] {
  return [...hand]
    .reverse()
    .map((c) => ({ ...c, face: c.face === 'lo' ? ('hi' as const) : ('lo' as const) }));
}

// ─── Scout helpers ────────────────────────────────────────────────────────────

/**
 * Remove and return the chosen end card from the show.
 * Mutates the cards array of the show (returns new array).
 */
export function takeFromShow(show: TableShow, end: ScoutAction['end']): { card: HandCard; remaining: HandCard[] } {
  const cards = [...show.cards];
  const card = end === 'left' ? cards.shift()! : cards.pop()!;
  return { card, remaining: cards };
}

/**
 * Insert a card into a hand at position `at`.
 */
export function insertIntoHand(hand: HandCard[], card: HandCard, at: number): HandCard[] {
  const result = [...hand];
  result.splice(at, 0, card);
  return result;
}

// ─── Round end detection ──────────────────────────────────────────────────────

/**
 * The round is over when:
 *  a) A player has emptied their hand, OR
 *  b) All players have scouted in a row without anyone showing
 *     (consecutiveScouts >= number of active players, meaning nobody can/will show).
 */
export function isRoundOver(
  hands: Record<string, HandCard[]>,
  consecutiveScouts: number,
  numPlayers: number,
): boolean {
  if (Object.values(hands).some((h) => h.length === 0)) return true;
  if (consecutiveScouts >= numPlayers) return true;
  return false;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Calculate round scores.
 * score = scoutTokens – cardsInHand
 * The player who ended the round (empty hand or forced win) gets +1 per opponent.
 */
export function calculateRoundScores(
  players: Array<{ id: string; hand: HandCard[]; scoutTokens: number }>,
  winnerId: string | null,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const p of players) {
    scores[p.id] = p.scoutTokens - p.hand.length;
  }
  // bonus for winner
  if (winnerId && winnerId in scores) {
    const opponents = players.filter((p) => p.id !== winnerId);
    scores[winnerId] += opponents.length;
  }
  return scores;
}
