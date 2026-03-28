import {
  GameState,
  GameAction,
  PlayerState,
  HandCard,
  TableShow,
  EventLogEntry,
  visibleValue,
} from 'shared';
import { dealCards } from './deck';
import {
  isValidSet,
  beatsShow,
  validateShowIndices,
  flipHand,
  takeFromShow,
  insertIntoHand,
  isRoundOver,
  calculateRoundScores,
  canPlayerAct,
} from './rules';

const SCOUT_SHOW_TOKENS_PER_ROUND = 1;

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialGameState(players: Array<{ id: string; name: string }>): GameState {
  const playerOrder = players.map((p) => p.id);
  const isTwoPlayer = players.length === 2;
  const playerMap: Record<string, PlayerState> = {};
  for (const p of players) {
    playerMap[p.id] = {
      id: p.id,
      name: p.name,
      hand: [],
      hasFlipped: false,
      isReady: false,
      // 2-player: start with 3 Scout chips and no Scout & Show chips
      scoutTokens: isTwoPlayer ? 3 : 0,
      scoutShowTokens: isTwoPlayer ? 0 : SCOUT_SHOW_TOKENS_PER_ROUND,
      capturedCards: 0,
      totalScore: 0,
    };
  }
  return {
    phase: 'orientation',
    round: 1,
    stateVersion: 0,
    playerOrder,
    players: playerMap,
    currentTurnPlayerId: null,
    tableShow: null,
    roundStartPlayerIdx: 0,
    consecutiveScouts: 0,
    eventLog: [],
    roundScores: [],
  };
}

// ─── Deal ──────────────────────────────────────────────────────────────────────

export function dealRound(state: GameState): GameState {
  const { hand0, hand1 } = dealCards();
  const [id0, id1] = state.playerOrder;
  const isTwoPlayer = state.playerOrder.length === 2;
  const players = { ...state.players };
  players[id0] = {
    ...players[id0],
    hand: hand0,
    hasFlipped: false,
    isReady: false,
    scoutTokens: isTwoPlayer ? 3 : 0,
    scoutShowTokens: isTwoPlayer ? 0 : SCOUT_SHOW_TOKENS_PER_ROUND,
    capturedCards: 0,
  };
  players[id1] = {
    ...players[id1],
    hand: hand1,
    hasFlipped: false,
    isReady: false,
    scoutTokens: isTwoPlayer ? 3 : 0,
    scoutShowTokens: isTwoPlayer ? 0 : SCOUT_SHOW_TOKENS_PER_ROUND,
    capturedCards: 0,
  };
  return { ...state, players, phase: 'orientation', tableShow: null, consecutiveScouts: 0 };
}

// ─── Apply Action ─────────────────────────────────────────────────────────────

export function applyAction(
  state: GameState,
  action: GameAction,
  playerId: string,
): { state: GameState; error?: string } {
  const err = (msg: string) => ({ state, error: msg });

  switch (action.type) {
    case 'FLIP_HAND': {
      if (state.phase !== 'orientation') return err('You can only flip during the orientation phase.');
      const player = state.players[playerId];
      if (player.hasFlipped) return err('You have already flipped your hand.');
      const newHand = flipHand(player.hand);
      const newState = updatePlayer(state, playerId, { hand: newHand, hasFlipped: true });
      return { state: log(newState, playerId, action, `${player.name} flipped their hand.`) };
    }

    case 'READY': {
      if (state.phase !== 'orientation') return err('Not in orientation phase.');
      const newState = updatePlayer(state, playerId, { isReady: true });
      const allReady = newState.playerOrder.every((id) => newState.players[id].isReady);
      if (allReady) {
        const startId = newState.playerOrder[newState.roundStartPlayerIdx];
        const playingState: GameState = {
          ...newState,
          phase: 'playing',
          currentTurnPlayerId: startId,
          tableShow: null,
          consecutiveScouts: 0,
        };
        return { state: log(playingState, playerId, action, `${newState.players[playerId].name} is ready. Game starts!`) };
      }
      return { state: log(newState, playerId, action, `${newState.players[playerId].name} is ready.`) };
    }

    case 'SHOW': {
      if (state.phase !== 'playing') return err('Not in playing phase.');
      if (state.currentTurnPlayerId !== playerId) return err('Not your turn.');
      const player = state.players[playerId];
      const { indices } = action;

      const indexErr = validateShowIndices(player.hand, indices);
      if (indexErr) return err(indexErr);

      const sorted = [...indices].sort((a, b) => a - b);
      const cards = sorted.map((i) => player.hand[i]);

      if (!isValidSet(cards)) return err('Cards do not form a valid set (must be all-same or consecutive run).');

      if (state.tableShow && !beatsShow(cards, state.tableShow)) {
        return err('Your set does not beat the current show.');
      }

      // Remove played cards from hand
      const sortedDesc = [...sorted].sort((a, b) => b - a);
      let newHand = [...player.hand];
      for (const i of sortedDesc) newHand.splice(i, 1);

      // Capture cards from the defeated Active Set
      const beatenCount = state.tableShow ? state.tableShow.cards.length : 0;
      const newCaptured = player.capturedCards + beatenCount;

      const newShow: TableShow = { cards, playedBy: playerId };
      let newState = updatePlayer(state, playerId, { hand: newHand, capturedCards: newCaptured });
      newState = { ...newState, tableShow: newShow, consecutiveScouts: 0 };

      const vals = cards.map(visibleValue).join(', ');
      newState = log(newState, playerId, action, `${player.name} shows [${vals}].`);
      newState = { ...newState, currentTurnPlayerId: nextPlayer(state, playerId) };

      // Check round over
      if (isRoundOver(toHandMap(newState), newState.consecutiveScouts, newState.playerOrder.length)) {
        return { state: endRound(newState, playerId) };
      }
      return { state: newState };
    }

    case 'SCOUT': {
      if (state.phase !== 'playing') return err('Not in playing phase.');
      if (state.currentTurnPlayerId !== playerId) return err('Not your turn.');
      if (!state.tableShow) return err('There is no current show to scout from.');
      if (state.tableShow.cards.length === 0) return err('The show is empty.');

      const isTwoPlayer = state.playerOrder.length === 2;
      const player = state.players[playerId];

      // 2-player: scouting costs 1 of the player's own Scout chips
      if (isTwoPlayer && player.scoutTokens <= 0) {
        return err('No Scout chips remaining. You must Show.');
      }

      const scoutResult = doScout(state, playerId, action, isTwoPlayer);
      if ('error' in scoutResult) return err(scoutResult.error);

      let newState = scoutResult.state;
      newState = { ...newState, consecutiveScouts: newState.consecutiveScouts + 1 };

      if (isTwoPlayer) {
        // 2-player: same player goes again after Scouting
        newState = { ...newState, currentTurnPlayerId: playerId };

        // Check if that player can still act (has chips or can Show)
        const updatedPlayer = newState.players[playerId];
        if (!canPlayerAct(updatedPlayer, newState.tableShow)) {
          return { state: endRound(newState, null) };
        }
      } else {
        newState = { ...newState, currentTurnPlayerId: nextPlayer(state, playerId) };

        if (isRoundOver(toHandMap(newState), newState.consecutiveScouts, newState.playerOrder.length)) {
          return { state: endRound(newState, null) };
        }
      }

      return { state: newState };
    }

    case 'SCOUT_AND_SHOW': {
      if (state.phase !== 'playing') return err('Not in playing phase.');
      if (state.currentTurnPlayerId !== playerId) return err('Not your turn.');
      if (!state.tableShow) return err('There is no current show to scout from.');
      const player = state.players[playerId];
      if (player.scoutShowTokens <= 0) return err('No Scout & Show tokens remaining.');

      const scoutResult = doScout(state, playerId, { type: 'SCOUT', ...action.scout }, false);
      if ('error' in scoutResult) return err(scoutResult.error);

      let midState = updatePlayer(scoutResult.state, playerId, {
        scoutShowTokens: scoutResult.state.players[playerId].scoutShowTokens - 1,
      });

      // Now apply the show on the mid-state
      const showResult = applyAction(midState, { type: 'SHOW', ...action.show }, playerId);
      if (showResult.error) return err(showResult.error);

      return { state: showResult.state };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'round_end') return err('Not in round_end phase.');
      const newRound = state.round + 1;
      const MAX_ROUNDS = 3;
      if (newRound > MAX_ROUNDS) {
        return { state: { ...state, phase: 'game_end' } };
      }
      // Alternate starting player
      const nextStartIdx = (state.roundStartPlayerIdx + 1) % state.playerOrder.length;
      const newState = dealRound({
        ...state,
        round: newRound,
        roundStartPlayerIdx: nextStartIdx,
        stateVersion: state.stateVersion + 1,
      });
      return { state: newState };
    }

    default:
      return err('Unknown action.');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updatePlayer(
  state: GameState,
  playerId: string,
  update: Partial<PlayerState>,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...state.players[playerId], ...update },
    },
    stateVersion: state.stateVersion + 1,
  };
}

function log(
  state: GameState,
  playerId: string,
  action: GameAction,
  description: string,
): GameState {
  const entry: EventLogEntry = {
    seq: state.eventLog.length,
    playerId,
    action,
    description,
    timestamp: Date.now(),
  };
  return { ...state, eventLog: [...state.eventLog, entry] };
}

function nextPlayer(state: GameState, currentId: string): string {
  const idx = state.playerOrder.indexOf(currentId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length];
}

function toHandMap(state: GameState): Record<string, HandCard[]> {
  const m: Record<string, HandCard[]> = {};
  for (const id of state.playerOrder) m[id] = state.players[id].hand;
  return m;
}

function doScout(
  state: GameState,
  playerId: string,
  action: { type: 'SCOUT'; end: 'left' | 'right'; insertAt: number; face: 'lo' | 'hi' },
  isTwoPlayer: boolean = false,
): { state: GameState } | { error: string } {
  const player = state.players[playerId];
  const show = state.tableShow!;
  const { card, remaining } = takeFromShow(show, action.end);
  const orientedCard: HandCard = { ...card, face: action.face };
  const newHand = insertIntoHand(player.hand, orientedCard, action.insertAt);

  let newState = updatePlayer(state, playerId, { hand: newHand });

  if (isTwoPlayer) {
    // 2-player: scouting player pays 1 Scout chip to the center
    newState = updatePlayer(newState, playerId, {
      scoutTokens: newState.players[playerId].scoutTokens - 1,
    });
  } else {
    // Normal: give 1 Scout chip to the show owner
    const showOwnerId = show.playedBy;
    const showOwner = newState.players[showOwnerId];
    if (showOwnerId !== playerId) {
      newState = updatePlayer(newState, showOwnerId, { scoutTokens: showOwner.scoutTokens + 1 });
    }
  }

  const newShow: TableShow | null =
    remaining.length === 0 ? null : { ...show, cards: remaining };
  newState = { ...newState, tableShow: newShow };

  const val = action.face === 'lo' ? card.lo : card.hi;
  newState = log(newState, playerId, action, `${player.name} scouted card [${val}] from the ${action.end} of the show.`);
  return { state: newState };
}

function endRound(state: GameState, winnerId: string | null): GameState {
  const players = state.playerOrder.map((id) => ({
    id,
    hand: state.players[id].hand,
    scoutTokens: state.players[id].scoutTokens,
    capturedCards: state.players[id].capturedCards,
  }));
  const scores = calculateRoundScores(players, winnerId);

  // Update total scores
  let newState = state;
  for (const id of state.playerOrder) {
    const prev = newState.players[id].totalScore;
    newState = updatePlayer(newState, id, { totalScore: prev + (scores[id] ?? 0) });
  }
  const winner = winnerId ?? 'nobody';
  const winnerName = winnerId ? state.players[winnerId].name : 'Nobody';
  newState = log(newState, winner, { type: 'READY' }, `Round ${state.round} ended. ${winnerName} won.`);
  return { ...newState, phase: 'round_end', roundScores: [...newState.roundScores, scores] };
}
