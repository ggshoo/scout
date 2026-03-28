import { v4 as uuidv4 } from 'uuid';
import { GameState, RoomState } from 'shared';
import { createInitialGameState, dealRound } from '../game/engine';

export interface Room {
  roomId: string;
  joinCode: string;
  players: Array<{ id: string; name: string; socketId: string | null }>;
  gameState: GameState | null;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const codeToRoomId = new Map<string, string>();

/** Generate a short 6-char join code. */
function makeJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom(playerName: string, socketId: string): { room: Room; playerId: string } {
  const roomId = uuidv4();
  let code: string;
  do { code = makeJoinCode(); } while (codeToRoomId.has(code));

  const playerId = uuidv4();
  const room: Room = {
    roomId,
    joinCode: code,
    players: [{ id: playerId, name: playerName, socketId }],
    gameState: null,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  codeToRoomId.set(code, roomId);
  return { room, playerId };
}

export function joinRoom(
  joinCode: string,
  playerName: string,
  socketId: string,
): { room: Room; playerId: string } | { error: string } {
  const roomId = codeToRoomId.get(joinCode.toUpperCase());
  if (!roomId) return { error: 'Room not found.' };

  const room = rooms.get(roomId)!;
  if (room.players.length >= 2) return { error: 'Room is full.' };

  const playerId = uuidv4();
  room.players.push({ id: playerId, name: playerName, socketId });

  // Both players joined → deal and start orientation phase
  const gs = createInitialGameState(room.players.map((p) => ({ id: p.id, name: p.name })));
  room.gameState = dealRound(gs);

  return { room, playerId };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomByPlayerId(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === playerId)) return room;
  }
  return undefined;
}

export function updateSocketId(roomId: string, playerId: string, socketId: string | null): void {
  const room = rooms.get(roomId);
  if (!room) return;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.socketId = socketId;
}

export function toRoomState(room: Room): RoomState {
  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.socketId !== null,
    })),
  };
}

/** Periodically clean up rooms older than 12 hours. */
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < cutoff) {
      codeToRoomId.delete(room.joinCode);
      rooms.delete(id);
    }
  }
}, 60 * 60 * 1000); // run hourly
