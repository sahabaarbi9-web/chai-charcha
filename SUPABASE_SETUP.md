# Chai & Charcha — Supabase Production Setup

Architecture after migration:

```
Browser (public site)                    Browser (admin dashboard)
   │  /api/config + anon key                │  secret code → /api/admin/login
   │  SELECT (RLS: visible only)            │  HttpOnly session cookie
   ▼                                        ▼
Supabase PostgreSQL                     Vercel Serverless /api/admin/*
  (RLS: public = read-only)             (service-role, session-checked)
```

## 1) Create the Supabase project

1. Sign up at https://supabase.com and create a project (free tier is fine).
2. Open **SQL Editor** → paste the contents of `supabase/migrations/0001_initial.sql` → **Run**.
   (Creates `categories`, `products`, indexes, `updated_at` triggers, RLS + grants.)

## 2) Collect credentials

Project → **Settings → API**:
- `SUPABASE_URL` (e.g. `https://xyzcompany.supabase.co`)
- `SUPABASE_PUBLISHABLE_KEY` (anon / publishable) — public, browser-safe
- `SUPABASE_SERVICE_ROLE_KEY` — **secret, server-only** (firewalled by default)

## 3) Import the menu (one-time)

```bash
copy .env.example .env.local   # then fill the real values
npm install
npm run seed:extract           # regenerates data/menu.seed.json from app.js
npm run seed:import            # safe upsert (no duplicates, never deletes DB rows)
npm run setup:admin            # creates the ADMIN_EMAIL/ADMIN_PASSWORD auth user
```

`data/menu.seed.json` is committed as the reproducible seed snapshot. The import
is non-destructive: rows that exist in the DB but not in the seed are kept.

## 4) Set production env vars on Vercel

```bash
vercel env add SUPABASE_URL                     production
vercel env add SUPABASE_PUBLISHABLE_KEY         production
vercel env add SUPABASE_SERVICE_ROLE_KEY        production   # secret
vercel env add ADMIN_CODE                       production   # secret (20+ random chars)
vercel env add ADMIN_EMAIL                      production
vercel env add ADMIN_PASSWORD                   production   # secret
vercel env add COOKIE_SECURE true               production
# optional (existing alert emails):
vercel env add SENDGRID_API_KEY production
vercel env add SENDER_EMAIL production
vercel env add EMAIL_TO production
```

## 5) Deploy

```bash
npx vercel --prod --yes
```

## 6) Verify

```bash
npm run test:prod    # BASE_URL, SUPABASE_URL, ... must be set (see script header)
```

The suite asserts: RLS blocks anon INSERT/UPDATE/DELETE + hides hidden items,
admin login (wrong+fake-flag → 401, correct → 200 + HttpOnly cookies),
admin CRUD roundtrip with live persistence, logout invalidation, tampered-cookie → 401.

## URLs

- Public site: `https://chai-charcha-gamma.vercel.app`
- Admin login: `https://chai-charcha-gamma.vercel.app/admin/login.html`
- Admin dashboard: `https://chai-charcha-gamma.vercel.app/admin/`

## Security model

- **RLS**: `anon`/`authenticated` can only SELECT (products: only `is_visible=true`);
  there are **no** write policies for public roles — writes exist only through the
  serverless API backed by the service-role key.
- **Admin session**: `/api/admin/login` verifies `ADMIN_CODE` server-side
  (timing-safe), signs in the Supabase admin Auth user, and issues **HttpOnly**
  cookies. Every `/api/admin/*` call re-verifies the session and the admin email.
- **No secrets in the browser**: only `SUPABASE_URL` + anon key are public.
  The service-role key, `ADMIN_CODE`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` live only in
  Vercel env. `ADMIN_CODE` is never sent client-side; cookies are HttpOnly.
- **Public site**: reads products via the anon key; if the cloud is unreachable it
  falls back to the built-in seed and shows a notice banner.