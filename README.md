# Majlis - Realtime Chat Rooms

Realtime chat rooms with live messages, presence and typing indicators. Express + Socket.io backend (with MongoDB persistence via Mongoose) and a React + Tailwind client.

> **Live demo:** https://majlis-chat.vercel.app (link updated after deployment)
>
> **About the live demo - read this:** WebSockets need a long-lived server, and Vercel's serverless functions don't keep socket connections open. So the hosted demo runs the same React UI in a clearly labeled **simulated mode**: messages, presence and typing come from an in-browser simulation with bot participants (Salma, Karim, Nour), not real people. The REST API (`/api/rooms`, `/api/rooms/:id/messages`) is live on the demo URL with an in-memory store. The full Socket.io + MongoDB backend is in this repo and runs locally in one command (below).

## Features

- **Realtime messaging** over Socket.io: join a room, send and receive instantly
- **Presence**: see who is in the room, updated live on join/leave/disconnect
- **Typing indicators**, delivered only to the other members of the room
- **Three seeded rooms** (General, Tech, Random) with demo conversation history
- **Dual persistence**: MongoDB via Mongoose when `MONGODB_URI` is set, in-memory store otherwise (same store interface)
- **REST API** for rooms and message history with zod validation (400 on bad input, 404 on unknown room)
- **Graceful demo fallback**: when no realtime backend is reachable, the client switches to its labeled simulated mode instead of failing
- **11 automated tests**: REST API, plus realtime tests that connect two Socket.io clients and verify live delivery, presence and typing

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind CSS, socket.io-client |
| Backend  | Node.js, Express, Socket.io, helmet, CORS, zod |
| Storage  | MongoDB (Mongoose) or in-memory store behind one interface |
| Tests    | node:test + socket.io-client |
| Deploy   | Vercel (demo UI + serverless REST API) |

## Run the full realtime app locally

```bash
npm install
npm run dev          # server on :4100 (Socket.io), client on :5173 (proxied)
```

With MongoDB persistence (any local or hosted MongoDB):

```bash
MONGODB_URI=mongodb://localhost:27017/majlis npm run dev -w server
```

```bash
npm test             # 11 tests: REST API + realtime socket flow
npm run build        # production client build
```

## API and socket events

REST:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/health` | status + store mode (`demo: true` when in-memory) |
| GET    | `/api/rooms` | rooms with message counts and last message |
| GET    | `/api/rooms/:id/messages` | recent history (limit up to 100) |
| POST   | `/api/rooms/:id/messages` | post `{ user, text }` (validated) |

Socket.io events: `room:join` / `room:joined`, `room:presence`, `message:send` (ack) / `message:new`, `typing`.

## Project layout

```
majlis-chat/
  api/index.js          # Vercel serverless REST entry (in-memory store)
  server/               # Express + Socket.io backend, stores, tests
  client/               # React client (live socket + labeled demo simulation)
  vercel.json           # build config; sets VITE_CHAT_MODE=demo for the hosted demo
```

## Notes

- Messages are capped at 500 characters and 500 per room (oldest trimmed).
- The demo simulation is honest by design: the UI badge says "simulated demo" and a banner explains what is simulated and why.
