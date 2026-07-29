# FlyHigh 2.0 — Project Understanding

## What Is FlyHigh?

A **video-consultation marketplace** that connects clients seeking expert advice with vetted professionals across categories (legal, finance, tech, health, business). Think "Uber for expert consultations" — clients browse/search experts, request a call, and hop into a WebRTC video session.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Browser (React 19 SPA)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Landing  │  │  Client  │  │  Expert  │  │ Video Call │ │
│  │  Pages   │  │Dashboard │  │Dashboard │  │  (WebRTC)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└───────┬──────────────────┬─────────────────────────────────┘
        │ REST (Axios)      │ WebSocket (Socket.IO)
        │ httpOnly JWT      │
        ▼                   ▼
┌──────────────────┐  ┌──────────────────────────┐
│  flyhigh-backend │  │ flyhigh-signaling-server │
│  Spring Boot     │  │ Node.js + Socket.IO      │
│  Port 8081       │  │ Port 5000                │
│                  │  │                          │
│  • Auth (JWT)    │  │  • WebRTC signaling      │
│  • Expert search │  │  • Call request routing  │
│  • Profile CRUD  │  │  • Chat messaging        │
│  • Session mgmt  │  │  • User presence         │
│  • Ratings       │  │  • Notifications (DB)    │
└────────┬─────────┘  └────────────┬─────────────┘
         │                         │
         └──────────┬──────────────┘
                    ▼
          ┌─────────────────┐
          │  MongoDB Atlas   │
          │  flyhigh2        │
          └─────────────────┘
```

---

## Service Breakdown

### 1. `flyhigh-ui` — Frontend

| Aspect | Detail |
|--------|--------|
| Framework | React 19.2.6 + TypeScript 7.0.1-rc (strict mode, ES2024) |
| Build | Vite 6.3.5 |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`) + shadcn/ui (Radix Nova) |
| Routing | react-router-dom v7, lazy-loaded route groups |
| State | React Context (AuthContext, SocketContext) |
| HTTP | Axios with `withCredentials: true` for httpOnly JWT cookies |
| Real-time | Socket.IO client → signaling server |
| Animations | Framer Motion v12 |
| Workers | 4 Web Workers: chat, data, heartbeat, polling |
| Lint/Format | ESLint v10 flat config + Prettier v3 |
| Port | 5173 (Vite dev) |

#### Route Map

| Group | Paths | Layout |
|-------|-------|--------|
| Public | `/`, `/about`, `/pricing`, `/how-it-works`, `/contact`, `/login`, `/signup`, `/forgot-password` | No layout |
| Client (auth) | `/client-dashboard`, `/search-experts`, `/my-sessions`, `/notifications`, `/client-profile`, `/settings`, `/expert-profile/:expertId` | DashboardLayout (sidebar + header) |
| Expert (auth) | `/expert-dashboard`, `/expert/profile`, `/expert/sessions`, `/expert/earnings` | DashboardLayout |
| Admin (auth) | `/admin/dashboard`, `/admin/experts`, `/admin/clients`, `/admin/consultations`, `/admin/payments`, `/admin/reports`, `/admin/settings` | DashboardLayout |
| Video Call (auth) | `/video-call`, `/call-completed` | Fullscreen (no sidebar) |

#### Key Patterns
- **Auth flow**: `AuthContext` calls `POST /auth/refresh` on mount → gets `/auth/me` → stores user. Login/signup set httpOnly cookies; Axios sends them automatically.
- **Real-time**: `SocketContext` wraps Socket.IO — manages connection lifecycle, exposes signaling helpers (`joinRoom`, `emitOffer`, `emitAnswer`, `emitIceCandidate`, …) and event listeners (`onIncomingCall`, `onCallStatusUpdate`, …). Only connects when user is authenticated.
- **WebRTC**: `useWebRTC` hook manages `RTCPeerConnection`, local/remote streams, mic/camera toggles, screen sharing, call duration timer, and connection status. Uses Google's public STUN servers.
- **API calls**: Wrapped in `lib/` functions (e.g. `lib/expert-search.ts`, `lib/call-requests.ts`) — components never call Axios directly.
- **Code splitting**: Every page is `lazy()` imported; `Suspense` with `LoadingSpinner` fallback.
- **Web Workers**: Heavy computation offloaded; workers communicate via `postMessage`.

#### Source Structure
```
src/
├── api/client.ts              Axios instance + error handling
├── contexts/
│   ├── AuthContext.tsx         User state, login/logout/refresh
│   └── SocketContext.tsx       Socket.IO lifecycle + signaling API
├── hooks/
│   ├── useWebRTC.ts           RTCPeerConnection + media management
│   ├── useSocket.ts           Socket.IO hook (from SocketContext)
│   ├── useHeartbeat.ts        Periodic heartbeat to backend
│   ├── useDataWorker.ts       Data worker bridge
│   ├── useChatWorker.ts       Chat worker bridge
│   ├── usePollingWorker.ts    Polling worker bridge
│   ├── useCountUp.ts          Animated counter
│   ├── useInView.ts           Intersection Observer
│   └── use-toast.ts           Toast notifications
├── lib/
│   ├── expert-search.ts       Search API wrapper
│   ├── expert-profile.ts      Profile API wrapper
│   └── call-requests.ts       Call request API wrapper
├── router/routes.ts           Route config + nav items
├── layouts/DashboardLayout.tsx Sidebar + header layout
├── components/
│   ├── home/                   Landing page sections (Hero, Categories, Featured Experts, etc.)
│   ├── auth/                   Login, Signup, Forgot Password, OAuth flows
│   ├── client/                 Client dashboard, search, sessions, profile, settings
│   ├── expert/                 Expert dashboard, profile completion (51KB form!), sessions
│   ├── video-call/             WebRTC call UI (22KB), waiting screen, incoming call popup, rating
│   ├── layout/                 Navbar, Footer, Sidebar
│   └── ui/                     shadcn primitives (avatar, badge, button, card, etc.)
├── types/                      TypeScript type definitions (auth, expert, api)
├── workers/                    4 Web Workers (chat, data, heartbeat, polling)
└── shared/components/          Atomic design (atoms, molecules)
```

---

### 2. `flyhigh-backend` — REST API

| Aspect | Detail |
|--------|--------|
| Runtime | Java 21 + Spring Boot 3.2.5 |
| Database | MongoDB Atlas (SRV connection, synchronous driver) |
| Auth | Stateless JWT (httpOnly cookies), BCrypt strength 12 |
| Email | Gmail SMTP (OTP verification, password reset) |
| OAuth | Google Sign-In |
| Rate Limiting | Bucket4j (in-memory, per-IP) |
| Concurrency | Virtual threads (`ThreadingConfig`), Structured Concurrency (`--enable-preview`) |
| Port | 8081 |

#### MongoDB Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Core user accounts (email, password, role, profileCompleted) |
| `expert_profiles` | Expert details (title, category, hourly rate, bio, languages, etc.) |
| `pending_users` | Unverified signups (awaiting OTP) |
| `password_reset_otps` | Password reset OTP records |
| `call_requests` | Video call lifecycle (PENDING → ACCEPTED/REJECTED → COMPLETED) |
| `interactions` | Call interaction logs with SessionStatus tracking |
| `session_payments` | Payment records for completed sessions |
| `payouts` | Expert payout records |
| `dropdown_definitions` | Filter dropdown data (categories, languages, countries) |

#### API Endpoints

**Auth** (`/api/auth`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/signup` | No | Create pending user + send OTP |
| POST | `/verify-signup-otp` | No | Verify OTP → create real User |
| POST | `/resend-signup-otp` | No | Resend OTP (rate-limited: 3/hr) |
| POST | `/login` | No | Login → JWT cookies + redirect URL |
| POST | `/google-login` | No | Google OAuth login |
| POST | `/complete-google-registration` | No | Complete Google registration |
| POST | `/refresh` | Yes | Refresh JWT tokens |
| POST | `/logout` | Yes | Clear auth cookies + set expert offline |
| GET | `/me` | Yes | Get current user |
| POST | `/heartbeat` | Yes | Update lastActivityAt |
| POST | `/forgot-password` | No | Send password reset OTP |
| POST | `/verify-reset-otp` | No | Verify reset OTP |
| POST | `/reset-password` | No | Set new password |

**Expert Search** (`/api/experts`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | Yes | Search/filter/sort/paginate experts |
| GET | `/{expertId}` | Yes | Get expert public profile |
| GET | `/filters` | Yes | Get dropdown filter options |

**Expert Profile** (`/api/expert-profile`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/me` | Yes (EXPERT) | Get own expert profile |
| POST | `/complete` | Yes (EXPERT) | Complete/save expert profile |
| GET | `/categories` | Yes | Get category dropdown data |
| GET | `/languages` | Yes | Get language dropdown data |
| GET | `/countries` | Yes | Get country dropdown data |

**Video Call** (`/api/video-call`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/request` | Yes (CLIENT) | Create call request |
| POST | `/respond` | Yes (EXPERT) | Accept/reject call |
| GET | `/status/{id}` | Yes | Poll call status |
| GET | `/pending/{expertId}` | Yes | Check pending calls |
| GET | `/latest` | Yes | Get latest call for client |
| POST | `/end` | Yes | End a call |
| POST | `/rating` | Yes | Submit post-call rating (1-5 + review) |
| GET | `/history` | Yes | Get call history |
| POST | `/expert/{userId}/status` | Yes | Set expert ONLINE/BUSY |
| GET | `/expert/{userId}/email` | Yes | Get expert email by userId |

#### Security Model
- **JWT flow**: Login → backend sets `access_token` (15 min) + `refresh_token` (7 days) as httpOnly, secure, sameSite=strict cookies. Frontend never touches tokens.
- **Filter chain**: `JwtAuthenticationFilter` runs before `UsernamePasswordAuthenticationFilter` — extracts JWT from cookie, validates, sets `SecurityContext`.
- **Role-based access**: `@PreAuthorize` annotations on controllers. `ProtectedRoute` on frontend mirrors this.
- **Rate limiting**: `RateLimiterFilter` (Bucket4j) — in-memory, per-IP, resets on restart.
- **Public endpoints**: Signup, login, OTP verification, password reset, Google OAuth. Everything else requires authentication.

#### Key Services
- **AuthService** (548 lines): Signup → PendingUser → OTP → User. Login → JWT. Forgot/reset password. Google OAuth linking. Expert online/offline toggle.
- **ExpertSearchService** (389 lines): Dynamic MongoDB Criteria queries for filtering experts by category, subCategory, language, country, experience range, price range, rating. Post-query sorting and availability filtering. Only `MongoTemplate` user in the codebase.
- **VideoCallService** (270 lines): Call request lifecycle — create, respond (accept/reject), status polling, end call, rating submission, history.
- **ExpertProfileService**: CRUD for expert profiles, dropdown data, profile completion validation.

---

### 3. `flyhigh-signaling-server` — WebRTC Signaling

| Aspect | Detail |
|--------|--------|
| Runtime | Node.js + Express 4.22 |
| WebSocket | Socket.IO 4.7 |
| Database | Mongoose 8 → MongoDB Atlas (notifications only) |
| Port | 5000 |

#### Architecture (single-file, ~500 lines with JWT auth + rate limiting)

```
server.js
├── HTTP: GET / → health check
├── Socket.IO events:
│   ├── register-user        JWT auth → binds socket ↔ user (email, userId as MongoDB ObjectId, expertId)
│   ├── call-request         Routes incoming call to expert's sockets
│   ├── call-response        Routes accept/reject back to client
│   ├── notify-call-ended    Tells other party call ended
│   ├── join-room            Joins WebRTC signaling room (offer/answer/ICE relay)
│   ├── offer                Relays WebRTC offer to room
│   ├── answer               Relays WebRTC answer to room
│   ├── ice-candidate        Relays ICE candidates to room
│   ├── end-call             Emits call-ended to room
│   ├── send-chat-message    Relays chat message to room
│   └── disconnect           Cleanup: removes from all tracking Maps
└── In-memory state (3 Maps):
    ├── connectedUsers       Map<socketId, {email, role, userId, expertId}>
    ├── userSocketsByEmail   Map<email, Set<socketId>>
    └── userSocketsByUserId  Map<userId, Set<socketId>>
```

#### Notable Design Decisions
- **JWT authentication (hardened)**: Verifies JWT from `register-user` payload or from httpOnly `accessToken` cookie in the Socket.IO handshake. Falls back to dev mode when `JWT_SECRET` is not configured. Production-ready with HMAC-SHA256 signature verification, expiry check, and identity mismatch detection.
- **Rate limiting**: 30 events per 10-second window per socket, with automatic tracker cleanup every 30s.
- **In-memory state**: User presence resets on restart. All Maps are plain JS objects — no Redis.
- **Multiple socket support**: One user can have multiple sockets (multiple tabs/devices). Call requests fan out to all.
- **Notifications model**: Mongoose schema `{ userEmail, expertEmail, type: 'chat'|'video-call', message, roomName, timestamp }` — stored in MongoDB for persistence across signaling server restarts.

---

## Cross-Cutting Concerns

### Auth Flow (End-to-End)

```
1. User fills signup form → POST /api/auth/signup
   → Backend creates PendingUser, sends OTP email

2. User enters OTP → POST /api/auth/verify-signup-otp
   → Backend creates User document, sets cookies

3. Frontend AuthContext calls POST /api/auth/refresh → GET /api/auth/me
   → User object stored in context

4. All subsequent API calls include httpOnly JWT cookies automatically
   (Axios withCredentials: true)

5. Socket.IO connection → emit 'register-user' with email, role, userId
   → Signaling server maps socket to user
```

### Video Call Flow (End-to-End)

```
1. Client searches experts → GET /api/experts?category=X&sort=...
   → Backend queries MongoDB with dynamic Criteria

2. Client clicks "Call" on expert → POST /api/video-call/request
   → Backend creates CallRequest (status=PENDING), returns callRequestId

3. Client emits 'call-request' via Socket.IO → signaling server
   → Server looks up expert's sockets → emits 'incoming-call'

4. Expert's IncomingCallPopup shows → Expert clicks Accept/Decline
   → POST /api/video-call/respond (action=ACCEPT/REJECT)

5. On accept: Backend creates roomId → Expert emits 'call-response' via Socket.IO
   → Server relays to client → Both navigate to /video-call

6. Both join Socket.IO room → emit 'join-room' with roomId

7. Caller creates RTCPeerConnection, gets local stream, creates offer
   → emit 'offer' → server relays → callee receives, sets remote, creates answer
   → emit 'answer' → server relays → caller sets remote
   → ICE candidates flow bidirectionally

8. During call: 'send-chat-message' relays text chat

9. Call ends: emit 'end-call' → POST /api/video-call/end (status=COMPLETED)
   → Client sees PostCallRating → POST /api/video-call/rating (1-5 + review)
```

### Data Flow for Expert Search

```
Client search page
  → GET /api/experts?q=...&category=...&language=...&sort=...&page=0&size=12
  → ExpertSearchService:
      1. Query users collection: role=EXPERT, profileCompleted=true → validUserIds
      2. Query expert_profiles: userId IN validUserIds + filters
      3. Post-query: filter by availability (isOnline from heartbeat), sort, paginate
      4. Enrich with User names, Interaction counts
  → ExpertSearchPageResponse { experts: ExpertSummaryResponse[], total, ... }
```

---

## Dev Data Seeding

`DevDataSeeder` (27KB) creates realistic development data:
- **200 clients** with varied names, emails, countries
- **100 experts** across 8 categories with full profiles
- **500 reviews** distributed across experts
- Idempotent: checks `isSeedData=true` before creating
- Triggered by `dev` profile

---

## Security Architecture (Hardened — July 2026)

### Authentication & Authorization
- **JWT Token Versioning**: `tokenVersion` field on User model. Incremented on logout and password reset, instantly invalidating all existing tokens across all devices. JWT filter validates `tokenVersion` claim against DB on every request.
- **Signaling Server JWT Auth**: Both `server.js` (local) and `lambda.js` (production) now verify JWT tokens on connection. Identity claims must match JWT payload. Production mode rejects unauthenticated connections.
- **SameSite=Strict Cookies**: All auth cookies set with `SameSite=Strict` for maximum CSRF protection.
- **Account Active Check**: JWT filter rejects deactivated accounts before request processing.

### Rate Limiting
- **Two-Tier Backend**: Global 10 req/s per IP + sensitive endpoint buckets (auth: 5/min, OTP: 3/min) via Bucket4j.
- **WebSocket Rate Limiting**: 30 events per 10-second window per socket. Chat messages truncated to 5000 chars.
- **OTP Brute-Force Protection**: 3 OTP requests per hour per email, BCrypt-hashed OTP storage.

### Financial Integrity
- **BigDecimal Arithmetic**: All financial calculations use `BigDecimal` with `HALF_EVEN` rounding — zero floating-point errors. Amounts convertible to paise for Razorpay API.
- **Idempotency Keys**: `X-Idempotency-Key` header on all payment endpoints prevents duplicate charges from double-clicks. Interaction-level dedup.
- **Atomic Payment Verification**: MongoDB `findAndModify` atomically transitions session state. Only the first verification succeeds. Concurrent duplicates receive current state (idempotent).
- **Constant-Time HMAC**: Signature comparison uses `constantTimeEquals()` to prevent timing side-channel attacks.
- **Resilience4j Circuit Breaker**: Razorpay calls protected with circuit breaker (50% threshold, 30s open) and retry with exponential backoff (1s → 2s → 4s, max 3 attempts).
- **Razorpay Webhook**: Server-side `POST /api/webhooks/razorpay` endpoint provides defense-in-depth — catches payments where client disconnects before verification.
- **Immutable Audit Trail**: `audit_log` collection records every financial state change (ORDER_CREATED, PAYMENT_VERIFIED, PAYMENT_FAILED, SESSION_EXTENDED, SESSION_COMPLETED, EARNING_PROCESSED). `@Async` non-blocking writes.

### Runtime Validation
- **Zod Schema Validation**: All frontend API responses validated at runtime against typed schemas. Schema mismatches logged in development, warned in production (fail-open).
- **Secrets Validation**: `SecretsValidationRunner` validates all critical secrets on startup. Fails fast in production if placeholders or test keys detected.

### Security Headers
- **Backend**: `SecurityHeadersFilter` (Order 2) adds HSTS (1yr), CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, X-XSS-Protection, Referrer-Policy, Cache-Control: no-store.
- **Signaling Server**: Helmet middleware sets 11 security headers (CSP, HSTS, X-Frame-Options, X-DNS-Prefetch-Control, Cross-Origin policies).
- **CORS Hardening**: Production rejects wildcard `*` with credentials. Allowed origins configurable via `CORS_ORIGINS` env var. Explicit allowed headers (no wildcard).

### PII Protection
- **Logging**: Payment IDs truncated to `first8****last4`. Amounts logged as BigDecimal only. No PII, credentials, or card data in logs.
- **Secrets**: All credentials removed from `application.properties`. Dev defaults in `application-dev.yml` only. Production requires environment variables.

## Key Fixes Applied (July 2026 Session)

### 1. Database Name Mismatch
- **Issue**: `application-dev.yml` set `spring.data.mongodb.database: flyhigh_dev` but `.env` URI used database `flyhigh2`. Spring Boot's `database` property overrides the URI's database name.
- **Fix**: Changed `application-dev.yml` to use `flyhigh2`.
- **File**: `flyhigh-backend/src/main/resources/application-dev.yml`

### 2. Zod Schema Mismatch — `languages` Field
- **Issue**: Backend `ExpertProfileResponse` returns `languages` as `List<String>` (array), but the Zod validation schema expected `z.string()`.
- **Fix**: Changed `languages` schema from `z.string()` to `z.array(z.string())` in both `ExpertSearchPageSchema` and `ExpertPublicProfileSchema`.
- **File**: `flyhigh-ui/src/lib/validation-more.ts`

### 3. Socket Registration `userId` Mismatch (Call Notification Bug)
- **Issue**: `SocketContext.tsx` registered the socket with `userId: user.email`, but call-request events look up experts via `userSocketsByUserId.get(expertId)` where `expertId` is the MongoDB ObjectId. The lookup never matched, so experts never received incoming call popups.
- **Fix**: Changed registration to use `userId: user.id` (MongoDB ObjectId from `AuthContext`).
- **File**: `flyhigh-ui/src/contexts/SocketContext.tsx`

### 4. Signaling Server Auth — Cookie-Based JWT Extraction
- **Issue**: The signaling server's `register-user` handler required a JWT token in the event payload, but the JWT is stored in httpOnly cookies which JavaScript cannot read. When `JWT_SECRET` was configured, all socket registrations were rejected.
- **Fix**: Added `extractCookie()` helper to read the `accessToken` cookie from the Socket.IO HTTP handshake. Auth flow is now: payload token → handshake cookie → dev-mode fallback (if `JWT_SECRET` not set). Production-safe since Socket.IO sends httpOnly cookies with the initial connection on HTTPS.
- **File**: `flyhigh-signaling-server/server.js`

### 5. CORS — Missing `X-Idempotency-Key` Header
- **Issue**: Payment endpoints use `X-Idempotency-Key` header for duplicate payment prevention, but it wasn't in the CORS allowed headers list.
- **Fix**: Added `X-Idempotency-Key` to `config.setAllowedHeaders()`.
- **File**: `flyhigh-backend/src/main/java/com/flyhigh/backend/security/SecurityConfig.java`

### 6. PaymentService — `Integer → char[]` ClassCastException
- **Issue**: `String.valueOf(order.get("amount"))` threw `ClassCastException: Integer cannot be cast to [C` (char[]). Caused by the upgraded `org.json:20240303` library (overriding Razorpay SDK's outdated 20160810 version for Java 21 compat), where the `valueOf` overload resolution changed.
- **Fix**: Replaced `String.valueOf(order.get("amount"))` with explicit `order.get("amount").toString()` (null-safe).
- **File**: `flyhigh-backend/src/main/java/com/flyhigh/backend/service/PaymentService.java`

## Known Limitations & Gotchas (Updated)

1. **Signaling server is in-memory** — all connected users lost on restart. No Redis/persistence for presence.
2. **Single-file signaling server** — No separation of concerns (though now substantially hardened with JWT auth, rate limiting, Helmet).
3. ~~**No authentication on signaling**~~ — **FIXED**: JWT verification on `register-user` and `$connect`. Identity mismatch rejected.
4. ~~**No rate limiting on WebSocket events**~~ — **FIXED**: 30 events/10s window per socket.
5. **Hardcoded URLs**: Socket.IO URL (`localhost:5000`), API base (`localhost:8081/api`) — now configurable via env vars, but frontend still has dev defaults.
6. ~~**Credentials in `application.properties`**~~ — **FIXED**: All secrets require env vars. Dev defaults in `application-dev.yml`. `SecretsValidationRunner` fails fast in production.
7. **TypeScript 7.0.1-rc** is bleeding edge — tooling may have compatibility issues.
8. **Structured Concurrency requires `--enable-preview`** at both compile and runtime (Java 21).
9. **STUN-only WebRTC** — no TURN server configured. Calls fail behind symmetric NATs.
10. **Rate limiter is in-memory** — resets on backend restart. Production should use Redis buckets.
11. ~~**No payment integration**~~ — **FIXED**: Razorpay integrated with circuit breaker, idempotency, atomic verification, webhook, and audit trail.
12. **Expert availability computed from heartbeat** — `isOnline` derived from `lastActivityAt`, not a real-time presence signal.
13. **SessionPayment creation is non-fatal** — if the ledger record write fails, it's logged for reconciliation rather than blocking the payment flow.

---

## Epic 1 & 2 Features Implemented (July 23, 2026)

### A. Admin Portal

**Backend:**
- `AdminInitializer.java` — Auto-creates single admin account on startup from `ADMIN_EMAIL`/`ADMIN_PASSWORD` config. Idempotent (skips if exists). BCrypt-encoded password.
- `AdminController.java` — `GET /api/admin/dashboard`, `/users`, `/experts`, `/clients`, `/consultations`, `/payments` — all `@PreAuthorize("hasRole('ADMIN')")`
- `AdminService.java` — Dashboard stats (total users/experts/clients, active consultations, revenue) + paginated user/consultation/payment queries
- `AdminDashboardStats.java`, `AdminUserDto.java`, `AdminConsultationDto.java`, `AdminPaymentDto.java` — Admin-specific DTOs
- `application.properties` — Added `app.admin.email` and `app.admin.password` config keys

**Frontend (7 pages):**
- `AdminDashboard.tsx` — 8 stat cards + 4 data tables (latest users, experts, consultations, payments)
- `AdminExperts.tsx`, `AdminClients.tsx` — Paginated tables with status badges
- `AdminConsultations.tsx`, `AdminPayments.tsx` — Tables with formatted amounts/statuses
- `AdminReports.tsx`, `AdminSettings.tsx` — Placeholder pages
- `routes.ts` — Added `adminRoutes` array + `adminNavItems` (7 sidebar items)
- `DashboardLayout.tsx` — Admin role detection, admin nav items, area labels
- `App.tsx` — Admin routes inside DashboardLayout with ProtectedRoute guards

**Security:** JWT with `ROLE_ADMIN` authority. `ProtectedRoute` with `allowedRoles: ["ADMIN"]`. Admin signup blocked via `SignupRequest` regex (`^(client|expert)$`).

### B. Client Profile Management

**Backend:**
- `User.java` — Extended with: `phoneNumber`, `alternatePhone`, `city`, `state`, `address`, `postalCode`, `profileImage`, `isAdmin`, `notificationPreferences`
- `NotificationPreferences.java` — Embedded document: emailNotifications, pushNotifications, consultationReminders, paymentNotifications, marketingEmails, reminderNotifications (all `true` by default except marketing)
- `UpdateProfileRequest.java` — Validated DTO: firstName, lastName, phoneNumber, alternatePhone, city, state, country, address, postalCode, profileImage
- `ChangePasswordRequest.java` — Validated DTO: currentPassword, newPassword (policy regex), confirmPassword
- `UserProfileResponse.java` — Full profile response with all fields + notification prefs
- `UserService.java` — Profile CRUD, change password (with current password verification + BCrypt), notification prefs get/update
- `UserController.java` — `GET/PUT /api/users/profile`, `PUT /api/users/change-password`, `GET/PUT /api/users/notification-preferences`
- `AuthResponse.java` — Extended with phoneNumber, city, state, address, postalCode, profileImage, notificationPreferences
- `AuthController.getCurrentUser()` — Populates extended profile fields in `/api/auth/me` response

**Frontend:**
- `ClientProfilePage.tsx` — View/Edit toggle with 9 profile fields. Pre-filled values, validation, save/cancel, success toast
- `ClientSettingsPage.tsx` — Change Password form (3 fields, show/hide toggle, validation) + Notification Preferences (6 toggle switches, save/reset)
- `lib/user-api.ts` — API wrappers: fetchProfile, updateProfile, changePassword, fetch/update notification preferences
- `types/auth.ts` — Extended AuthUser, UserProfileResponse, UpdateProfileRequest, NotificationPreferences types
- `types/expert.ts` — Added `city` field to ExpertPublicProfile and SaveExpertProfilePayload

### C. Expert Profile — City Field

- `ExpertProfile.java` — Added `city` field
- `ExpertProfileRequest.java`, `ExpertProfileResponse.java` — Added city getter/setter
- `ExpertProfileService.java` — City handling in `completeProfile()` (save) and `buildResponse()` (read)
- `ExpertProfileCompletion.tsx` — City input field in Personal Information section
- `validation-more.ts` — Added `city` to `ExpertPublicProfileSchema` (Zod)

### D. Email Notification on Call Request

- `EmailService.sendCallRequestNotification()` — HTML email template with client details, amber warning banner, FlyHigh branding
- `VideoCallService.sendCallRequestNotification()` — Private helper checks expert notification preferences (emailNotifications + consultationReminders) before sending
- Triggered after `createCallRequest()` saves the CallRequest — silent failure (never blocks the call)
- Expert gets notified via two channels: email (async, works offline) + WebSocket popup (real-time)

### E. Rating Immutability

- `VideoCallService.submitRating()` — Added guard: `if (reviewSubmitted) throw IllegalStateException("Rating has already been submitted and cannot be changed.")`
- Once a client submits a rating/review, the endpoint rejects any subsequent attempts

### Updated Route Map

| Group | Paths | Layout |
|-------|-------|--------|
| Public | `/`, `/about`, `/pricing`, `/how-it-works`, `/contact`, `/login`, `/signup`, `/forgot-password` | No layout |
| Client (auth) | `/client-dashboard`, `/search-experts`, `/my-sessions`, `/notifications`, `/client-profile`, `/settings`, `/expert-profile/:expertId` | DashboardLayout |
| Expert (auth) | `/expert-dashboard`, `/expert/profile`, `/expert/sessions`, `/expert/earnings` | DashboardLayout |
| Admin (auth) | `/admin/dashboard`, `/admin/experts`, `/admin/clients`, `/admin/consultations`, `/admin/payments`, `/admin/reports`, `/admin/settings` | DashboardLayout |
| Video Call (auth) | `/video-call`, `/call-completed` | Fullscreen |

### Updated API Endpoints

**User** (`/api/users`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/profile` | Yes | Get own full profile |
| PUT | `/profile` | Yes | Update own profile |
| PUT | `/change-password` | Yes | Change password (logged in) |
| GET | `/notification-preferences` | Yes | Get notification preferences |
| PUT | `/notification-preferences` | Yes | Update notification preferences |

**Admin** (`/api/admin`):
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/dashboard` | ADMIN | Dashboard statistics |
| GET | `/users?page=0` | ADMIN | Paginated user list |
| GET | `/users/recent?limit=5` | ADMIN | Recent users |
| GET | `/experts?page=0` | ADMIN | Paginated expert list |
| GET | `/clients?page=0` | ADMIN | Paginated client list |
| GET | `/consultations?page=0` | ADMIN | Paginated consultations |
| GET | `/payments?page=0` | ADMIN | Paginated payments |

### Updated MongoDB Collections

| Collection | New Fields |
|-----------|------------|
| `users` | `phoneNumber`, `alternatePhone`, `city`, `state`, `address`, `postalCode`, `profileImage`, `isAdmin`, `notificationPreferences` (embedded) |
| `expert_profiles` | `city` |
