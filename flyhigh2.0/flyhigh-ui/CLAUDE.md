# CLAUDE.md — FlyHigh UI (Frontend)

## Build & Run

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (port 5173)
npx tsc -b               # TypeScript type check (no emit)
npx eslint .             # Lint all files
npx prettier --check .   # Format check
```

## Stack

- **React 19.2.6** + **TypeScript 7.0.1-rc** (ES2024 target, strict mode)
- **Vite 6.3.5** — dev server + HMR
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin
- **shadcn/ui** — Radix Nova style, Lucide icons, neutral base color
- **react-router-dom v7** — lazy-loaded route groups
- **Axios** — API client (`withCredentials: true` for JWT cookies)
- **Socket.IO client** — real-time video call signaling
- **Framer Motion v12** — animations
- **Web Workers** — 4 workers (chat, data, heartbeat, polling)
- **ESLint v10** + **Prettier v3** — typescript-eslint flat config

## Source Structure

```
src/
├── main.tsx                  App entry, StrictMode + ThemeProvider
├── App.tsx                   BrowserRouter, AuthProvider, ErrorBoundary, route groups
├── index.css                 Tailwind imports, CSS vars, custom animations
├── api/client.ts             Axios instance (base URL http://localhost:8081/api)
├── components/
│   ├── about/                About page components
│   ├── admin/                7 admin pages (Dashboard, Experts, Clients, Consultations, Payments, Reports, Settings)
│   ├── auth/                 Login, Signup, OAuth flows, TermsCheckbox
│   ├── client/               7 client pages (Dashboard, Search, Sessions, Notifications, Profile, Settings, ExpertView)
│   ├── contact/              Contact page (generic support email)
│   ├── ErrorBoundary.tsx     Catches render errors (no white screen)
│   ├── expert/               Expert dashboard, profile, sessions, settings, earnings
│   ├── home/                 Landing page
│   ├── how-it-works/         How It Works page
│   ├── layout/               Sidebar, Header, Navbar, Footer, NotificationBell
│   ├── pricing/              Pricing page
│   ├── video-call/           WebRTC video call UI
│   └── ui/                   shadcn primitives (avatar, badge, button, card, etc.)
├── contexts/AuthContext.tsx   User state: login, logout, refresh
├── hooks/                    12 custom hooks (useSocket, useWebRTC, useHeartbeat, etc.)
├── lib/                      11 API modules (pricing, notifications, earnings, user-api, etc.)
├── router/routes.ts          Route config (public, client, expert, admin, video-call)
├── shared/components/        Atomic design (atoms, molecules, layout)
├── types/                    TypeScript types (api, auth, expert, payment, earnings)
└── workers/                  4 Web Workers (chat, data, heartbeat, polling)
```

## Key Patterns

- **Auth**: `AuthContext` provides `user`, `login()`, `logout()`, `refreshUser()`. Axios client sends cookies automatically.
- **Routing**: Lazy-loaded route groups in `router/routes.ts`. Public routes, client dashboard, expert dashboard, video call.
- **API calls**: Wrapped in `lib/` functions (not called directly from components). Errors surfaced via toasts.
- **Real-time**: `useSocket` hook manages Socket.IO connection. `useWebRTC` hook manages peer connections.
- **Web Workers**: Heavy computation offloaded to workers. Communication via `postMessage`.
- **Styling**: Tailwind utility classes + shadcn/ui components. Custom animations in `index.css`.
- **Components**: Atomic design — atoms (Button, Input), molecules (SearchBar, StatCard), layout (DashboardShell).

## Gotchas

1. **TypeScript 7.0.1-rc is bleeding edge** — some VS Code extensions or tools may not fully support it. If type errors appear, try `npx tsc --noEmit` first.
2. **Vite env vars must be prefixed with `VITE_`** — `.env` has `VITE_API_BASE` and `VITE_GOOGLE_CLIENT_ID`.
3. **Axios `withCredentials: true`** — required for httpOnly JWT cookies. If auth fails, check this first.
4. **Socket.IO URLs are in context files** — `SocketContext.tsx` and `PaymentSocketContext.tsx` use env vars.
5. **shadcn/ui components in `components/ui/`** — don't edit these directly; they're generated. Use `components.json` for config.
6. **Web Workers must be `.ts` files** — Vite's worker loader handles them. Import with `?worker` suffix.
7. **Tailwind v4 uses CSS-first config** — no `tailwind.config.js`. All theming in `index.css` via `@theme` blocks.
8. **ESLint flat config** — `eslint.config.js` uses `typescript-eslint` with React hooks + refresh plugins.
9. **Commission percent is dynamic** — fetched from backend `/api/experts/filters` on startup, cached via `pricing.ts`. No hardcoded value.
10. **console.log cleaned** — all debug logging guarded with `import.meta.env.DEV`. No production console noise.
11. **ErrorBoundary wraps all routes** — unhandled render errors show fallback UI instead of white screen.
12. **Chat messages capped at 200** — prevents memory leak on long video calls.
13. **Contact email is generic** — `support@flyhigh.com`, no personal emails in source.

## Verification Checklist

After any UI change:
- [ ] `npx tsc -b` passes (no type errors)
- [ ] `npx eslint .` passes (no lint errors)
- [ ] `npm run dev` starts without errors
- [ ] UI renders at http://localhost:5173
- [ ] API calls to backend succeed (check Network tab)
- [ ] WebSocket connects to signaling server
