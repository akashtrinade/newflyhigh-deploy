# FlyHigh 2.0 — Developer Guide

> **Last updated:** 2026-08-17
> **Branch:** `prod`

Comprehensive reference for developing, testing, and deploying the FlyHigh video-consultation marketplace. Covers local development setup, architecture, coding patterns, and AWS deployment.

> **Recent changes (Aug 2026):** ownership-enforced payment/session endpoints; payments bound to session orders with webhook-backed extension handling; backend-written in-app notifications; cumulative paid-time tracking; admin credential fail-fast + page-shaped admin API; UI 401 token refresh, extension retry, call-room rejoin; Terms/Privacy pages; ₹ price + rating search filters; refunds require COMPLETED sessions. See `PROJECT_UNDERSTANDING.md` → "Key Fixes & Hardening" for details.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Local Development](#local-development)
4. [Project Structure](#project-structure)
5. [Coding Patterns & Conventions](#coding-patterns--conventions)
6. [Testing](#testing)
7. [AWS Deployment](#aws-deployment)
8. [Infrastructure (CDK)](#infrastructure-cdk)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Environment Variables Reference](#environment-variables-reference)
11. [Common Tasks](#common-tasks)
12. [Troubleshooting](#troubleshooting)
13. [Code Review Findings & Fixes](#code-review-findings--fixes)

---

## Quick Start

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 22+ | `node -v` |
| **Java JDK** | 21 (Temurin) | `java -version` |
| **Maven** | 3.9+ (wrapper included) | `./mvnw --version` |
| **MongoDB** | 7 (local) or Atlas SRV URI | — |
| **Git** | any recent | `git --version` |

### One-Command Start

```bash
# Windows PowerShell
.\start-dev.ps1

# Unix/Mac
./start-dev.sh

# Or with Docker
.\start-dev.ps1 -Docker    # Windows
./start-dev.sh --docker    # Unix/Mac
docker-compose up -d       # Any platform
```

This starts all three services:
- **UI:** http://localhost:5173
- **Backend API:** http://localhost:8081
- **Signaling/WebSocket:** ws://localhost:5000

### Manual Start (3 terminals)

```bash
# Terminal 1 — Signaling Server
cd flyhigh-signaling-server
npm ci
node server.js

# Terminal 2 — Backend
cd flyhigh-backend
./mvnw spring-boot:run              # Unix
.\mvnw.cmd spring-boot:run          # Windows

# Terminal 3 — Frontend
cd flyhigh-ui
npm ci
npm run dev
```

### Required Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Base64-encoded HMAC key |
| `MAIL_USERNAME` | Dev only | — | Gmail for OTP emails |
| `MAIL_PASSWORD` | Dev only | — | Gmail app password |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | Google OAuth secret |
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | — | Same, for frontend |
| `RAZORPAY_KEY_ID` | Payment | test key | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Payment | test secret | Razorpay secret |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
│                                                                  │
│  React 19 SPA (Vite 6 + Tailwind CSS v4 + shadcn/ui)            │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Axios    │  │ Raw       │  │ Socket.  │  │ WebRTC        │  │
│  │ (REST)   │  │ WebSocket │  │ IO       │  │ (PeerConn)    │  │
│  │ cookies  │  │ (signal)  │  │ (payment)│  │               │  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───────┬───────┘  │
└───────┼──────────────┼─────────────┼─────────────────┼──────────┘
        │              │             │                 │
        ▼              ▼             ▼                 ▼
┌───────────────┐ ┌──────────┐ ┌──────────┐    P2P WebRTC
│ Spring Boot   │ │ Signaling│ │ Socket.IO│    (STUN/TURN)
│ 3.2.5 (8081)  │ │ Server   │ │ (8085)   │
│ Java 21       │ │ (5000)   │ │ In-JVM   │
│               │ │ Node.js  │ │          │
│ ┌───────────┐ │ │          │ │          │
│ │ REST API  │ │ │ WebSocket│ │ Payment  │
│ │ /api/*    │ │ │ +SocketIO│ │ Events   │
│ └─────┬─────┘ │ │          │ │          │
└───────┼───────┘ └──────────┘ └──────────┘
        │
        ▼
┌─────────────────────────────────────┐
│         MongoDB Atlas                │
│  flyhigh_dev / flyhigh_prod         │
│                                      │
│  Collections:                        │
│  users, expert_profiles,             │
│  interactions, call_requests,        │
│  session_payments, reviews,          │
│  dropdown_definitions, ...           │
└─────────────────────────────────────┘
```

### Service Details

| Service | Tech | Port | Protocol | State |
|---------|------|------|----------|-------|
| **flyhigh-ui** | React 19, Vite 6, TS 7 | 5173 | HTTP | Stateless |
| **flyhigh-backend** | Spring Boot 3.2.5, Java 21 | 8081 | REST + Socket.IO | MongoDB |
| **flyhigh-signaling-server** | Node.js, Express, Socket.IO | 5000 | WebSocket + Socket.IO | In-memory (local) / DynamoDB (AWS) |

### Real-Time Connections

The frontend maintains up to **3 real-time connections** during a video call:

| Connection | Protocol | URL | Purpose |
|------------|----------|-----|---------|
| **Signaling WS** | Raw WebSocket | `VITE_WEBSOCKET_URL` (default `ws://localhost:5000`) | Call requests, WebRTC signaling, chat |
| **Payment Socket** | Socket.IO | `http://localhost:8085` | Payment/session events (local only) |
| **WebRTC** | P2P (STUN) | `stun:stun.l.google.com:19302` | Audio/video media |

**Important on signaling protocol:** The local signaling server (`server.js`) accepts both Socket.IO and raw WebSocket connections on port 5000. The frontend uses raw WebSocket (`new WebSocket()`) for compatibility with AWS API Gateway in production. The server handles the `upgrade` event to accept raw WebSocket connections alongside Socket.IO.

---

## Local Development

### Option 1: Startup Script (Recommended)

```bash
# Windows
.\start-dev.ps1

# Unix/Mac
./start-dev.sh
```

These scripts:
- Load `.env` if present
- Check prerequisites (Node.js, Java)
- Start all 3 services in background jobs
- Stream logs to the terminal
- Ctrl+C stops everything cleanly

### Option 2: Docker Compose

```bash
docker-compose up -d
```

Includes a local MongoDB 7 container. Services:
- `mongo` — MongoDB 7 on port 27017
- `backend` — Spring Boot on port 8081
- `signaling` — Node.js on port 5000
- `ui` — Vite dev server on port 5173 (hot-reload via volume mount)

### Option 3: Manual

Each service runs in its own terminal:

```bash
# Terminal 1
cd flyhigh-signaling-server && node server.js

# Terminal 2
cd flyhigh-backend && ./mvnw spring-boot:run

# Terminal 3
cd flyhigh-ui && npm run dev
```

### Dev Profile Behavior

When `SPRING_PROFILES_ACTIVE=dev` (default), the backend:
- Uses `flyhigh_dev` database
- Runs `DevDataSeeder` on startup — creates 200 clients, 100 experts, 500 reviews
- Seeds are **idempotent** — safe to restart, never touches real data
- Sets `DEBUG` logging for `com.flyhigh`

### Hot Reload

| Service | Hot Reload | Notes |
|---------|------------|-------|
| **flyhigh-ui** | ✅ Vite HMR | Instant CSS + component updates |
| **flyhigh-backend** | ✅ DevTools | `spring-boot-devtools` auto-restart |
| **flyhigh-signaling-server** | ❌ | Manual restart required (`Ctrl+C` → `node server.js`) |

### Resetting Dev Data

```bash
cd flyhigh-backend
./mvnw spring-boot:run -Dspring-boot.run.arguments=--app.clean-dev-data=true
```

Or use the `DevDataCleaner` directly in the app context.

---

## Project Structure

```
flyhigh2.0/
├── docker-compose.yml            # One-command Docker setup
├── start-dev.ps1                 # Windows startup script
├── start-dev.sh                  # Unix/Mac startup script
├── stop-dev.ps1                  # Stop background jobs
├── .env.example                  # Environment variable template
├── CLAUDE.md                     # Root project instructions
├── PROJECT_UNDERSTANDING.md      # Detailed architecture doc
│
├── flyhigh-ui/                   # React 19 Frontend
│   ├── src/
│   │   ├── api/client.ts         # Axios instance + interceptors
│   │   ├── components/           # Pages + feature components
│   │   │   ├── auth/             # Login, Signup, OAuth, OTP
│   │   │   ├── client/           # Client dashboard, search, sessions
│   │   │   ├── expert/           # Expert dashboard, profile, sessions
│   │   │   ├── home/             # Landing page sections
│   │   │   ├── layout/           # Navbar, Sidebar, Footer
│   │   │   ├── video-call/       # WebRTC UI, payment sidebar, timers
│   │   │   └── ui/               # shadcn/ui primitives
│   │   ├── contexts/             # AuthContext, SocketContext, PaymentSocketContext
│   │   ├── hooks/                # useWebRTC, useSocket, useRazorpay, useSessionTimer
│   │   ├── lib/                  # API wrappers (payments, expert-search, expert-profile)
│   │   ├── router/routes.ts      # Lazy-loaded route config
│   │   ├── types/                # TypeScript interfaces
│   │   └── workers/              # 4 Web Workers (chat, data, heartbeat, polling)
│   ├── Dockerfile.dev            # Dev container
│   ├── vite.config.ts            # Vite + Tailwind + path aliases
│   └── package.json              # Dependencies + scripts
│
├── flyhigh-backend/              # Spring Boot 3.2.5 Backend
│   ├── src/main/java/com/flyhigh/backend/
│   │   ├── FlyhighBackendApplication.java   # Entry point
│   │   ├── StreamLambdaHandler.java         # AWS Lambda handler
│   │   ├── config/               # Mongo, Security, Razorpay, Socket.IO
│   │   ├── controller/           # Auth, Expert, Payment, VideoCall, GoogleAuth
│   │   ├── dto/                  # 18+ DTO classes
│   │   ├── exception/            # GlobalExceptionHandler + custom exceptions
│   │   ├── model/                # MongoDB entities (User, ExpertProfile, Interaction, ...)
│   │   ├── repository/           # Spring Data MongoRepository interfaces
│   │   ├── security/             # JWT filter, rate limiter, entry point
│   │   ├── seed/                 # DevDataSeeder, SeedRunner, DevDataCleaner
│   │   └── service/              # Auth, Jwt, Otp, Payment, VideoCall, ExpertSearch, ...
│   ├── src/main/resources/
│   │   ├── application.properties    # Base config
│   │   ├── application-dev.yml       # Dev profile overrides
│   │   └── application-prod.yml      # Prod profile overrides
│   ├── Dockerfile                # Multi-stage production image
│   ├── pom.xml                   # Maven config
│   └── CLAUDE.md
│
├── flyhigh-signaling-server/     # Node.js Signaling Server
│   ├── server.js                 # Local dev server (Socket.IO + raw WebSocket)
│   ├── lambda.js                 # AWS Lambda handler (API Gateway WebSocket)
│   ├── models/Notification.js    # Notification schema (unused — for future use)
│   ├── Dockerfile                # Production container
│   ├── package.json
│   └── CLAUDE.md
│
├── infra/                        # AWS CDK Infrastructure (TypeScript)
│   ├── bin/app.ts                # CDK app entry point
│   ├── lib/
│   │   ├── platform-stack.ts     # Stateful resources (DynamoDB, Secrets Manager)
│   │   └── app-stack.ts          # Stateless per-env resources (Lambda, API Gateway, S3+CF)
│   ├── cdk.json                  # CDK context (env configs)
│   └── package.json
│
└── .github/workflows/
    └── deploy.yml                # CI/CD pipeline (build → test → diff → deploy)
```

---

## Coding Patterns & Conventions

### Backend (Java)

**Layered architecture:** Controller → Service → Repository

```java
// Controller
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;
    private final AuthService authService;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(Authentication auth, @RequestBody CreateOrderRequest req) {
        User user = authService.getUserByEmail(auth.getName());
        try {
            CreateOrderResponse res = paymentService.createRazorpayOrder(req, user.getId());
            return ResponseEntity.ok(res);
        } catch (InvalidSessionStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new MessageResponse(false, e.getMessage()));
        }
    }
}
```

**Key conventions:**
- All repositories extend `MongoRepository<T, String>`
- Custom queries use `MongoTemplate` (see `ExpertSearchService`)
- Stateless services only — no shared mutable state
- JWT extracted from `accessToken` cookie (primary) or `Authorization: Bearer` header (fallback)
- BCrypt strength 12 for password hashing
- Enum-based state machines (`SessionStatus`, `PaymentStatus`, `PaymentType`)

### Frontend (React/TypeScript)

**Layered architecture:** Page → Context/Hook → API Lib → Axios

```typescript
// Pattern: Component uses context + hooks
function VideoCallPage() {
  const { user } = useAuth()                              // Context
  const { emitOffer, onAnswer } = useSocket()             // Hook (WebSocket)
  const { localStream, startCall } = useWebRTC()          // Hook (WebRTC)
  const { createOrder } = useRazorpay()                   // Hook (Payments)
  const { sessionState } = useSessionTimer(interactionId) // Hook (Polling)

  // ...
}
```

**Key conventions:**
- API calls go through `lib/` wrappers, not called directly from components
- `AuthContext` manages user state with httpOnly JWT cookies (`withCredentials: true`)
- Real-time signaling uses `SocketContext` (raw WebSocket) + `useSocket` hook
- Web Workers offload heavy computation from main thread
- Tailwind CSS v4 via CSS-first config (no `tailwind.config.js`)
- shadcn/ui primitives in `components/ui/` — don't edit manually
- Lazy-loaded routes via `React.lazy()` in `router/routes.ts`
- TypeScript 7 strict mode with `verbatimModuleSyntax`

### Signaling Server (Node.js)

**Dual protocol on single port:**
- Socket.IO on `/socket.io/` — for backward compatibility
- Raw WebSocket on root path — for frontend compatibility with API Gateway in production

**Message format:** JSON with `action` field for routing:
```json
{ "action": "offer", "offer": { "type": "offer", "sdp": "..." }, "roomName": "room123" }
```

**User tracking:** Three Maps for O(1) lookup (shared between Socket.IO and raw WS):
- `connectedUsers: Map<socketId, UserData>`
- `userSocketsByEmail: Map<email, socketId[]>`
- `userSocketsByUserId: Map<userId, socketId[]>`

---

## Testing

### Backend

```bash
cd flyhigh-backend
./mvnw test                    # Run all tests
./mvnw test -Dtest=PaymentServiceTest  # Single test class
```

**Current test coverage:** Single `FlyhighBackendApplicationTests.java` (context loads). **Expand test coverage** for PaymentService, SessionStateService, and VideoCallService before production deployment — see [Code Review Findings](#code-review-findings--fixes).

### Frontend

```bash
cd flyhigh-ui
npx tsc -b                     # Type check (no emit)
npx eslint .                   # Lint
npm run build                  # Production build
npm run preview                # Preview built output
```

### Signaling Server

```bash
cd flyhigh-signaling-server
node -e "require('./server.js')" && echo "Syntax OK"  # Basic syntax check
```

### Verification Checklist

After any cross-service change:
- [ ] Backend: `mvnw compile` passes
- [ ] Frontend: `npx tsc -b` passes
- [ ] Signaling: `node server.js` starts without errors
- [ ] All three services run simultaneously without port conflicts
- [ ] API calls from UI to backend succeed (check CORS origins)
- [ ] WebSocket connections to signaling server succeed

---

## AWS Deployment

### Compute Architecture

The FlyHigh deployment uses a **serverless-first** approach with deliberate exceptions:

| Component | AWS Service | Why |
|-----------|-------------|-----|
| **Backend (Spring Boot)** | Lambda (Java 21) + SnapStart | Stateless REST API, bursty traffic, SnapStart mitigates cold starts |
| **Signaling** | Lambda (Node.js 22) + API Gateway WebSocket | Stateless WebSocket handling, auto-scales per connection |
| **Frontend (React SPA)** | S3 + CloudFront | Static assets, global CDN distribution |
| **WebSocket State** | DynamoDB (2 tables) | Connection tracking, room state — serverless, auto-scaling |
| **Secrets** | Secrets Manager | MongoDB URI, JWT secret, API keys — rotation-ready |

### Stack Separation

The CDK app deploys two stacks per environment:

**Platform Stack** (`flyhigh-platform-{env}`) — stateful, deploy rarely:
- DynamoDB `connections` table (with GSI on email, userId)
- DynamoDB `rooms` table
- Secrets Manager (`flyhigh/{env}/credentials`)
- CloudWatch Log Groups (3-month retention)

**App Stack** (`flyhigh-app-{env}`) — stateless, deploy per release:
- Lambda: Backend (Java 21, SnapStart, 1024MB)
- Lambda: Signaling (Node.js 22, 256MB)
- API Gateway: HTTP API → Backend Lambda
- API Gateway: WebSocket API → Signaling Lambda
- S3: SPA bucket
- CloudFront: CDN distribution
- CloudWatch Alarms: 5xx errors > 5 in 5 min

### Deployment Process

```
Git Push (main)
  → Build & Test (matrix: frontend, backend, signaling)
  → Deploy Staging (CDK deploy + S3 upload + CloudFront invalidation)
  → [Manual Approval via GitHub Environments]
  → Deploy Production (same steps, prod env)
```

### Environment Configuration

Edit `infra/cdk.json` for environment-specific values:

```json
{
  "context": {
    "staging": {
      "domain": "staging.flyhigh.com",
      "certificateArn": "arn:aws:acm:us-east-1:ACCOUNT:certificate/xxx",
      "backendMemory": 1024,
      "signalingMemory": 256,
      "provisionedConcurrency": 1,
      "logLevel": "INFO"
    },
    "production": {
      "domain": "flyhigh.com",
      "certificateArn": "arn:aws:acm:us-east-1:ACCOUNT:certificate/xxx",
      "backendMemory": 2048,
      "signalingMemory": 512,
      "provisionedConcurrency": 5,
      "logLevel": "WARN"
    }
  }
}
```

### Deploy Manually

```bash
cd infra
npm ci
npx cdk synth --all --context env=staging     # Preview templates
npx cdk diff --all --context env=staging      # Show changes
npx cdk deploy --all --context env=staging    # Deploy!

# Production
npx cdk deploy --all --context env=production --require-approval never
```

### Secrets Setup

Before first deploy, populate the Secrets Manager secret manually:

```bash
aws secretsmanager put-secret-value \
  --secret-id flyhigh/staging/credentials \
  --secret-string '{
    "MONGODB_URI": "mongodb+srv://...",
    "JWT_SECRET": "...",
    "MAIL_USERNAME": "...",
    "MAIL_PASSWORD": "...",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "..."
  }'
```

**Security note:** Current `app-stack.ts` uses `.unsafeUnwrap()` to embed secrets as Lambda environment variables. Consider switching to runtime Secrets Manager resolution to avoid plaintext in CloudFormation templates. See [Code Review Finding #8](#code-review-findings--fixes).

### Required AWS Permissions

The GitHub Actions role (`github-actions-cdk`) needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "cloudformation:*", "Resource": "*" },
    { "Effect": "Allow", "Action": "s3:*", "Resource": "arn:aws:s3:::cdk-*" },
    { "Effect": "Allow", "Action": "iam:*", "Resource": "arn:aws:iam::ACCOUNT:role/cdk-*" },
    { "Effect": "Allow", "Action": "lambda:*", "Resource": "*" },
    { "Effect": "Allow", "Action": "apigateway:*", "Resource": "*" },
    { "Effect": "Allow", "Action": "cloudfront:*", "Resource": "*" },
    { "Effect": "Allow", "Action": "dynamodb:*", "Resource": "*" },
    { "Effect": "Allow", "Action": "secretsmanager:*", "Resource": "*" }
  ]
}
```

---

## Infrastructure (CDK)

### Key Files

| File | Purpose |
|------|---------|
| `infra/bin/app.ts` | CDK entry point — reads context, creates stacks |
| `infra/lib/platform-stack.ts` | Stateful resources (DynamoDB, Secrets, Log Groups) |
| `infra/lib/app-stack.ts` | Per-env resources (Lambda, API Gateway, S3, CloudFront) |
| `infra/cdk.json` | Environment config (domain, memory, concurrency) |

### Stack Dependency

```
Platform Stack (deploy first, rarely changes)
    │
    ▼
App Stack (deploy per release)
    ├── Backend Lambda
    ├── Signaling Lambda
    ├── HTTP API Gateway
    ├── WebSocket API Gateway
    └── S3 + CloudFront
```

### Production Readiness

Before going to production, address these CDK items:

1. **Custom domain:** Set `certificateArn` in `cdk.json` for each environment. Without it, CORS goes to `*`.
2. **Secrets:** Switch from `unsafeUnwrap()` to runtime resolution
3. **SnapStart:** Already enabled on backend Lambda — keep `provisionedConcurrency` at 1+ for production
4. **CloudFront cache:** Review cache policies for API responses
5. **Alarms:** Add p95 latency alarms in addition to 5xx error alarms

---

## CI/CD Pipeline

### Workflow: `.github/workflows/deploy.yml`

| Stage | When | What |
|-------|------|------|
| **Build & Test** | Every push/PR | Matrix build: frontend (npm), backend (Maven), signaling (syntax check) |
| **CDK Diff** | PR only | Shows infrastructure changes as PR comment |
| **Deploy Staging** | Push to main | CDK deploy + S3 upload + CloudFront invalidation |
| **Deploy Production** | Push to main | Same as staging, requires GitHub Environments approval |

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ACCOUNT_ID` | AWS account for OIDC role assumption |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for SPA builds |

### OIDC Setup

The pipeline uses GitHub OIDC for AWS auth (no long-lived credentials):

1. Create IAM role `github-actions-cdk` in AWS
2. Configure trust relationship for `token.actions.githubusercontent.com`
3. Attach the permissions policy listed above
4. Store the AWS account ID as `AWS_ACCOUNT_ID` secret in GitHub

---

## Environment Variables Reference

### Backend (`application.properties`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | 8081 | HTTP port |
| `SPRING_PROFILES_ACTIVE` | dev | Profile: dev / prod |
| `MONGODB_URI` | — | MongoDB SRV connection string |
| `MONGODB_AUTO_INDEX` | false | Auto-create indexes on startup |
| `JWT_SECRET` | — | Base64 HMAC-SHA256 key |
| `JWT_ACCESS_EXPIRY` | 900000 | Access token TTL (ms) — 15 min |
| `JWT_REFRESH_EXPIRY` | 604800000 | Refresh token TTL (ms) — 7 days |
| `BCRYPT_STRENGTH` | 12 | BCrypt rounds (use 4 for faster dev) |
| `OTP_LENGTH` | 6 | OTP digit count |
| `OTP_EXPIRY_MINUTES` | 10 | OTP validity |
| `MAIL_USERNAME` | — | Gmail SMTP username |
| `MAIL_PASSWORD` | — | Gmail app password |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth secret |
| `CORS_ORIGINS` | localhost:5173,3000 | Comma-separated allowed origins |
| `LOG_LEVEL` | DEBUG (dev) | Root log level |
| `RAZORPAY_KEY_ID` | test key | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | test secret | Razorpay secret |

### Frontend (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE` | `http://localhost:8081/api` | Backend API URL |
| `VITE_WEBSOCKET_URL` | `ws://localhost:5000` | Signaling WebSocket URL |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID |

### Signaling Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 5000 | HTTP/WS listen port |
| `CONNECTIONS_TABLE` | `flyhigh-connections` | DynamoDB (Lambda only) |
| `ROOMS_TABLE` | `flyhigh-rooms` | DynamoDB (Lambda only) |

---

## Common Tasks

### Add a New API Endpoint

1. **Backend:** Create DTOs → Service method → Controller endpoint
2. **Frontend:** Add API call in `lib/` → Use in component/hook
3. **Types:** Update `types/` interfaces

### Add a New Signaling Event

1. **server.js:** Add case in raw WS switch + Socket.IO handler
2. **lambda.js:** Add case in `handleDefault` switch
3. **SocketContext.tsx:** Add action to switch + emitter method
4. **Types:** Add interface in `SocketContext.tsx`

### Debug Video Calls

1. Check signaling WS connection: Browser DevTools → Network → WS tab → `ws://localhost:5000`
2. Check WebRTC internals: `chrome://webrtc-internals` or `about:webrtc`
3. Check STUN: Verify `stun:stun.l.google.com:19302` is reachable
4. Check backend: `POST /api/video-call/request`, `POST /api/video-call/respond`

### Run with ngrok (External Access)

```bash
ngrok http 5173              # Frontend
ngrok http 8081              # Backend API
# Update VITE_API_BASE to ngrok URL
```

---

## Troubleshooting

### "WebSocket connection failed" in browser console

**Cause:** Signaling server not running or port mismatch.
**Fix:**
```bash
cd flyhigh-signaling-server && node server.js
# Verify: curl http://localhost:5000/
```

### "MongoSocketException" or "MongoTimeoutException"

**Cause:** MongoDB not reachable.
**Fix:**
- Check `MONGODB_URI` in `.env`
- For Atlas: whitelist your IP in Network Access
- For local Docker: `docker-compose up -d mongo`

### "401 Unauthorized" on API calls

**Cause:** JWT cookie not being sent.
**Fix:**
- Check Axios `withCredentials: true` in `client.ts`
- Check CORS origins in backend `application.properties`
- Clear browser cookies and re-login

### TypeScript errors in flyhigh-ui

**Cause:** TypeScript 7.0.1-rc compatibility.
**Fix:**
```bash
npx tsc --noEmit                    # Check specific errors
rm -rf node_modules && npm ci       # Full reinstall
```

### "SnapStart not supported" on CDK deploy

**Cause:** CDK version or region doesn't support SnapStart.
**Fix:** Remove `snapStart` from `app-stack.ts` line 59, or deploy to `us-east-1`.

---

## Code Review Findings & Fixes

Issues found during the 2026-07-07 high-effort code review and their resolution status:

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | **CRITICAL** | Raw WebSocket client incompatible with Socket.IO local signaling server | ✅ Fixed — Added raw WebSocket handler to server.js |
| 2 | **CRITICAL** | `action` field overwrites `"call-response"` routing key in emitCallResponse | ✅ Fixed — Changed to `callAction` in IncomingCallPopup.tsx |
| 3 | **CRITICAL** | WaitingForExpert.tsx reads `.action` instead of `.callAction` | ✅ Fixed |
| 4 | **CRITICAL** | Socket.IO payment server (port 8085) cannot run in AWS Lambda | ⚠️ Known — Use 2-second polling fallback in production until WebSocket payment events are migrated |
| 5 | **HIGH** | getSessionState() performs destructive writes in GET endpoint | ⚠️ Known — Add idempotency check or move to POST |
| 6 | **MEDIUM** | InvalidSessionStateException returns 502 instead of 409 | ✅ Fixed — Added specific catch clauses in PaymentController |
| 7 | **MEDIUM** | lambda.js WebRTC signaling broadcasts envelope instead of inner SDP | ⚠️ Known — Frontend fallback mitigates this |
| 8 | **MEDIUM** | Secrets as plaintext via unsafeUnwrap() in CDK | ⚠️ Known — Switch to runtime Secrets Manager resolution |
| 9 | **LOW** | NPE on null interaction.clientId in PaymentService | ⚠️ Known — Add null guard |
| 10 | **LOW** | Wrong key lookup in server.js call-request handler | ✅ Fixed — Removed dead code |

---

## Useful Commands Reference

```bash
# Backend
cd flyhigh-backend
./mvnw spring-boot:run                            # Start
./mvnw test                                        # Run tests
./mvnw clean package -DskipTests                   # Build JAR

# Frontend
cd flyhigh-ui
npm run dev                                        # Dev server
npm run build                                      # Production build
npx tsc -b                                         # Type check
npx eslint .                                       # Lint

# Signaling
cd flyhigh-signaling-server
node server.js                                     # Local server
node lambda.js                                     # Lambda handler test

# Infrastructure
cd infra
npm ci                                             # Install
npx cdk synth --all --context env=staging          # Generate templates
npx cdk diff --all --context env=staging           # Show changes
npx cdk deploy --all --context env=staging         # Deploy

# Docker
docker-compose up -d                               # Start all
docker-compose down                                # Stop all
docker-compose logs -f backend                     # Backend logs
```

---

*For service-specific details, see:*
- [flyhigh-backend/CLAUDE.md](flyhigh-backend/CLAUDE.md)
- [flyhigh-ui/CLAUDE.md](flyhigh-ui/CLAUDE.md)
- [flyhigh-signaling-server/CLAUDE.md](flyhigh-signaling-server/CLAUDE.md)
- [CLAUDE.md](CLAUDE.md) — Root project instructions
