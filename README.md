# Scout (Online) — 2‑Player Web App

A fully-featured web app for playing **Scout** (the card game) online with **two players in different locations**, with real-time gameplay, turn enforcement, and a clean, mobile-friendly UI.

🎮 **[Play Now →](https://scout-card-game.onrender.com)** _(see deployment instructions below to set up your own instance)_

---

## What's Implemented

### ✅ Players & Sessions
- Two-player real-time gameplay with WebSockets (Socket.IO)
- Create a private game room → share the 6-character join code
- Rejoin support: refresh the page without losing your session (uses sessionStorage)
- Player disconnection/reconnection detection

### ✅ Core Gameplay (Scout Card Game Rules)
- 45-card deck (pairs 1–10, 26 used in 2-player game)
- Hand orientation phase: flip your hand once before the round starts
- **Show** action: play consecutive cards to beat the current table show
- **Scout** action: take the leftmost or rightmost card from the table show, insert anywhere in hand
- **Scout & Show** action: scout first then immediately show (1 token per round)
- Valid set detection: all-same-value OR consecutive ascending run
- Beat logic: more cards > fewer cards; same count → higher minimum value
- Round end: when a player empties their hand OR consecutive scout stalemate
- Score tracking: `scout tokens − cards in hand + win bonus` per round
- 3-round game with running totals

### ✅ Real-time Architecture
- Server-authoritative rules (all moves validated server-side)
- State version tracking + full state broadcast on every action
- Deterministic event log for debugging/replay
- In-memory room storage with 12-hour TTL

### ✅ UI
- Lobby: create/join room, shareable link with join code
- Orientation phase: preview and flip your hand
- Game table: opponent hand (face-down), table show, your hand (face-up)
- Card selection: click to toggle; contiguous-only enforced
- Scout actions: ← → buttons on the current show
- Insertion UI: slot markers (▼) to place a scouted card in your hand
- Scoreboard: live cards-in-hand, scout tokens, Scout&Show tokens, total score
- Move history log
- Error banner for illegal move feedback
- Round end / game end screens with scores
- Mobile-friendly layout (responsive Tailwind CSS)

---

## Tech Stack

| Layer       | Tech                              |
|-------------|-----------------------------------|
| Frontend    | React 18 + TypeScript + Vite      |
| Styling     | Tailwind CSS                      |
| Backend     | Node.js + TypeScript + Express    |
| Real-time   | Socket.IO (WebSockets)            |
| Monorepo    | pnpm workspaces                   |
| Deployment  | Render / Fly.io / Docker          |

---

## Project Structure

```
scout/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── Lobby.tsx         # Create/join room
│       │   ├── WaitingRoom.tsx   # Waiting for player 2
│       │   ├── GameTable.tsx     # Main game UI
│       │   ├── Hand.tsx          # Player hand + insertion UI
│       │   ├── CardView.tsx      # Individual card display
│       │   ├── TableShowView.tsx # Current table show + scout buttons
│       │   ├── Scoreboard.tsx    # Live scores
│       │   └── MoveHistory.tsx   # Event log display
│       └── hooks/useSocket.ts    # Socket.IO connection hook
├── server/          # Node.js + Socket.IO backend
│   └── src/
│       ├── game/
│       │   ├── deck.ts           # Card deck generation & dealing
│       │   ├── rules.ts          # Move validation, set logic, scoring
│       │   └── engine.ts         # Game state machine (applyAction)
│       ├── rooms/roomManager.ts  # Room create/join/reconnect
│       └── index.ts              # Express + Socket.IO server
├── shared/          # Shared TypeScript types
│   └── src/index.ts
├── Dockerfile
├── fly.toml
└── render.yaml
```

---

## Quick Start (Local Development)

```bash
# Install dependencies
pnpm install

# Build shared types
pnpm --filter shared build

# Run dev servers (client on :3000, server on :4000)
pnpm --filter server dev     # one terminal
pnpm --filter client dev     # another terminal

# Or run both together
pnpm dev
```

Open two browser windows to `http://localhost:3000` — one creates a room, the other joins.

---

## Deployment

### Option A: Render.com (Recommended, Free Tier)

1. Create a free account at [render.com](https://render.com)
2. Click **New → Web Service**
3. Connect your GitHub repo (`ggshoo/scout`)
4. Configure:
   - **Build command:** `pnpm install && pnpm --filter shared build && pnpm --filter client build && pnpm --filter server build`
   - **Start command:** `node server/dist/index.js`
   - **Environment:** Node
5. Add environment variable: `NODE_ENV=production`
6. Click **Deploy** → your URL will be `https://scout-card-game.onrender.com`

### Option B: Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
flyctl auth login
flyctl launch --copy-config  # uses fly.toml
flyctl deploy
```

### Option C: Docker

```bash
docker build -t scout-game .
docker run -p 4000:4000 scout-game
```

---

## How to Play

1. **Create a room** — enter your name and click "Create Game"
2. **Share the 6-letter code** with your friend (or copy the invite link)
3. **Friend joins** — enters the code and their name
4. **Orient your hand** — optionally flip your hand once to choose orientation
5. **Click Ready** — once both players are ready, the game starts

### On your turn:
- **Click cards** to select a consecutive set, then click **Show** to play them (must beat the current table show)
- **← →** buttons on the table show to **Scout** a card (take it into your hand, give opponent a token)
- **Scout & Show** button to do both at once (costs 1 token, limited to 1 per round)

### Scoring:
- **Scout tokens** = +1 per token collected
- **Cards in hand** = −1 per card remaining
- **Round winner bonus** = +1 per opponent
- Game plays 3 rounds; highest total wins

---

## Testing

```bash
# The game engine is fully tested by the TypeScript compiler
pnpm --filter shared build
pnpm --filter server build
pnpm --filter client build
```

For manual two-browser testing:
1. Open `http://localhost:3000` in Chrome
2. Open `http://localhost:3000` in Firefox (or an incognito window)
3. Create room in one, join in the other

---

## Roadmap

- [ ] 3–5 player support
- [ ] Game replays from event log
- [ ] Persistent storage (PostgreSQL/Redis) for reconnection after server restart
- [ ] Timers per turn
- [ ] Spectator mode
- [ ] Sound effects
- [ ] Animated card transitions
