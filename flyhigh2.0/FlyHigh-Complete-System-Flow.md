# FlyHigh 2.0 — Complete System Flow Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLYHIGH 2.0 PLATFORM                         │
│                 Video-Consultation Marketplace                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│   flyhigh-ui  │    │   flyhigh-backend    │    │ flyhigh-signaling│
│  React 19 SPA │───▶│  Spring Boot 3.2.5   │◀───│  Node.js +       │
│  Vite + TS    │    │  Java 21 + MongoDB   │    │  Socket.IO 4.8   │
│  Port 5173    │    │  Port 8081           │    │  Port 5000       │
└───────────────┘    └──────────────────────┘    └──────────────────┘
       │                      │                          │
       │ REST API (Axios)     │ MongoDB Atlas            │ WebSocket
       │ JWT httpOnly cookies │ Razorpay API             │ WebRTC signaling
       ▼                      ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA & INFRASTRUCTURE                        │
│  MongoDB Atlas ─── AWS (Lambda + API Gateway + S3 + CloudFront)     │
│  DynamoDB (signaling connections/rooms) — AWS Secrets Manager       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [User Roles & Authentication](#1-user-roles--authentication)
2. [Module 1: Landing & Public Pages](#2-module-1-landing--public-pages)
3. [Module 2: Authentication Flow](#3-module-2-authentication-flow)
4. [Module 3: Expert Profile Completion](#4-module-3-expert-profile-completion)
5. [Module 4: Expert Search & Discovery](#5-module-4-expert-search--discovery)
6. [Module 5: Expert Profile View](#6-module-5-expert-profile-view)
7. [Module 6: Video Call Flow](#7-module-6-video-call-flow)
8. [Module 7: Payment Flow](#8-module-7-payment-flow)
9. [Module 8: Session Lifecycle & Timer](#9-module-8-session-lifecycle--timer)
10. [Module 9: Client Dashboard & Profile](#10-module-9-client-dashboard--profile)
11. [Module 10: Expert Dashboard & Profile](#11-module-10-expert-dashboard--profile)
12. [Module 11: Expert Earnings](#12-module-11-expert-earnings)
13. [Module 12: Admin Portal](#13-module-12-admin-portal)
14. [Module 13: Notifications & Chat](#14-module-13-notifications--chat)
15. [Module 14: Pricing Calculation System](#15-module-14-pricing-calculation-system)
16. [Module 15: Security Architecture](#16-module-15-security-architecture)
17. [Module 16: AWS Infrastructure & Deployment](#17-module-16-aws-infrastructure--deployment)

---

## 1. User Roles & Authentication

### User Types

| Role | Description | Landing Page |
|------|-------------|-------------|
| **CLIENT** | Seeks expert consultations, pays for sessions | `/client-dashboard` |
| **EXPERT** | Provides consultations, earns through platform | `/expert/dashboard` |
| **ADMIN** | Full platform management, financial oversight | `/admin/dashboard` |

### Auth Providers

```
┌─────────────────────┐
│   AUTHENTICATION     │
│      METHODS         │
├─────────────────────┤
│ 1. Email + Password │
│ 2. Google OAuth     │
└─────────────────────┘
```

### Token System

```
┌──────────────────────────────────────────────────────────┐
│                    JWT TOKEN FLOW                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Login ──▶ Backend issues:                               │
│              • accessToken  (httpOnly cookie, 15 min)     │
│              • refreshToken (httpOnly cookie, 7 days)     │
│              • Includes tokenVersion for invalidation     │
│                                                          │
│  Every API call ──▶ Axios sends cookies automatically    │
│                    (withCredentials: true)                │
│                                                          │
│  JwtAuthenticationFilter:                                │
│    1. Extract token from "accessToken" cookie            │
│    2. Fallback: "Authorization: Bearer <token>" header   │
│    3. Validate HMAC-SHA256/384/512 signature              │
│    4. Check token version matches User.tokenVersion      │
│    5. Set SecurityContext with userId + email + role      │
│                                                          │
│  Token refresh ──▶ /api/auth/refresh ──▶ new token pair  │
│    • Validates refresh token signature                   │
│    • Checks tokenVersion (rejects if logged out elsewhere)│
│                                                          │
│  Logout ──▶ Clear cookies + set expert OFFLINE           │
│    • Increments tokenVersion (invalidates all tokens)    │
│                                                          │
│  SIGNALING SERVER ALSO VERIFIES JWT:                     │
│    • Reads accessToken cookie from Socket.IO handshake   │
│    • Or accepts token in register-user payload           │
│    • HMAC signature verification with same JWT_SECRET    │
│    • Fallback dev mode (warning) when JWT_SECRET unset   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Module 1: Landing & Public Pages

### Routes

```
PUBLIC ROUTES (no auth required):
  /                → HomePage (landing)
  /about           → AboutUsPage
  /pricing         → PricingPage
  /how-it-works    → HowItWorksPage
  /contact         → ContactPage
  /login           → LoginPage
  /signup          → SignupPage
  /forgot-password → ForgotPasswordPage
```

### Landing Page Sections

```
User visits "/"
     │
     ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  HeroSection │───▶│ HowItWorks   │───▶│ Featured     │
│  • CTA       │    │ Section      │    │ Experts      │
│  • Trust bar │    │ • 3 steps    │    │ • Top rated  │
└─────────────┘    └──────────────┘    └──────────────┘
     │                                       │
     ▼                                       ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ Categories  │───▶│ Testimonials │───▶│ ExpertCta    │
│ Section     │    │ Section      │    │ Section      │
└─────────────┘    └──────────────┘    └──────────────┘
                                             │
                                             ▼
                                     ┌──────────────┐
                                     │ FinalCta +   │
                                     │ Footer       │
                                     └──────────────┘
```

All landing page data is currently static/mock content.

---

## 3. Module 2: Authentication Flow

### Email/Password Signup (2-Step)

```
CLIENT BROWSER                          BACKEND                         DB
─────────────                          ───────                         ──
     │                                     │                            │
     │  POST /api/auth/signup              │                            │
     │  {email, password, role, name}      │                            │
     │ ──────────────────────────────────▶ │                            │
     │                                     │  Creates PendingUser       │
     │                                     │  • BCrypt hashes password  │
     │                                     │  • Generates 6-digit OTP   │
     │                                     │  • BCrypt hashes OTP       │
     │                                     │ ────────────────────────▶  │ pending_users
     │                                     │                            │
     │                                     │  Sends OTP via Gmail SMTP  │
     │  ◀── {success, message}             │                            │
     │                                     │                            │
     │  POST /api/auth/verify-signup-otp   │                            │
     │  {email, otp}                       │                            │
     │ ──────────────────────────────────▶ │                            │
     │                                     │  Verifies OTP hash         │
     │                                     │  Creates User doc          │
     │                                     │  Sets JWT cookies          │
     │                                     │ ────────────────────────▶  │ users
     │  ◀── {success, redirectUrl}         │                            │
     │                                     │                            │
     │  Redirects to role-specific page    │                            │
     │  • CLIENT → /client-dashboard       │                            │
     │  • EXPERT → /expert/profile         │                            │
     │  • ADMIN  → /admin/dashboard        │                            │
```

### Google OAuth Flow

```
CLIENT BROWSER                          BACKEND                         DB
─────────────                          ───────                         ──
     │                                     │                            │
     │  Clicks "Sign in with Google"       │                            │
     │  Google returns JWT ID token        │                            │
     │                                     │                            │
     │  POST /api/auth/google-login        │                            │
     │  {credential: "<google_id_token>"}  │                            │
     │ ──────────────────────────────────▶ │                            │
     │                                     │  Verifies token with       │
     │                                     │  Google public keys        │
     │                                     │                            │
     │                                     │  ┌─ User exists?           │
     │                                     │  │ YES → Login, set JWT    │
     │                                     │  │ NO  → Return PENDING    │
     │                                     │  └───────────────────────▶ │ users
     │  ◀── {success, redirectUrl, role}   │                            │
     │                                     │                            │
     │  (if new user: role=PENDING)        │                            │
     │  POST /api/auth/complete-           │                            │
     │       google-registration           │                            │
     │  {email, firstName, lastName,       │                            │
     │   fullName, role}                   │                            │
     │ ──────────────────────────────────▶ │                            │
     │                                     │  Creates User, sets JWT    │
     │  ◀── {success, redirectUrl}         │                            │
```

### Login Flow

```
CLIENT BROWSER                          BACKEND                         DB
─────────────                          ───────                         ──
     │                                     │                            │
     │  POST /api/auth/login               │                            │
     │  {email, password}                  │                            │
     │ ──────────────────────────────────▶ │                            │
     │                                     │  Finds User by email       │
     │                                     │  ◀───────────────────────  │ users
     │                                     │  BCrypt.verify(password)   │
     │                                     │                            │
     │                                     │  ┌─ Match?                 │
     │                                     │  │ YES → Generate JWT      │
     │                                     │  │       Set cookies       │
     │                                     │  │       Set expert ONLINE │
     │                                     │  │ NO  → Return 401        │
     │                                     │  └───────────────────────▶ │ expert_profiles
     │  ◀── {success, redirectUrl, user}   │                            │
```

### GET /api/auth/me — Current User

Returns full user profile including:
- Basic: id, email, firstName, lastName, fullName, role, profileCompleted
- Extended: phoneNumber, alternatePhone, city, state, address, postalCode, profileImage
- Expert-specific: expertProfile data, isOnline/status, country
- Notification preferences

### POST /api/auth/heartbeat — Expert Presence

Called every 60s by the useHeartbeat hook. Updates `expert_profiles.lastActivityAt`. Status computed as:
- `lastActivityAt` within 2 min → ONLINE
- Has ACTIVE/CREATED session → BUSY
- Otherwise → OFFLINE

### Forgot Password (3-Step)

```
Step 1: POST /api/auth/forgot-password {email}
  → Backend generates OTP, sends via Gmail SMTP

Step 2: POST /api/auth/verify-reset-otp {email, otp}
  → Backend returns verified=true

Step 3: POST /api/auth/reset-password {email, otp, newPassword}
  → Backend updates password, returns success

Rate limits: 3 OTP requests per email per hour
OTP expiry: 10 minutes
```

### Token Refresh & Invalidation

```
POST /api/auth/refresh
  • Reads refreshToken from httpOnly cookie
  • Validates signature + expiry
  • Fetches current User.tokenVersion from DB
  • Rejects if token's version != current version (logged out elsewhere)
  • Issues new access + refresh token pair with current version

POST /api/auth/logout
  • Increments User.tokenVersion (invalidates ALL existing tokens)
  • Sets expert OFFLINE
  • Clears cookies (maxAge=0)
```

### User Profile Management (NEW)

```
GET    /api/users/profile                   → Get own full profile
PUT    /api/users/profile                   → Update own profile (name, phone, city, etc.)
PUT    /api/users/change-password           → Change password (requires current password)
GET    /api/users/notification-preferences  → Get notification settings
PUT    /api/users/notification-preferences  → Update notification settings
```

---

## 4. Module 3: Expert Profile Completion

### Flowchart

```
New EXPERT user signs up
     │
     ▼
Redirected to /expert/profile
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  PROFILE FORM (11+ required fields, 5 sections)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Section 1: Personal Information ──────────────────┐    │
│  │  • First Name*           • Last Name*              │    │
│  │  • Phone Number*         • Country* (dropdown)     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Section 2: Professional Information ──────────────┐    │
│  │  • Professional Title*   • Category* (dropdown)    │    │
│  │  • Sub Category* (multi) • Years of Experience*    │    │
│  │  • Languages* (multi)                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Section 3: Professional Bio ──────────────────────┐    │
│  │  • Bio* (min 20 chars)                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Section 4: Consultation Pricing ──────────────────┐    │
│  │  • Hourly Rate (₹)* — What the expert EARNS        │    │
│  │    Example: ₹1000/hr → Expert earns ₹1000/hr       │    │
│  │    Client sees ₹1200/hr (with 20% commission)      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Section 5: Profile Links ────────────────────────┐    │
│  │  • LinkedIn (optional)  • Portfolio (optional)     │    │
│  │  • GitHub (optional)                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Progress bar: real-time completion tracking (0-100%)      │
└─────────────────────────────────────────────────────────────┘
     │
     │  Form valid?
     │
┌────┴────┐
│ NO      │ YES
▼         ▼
Show    POST /api/expert/profile
errors  {firstName, lastName, country,
         professionalTitle, category,
         subCategory, yearsOfExperience,
         bio, hourlyRate, phoneNumber,
         languages, linkedIn?, portfolio?,
         github?}
         │
         ▼
┌─────────────────────────────┐
│  BACKEND:                   │
│  1. Creates/updates         │
│     ExpertProfile doc       │
│  2. Sets profileCompleted   │
│     = true on User          │
│  3. Sets isOnline = true    │
│  4. Sets lastActivityAt     │
│  5. Seeds custom subCategory│
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Success → /expert/dashboard│
└─────────────────────────────┘
```

### API Endpoints

```
POST   /api/expert/profile            → Create/update profile (EXPERT only)
GET    /api/expert/profile            → Get own expert profile (EXPERT only)
GET    /api/expert/profile/dropdowns  → Get dropdown options (EXPERT only)
GET    /api/expert/profile/status     → Check if profile completed (EXPERT only)
```

### Dropdown Data Pipeline

```
App Startup
     │
     ▼
MongoCollectionInitializer (CommandLineRunner)
     │
     ├── Creates MongoDB collections if not exist
     └── Seeds default dropdown definitions:
            • category     → ["Technology", "Business", "Health", ...]
            • subCategory  → [{parent: "Technology", value: "Web Dev"}, ...]
            • languages    → ["English", "Hindi", "Spanish", ...]
            • countries    → (from countries.json, 195 countries)
     │
     ▼
Frontend fetches via GET /api/expert/profile/dropdowns
     │
     ▼
Cached in dropdown-cache.ts (session-scoped)
     │
     ▼
ExpertProfileCompletion form renders dropdowns
• Category selection filters SubCategory options
• "Other (custom)" option for sub-category
• Language multi-select with search
```

---

## 5. Module 4: Expert Search & Discovery

### Flowchart

```
CLIENT visits /search-experts
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  SEARCH PAGE LAYOUT                                     │
│  ┌──────────────┐  ┌──────────────────────────────────┐│
│  │   FILTERS    │  │         RESULTS                  ││
│  │   SIDEBAR    │  │                                  ││
│  │              │  │  Sort: [Most Relevant ▾]         ││
│  │ Category ▾   │  │                                  ││
│  │ Sub Cat  ▾   │  │  ┌─────────┐ ┌─────────┐       ││
│  │ Rating   ▾   │  │  │ Expert   │ │ Expert   │       ││
│  │ Price    ▾   │  │  │ Card     │ │ Card     │       ││
│  │ Exp      ▾   │  │  │ • Name   │ │ • Name   │       ││
│  │ Language ▾   │  │  │ • Title  │ │ • Title  │       ││
│  │ Country  ▾   │  │  │ • Rating │ │ • Rating │       ││
│  │ Avail    ▾   │  │  │ • ₹/hr   │ │ • ₹/hr   │       ││
│  │              │  │  └─────────┘ └─────────┘       ││
│  └──────────────┘  │  Pagination: ◀ 1/5 ▶           ││
│                    └──────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
     │
     │  Any filter change triggers:
     ▼
GET /api/experts?q=&category=Technology&sort=Most+Relevant&page=0&size=12
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  BACKEND: ExpertSearchService.searchExperts()           │
│                                                         │
│  1. Query users collection: role=EXPERT,                │
│     profileCompleted=true                               │
│                                                         │
│  2. Query expert_profiles with Criteria:                │
│     • userId IN validUserIds                            │
│     • category = "Technology" (exact match)             │
│     • country = "India" (exact match)                   │
│     • languages regex match                             │
│     • yearsOfExperience range filter                    │
│     • hourlyRate range filter                           │
│                                                         │
│  3. MongoDB sort (price, experience)                    │
│                                                         │
│  4. Post-query processing:                              │
│     • Text search filter (name, title, category)        │
│     • Availability filter (Online/Offline)              │
│     • Heartbeat-based online status computation         │
│       → lastActivityAt within 2 min = ONLINE            │
│       → has ACTIVE/CREATED session = BUSY               │
│                                                         │
│  5. In-memory sort:                                     │
│     • Most Relevant: online first, then by name         │
│     • Highest Rated: rating desc, online first          │
│                                                         │
│  6. Pricing: getClientHourlyRate(expertHourlyRate)      │
│     → adds commission (configurable, default 20%)       │
│                                                         │
│  7. Paginate: page * size → (page+1) * size             │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Response: ExpertSearchPageResponse
{
  experts: [ExpertSummary, ...],
  totalElements: 45,
  totalPages: 4,
  currentPage: 0,
  pageSize: 12
}
```

### Expert Card Display

```
┌──────────────────────────────────────┐
│  [ONLINE] badge                      │
│                                      │
│  Dr. Priya Sharma                    │
│  Senior Business Consultant          │
│                                      │
│  Category: Business                  │
│  Sub Category: Strategy Consulting   │
│  Experience: 12 years                │
│  Country: India                      │
│                                      │
│  [English] [Hindi] [Spanish]         │
│                                      │
│  ★ 4.8 (127 reviews)    ₹1,200/hr  │
│                                      │
│  [View Profile]  [Connect Now]       │
└──────────────────────────────────────┘

Pricing Display:
  • Expert's base rate: ₹1,000/hr (NOT shown to client)
  • Client sees:        ₹1,200/hr (includes commission)
```

### Search API Endpoints

```
GET  /api/experts          → Search/filter/paginate experts (authenticated)
GET  /api/experts/{id}     → Get single expert public profile
GET  /api/experts/filters  → Get dropdown filter options
```

---

## 6. Module 5: Expert Profile View

### Flowchart

```
CLIENT clicks "View Profile" on Expert Card
     │
     ▼
Navigate to /expert-profile/:expertId
     │
     ▼
GET /api/experts/{expertId}
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  EXPERT PROFILE VIEW                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [ONLINE]                                        │   │
│  │  Dr. Priya Sharma                                │   │
│  │  Senior Business Consultant                      │   │
│  │  [Business] [Strategy Consulting]                 │   │
│  │                                                  │   │
│  │  [Connect Now]                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐     │
│  │ 12 yrs │ │ ₹1,200/hr│ │4.8 / 5 │ │127       │     │
│  │ Exp    │ │ Hourly   │ │ Rating │ │ Reviews  │     │
│  └────────┘ └──────────┘ └────────┘ └──────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Profile Summary / Bio                           │   │
│  │  📍 India    🗣 English, Hindi, Spanish          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Client Reviews (127)                            │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │ 👤 Rahul M.         ★★★★★  5/5              │ │   │
│  │  │ "Excellent session..."                       │ │   │
│  │  │ Jan 15, 2026                                 │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  │  [See All Reviews]                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Module 6: Video Call Flow

### Complete Video Call Flowchart

```
CLIENT                               EXPERT
──────                               ──────
   │                                    │
   │  1. Clicks "Connect Now"           │
   │  POST /api/video-call/request      │
   │  {expertId}                        │
   │ ──────────────────────────────▶    │
   │                                    │
   │  2. Socket.IO: call-request ──────▶│  Receives "incoming-call"
   │     {callRequestId, clientName,    │  event via WebSocket
   │      clientId, expertId}           │
   │                                    │
   │                                    │  3. Expert decides:
   │                                    │  ┌──────────┬──────────┐
   │                                    │  │ ACCEPT   │ REJECT   │
   │                                    │  └──────────┴──────────┘
   │                                    │       │          │
   │  4a. Socket: call-status-update ◀──│───────┘          │
   │      {action: "ACCEPT", roomId}    │                  │
   │                                    │                  │
   │  5. Join Socket.IO room            │  5. Join Socket.IO room
   │     (roomId)                       │     (roomId)
   │                                    │
   │  ╔══════════════════════════════════════════════╗     │
   │  ║         WebRTC SIGNALING (via Socket.IO)     ║     │
   │  ╠══════════════════════════════════════════════╣     │
   │  ║                                              ║     │
   │  ║  6a. Client creates RTCPeerConnection        ║     │
   │  ║  6b. Client creates SDP offer                ║     │
   │  ║  6c. Client emits "offer" ──────────────────▶║     │
   │  ║                                              ║     │
   │  ║  7a. Expert receives offer                   ║     │
   │  ║  7b. Expert creates SDP answer               ║     │
   │  ║  7c. Expert emits "answer" ─────────────────▶║     │
   │  ║                                              ║     │
   │  ║  8. ICE candidates exchanged                 ║     │
   │  ║     • Both peers gather ICE candidates       ║     │
   │  ║     • Exchange via "ice-candidate" events    ║     │
   │  ║     • STUN servers for NAT traversal          ║     │
   │  ║                                              ║     │
   │  ║  9. P2P media connection established         ║     │
   │  ╚══════════════════════════════════════════════╝     │
   │                                    │
   │  10. Interaction created            │
   │      Status: FREE_SESSION           │
   │      5-min free trial begins        │
   │                                    │
   │  ╔══════════════════════════════════════════════╗     │
   │  ║         CALL UI FEATURES                     ║     │
   │  ╠══════════════════════════════════════════════╣     │
   │  ║  • Video toggle (camera on/off)              ║     │
   │  ║  • Audio toggle (mic mute/unmute)            ║     │
   │  ║  • Screen sharing                            ║     │
   │  ║  • Fullscreen mode                           ║     │
   │  ║  • In-call chat (Socket.IO relay)            ║     │
   │  ║  • Network quality indicator                 ║     │
   │  ║  • Self-view (draggable PiP)                 ║     │
   │  ║  • Session timer badge                       ║     │
   │  ║  • Auto-hide controls (4s timeout)           ║     │
   │  ╚══════════════════════════════════════════════╝     │
   │                                    │
   │  4b. Socket: call-status-update ◀──│──────────────────┘
   │      {action: "REJECT",            │
   │       rejectReason: "Busy"}        │
   │                                    │
   │  Shows "Request Declined" modal    │
   │                                    │
   │  11. Either party clicks            │  11. Either party clicks
   │      "End Call"                     │      "End Call"
   │                                    │
   │  Socket: end-call ────────────────▶│
   │  Socket: notify-call-ended ───────▶│
   │  POST /api/video-call/end           │
   │  {callRequestId}                    │
   │                                    │
   │  12. Navigate to /call-completed    │  12. Navigate to /call-completed
   │      (client rating view)           │      (earnings summary view)
```

### Signaling Server Architecture (Hardened)

```
┌─────────────────────────────────────────────────────────────┐
│           SIGNALING SERVER (server.js — 571 lines)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JWT AUTHENTICATION (NEW):                                  │
│  • Verifies HMAC-SHA256/384/512 JWT signatures              │
│  • Reads token from:                                        │
│    1. Payload token field                                   │
│    2. httpOnly accessToken cookie from Socket.IO handshake  │
│  • Validates email/identity match                           │
│  • Dev fallback: accepts without verification when          │
│    JWT_SECRET not set (with security warning)               │
│                                                             │
│  RATE LIMITING (NEW):                                       │
│  • 30 events per 10-second window per socket                │
│  • Per-event-type tracking                                  │
│  • Auto-cleanup of stale trackers every 30s                 │
│                                                             │
│  IN-MEMORY STATE MAPS:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ connectedUsers:      Map<socketId, UserData>        │   │
│  │ userSocketsByEmail:  Map<email, Set<socketId>>     │   │
│  │ userSocketsByUserId: Map<userId, Set<socketId>>    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  SOCKET.IO EVENTS:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ register-user      → JWT-verified identity binding  │   │
│  │ call-request       → Routes to expert's sockets     │   │
│  │ call-response      → Routes back to client          │   │
│  │ notify-call-ended  → Notifies both parties          │   │
│  │ join-room          → Joins WebRTC signaling room    │   │
│  │ offer/answer       → Relays WebRTC SDP              │   │
│  │ ice-candidate      → Relays ICE candidates          │   │
│  │ end-call           → Relays call-ended to room      │   │
│  │ send-chat-message  → Relays chat to room            │   │
│  │ disconnect         → Cleans all 3 state maps        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  GRACEFUL SHUTDOWN (NEW):                                   │
│  • SIGTERM/SIGINT handlers                                  │
│  • Notifies all connected clients (server-shutdown event)   │
│  • Closes HTTP server, then Socket.IO                       │
│  • 10s force-exit timeout                                   │
│                                                             │
│  SECURITY HEADERS: Helmet 8 with CSP, HSTS                  │
│  CORS Origins: localhost:5173, 3000, 5174, 5175, 8081      │
│  Port: 5000                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Video Call API Endpoints

```
POST   /api/video-call/request                    → Client creates call request
POST   /api/video-call/respond                    → Expert accepts/rejects
GET    /api/video-call/status/{callRequestId}     → Poll call status
GET    /api/video-call/pending/{expertId}         → Expert checks pending calls
GET    /api/video-call/latest                     → Client gets latest call
POST   /api/video-call/end                        → End a call
POST   /api/video-call/rating                     → Submit post-call rating & review
GET    /api/video-call/history                    → Get call history
GET    /api/video-call/session/{callRequestId}    → Get interactionId for a call
GET    /api/video-call/pending-feedback/{email}   → Get completed calls without review
GET    /api/video-call/expert/{userId}/email      → Get expert email by userId
POST   /api/video-call/expert/{userId}/status     → Set expert status (BUSY/ONLINE)
```

### Rating Immutability (NEW)

```
POST /api/video-call/rating
  • One rating per session (callRequestId)
  • Once submitted, rating is IMMUTABLE
  • Re-submission attempts are rejected
  • Rating updates expert_profiles.averageRating + totalReviews
```

---

## 8. Module 7: Payment Flow

### Complete Payment Flowchart

```
CLIENT                                EXPERT
──────                                ──────
   │                                     │
   │  FREE_SESSION (5 min) begins        │
   │  Session timer visible              │  Can recommend duration
   │                                     │
   │  ◀──────────────────────────────────│  POST /api/payments/recommend
   │     Expert recommends 30 min        │  {interactionId,
   │                                     │   recommendedDurationMinutes}
   │                                     │
   │  FREE_SESSION → PAYMENT_PENDING     │
   │                                     │
   │  Payment Sidebar opens              │
   │  ┌─────────────────────────┐       │
   │  │ Select Duration:        │       │
   │  │ ┌──────┐ ┌──────┐      │       │
   │  │ │15 min│ │30 min│ [Rec] │       │
   │  │ │₹300  │ │₹600  │      │       │
   │  │ └──────┘ └──────┘      │       │
   │  │ ┌──────┐ ┌──────┐      │       │
   │  │ │45 min│ │60 min│      │       │
   │  │ │₹900  │ │₹1200 │      │       │
   │  │ └──────┘ └──────┘      │       │
   │  │ Consultation Fee: ₹600 │       │
   │  │ [Continue & Pay ₹600]  │       │
   │  └─────────────────────────┘       │
   │                                     │
   │  Clicks "Continue & Pay"            │
   │                                     │
   │  ┌──────────────────────────────┐  │
   │  │  POST /api/payments/         │  │
   │  │       create-order           │  │
   │  │  {interactionId,             │  │
   │  │   durationMinutes: 30,       │  │
   │  │   type: "INITIAL"}           │  │
   │  │  Header: X-Idempotency-Key   │  │
   │  └──────────────────────────────┘  │
   │           │                         │
   │           ▼                         │
   │  ┌──────────────────────────────┐  │
   │  │  BACKEND: PricingService     │  │
   │  │  expertAmount    = ₹500      │  │
   │  │  commissionAmount = ₹100     │  │
   │  │  clientAmount     = ₹600     │  │
   │  │                              │  │
   │  │  Razorpay Order:             │  │
   │  │  • amount: 60000 (paise)     │  │
   │  │  • currency: INR             │  │
   │  │  • receipt: rcpt_xxx         │  │
   │  └──────────────────────────────┘  │
   │           │                         │
   │           ▼                         │
   │  ┌──────────────────────────────┐  │
   │  │  RAZORPAY CHECKOUT MODAL     │  │
   │  │  • Card / UPI / NetBanking   │  │
   │  └──────────────────────────────┘  │
   │           │                         │
   │     ┌─────┴─────┐                   │
   │  SUCCESS     DISMISSED              │
   │     │           │                   │
   │     ▼           ▼                   │
   │  ┌────────┐  Payment                │
   │  │ VERIFY │  cancelled              │
   │  └────────┘                         │
   │     │                               │
   │     │  POST /api/payments/verify    │
   │     │  {interactionId,              │
   │     │   razorpayPaymentId,          │
   │     │   razorpayOrderId,            │
   │     │   razorpaySignature}          │
   │     │                               │
   │     ▼                               │
   │  ┌──────────────────────────────┐  │
   │  │  BACKEND:                    │  │
   │  │  1. HMAC-SHA256 verify       │  │
   │  │     signature                │  │
   │  │  2. Update Interaction:      │  │
   │  │     status → PAID_SESSION    │  │
   │  │     paymentStatus → HELD     │  │
   │  │     paidSessionEndsAt =      │  │
   │  │       now + 30min            │  │
   │  │  3. Create SessionPayment    │  │
   │  │  4. Socket: payment-completed│  │
   │  └──────────────────────────────┘  │
   │           │                         │
   │           ▼                         │
   │  PAID_SESSION starts                │
   │                                     │
   │  ═══════════════════════════════    │
   │  EXTENSION FLOW (optional)          │
   │  ═══════════════════════════════    │
   │                                     │
   │  When < 5 min remaining:            │
   │  ExtendSessionPrompt appears        │
   │                                     │
   │  POST /api/payments/extend          │
   │  POST /api/payments/extend-verify   │
   │  → Adds time, accumulates totalPaid │
```

### Webhook Defense-in-Depth (NEW)

```
POST /api/webhooks/razorpay (NO AUTH — HMAC verified)
  • Razorpay sends server-to-server webhook on payment.captured
  • HMAC-SHA256 signature verified against webhook secret
  • Idempotent processing (duplicate-safe)
  • Catches edge cases where client disconnects before verify call
```

### Payment API Endpoints

```
POST   /api/payments/create-order      → Create Razorpay order (idempotent)
POST   /api/payments/verify            → Verify client-side payment signature
POST   /api/payments/extend            → Create extension order
POST   /api/payments/extend-verify     → Verify extension payment
POST   /api/payments/recommend         → Expert recommends duration
GET    /api/payments/session-state/{id} → Poll session timer state
GET    /api/payments/history           → Payment history (future)
```

---

## 9. Module 8: Session Lifecycle & Timer

### Session State Machine (10 States)

```
                      ┌──────────┐
                      │ CREATED  │ ← Call request created
                      └────┬─────┘
                           │ Expert accepts
                           ▼
                      ┌──────────┐
                      │  ACTIVE  │ ← Interaction created (legacy)
                      └────┬─────┘
                           │
                      ┌────┴────┐
                      ▼         ▼
                 ┌────────┐  ┌──────────────┐
                 │FREE    │  │FREE_SESSION  │ ← 5-min free trial
                 │SESSION │  │_EXPIRED      │    Auto-expires at 0
                 └───┬────┘  └──────────────┘
                     │
                     │ Expert recommends duration
                     ▼
                ┌───────────────┐
                │PAYMENT_PENDING│ ← Waiting for client payment
                └───────┬───────┘
                        │ Client pays
                        ▼
                ┌───────────────┐
                │PAYMENT_VERIFIED│ ← Signature verified
                └───────┬───────┘
                        │
                        ▼
                ┌──────────────┐
                │PAID_SESSION  │ ← Paid time ticking
                └──────┬───────┘
                       │
                  ┌────┴────┐
                  ▼         ▼
            ┌─────────┐  ┌──────────┐
            │COMPLETED│  │CANCELLED │ ← End call / payment fail
            └─────────┘  └──────────┘
                  │
                  ▼
            ┌──────────┐
            │ REFUNDED │ (future)
            └──────────┘
```

### Timer Management

```
FRONTEND (useSessionTimer hook):
┌─────────────────────────────────────────────────────────┐
│  Polls GET /api/payments/session-state/{interactionId}  │
│  every 2 seconds + local 1-second countdown tick        │
│                                                         │
│  Returns SessionTimerState:                             │
│  • phase: FREE_SESSION / PAYMENT_PENDING / PAID_SESSION │
│  • freeTrialRemainingSec: countdown from 300            │
│  • paidSessionRemainingSec: countdown from purchased    │
│  • isWarning: freeTrialRemainingSec <= 60               │
│  • isDanger:  freeTrialRemainingSec <= 30               │
│  • showExtendPrompt: paidRemaining <= 300 && > 0       │
└─────────────────────────────────────────────────────────┘

BACKEND (SessionStateService):
┌─────────────────────────────────────────────────────────┐
│  getSessionState():                                     │
│                                                         │
│  Free Trial:                                            │
│  • Calculates remaining = freeTrialEndsAt - now         │
│  • Auto-expires when remaining <= 0                     │
│                                                         │
│  Paid Session:                                          │
│  • Calculates remaining = paidSessionEndsAt - now       │
│  • Auto-completes when remaining <= 0                   │
│  • Calls ExpertEarningService.processEarning()          │
│                                                         │
│  Configurable:                                          │
│  • session.free-trial-seconds = 300                     │
│  • session.extend-prompt-seconds = 300                  │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Module 9: Client Dashboard & Profile

### Dashboard Layout

```
CLIENT visits /client-dashboard
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  CLIENT DASHBOARD (DashboardLayout wrapper)              │
│                                                         │
│  SIDEBAR:                    MAIN CONTENT:              │
│  ┌──────────────┐           ┌─────────────────────────┐│
│  │ Dashboard    │◀ active   │ Welcome back, [Name]!    ││
│  │ Search       │           │                          ││
│  │ My Sessions  │           │ ┌──────┐ ┌──────┐      ││
│  │ Profile      │           │ │Online│ │Top   │      ││
│  │ Settings     │           │ │Now   │ │Rated │      ││
│  └──────────────┘           │ └──────┘ └──────┘      ││
│                             │                          ││
│                             │ Pending Feedback:        ││
│                             │ Recent Activity          ││
│                             └─────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Client Routes

```
/client-dashboard          → Dashboard home
/search-experts            → Expert search & discovery
/my-sessions               → Session history
/client-profile            → Edit own profile
/settings                  → Client settings
/expert-profile/:expertId  → View expert public profile
```

### Client Profile Page

```
GET  /api/users/profile    → Get profile
PUT  /api/users/profile    → Update profile

Fields editable by client:
  • firstName, lastName
  • phoneNumber, alternatePhone
  • city, state, address, postalCode
  • profileImage
```

### Client Settings Page

```
Settings tabs:
  • Security: Change password (PUT /api/users/change-password)
  • Notifications: Toggle preferences (GET/PUT /api/users/notification-preferences)
  • Account: View account details
```

---

## 11. Module 10: Expert Dashboard & Profile

### Dashboard Layout

```
EXPERT visits /expert/dashboard
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  EXPERT DASHBOARD (uses ExpertEarningsPage component)    │
│                                                         │
│  SIDEBAR:                    MAIN CONTENT:              │
│  ┌──────────────┐           ┌─────────────────────────┐│
│  │ Dashboard    │◀ active   │ Earnings Overview        ││
│  │ My Profile   │           │ ┌──────┐ ┌──────┐      ││
│  │ Sessions     │           │ │Avail │ │Pend  │      ││
│  │ Settings     │           │ │Bal   │ │Bal   │      ││
│  └──────────────┘           │ └──────┘ └──────┘      ││
│                             │ ┌──────┐ ┌──────┐      ││
│                             │ │L/time│ │Avg   │      ││
│                             │ │Earn  │ │Rate  │      ││
│                             │ └──────┘ └──────┘      ││
│                             │                          ││
│                             │ Earnings History Table   ││
│                             └─────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Expert Routes (UPDATED)

```
/expert/profile       → Profile completion/edit page
/expert/dashboard     → Earnings dashboard (home)
/expert/sessions      → Session management
/expert/settings      → Security, notifications, account
```

> **Note:** The old Availability and Messages nav items have been removed. The expert dashboard now focuses on earnings + sessions + settings.

### Expert Presence

```
Heartbeat: POST /api/auth/heartbeat (every 60s, via useHeartbeat hook)
  → Updates expert_profiles.lastActivityAt

Status computation:
  • lastActivityAt within 2 min → ONLINE
  • Has ACTIVE/CREATED session → BUSY
  • Otherwise → OFFLINE (auto-offline on heartbeat gap)

On accept call → BUSY, on end call → ONLINE, on logout → OFFLINE
```

---

## 12. Module 11: Expert Earnings

### Flowchart

```
EXPERT visits /expert/dashboard (also /expert/earnings legacy)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  EARNINGS PAGE (ExpertEarningsPage)                      │
│                                                         │
│  OVERVIEW CARDS:                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │Available │ │ Pending  │ │ Lifetime │               │
│  │Balance   │ │ Balance  │ │ Earnings │               │
│  │ ₹45,000  │ │ ₹15,000  │ │ ₹60,000  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐                              │
│  │  Total   │ │ Average  │                              │
│  │ Sessions │ │ Rating   │                              │
│  │   42     │ │ 4.8/5.0  │                              │
│  └──────────┘ └──────────┘                              │
│                                                         │
│  TABS: [Overview] [Pending] [Available] [History]      │
│                                                         │
│  FILTERS: Search | Status | From Date | To Date        │
│                                                         │
│  TABLE (paginated):                                     │
│  Date | Client | Duration | Your Earning | Status      │
└─────────────────────────────────────────────────────────┘

EARNING LIFECYCLE:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Session Completes → ExpertEarningService.processEarning()│
│       │                                                 │
│       ├── Idempotency check: interactionId unique        │
│       ├── Guard: totalPaidAmount > 0                    │
│       ├── Guard: paymentStatus == HELD                  │
│       │                                                 │
│       ▼                                                 │
│  Create ExpertEarning document:                          │
│  {                                                      │
│    expertId, interactionId,                              │
│    clientPaidAmount (hidden from expert UI),             │
│    platformCommissionPercent (hidden),                   │
│    platformFee (hidden),                                 │
│    expertEarningAmount ← what the expert sees,           │
│    status: PENDING                                       │
│  }                                                      │
│       │                                                 │
│       ▼                                                 │
│  Status transitions:                                     │
│  PENDING → AVAILABLE (after settlement period)           │
│  AVAILABLE → WITHDRAWN (after expert withdraws)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Earnings API Endpoints

```
GET    /api/expert/earnings/summary       → Aggregated earnings summary
GET    /api/expert/earnings/history       → Paginated history (filters: status, date, search)
GET    /api/expert/earnings/{earningId}   → Single earning detail
POST   /api/expert/earnings/migrate       → Trigger retroactive migration (dev/admin)
```

---

## 13. Module 12: Admin Portal (NEW — Fully Implemented)

### Admin Routes

```
/admin/dashboard       → Overview stats & recent activity
/admin/experts         → Expert management (list, search, view)
/admin/clients         → Client management (list, search, view)
/admin/consultations   → All consultation sessions
/admin/payments        → All payment transactions
/admin/reports         → Platform analytics & reports
/admin/settings        → Platform configuration
```

### Admin Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD                                        │
│                                                         │
│  STAT CARDS:                                            │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Total  │ │ Total  │ │   Total   │ │  Total   │     │
│  │ Users  │ │Experts │ │Consultations│ │Payments  │     │
│  └────────┘ └────────┘ └──────────┘ └──────────┘     │
│                                                         │
│  RECENT ACTIVITY:                                       │
│  • Latest 5 users                                       │
│  • Latest experts                                       │
│  • Latest consultations                                 │
│  • Latest payments                                      │
└─────────────────────────────────────────────────────────┘
```

### Admin API Endpoints (All require ADMIN role)

```
GET    /api/admin/dashboard       → Dashboard stats overview
GET    /api/admin/users           → All users (paginated)
GET    /api/admin/users/recent    → Recent N users
GET    /api/admin/clients         → All clients (paginated)
GET    /api/admin/experts         → All experts (paginated)
GET    /api/admin/consultations   → All consultations (paginated)
GET    /api/admin/payments        → All payments (paginated)
```

### Admin Security

```
• @PreAuthorize("hasRole('ADMIN')") on all admin endpoints
• Admin account auto-created via AdminInitializer on startup
• Admin credentials: ADMIN_EMAIL + ADMIN_PASSWORD env vars
• All admin API calls logged with AUDIT: prefix
• AuditService records admin actions to audit_entries collection
```

---

## 14. Module 13: Notifications & Chat

### Notification System

```
NOTIFICATION TYPES:
┌─────────────────────────────────────────────────────────┐
│  • CHAT: In-call chat messages                           │
│  • VIDEO_CALL: Call requests, accept/reject responses    │
└─────────────────────────────────────────────────────────┘

STORAGE:
  • Signaling server writes to MongoDB `notifications` collection
  • Backend NotificationController reads via REST API
  • GET /api/notifications — paginated notifications
  • GET /api/notifications/unread-count — badge count

CLIENT-SIDE:
  • SocketContext: manages Socket.IO connection
  • IncomingCallPopup: overlays expert dashboard for incoming calls
  • In-call chat: real-time messages via signaling server relay
  • NotificationsPage: fetches from REST API, shows history with read/unread states
  • NotificationBell: links to /notifications (no more 404)

NOTIFICATION PREFERENCES:
  • NotificationPreferences model per-user
  • GET/PUT /api/users/notification-preferences
```

### In-Call Chat Flow

```
Client types message in VideoCallPage chat panel
     │
     ▼
socket.emit("send-chat-message", {roomName, message})
     │
     ▼
Signaling server relays to room (socket.to(roomName))
  • Rate-limited: 30 events/10s per socket
  • Message truncated to 5000 chars
     │
     ▼
Expert receives "chat-message" event
  → Web Worker (chat.worker.ts) deduplicates
  → Renders in chat panel
```

---

## 15. Module 14: Pricing Calculation System

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                PRICING SYSTEM ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  BACKEND: PricingService.java                           │
  │  (Single source of truth for all calculations)          │
  │                                                         │
  │  @Value("${platform.commission.percent:20}")            │
  │  private double commissionPercent;                      │
  │                                                         │
  │  METHODS:                                               │
  │  • calculate(rate, mins) → PriceBreakdown               │
  │  • getClientHourlyRate(rate) → rate × (1 + commission) │
  │  • deriveExpertAmount(clientPaid) → client / (1 + comm)│
  │  • deriveCommissionAmount(clientPaid) → client - expert │
  │  • getCommissionPercent() → configurable %              │
  └─────────────────────────────────────────────────────────┘
           │
           │ Used by:
           ├── PaymentService (Razorpay order amount)
           ├── ExpertEarningService (earnings calculation)
           ├── ExpertSearchService (search result pricing)
           ├── ExpertProfileService (profile pricing)
           └── SessionStateService (session state pricing)
           │
           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  FRONTEND: lib/pricing.ts                               │
  │  (Mirrors backend formula for display consistency)      │
  └─────────────────────────────────────────────────────────┘

  CONFIGURABLE SETTINGS:
  • platform.commission.percent = 20 (via PLATFORM_COMMISSION_PERCENT env)
  • pricing.rate-change-days = 14 (rate change cooldown)
```

### Pricing Formula

```
Expert sets: hourlyRate = ₹1000/hr (what they EARN)

Platform Commission: 20% (configurable)

Formula:
  expertAmount    = hourlyRate × (minutes / 60)
  commissionAmount = expertAmount × (commissionPercent / 100)
  clientAmount     = expertAmount + commissionAmount

Example (30 min):
  expertAmount    = 1000 × 0.5 = ₹500  (expert earns)
  commissionAmount = 500 × 0.2  = ₹100  (platform cut)
  clientAmount     = 500 + 100   = ₹600  (client pays)

WHAT EACH ROLE SEES:
  CLIENT:  ₹600 Consultation Fee
  EXPERT:  ₹500 You Earned
  ADMIN:   Client ₹600 | Expert ₹500 | Platform ₹100
```

### Payment Resilience (NEW)

```
Resilience4j Circuit Breaker + Retry:
  • Circuit breaker: 50% failure threshold, 30s open, sliding window 10
  • Retry: 3 attempts, 1s initial wait, exponential backoff ×2
  • Idempotency keys on all create-order calls
  • Webhook as defense-in-depth for missed client verifications
```

---

## 16. Module 15: Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 1: TRANSPORT                                         │
│  • HTTPS in production (Secure cookies)                     │
│  • HSTS (max-age=1yr, includeSubDomains)                    │
│  • CSP headers (configurable)                               │
│                                                             │
│  LAYER 2: CORS                                              │
│  • Strict origin whitelist (no wildcard in production)      │
│  • Credentials allowed for httpOnly cookies                 │
│  • Preflight cached for 1 hour                              │
│                                                             │
│  LAYER 3: AUTHENTICATION                                    │
│  • JWT in httpOnly + Secure + SameSite=Strict cookies       │
│  • BCrypt strength 12 for passwords                         │
│  • OTP with BCrypt hashing + rate limiting (3/hr)           │
│  • Token version for session invalidation                   │
│  • JWT also verified by signaling server                    │
│                                                             │
│  LAYER 4: AUTHORIZATION                                     │
│  • @PreAuthorize role checks on controllers                 │
│  • JwtAuthenticationFilter sets SecurityContext              │
│  • Route protection in frontend (ProtectedRoute)            │
│  • Profile completion gate for expert routes                │
│                                                             │
│  LAYER 5: RATE LIMITING                                     │
│  • Backend: Bucket4j + RateLimiterFilter                    │
│  • Signaling: 30 events/10s per socket                      │
│  • OTP: 3 requests/hour per email                           │
│                                                             │
│  LAYER 6: PAYMENT SECURITY                                  │
│  • Razorpay HMAC-SHA256 signature verification              │
│  • Webhook signature verification (separate secret)         │
│  • Idempotency keys prevent double-charge                   │
│  • Resilience4j circuit breaker for gateway failures        │
│                                                             │
│  LAYER 7: DATA PROTECTION                                   │
│  • Passwords: BCrypt (strength 12)                          │
│  • OTPs: BCrypt hashed in DB                                │
│  • Secrets: NEVER in code — env vars / AWS Secrets Manager  │
│  • SecretsValidationRunner: validates on startup            │
│                                                             │
│  LAYER 8: AUDIT                                             │
│  • AuditService logs admin actions                          │
│  • audit_entries collection in MongoDB                      │
│  • All admin API access logged                              │
└─────────────────────────────────────────────────────────────┘
```

### Security Configuration Files

```
SecurityConfig.java           → Spring Security (CORS, JWT filter, BCrypt)
JwtAuthenticationFilter.java  → Token extraction + validation
JwtEntryPoint.java            → 401 handling
SecurityHeadersFilter.java    → HSTS, CSP, XSS, content-type headers
RateLimiterFilter.java        → In-memory Bucket4j rate limiting
ResilienceConfig.java         → Circuit breaker + retry for payments
SecretsValidationRunner.java  → Startup validation of required secrets
```

### Cookie Security

```
accessToken cookie:
  HttpOnly: true
  Secure: true (configurable; false for local HTTP dev)
  Path: /
  SameSite: Strict
  Max-Age: 15 min

refreshToken cookie:
  HttpOnly: true
  Secure: true (configurable)
  Path: /
  SameSite: Strict
  Max-Age: 7 days
```

---

## 17. Module 16: AWS Infrastructure & Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS CLOUD ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route 53 / CloudFront (CDN)                          │  │
│  │  └── S3 Bucket (SPA static assets)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Gateway                                           │  │
│  │  ├── HTTP API → Lambda (Spring Boot backend)          │  │
│  │  └── WebSocket API → Lambda (Node.js signaling)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AWS Lambda                                            │  │
│  │  ├── flyhigh-backend (Java 21, SnapStart enabled)     │  │
│  │  └── flyhigh-signaling (Node.js 22)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DynamoDB                                              │  │
│  │  ├── connections table (WebSocket connections)        │  │
│  │  │   GSI: email-index, userId-index                   │  │
│  │  └── rooms table (WebSocket rooms, TTL 24h)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AWS Secrets Manager                                   │  │
│  │  └── flyhigh/{env}/credentials                        │  │
│  │      (MongoDB URI, JWT secret, Razorpay keys, etc.)   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CI/CD: GitHub Actions → deploy.yml                    │  │
│  │  └── CDK deploy to AWS                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure as Code (CDK)

```
flyhigh2.0/infra/
├── lib/
│   ├── app-stack.ts        → Lambda, API Gateway, IAM roles
│   └── platform-stack.ts   → DynamoDB, shared resources
├── cdk.json
├── package.json
└── package-lock.json
```

### Deployment Scripts

```
scripts/
├── populate-secrets.sh     → Push secrets to AWS Secrets Manager
├── setup-oidc.sh           → Configure GitHub OIDC for AWS
└── start-dev.ps1           → Local dev startup script
```

### Lambda Handler

```
flyhigh-backend:
  • StreamLambdaHandler (Spring Boot on Lambda)
  • SnapStart enabled for fast cold starts
  • Reads secrets from AWS Secrets Manager

flyhigh-signaling:
  • lambda.handler (API Gateway WebSocket events)
  • $connect → JWT auth + DynamoDB registration
  • $disconnect → cleanup + room notification
  • $default → action-based message routing
  • DynamoDB state (connections + rooms tables)
```

---

## MongoDB Collections Map

```
┌─────────────────────────────────────────────────────────────┐
│                 MONGODB COLLECTIONS (13)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  users                  Registered users (all 3 roles)      │
│  ├── email (unique), password (BCrypt)                      │
│  ├── role (CLIENT/EXPERT/ADMIN)                             │
│  ├── profileCompleted, tokenVersion                         │
│  ├── firstName, lastName, phoneNumber, profileImage         │
│  ├── city, state, address, postalCode                       │
│  └── notificationPreferences (embedded)                     │
│                                                             │
│  pending_users          Incomplete signups (OTP pending)     │
│  ├── email (unique), otpHash (BCrypt)                       │
│  └── TTL index on createdAt                                 │
│                                                             │
│  expert_profiles        Expert professional details         │
│  ├── userId (unique), expertHourlyRate                       │
│  ├── isOnline, lastActivityAt, status                       │
│  ├── professionalTitle, category, subCategory               │
│  ├── yearsOfExperience, bio, languages                      │
│  ├── country, phoneNumber                                   │
│  ├── linkedIn, portfolio, github                            │
│  └── averageRating, totalReviews                            │
│                                                             │
│  call_requests          Call initiation records             │
│  ├── clientId / expertId                                    │
│  ├── status (PENDING→ACCEPTED→REJECTED→COMPLETED)          │
│  ├── rating / review / interactionId                        │
│  └── clientName / expertName                                │
│                                                             │
│  interactions           Active & completed sessions         │
│  ├── clientId / expertId                                    │
│  ├── status (SessionStatus enum — 10 states)                │
│  ├── totalPaidAmount / expertAmount / commissionAmount      │
│  ├── rateSnapshot (hourly rate at session time)             │
│  └── freeTrialEndsAt / paidSessionEndsAt                    │
│                                                             │
│  session_payments       Razorpay transaction records        │
│  ├── interactionId                                          │
│  ├── amount / expertAmount / commissionAmount               │
│  ├── type (INITIAL/EXTENSION)                               │
│  └── razorpayPaymentId / razorpayOrderId                    │
│                                                             │
│  expert_earnings        Expert earning per session (NEW)     │
│  ├── expertId / interactionId (unique compound)             │
│  ├── clientPaidAmount / platformFee / expertEarningAmount   │
│  ├── platformCommissionPercent                              │
│  └── status (PENDING/AVAILABLE/WITHDRAWN)                   │
│                                                             │
│  payouts                Withdrawal records                  │
│  ├── expertId / idempotencyKey (unique)                     │
│  └── payoutAmount / status (PROCESSED/FAILED)               │
│                                                             │
│  reviews                Client ratings & feedback           │
│  ├── sessionId / clientId / expertId                        │
│  └── rating (1-5) / feedback (immutable after submit)      │
│                                                             │
│  audit_entries          Admin action audit log (NEW)         │
│  ├── timestamp / action / adminEmail                        │
│  └── target / details                                       │
│                                                             │
│  dropdown_definitions   Dynamic dropdown options            │
│  ├── key (unique): category, subCategory, languages         │
│  └── options[]                                              │
│                                                             │
│  password_reset_otps    Password reset OTP records          │
│  ├── email / otpHash / expiresAt                            │
│  └── rate limit tracking                                    │
│                                                             │
│  notifications          User notifications (from signaling) │
│  ├── userId / type / message / read                         │
│  └── fromUser / roomId                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Data Flow Diagram

```
USER ACTIONS          FRONTEND                    BACKEND                  DATABASE
────────────          ────────                    ───────                  ────────

┌─────────┐     ┌──────────────┐          ┌──────────────┐          ┌──────────┐
│ Sign Up │────▶│ SignupPage   │────POST──▶│ AuthController│──CRUD───▶│ pending_ │
│         │     │              │           │ • signup     │          │ users    │
│ Verify  │────▶│ (OTP input)  │────POST──▶│ • verifyOtp  │──CREATE─▶│ users    │
│ OTP     │     │              │           │              │          └──────────┘
└─────────┘     └──────────────┘          └──────────────┘
                                               │
┌─────────┐     ┌──────────────┐          ┌──────────────┐          ┌──────────┐
│ Login   │────▶│ LoginPage    │────POST──▶│ AuthController│──READ───▶│ users    │
│         │     │ / Google     │           │ • login      │          └──────────┘
└─────────┘     └──────────────┘          └──────────────┘
                                               │
                         Sets httpOnly JWT cookies
                         All subsequent requests include cookies
                                               │
┌─────────┐     ┌──────────────┐          ┌──────────────┐          ┌──────────┐
│ Complete│────▶│ ExpertProfile│──POST───▶│ ExpertProfile│──UPSERT─▶│ expert_  │
│ Profile │     │ Completion   │           │ Controller   │          │ profiles │
└─────────┘     └──────────────┘          └──────────────┘          └──────────┘
                                               │
┌─────────┐     ┌──────────────┐          ┌──────────────┐          ┌──────────┐
│ Search  │────▶│ SearchExperts│──GET────▶│ ExpertSearch │──QUERY──▶│ users +  │
│ Experts │     │ Page         │           │ Controller   │          │ expert_  │
└─────────┘     └──────────────┘          └──────────────┘          │ profiles │
                                               │                    └──────────┘
┌─────────┐     ┌──────────────┐          ┌──────────────┐
│ Connect │────▶│ ExpertProfile│──POST───▶│ VideoCall    │──CREATE─▶ call_requests
│ Now     │     │ ViewPage     │           │ Controller   │
└─────────┘     └──────────────┘          └──────────────┘
                                               │
                  ┌────────────────────────────┼──────────────────────┐
                  │ WebSocket                  │ REST API             │
                  ▼                            ▼                      ▼
         ┌──────────────┐          ┌──────────────┐          ┌──────────┐
         │ Signaling    │          │ VideoCall    │──CREATE─▶│ inter-   │
         │ Server       │          │ Controller   │          │ actions  │
         │ • call-request│         │ • accept     │          └──────────┘
         │ • offer       │         │ • end        │
         │ • answer      │         │ • rating     │
         │ • ice-candidate│        └──────────────┘
         └──────────────┘                 │
                                          ▼
┌─────────┐     ┌──────────────┐  ┌──────────────┐          ┌──────────┐
│ Pay     │────▶│ Payment      │─▶│ Payment      │──CREATE─▶│ session_ │
│         │     │ Sidebar      │  │ Controller   │          │ payments │
└─────────┘     └──────────────┘  │ • createOrder│──UPDATE─▶│ inter-   │
                                  │ • verify     │          │ actions  │
                                  └──────────────┘          └──────────┘
                                          │
┌─────────┐                              ▼
│ Session │                       ┌──────────────┐          ┌──────────┐
│ Completes│                      │ ExpertEarning│──CREATE─▶│ expert_  │
│         │                       │ Service      │          │ earnings │
└─────────┘                       │ • process    │          └──────────┘
                                  └──────────────┘
                                          │
┌─────────┐     ┌──────────────┐  ┌──────────────┐          ┌──────────┐
│ Rate    │────▶│ CallCompleted│─▶│ VideoCall    │──UPDATE─▶│ call_    │
│ Session │     │ Page         │  │ Controller   │          │ requests │
└─────────┘     └──────────────┘  │ • rating     │──UPDATE─▶│ expert_  │
                                  └──────────────┘          │ profiles │
                                                            └──────────┘
┌─────────┐     ┌──────────────┐  ┌──────────────┐          ┌──────────┐
│ Admin   │────▶│ Admin        │─▶│ Admin        │──QUERY──▶│ users    │
│ Views   │     │ Dashboard    │  │ Controller   │          │ inter-   │
│         │     │              │  │              │          │ actions  │
└─────────┘     └──────────────┘  └──────────────┘          │ payments │
                                                            └──────────┘
```

---

## End-to-End User Journeys

```
┌─────────────────────────────────────────────────────────────┐
│              CLIENT — COMPLETE JOURNEY                       │
└─────────────────────────────────────────────────────────────┘

  1. Visits flyhigh.com → Browses landing page
  2. Clicks "Sign Up" → Creates CLIENT account
  3. Verifies email with OTP → Logs in
  4. Lands on Client Dashboard
  5. Searches experts with filters
  6. Views expert profile → Clicks "Connect Now"
  7. Sends call request → Expert accepts
  8. Video call starts (5-min free trial)
  9. Expert recommends duration → Payment sidebar opens
  10. Selects duration → Pays via Razorpay
  11. Paid session → Full consultation
  12. Ends call → Rates expert ★★★★★
  13. Session appears in My Sessions history

┌─────────────────────────────────────────────────────────────┐
│              EXPERT — COMPLETE JOURNEY                       │
└─────────────────────────────────────────────────────────────┘

  1. Visits flyhigh.com → Signs up as EXPERT
  2. Verifies email → Redirected to Profile Completion
  3. Fills all fields, sets hourly rate ₹1,000/hr
  4. Profile completed → Lands on Expert Dashboard
  5. Goes ONLINE (heartbeat begins automatically)
  6. Receives incoming call notification
  7. Accepts → Video call begins
  8. During free trial: recommends duration
  9. Client pays → Paid session starts
  10. Provides consultation → Call ends
  11. Earning processed: ₹500 added to Pending
  12. Views earnings dashboard → tracks all income

┌─────────────────────────────────────────────────────────────┐
│              ADMIN — COMPLETE JOURNEY                        │
└─────────────────────────────────────────────────────────────┘

  1. Logs in with admin credentials
  2. Lands on Admin Dashboard → sees platform stats
  3. Navigates tabs: Experts | Clients | Consultations | Payments
  4. Views all platform activity
  5. Access to Reports & Settings
  6. All actions audited automatically
```

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                   TECHNOLOGY STACK (UPDATED)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (flyhigh-ui):                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ React 19.2.6       TypeScript 7.0.1-rc              │   │
│  │ Vite 6.3.5          Tailwind CSS v4                 │   │
│  │ shadcn/ui           Framer Motion 12                │   │
│  │ React Router 7      Axios 1.18                      │   │
│  │ Socket.IO Client    Web Workers (4)                 │   │
│  │ Razorpay Checkout   Google OAuth                    │   │
│  │ Lucide React icons                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BACKEND (flyhigh-backend):                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Java 21             Spring Boot 3.2.5               │   │
│  │ Spring Security     Spring Data MongoDB              │   │
│  │ JJWT 0.12.6         Bucket4j 8.10                   │   │
│  │ Resilience4j        Razorpay Java SDK                │   │
│  │ AWS Lambda Adapter  AWS Secrets Manager SDK          │   │
│  │ Lombok              Jakarta Validation               │   │
│  │ Maven Wrapper       19 Services                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  SIGNALING (flyhigh-signaling-server):                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Node.js 22+         Express 4.22                    │   │
│  │ Socket.IO 4.8       Helmet 8                        │   │
│  │ cors                 JWT verification (HMAC)         │   │
│  │ Rate limiting        Graceful shutdown               │   │
│  │ AWS SDK (DynamoDB + API Gateway Mgmt)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  INFRASTRUCTURE (infra/):                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AWS CDK (TypeScript)                                │   │
│  │ • Lambda (Java 21 SnapStart)                        │   │
│  │ • Lambda (Node.js 22)                               │   │
│  │ • API Gateway (HTTP + WebSocket)                    │   │
│  │ • S3 + CloudFront (SPA hosting)                     │   │
│  │ • DynamoDB (connections, rooms)                     │   │
│  │ • Secrets Manager                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  DATABASE:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MongoDB Atlas (13 collections)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  EXTERNAL SERVICES:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Razorpay (payment gateway + webhooks)               │   │
│  │ Google OAuth (social login)                         │   │
│  │ Gmail SMTP (OTP emails)                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  CI/CD:                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ GitHub Actions → deploy.yml                         │   │
│  │ OIDC authentication with AWS                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: All API Endpoints

### Auth (`/api/auth`)
```
POST   /api/auth/signup                        → Create pending user + send OTP
POST   /api/auth/verify-signup-otp              → Verify OTP, create user
POST   /api/auth/resend-signup-otp              → Resend OTP
POST   /api/auth/login                          → Login, set JWT cookies
POST   /api/auth/refresh                        → Refresh JWT tokens
POST   /api/auth/logout                         → Clear cookies, set offline
POST   /api/auth/forgot-password                → Send password reset OTP
POST   /api/auth/verify-reset-otp               → Verify reset OTP
POST   /api/auth/reset-password                 → Set new password
POST   /api/auth/google-login                   → Google OAuth login
POST   /api/auth/complete-google-registration   → Complete Google signup
GET    /api/auth/me                             → Get current user
POST   /api/auth/heartbeat                      → Expert presence update
```

### Users (`/api/users`)
```
GET    /api/users/profile                       → Get own profile
PUT    /api/users/profile                       → Update profile
PUT    /api/users/change-password               → Change password
GET    /api/users/notification-preferences      → Get notification prefs
PUT    /api/users/notification-preferences      → Update notification prefs
```

### Expert Profile (`/api/expert`)
```
POST   /api/expert/profile                      → Create/update profile
GET    /api/expert/profile                      → Get own profile
GET    /api/expert/profile/dropdowns            → Get dropdown options
GET    /api/expert/profile/status               → Check profile completion
```

### Expert Search (`/api/experts`)
```
GET    /api/experts                             → Search/filter/paginate
GET    /api/experts/{id}                        → Get expert public profile
GET    /api/experts/filters                     → Get filter options
```

### Video Call (`/api/video-call`)
```
POST   /api/video-call/request                  → Create call request
POST   /api/video-call/respond                  → Accept/reject call
GET    /api/video-call/status/{id}              → Poll call status
GET    /api/video-call/pending/{expertId}       → Get pending call
GET    /api/video-call/latest                   → Get latest client call
POST   /api/video-call/end                      → End call
POST   /api/video-call/rating                   → Submit rating (immutable)
GET    /api/video-call/history                  → Call history
GET    /api/video-call/session/{id}             → Get interactionId
GET    /api/video-call/pending-feedback/{email}  → Unrated completed calls
GET    /api/video-call/expert/{userId}/email    → Get expert email
POST   /api/video-call/expert/{userId}/status   → Set expert status
```

### Payments (`/api/payments`)
```
POST   /api/payments/create-order               → Create Razorpay order
POST   /api/payments/verify                     → Verify payment
POST   /api/payments/extend                     → Create extension order
POST   /api/payments/extend-verify              → Verify extension
POST   /api/payments/recommend                  → Expert recommends duration
GET    /api/payments/session-state/{id}         → Poll session state
GET    /api/payments/history                    → Payment history
```

### Expert Earnings (`/api/expert/earnings`)
```
GET    /api/expert/earnings/summary             → Earnings summary
GET    /api/expert/earnings/history             → Paginated history
GET    /api/expert/earnings/{id}                → Single earning detail
POST   /api/expert/earnings/migrate             → Retroactive migration
```

### Admin (`/api/admin`) — All require ADMIN role
```
GET    /api/admin/dashboard                     → Dashboard stats
GET    /api/admin/users                         → All users
GET    /api/admin/users/recent                  → Recent users
GET    /api/admin/clients                       → All clients
GET    /api/admin/experts                       → All experts
GET    /api/admin/consultations                 → All consultations
GET    /api/admin/payments                      → All payments
```

### Webhooks (No auth — HMAC verified)
```
POST   /api/webhooks/razorpay                   → Razorpay payment webhook
```

### Notifications (`/api/notifications`) — Requires authentication
```
GET    /api/notifications                        → Paginated notifications for authenticated user
GET    /api/notifications/unread-count           → Unread notification count
```

> **Note:** All endpoints now require authentication. The following were previously unauthenticated and have been secured:
> `GET /api/video-call/status/{id}`, `GET /api/video-call/pending/{expertId}`,
> `POST /api/video-call/rating`, `POST /api/video-call/expert/{userId}/status`,
> `GET /api/video-call/pending-feedback/{email}`, `GET /api/video-call/session/{id}`,
> `GET /api/video-call/expert/{userId}/email`, `GET /api/payments/session-state/{id}`

---

## Configuration Reference

| Property | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 8081 | Backend port |
| `MONGODB_URI` | (required) | MongoDB Atlas connection |
| `JWT_SECRET` | (required) | HMAC signing key (base64) |
| `JWT_ACCESS_EXPIRY` | 900000 (15 min) | Access token TTL (ms) |
| `JWT_REFRESH_EXPIRY` | 604800000 (7 days) | Refresh token TTL (ms) |
| `BCRYPT_STRENGTH` | 12 | Password hashing rounds |
| `OTP_LENGTH` | 6 | OTP digit count |
| `OTP_EXPIRY_MINUTES` | 10 | OTP validity |
| `OTP_MAX_REQUESTS_PER_HOUR` | 3 | OTP rate limit |
| `PLATFORM_COMMISSION_PERCENT` | 20 | Platform fee % |
| `SESSION_FREE_TRIAL_SECONDS` | 300 | Free trial duration |
| `SESSION_EXTEND_PROMPT_SECONDS` | 300 | Extension prompt window |
| `ADMIN_EMAIL` | admin@flyhigh.com | Admin account email |
| `ADMIN_PASSWORD` | Admin@123 | Admin account password |
| `COOKIE_SECURE` | true | Secure flag on cookies |
| `CORS_ORIGINS` | localhost:5173,3000 | Allowed origins |
| `RAZORPAY_KEY_ID` | (required) | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | (required) | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | (required) | Razorpay webhook secret |
| `GOOGLE_CLIENT_ID` | (required) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | (required) | Google OAuth secret |
| `MAIL_USERNAME` | (required) | Gmail SMTP username |
| `MAIL_PASSWORD` | (required) | Gmail SMTP app password |
| `HSTS_MAX_AGE` | 31536000 | HSTS max age (seconds) |

---

_Document updated: July 27, 2026_
_Covers all 17 modules across Client, Expert, Admin, and Notification user flows_
_Reflects current codebase: Admin Portal, security hardening (8 auth guards), signaling shared JWT module, dynamic commission, atomic ratings, DB-level pagination, ErrorBoundary, Notifications API, AWS infrastructure_
