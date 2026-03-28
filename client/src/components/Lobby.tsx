import React, { useState } from 'react';

interface Props {
  onCreateRoom: (name: string) => Promise<{ ok: boolean; joinCode?: string; error?: string }>;
  onJoinRoom: (code: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  connected: boolean;
  prefillCode?: string;
}

export default function Lobby({ onCreateRoom, onJoinRoom, connected, prefillCode }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>(prefillCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState(prefillCode ?? '');
  const [joinCodeResult, setJoinCodeResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name.');
    setLoading(true);
    setError(null);
    const res = await onCreateRoom(name.trim());
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Failed to create room.');
    else setJoinCodeResult(res.joinCode ?? null);
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name.');
    if (!joinCode.trim()) return setError('Enter a join code.');
    setLoading(true);
    setError(null);
    const res = await onJoinRoom(joinCode.trim(), name.trim());
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Failed to join room.');
  };

  const copyCode = () => {
    if (joinCodeResult) {
      navigator.clipboard.writeText(joinCodeResult).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-widest text-yellow-400 drop-shadow-lg">SCOUT</h1>
          <p className="text-green-300 mt-2 text-sm">A 2-player online card game</p>
          <div className={`mt-2 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? '● Connected' : '○ Connecting…'}
          </div>
        </div>

        <div className="bg-green-800/60 backdrop-blur rounded-2xl shadow-2xl p-6 border border-green-600/40">
          {/* Tab Switcher */}
          <div className="flex rounded-xl overflow-hidden mb-6 border border-green-600/40">
            <button
              className={`flex-1 py-2 font-semibold transition-colors ${tab === 'create' ? 'bg-yellow-500 text-gray-900' : 'text-green-300 hover:bg-green-700'}`}
              onClick={() => { setTab('create'); setError(null); setJoinCodeResult(null); }}
            >
              Create Game
            </button>
            <button
              className={`flex-1 py-2 font-semibold transition-colors ${tab === 'join' ? 'bg-yellow-500 text-gray-900' : 'text-green-300 hover:bg-green-700'}`}
              onClick={() => { setTab('join'); setError(null); setJoinCodeResult(null); }}
            >
              Join Game
            </button>
          </div>

          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-green-300 text-sm mb-1">Your Name</label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
              placeholder="Enter your name…"
              className="w-full bg-green-900/60 border border-green-600 rounded-lg px-3 py-2 text-white placeholder-green-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {tab === 'join' && (
            <div className="mb-4">
              <label className="block text-green-300 text-sm mb-1">Join Code</label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="e.g. ABC123"
                className="w-full bg-green-900/60 border border-green-600 rounded-lg px-3 py-2 text-white placeholder-green-500 focus:outline-none focus:border-yellow-400 uppercase tracking-widest font-mono"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-900/60 border border-red-500 rounded-lg px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}

          {joinCodeResult && tab === 'create' && (
            <div className="mb-4 bg-green-900/80 border border-green-500 rounded-lg px-4 py-3 text-center">
              <p className="text-green-300 text-sm mb-1">Share this code with your friend:</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black tracking-widest text-yellow-400 font-mono">{joinCodeResult}</span>
                <button onClick={copyCode} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded text-green-300 transition-colors">
                  Copy
                </button>
              </div>
              <p className="text-green-400 text-xs mt-2 animate-pulse">Waiting for opponent to join…</p>
            </div>
          )}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading || !connected}
            className="btn-primary w-full text-lg"
          >
            {loading ? 'Loading…' : tab === 'create' ? 'Create Game' : 'Join Game'}
          </button>
        </div>

        {/* Rules hint */}
        <div className="mt-6 text-center text-green-400 text-xs space-y-1">
          <p>🃏 Show cards to beat the table · 🔍 Scout to steal a card</p>
          <p>Empty your hand to win the round</p>
        </div>
      </div>
    </div>
  );
}
