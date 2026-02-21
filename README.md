<div align="center">

# ZAStd Tower Defense

**Cooperative maze-building tower defense inspired by Burbenog TD**

[![CI](https://github.com/mniedermaier/ZAStd/actions/workflows/ci.yml/badge.svg)](https://github.com/mniedermaier/ZAStd/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Phaser](https://img.shields.io/badge/Phaser-3-8B89CC?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMiAyMmgyMEwxMiAyeiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://phaser.io/)

**[Play Now](https://zastd.koyeb.app/)** · **[Project Page](https://mniedermaier.github.io/ZAStd/)** · **[GitHub](https://github.com/mniedermaier/ZAStd)**

<br>

<img src="docs/screenshots/gameplay-action.png" alt="ZAStd gameplay" width="720">

</div>

<br>

## Features

**8 Governors** — Fire, Ice, Thunder, Poison, Death, Nature, Arcane, Holy — each with unique abilities and tower trees. Combine governors for powerful synergies.

**35 Towers** — 3 common towers plus 4 per governor. Chain lightning, splash damage, poison, stun, execute, teleport, and aura buffs.

**11 Enemy Types** — Armored, flying, healers, berserkers, splitters, and bosses every 10 waves. Survive 40 waves to victory.

**Maze Building** — Place towers to create intricate mazes. BFS pathfinding ensures enemies always find a way — make their path as long as possible.

**Dual Damage System** — Physical vs magic damage with armor and magic resist. Stack debuffs and synergies for devastating combos.

**Economy & Tech** — Earn gold per wave, gain interest, collect lumber every 5 waves. 5 tech upgrades to customize your strategy.

**Multiple Maps** — 3 sizes and 3 layouts (Classic, Spiral, Crossroads) across 4 difficulty levels.

**Real-Time Multiplayer** — Co-op via Supabase Realtime. Build mazes together, share lives, combine governor synergies.

## Screenshots

<div align="center">
<img src="docs/screenshots/lobby.png" alt="Governor selection lobby" width="360">&nbsp;&nbsp;<img src="docs/screenshots/gameplay-action.png" alt="Gameplay with towers and enemies" width="360">
</div>

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-61dafb?logo=react&logoColor=black)
![Phaser 3](https://img.shields.io/badge/Phaser_3-8B89CC)
![Supabase](https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ed?logo=docker&logoColor=white)

## Quick Start

```bash
npm install
npm run dev    # http://localhost:5173
```

## Deploy

Build a Docker image and deploy anywhere (Koyeb, Fly.io, etc.):

```bash
docker build -t zastd .
docker run -p 8080:80 zastd
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build args to enable multiplayer.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`–`9` | Select tower type |
| `Space` | Start wave |
| `Q` | Upgrade tower |
| `E` | Sell tower |
| `Escape` | Cancel placement |

## Contributing

Open an issue or pull request — bug reports, feature ideas, and code contributions are all welcome.

## License

[MIT](LICENSE)
