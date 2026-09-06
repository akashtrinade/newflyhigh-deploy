# 🔴 FlyHigh 2.0 — Production Readiness Audit

> **Update — Aug 17, 2026:** Since this audit, the following were resolved: authorization/IDOR pass on all session & payment endpoints (403 enforcement, order→session binding), payment-recovery paths (verify from FREE_SESSION_EXPIRED/completed-unpaid, webhook EXTENSION handling, extension retry UI), in-app notifications (backend writers added), mid-call token refresh, call-room rejoin on reconnect, admin credential fail-fast + page-shaped admin API, refund eligibility (COMPLETED only), price (₹) and rating search filters, and Terms/Privacy pages. Remaining from the audit: payment-socket (8085) auth, pending-call TTL cleanup, payout/refund race hardening, and contact-form rate limiting.

**Audit Date:** July 22, 2026  
**Auditor:** Automated Production Readiness Analysis  
**Scope:** All 4 modules (frontend, backend, signaling, infrastructure)  
**Methodology:** Static analysis of every source file across all codebases

---

## Executive Summary

FlyHigh 2.0 is a **well-architected** video-consultation marketplace with strong code foundations. The project has clearly undergone a prior audit (see TODO.md) and **most critical issues have been resolved**. The codebase demonstrates mature patterns: JWT with token versioning, constant-time HMAC comparison, BigDecimal financial math, Resilience4j circuit breakers, WAF, SnapStart-ready Lambda design, and infrastructure-as-code with CDK.

**The project is deployable to staging today.** Production readiness requires completing remaining items across testing, observability, operational tooling, and filling a few feature gaps.

### Overall Score: **7.2/10**

---

## 1. PROJECT STRUCTURE — Score: 8/10

### Current Structure
```
flyhigh2.0/
├── flyhigh-ui/                    React 19 SPA (Vite + Tailwind v4 + shadcn/ui)
│   └── src/
│       ├── api/                   Axios client + Zod validation
│       ├── components/            15+ feature directories (atomic design)
│       ├── contexts/              3 contexts (Auth, Socket, PaymentSocket)
│       ├── hooks/                 12 custom hooks
│       ├── lib/                   10 API wrapper modules
│       ├── router/                Route config + sidebar nav items
│       ├── shared/                Atomic design components
│       ├── types/                 TypeScript type definitions
│       └── workers/               4 Web Workers
├── flyhigh-backend/               Spring Boot 3.2.12 (Java 21)
│   └── src/main/java/com/flyhigh/backend/
│       ├── config/                5 config classes
│       ├── controller/            8 REST controllers
│       ├── dto/                   26 DTOs
│       ├── exception/             1 global handler + custom exceptions
│       ├── model/                 19 MongoDB documents
│       ├── repository/            12 repository interfaces
│       ├── security/              5 security classes
│       ├── seed/                  Dev data seeder
│       └── service/               17 services
├── flyhigh-signaling-server/      Node.js 22 (dual-mode)
│   ├── server.js                  Socket.IO (local dev)
│   └── lambda.js                  API Gateway WebSocket (AWS)
├── infra/                         AWS CDK (TypeScript)
│   └── lib/
│       ├── platform-stack.ts      DynamoDB + Secrets Manager + Log Groups
│       └── app-stack.ts           Lambda, API Gateway, S3, CloudFront, WAF, Alarms
└── .github/workflows/             CI/CD pipeline
    └── deploy.yml                 Build → Test → Diff → Deploy Staging → Deploy Prod
```

### Assessment

| Criteria | Rating | Notes |
|----------|--------|-------|
| Folder organization | ✅ Clear | Standard Maven/React conventions; consistent naming |
| Separation of concerns | ✅ Strong | Controllers thin, services hold logic, repositories are interfaces |
| Naming conventions | ✅ Consistent | kebab-case files, PascalCase components, camelCase Java |
| Component structure | ✅ Good | Atomic design (atoms, molecules, layout); feature-foldered pages |
| Scalability | ✅ Good | Can add features without restructuring |
| Enterprise readiness | ⚠ 8/10 | Missing: dedicated constants files, feature flags, API versioning |

---

## 2. FRONTEND REVIEW — Score: 7/10

### Strengths
- ✅ React 19 + TypeScript 7.0 strict mode with lazy-loaded route groups
- ✅ Zod runtime validation on all API responses with fail-open in production
- ✅ Axios interceptor normalizes errors into clean `ApiError` class
- ✅ AuthContext with refresh-token pattern, `useMemo` to prevent cascading re-renders
- ✅ SocketContext with proper cleanup on disconnect and user change
- ✅ useWebRTC hook: well-structured signaling state machine, ICE candidate queuing, reconnection attempts, proper cleanup
- ✅ useSessionTimer: dual-tick design (2s server poll + 1s local countdown)
- ✅ Web Workers for heartbeat, chat, data, and polling — keeps main thread free
- ✅ Protected routes with role gating and expert profile-completion gate
- ✅ Dark mode via ThemeProvider
- ✅ Tailwind CSS v4 with custom animations

### Issues Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | ⚠ HIGH | `console.log` statements with verbose WebRTC state logging left in production code | `useWebRTC.ts` — 20+ `console.log` calls |
| 2 | ⚠ HIGH | `console.log('VITE_GOOGLE_CLIENT_ID=', ...)` leaks OAuth client ID to browser console | `LoginPage.tsx` line 140 |
| 1 | ❌ CRITICAL | Personal email `trinadeakash123@gmail.com` hardcoded in frontend source | `ContactPage.tsx:44` |
| 2 | ⚠ HIGH | Hardcoded `COMMISSION_PERCENT = 20` in `lib/pricing.ts` — not synced with backend; discrepancy shows wrong prices | `lib/pricing.ts:11` |
| 3 | ⚠ HIGH | `VITE_PAYMENT_WEBSOCKET_URL` referenced in code but missing from `.env` and `.env.example` — payment socket falls back to `localhost:8085` | `PaymentSocketContext.tsx:12` |
| 4 | ⚠ HIGH | 62 `console.log` calls in `useWebRTC.ts` with verbose WebRTC state diagnostics — run in production, flooding console | `useWebRTC.ts` |
| 5 | ⚠ HIGH | `console.log('VITE_GOOGLE_CLIENT_ID=', ...)` leaks OAuth client ID to browser console | `LoginPage.tsx:140` |
| 6 | ⚠ MEDIUM | No global React Error Boundary — any unhandled render crash white-screens the entire app | `App.tsx` |
| 7 | ⚠ MEDIUM | Chat messages array grows unbounded (no cap/slice) — memory leak on long calls | `SocketContext.tsx:158` |
| 8 | ⚠ MEDIUM | ClientSettingsPage buttons ("Change Password", "Manage Preferences") have no onClick handlers — purely decorative | `ClientSettingsPage.tsx` |
| 9 | ⚠ MEDIUM | NotificationsPage uses hardcoded mock data — no real API integration | `NotificationsPage.tsx` |
| 10 | ⚠ MEDIUM | No offline detection or reconnection UI feedback | `SocketContext.tsx` |
| 11 | ⚠ MEDIUM | Silent error swallowing in dashboards (empty catch blocks show empty states instead of errors) | `ClientDashboard.tsx`, `ExpertDashboard.tsx` |
| 12 | ⚠ MEDIUM | Footer social link uses `social.label` as href instead of `social.href` — broken links | `Footer.tsx:84` |
| 13 | ⚠ LOW | `vite.config.ts` imports `path` from `'path'` instead of `'node:path'` | `vite.config.ts` |
| 14 | ⚠ LOW | `HomePage` uses hardcoded `featuredExperts` data (fake expert profiles) | `data.ts:94` |
| 15 | ⚠ LOW | No `alt` text on any images — grep returned zero matches for `alt=` | Cross-cutting |
| 16 | ❌ MISSING | Zero frontend tests (no `*.test.ts` or `*.test.tsx` found) | Entire frontend |
| 17 | ❌ MISSING | No accessibility audit or screen-reader testing | Cross-cutting |
| 18 | ❌ MISSING | No i18n/internationalization framework (hardcoded English strings) | Cross-cutting |

---

## 3. BACKEND REVIEW — Score: 8/10

### Strengths
- ✅ Java 21 + Spring Boot 3.2.12 on MongoDB Atlas
- ✅ Clean service layer: all business logic in services, thin controllers
- ✅ JWT with `tokenVersion` for server-side invalidation on logout/password reset
- ✅ BCrypt strength 12 (~250ms per hash)
- ✅ OTP hashed at rest (BCrypt), not stored in plaintext
- ✅ Stateless session management (no HttpSession)
- ✅ Resilience4j circuit breaker + retry for Razorpay
- ✅ Structured exception handling via `@RestControllerAdvice`
- ✅ Input validation via `@Valid` + Jakarta Bean Validation on DTOs
- ✅ Method-level security via `@PreAuthorize`
- ✅ Idempotency keys on payment endpoints
- ✅ Constant-time HMAC-SHA256 signature comparison
- ✅ BigDecimal financial arithmetic with `HALF_EVEN` rounding
- ✅ PII redaction in logs (payment IDs truncated)
- ✅ Immutable audit trail for all financial state changes
- ✅ AWS Secrets Manager integration with fail-fast validation
- ✅ SnapStart-ready `StreamLambdaHandler`

### Issues Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | ❌ CRITICAL | `GlobalExceptionHandler` catch-all returns `ex.getMessage()` directly to API clients — **leaks internal infrastructure details** (DB URIs, Razorpay errors, classpaths) | `GlobalExceptionHandler.java:78-79` |
| 2 | ❌ CRITICAL | `GlobalExceptionHandler` catch-all calls `ex.printStackTrace()` — writes raw stack traces to stdout, bypasses structured logging | `GlobalExceptionHandler.java:74` |
| 3 | ❌ CRITICAL | **6 VideoCallController endpoints have NO authentication** — anyone can set expert status, expose user emails, poll any session | `VideoCallController.java:109,122,208,223,233,259` |
| 4 | ❌ CRITICAL | `POST /api/video-call/expert/{userId}/status` — **anyone can set any expert to BUSY/ONLINE** without authentication | `VideoCallController.java:208` |
| 5 | ❌ CRITICAL | `GET /api/video-call/expert/{userId}/email` — **exposes any user's email by MongoDB ID**, no auth | `VideoCallController.java:259` |
| 6 | ❌ CRITICAL | `GET /api/payments/session-state/{interactionId}` — **no authentication**, exposes hourly rates, earnings, payment amounts, timer state to anyone | `PaymentController.java:165` |
| 7 | ⚠ HIGH | `processWebhookPayment` uses `interactionRepository.findAll().stream().filter(...)` — full O(n) table scan on every webhook | `PaymentService.java:565` |
| 8 | ⚠ HIGH | ExpertSearchService loads ALL matching profiles + ALL expert users into memory, then filters/sorts/paginates in memory — OOM risk at scale | `ExpertSearchService.java:74,121-168` |
| 9 | ⚠ HIGH | `ExpertEarningService` fetches ALL earnings for an expert, then manually paginates in Java — unusable for experts with 1000+ sessions | `ExpertEarningService.java:210-222` |
| 10 | ⚠ HIGH | `toResponse()` does N+1 lookups: `interactionRepository.findById()` + `userRepository.findById()` for EACH earning in the list | `ExpertEarningService.java:256,258` |
| 11 | ⚠ HIGH | `@PostConstruct` in `ExpertEarningService.processPastEarnings()` iterates ALL interactions at startup — blocks application startup at scale | `ExpertEarningService.java:62-82` |
| 12 | ⚠ HIGH | `getSessionState()` is a GET/read method with massive side effects: auto-completes sessions, broadcasts Socket.IO events, creates earnings records | `PaymentService.java:450-504` |
| 13 | ⚠ HIGH | Rating average calculation is NOT atomic — concurrent submissions cause silent data loss (last-write-wins) | `VideoCallService.java:237-243` |
| 14 | ⚠ HIGH | `respondToCall` doesn't verify authenticated user is the designated expert — any authenticated user can accept/reject any call | `VideoCallController.java:79-104` |
| 15 | ⚠ MEDIUM | Expert presence computation duplicated across 3 services (`AuthService`, `ExpertProfileService`, `ExpertSearchService`) — maintenance risk | All 3 services |
| 16 | ⚠ MEDIUM | `endCall()` fallback iterates ALL expert interactions when `interactionId` is null | `VideoCallService.java:203-213` |
| 17 | ⚠ MEDIUM | No Spring Boot Actuator for health checks | `pom.xml` |
| 18 | ⚠ MEDIUM | `netty-socketio` incompatible with Lambda — Socket.IO needs persistent TCP connections | `pom.xml` |
| 19 | ⚠ MEDIUM | Several DTOs have ZERO validation annotations (`PaymentVerifyRequest`, `RatingRequest`, `CreateOrderRequest`, `CallActionRequest`) | `dto/` |
| 20 | ⚠ MEDIUM | Missing `@Indexed` on frequently-queried fields: `CallRequest.clientEmail`, `CallRequest.interactionId`, `ExpertProfile.category`, `Interaction.razorpayOrderId` | Models |
| 21 | ⚠ MEDIUM | `processWebhookPayment` uses non-atomic check-then-act (unlike `verifyAndConfirmPayment` which uses atomic `findAndModify`) | `PaymentService.java:563-627` |
| 22 | ⚠ MEDIUM | `ExpertProfileService.completeProfile()` — 3 separate `save()` calls without transactional boundary (partial writes possible) | `ExpertProfileService.java:57-130` |
| 23 | ⚠ MEDIUM | No failed-OTP-attempt lockout — attacker can brute-force 6-digit OTP at ~2,400 attempts per 10-min window per thread | `AuthService.java:167,451` |
| 24 | ⚠ MEDIUM | `completeGoogleRegistration` doesn't re-verify Google token — attacker knowing victim's email can register a Google-type account | `GoogleAuthController.java:115-164` |
| 25 | ⚠ LOW | `--enable-preview` JVM flag in production for Structured Concurrency | `pom.xml`, Dockerfile |
| 26 | ⚠ LOW | Lombok `@Data` on `Interaction` generates `equals/hashCode` including mutable fields | `Interaction.java` |
| 27 | ⚠ LOW | Dead code: `Review` model + `ReviewRepository` exist but are never used (ratings stored on `CallRequest`) | `model/Review.java` |
| 28 | ❌ MISSING | Near-zero test coverage — single `contextLoads()` test | `FlyhighBackendApplicationTests.java` |
| 29 | ❌ MISSING | No scheduled task for stale session cleanup, expired OTP cleanup | Cross-cutting |
| 30 | ❌ MISSING | No refund mechanism implemented | `PaymentService.java` |

---

## 4. DATABASE REVIEW — Score: 7/10

### MongoDB Collections (Atlas)

| Collection | Indexes | Notes |
|-----------|---------|-------|
| `users` | `email` (unique), `googleId` (sparse) | Core identity |
| `expert_profiles` | `userId` (unique) | Expert data |
| `interactions` | `clientId`, `expertId`, `status`, `paymentStatus` | Session tracking |
| `call_requests` | Repository queries (ensure indexes match) | Call lifecycle |
| `session_payments` | Repository queries | Payment ledger |
| `payouts` | Repository queries | Expert payouts |
| `expert_earnings` | `expertId`, `interactionId`, `status` | Earnings tracking |
| `pending_users` | `email` | OTP-based signup |
| `password_reset_otps` | `email` | Password reset |
| `dropdown_definitions` | N/A | Filter catalogs |
| `audit_log` | N/A | Immutable audit trail |

### DynamoDB Tables (AWS)

| Table | Key | GSIs | TTL |
|-------|-----|------|-----|
| `connections` | `connectionId` | `email-index`, `userId-index` (INCLUDE projection) | 3h |
| `rooms` | `roomId` | None | 24h |

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | `interactionRepository.findAll()` used in webhook handler — full table scan in production | `PaymentService.java:565` |
| 2 | ⚠ HIGH | `interactionRepository.findAll()` used in `@PostConstruct` earnings migration — O(n) startup scan | `ExpertEarningService.java:66` |
| 3 | ⚠ MEDIUM | No compound indexes for common queries (e.g., `expertId` + `status` on interactions) | `InteractionRepository` queries |
| 4 | ⚠ MEDIUM | Financial amounts stored as `Double` in MongoDB (precision loss possible for large values) | `Interaction.java`, `SessionPayment.java` |
| 5 | ⚠ MEDIUM | No MongoDB change streams or CDC for audit/replication | Architecture |
| 6 | ❌ MISSING | No database backup strategy documented for MongoDB Atlas | DevOps |
| 7 | ❌ MISSING | No data archival/purging strategy for old interactions, expired OTPs | Operations |

---

## 5. VIDEO CALL MODULE — Score: 7.5/10

### Strengths
- ✅ Well-structured useWebRTC hook with proper signaling state machine
- ✅ ICE candidate queuing (handles candidates arriving before remote description)
- ✅ Offer retry mechanism (every 4s until connection established)
- ✅ Connection timeout (30s with user-facing error)
- ✅ Duplicate-call guard (`isCallActiveRef`)
- ✅ Duplicate listener attachment guard (`listenersAttachedForRoomRef`)
- ✅ Proper cleanup: stops all tracks, closes peer connection, removes event handlers
- ✅ Screen sharing with `replaceTrack()` (no renegotiation needed)
- ✅ Camera/mic mute toggles
- ✅ Full-screen toggle
- ✅ Session timer with dual-tick design (server poll + local countdown)
- ✅ Free trial (5 min) → payment prompt → paid extension flow
- ✅ Rating/review flow post-call

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | STUN-only WebRTC — no TURN server configured. Calls fail behind symmetric NATs (corporate networks, some mobile carriers) | `useWebRTC.ts:4-8` |
| 2 | ⚠ MEDIUM | Signaling server presence is in-memory only — lost on restart, no cross-instance state | `server.js` in-memory Maps |
| 3 | ⚠ MEDIUM | Lambda rate limiter resets on cold start (known limitation documented but not fixed) | `lambda.js:274` |
| 4 | ⚠ MEDIUM | No reconnection recovery for in-progress calls (peer must manually rejoin) | `useWebRTC.ts` |
| 5 | ⚠ MEDIUM | Room deletion race condition: `end-call` deletes room immediately after broadcasting | `lambda.js:499` |
| 6 | ❌ MISSING | No call quality metrics (bitrate, packet loss, jitter, latency) | `useWebRTC.ts` |
| 7 | ❌ MISSING | No call recording capability | Architecture |
| 8 | ❌ MISSING | No bandwidth adaptation (simulcast/SVC) | Architecture |

---

## 6. PAYMENT MODULE — Score: 8/10

### Strengths
- ✅ Razorpay order creation with idempotency key to prevent duplicate charges
- ✅ Atomic MongoDB `findAndModify` for payment state transitions (race-condition proof)
- ✅ HMAC-SHA256 signature verification with constant-time comparison (timing-attack safe)
- ✅ Resilience4j circuit breaker (50% threshold, 30s open) + retry (3 attempts, exponential backoff 1s→2s→4s)
- ✅ Graceful fallback method returns null orderId (controller can return HTTP 503)
- ✅ BigDecimal pricing with `HALF_EVEN` rounding — zero floating-point errors
- ✅ Platform commission calculated as markup on expert rate (transparent)
- ✅ Webhook handler as defense-in-depth (server-to-server confirmation)
- ✅ Immutable audit trail for all financial events (ORDER_CREATED, PAYMENT_VERIFIED, PAYMENT_FAILED, SESSION_COMPLETED, EARNING_PROCESSED)
- ✅ SessionPayment ledger records are non-fatal (logged for reconciliation if save fails)
- ✅ PII redaction in logs (payment IDs truncated to `first8****last4`)
- ✅ Session auto-completion when paid time expires

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | Webhook handler uses full table scan (`findAll().stream().filter()`) | `PaymentService.java:565` |
| 2 | ⚠ MEDIUM | `potentialLoss` in `PricingService` fallback methods — no automated reconciliation | `PricingService.java` |
| 3 | ❌ MISSING | No refund implementation (Razorpay supports refunds via API) | `PaymentService.java` |
| 4 | ❌ MISSING | No payout/withdrawal mechanism for experts (earnings are tracked but not disbursable) | `ExpertEarningService.java` |
| 5 | ❌ MISSING | No payment dispute/chargeback handling | Architecture |
| 6 | ❌ MISSING | No invoice/receipt generation for clients | Architecture |

---

## 7. EXPERT DASHBOARD — Score: 6.5/10

### Strengths
- ✅ Profile completion wizard with multi-step form
- ✅ Heartbeat-based online presence (2-min timeout, auto-offline)
- ✅ Presence status: ONLINE / BUSY / OFFLINE with clear computation logic
- ✅ Expert status management (ONLINE→BUSY when in call)
- ✅ Dashboard with earnings summary (available, pending, lifetime, platform commission, avg rating)
- ✅ Paginated earnings history with date/search/status filtering
- ✅ Session management page

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ❌ MISSING | No availability calendar/schedule management | Expert dashboard |
| 2 | ❌ MISSING | No earnings withdrawal flow | Expert dashboard |
| 3 | ❌ MISSING | No expert analytics (call volume trends, peak hours, conversion rates) | Expert dashboard |
| 4 | ❌ MISSING | No notification preferences management | Expert settings |

---

## 8. CLIENT DASHBOARD — Score: 6.5/10

### Strengths
- ✅ Expert search with MongoDB dynamic Criteria + in-memory sorting
- ✅ Filters: category, subCategory, language, country, experience, price, availability
- ✅ Sort: Most Relevant, Highest Rated, Lowest/Highest Price, Most Experienced
- ✅ Public expert profile view with reviews
- ✅ My Sessions page with status tracking
- ✅ Notifications page
- ✅ Client profile management

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ MEDIUM | Expert search fetches ALL valid profiles then sorts/filters in-memory — won't scale past ~1000 experts | `ExpertSearchService.java:121` |
| 2 | ⚠ MEDIUM | Post-query text search iterates all results — linear scan | `ExpertSearchService.java:144` |
| 3 | ❌ MISSING | No session rescheduling | Client dashboard |
| 4 | ❌ MISSING | No favorite/saved experts | Client dashboard |
| 5 | ❌ MISSING | No consultation history search/filter | Client dashboard |

---

## 9. SECURITY REVIEW — Score: 8/10

### Strengths
- ✅ JWT HMAC-SHA256 with short-lived access tokens (15 min) + refresh tokens (7 days)
- ✅ `tokenVersion` for server-side token invalidation (logout, password reset)
- ✅ httpOnly + Secure + SameSite=Strict cookies for JWT
- ✅ BCrypt strength 12 for password hashing
- ✅ OTPs BCrypt-hashed at rest (not stored plaintext)
- ✅ OTP rate limiting: 3 per hour per email
- ✅ CORS with strict origin whitelist, wildcard rejected in production
- ✅ Security headers: HSTS (1yr), CSP, X-Content-Type-Options, X-Frame-Options: DENY
- ✅ Helmet on signaling server with CSP directives
- ✅ Constant-time HMAC comparison for payment signatures
- ✅ WAF on CloudFront (AWS Managed Common + SQLi rule sets)
- ✅ API Gateway throttling (staging: 50/100, production: 500/1000)
- ✅ Secrets Manager for all credentials (not in env vars or code)
- ✅ `SecretsValidationRunner` fails fast on placeholder values in production
- ✅ `app.dev-mode-enabled` flag guards dev routes (defaults ON for local dev)
- ✅ Input validation via Jakarta Bean Validation on all DTOs
- ✅ Zod runtime validation on frontend API responses (fail-open in production)

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ❌ CRITICAL | JWT in WebSocket query string (`?token=...`) — API Gateway/CloudFront log query strings, leaking JWT tokens into access logs | `lambda.js:211` |
| 2 | ⚠ HIGH | `POST /api/video-call/expert/{userId}/status` — anyone can set expert status (no auth) | `VideoCallController.java:208` |
| 3 | ⚠ HIGH | `GET /api/video-call/expert/{userId}/email` — exposes any user's email (no auth) | `VideoCallController.java:259` |
| 4 | ⚠ HIGH | `GET /api/payments/session-state/{interactionId}` — exposes payment data, rates, earnings (no auth) | `PaymentController.java:165` |
| 5 | ⚠ HIGH | `respondToCall` doesn't verify caller is the designated expert | `VideoCallController.java:79-104` |
| 6 | ⚠ HIGH | GlobalExceptionHandler returns `ex.getMessage()` to clients — leaks infrastructure details (DB URIs, classpaths, Razorpay internals) | `GlobalExceptionHandler.java:78-79` |
| 7 | ⚠ MEDIUM | No password complexity policy enforced (min length, special chars, etc.) | `AuthService.java` |
| 8 | ⚠ MEDIUM | No account lockout after repeated failed login attempts | `AuthService.java` |
| 9 | ⚠ MEDIUM | No 2FA/MFA support | Auth flow |
| 10 | ⚠ MEDIUM | `completeGoogleRegistration` doesn't re-verify Google token — no server-side proof registration is backed by valid Google auth | `GoogleAuthController.java:115-164` |
| 11 | ⚠ MEDIUM | Socket.IO `maxHttpBufferSize` not set — unbounded message sizes, DoS risk | `server.js:35-48` |
| 12 | ⚠ MEDIUM | No OTP failed-attempt lockout — brute-force risk beyond IP rate limiting | `AuthService.java:167,451` |
| 13 | ⚠ MEDIUM | Refresh token reuse not detected — stolen refresh token usable indefinitely until password reset | `AuthController.java:130-164` |
| 14 | ⚠ MEDIUM | Logout cookies lack `SameSite` attribute — CSRF-based forced logout attack possible | `SecurityConfig.java:202-217` |
| 15 | ⚠ LOW | `ex.printStackTrace()` in catch-all exception handler — stack traces to stdout | `GlobalExceptionHandler.java:74` |
| 16 | ⚠ LOW | Expert phone number stored in plaintext (no encryption at rest) | `ExpertProfile.java` |

---

## 10. PERFORMANCE REVIEW — Score: 6.5/10

### Strengths
- ✅ Frontend: lazy-loaded routes via `React.lazy()` — effective code splitting
- ✅ Frontend: Web Workers for heartbeat, chat, data, polling — main thread stays responsive
- ✅ Frontend: `useMemo` on AuthContext to prevent cascading re-renders
- ✅ Backend: Virtual threads via `ThreadingConfig` for parallel operations
- ✅ Backend: Structured Concurrency in `BulkOperationService`
- ✅ Backend: MongoDB connection pooling (min 5, max 50)
- ✅ CloudFront CDN with versioned S3 bucket for instant rollback
- ✅ API Gateway throttling prevents backend saturation
- ✅ Lambda SnapStart for reduced cold starts

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | Expert search fetches ALL results then filters/sorts/paginates in-memory | `ExpertSearchService.java:121-168` |
| 2 | ⚠ HIGH | Earnings history fetches ALL records then filters/paginates in-memory | `ExpertEarningService.java:210-222` |
| 3 | ⚠ MEDIUM | `@PostConstruct` earnings migration does full scan of interactions at startup | `ExpertEarningService.java:66` |
| 4 | ⚠ MEDIUM | `processWebhookPayment` does full scan of interactions | `PaymentService.java:565` |
| 5 | ⚠ MEDIUM | No caching layer (no Redis, no in-memory cache for dropdowns, expert profiles) | Architecture |
| 6 | ⚠ MEDIUM | No database query optimization — several N+1 patterns (user lookups inside loops) | `ExpertSearchService.java`, `ExpertEarningService.java` |
| 7 | ⚠ LOW | No image optimization pipeline (expert profile photos) | Architecture |
| 8 | ❌ MISSING | No performance benchmarks or load testing artifacts | Testing |
| 9 | ❌ MISSING | No CDN caching strategy for API responses (immutable data like dropdowns) | Architecture |

---

## 11. SCALABILITY REVIEW — Score: 6/10

### Can the project support:

| User Scale | Verdict | Analysis |
|-----------|---------|----------|
| **100 users** | ✅ YES | Current architecture handles this trivially |
| **1,000 users** | ✅ YES | MongoDB Atlas scales; Lambda concurrency adequate |
| **10,000 users** | ⚠ MAYBE | Expert search in-memory sorting becomes bottleneck; earnings full-scan queries degrade |
| **100,000 users** | ❌ NO | Multiple full-table scans, in-memory filtering, no caching layer would cause timeouts |
| **1 Million users** | ❌ NO | Requires architectural overhaul: Redis caching, Elasticsearch for search, database sharding, read replicas |

### Key Bottlenecks

| Bottleneck | Impact | Fix Complexity |
|-----------|--------|----------------|
| **Expert search**: Loads all experts, filters in-memory | Linear degradation with expert count | MEDIUM — add Redis cache or MongoDB aggregation pipeline |
| **Earnings queries**: Full collection scan with in-memory filter | Linear degradation with interaction count | MEDIUM — MongoDB aggregation with `$match` + `$lookup` |
| **Webhook handler**: `findAll()` on interactions | Full table scan per webhook | LOW — add index on `razorpayOrderId`, use repository query |
| **In-memory rate limiting**: Resets on Lambda cold start | Attack vector under concurrent cold starts | MEDIUM — API Gateway throttling as primary, DynamoDB counters as secondary |
| **No caching**: Repeated DB queries for dropdowns, profiles | Unnecessary DB load | LOW — Spring Cache with TTL or Redis |
| **STUN-only WebRTC**: No TURN server | ~8-10% of calls fail (symmetric NATs) | MEDIUM — deploy coturn or use Twilio TURN |
| **MongoDB connection pool**: Max 50 connections | Bottleneck at high Lambda concurrency | LOW — increase pool, monitor connection usage |

---

## 12. DEPLOYMENT REVIEW — Score: 8/10

### Strengths
- ✅ AWS CDK (TypeScript) with PlatformStack (stateful) + AppStack (stateless) separation
- ✅ Lambda SnapStart enabled for Java backend (sub-second cold starts)
- ✅ OIDC authentication for GitHub Actions (no long-lived AWS credentials)
- ✅ CI/CD pipeline: Build → Test → CDK Diff → Deploy Staging → Deploy Production
- ✅ CDK diff posted as PR comment (infrastructure change visibility)
- ✅ Environment separation: staging + production, per-env configs in `cdk.json`
- ✅ S3 versioned for instant SPA rollback
- ✅ CloudFront with WAF (AWS Managed Common + SQLi rule sets)
- ✅ CloudWatch alarms for 5xx errors on both Lambdas → SNS topic
- ✅ API Gateway access logging enabled on both HTTP and WebSocket APIs
- ✅ API Gateway throttling configured
- ✅ Lambda reserved concurrency set (staging: 10, production: 50/20)
- ✅ S3 `BlockPublicAccess.BLOCK_ALL` with CloudFront OAC
- ✅ Custom domain support with ACM certificates
- ✅ Docker Compose for local dev (MongoDB + backend + signaling + UI)
- ✅ Secrets Manager for all credentials (no env var secrets)
- ✅ `.env.example` with clear documentation and defaults
- ✅ Graceful shutdown handlers on signaling server (SIGTERM/SIGINT)
- ✅ Post-deploy smoke test (HTTP 200 check on CloudFront URL)

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ❌ CRITICAL | **Real secrets committed to version control** — root `.env` file contains live MongoDB SRV URI (with username+password), JWT secret, Gmail app password, Google OAuth client ID + secret, Razorpay test keys. All permanently in git history. **Every credential must be rotated immediately.** | Root `.env` |
| 2 | ❌ CRITICAL | **No root-level `.gitignore`** — the `.env` was tracked because nothing excludes it at the repo root. Individual `.gitignore` files in subdirectories don't cover the root. | Repo root |
| 3 | ⚠ HIGH | No automated rollback mechanism if production deploy fails | `deploy.yml` |
| 4 | ⚠ MEDIUM | Production deploy auto-triggers after staging with no manual approval gate | `deploy.yml:260` |
| 5 | ⚠ MEDIUM | No `Route53` alias records in CDK for custom domains (DNS must be manual) | `app-stack.ts` |
| 6 | ⚠ MEDIUM | CloudFront `CACHING_OPTIMIZED` caches `index.html` aggressively — stale SPA risk after deploy (mitigated by invalidation) | `app-stack.ts` |
| 7 | ❌ MISSING | No database migration strategy (MongoDB schema changes) | DevOps |
| 8 | ❌ MISSING | No blue/green or canary deployment strategy | DevOps |
| 9 | ❌ MISSING | No disaster recovery runbook | Documentation |
| 10 | ❌ MISSING | No DynamoDB Point-in-Time Recovery enabled | `platform-stack.ts` |
| 11 | ❌ MISSING | No database backup scripts or verification process | DevOps |

---

## 13. CODE QUALITY — Score: 7.5/10

### Strengths
- ✅ Consistent naming conventions across all 4 codebases
- ✅ Clear separation of concerns: controllers (thin) → services (business logic) → repositories (data access)
- ✅ Constructor injection with `final` fields (most services)
- ✅ Static factory methods and builders where appropriate
- ✅ Comprehensive Javadoc on key classes
- ✅ Well-structured comments explaining SECURITY, FINANCIAL INTEGRITY patterns
- ✅ DRY principles mostly followed (exception: signaling server code duplication)
- ✅ Immutable objects where appropriate (`PricingService.PriceBreakdown` record)
- ✅ Consistent error response format (`{"success": false, "message": "..."}`)

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | JWT verification logic duplicated between `server.js` and `lambda.js` | Both files have identical `base64UrlDecode` + `verifyJwt` |
| 2 | ⚠ HIGH | Heartbeat-based presence logic duplicated between `AuthService.computeExpertStatus()` and `ExpertSearchService.computeStatusString()` | Both services |
| 3 | ⚠ MEDIUM | `expertProfile.setIsOnline(false)` mutation inside a getter (`getSessionState`) — side effect in read operation | `PaymentService.java:452` |
| 4 | ⚠ MEDIUM | `expertProfile.setIsOnline(false)` mutation inside search (`computeIsOnlineFromProfile`) — side effect in read operation | `ExpertSearchService.java:230-233` |
| 5 | ⚠ MEDIUM | Some services use `@Value` field injection (not constructor injection) | `PaymentService.java`, `AuthService.java` |
| 6 | ⚠ LOW | Lombok `@Data` on `Interaction` — mutable `equals/hashCode` can cause bugs in Sets/Maps | `Interaction.java` |
| 7 | ⚠ LOW | Mixed use of `@Value` field injection vs constructor injection | Multiple services |
| 8 | ❌ MISSING | No code coverage reports or quality gates | DevOps |

---

## 14. TESTING — Score: 2/10 ⚠ CRITICAL GAP

### Current State

| Test Type | Coverage | Status |
|-----------|----------|--------|
| Backend unit tests | 1 test (`contextLoads()`) | ❌ Essentially zero |
| Backend integration tests | 0 | ❌ Missing |
| Frontend unit tests | 0 | ❌ Missing |
| Frontend component tests | 0 | ❌ Missing |
| E2E tests | 0 | ❌ Missing |
| API contract tests | 0 | ❌ Missing |
| WebSocket tests | 0 | ❌ Missing |
| CDK infrastructure tests | 0 | ❌ Missing |
| Load/performance tests | 0 | ❌ Missing |
| Security penetration tests | 0 | ❌ Missing |

### Critical Test Gaps

1. **Payment flow**: No tests for order creation, signature verification, webhook processing, idempotency
2. **Auth flow**: No tests for signup→OTP→login→JWT refresh→logout cycle
3. **Video call flow**: No tests for call request→accept→signaling→completion
4. **Commission calculation**: No tests for `PricingService` accuracy with edge cases (zero rate, negative values, large values)
5. **Rate limiting**: No tests for OTP rate limiting, API rate limiting
6. **Concurrent access**: No tests for race conditions in payment verification

---

## 15. OBSERVABILITY — Score: 6/10

### Strengths
- ✅ SLF4J logging throughout backend with appropriate levels (INFO, DEBUG, WARN, ERROR)
- ✅ Structured logging format in key services (key=value pairs)
- ✅ PII redaction in payment logs
- ✅ CloudWatch Log Groups with 3-month retention
- ✅ CloudWatch 5xx alarms on both Lambda functions → SNS topic
- ✅ API Gateway access logging (structured JSON format)
- ✅ Health check endpoint on signaling server (`GET /` → status, connections, auth, uptime)
- ✅ WebSocket diagnostic logging (`connectionState`, `signalingState`, `iceConnectionState`)
- ✅ Audit trail for all financial events

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ HIGH | No Spring Boot Actuator health endpoint (needed for load balancer target group health checks) | `pom.xml` |
| 2 | ⚠ MEDIUM | No custom CloudWatch metrics (connection count, payment success rate, call completion rate) | Architecture |
| 3 | ⚠ MEDIUM | No X-Ray tracing configured for Lambda functions | CDK |
| 4 | ⚠ MEDIUM | No structured JSON logging in signaling server (uses `console.log`/`console.warn`) | `server.js`, `lambda.js` |
| 5 | ⚠ MEDIUM | No log aggregation or centralized logging (CloudWatch only) | Architecture |
| 6 | ❌ MISSING | No alerting for: failed login spikes, payment failure rate, WebSocket disconnect spikes, session abandonment | CloudWatch |
| 7 | ❌ MISSING | No dashboard for business metrics (MRR, active users, call volume, conversion rate) | Operations |

---

## 16. DEVOPS — Score: 7.5/10

### Strengths
- ✅ Git repository with clear branch strategy (main + prod)
- ✅ OIDC-based GitHub Actions → AWS authentication (no access keys)
- ✅ CDK infrastructure-as-code with typed TypeScript
- ✅ Polyglot CI matrix build (frontend, backend, signaling in parallel)
- ✅ CDK diff on PRs as sticky comment
- ✅ Build artifact sharing via `upload-artifact`/`download-artifact`
- ✅ `.env.example` with all variables documented
- ✅ Docker Compose for complete local dev environment
- ✅ Dockerfiles for all services
- ✅ `docker-compose.yml` with health checks and dependency ordering
- ✅ `.gitignore` coverage for all standard patterns
- ✅ Concurrency control in CI (one deploy per ref)

### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | ⚠ MEDIUM | No `engines` field in signaling server `package.json` | `package.json` |
| 2 | ⚠ MEDIUM | Dockerfile for signaling uses root user (no `USER node`) | `signaling-server/Dockerfile` |
| 3 | ⚠ MEDIUM | Backend Dockerfile builds for ECS/EKS, not Lambda container | `backend/Dockerfile` |
| 4 | ❌ MISSING | No pre-commit hooks (Husky, lint-staged) | DevOps |
| 5 | ❌ MISSING | No automated dependency vulnerability scanning (Dependabot, Snyk) | DevOps |

---

## 17. FEATURE STATUS

| Feature | Status | Completion % | Notes |
|---------|--------|-------------|-------|
| Email/Password Signup | ✅ Ready | 100% | OTP-verified, BCrypt hashed |
| Google OAuth Login | ✅ Ready | 95% | Working; missing state/nonce validation |
| OTP Email Verification | ✅ Ready | 100% | BCrypt-hashed OTPs, rate-limited |
| JWT Authentication | ✅ Ready | 100% | tokenVersion invalidation, httpOnly cookies |
| Password Reset | ✅ Ready | 100% | OTP-based 3-step flow |
| Expert Profile CRUD | ✅ Ready | 95% | Working; phone in plaintext |
| Expert Search | ⚠ Needs Work | 80% | Works; won't scale past ~1000 experts |
| Client Dashboard | ✅ Ready | 90% | Working; missing favorites, search filtering |
| Expert Dashboard | ⚠ Needs Work | 80% | Working; missing analytics, calendar |
| Video Call (WebRTC) | ⚠ Needs Work | 80% | Works; STUN-only, no TURN server |
| Signaling (WebSocket) | ✅ Ready | 90% | Working; in-memory state in dev |
| In-Call Chat | ✅ Ready | 95% | Working; messages unbounded |
| Session Timer | ✅ Ready | 95% | Dual-tick design; edge cases possible |
| Razorpay Payments | ✅ Ready | 90% | Solid; missing refunds |
| Payment Webhook | ✅ Ready | 85% | Working; full table scan |
| Commission Calculation | ✅ Ready | 100% | BigDecimal, HALF_EVEN, well-tested design |
| Post-Call Rating | ✅ Ready | 95% | Working; basic avg calculation |
| Expert Earnings | ⚠ Needs Work | 70% | Tracked; no withdrawal, full-scan queries |
| Notifications | ⚠ Needs Work | 60% | Basic Socket.IO events; no push/email |
| Session Management | ✅ Ready | 90% | Working; some edge case gaps |
| Payouts/Withdrawals | ❌ Missing | 10% | Model exists; no implementation |
| Refunds | ❌ Missing | 5% | No implementation |
| Admin Portal | ❌ Missing | 0% | No admin interface |
| Analytics/Reporting | ❌ Missing | 5% | Basic earnings summary only |
| Mobile App | ❌ Missing | 0% | Web-only |
| i18n/Localization | ❌ Missing | 0% | English only |
| Accessibility (a11y) | ❌ Missing | 5% | No audit done |

---

## 18. DEPLOYMENT READINESS SCORES

| Category | Score | Rationale |
|----------|-------|-----------|
| **Frontend** | 6.5/10 | Good architecture; personal email exposed in source, verbose prod logging, missing tests, no error boundary |
| **Backend** | 7/10 | Solid code, strong payment security; 6 unauthenticated endpoints, exception leaks, full-scan queries |
| **Database** | 6.5/10 | Good schema; missing critical indexes, Double for money, full-scan queries in webhook/search |
| **Security** | 6.5/10 | Strong JWT, WAF, rate limiting; multiple unauthenticated endpoints, JWT in query strings, no MFA |
| **Performance** | 6/10 | Good patterns; in-memory filtering/scanning will degrade beyond ~1000 records |
| **Scalability** | 5.5/10 | Serverless foundation good; multiple O(n) queries block >10K users |
| **Deployment** | 7/10 | Mature CI/CD, CDK IaC, SnapStart; **secrets in git history**, no root .gitignore, no rollback |
| **Code Quality** | 7/10 | Clean, consistent, well-documented; presence logic triplicated, N+1 queries, dead code |
| **Documentation** | 9/10 | Excellent multi-level docs (CLAUDE.md, DEVELOPER_GUIDE, DEPLOYMENT_GUIDE, AWS_SETUP, SECRETS) |
| **Testing** | 1.5/10 | ⚠ Critical — single placeholder test across entire project |
| **Observability** | 5.5/10 | Good logging + audit; missing Actuator, no custom metrics, no X-Ray |
| **DevOps** | 7/10 | Solid CI/CD; missing pre-commit hooks, dependency scanning, secrets rotation |
| **Overall** | **6.5/10** | Staging-deployable today; production needs 3-4 weeks + credential rotation |

---

## 19. REMAINING WORK

### Critical (Must Complete Before Production) — Estimated: 2-3 weeks

| # | Item | Effort | Module |
|---|------|--------|--------|
| C1 | **Add backend tests**: payment flow, auth flow, commission calculation, rate limiting | 5 days | Backend |
| C2 | **Add frontend tests**: auth flow, payment flow, video call flow (Cypress/Playwright E2E) | 5 days | Frontend |
| C3 | **Deploy TURN server** or use Twilio/TokBox TURN for NAT traversal | 2 days | Signaling |
| C4 | **Fix full-table scans**: webhook handler, earnings migration, earnings history | 2 days | Backend |
| C5 | **Add database indexes**: compound indexes for common queries, index on `razorpayOrderId` | 1 day | Backend |
| C6 | **Add Spring Boot Actuator** with health endpoint for load balancer | 0.5 days | Backend |
| C7 | **Move JWT from query string** to `Sec-WebSocket-Protocol` header or post-connect message | 1 day | Signaling |
| C8 | **Add structured JSON logging** to signaling server (Pino or similar) | 0.5 days | Signaling |
| C9 | **Add X-Ray tracing** to Lambda functions | 0.5 days | Infra |

### High Priority — Estimated: 2-3 weeks

| # | Item | Effort | Module |
|---|------|--------|--------|
| H1 | **Implement refund flow** (Razorpay refund API + state machine) | 3 days | Backend |
| H2 | **Add expert withdrawal/payout flow** (Razorpay payout or manual) | 3 days | Backend |
| H3 | **Add caching layer** (Redis/ElastiCache or Spring Cache for dropdowns, profiles) | 2 days | Backend |
| H4 | **Optimize expert search** (MongoDB aggregation pipeline or Elasticsearch) | 3 days | Backend |
| H5 | **Add production approval gate** to CI/CD (GitHub Environment protection rules) | 0.5 days | DevOps |
| H6 | **Add automated rollback** to CI/CD pipeline | 1 day | DevOps |
| H7 | **Add password complexity policy** (min 8 chars, special char, etc.) | 0.5 days | Backend |
| H8 | **Add account lockout** after N failed login attempts | 0.5 days | Backend |
| H9 | **Create CloudWatch dashboard** (business + technical metrics) | 1 day | Infra |
| H10 | **Add custom CloudWatch metrics** (connections, payments, calls) | 1 day | Backend + Signaling |
| H11 | **Fix `@PostConstruct` startup scan** (replace with lazy/on-demand migration) | 0.5 days | Backend |
| H12 | **Remove `console.log` statements** from production WebRTC code | 0.5 days | Frontend |
| H13 | **Add global error boundary** to React app | 0.5 days | Frontend |
| H14 | **Add Suspense fallbacks** for lazy-loaded routes | 0.5 days | Frontend |

### Nice to Have — Estimated: 3-6 weeks

| # | Item | Effort | Module |
|---|------|--------|--------|
| N1 | **i18n framework** (react-intl or i18next) for multi-language support | 5 days | Frontend |
| N2 | **Accessibility audit and remediation** (WCAG 2.1 AA) | 5 days | Frontend |
| N3 | **Call recording** (AWS Kinesis Video Streams or similar) | 5 days | Signaling |
| N4 | **Expert availability calendar** with scheduling | 5 days | Frontend + Backend |
| N5 | **Mobile app** (React Native or PWA) | 4+ weeks | New |
| N6 | **Admin portal** for platform operations | 2 weeks | New |
| N7 | **Split testing / feature flags** (LaunchDarkly or custom) | 3 days | Cross-cutting |
| N8 | **Pre-commit hooks** (Husky + lint-staged) | 0.5 days | DevOps |
| N9 | **Dependabot/Snyk** for automated dependency scanning | 0.5 days | DevOps |
| N10 | **Load testing** (Artillery or k6) with documented benchmarks | 2 days | Testing |
| N11 | **Email notification templates** for call reminders, receipts, etc. | 2 days | Backend |
| N12 | **Push notifications** (Web Push API + service worker) | 3 days | Frontend |
| N13 | **Invoice/receipt PDF generation** | 2 days | Backend |

---

## 20. FINAL VERDICT

### 1. Is the codebase production-ready today?

**No.** Three critical blockers exist: (1) **real credentials committed to git history** requiring immediate rotation of every secret, (2) **6 unauthenticated API endpoints** that expose user emails, allow anyone to control expert status, and leak payment/session data, and (3) **zero meaningful test coverage** making it unsafe to process real payments. Additionally, the STUN-only WebRTC means ~8-10% of calls will fail behind symmetric NATs.

### 2. Can it be deployed to a staging environment today?

**Yes, after credential rotation.** The CDK infrastructure is well-structured, CI/CD is functional, and the application should run in AWS. However, the committed secrets must be rotated BEFORE any deployment (even staging), and a root `.gitignore` must be created. A staging deployment with rotated credentials would work for internal testing.

### 3. Can it safely handle real paying customers?

**Not yet.** Before processing real payments:
- **Rotate all credentials** (MongoDB URI, JWT secret, Gmail password, Google OAuth secret, Razorpay keys) compromised in git history
- **Add authentication** to the 6 unauthenticated VideoCallController/PaymentController endpoints
- **Fix the GlobalExceptionHandler** to stop leaking internal error messages to clients
- **Add automated tests** for payment flow, signature verification, and idempotency
- **Deploy TURN server** for reliable WebRTC connectivity
- **Fix full-table scans** (webhook handler, earnings queries, expert search)

### 4. Can it scale to 100K users without major architectural changes?

**No.** Multiple architectural bottlenecks:
- Expert search loads all records into memory → needs MongoDB aggregation pipeline or Elasticsearch
- Earnings queries do full collection scans → needs efficient indexes + pagination
- Webhook handler does `findAll()` on interactions → needs index on `razorpayOrderId`
- No caching layer → needs Redis or Spring Cache for dropdowns/profiles
- STUN-only WebRTC → needs TURN infrastructure
- Rating average calculation is not atomic → needs `findAndModify` or MongoDB aggregation

### 5. What are the top 10 blockers before a public launch?

| Rank | Blocker | Impact | Effort |
|------|---------|--------|--------|
| 1 | **Credentials in git history** — MongoDB URI, JWT secret, Gmail password, Google OAuth, Razorpay keys all committed | Full compromise of all environments | 4 hours |
| 2 | **6 unauthenticated API endpoints** — anyone can control expert status, view any user's email, poll payment data | Privacy violation, platform manipulation | 2 days |
| 3 | **Zero automated tests** — no confidence in payment, auth, or call flows | Payment errors, data loss, regressions | 2+ weeks |
| 4 | **Exception message leak** — `ex.getMessage()` returned to API clients exposing infrastructure internals | Information disclosure (DB URIs, etc.) | 1 hour |
| 5 | **STUN-only WebRTC** — ~8-10% calls fail behind symmetric NATs (corporate, mobile) | Lost revenue, poor UX | 2 days |
| 6 | **Full-table scans** — webhook handler, earnings migration, earnings history, expert search all do O(n) scans | Timeouts, OOM under load | 3 days |
| 7 | **No TURN server** — corporate users and mobile carriers can't connect to calls | Lost customers | 2 days |
| 8 | **No health checks** — no Spring Boot Actuator, load balancer can't detect unhealthy instances | Undetected downtime | 0.5 day |
| 9 | **No refund mechanism** — clients cannot receive refunds for failed sessions | Regulatory/compliance risk | 3 days |
| 10 | **No automated rollback** — broken production deploy requires manual intervention | Extended downtime | 1 day |

---

## Appendix A: File Reference Index

### Key Files Reviewed
- `flyhigh2.0/CLAUDE.md` — Root architecture documentation
- `flyhigh-backend/src/main/resources/application.properties` — All configuration
- `flyhigh-backend/src/main/java/com/flyhigh/backend/security/SecurityConfig.java` — Security configuration
- `flyhigh-backend/src/main/java/com/flyhigh/backend/security/JwtAuthenticationFilter.java` — JWT validation
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/PaymentService.java` — Payment processing
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/PricingService.java` — Commission calculation
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/AuthService.java` — Authentication logic
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/VideoCallService.java` — Call lifecycle
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/ExpertSearchService.java` — Expert search
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/ExpertEarningService.java` — Earnings
- `flyhigh-backend/src/main/java/com/flyhigh/backend/service/JwtService.java` — JWT generation
- `flyhigh-backend/src/main/java/com/flyhigh/backend/exception/GlobalExceptionHandler.java` — Error handling
- `flyhigh-signaling-server/server.js` — Socket.IO signaling (dev)
- `flyhigh-signaling-server/lambda.js` — WebSocket signaling (prod)
- `flyhigh-ui/src/hooks/useWebRTC.ts` — WebRTC hook (755 lines)
- `flyhigh-ui/src/hooks/useSocket.ts` — Socket hook
- `flyhigh-ui/src/hooks/useSessionTimer.ts` — Session timer
- `flyhigh-ui/src/contexts/AuthContext.tsx` — Auth context
- `flyhigh-ui/src/contexts/SocketContext.tsx` — Socket context
- `flyhigh-ui/src/api/client.ts` — Axios client with Zod
- `flyhigh-ui/src/lib/validation.ts` — Zod schemas
- `infra/lib/app-stack.ts` — CDK app stack
- `infra/lib/platform-stack.ts` — CDK platform stack
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `docker-compose.yml` — Local dev environment

---

## Appendix B: Strengths Summary (What's Excellent)

1. **Financial integrity**: BigDecimal arithmetic, constant-time HMAC, atomic state transitions, idempotency keys, immutable audit trail — this is production-grade payment code.
2. **JWT security**: `tokenVersion`-based invalidation is a sophisticated pattern rarely seen in early-stage projects.
3. **Infrastructure-as-Code**: The CDK stacks are comprehensive, well-typed, and follow AWS best practices (SnapStart, WAF, throttling, access logging, reserved concurrency).
4. **Documentation**: The CLAUDE.md files, DEVELOPER_GUIDE, PROJECT_UNDERSTANDING, and other docs are exceptional — clear, accurate, and comprehensive.
5. **WebRTC implementation**: The `useWebRTC` hook handles the full signaling lifecycle with careful state management, ICE queuing, retry logic, and proper cleanup.
6. **CI/CD pipeline**: OIDC auth, polyglot matrix builds, CDK diff on PR, artifact sharing, environment separation — this is a mature DevOps setup.
7. **API client validation**: Zod runtime validation with fail-open in production is a smart pattern for catching backend schema mismatches without crashing the app.
8. **Error handling philosophy**: Non-fatal SessionPayment creation with reconciliation logging shows mature thinking about distributed systems.
9. **Dev experience**: Docker Compose with health checks, one-command start scripts, `.env.example` with defaults — excellent DX.
10. **Attention to detail**: Payment ID truncation in logs, `@Lazy` injection to break circular dependencies, `@PostConstruct` validation — these small touches add up.

---

*End of Production Readiness Audit*
