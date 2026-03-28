import React from 'react';
import { RoomState } from 'shared';

interface Props {
  roomState: RoomState;
  myPlayerId: string;
}

export default function WaitingRoom({ roomState, myPlayerId }: Props) {
  const copyLink = () => {
    const url = `${window.location.origin}?code=${roomState.joinCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-black text-yellow-400 mb-2">SCOUT</h1>
        <h2 className="text-xl text-green-300 mb-6">Waiting for opponent…</h2>

        <div className="bg-green-800/60 rounded-2xl p-6 border border-green-600/40 mb-6">
          <p className="text-green-300 text-sm mb-3">Share this code with your friend:</p>
          <div className="text-4xl font-black tracking-widest text-yellow-400 font-mono mb-4">
            {roomState.joinCode}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={copyLink}
              className="btn-secondary text-sm"
            >
              Copy Invite Link
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {roomState.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                p.id === myPlayerId
                  ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                  : 'bg-green-800/40 border border-green-600/40 text-green-300'
              }`}
            >
              <span className={`text-xs ${p.connected ? 'text-green-400' : 'text-gray-500'}`}>
                {p.connected ? '●' : '○'}
              </span>
              <span>{p.name} {p.id === myPlayerId ? '(you)' : ''}</span>
            </div>
          ))}
          {roomState.players.length < 2 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/20 border border-dashed border-green-700 text-green-600 text-sm italic">
              ○ Waiting for player 2…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
