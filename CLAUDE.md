# ZAStd Tower Defense

Cooperative maze-building TD inspired by Burbenog TD. React 18 + Phaser 3 + Supabase Realtime.

## Structure
- `packages/engine/` — Pure TS game engine (zero DOM deps, 44 vitest tests)
- `packages/client/` — React + Phaser UI + networking

## Commands
- `npm install` — install deps
- `npm test` — run engine tests
- `npm run build` — build engine + client
- `npm run dev` — dev server :5173

## Deploy
- Docker: `docker build -t zastd .` then `docker run -p 8080:80 zastd`
- Koyeb: connects to repo, auto-builds from Dockerfile
- Supabase env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (optional, enables multiplayer)

## Architecture Notes
- **Authority model**: Host-based (earliest joinedAt runs simulation, auto-migration on disconnect)
- **Rendering**: Phaser 3 ScaleMode.RESIZE, no manual DPR scaling (Phaser's internals are incompatible with external canvas buffer scaling)
- **Multiplayer**: Join grace period prevents race condition where presence sync removes players before they track. Presence heartbeat every 30s keeps connections alive.
- **Waves**: Auto-start with 10s delay between waves. "Send Early" button for manual early start.
