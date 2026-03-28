import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameTable from './components/GameTable';

export default function App() {
  const {
    connected,
    roomState,
    gameState,
    myPlayerId,
    lastError,
    createRoom,
    joinRoom,
    sendAction,
    clearError,
  } = useSocket();

  // Pre-fill join code from URL param
  const urlCode = new URLSearchParams(window.location.search).get('code') ?? undefined;

  // No room yet → Lobby
  if (!roomState) {
    return (
      <Lobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        connected={connected}
        prefillCode={urlCode}
      />
    );
  }

  // In room, waiting for second player
  if (roomState.players.length < 2 && (!gameState || gameState.phase === 'lobby')) {
    return <WaitingRoom roomState={roomState} myPlayerId={myPlayerId ?? ''} />;
  }

  // Game in progress
  if (gameState && myPlayerId) {
    return (
      <GameTable
        gameState={gameState}
        roomState={roomState}
        myPlayerId={myPlayerId}
        onAction={sendAction}
        lastError={lastError}
        onClearError={clearError}
      />
    );
  }

  // Fallback: waiting for game to start after second player joined
  return <WaitingRoom roomState={roomState} myPlayerId={myPlayerId ?? ''} />;
}
