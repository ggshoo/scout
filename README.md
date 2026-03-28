# Scout (Online) — 2‑Player Web App

A web app for playing **Scout** (the card game) online with **two players in different locations**, with real-time gameplay, turn enforcement, and a clean, mobile-friendly UI.

> Goal: replicate the tabletop experience while enforcing rules, managing state, and syncing actions in real time.

---

## MVP Scope

### Players & Sessions
- Two-player only (for initial release)
- Create a private game room (invite via link / room code)
- Rejoin support (refresh page without losing the game)

### Core Gameplay
- Deck setup and dealing
- Hand orientation / ordering rules (Scout’s “no rearranging” constraint)
- Turn flow:
  - Play a set
  - Scout a card (take from opponent’s display + insert into your hand at a chosen position)
  - End of round conditions and scoring
- Score tracking across rounds until end condition

### Real-time Requirements
- Both players see the same state within ~100–300ms typical latency
- Server-authoritative rules (clients can’t cheat by editing local state)
- Deterministic event log (useful for debugging and reconnection)

---

## Tech Stack (Recommended)

You can implement this in many ways; here’s a proven approach for real-time card games:

### Frontend
- **React + TypeScript** (UI + state)
- **Vite** (fast dev server + builds)
- Styling: Tailwind CSS or CSS Modules
- State: local UI state + server-synced game state

### Backend
- **Node.js + TypeScript**
- Real-time transport: **WebSockets** (Socket.IO or native ws)
- REST for lobby/auth (optional, but helpful)
- Validation: Zod / Joi

### Persistence
- Start with **in-memory** game rooms (fast iteration)
- Add **PostgreSQL** (or Redis) later for:
  - reconnect + resume
  - match history
  - user accounts / ratings

### Deployment
- Single host: Fly.io / Render / Railway / VPS
- Or split: frontend (static) + backend (WS server)

---

## High-Level Architecture

### Server-Authoritative Model
- Clients send **intent** (e.g., `PLAY_SET`, `SCOUT_CARD`)
- Server validates:
  - Is it your turn?
  - Is the move legal?
  - Does it match the current state?
- Server applies the move, increments a `stateVersion`, broadcasts the updated state.

### Suggested Data Model (Conceptual)

- `Room`
  - `roomId`
  - `players[]` (2)
  - `gameState`
  - `createdAt`, `updatedAt`

- `GameState`
  - `phase`: `lobby | dealing | playing | round_end | game_end`
  - `turnPlayerId`
  - `hands`: per player (ordered cards; enforce “no rearranging” rule)
  - `tableau`: played sets / display area
  - `scores`: per player
  - `round`: number
  - `eventLog[]`: append-only list of moves for debugging/replay

---

## UI/UX Requirements

### Lobby
- Create room
- Join room via link/code
- Show both players connected/ready

### Table View
- Opponent area:
  - their played cards / display (visible)
  - their hand hidden
- Your area:
  - your hand visible in fixed order
  - controls for selecting cards (play) or selecting an opponent card (scout)
  - insertion UI for where to place scouted card in your hand (left/right of a chosen card)

### UX Notes
- Avoid allowing illegal selections (disable buttons / show validation messages)
- Make “your turn” extremely obvious
- Include a compact move history (“Player A scouted X”, etc.)

---

## Networking Events (Example)

Client → Server:
- `room:create`
- `room:join`
- `player:ready`
- `game:action`:
  - `PLAY_SET` with selected indices
  - `SCOUT` with which opponent card + insertion position
  - `PASS` / `END_TURN` (if applicable to rules you implement)

Server → Client:
- `room:state`
- `game:state` (authoritative full state or patch)
- `game:error` (illegal move + message)
- `player:disconnected` / `player:reconnected`

---

## Development Plan (Step-by-Step)

1. **Scaffold**
   - `client/` React app
   - `server/` WS + minimal REST
2. **Room system**
   - create/join
   - connection tracking
3. **Game state engine**
   - pure functions: `applyAction(state, action) -> newState`
   - validation: `isLegalAction(state, action, playerId)`
4. **Render the table**
   - show hand, opponent display, scoreboard
5. **Implement actions**
   - play set
   - scout card + insert position
6. **Round end & scoring**
7. **Reconnect**
   - server keeps state; client requests state on reconnect
8. **Polish**
   - animations, sound toggles, mobile layout, accessibility

---

## Testing

- Unit test the game engine:
  - action legality
  - scoring
  - end-of-round scenarios
- Integration tests for server events
- Manual two-browser testing (Chrome + Firefox)

---

## Legal / Content Notes

This project implements gameplay for a published card game. If you plan to distribute publicly, consider:
- Avoid using official artwork/logos unless you have permission.
- Use original UI assets and a neutral name (or include attribution where appropriate).

---

## Contributing

PRs welcome. Please:
- Keep game rules logic in the server engine (pure functions where possible).
- Add tests for any rule changes.
- Avoid introducing client-side authority over game state.

---

## Quick Start (to be filled in)

Add setup commands here once the repo structure exists, for example:

- Install: `pnpm i`
- Dev:
  - `pnpm --filter server dev`
  - `pnpm --filter client dev`

---

## Roadmap (Post-MVP)

- 3–5 players support
- Spectators
- Ranked matchmaking
- Timers
- Tutorials / rules helper
- Game replays from event logs
