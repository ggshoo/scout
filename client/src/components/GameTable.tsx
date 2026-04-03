import React, { useState, useCallback } from 'react';
import { GameState, RoomState, GameAction, HandCard, PlayerState, visibleValue } from 'shared';
import Hand from './Hand';
import TableShowView from './TableShowView';
import Scoreboard from './Scoreboard';
import MoveHistory from './MoveHistory';
import CardView from './CardView';

interface Props {
  gameState: GameState;
  roomState: RoomState;
  myPlayerId: string;
  onAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
  lastError: string | null;
  onClearError: () => void;
}

type UiMode =
  | 'idle'
  | 'selecting'         // choosing cards to show
  | 'scout_pending'     // chosen scout end (left/right), now picking insert position
  | 'scout_show_step1'  // choosing scout end for scout+show
  | 'scout_show_step2'; // choosing insertion pos for scout+show

export default function GameTable({
  gameState,
  roomState,
  myPlayerId,
  onAction,
  lastError,
  onClearError,
}: Props) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [uiMode, setUiMode] = useState<UiMode>('idle');
  const [pendingScoutEnd, setPendingScoutEnd] = useState<'left' | 'right' | null>(null);
  const [pendingFace, setPendingFace] = useState<'lo' | 'hi'>('lo');
  const [insertPos, setInsertPos] = useState<number | null>(null);
  const [scoutShowIndices, setScoutShowIndices] = useState<number[]>([]);

  const me = gameState.players[myPlayerId];
  const opponentId = gameState.playerOrder.find((id) => id !== myPlayerId) ?? '';
  const opponent = gameState.players[opponentId];
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const phase = gameState.phase;

  const reset = useCallback(() => {
    setSelectedIndices([]);
    setUiMode('idle');
    setPendingScoutEnd(null);
    setInsertPos(null);
    setScoutShowIndices([]);
  }, []);

  // ── Toggle card selection ────────────────────────────────────────────────
  const toggleCard = useCallback(
    (index: number) => {
      setSelectedIndices((prev) => {
        if (prev.includes(index)) {
          return prev.filter((i) => i !== index);
        }
        const next = [...prev, index].sort((a, b) => a - b);
        // Enforce contiguous selection
        const min = next[0];
        const max = next[next.length - 1];
        if (max - min + 1 !== next.length) return prev; // not contiguous
        return next;
      });
      setUiMode('selecting');
    },
    [],
  );

  // ── Show action ──────────────────────────────────────────────────────────
  const handleShow = async () => {
    if (selectedIndices.length === 0) return;
    const res = await onAction({ type: 'SHOW', indices: selectedIndices });
    if (res.ok) reset();
  };

  // ── Scout flow ───────────────────────────────────────────────────────────
  const startScoutLeft = () => {
    setPendingScoutEnd('left');
    setUiMode('scout_pending');
  };

  const startScoutRight = () => {
    setPendingScoutEnd('right');
    setUiMode('scout_pending');
  };

  const confirmInsert = async (pos: number) => {
    if (uiMode === 'scout_pending' && pendingScoutEnd) {
      const res = await onAction({
        type: 'SCOUT',
        end: pendingScoutEnd,
        insertAt: pos,
        face: pendingFace,
      });
      if (res.ok) reset();
    } else if (uiMode === 'scout_show_step2' && pendingScoutEnd) {
      // Execute scout+show
      const res = await onAction({
        type: 'SCOUT_AND_SHOW',
        scout: { end: pendingScoutEnd, insertAt: pos, face: pendingFace },
        show: { indices: scoutShowIndices },
      });
      if (res.ok) reset();
    }
  };

  // ── Scout+Show flow ──────────────────────────────────────────────────────
  const handleScoutAndShow = () => {
    if (selectedIndices.length === 0) {
      alert('Select cards to show first, then use Scout & Show.');
      return;
    }
    setScoutShowIndices(selectedIndices);
    setUiMode('scout_show_step1');
    setSelectedIndices([]);
  };

  const startScoutEndForScoutShow = (end: 'left' | 'right') => {
    setPendingScoutEnd(end);
    setUiMode('scout_show_step2');
  };

  // ── Orientation phase ────────────────────────────────────────────────────
  const handleFlip = async () => {
    await onAction({ type: 'FLIP_HAND' });
  };
  const handleReady = async () => {
    await onAction({ type: 'READY' });
  };

  // ── Next round / Game end ────────────────────────────────────────────────
  const handleNextRound = async () => {
    await onAction({ type: 'NEXT_ROUND' });
  };

  const isInInsertMode = uiMode === 'scout_pending' || uiMode === 'scout_show_step2';

  // ─── Render orientation phase ────────────────────────────────────────────
  if (phase === 'orientation') {
    return (
      <OrientationPhase
        me={me}
        opponent={opponent}
        roomState={roomState}
        myPlayerId={myPlayerId}
        onFlip={handleFlip}
        onReady={handleReady}
        lastError={lastError}
        onClearError={onClearError}
      />
    );
  }

  // ─── Render round / game end ─────────────────────────────────────────────
  if (phase === 'round_end' || phase === 'game_end') {
    return (
      <EndPhase
        gameState={gameState}
        myPlayerId={myPlayerId}
        phase={phase}
        onNextRound={handleNextRound}
      />
    );
  }

  // ─── Render playing phase ─────────────────────────────────────────────────
  const canShow = isMyTurn && selectedIndices.length > 0 && uiMode !== 'scout_pending' && uiMode !== 'scout_show_step1' && uiMode !== 'scout_show_step2';
  const canScout = isMyTurn && !!gameState.tableShow && uiMode !== 'selecting';
  const canScoutAndShow = isMyTurn && !!gameState.tableShow && me.scoutShowTokens > 0;

  const scoutEndForShow = uiMode === 'scout_show_step1';

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2 gap-2">
      {/* Error banner */}
      {lastError && (
        <div className="bg-red-900/80 border border-red-500 rounded-lg px-4 py-2 flex items-center justify-between text-sm text-red-300">
          <span>⚠ {lastError}</span>
          <button onClick={onClearError} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      {/* Turn indicator */}
      <div className={`text-center py-1 rounded-lg text-sm font-semibold ${isMyTurn ? 'bg-yellow-500/30 text-yellow-300' : 'bg-gray-800/40 text-gray-400'}`}>
        {isMyTurn ? '⭐ Your Turn' : `Waiting for ${opponent?.name ?? '…'}…`}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2 min-h-0">
        {/* Left: scoreboard + history */}
        <div className="hidden md:flex flex-col gap-2 w-56 shrink-0">
          <Scoreboard state={gameState} myPlayerId={myPlayerId} />
          <MoveHistory log={gameState.eventLog} />
        </div>

        {/* Center: game area */}
        <div className="flex flex-col flex-1 gap-2 min-h-0 overflow-y-auto">
          {/* Opponent area */}
          <div className="bg-green-900/30 rounded-xl p-3 border border-green-700/20">
            <p className="text-green-400 text-xs uppercase tracking-wider mb-2">
              {opponent?.name ?? 'Opponent'}'s Hand ({opponent?.hand.length ?? 0} cards)
            </p>
            <div className="flex flex-wrap gap-1 justify-center">
              {(opponent?.hand ?? []).map((_, i) => (
                <div key={i} className="w-10 h-14 rounded-lg bg-blue-900/60 border border-blue-800 flex items-center justify-center">
                  <span className="text-blue-700 text-xs">🂠</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table show */}
          <TableShowView
            show={gameState.tableShow}
            canScout={canScout && !isInInsertMode && !scoutEndForShow}
            onScoutLeft={scoutEndForShow ? () => startScoutEndForScoutShow('left') : startScoutLeft}
            onScoutRight={scoutEndForShow ? () => startScoutEndForScoutShow('right') : startScoutRight}
            pendingScoutEnd={pendingScoutEnd}
          />

          {/* My hand */}
          <div className="bg-green-900/30 rounded-xl p-3 border border-green-700/20">
            {/* Face picker when inserting */}
            {isInInsertMode && (
              <div className="mb-2 flex items-center gap-2 justify-center">
                <span className="text-sm text-blue-300">Show face:</span>
                <button
                  onClick={() => setPendingFace('lo')}
                  className={`btn text-sm ${pendingFace === 'lo' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Low face
                </button>
                <button
                  onClick={() => setPendingFace('hi')}
                  className={`btn text-sm ${pendingFace === 'hi' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  High face
                </button>
              </div>
            )}

            <Hand
              hand={me?.hand ?? []}
              selectedIndices={selectedIndices}
              onToggleCard={toggleCard}
              isMyTurn={isMyTurn}
              phase={phase}
              insertMode={isInInsertMode}
              insertPos={insertPos}
              onInsertHover={setInsertPos}
              onInsertConfirm={confirmInsert}
            />
          </div>

          {/* Action buttons */}
          {isMyTurn && (
            <div className="flex flex-wrap gap-2 justify-center pb-2">
              <button
                onClick={handleShow}
                disabled={!canShow}
                className="btn-primary"
              >
                Show ({selectedIndices.length} card{selectedIndices.length !== 1 ? 's' : ''})
              </button>

              {uiMode === 'idle' || uiMode === 'selecting' ? (
                <>
                  {canScoutAndShow && (
                    <button
                      onClick={handleScoutAndShow}
                      disabled={!canScoutAndShow}
                      className="btn bg-purple-700 hover:bg-purple-600 text-white"
                      title={`Scout & Show tokens: ${me.scoutShowTokens}`}
                    >
                      Scout & Show ⚡{me.scoutShowTokens}
                    </button>
                  )}
                </>
              ) : (
                <button onClick={reset} className="btn-secondary">
                  Cancel
                </button>
              )}

              {uiMode === 'idle' && (
                <button onClick={reset} className="btn-secondary opacity-50" disabled>
                  (Select cards or scout →)
                </button>
              )}
            </div>
          )}

          {/* Mobile scoreboard */}
          <div className="md:hidden">
            <Scoreboard state={gameState} myPlayerId={myPlayerId} />
            <div className="mt-2">
              <MoveHistory log={gameState.eventLog} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orientation Phase Sub-component ─────────────────────────────────────────

function OrientationPhase({
  me,
  opponent,
  roomState,
  myPlayerId,
  onFlip,
  onReady,
  lastError,
  onClearError,
}: {
  me: PlayerState | undefined;
  opponent: PlayerState | undefined;
  roomState: RoomState;
  myPlayerId: string;
  onFlip: () => void;
  onReady: () => void;
  lastError: string | null;
  onClearError: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <h2 className="text-2xl font-bold text-yellow-400">Choose Your Hand Orientation</h2>
      <p className="text-green-300 text-sm text-center max-w-sm">
        You may flip your hand (reverse order + swap card values) as many times as you like. When
        you're happy with your orientation, click Ready.
      </p>

      {lastError && (
        <div className="bg-red-900/80 border border-red-500 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-red-300">
          <span>{lastError}</span>
          <button onClick={onClearError}>✕</button>
        </div>
      )}

      {/* My hand preview */}
      <div className="bg-green-900/60 border border-green-600/40 rounded-xl p-4 w-full max-w-2xl">
        <p className="text-green-400 text-xs mb-3">
          Your hand ({me?.hand.length ?? 0} cards) {me?.hasFlipped && '(flipped)'}
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {(me?.hand ?? []).map((card: HandCard, i: number) => (
            <CardView key={card.id} card={card} showBothValues index={i} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onFlip}
          disabled={me?.isReady}
          className="btn-secondary"
        >
          Flip Hand 🔄
        </button>
        <button
          onClick={onReady}
          disabled={me?.isReady}
          className="btn-primary"
        >
          {me?.isReady ? 'Waiting for opponent…' : "I'm Ready ✓"}
        </button>
      </div>

      {/* Player status */}
      <div className="flex gap-4 text-sm">
        {roomState.players.map((p) => (
          <div key={p.id} className={`px-3 py-1 rounded-full border ${p.id === myPlayerId ? 'border-yellow-500 text-yellow-300' : 'border-green-600 text-green-400'}`}>
            {p.name} {p.id === myPlayerId ? '(you)' : ''}: {' '}
            {p.id === myPlayerId
              ? me?.isReady ? '✓ Ready' : 'Not ready'
              : opponent?.isReady ? '✓ Ready' : 'Not ready'}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── End Phase Sub-component ──────────────────────────────────────────────────

function EndPhase({
  gameState,
  myPlayerId,
  phase,
  onNextRound,
}: {
  gameState: GameState;
  myPlayerId: string;
  phase: 'round_end' | 'game_end';
  onNextRound: () => void;
}) {
  const lastRoundScores = gameState.roundScores[gameState.roundScores.length - 1] ?? {};
  const { players, playerOrder } = gameState;

  const gameWinner =
    phase === 'game_end'
      ? playerOrder.reduce((a, b) =>
          players[a].totalScore >= players[b].totalScore ? a : b,
        )
      : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <h2 className="text-3xl font-black text-yellow-400">
        {phase === 'game_end' ? '🏆 Game Over!' : `⏱ Round ${gameState.round} Complete`}
      </h2>

      {/* Round scores */}
      <div className="bg-green-900/60 border border-green-600/40 rounded-xl p-6 w-full max-w-sm">
        <p className="text-green-300 text-sm mb-3 text-center">
          {phase === 'round_end' ? 'Round Scores' : 'Final Scores'}
        </p>
        <div className="space-y-3">
          {playerOrder.map((id) => {
            const p = players[id];
            const roundScore = lastRoundScores[id] ?? 0;
            const isMe = id === myPlayerId;
            const isWinner = id === gameWinner;
            return (
              <div key={id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isWinner ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-green-800/40'}`}>
                <span className={`font-semibold ${isMe ? 'text-yellow-300' : 'text-white'}`}>
                  {isWinner && '🏆 '}
                  {p.name} {isMe && '(you)'}
                </span>
                <div className="text-right">
                  {phase === 'round_end' && (
                    <div className="text-xs text-green-400">
                      Round: {roundScore >= 0 ? '+' : ''}{roundScore}
                    </div>
                  )}
                  <div className="text-white font-bold">Total: {p.totalScore}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {phase === 'round_end' && gameState.round < 3 && (
        <button onClick={onNextRound} className="btn-primary text-lg px-8">
          Start Round {gameState.round + 1} →
        </button>
      )}

      {phase === 'game_end' && (
        <p className="text-green-300 text-sm">Thanks for playing! Refresh to start a new game.</p>
      )}
    </div>
  );
}
