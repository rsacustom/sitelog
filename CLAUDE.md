# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project overview

SiteLog is a mobile-first Next.js (App Router) web app for logging daily construction site activity — hours, cost, notes — against per-job trade budgets. It's a single-tenant app built for one client ("J Berg Contracting Ltd."), backed directly by Firebase (Firestore + Auth) with no custom backend/API layer.

## Commands

```bash
npm run dev     # start dev server (localhost:3000)
npm run build   # production build
npm run start   # serve a production build
npm run lint    # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test suite / test runner configured in this repo.

### Required environment variables

`lib/firebase.ts` reads Firebase Web SDK config from env vars (not committed, no `.env.example` present):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

If `NEXT_PUBLIC_FIREBASE_API_KEY` is unset, `lib/firebase.ts` skips `initializeApp` and exports stub `db`/`auth` objects cast to the real types, so `npm run build` doesn't fail without credentials — but anything that touches Firebase at runtime will throw.

## Architecture

### Routing (App Router, `app/`)

- `/` → immediately `redirect('/jobs')` (`app/page.tsx`).
- `/login` → passwordless "magic link" sign-in (`app/login/page.tsx`).
- `/jobs` → list of jobs with a spend-vs-budget progress bar per job (`app/jobs/page.tsx`).
- `/jobs/new` → create-job form with per-trade budget inputs (`app/jobs/new/page.tsx`).
- `/jobs/[jobId]` → redirects to `/jobs/[jobId]/log`.
- `/jobs/[jobId]/layout.tsx` → shared shell for a job: header + Log/Budget/Photos tab bar. Subscribes to the job doc itself (for the header chip) independently of what each tab page fetches.
- `/jobs/[jobId]/log` → daily log entries: add + list (`app/jobs/[jobId]/log/page.tsx`).
- `/jobs/[jobId]/budget` → per-trade budget-vs-spend breakdown (`app/jobs/[jobId]/budget/page.tsx`).
- `/jobs/[jobId]/photos` → placeholder ("Coming in v2").

Almost every page is `'use client'` with `export const dynamic = 'force-dynamic'` — there's no server-rendered data fetching; everything is loaded client-side via the Firebase JS SDK.

### Auth model (two layers, deliberately loose)

1. **Edge gate — `proxy.ts`** (this project is on Next.js 16, where `middleware.ts` has been renamed to `proxy.ts` — see the "NOT the Next.js you know" note below). It redirects to `/login` if the `sitelog-auth` cookie isn't `'1'`, and redirects away from `/login` if it is. This is a coarse, unauthenticated check — the cookie is just a client-set flag, not a verified session token — so it only prevents flash-of-wrong-page, not actual unauthorized access.
2. **Real check — `lib/hooks/useAuth.ts`** (client-side). Listens to Firebase `onAuthStateChanged`, signs out and redirects to `/login` if the signed-in email isn't in `ALLOWED_EMAILS`, and mirrors auth state into the `sitelog-auth` cookie so the proxy stays in sync.

`ALLOWED_EMAILS` is a hardcoded two-address allowlist duplicated in **both** `lib/hooks/useAuth.ts` and `app/login/page.tsx` — update both when adding/removing an authorized user. There is no Firestore security rules file in this repo, so real data access control (if any) lives in the Firebase console, not in source.

Sign-in is Firebase's email-link ("magic link") flow: `sendSignInLinkToEmail` on `/login`, completed when the user returns via the emailed link (`isSignInWithEmailLink` / `signInWithEmailLink`), using `localStorage['emailForSignIn']` to remember which address is completing.

### Data model (Firestore, no ORM)

- `jobs/{jobId}`: `{ name, status: 'active' | 'complete', tradeBudgets: Record<Trade, number>, createdAt }`
- `jobs/{jobId}/logs/{logId}`: `{ date, hours, cost, trade, notes, createdAt }`

Total budget is always derived as `sum(tradeBudgets)`; total spent is always derived as `sum(logs[].cost)` — these are computed client-side on every page that needs them (`app/jobs/page.tsx`, `.../log/page.tsx`, `.../budget/page.tsx`), not stored/cached anywhere. Pages read via `onSnapshot` (live) or one-off `getDoc(s)` inconsistently depending on the page — check the existing pattern in a file before assuming which one applies.

The `TRADES` list (Labour, Framing, Concrete, Electrical, Plumbing, HVAC, Insulation, Drywall, Roofing, Excavation, Materials, Permits, Other) and its matching `DEFAULT_BUDGETS` are duplicated as local consts in `app/jobs/new/page.tsx`, `app/jobs/[jobId]/log/page.tsx`, and `app/jobs/[jobId]/budget/page.tsx` — there is no shared constants module. Keep these in sync by hand if the trade list changes.

### Styling

Tailwind v4, configured entirely through the `@theme` block in `app/globals.css` (no `tailwind.config.*`) — custom color tokens (`pine`, `moss`, `sage`, `cream`, `sand`, `charcoal`, `steel`, `rust`, `amber`) used as `bg-pine`, `text-rust`, etc. Two Google fonts are loaded via `next/font/google` in `app/layout.tsx` (Barlow for body, Barlow Condensed for headings) and exposed as CSS vars `--font-barlow` / `--font-heading`; individual pages apply the heading font with an inline `style={{ fontFamily: 'var(--font-heading), ...' }}` object (usually a local `headingStyle` const) rather than a Tailwind class, since it isn't mapped to a `font-*` utility.

The whole app is constrained to a phone-width column (`max-w-[420px] mx-auto` in `app/layout.tsx`) — this is a mobile web app, not a responsive desktop layout. There's no shared component library yet; each page file is self-contained with its own JSX/markup.

## Important: this is not the Next.js you trained on

This repo pins **Next.js 16.2.6**, which has real breaking changes vs. older Next.js versions your training data reflects (e.g. `middleware.ts` → `proxy.ts`, as used in this repo's `proxy.ts`). Before writing or changing routing/config/server-side code, check `node_modules/next/dist/docs/` (run `npm install` first if `node_modules` isn't present) for the current API and heed any deprecation notices there.
