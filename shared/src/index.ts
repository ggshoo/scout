// ─── Card Types ──────────────────────────────────────────────────────────────

/** A card has two numeric values – one on each face. lo < hi always. */
export interface Card {
  id: string;   // e.g. "3-7"
  lo: number;   // lower face value  (shown when orientation is "lo")
  hi: number;   // higher face value (shown when orientation is "hi")
}

/**
 * A card as it sits in a player's hand.
 * `face` determines which value is currently visible:
 *   "lo" → lo value is up; "hi" → hi value is up.
 */
export interface HandCard extends Card {
  face: 'lo' | 'hi';
}

/** Visible value of a HandCard based on current face. */
export function visibleValue(card: HandCard): number {
  return card.face === 'lo' ? card.lo : card.hi;
}

// ─── Game Phases ─────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'       // waiting for players
  | 'orientation' // players choose hand orientation (flip or not)
  | 'playing'     // active play
  | 'round_end'   // round just finished
  | 'game_end';   // game over

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Flip your entire hand (reverse order + swap face). Allowed multiple times during orientation phase. */
export interface FlipHandAction {
  type: 'FLIP_HAND';
}

/** Confirm you're happy with your hand and ready to start. */
export interface ReadyAction {
  type: 'READY';
}

/**
 * Play a consecutive run of cards from your hand to become the new table show.
 * `indices` must be a contiguous ascending sequence of indices into your hand.
 */
export interface ShowAction {
  type: 'SHOW';
  indices: number[]; // consecutive indices in your hand (e.g. [2, 3, 4])
}

/**
 * Take a card from either end of the current table show and insert it into your hand.
 * `end`: 'left' = index 0 of show, 'right' = last index of show.
 * `insertAt`: position in your hand to insert the card.
 * `face`: which face to expose after inserting.
 */
export interface ScoutAction {
  type: 'SCOUT';
  end: 'left' | 'right';
  insertAt: number;
  face: 'lo' | 'hi';
}

/**
 * Scout first, then immediately show. Costs a scout-and-show token.
 * The scouted card may (or may not) be part of the played set.
 */
export interface ScoutAndShowAction {
  type: 'SCOUT_AND_SHOW';
  scout: Omit<ScoutAction, 'type'>;
  show: Omit<ShowAction, 'type'>;
}

/** Start the next round. */
export interface NextRoundAction {
  type: 'NEXT_ROUND';
}

export type GameAction =
  | FlipHandAction
  | ReadyAction
  | ShowAction
  | ScoutAction
  | ScoutAndShowAction
  | NextRoundAction;

// ─── Player State ─────────────────────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  hand: HandCard[];
  hasFlipped: boolean;   // current flip state (toggled on each flip)
  isReady: boolean;
  scoutTokens: number;   // Scout chips (earned in 3-5p; spent in 2p)
  scoutShowTokens: number; // remaining scout-and-show chips this round (0 for 2-player)
  capturedCards: number; // cards taken from defeated Active Sets (each = +1 point)
  totalScore: number;    // cumulative across rounds
}

// ─── Table Show ───────────────────────────────────────────────────────────────

export interface TableShow {
  cards: HandCard[];      // the played cards (left = index 0)
  playedBy: string;       // player id who played this show
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  round: number;
  stateVersion: number;
  playerOrder: string[];          // [player0Id, player1Id]
  players: Record<string, PlayerState>;
  currentTurnPlayerId: string | null;
  tableShow: TableShow | null;
  /** Starting player index for this round (alternates each round). */
  roundStartPlayerIdx: number;
  /** Number of consecutive scouts without a new show (used to detect stalemate). */
  consecutiveScouts: number;
  /**
   * 2-player only: true when the current player has already scouted this turn.
   * Once set, the player may not Show — they can only Scout again (if chips remain)
   * or their turn ends and this flag is reset when the turn passes.
   */
  currentPlayerHasScoutedThisTurn: boolean;
  eventLog: EventLogEntry[];
  roundScores: Array<Record<string, number>>; // one entry per completed round
}

// ─── Event Log ────────────────────────────────────────────────────────────────

export interface EventLogEntry {
  seq: number;
  playerId: string;
  action: GameAction;
  description: string;
  timestamp: number;
}

// ─── Socket Events ───────────────────────────────────────────────────────────

// Client → Server
export interface ClientToServerEvents {
  'room:create': (playerName: string, callback: (res: RoomCreateResponse) => void) => void;
  'room:join': (payload: RoomJoinPayload, callback: (res: RoomJoinResponse) => void) => void;
  'game:action': (action: GameAction, callback: (res: ActionResponse) => void) => void;
  'room:reconnect': (payload: ReconnectPayload, callback: (res: ReconnectResponse) => void) => void;
}

// Server → Client
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'game:state': (state: GameState) => void;
  'game:error': (msg: string) => void;
  'player:connected': (info: { playerId: string; name: string }) => void;
  'player:disconnected': (info: { playerId: string }) => void;
  'player:reconnected': (info: { playerId: string }) => void;
}

// ─── Room Types ───────────────────────────────────────────────────────────────

export interface RoomState {
  roomId: string;
  joinCode: string;
  players: Array<{ id: string; name: string; connected: boolean }>;
}

export interface RoomCreateResponse {
  ok: boolean;
  roomId?: string;
  joinCode?: string;
  playerId?: string;
  error?: string;
}

export interface RoomJoinPayload {
  joinCode: string;
  playerName: string;
}

export interface RoomJoinResponse {
  ok: boolean;
  roomId?: string;
  playerId?: string;
  error?: string;
}

export interface ReconnectPayload {
  roomId: string;
  playerId: string;
}

export interface ReconnectResponse {
  ok: boolean;
  error?: string;
}

export interface ActionResponse {
  ok: boolean;
  error?: string;
}
