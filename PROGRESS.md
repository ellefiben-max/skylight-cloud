# Skylight Cloud — Progress & Handoff

**Project location:** `C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud`  
**GitHub:** https://github.com/ellefiben-max/skylight-cloud  
**Live URL:** https://skylight-cloud-tumi.onrender.com  
**Last updated:** 2026-05-14

---

## What Has Been Done

### 1. Render Deployment — FIXED ✅

| Issue | Fix | Commit |
|---|---|---|
| Render plan `starter` → `free` | render.yaml | `2ce49a9` |
| `next.config.ts` → `next.config.js` | renamed | `1c899db` |
| devDeps missing on build | `npm ci --include=dev` | `0aaccff` |
| Invalid Stripe apiVersion | removed | `5b25dae` |
| Build hung at "Collecting page data" | `export const dynamic = "force-dynamic"` on all 38 routes/pages | `a359147` + `7d7accc` |
| Middleware importing Node crypto | Extracted `SESSION_COOKIE` to `src/lib/constants.ts` | `d5669c5` |
| `next start` incompatible with standalone | Changed to `node .next/standalone/server.js` | `79d0d95` |
| Invalid `isrMemoryCacheSize` config key | Removed from `next.config.js` | `79d0d95` |
| Stripe instantiated at module load | Refactored `stripe.ts` to lazy `getStripe()` | `7d7accc` |
| tsconfig target wrong | Added `"target": "ES2017"` | `7d7accc` |

### 2. Database — FIXED ✅

- **Problem:** `prisma migrate deploy` found no migrations folder, so no tables were created
- **Fix:** Changed render.yaml start command to `npx prisma db push --accept-data-loss && node .next/standalone/server.js`
- **Manual step done:** Ran `npx prisma db push` in Render Shell to create all tables on first deploy

> **Note:** `prisma db push` is fine for now but for production you should eventually create proper migrations:
> Run locally with a dev database: `npx prisma migrate dev --name init`, commit the `prisma/migrations/` folder, then switch render.yaml back to `npx prisma migrate deploy`.

### 3. Email (Resend SDK) — PARTIALLY DONE ⚠️

- **Problem:** `email.ts` used nodemailer SMTP which silently fell through to a no-op transport
- **Fix:** Rewrote `src/lib/email.ts` to use the official Resend SDK (`resend` npm package) — commit `23a1b97`
- **Env vars set in Render:** `EMAIL_PROVIDER=resend`, `EMAIL_PROVIDER_API_KEY=re_...`, `EMAIL_FROM=Skylight Cloud <onboarding@resend.dev>`
- **Current blocker:** Resend free tier only allows sending to the account owner's email (`meherellefi@hotmail.com`). To send to any user you must verify a custom domain.

**What's left for email:**
1. Add domain in Resend dashboard → Domains → Add Domain (user is using IONOS)
2. Add the DKIM TXT record (`resend._domainkey`) to IONOS DNS — Status was "Not Started"
3. Add any other records Resend shows (SPF, MX for bounce)
4. Click "Verify Domain" in Resend (DNS can take 5–30 min)
5. Update `EMAIL_FROM` in Render env to `Skylight Cloud <noreply@yourdomain.com>`

### 4. OTP Login — RESTORED ✅

- OTP was temporarily bypassed to unblock testing (commit `24bf5c8`)
- OTP has been **restored** in `src/app/api/auth/login/route.ts` and `src/app/(auth)/login/page.tsx`
- These changes are **local only — NOT yet committed/pushed**

### 5. UI Redesign — MOSTLY DONE ⚠️

**Design system (new `globals.css`):**
- Font: Inter (via `next/font/google`)
- Dark theme: `#0a0a0b` background, `#111113` surface
- Primary accent: `#2dd4bf` (teal)
- CSS classes: `.card`, `.card-sm`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.field`, `.field-hint`, `.alert`, `.alert-error`, `.alert-success`, `.alert-warning`, `.badge`, `.badge-green`, `.badge-red`, `.badge-teal`, `.stat-card`, `.stat-label`, `.stat-value`, `.stat-sub`, `.live-dot`, `.spinner`, `.divider`

| File | Status |
|---|---|
| `src/app/globals.css` | ✅ Done — full new design system |
| `src/app/layout.tsx` | ✅ Done — Inter font added |
| `src/app/(auth)/layout.tsx` | ✅ Done — split-screen brand + form layout |
| `src/app/(dashboard)/layout.tsx` | ✅ Done — nav + content layout |
| `src/app/page.tsx` | ✅ Done — full landing page redesign |
| `src/components/Nav.tsx` | ✅ Done — modern sticky nav |
| `src/app/(auth)/signup/page.tsx` | ✅ Done |
| `src/app/(auth)/login/page.tsx` | ✅ Done (OTP restored) |
| `src/app/(auth)/login/otp/page.tsx` | ✅ Done |
| `src/app/(auth)/verify-email/page.tsx` | ✅ Done |
| `src/app/(dashboard)/dashboard/page.tsx` | ✅ Done — stat cards, recent boards |
| `src/app/(dashboard)/boards/page.tsx` | ✅ Done — card rows, live-dot, empty state |
| `src/app/(dashboard)/billing/page.tsx` | ✅ Done — stat cards, pricing table |
| `src/app/(dashboard)/groups/page.tsx` | ✅ Done — badge counts, board list |
| `src/app/(dashboard)/boards/new/page.tsx` | ✅ Done — styled form, instructions card |
| `src/app/(dashboard)/boards/[boardId]/page.tsx` | ❌ NOT done — still old design |
| `src/app/(dashboard)/boards/[boardId]/remote/page.tsx` | ❌ NOT done — still old design |
| `src/app/(dashboard)/settings/account/page.tsx` | ❌ NOT done — still old design |

> **IMPORTANT:** All local UI changes above are **not yet committed or pushed**. Nothing is live on Render yet.

### 6. Stripe — PARTIALLY DONE ⚠️

- Three Stripe products created (1–4 @ $10, 5–20 @ $8, 21+ @ $7)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` env vars set in Render
- **STILL NEEDED:** `STRIPE_WEBHOOK_SECRET` — register the webhook endpoint in Stripe dashboard:
  - URL: `https://skylight-cloud-tumi.onrender.com/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copy `whsec_...` signing secret → paste as `STRIPE_WEBHOOK_SECRET` in Render env vars

### 7. Account Created & Tested ✅

- Account `meherellefi@hotmail.com` created and manually email-verified via Render Shell
- Login works (password check)
- OTP screen reached but OTP email not delivered (Resend domain issue — see above)

---

## What Still Needs To Be Done

### Immediate — finish and ship the UI redesign

**Step 1 — Finish the last 3 pages** (pick up here):
- `src/app/(dashboard)/boards/[boardId]/page.tsx` — board detail (stat cards for status/model/firmware/IP/heap, pending commands, logs)
- `src/app/(dashboard)/boards/[boardId]/remote/page.tsx` — full-screen iframe page (top bar styling)
- `src/app/(dashboard)/settings/account/page.tsx` — account info rows, security section

**Step 2 — Commit & push everything:**
```powershell
cd "C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud"
git add -A
git commit -m "feat: UI redesign + restore OTP"
git push origin main
```
Render will auto-redeploy after push (takes ~3 min).

### Infrastructure (before going live)

3. **Verify Resend domain in IONOS** — add DKIM TXT record + SPF, verify in Resend dashboard, then update `EMAIL_FROM` in Render to `Skylight Cloud <noreply@yourdomain.com>`

4. **Register Stripe webhook** in Stripe dashboard:
   - URL: `https://skylight-cloud-tumi.onrender.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Set `STRIPE_WEBHOOK_SECRET` in Render env

5. **Set `APP_URL` in Render** to `https://skylight-cloud-tumi.onrender.com` (used in verification email links)

### Soon (before going live)

6. **Create proper Prisma migrations** so future schema changes are tracked:
   ```
   # On a machine with a local or dev PostgreSQL:
   npx prisma migrate dev --name init
   # Commit the generated prisma/migrations/ folder
   # Change render.yaml startCommand to: npx prisma migrate deploy && node .next/standalone/server.js
   ```

7. **Replace in-memory rate limiter** with Redis for multi-instance safety
   - `src/lib/rate-limit.ts` — currently uses a `Map` in-memory, resets on redeploy
   - Add Render managed Redis and replace with `ioredis`-based implementation

### Firmware Integration (biggest remaining feature)

8. **Configure firmware** to point at the cloud URL:
   - Firmware source: `D:\v2.7\stable\bugfix for waveshare main - Copy\SkyLight100\`
   - The board needs to call `https://skylight-cloud-tumi.onrender.com/api/boards/bootstrap` on boot with its board ID and secret
   - Then poll `GET /api/boards/commands` every 5 seconds
   - Send heartbeats to `POST /api/boards/heartbeat`
   - The board generates a pairing code → user enters it at `/boards/new` to claim the board

9. **End-to-end board test:**
   - Flash firmware with correct cloud URL
   - Power on board → it bootstraps and generates pairing code
   - Log into Skylight Cloud → Boards → Add Board → enter pairing code
   - Open the remote UI → verify commands reach the board

### Nice to Have (future)

10. Password reset flow (not built yet)
11. Board transfer between organizations
12. TOTP authenticator app support (currently email OTP only)
13. Redis-backed rate limiting (currently in-memory)
14. Proper migration folder committed to git

---

## Key File Locations

```
C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud\
├── render.yaml                              # Deployment config — start command here
├── next.config.js                           # Next.js config (standalone output)
├── prisma/schema.prisma                     # Database schema (no migrations folder yet)
├── PROGRESS.md                              # This file
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # Root layout — Inter font
│   │   ├── page.tsx                         # Landing page (hero, features, pricing, footer)
│   │   ├── globals.css                      # Design system / all global styles
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                   # Split-screen auth layout
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx               # OTP restored
│   │   │   ├── login/otp/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                   # Dashboard shell with Nav
│   │   │   ├── dashboard/page.tsx           # ✅ redesigned
│   │   │   ├── boards/page.tsx              # ✅ redesigned
│   │   │   ├── boards/new/page.tsx          # ✅ redesigned
│   │   │   ├── boards/[boardId]/page.tsx    # ❌ still old design
│   │   │   ├── boards/[boardId]/remote/page.tsx  # ❌ still old design
│   │   │   ├── billing/page.tsx             # ✅ redesigned
│   │   │   ├── groups/page.tsx              # ✅ redesigned
│   │   │   └── settings/account/page.tsx   # ❌ still old design
│   │   └── api/
│   │       ├── auth/                        # signup, login (OTP), verify-email, logout
│   │       ├── billing/                     # checkout, portal, info
│   │       ├── stripe/webhook/              # Stripe webhook handler
│   │       ├── boards/                      # Device API (bootstrap, heartbeat, commands, logs)
│   │       └── user/boards/                 # User-facing board API + proxy
│   ├── components/Nav.tsx                   # Top navigation bar ✅ redesigned
│   └── lib/
│       ├── db.ts                            # Prisma client
│       ├── email.ts                         # Resend SDK email sender
│       ├── stripe.ts                        # Lazy Stripe client
│       ├── session.ts                       # Session create/read/delete
│       ├── password.ts                      # Argon2id hash/verify
│       ├── crypto.ts                        # SHA-256, random tokens, OTP
│       ├── rate-limit.ts                    # In-memory rate limiter (replace with Redis later)
│       ├── pricing.ts                       # Board pricing tiers
│       ├── subscription.ts                  # Active subscription check
│       ├── device-auth.ts                   # Board secret authentication
│       ├── command-types.ts                 # Allowed/blocked command list
│       ├── require-auth.ts                  # requireAuth(), requireSubscription()
│       ├── audit.ts                         # Audit event logging
│       └── constants.ts                     # SESSION_COOKIE (edge-safe)
└── tests/                                   # 59 Vitest tests (all passing)

Firmware source (separate repo):
D:\v2.7\stable\bugfix for waveshare main - Copy\SkyLight100\
```

---

## Render Environment Variables Status

| Variable | Status |
|---|---|
| `DATABASE_URL` | ✅ Auto-set from linked database |
| `AUTH_SECRET` | ✅ Auto-generated |
| `NODE_ENV` | ✅ `production` |
| `APP_URL` | ⚠️ Needs to be set to `https://skylight-cloud-tumi.onrender.com` |
| `EMAIL_FROM` | ✅ Set (update after domain verified) |
| `EMAIL_PROVIDER` | ✅ `resend` |
| `EMAIL_PROVIDER_API_KEY` | ✅ Set |
| `STRIPE_SECRET_KEY` | ✅ Set |
| `STRIPE_WEBHOOK_SECRET` | ❌ Not set — register webhook in Stripe first |
| `STRIPE_PRICE_1_TO_4` | ✅ Set |
| `STRIPE_PRICE_5_TO_20` | ✅ Set |
| `STRIPE_PRICE_20_PLUS` | ✅ Set |

---

## Quick Commands

```powershell
# Go to project
cd "C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud"

# Run tests
npm test

# Check what's pending (not yet committed)
git status
git diff --stat

# Commit and push ALL pending UI changes + OTP restore
git add -A
git commit -m "feat: UI redesign + restore OTP"
git push origin main

# Recent commits
git log --oneline -10
```
