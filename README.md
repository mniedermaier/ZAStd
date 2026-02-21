# ZAStd Tower Defense

[![CI](https://github.com/mniedermaier/ZAStd/actions/workflows/ci.yml/badge.svg)](https://github.com/mniedermaier/ZAStd/actions/workflows/ci.yml)

A cooperative maze-building tower defense game inspired by Burbenog TD. Build mazes, choose governors, and defend together.

**[Play Now](https://zastd.koyeb.app/)** · **[Project Page](https://mniedermaier.github.io/ZAStd/)**

## Quick Start

```bash
npm install
npm run dev    # http://localhost:5173
```

## Tech Stack

- **Engine**: Pure TypeScript game logic (pathfinding, combat, economy)
- **Client**: React 18 + Phaser 3 (neon 2D aesthetic)
- **Multiplayer**: Supabase Realtime broadcast channels
- **Hosting**: Docker + nginx (deployed on Koyeb)

## Deploy

Build a Docker image and deploy anywhere (Koyeb, Fly.io, etc.):

```bash
docker build -t zastd .
docker run -p 8080:80 zastd
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build args to enable multiplayer.

## Game Features

- 8 governors with unique tower trees (35 towers total)
- Governor abilities (Meteor Strike, Blizzard, Chain Storm, etc.)
- Synergies for multi-governor team combos
- Maze building with BFS pathfinding
- 3 map sizes (small, medium, large) and 3 layouts (classic, spiral, crossroads)
- 40 waves with auto-start, wave mutators, 11 enemy types, shared lives pool
- Damage types: physical vs magic (armor/resist)
- Economy: lumber, interest, 5 tech upgrades
- Mobile-responsive UI with touch controls and pinch-to-zoom
- Local and global leaderboards with prestige badges

## Contributing

Open an issue or pull request — bug reports, feature ideas, and code contributions are all welcome.

## License

[MIT](LICENSE)
