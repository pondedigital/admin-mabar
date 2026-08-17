# Backend + Database Plan (admin-mabar)

Notes for adding a real backend/database to PONDE CLICK, to be implemented in
a later session using TDD. Captures the current-state findings, the
architecture decision, the DB schema, and a phase-by-phase TDD plan from
users through to the finance report.

**Update:** database/backend provider is **Supabase**.

## Current state (as of this writing)

The app runs entirely client-side: all state (players, matches, queue,
payments, expenses) lives in `localStorage` via `usePersistentState`
(`app/hooks/usePersistentState.ts`). Login is a hardcoded `admin`/`mabar123`
check (`app/components/LoginPage.tsx`) with a `localStorage`-based "session"
(`app/lib/session.ts`). There is only ever **one active mabar at a time** —
no concept of a saved, historical event, no server, no database.

**Deployment note:** the app is currently deployed to **GitHub Pages** as a
static SPA (`.github/workflows/deploy.yml`, `react-router.config.ts` has
`ssr: false`). Normally a backend can't run on GitHub Pages — but with
Supabase, the "backend" (Postgres + Auth + auto-generated REST API) is
Supabase's hosted service, not code we run ourselves. The static SPA can call
Supabase directly from the browser via `supabase-js`, secured by the public
anon key + Row Level Security policies. **GitHub Pages hosting can stay
as-is; no move to a Node host is required.** (The unused `Dockerfile` /
`react-router-serve` path is no longer needed for this plan — only revisit it
if some future piece of logic truly can't live in Postgres/RLS and needs a
trusted server.)

## Architecture decision

- **Supabase** for both database and backend:
  - **Postgres** (Supabase-hosted) as the database.
  - **Supabase Auth** for login instead of hand-rolled password hashing +
    session tables — it already provides signup/login, hashed passwords,
    JWT-based sessions, and session refresh. Replaces the entire custom auth
    phase from the earlier version of this plan.
  - **`supabase-js`** client called directly from the frontend (loaders or
    components) for reads/writes, instead of a custom Node API layer.
  - **Row Level Security (RLS)** enabled on every table as the actual access
    control boundary, since there's no trusted server in front of the DB
    anymore. Start simple: all `authenticated` users can read/write; tighten
    with role-based policies later using the `profiles.role` column (see
    schema below).
  - **Supabase CLI** for local dev + migrations (`supabase init`,
    `supabase start`, SQL migration files, `supabase db push`), instead of
    Prisma. `supabase gen types typescript` generates typed row types from
    the schema for use in the app.
- New first-class entity: **`mabar_sessions`** (one row per game day/event).
  Today's single global state becomes one row; this is what makes session
  history and per-event finance reports possible. (Unchanged from before.)

**Tradeoff to be aware of:** business validations that today live in
`MabarContext.tsx` (e.g. "can't create a match with fewer than 2 players",
"can't finish a match at 0-0", "can't delete a player who already played",
court availability) will, in a direct-from-browser Supabase setup, only be
enforced by whatever calls `supabase-js` — RLS policies don't express that
kind of business logic well. For a small internal admin tool (a handful of
trusted admins) it's fine to keep these validations in a TypeScript
"domain" layer that wraps `supabase-js` calls (same as today, just swapping
the storage backend) and treat RLS purely as the auth boundary. If this ever
needs to be bullet-proof against a malicious authenticated client, move the
critical checks into Postgres (`CHECK` constraints / triggers / `SECURITY
DEFINER` functions called via RPC) — call this out as a stretch item, not
required for v1.

Existing pure logic worth reusing as-is (already framework-agnostic,
currently **untested** — write tests for these first, before anything else
touches them):
- `app/lib/pairing.ts` — `generateBalancedMatch(es)` (auto-pairing algorithm)
- `app/lib/match.ts` — `splitTeams` (team A/B split by position)
- `app/lib/format.ts` — formatting helpers

## Tech stack additions

- `vitest` — test runner (native Vite integration, already using Vite 8)
- `@supabase/supabase-js` — client used for all reads/writes
- Supabase CLI (`supabase` npm package or brew) — local dev stack (Postgres +
  Auth + PostgREST via Docker under the hood), migrations, type generation
- `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- No Prisma, no `argon2`/`bcryptjs`, no `docker-compose.yml` — Supabase CLI's
  `supabase start` replaces all three
- `react-router.config.ts` can stay `ssr: false`; no deploy target change

## Database schema, in build order

Supabase manages its own `auth.users` table (email, hashed password, etc.) —
we don't model that ourselves. We add a `profiles` table keyed to it for
app-specific fields like `role`.

```
profiles                id (uuid, = auth.users.id), username, role, created_at
                         -- one row per Supabase Auth user; role: admin|bendahara|viewer
                         -- (only "admin" used at first, column exists so a
                         -- treasurer/viewer login needs no migration later)

players                 id (uuid), name, default_level, created_at
                         -- club roster, reused across events

mabar_sessions           id (uuid), gor_name, pb_name, match_date, num_courts,
                         payment_mode, all_in_fee, shuttlecock_price, base_fee,
                         status (open|closed), created_by -> profiles, created_at, updated_at

mabar_session_players    id (uuid), mabar_session_id -> mabar_sessions, player_id -> players,
                         level_at_session, present, pairing_offset, adjustment,
                         paid, payment_method
                         UNIQUE(mabar_session_id, player_id)

matches                  id (uuid), mabar_session_id, court, shuttlecocks, score_a, score_b,
                         status (active|finished), created_at, finished_at
match_players             id (uuid), match_id -> matches, player_id -> players, position (int)
                         -- team A/B derived from position via splitTeams(), same as today

queued_matches             id (uuid), mabar_session_id, created_at
queued_match_players        id (uuid), queued_match_id, team (A|B), position, player_id -> players
                         UNIQUE(queued_match_id, team, position)

expenses                  id (uuid), mabar_session_id, category (kok_slop|kok_satuan|lapangan|lain),
                         qty, unit_price, note
                         -- normalizes today's 4 hardcoded expense fields into rows;
                         -- ExpenseForm UI keeps the same 4 categories, just persisted as rows
                         -- instead of fixed columns, so a 5th category later needs no migration
```

Finance report is **not** a stored table — it's a query over one
`mabar_session`: sum `mabar_session_players.adjustment + calculated per-match
shuttlecock cost` for income (porting the exact `playerStats` reduction
currently in `MabarContext.tsx:497-544`), sum `expenses` for outgo, `saldo =
income - outgo`. Note: today's `totalBiayaTerkumpul` sums cost for **all**
present players regardless of `paid` — that quirk should be preserved as-is
during migration (not a bug fix; revisit separately if you want it changed to
paid-only).

`mabar_sessions.status = 'closed'` freezes a session (no more edits) so a
finance report, once closed, is a stable historical record. Enforce this
either in the TS domain layer (reject writes when `status = 'closed'`) or,
for real tamper-resistance, with an `UPDATE`-blocking RLS policy/trigger on
closed sessions.

## TDD phases (red -> green -> refactor, in dependency order)

**Phase 0 — foundation**
- `supabase init`, `supabase start` (local Postgres + Auth + API), add
  vitest, `.env.example` with local + hosted Supabase project keys
- Write tests for existing pure logic first (safety net before anything else
  touches them): `pairing.test.ts`, `match.test.ts` covering
  `generateBalancedMatch(es)` and `splitTeams`
- One smoke test: `supabase-js` client can connect to the local instance and
  read from an empty table after the first migration applies

**Phase 1 — Auth & profiles** (everything else depends on a logged-in user)
- RED: signing up/logging in via Supabase Auth resolves a session; a new
  auth user gets (or can be given) a matching `profiles` row with a role;
  no-profile / wrong-role cases are rejected by the app layer
- GREEN: `profiles` table + trigger or app-level upsert to create a profile
  row on signup; `app/lib/auth.ts` wrapping `supabase.auth.signInWithPassword`
  etc.; wire into a login flow, replacing the hardcoded check in
  `LoginPage.tsx` and the manual `lib/session.ts` (Supabase's client SDK
  manages the session/JWT/refresh itself)
- Much smaller than a hand-rolled auth phase — most of the work is wiring,
  not building hashing/sessions from scratch

**Phase 2 — Players (roster)**
- RED: create (name required), list, update level, "can't delete a player
  who has already played" (ports the existing guard in
  `MabarContext.deletePlayer`)
- GREEN: `players` table + a thin service wrapping `supabase-js` queries;
  `PemainTab` calls it instead of local context mutation

**Phase 3 — Mabar sessions**
- RED: create (with settings defaults), update settings, close (locks
  edits), list history
- GREEN: `mabar_sessions` table + service — this becomes the anchor id
  every later table hangs off of

**Phase 4 — Session participation (tagihan)**
- RED: join session -> `pairing_offset` = current min effective count (port
  `minEffectiveCount`/`effectivePlayCount` from `MabarContext.tsx:178-188`,
  pin with tests matching today's behavior exactly), re-toggle presence
  re-levels offset, set adjustment, set paid/payment method
- GREEN: `mabar_session_players` table + service

**Phase 5 — Matches & queue (pertandingan)**
- RED: create match (>= 2 players, no player already active, court
  availability — ports `createMatch`/`nextFreeCourt` validation), update
  score, finish (rejects 0-0), delete, generate via `generateBalancedMatches`
  (already unit-tested in Phase 0), start/cancel/reassign queued match
- GREEN: `matches`/`match_players`/`queued_matches`/`queued_match_players` +
  service

**Phase 6 — Expenses & finance report (keuangan)**
- RED: add expense line item, `totalPengeluaran` aggregation,
  `totalBiayaTerkumpul` aggregation (pin exact current formula), `saldoAkhir`,
  closed session -> report is immutable
- GREEN: `expenses` table + a `getFinanceReport(mabarSessionId)` query
  (either composed client-side from a few `supabase-js` selects, or as a
  single Postgres view/RPC function if the aggregation gets unwieldy)

**Phase 7 — Frontend integration**
- Swap `MabarContext`'s `usePersistentState` internals for the Phase 1-6
  services (`supabase-js` calls), keeping the same hook surface (`useMabar()`)
  so tab components (`PemainTab`, `PertandinganTab`, `TagihanTab`,
  `KeuanganTab`, `RekapTab`, `KlasemenTab`) need minimal changes
- Add a small "Riwayat Mabar" history list screen (now possible since
  sessions are real rows)
- No deploy target change needed (still GitHub Pages) — just add the
  Supabase URL/anon key as repo secrets for the build step

Each phase = new test file(s) under `app/server/**/*.test.ts` (or
`app/lib/**/*.test.ts` for the service wrappers) written and run **failing**
first, then the minimal implementation to turn them green, then a quick
refactor pass — repeated phase by phase rather than all tests up front.

## Verification per phase

- `npm run typecheck` after each phase
- `npx vitest run` (unit tests + integration tests against the local
  `supabase start` instance) green before moving to the next phase
- After Phase 1: manually sign in through the running dev server and confirm
  the Supabase session survives a refresh
- After Phase 7: run a full mabar day through the UI (add players -> play
  matches -> mark payments -> add expenses -> view finance report -> close
  session) against a real (hosted, not just local) Supabase project, then
  confirm it reappears correctly after a browser restart / different device
  (proves it's DB-backed, not localStorage)
