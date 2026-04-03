import {
  HandCard,
  TableShow,
  PlayerState,
  visibleValue,
  ShowAction,
  ScoutAction,
} from 'shared';

// ─── Set Validation ───────────────────────────────────────────────────────────

/**
 * A set of cards from your hand is valid if:
 *  - all cards show the same value, OR
 *  - the values form a strictly consecutive ascending sequence, OR
 *  - the values form a strictly consecutive descending sequence.
 * The cards must also be a contiguous slice of the hand (indices are consecutive).
 */
export function isValidSet(cards: HandCard[]): boolean {
  if (cards.length === 0) return false;
  const values = cards.map(visibleValue);

  // Check all-same
  if (values.every((v) => v === values[0])) return true;

  // Check consecutive run (ascending)
  let isAscending = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      isAscending = false;
      break;
    }
  }
  if (isAscending) return true;

  // Check consecutive run (descending)
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] - 1) return false;
  }
  return true;
}

/**
 * Returns true if all cards in the set show the same value.
 */
export function isAllSame(cards: HandCard[]): boolean {
  if (cards.length === 0) return false;
  const values = cards.map(visibleValue);
  return values.every((v) => v === values[0]);
}

/**
 * Returns the "strength" of a set for comparison purposes.
 * The tuple is compared lexicographically:
 *  [length, typeRank, minValue, maxValue]
 * where typeRank is 1 for a same-same hand and 0 for a consecutive run.
 */
function setStrength(cards: HandCard[]): [number, number, number, number] {
  const values = cards.map(visibleValue);
  const isSameSame = values.every((v) => v === values[0]);
  const typeRank = isSameSame ? 1 : 0; // same-same (1) beats consecutive run (0)
  return [cards.length, typeRank, Math.min(...values), Math.max(...values)];
}

/**
 * Returns true if `challenger` beats `incumbent`.
 * Rules:
 *  1. More cards always wins.
 *  2. Same card count → same-same hand beats a consecutive run.
 *  3. Same card count and same type → higher minimum value wins.
 *  4. Still tied → higher maximum value wins.
 */
export function beatsShow(challenger: HandCard[], incumbent: TableShow): boolean {
  const [cLen, cType, cMin, cMax] = setStrength(challenger);
  const [iLen, iType, iMin, iMax] = setStrength(incumbent.cards);

  if (cLen !== iLen) return cLen > iLen;
  if (cType !== iType) return cType > iType;
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
 * Flip the entire hand: toggle each card's face without changing the order.
 */
export function flipHand(hand: HandCard[]): HandCard[] {
  return hand.map((c) => ({ ...c, face: c.face === 'lo' ? ('hi' as const) : ('lo' as const) }));
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
 * score = capturedCards + scoutTokens – cardsInHand
 * The player who ended the round (empty hand or forced win) gets +1 per opponent.
 */
export function calculateRoundScores(
  players: Array<{ id: string; hand: HandCard[]; scoutTokens: number; capturedCards: number }>,
  winnerId: string | null,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const p of players) {
    scores[p.id] = p.capturedCards + p.scoutTokens - p.hand.length;
  }
  // bonus for winner
  if (winnerId && winnerId in scores) {
    const opponents = players.filter((p) => p.id !== winnerId);
    scores[winnerId] += opponents.length;
  }
  return scores;
}

// ─── 2-Player action availability ────────────────────────────────────────────

/**
 * Returns true if a player can make any valid move in 2-player mode.
 * They can act if:
 *  - They have Scout chips remaining AND there is an active show to scout from, OR
 *  - They can make a valid Show (any contiguous slice of their hand beats the show,
 *    or there is no show and they have at least one card).
 */
export function canPlayerAct(player: PlayerState, tableShow: TableShow | null): boolean {
  if (player.hand.length === 0) return false;

  // Can Scout if chips remain and there's something to scout from
  if (player.scoutTokens > 0 && tableShow && tableShow.cards.length > 0) return true;

  // Can Show any valid set when there's no active show
  if (!tableShow) return true;

  // Check if any contiguous subsequence of the hand forms a valid set that beats the show
  for (let start = 0; start < player.hand.length; start++) {
    for (let end = start; end < player.hand.length; end++) {
      const cards = player.hand.slice(start, end + 1);
      if (isValidSet(cards) && beatsShow(cards, tableShow)) {
        return true;
      }
    }
  }
  return false;
}
