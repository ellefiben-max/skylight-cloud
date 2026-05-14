# Skylight Cloud — Completed Work

**Project:** `C:\Users\ME\Documents\Codex\2026-05-13\skylight-cloud`  
**Live URL:** https://skylight-cloud-tumi.onrender.com  
**Date:** 2026-05-14

---

## Render Deployment ✅

The app builds and deploys successfully on Render free tier.

| Fix | File |
|---|---|
| Changed plan from `starter` to `free` | `render.yaml` |
| Renamed `next.config.ts` → `next.config.js` | `next.config.js` |
| Added `npm ci --include=dev` so dev dependencies are available at build time | `render.yaml` |
| Removed invalid Stripe `apiVersion` option | `src/lib/stripe.ts` |
| Added `export const dynamic = "force-dynamic"` to all 38 routes and pages to stop build hanging at "Collecting page data" | All pages/routes |
| Extracted `SESSION_COOKIE` constant to `src/lib/constants.ts` so middleware does not import Node.js `crypto` at edge runtime | `src/lib/constants.ts` |
| Changed start command from `next start` to `node .next/standalone/server.js` (required for `output: standalone`) | `render.yaml` |
| Removed invalid `isrMemoryCacheSize` config key | `next.config.js` |
| Refactored Stripe client to a lazy `getStripe()` function so `STRIPE_SECRET_KEY` is not required at build time | `src/lib/stripe.ts` |
| Added `"target": "ES2017"` to tsconfig | `tsconfig.json` |

---

## Database ✅

- Tables created on Render PostgreSQL using `npx prisma db push` run in Render Shell
- Start command in `render.yaml` now runs `npx prisma db push --accept-data-loss` before starting the server so tables are always in sync on redeploy
- `DATABASE_URL` connection string corrected to include port `:5432` and `?connection_limit=5`

**File:** `render.yaml` — start command:
```
npx prisma db push --accept-data-loss && node .next/standalone/server.js
```

---

## Email — Resend SDK ✅

- Rewrote `src/lib/email.ts` from a broken nodemailer SMTP setup to the official Resend SDK
- Email now throws a real error if sending fails (previously silently dropped)
- Two email functions: `sendVerificationEmail()` and `sendOtpEmail()`
- Environment variables set in Render: `EMAIL_PROVIDER`, `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`

**File:** `src/lib/email.ts`

> Note: Resend free tier only sends to the account owner email. A custom domain must be verified in the Resend dashboard + IONOS DNS to send to all users.

---

## OTP Login — Restored ✅

- OTP was temporarily removed to unblock manual testing
- Fully restored in the login API route and login page
- Flow: user submits email + password → password verified → 6-digit OTP generated → OTP emailed → user enters code → session created

**Files:**
- `src/app/api/auth/login/route.ts`
- `src/app/(auth)/login/page.tsx`

---

## UI Redesign ✅

All pages use a new dark design system. Changes are local and ready to commit.

**Design system (`src/app/globals.css`):**
- Font: Inter via `next/font/google`
- Background: `#0a0a0b` | Surface: `#111113` | Primary accent: `#2dd4bf` (teal)
- Component classes: `.card`, `.card-sm`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.field`, `.field-hint`, `.alert`, `.alert-error`, `.alert-success`, `.alert-warning`, `.badge`, `.badge-green`, `.badge-red`, `.badge-teal`, `.stat-card`, `.stat-label`, `.stat-value`, `.stat-sub`, `.live-dot`, `.spinner`, `.divider`

| File | What changed |
|---|---|
| `src/app/globals.css` | Complete rewrite — new design system |
| `src/app/layout.tsx` | Inter font loaded via `next/font/google` |
| `src/app/page.tsx` | Full landing page — hero, features grid, pricing tiers, footer |
| `src/components/Nav.tsx` | Sticky top nav with blur, active link detection, sign out |
| `src/app/(auth)/layout.tsx` | Split-screen — dark brand panel left, form right |
| `src/app/(auth)/signup/page.tsx` | Clean signup form with email-sent success state |
| `src/app/(auth)/login/page.tsx` | Login form → redirects to OTP page |
| `src/app/(auth)/login/otp/page.tsx` | Large centered 6-digit code input |
| `src/app/(auth)/verify-email/page.tsx` | Loading spinner, success/error states |
| `src/app/(dashboard)/layout.tsx` | Dashboard shell with Nav, 1080px max-width |
| `src/app/(dashboard)/dashboard/page.tsx` | Stat cards (subscription, boards, monthly cost), recent boards list |
| `src/app/(dashboard)/boards/page.tsx` | Board rows with live-dot status, Open UI + Details buttons, empty state |
| `src/app/(dashboard)/boards/new/page.tsx` | Add board form with pairing code input, how-to instructions |
| `src/app/(dashboard)/billing/page.tsx` | Subscription status badge, stat cards, volume pricing table |
| `src/app/(dashboard)/groups/page.tsx` | Group cards with board count badge, board list |

---

## Test Account ✅

- Account `meherellefi@hotmail.com` created
- Email manually verified via Render Shell (`UPDATE "User" SET "emailVerifiedAt" = NOW()`)
- Login confirmed working up to the OTP step

---

## Stripe Products ✅

Three products created in Stripe dashboard:

| Tier | Boards | Price |
|---|---|---|
| Tier 1 | 1 – 4 | $10 / board / month |
| Tier 2 | 5 – 20 | $8 / board / month |
| Tier 3 | 21+ | $7 / board / month |

Env vars `STRIPE_SECRET_KEY`, `STRIPE_PRICE_1_TO_4`, `STRIPE_PRICE_5_TO_20`, `STRIPE_PRICE_20_PLUS` all set in Render.

---

## What Is Pending

See `PROGRESS.md` for the full list. Short version:

1. Finish redesigning `boards/[boardId]/page.tsx`, `boards/[boardId]/remote/page.tsx`, `settings/account/page.tsx`
2. **Commit and push everything** — nothing above is live yet
3. Verify Resend domain in IONOS DNS
4. Register Stripe webhook → set `STRIPE_WEBHOOK_SECRET` in Render
5. Set `APP_URL` env var in Render
6. Firmware integration (configure board to call cloud API)
