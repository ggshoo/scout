import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameState,
  RoomState,
  GameAction,
} from 'shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:4000');

export interface UseSocketReturn {
  socket: AppSocket | null;
  connected: boolean;
  roomState: RoomState | null;
  gameState: GameState | null;
  myPlayerId: string | null;
  lastError: string | null;
  createRoom: (name: string) => Promise<{ ok: boolean; joinCode?: string; error?: string }>;
  joinRoom: (code: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  sendAction: (action: GameAction) => Promise<{ ok: boolean; error?: string }>;
  clearError: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Attempt reconnect from sessionStorage
  const savedRoomId = sessionStorage.getItem('scout_roomId');
  const savedPlayerId = sessionStorage.getItem('scout_playerId');

  useEffect(() => {
    const sock = io(SERVER_URL, { autoConnect: true, reconnectionAttempts: 10 }) as AppSocket;
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      // Attempt to reconnect to existing session
      if (savedRoomId && savedPlayerId) {
        sock.emit('room:reconnect', { roomId: savedRoomId, playerId: savedPlayerId }, (res) => {
          if (res.ok) setMyPlayerId(savedPlayerId);
          else {
            sessionStorage.removeItem('scout_roomId');
            sessionStorage.removeItem('scout_playerId');
          }
        });
      }
    });

    sock.on('disconnect', () => setConnected(false));
    sock.on('room:state', (rs) => setRoomState(rs));
    sock.on('game:state', (gs) => setGameState(gs));
    sock.on('game:error', (msg) => setLastError(msg));

    return () => { sock.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(async (name: string) => {
    return new Promise<{ ok: boolean; joinCode?: string; error?: string }>((resolve) => {
      socketRef.current?.emit('room:create', name, (res) => {
        if (res.ok && res.playerId && res.roomId) {
          setMyPlayerId(res.playerId);
          sessionStorage.setItem('scout_roomId', res.roomId);
          sessionStorage.setItem('scout_playerId', res.playerId);
        }
        resolve(res);
      });
    });
  }, []);

  const joinRoom = useCallback(async (code: string, name: string) => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit('room:join', { joinCode: code, playerName: name }, (res) => {
        if (res.ok && res.playerId && res.roomId) {
          setMyPlayerId(res.playerId);
          sessionStorage.setItem('scout_roomId', res.roomId);
          sessionStorage.setItem('scout_playerId', res.playerId);
        }
        resolve(res);
      });
    });
  }, []);

  const sendAction = useCallback(async (action: GameAction) => {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit('game:action', action, (res) => {
        if (!res.ok && res.error) setLastError(res.error);
        resolve(res);
      });
    });
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    socket: socketRef.current,
    connected,
    roomState,
    gameState,
    myPlayerId,
    lastError,
    createRoom,
    joinRoom,
    sendAction,
    clearError,
  };
}
