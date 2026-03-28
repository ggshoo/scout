import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameAction,
} from 'shared';
import {
  createRoom,
  joinRoom,
  getRoom,
  updateSocketId,
  toRoomState,
} from './rooms/roomManager';
import { applyAction } from './game/engine';

const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? '*';

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Basic rate-limiter for HTTP routes (static file serving included)
const httpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(httpLimiter);

// Serve static frontend files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

// Health-check endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

// SPA fallback (must come after /health and socket.io)
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ─── Socket.IO ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ── room:create ───────────────────────────────────────────────────────────
  socket.on('room:create', (playerName, cb) => {
    if (!playerName?.trim()) return cb({ ok: false, error: 'Name required.' });
    const { room, playerId } = createRoom(playerName.trim(), socket.id);
    socket.join(room.roomId);
    socket.data.playerId = playerId;
    socket.data.roomId = room.roomId;
    io.to(room.roomId).emit('room:state', toRoomState(room));
    cb({ ok: true, roomId: room.roomId, joinCode: room.joinCode, playerId });
  });

  // ── room:join ─────────────────────────────────────────────────────────────
  socket.on('room:join', ({ joinCode, playerName }, cb) => {
    if (!playerName?.trim()) return cb({ ok: false, error: 'Name required.' });
    const result = joinRoom(joinCode, playerName.trim(), socket.id);
    if ('error' in result) return cb({ ok: false, error: result.error });

    const { room, playerId } = result;
    socket.join(room.roomId);
    socket.data.playerId = playerId;
    socket.data.roomId = room.roomId;

    io.to(room.roomId).emit('room:state', toRoomState(room));
    if (room.gameState) io.to(room.roomId).emit('game:state', room.gameState);
    cb({ ok: true, roomId: room.roomId, playerId });
  });

  // ── room:reconnect ────────────────────────────────────────────────────────
  socket.on('room:reconnect', ({ roomId, playerId }, cb) => {
    const room = getRoom(roomId);
    if (!room) return cb({ ok: false, error: 'Room not found.' });
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return cb({ ok: false, error: 'Player not in this room.' });

    updateSocketId(roomId, playerId, socket.id);
    socket.join(roomId);
    socket.data.playerId = playerId;
    socket.data.roomId = roomId;

    io.to(roomId).emit('room:state', toRoomState(room));
    if (room.gameState) socket.emit('game:state', room.gameState);
    io.to(roomId).emit('player:reconnected', { playerId });
    cb({ ok: true });
  });

  // ── game:action ───────────────────────────────────────────────────────────
  socket.on('game:action', (action: GameAction, cb) => {
    const { playerId, roomId } = socket.data as { playerId?: string; roomId?: string };
    if (!playerId || !roomId) return cb({ ok: false, error: 'Not in a room.' });

    const room = getRoom(roomId);
    if (!room || !room.gameState) return cb({ ok: false, error: 'Game not started.' });

    const { state: newState, error } = applyAction(room.gameState, action, playerId);
    if (error) {
      socket.emit('game:error', error);
      return cb({ ok: false, error });
    }

    room.gameState = newState;
    io.to(roomId).emit('game:state', newState);
    cb({ ok: true });
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { playerId, roomId } = socket.data as { playerId?: string; roomId?: string };
    if (playerId && roomId) {
      updateSocketId(roomId, playerId, null);
      const room = getRoom(roomId);
      if (room) io.to(roomId).emit('room:state', toRoomState(room));
      io.to(roomId).emit('player:disconnected', { playerId });
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Scout server listening on port ${PORT}`);
});
