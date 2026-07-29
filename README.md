# Flyhigh

> Video consultation marketplace — connecting clients with expert professionals via WebRTC video calls.

## Project

The active development version is in **[flyhigh2.0/](flyhigh2.0/)** — a three-tier monorepo:

| Service | Stack | Port |
|---------|-------|------|
| **flyhigh-ui** | React 19 + Vite + Tailwind v4 | 5173 |
| **flyhigh-backend** | Spring Boot 3.2.5 + MongoDB Atlas | 8081 |
| **flyhigh-signaling-server** | Node.js + Socket.IO | 5000 |

## Quick Start

```bash
cd flyhigh2.0
.\start-dev.ps1       # Windows
./start-dev.sh        # Unix/Mac
```

See [flyhigh2.0/README.md](flyhigh2.0/README.md) for full documentation.
