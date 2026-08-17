# Supabase Schema + React Wiring Guide

Concrete, copy-pasteable companion to `docs/backend-plan.md` (which has the
phased TDD narrative). This doc answers two questions directly:

1. **What tables do I create in Supabase?** — full SQL below, ready to run in
   the Supabase SQL editor or as a `supabase/migrations/*.sql` file.
2. **What do I change in the React app to use them?** — file-by-file diff
   plan from today's `localStorage` state to Supabase-backed state.

One deviation from `backend-plan.md`: that doc sketched `uuid` primary keys
everywhere. Per Supabase Postgres best practice, random UUIDv4 PKs cause
index fragmentation and are unnecessary for a single-tenant internal tool —
this doc uses `bigint generated always as identity` for every app table
except `profiles`, whose id must equal `auth.users.id` (uuid, owned by
Supabase Auth).

---

## 1. Tables to create

Run top-to-bottom (respects FK dependency order). Safe to paste as one script
in the Supabase SQL editor, or split into `supabase/migrations/0001_init.sql`
if you adopt the Supabase CLI.

```sql
-- ============================================================
-- profiles — one row per Supabase Auth user
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  role text not null default 'admin' check (role in ('admin', 'bendahara', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    'admin'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- login is by username, but Supabase Auth only signs in by email — this
-- SECURITY DEFINER RPC resolves username -> email for the anon client to
-- call before signInWithPassword (RLS blocks anon from reading profiles
-- directly, so this is the one narrow, explicit bypass).
alter table public.profiles add constraint profiles_username_key unique (username);

create or replace function public.email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = p_username
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- ============================================================
-- players — club roster, reused across mabar sessions
-- ============================================================
create table public.players (
  id bigint generated always as identity primary key,
  name text not null,
  default_level text not null default 'Pemula'
    check (default_level in ('Pemula', 'Menengah', 'Mahir')),
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "authenticated users have full access to players"
  on public.players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- mabar_sessions — one row per game day/event (new concept —
-- today's app has only ever one global, unsaved "session")
-- ============================================================
create table public.mabar_sessions (
  id bigint generated always as identity primary key,
  gor_name text not null default '',
  pb_name text not null default 'ADMIN PONDE',
  match_date date not null,
  num_courts int not null default 1 check (num_courts > 0),
  payment_mode text not null default 'lapangan_kok'
    check (payment_mode in ('lapangan_kok', 'all_in')),
  all_in_fee numeric not null default 35000,
  shuttlecock_price numeric not null default 3000,
  base_fee numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mabar_sessions_created_by_idx on public.mabar_sessions (created_by);
create index mabar_sessions_status_idx on public.mabar_sessions (status);

alter table public.mabar_sessions enable row level security;

create policy "authenticated users have full access to mabar_sessions"
  on public.mabar_sessions for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger mabar_sessions_set_updated_at
  before update on public.mabar_sessions
  for each row execute function public.set_updated_at();

-- ============================================================
-- mabar_session_players — attendance/payment per player per session
-- ============================================================
create table public.mabar_session_players (
  id bigint generated always as identity primary key,
  mabar_session_id bigint not null references public.mabar_sessions (id) on delete cascade,
  player_id bigint not null references public.players (id) on delete cascade,
  level_at_session text not null check (level_at_session in ('Pemula', 'Menengah', 'Mahir')),
  present boolean not null default true,
  pairing_offset int not null default 0,
  adjustment numeric not null default 0,
  paid boolean not null default false,
  payment_method text check (payment_method in ('cash', 'qris', 'transfer')),
  unique (mabar_session_id, player_id)
);

create index mabar_session_players_session_idx on public.mabar_session_players (mabar_session_id);
create index mabar_session_players_player_idx on public.mabar_session_players (player_id);

alter table public.mabar_session_players enable row level security;

create policy "authenticated users have full access to mabar_session_players"
  on public.mabar_session_players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- matches + match_players
-- ============================================================
create table public.matches (
  id bigint generated always as identity primary key,
  mabar_session_id bigint not null references public.mabar_sessions (id) on delete cascade,
  court int,
  shuttlecocks int not null default 0,
  score_a int not null default 0,
  score_b int not null default 0,
  status text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index matches_session_idx on public.matches (mabar_session_id);

alter table public.matches enable row level security;

create policy "authenticated users have full access to matches"
  on public.matches for all
  to authenticated
  using (true)
  with check (true);

create table public.match_players (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.matches (id) on delete cascade,
  player_id bigint not null references public.players (id) on delete cascade,
  position int not null check (position between 0 and 3),
  unique (match_id, position)
);

create index match_players_match_idx on public.match_players (match_id);
create index match_players_player_idx on public.match_players (player_id);

alter table public.match_players enable row level security;

create policy "authenticated users have full access to match_players"
  on public.match_players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- queued_matches + queued_match_players
-- ============================================================
create table public.queued_matches (
  id bigint generated always as identity primary key,
  mabar_session_id bigint not null references public.mabar_sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index queued_matches_session_idx on public.queued_matches (mabar_session_id);

alter table public.queued_matches enable row level security;

create policy "authenticated users have full access to queued_matches"
  on public.queued_matches for all
  to authenticated
  using (true)
  with check (true);

create table public.queued_match_players (
  id bigint generated always as identity primary key,
  queued_match_id bigint not null references public.queued_matches (id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  position int not null check (position in (0, 1)),
  player_id bigint not null references public.players (id) on delete cascade,
  unique (queued_match_id, team, position)
);

create index queued_match_players_queue_idx on public.queued_match_players (queued_match_id);
create index queued_match_players_player_idx on public.queued_match_players (player_id);

alter table public.queued_match_players enable row level security;

create policy "authenticated users have full access to queued_match_players"
  on public.queued_match_players for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- expenses — normalizes the 4 hardcoded expense fields into rows
-- ============================================================
create table public.expenses (
  id bigint generated always as identity primary key,
  mabar_session_id bigint not null references public.mabar_sessions (id) on delete cascade,
  category text not null check (category in ('kok_slop', 'kok_satuan', 'lapangan', 'lain')),
  qty numeric not null default 1,
  unit_price numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index expenses_session_idx on public.expenses (mabar_session_id);

alter table public.expenses enable row level security;

create policy "authenticated users have full access to expenses"
  on public.expenses for all
  to authenticated
  using (true)
  with check (true);
```

### Notes on the policies above

- All app tables use one permissive `for all ... using (true)` policy for the
  `authenticated` role. This matches `backend-plan.md`'s stated tradeoff: for
  a handful of trusted admin users, RLS here is just the "must be logged in"
  boundary — business rules (min 2 players, no 0-0 finish, delete guards,
  court availability) stay in a TypeScript service layer, not in Postgres.
  Tighten later with `profiles.role` if a read-only "viewer" role is needed.
- `profiles` is the one table with real per-row policies (a user can only
  edit their own profile) since it's tied 1:1 to a login identity.
- Every foreign key has a matching index (`schema-foreign-key-indexes` best
  practice) so cascading deletes and joins stay fast even though row counts
  here will always be small.

### Finance report — no table needed

Per `backend-plan.md`, the finance report (`totalBiayaTerkumpul`,
`totalPengeluaran`, `saldoAkhir`) is a **query**, not a table: sum
`mabar_session_players` cost contribution + sum `expenses` for a given
`mabar_session_id`. Port the exact formula from
`MabarContext.tsx` (`playerStats` reduction) rather than re-deriving it, to
preserve the existing quirk where `totalBiayaTerkumpul` counts all present
players regardless of `paid`.

---

## 2. React code changes

The app currently has **zero** components/context wired to Supabase — the
two client files exist but are unused. Wiring means replacing
`usePersistentState` calls in `MabarContext.tsx` with Supabase-backed reads
and async mutations, without changing the tab components' props (they only
talk to `useMabar()`).

| File | Today | Change needed |
|---|---|---|
| `.env.local` / `.env.development` / `.env.production` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` already set | None — already correct, just confirm they point at the real project once created |
| `app/lib/supabase/client.ts` | Defines `createBrowserClient`, unused elsewhere | Becomes the single import point for every read/write. Optionally type it as `SupabaseClient<Database>` (see below) |
| `app/lib/supabase/server.ts` | SSR cookie-based client, unused (`ssr: false` in `react-router.config.ts`, static SPA) | Delete it, or leave as dead code — not needed for this plan |
| *(new)* `app/types/database.ts` | doesn't exist | Generate with `supabase gen types typescript --project-id <ref> > app/types/database.ts` after running the SQL above, so every query is typed against the real schema |
| *(new)* `app/lib/services/players.ts`, `sessions.ts`, `matches.ts`, `expenses.ts` | doesn't exist — all logic lives inline in `MabarContext.tsx` | New thin wrappers around `supabase-js` calls, each one carrying the validation that's currently a closure in the context: `createMatch` (>=2 players, no player already active, court availability via `nextFreeCourt`), `finishMatch` (reject 0-0), `deletePlayer` (reject if already played) |
| *(new)* `app/lib/auth.ts` | doesn't exist | Wrap `supabase.auth.signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange` |
| `app/lib/session.ts` | Hand-rolled 24h localStorage session (`mabar_session` key) | Delete — Supabase Auth's client SDK manages the session/JWT/refresh itself |
| `app/components/LoginPage.tsx` | Hardcoded `username === "admin" && password === "mabar123"` | Keeps the username field. `signIn(username, password)` in `app/lib/auth.ts` first resolves the username to an email via the `email_for_username` RPC (SQL above), then calls `supabase.auth.signInWithPassword({ email, password })`. The error shown on failure is a generic "Username atau password salah!" regardless of which step failed, so failed logins don't reveal whether a username exists |
| `app/components/MabarApp.tsx` | Gates on `isAuthenticated` from `lib/session.ts`; calls `clearPersistentState()` on logout/expiry | Gate on `supabase.auth.getSession()` + `onAuthStateChange` listener; logout calls `supabase.auth.signOut()` instead of clearing localStorage keys |
| `app/hooks/usePersistentState.ts` | Generic localStorage-backed `useState`, used for all 19 pieces of `MabarContext` state | Stays as-is for pure UI prefs if any remain, but every data field it currently backs (`players`, `matches`, `queue`, `playerAdjustments`, `playerPayments`, `numCourts`, `paymentMode`, fee/expense settings, `matchDate`, `gorName`, `pbName`) moves off it and into Supabase-backed state |
| `app/context/MabarContext.tsx` | All 19 state fields via `usePersistentState`; synchronous action functions closing over `setX` | The core rewrite: each action (`addPlayer`, `createMatch`, `finishMatch`, `generateMatches`, `setPlayerPaid`, expense setters, etc.) becomes **async**, calling the new service layer, then updating local React state from the DB response (or refetching). See "biggest logic change" below for the ID implication |
| `app/types/mabar.ts` | `Player.id`, `Match.id`, etc. are `number` generated client-side via `Date.now()` | Keep the same field shape, but `id` becomes server-assigned (Postgres `bigint identity`) — returned only after `insert().select().single()` resolves, never generated client-side |
| `app/lib/pairing.ts`, `app/lib/match.ts`, `app/lib/format.ts` | Pure functions, already framework-agnostic | No changes — keep calling them with whatever data shape comes back from Supabase (same fields, just sourced from a DB row instead of local state) |
| *(new)* a "current mabar session" concept | Doesn't exist — app is a single global implicit session | On app load: fetch the most recent `mabar_sessions` row with `status = 'open'` for this context, or create one if none exists, so all six tabs keep working against one `mabar_session_id` without a UI change. A "Riwayat Mabar" history screen (listing closed sessions) becomes a small addition once this exists |

### The biggest logic change: client-generated IDs → server-generated IDs

Today, `addPlayer`, `createMatch`, `generateMatches`, and `queueManualMatch`
all synchronously build objects with `id: Date.now()` and push them into
state — this is what makes the current context code look simple and
synchronous. With Postgres `identity` columns, an id only exists **after**
the insert round-trips to Supabase. Every one of those action functions
needs to become `async`, await the insert, and use the row Supabase returns
(via `.select().single()`) instead of fabricating an id up front. This is
the one change that touches nearly every function in `MabarContext.tsx`, not
just a data-source swap.

### Recommended sequencing

Follow the phase order already laid out in `backend-plan.md` (Auth →
players → mabar_sessions → session_players → matches/queue → expenses →
frontend integration) rather than wiring everything at once — each phase
lines up with one table group above and can be tested against a running
`supabase start` instance before moving to the next.
