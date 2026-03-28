import React from 'react';
import { GameState } from 'shared';

interface Props {
  state: GameState;
  myPlayerId: string;
}

export default function Scoreboard({ state, myPlayerId }: Props) {
  const { players, playerOrder, round, roundScores } = state;
  const isTwoPlayer = playerOrder.length === 2;

  return (
    <div className="bg-green-900/50 border border-green-700/40 rounded-xl p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-green-400 text-xs uppercase tracking-wider">Round {round} / 3</span>
        <span className="text-green-400 text-xs">Scores</span>
      </div>
      <div className="space-y-1">
        {playerOrder.map((id) => {
          const p = players[id];
          const isMe = id === myPlayerId;
          const isCurrentTurn = state.currentTurnPlayerId === id;
          return (
            <div
              key={id}
              className={`flex items-center justify-between px-2 py-1 rounded-lg ${
                isCurrentTurn ? 'bg-yellow-500/20 border border-yellow-500/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {isCurrentTurn && <span className="text-yellow-400 text-xs">▶</span>}
                <span className={isMe ? 'text-yellow-300 font-semibold' : 'text-white'}>
                  {p.name} {isMe && '(you)'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-green-300">
                <span title="Cards in hand">🃏 {p.hand.length}</span>
                <span title={isTwoPlayer ? 'Scout chips (spend to Scout)' : 'Scout chips collected'}>🔍 {p.scoutTokens}</span>
                <span title="Captured cards from defeated sets">🏆 {p.capturedCards}</span>
                {!isTwoPlayer && (
                  <span title="Scout+Show tokens">⚡ {p.scoutShowTokens}</span>
                )}
                <span className="text-white font-bold text-sm" title="Total score">
                  {p.totalScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {roundScores.length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-700/40">
          <p className="text-green-400/60 text-xs mb-1">Round history:</p>
          {roundScores.map((rs, i) => (
            <div key={i} className="flex gap-2 text-xs text-green-300/60">
              <span>Rd {i + 1}:</span>
              {playerOrder.map((id) => (
                <span key={id}>
                  {players[id].name}: {rs[id] >= 0 ? '+' : ''}{rs[id]}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
