# CLAUDE.md — FlyHigh 2.0 (Root)

## Project Overview

Three-tier monorepo for a video-consultation marketplace connecting clients with experts.

```
flyhigh2.0/
├── flyhigh-ui/                  React 19 + Vite + Tailwind CSS v4 + shadcn/ui
├── flyhigh-backend/             Spring Boot 3.2.5 + MongoDB Atlas (Java 21)
└── flyhigh-signaling-server/    Node.js + Socket.IO (WebRTC signaling)
```

## Port Map

| Service | Port | URL |
|---------|------|-----|
| flyhigh-ui (Vite dev) | 5173 | http://localhost:5173 |
| flyhigh-backend (Spring Boot) | 8081 | http://localhost:8081 |
| flyhigh-signaling-server | 5000 | http://localhost:5000 |

## Quick Start (All Services)

```bash
# Terminal 1 — Backend
cd flyhigh-backend && mvnw spring-boot:run

# Terminal 2 — Signaling Server
cd flyhigh-signaling-server && node server.js

# Terminal 3 — Frontend
cd flyhigh-ui && npm run dev
```

## Architecture

```
Browser (React SPA)
  │
  ├── REST API (Axios) ─────────────► flyhigh-backend (8081) ─── MongoDB Atlas
  │   - Auth (JWT cookies)
  │   - Expert search/browse
  │   - Profile CRUD
  │   - Session management
  │
  └── WebSocket (Socket.IO) ────────► flyhigh-signaling-server (5000)
      - WebRTC signaling (offer/answer/ICE)
      - Call request routing
      - Chat messaging
      - User presence
```

## Cross-Cutting Concerns

- **Auth**: httpOnly JWT cookies set by backend, read by both frontend (Axios `withCredentials`) and signaling server
- **Database**: Shared MongoDB Atlas cluster — backend is primary writer, signaling server writes notifications
- **CORS**: Signaling server allows origins: localhost:3000, 5173, 5174, 5175, 8081
- **Dev data**: Backend `DevDataSeeder` creates 200 clients, 100 experts, 500 reviews on dev profile

## Gotchas

1. **Three processes must run** — backend, signaling server, and UI dev server. Missing any = broken video calls.
2. **MongoDB credentials in application.properties** — use `MONGODB_URI` env var in production.
3. **Port conflicts** — 5173 (Vite default), 8081 (Spring Boot), 5000 (signaling) all must be free.
4. **JWT cookies are httpOnly + secure + sameSite=strict** — works on localhost but needs HTTPS in production. Signaling server also verifies JWT via shared module.
5. **Signaling server now uses shared JWT module** — `src/shared/jwt.js` is imported by both `server.js` and `lambda.js`. Single source of truth for HMAC verification.
6. **Backend needs `--enable-preview`** — Structured Concurrency in BulkOperationService requires it at compile and runtime.
7. **UI uses TypeScript 7.0.1-rc** — bleeding edge; some tooling may have compatibility issues.
8. **Commission percent is dynamic** — frontend fetches from backend API on startup (no hardcoded value).

## Per-Service Details

See individual CLAUDE.md files:
- [flyhigh-backend/CLAUDE.md](flyhigh-backend/CLAUDE.md) — Java backend, MongoDB, 11 controllers, 19 services
- [flyhigh-ui/CLAUDE.md](flyhigh-ui/CLAUDE.md) — React frontend, shadcn/ui, workers, ErrorBoundary
- [flyhigh-signaling-server/CLAUDE.md](flyhigh-signaling-server/CLAUDE.md) — Socket.IO signaling, shared JWT module

## Verification Checklist

After any cross-service change:
- [ ] Backend compiles: `cd flyhigh-backend && ./mvnw compile`
- [ ] Frontend compiles: `cd flyhigh-ui && npx tsc -b`
- [ ] Signaling server starts: `cd flyhigh-signaling-server && node server.js`
- [ ] Signaling server JWT module loads: `node -e "import('./src/shared/jwt.js').then(m => console.log(Object.keys(m)))"`
- [ ] All three services can run simultaneously without port conflicts
- [ ] API calls from UI to backend succeed (check CORS origins)
- [ ] WebSocket connections to signaling server succeed
- [ ] All endpoints return 401 without auth (except public auth endpoints)
- [ ] Frontend commission percent is fetched dynamically from backend
- [ ] Chat messages are capped at 200 in SocketContext
- [ ] ErrorBoundary catches render errors (no white screen)
