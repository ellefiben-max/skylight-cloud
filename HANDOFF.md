# Skylight Cloud — Handoff Document

## What the user asked for

Build a production-ready full-stack SaaS website for remotely managing Skylight 100 grow-light controllers.

Requirements from `SKYLIGHT_CLOUD_HANDOFF_AND_CLAUDE_CODE_SPEC.md`:

- User accounts with username/password/email
- Email verification before login
- One-time password (OTP) sent to email on every login
- Stripe subscription paywall before board access
- Tiered pricing: 1–4 boards @ $10, 5–20 @ $8, 21+ @ $7/board/month
- Add Skylight boards via pairing code
- Group boards
- Open each board independently with a remote UI that visually matches the local Skylight 100 UI
- Commands queued securely through backend, picked up by the physical board
- Board feedback/status/logs shown in website
- Device secrets never exposed
- Remote factory reset permanently blocked
- Tests for auth, billing, board ownership, command flow, security

---

## What was built

### Project location

```
C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud
```

### GitHub repo

```
https://github.com/ellefiben-max/skylight-cloud
```

### Source of the original prototype (Codex-built, pre-production)

```
C:\Users\ME\Documents\Codex\2026-05-13\files-mentioned-by-the-user-skylight
```

### Firmware source

```
D:\v2.7\stable\bugfix for waveshare main - Copy\SkyLight100\
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | Custom session auth (HttpOnly cookies) |
| Password hashing | Argon2id |
| OTP | 6-digit email code (10-minute expiry) |
| Email | Nodemailer (Resend or SMTP) |
| Billing | Stripe subscriptions + webhooks |
| Validation | Zod |
| Styling | Tailwind CSS v4 + CSS custom properties matching local board UI |
| Tests | Vitest (59 tests, all passing locally) |
| Deployment | Render (render.yaml) + Docker (Dockerfile) |

---

## File structure

```
skylight-cloud/
├── prisma/
│   └── schema.prisma              # All DB models
├── public/
│   └── board-ui/
│       └── app.html               # Copy of the local Skylight 100 UI (patched at runtime)
├── src/
│   ├── middleware.ts              # Session cookie check, route protection
│   ├── lib/
│   │   ├── constants.ts           # SESSION_COOKIE (edge-safe, no Node imports)
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── session.ts             # Create/read/delete sessions
│   │   ├── crypto.ts              # sha256hex, randomToken, randomOtp
│   │   ├── password.ts            # Argon2id hash/verify + strength check
│   │   ├── email.ts               # Send verification + OTP emails
│   │   ├── stripe.ts              # Stripe client + webhook verifier
│   │   ├── pricing.ts             # unitPriceForBoardCount, monthlyTotalCents
│   │   ├── subscription.ts        # hasActiveSubscription, getBoardCount
│   │   ├── device-auth.ts         # Authenticate board by ID + secret header
│   │   ├── rate-limit.ts          # In-memory rate limiter
│   │   ├── require-auth.ts        # requireAuth(), requireSubscription() helpers
│   │   ├── audit.ts               # logAuditEvent()
│   │   ├── command-types.ts       # ALLOWED_COMMAND_TYPES, BLOCKED_COMMAND_TYPES
│   │   └── api-response.ts        # ok(), err(), validationError() helpers
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page /
│   │   ├── globals.css            # Design tokens + base styles
│   │   ├── (auth)/
│   │   │   ├── signup/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── login/otp/page.tsx
│   │   │   └── logout/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   ├── boards/page.tsx
│   │   │   ├── boards/new/page.tsx
│   │   │   ├── boards/[boardId]/page.tsx
│   │   │   ├── boards/[boardId]/remote/page.tsx   # iframe wrapper for board UI
│   │   │   ├── groups/page.tsx
│   │   │   └── settings/account/page.tsx
│   │   └── api/
│   │       ├── auth/signup/route.ts
│   │       ├── auth/verify-email/route.ts
│   │       ├── auth/login/route.ts
│   │       ├── auth/login/otp/route.ts
│   │       ├── auth/logout/route.ts
│   │       ├── billing/checkout/route.ts
│   │       ├── billing/portal/route.ts
│   │       ├── billing/info/route.ts
│   │       ├── stripe/webhook/route.ts
│   │       ├── health/route.ts
│   │       ├── boards/bootstrap/route.ts          # Device API
│   │       ├── boards/heartbeat/route.ts
│   │       ├── boards/logs/route.ts
│   │       ├── boards/error/route.ts
│   │       ├── boards/commands/route.ts
│   │       ├── boards/commands/ack/route.ts
│   │       ├── user/boards/route.ts               # User board API
│   │       ├── user/boards/claim/route.ts
│   │       ├── user/boards/[boardId]/route.ts
│   │       ├── user/boards/[boardId]/commands/route.ts
│   │       ├── user/boards/[boardId]/status/route.ts
│   │       ├── user/boards/[boardId]/logs/route.ts
│   │       ├── user/boards/[boardId]/ui/route.ts  # Serves patched app.html
│   │       └── user/boards/[boardId]/proxy/[...path]/route.ts  # Translates local API to cloud commands
│   └── components/
│       └── Nav.tsx
└── tests/
    ├── setup.ts
    ├── crypto.test.ts
    ├── password.test.ts
    ├── pricing.test.ts
    ├── rate-limit.test.ts
    ├── command-types.test.ts
    ├── subscription.test.ts
    └── integration.test.ts
```

---

## How the remote board UI works

1. User opens `/boards/[boardId]/remote`
2. Page renders an `<iframe>` pointing to `/api/user/boards/[boardId]/ui`
3. The UI route reads `public/board-ui/app.html`, patches the `BASE` URL to `/api/user/boards/[boardId]/proxy`, removes PIN auth, injects a subscription banner if inactive, and serves the HTML
4. All local API calls (`/api/relay`, `/api/status`, `/api/schedule/lights`, etc.) are intercepted by the proxy route
5. GET calls return board status/logs from the cloud DB
6. POST calls are converted to typed commands queued in `BoardCommand` table
7. The physical board polls `GET /api/boards/commands` every 5 seconds and executes them
8. `system.factoryReset` is permanently blocked (returns 403)

---

## Security controls implemented

- Argon2id password hashing
- SHA-256 hashing of all tokens (session, OTP, email verify, board secret, pairing code)
- Rate limiting on signup, login, OTP (in-memory — replace with Redis for multi-instance)
- OTP lock after 5 failed attempts
- HttpOnly + Secure + SameSite=Lax session cookies
- Session rotation on login
- Board commands restricted to explicit allowlist
- Factory reset blocked at API level
- Stripe webhook signature verification
- CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers
- Audit log table for all security events
- Subscription gate on all board control actions

---

## Environment variables required

```
DATABASE_URL=
APP_URL=
AUTH_SECRET=
EMAIL_FROM=
EMAIL_PROVIDER=
EMAIL_PROVIDER_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_1_TO_4=
STRIPE_PRICE_5_TO_20=
STRIPE_PRICE_20_PLUS=
```

---

## Deployment status at time of handoff

Deployed to Render via Blueprint using `render.yaml`.

**Build fixes applied so far (all pushed to GitHub):**

| Commit | Fix |
|---|---|
| `2ce49a9` | Postgres plan `starter` → `free` (Render deprecated legacy plans) |
| `1c899db` | `next.config.ts` → `next.config.js` (TypeScript not available at config load time) |
| `0aaccff` | `npm ci --include=dev` (Render sets NODE_ENV=production, skipping devDeps) |
| `5b25dae` | Removed invalid Stripe apiVersion string |
| `a359147` | Added `export const dynamic = "force-dynamic"` to all server pages |
| `d5669c5` | Extracted SESSION_COOKIE to edge-safe constants file (middleware was importing Node crypto) |

**Current blocker:** Build hangs at "Collecting page data" even after the above fixes.

**Most likely remaining cause:** A Next.js API route or page is executing code at module import time that connects to or awaits a resource not available during the build. The next thing to try is adding `export const dynamic = "force-dynamic"` to every API route, or switching to `next build --experimental-build-mode=compile` to skip static generation entirely.

**Alternative quick fix to try:** Add this to `next.config.js`:

```js
experimental: {
  isrMemoryCacheSize: 0,
},
```

Or set the entire app to dynamic by adding a root `layout.tsx` export:

```ts
export const dynamic = "force-dynamic";
```

---

## Tests

Run locally:

```powershell
cd "C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud"
npm test
```

All 59 tests pass. Tests cover: pricing tiers, crypto, password hashing, rate limiting, command type allowlist, subscription gates, full happy-path integration flow, board ownership enforcement, Stripe webhook handling.

---

## Known limitations / future work

- Rate limiter is in-memory — replace with Redis (Render managed Redis) for multi-instance production
- Email OTP is MVP auth — TOTP authenticator app support can be added later
- Password reset flow not yet built
- Board transfer between organizations not yet built
- The `public/board-ui/app.html` must be manually updated when firmware UI changes
