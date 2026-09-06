# FlyHigh 2.0 — Video Consultation Marketplace

A full-stack marketplace connecting clients with expert professionals across categories (legal, finance, tech, health, business) via WebRTC video calls. Think "Uber for expert consultations."

## Recent Changes (Aug 17, 2026)

- Ownership checks on all payment/session endpoints; payments bound to the session's own order; no more captured-but-dead payment states (expiry-safe verify + webhook applies extensions).
- In-app notifications now actually written by the backend (call requests, responses, payments).
- UI: mid-call token refresh, extension retry verification, working feedback flow, call-room rejoin on reconnect, peer-disconnect banner.
- Admin: no default credentials; admin tables show real data (page-shaped API).
- Legal pages live at `/terms` and `/privacy`; search price (₹) and rating filters work.

[![Deploy](https://github.com/akshay/flyhigh/actions/workflows/deploy.yml/badge.svg)](https://github.com/akshay/flyhigh/actions/workflows/deploy.yml)

---

## Architecture

```
Browser (React 19 SPA)
  │
  ├── REST API (Axios) ─────────────► flyhigh-backend (8081) ─── MongoDB Atlas
  │   • Auth (JWT cookies)              Spring Boot 3.2.5
  │   • Expert search/browse            Java 21
  │   • Profile CRUD
  │   • Session management
  │
  └── WebSocket (Socket.IO) ────────► flyhigh-signaling-server (5000)
      • WebRTC signaling (SDP/ICE)      Node.js + Socket.IO 4.7
      • Call request routing
      • Chat messaging
      • User presence
```

| Service | Stack | Port | URL |
|---------|-------|------|-----|
| **flyhigh-ui** | React 19 + Vite 6 + Tailwind v4 + shadcn/ui | 5173 | http://localhost:5173 |
| **flyhigh-backend** | Spring Boot 3.2.5 + MongoDB Atlas (Java 21) | 8081 | http://localhost:8081 |
| **flyhigh-signaling-server** | Node.js + Express + Socket.IO 4.7 | 5000 | ws://localhost:5000 |

---

## Quick Start (Local)

### Prerequisites

- **Node.js** 22+ (`node -v`)
- **Java JDK** 21 Temurin (`java -version`)
- **MongoDB Atlas** connection string (free tier works)

### Option 1: Startup Script (Recommended)

```bash
# Windows PowerShell
.\start-dev.ps1

# Unix/Mac
./start-dev.sh
```

This loads `.env`, checks prerequisites, and starts all 3 services in background jobs. Press `Ctrl+C` to stop all.

### Option 2: Docker Compose

```bash
docker-compose up -d
```

Includes a local MongoDB 7 container. Services:
- `mongo` — MongoDB 7 on port 27017
- `backend` — Spring Boot on port 8081
- `signaling` — Node.js on port 5000
- `ui` — Vite dev server on port 5173 (hot-reload via volume mount)

### Option 3: Manual (3 Terminals)

```bash
# Terminal 1 — Signaling Server
cd flyhigh-signaling-server
npm ci
node server.js

# Terminal 2 — Backend
cd flyhigh-backend
./mvnw spring-boot:run          # Unix
.\mvnw.cmd spring-boot:run      # Windows

# Terminal 3 — Frontend
cd flyhigh-ui
npm ci
npm run dev
```

### Environment Setup

Copy `.env.example` to `.env` at the repo root and configure:

```bash
# Required
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/flyhigh2
JWT_SECRET=<base64-encoded-secret>

# Email (Gmail SMTP for OTP)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-secret>
VITE_GOOGLE_CLIENT_ID=<same-as-above>

# Frontend (defaults shown)
VITE_API_BASE=http://localhost:8081/api
VITE_WEBSOCKET_URL=ws://localhost:5000
```

The dev profile auto-seeds: **200 clients, 100 experts, 500 reviews** (idempotent — safe to restart).

---

## AWS Deployment

FlyHigh uses a **serverless-first** AWS architecture deployed via CDK and GitHub Actions.

### Compute Architecture

| Component | AWS Service | Notes |
|-----------|-------------|-------|
| **Backend** | Lambda (Java 21) + SnapStart | Stateless REST API, API Gateway HTTP proxy |
| **Signaling** | Lambda (Node.js 22) + API Gateway WebSocket | Serverless WebSocket handling |
| **Frontend** | S3 + CloudFront | Static SPA, global CDN |
| **State** | DynamoDB (`connections`, `rooms` tables) | WebSocket connection tracking |
| **Secrets** | Secrets Manager | MongoDB URI, JWT secret, API keys |

### CDK Stack Structure

```
Platform Stack (deploy once, rarely changes)
  ├── DynamoDB: connections table (GSI on email, userId)
  ├── DynamoDB: rooms table
  ├── Secrets Manager: flyhigh/{env}/credentials
  └── CloudWatch Log Groups (3-month retention)
        │
        ▼
App Stack (deploy per release, per environment)
  ├── Lambda: Backend (Java 21, SnapStart)
  ├── Lambda: Signaling (Node.js 22)
  ├── API Gateway: HTTP API → Backend Lambda
  ├── API Gateway: WebSocket API → Signaling Lambda
  ├── S3: SPA bucket
  └── CloudFront: CDN distribution
```

### CI/CD Pipeline

```
Git Push (main)
  → Build & Test (matrix: frontend, backend, signaling)
  → CDK Diff (PRs only — posted as comment)
  → Deploy Staging (CDK deploy + S3 upload + CloudFront invalidation)
  → Deploy Production (same steps, after environment approval)
```

### Deploying Manually

```bash
# Set up secrets first
aws secretsmanager put-secret-value \
  --secret-id flyhigh/staging/credentials \
  --secret-string '{"MONGODB_URI":"...","JWT_SECRET":"...","GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"...","MAIL_USERNAME":"...","MAIL_PASSWORD":"..."}'

# Deploy platform (once)
cd infra
npm ci
npx cdk deploy flyhigh-platform-staging --context env=staging

# Deploy app
cd flyhigh-backend && ./mvnw package -DskipTests && cd ..
npx cdk deploy flyhigh-app-staging --context env=staging

# Upload frontend
cd flyhigh-ui
VITE_API_BASE=https://api.staging.flyhigh.com/api \
VITE_WEBSOCKET_URL=wss://ws.staging.flyhigh.com \
npm ci && npm run build
aws s3 sync dist/ s3://flyhigh-staging-spa/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ACCOUNT_ID` | AWS account for OIDC role assumption |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for SPA builds |

### OIDC Setup

The pipeline authenticates to AWS via GitHub OIDC (no long-lived credentials):
1. Create IAM role `github-actions-cdk` with trust for `token.actions.githubusercontent.com`
2. Attach policies for CloudFormation, Lambda, API Gateway, S3, CloudFront, DynamoDB, Secrets Manager
3. Store `AWS_ACCOUNT_ID` as a GitHub secret

---

## Key Features

- **Auth**: httpOnly JWT cookies (access + refresh), Google OAuth, OTP email verification
- **Expert Search**: Dynamic MongoDB queries — filter by category, language, country, rating, price range, availability
- **Video Calls**: WebRTC with Socket.IO signaling, STUN support, call request/accept/reject flow
- **Real-time**: Chat messaging, call routing, user presence, heartbeat monitoring
- **Payments**: Razorpay integration (test mode) with session payment tracking
- **Dashboards**: Separate client and expert experiences with session history
- **Dev Data**: Idempotent seeder creates realistic test data (200 clients, 100 experts, 500 reviews)

---

## Project Structure

```
flyhigh2.0/
├── flyhigh-ui/                   React 19 Frontend
│   ├── src/components/           Auth, Client, Expert, VideoCall, Layout
│   ├── src/contexts/             AuthContext, SocketContext, PaymentSocketContext
│   ├── src/hooks/                useWebRTC, useSocket, useRazorpay, useSessionTimer
│   ├── src/lib/                  API wrappers (payments, expert-search, expert-profile)
│   ├── src/types/                TypeScript interfaces
│   └── src/workers/              4 Web Workers (chat, data, heartbeat, polling)
│
├── flyhigh-backend/              Spring Boot 3.2.5 Backend
│   ├── src/main/java/com/flyhigh/backend/
│   │   ├── controller/           Auth, Expert, Payment, VideoCall, GoogleAuth
│   │   ├── service/              Auth, Jwt, Otp, Payment, VideoCall, ExpertSearch
│   │   ├── security/             JWT filter, rate limiter, CORS config
│   │   ├── model/                MongoDB entities (User, ExpertProfile, CallRequest, ...)
│   │   ├── repository/           Spring Data MongoRepository interfaces
│   │   └── seed/                 DevDataSeeder, SeedRunner
│   └── Dockerfile                Multi-stage prod image
│
├── flyhigh-signaling-server/     Node.js Signaling Server
│   ├── server.js                  Local dev server (Socket.IO + raw WebSocket)
│   ├── lambda.js                  AWS Lambda handler (API Gateway WebSocket)
│   └── Dockerfile
│
├── infra/                        AWS CDK Infrastructure (TypeScript)
│   ├── bin/app.ts                CDK entry point
│   ├── lib/platform-stack.ts     Stateful resources (DynamoDB, Secrets)
│   ├── lib/app-stack.ts          Stateless per-env resources (Lambda, API Gateway, S3)
│   └── cdk.json                  Environment configs
│
├── docker-compose.yml            One-command local Docker setup
├── start-dev.ps1 / start-dev.sh  Local dev startup scripts
├── stop-dev.ps1                  Stop background jobs
├── CLAUDE.md                     Root project instructions
├── DEVELOPER_GUIDE.md            Comprehensive developer reference
└── PROJECT_UNDERSTANDING.md      Detailed architecture documentation
```

---

## Testing & Verification

```bash
# Backend
cd flyhigh-backend
./mvnw test

# Frontend
cd flyhigh-ui
npx tsc -b                     # Type check
npm run build                  # Production build

# Signaling
cd flyhigh-signaling-server
node -e "require('./server.js')" && echo "Syntax OK"
```

**Cross-service verification checklist:**
- [ ] Backend: `mvnw compile` passes
- [ ] Frontend: `npx tsc -b` passes
- [ ] Signaling: `node server.js` starts without errors
- [ ] All three services run simultaneously without port conflicts
- [ ] API calls from UI to backend succeed (CORS origins correct)
- [ ] WebSocket connections to signaling server succeed

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **"WebSocket connection failed"** | Start signaling server: `cd flyhigh-signaling-server && node server.js` |
| **"Could not resolve placeholder JWT_SECRET"** | Copy `.env.example` to `.env` and fill in required values |
| **"MongoSocketException"** | Check `MONGODB_URI` in `.env`; for Atlas, whitelist your IP in Network Access |
| **"401 Unauthorized"** | Check Axios `withCredentials: true`; clear browser cookies and re-login |
| **Port conflicts** | Ensure ports 5173, 8081, 5000 are free; check for orphaned processes |
| **"SnapStart not supported"** | Remove `snapStart` from CDK or deploy to `us-east-1` |

---

## Documentation

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) — Complete developer reference (environment, patterns, CI/CD)
- [PROJECT_UNDERSTANDING.md](PROJECT_UNDERSTANDING.md) — Detailed architecture and data flow
- [CLAUDE.md](CLAUDE.md) — Quick project reference and gotchas
- [flyhigh-backend/CLAUDE.md](flyhigh-backend/CLAUDE.md) — Backend-specific details
- [flyhigh-ui/CLAUDE.md](flyhigh-ui/CLAUDE.md) — Frontend-specific details
- [flyhigh-signaling-server/CLAUDE.md](flyhigh-signaling-server/CLAUDE.md) — Signaling-specific details

---

## License

Proprietary — all rights reserved.
