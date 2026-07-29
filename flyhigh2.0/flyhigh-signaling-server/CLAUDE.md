# CLAUDE.md — FlyHigh Signaling Server

## Build & Run

```bash
# Local dev (Socket.IO, port 5000)
node server.js
PORT=6000 node server.js    # Custom port

# Lambda production handler
node -e "const { handler } = require('./lambda.js'); console.log('Handler OK:', typeof handler)"
```

## Stack

- **Node.js 22+** + **Express 4.22**
- **Socket.IO 4.8** — WebSocket with room support (local dev)
- **AWS Lambda + API Gateway WebSocket** — production deployment (lambda.js)
- **DynamoDB** — connection tracking and room state (Lambda)
- **cors** + **helmet 8** — CORS + 11 security headers
- **@aws-sdk/client-dynamodb + lib-dynamodb** — DynamoDB DocumentClient
- **@aws-sdk/client-apigatewaymanagementapi** — WebSocket callbacks

## Architecture

Two operating modes — **local dev** (Socket.IO) and **Lambda** (API Gateway WebSocket):

```
server.js (~530 lines)           lambda.js (~530 lines)
├── Express HTTP                   ├── AWS Lambda handler
│   └── GET / → health check       │   ├── $connect    → JWT auth + DynamoDB registration
├── Socket.IO                      │   ├── $disconnect → cleanup + room notification
│   ├── register-user (JWT auth)   │   └── $default    → action-based message routing
│   ├── call-request / call-response
│   ├── join-room / offer / answer / ice-candidate
│   ├── send-chat-message / end-call
│   └── disconnect → cleanup
├── Rate limiting (30 events/10s per socket)
├── Graceful shutdown (SIGTERM/SIGINT)
├── Shared JWT module              ├── Shared JWT module
│   └── src/shared/jwt.js          │   └── src/shared/jwt.js (imported)
│       • base64UrlDecode           │       • base64UrlDecode
│       • verifyJwt                 │       • verifyJwt
│       • verifyJwtWithDevFallback  │
│       • extractCookie             │
└── In-memory state (3 Maps)      └── DynamoDB state (connections + rooms tables)
    ├── connectedUsers                 ├── CONNECTIONS_TABLE (connectionId PK, GSI on email + userId)
    ├── userSocketsByEmail             └── ROOMS_TABLE (roomId PK, connectionIds set, TTL)
    └── userSocketsByUserId
```

## Key Patterns

- **Shared JWT module** (`src/shared/jwt.js`): Single source of truth for `base64UrlDecode`, `verifyJwt`, `verifyJwtWithDevFallback`, and `extractCookie`. Imported by both `server.js` and `lambda.js` — no code duplication.
- **JWT Authentication (hardened)**: JWT verified from event payload `token` field, or from httpOnly `accessToken` cookie in Socket.IO handshake. HMAC-SHA256/384/512 signature verification, expiry check, identity mismatch detection. Production (Lambda) ALWAYS requires JWT — no unauthenticated fallback.
- **Rate limiting**: 30 events per 10-second window per socket/connection. Lambda mode uses in-memory Map (resets on cold start — known limitation; use API Gateway throttling for production).
- **Dual-mode design**: Dev-mode fallback only in `server.js` (via `verifyJwtWithDevFallback`). Lambda always uses strict `verifyJwt`.
- **In-memory state (server.js)**: User presence resets on restart. Multiple sockets per user supported (fan-out to all).
- **DynamoDB state (lambda.js)**: Connection/room state persists across invocations. TTL-based auto-cleanup (3h connections, 24h rooms).
- **Broadcast resilience**: `Promise.allSettled` — single-connection failure doesn't block others.
- **Stale connection cleanup**: `GoneException` handling removes stale connections from DynamoDB.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` handlers notify clients and close server cleanly (Docker/ECS compatible).

## Gotchas

1. **JWT_SECRET is REQUIRED in production** — both `server.js` (when not in dev) and `lambda.js` (always). Generate: `openssl rand -base64 32`.
2. **JWT code is NOT duplicated** — `server.js` and `lambda.js` both import from `src/shared/jwt.js`. Fix JWT bugs once, not twice.
3. **Lambda cold starts reset rate limiter** — in-memory Map is per-container. Use API Gateway throttling as defense-in-depth.
4. **Dockerfile is for local dev only** — targets `server.js` with Socket.IO. For Lambda, deploy via CDK in `../infra/`.
5. **DynamoDB GSIs must exist** — `lambda.js` queries `email-index` and `userId-index` GSIs. Created by CDK `PlatformStack`.
6. **JWT token in query string** — `$connect` passes token via `?token=`. API Gateway logs query strings; consider upgrading to custom authorizer for production.
7. **No TURN server** — WebRTC uses STUN only. Calls fail behind symmetric NATs.
8. **Room cleanup race** — `end-call` in `lambda.js` deletes room after broadcast. Consider TTL-based soft-delete.

## Verification Checklist

After any signaling change:
- [ ] `node server.js` starts without errors
- [ ] Shared JWT module loads: `node -e "import('./src/shared/jwt.js').then(m => console.log(Object.keys(m)))"`
- [ ] `node -e "const { handler } = require('./lambda.js');"` — handler exports correctly
- [ ] Health check: `curl http://localhost:5000/` returns JSON with `status: 'ok'`
- [ ] Socket.IO connects from frontend (check browser Network → WS tab)
- [ ] JWT auth enforced when `JWT_SECRET` is set
- [ ] Call request reaches target user across multiple tabs
- [ ] WebRTC signaling flows: offer → answer → ICE candidates
- [ ] Chat messages relay correctly
- [ ] Disconnect cleanup works (no stale entries in Maps/DynamoDB)

## AWS Deployment

This service is deployed as an AWS Lambda function via the CDK stack in `../infra/`.
- **Handler**: `lambda.handler` (API Gateway WebSocket events)
- **Runtime**: Node.js 22.x
- **State**: DynamoDB (`connections` + `rooms` tables, created by `PlatformStack`)
- **Secrets**: `JWT_SECRET` resolved from Secrets Manager at deploy time by CloudFormation
- **IAM**: `grantReadWriteData` on both tables, `execute-api:ManageConnections` on WebSocket API
- **Throttling**: API Gateway stage-level throttling (staging: 50/30, production: 500/200)
