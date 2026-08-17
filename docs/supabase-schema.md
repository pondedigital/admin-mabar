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

---

## 3. Multi-PB support (clubs) — schema addition

Sections 1–2 assumed one shared, global mabar context. That's no longer
true: an admin account can now handle **multiple PBs** (clubs), and
`MabarSettingsForm` lets them switch which PB they're currently working on.
This is a real multi-tenancy change — different PBs' rosters, matches, and
money now live in the same tables — so it also **tightens RLS**, which was
previously "any authenticated user, full access" everywhere.

**Design decisions made without asking back** (flagging them here so
they're easy to correct):
- **Players stay one shared roster** across all PBs (no `pb_id` on
  `players`). Autocomplete/dedup on the "Tambah Pemain" form matches by name
  against the whole roster, not just the active PB — the same person is the
  same person even if they play at two clubs.
- **Switching PB in Settings swaps the entire active session** (players
  attending today, matches, queue, expenses) to that PB's own open
  `mabar_sessions` row — it does not relabel/move the session you were just
  looking at. Each PB keeps its own "today."
- **"Hapus" on a player now only removes them from today's session**
  (`mabar_session_players`), not the shared roster row — deleting the
  roster row would fragment that player's history at every other PB/session
  they've ever played.

### Run this against the already-deployed schema

Ordered so every `references`/join target exists before anything that
depends on it, and safe to re-run end-to-end (`if not exists` / `drop ...
if exists` guards throughout) regardless of how far a previous attempt got.

```sql
-- 1. PBs (clubs) as a first-class entity.
create table if not exists public.pbs (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.pbs enable row level security;

drop policy if exists "authenticated users can read pbs" on public.pbs;
create policy "authenticated users can read pbs"
  on public.pbs for select
  to authenticated
  using (true);

-- 2. Migrate mabar_sessions.pb_name (free text) -> pbs + pb_id. Must run
--    before anything below that references mabar_sessions.pb_id.
insert into public.pbs (name)
select distinct pb_name from public.mabar_sessions
where pb_name is not null and pb_name <> ''
on conflict (name) do nothing;

alter table public.mabar_sessions add column if not exists pb_id bigint references public.pbs (id);

update public.mabar_sessions s
set pb_id = p.id
from public.pbs p
where p.name = s.pb_name
  and s.pb_id is null;

-- If this returns any rows, assign pb_id to them by hand before continuing
-- (a session whose pb_name was blank has no pb to migrate into):
--   select id, pb_name, created_by from public.mabar_sessions where pb_id is null;

alter table public.mabar_sessions alter column pb_id set not null;
alter table public.mabar_sessions drop column if exists pb_name;

create index if not exists mabar_sessions_pb_idx on public.mabar_sessions (pb_id);

-- 3. Many-to-many: which admins handle which PB (one admin -> many PBs, and
--    vice versa, in case a club ever has co-admins).
create table if not exists public.pb_admins (
  id bigint generated always as identity primary key,
  pb_id bigint not null references public.pbs (id) on delete cascade,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pb_id, admin_id)
);

create index if not exists pb_admins_pb_idx on public.pb_admins (pb_id);
create index if not exists pb_admins_admin_idx on public.pb_admins (admin_id);

alter table public.pb_admins enable row level security;

drop policy if exists "admins can read their own pb_admins rows" on public.pb_admins;
create policy "admins can read their own pb_admins rows"
  on public.pb_admins for select
  to authenticated
  using ((select auth.uid()) = admin_id);

-- Best-effort: whoever created a session under a given pb_name becomes an
-- admin of that PB. (Needs mabar_sessions.pb_id from step 2.)
insert into public.pb_admins (pb_id, admin_id)
select distinct pb_id, created_by
from public.mabar_sessions
where created_by is not null
on conflict (pb_id, admin_id) do nothing;

-- 4. Helper schema + functions (now that mabar_sessions.pb_id and
--    pb_admins both exist). Never exposed via PostgREST, since only
--    `public` is exposed by default — no grants/revokes needed.
create schema if not exists private;

create or replace function private.is_pb_admin(p_pb_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pb_admins
    where pb_id = p_pb_id and admin_id = (select auth.uid())
  );
$$;

create or replace function private.is_pb_admin_of_session(p_session_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.mabar_sessions s
    join public.pb_admins pa on pa.pb_id = s.pb_id
    where s.id = p_session_id and pa.admin_id = (select auth.uid())
  );
$$;

create or replace function private.is_pb_admin_of_match(p_match_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.mabar_sessions s on s.id = m.mabar_session_id
    join public.pb_admins pa on pa.pb_id = s.pb_id
    where m.id = p_match_id and pa.admin_id = (select auth.uid())
  );
$$;

create or replace function private.is_pb_admin_of_queued_match(p_queued_match_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.queued_matches q
    join public.mabar_sessions s on s.id = q.mabar_session_id
    join public.pb_admins pa on pa.pb_id = s.pb_id
    where q.id = p_queued_match_id and pa.admin_id = (select auth.uid())
  );
$$;

-- 5. Tighten RLS now that different PBs' data shares these tables. Drops
--    both the original open policy name and this policy's own name, so
--    re-running is safe either way.
drop policy if exists "authenticated users have full access to mabar_sessions" on public.mabar_sessions;
drop policy if exists "pb admins manage their own pb's mabar_sessions" on public.mabar_sessions;
create policy "pb admins manage their own pb's mabar_sessions"
  on public.mabar_sessions for all to authenticated
  using ((select private.is_pb_admin(pb_id)))
  with check ((select private.is_pb_admin(pb_id)));

drop policy if exists "authenticated users have full access to mabar_session_players" on public.mabar_session_players;
drop policy if exists "pb admins manage session_players for their sessions" on public.mabar_session_players;
create policy "pb admins manage session_players for their sessions"
  on public.mabar_session_players for all to authenticated
  using ((select private.is_pb_admin_of_session(mabar_session_id)))
  with check ((select private.is_pb_admin_of_session(mabar_session_id)));

drop policy if exists "authenticated users have full access to matches" on public.matches;
drop policy if exists "pb admins manage matches for their sessions" on public.matches;
create policy "pb admins manage matches for their sessions"
  on public.matches for all to authenticated
  using ((select private.is_pb_admin_of_session(mabar_session_id)))
  with check ((select private.is_pb_admin_of_session(mabar_session_id)));

drop policy if exists "authenticated users have full access to match_players" on public.match_players;
drop policy if exists "pb admins manage match_players for their matches" on public.match_players;
create policy "pb admins manage match_players for their matches"
  on public.match_players for all to authenticated
  using ((select private.is_pb_admin_of_match(match_id)))
  with check ((select private.is_pb_admin_of_match(match_id)));

drop policy if exists "authenticated users have full access to queued_matches" on public.queued_matches;
drop policy if exists "pb admins manage queued_matches for their sessions" on public.queued_matches;
create policy "pb admins manage queued_matches for their sessions"
  on public.queued_matches for all to authenticated
  using ((select private.is_pb_admin_of_session(mabar_session_id)))
  with check ((select private.is_pb_admin_of_session(mabar_session_id)));

drop policy if exists "authenticated users have full access to queued_match_players" on public.queued_match_players;
drop policy if exists "pb admins manage queued_match_players for their queue" on public.queued_match_players;
create policy "pb admins manage queued_match_players for their queue"
  on public.queued_match_players for all to authenticated
  using ((select private.is_pb_admin_of_queued_match(queued_match_id)))
  with check ((select private.is_pb_admin_of_queued_match(queued_match_id)));

drop policy if exists "authenticated users have full access to expenses" on public.expenses;
drop policy if exists "pb admins manage expenses for their sessions" on public.expenses;
create policy "pb admins manage expenses for their sessions"
  on public.expenses for all to authenticated
  using ((select private.is_pb_admin_of_session(mabar_session_id)))
  with check ((select private.is_pb_admin_of_session(mabar_session_id)));
```

`players` and `pbs` themselves stay readable by any authenticated user
(names/levels and club names aren't sensitive, and the shared roster is what
makes cross-PB dedup possible) — only the session-scoped tables (attendance,
matches, money) are now locked to each PB's own admins.

### Seed PBs + assign admins

The migration above only creates `pbs` rows for PB names that already
existed in `mabar_sessions.pb_name`. If you're starting fresh (no sessions
created yet), create the PBs and assign each of the 4 seeded admins by hand:

```sql
insert into public.pbs (name) values
  ('PB PONDE'),
  ('PB PONDE'),
  ('PB PONDE'),
  ('PB PONDE')
on conflict (name) do nothing;

insert into public.pb_admins (pb_id, admin_id)
select pbs.id, profiles.id
from public.pbs
join public.profiles
  on (pbs.name, profiles.username) in (
    ('PB Windo', 'admin-windo'),
    ('PB Muchlis', 'admin-muchlis'),
    ('PB Pandu', 'admin-pandu'),
    ('PB Lala', 'admin-lala')
  )
on conflict (pb_id, admin_id) do nothing;
```

Edit the PB names and username mapping to match reality first (e.g. if one
admin should handle two PBs, just add another row).

### React code changes for this increment

| File | Change |
|---|---|
| `app/types/db.ts` | `MabarSessionRow.pb_name` → `pb_id: number`; added `PbRow`, `PbAdminRow` |
| `app/lib/services/pbs.ts` (new) | `listMyPbs(userId)` — PBs this admin administers, via `pb_admins` join `pbs` |
| `app/lib/services/sessions.ts` | `getOrCreateOpenSession(userId, pbId)` now scopes the "open session" lookup by `pb_id`, not just globally |
| `app/lib/services/players.ts` | Added `listRoster()` (whole shared roster, for autocomplete), `addExistingPlayerToSession(...)` (reuse an existing roster row), `removeFromSession(...)` (replaces the old `deletePlayer`, which hard-deleted the shared roster row) |
| `app/context/MabarContext.tsx` | Two-stage load: (1) resolve the logged-in admin's `pbOptions` + the shared `playerRoster`, defaulting `activePbId` to the last one used (persisted in `localStorage`) or the first option; (2) load/create that PB's open session and its data. `setActivePbId` re-runs stage 2. `addPlayer` now checks `playerRoster` first and reuses the existing `player_id` instead of inserting a duplicate roster row when the name matches |
| `app/components/tagihan/MabarSettingsForm.tsx` | "Nama PB" free-text input replaced with a PB picker (`<select>` when the admin has >1 PB, plain read-only text when they only have one) |
| `app/components/pemain/PemainTab.tsx` | Name input gained a `<datalist>` sourced from `playerRoster`, and prefills the level dropdown when the typed name exactly matches an existing roster player |

---

## 4. Reporting queries

Ad-hoc SQL for questions the app's UI doesn't answer today (run these
directly in the Supabase SQL editor — they bypass RLS since the editor runs
as the `postgres`/service role).

### Player ranking per PB, last 3 months

Same ranking definition as the in-app "Klasemen" tab
(`app/components/klasemen/Leaderboard.tsx`): wins first, point differential
as tiebreaker, over **finished** matches only. `match_players.position`
determines team (first half of positions = Team A, same rule as
`splitTeams()` in `app/lib/match.ts`), unlike `queued_match_players` which
already stores an explicit team column.

```sql
with recent_matches as (
  select m.id as match_id, s.pb_id, m.score_a, m.score_b
  from public.matches m
  join public.mabar_sessions s on s.id = m.mabar_session_id
  where m.status = 'finished'
    and s.match_date >= (current_date - interval '3 months')
),
match_team_size as (
  select match_id, count(*) as team_size
  from public.match_players
  group by match_id
),
match_player_teams as (
  select
    mp.match_id,
    mp.player_id,
    case when mp.position < ceil(mts.team_size / 2.0) then 'A' else 'B' end as team
  from public.match_players mp
  join match_team_size mts on mts.match_id = mp.match_id
),
player_match_results as (
  select
    rm.pb_id,
    mpt.player_id,
    case when (mpt.team = 'A' and rm.score_a > rm.score_b)
           or (mpt.team = 'B' and rm.score_b > rm.score_a) then 1 else 0 end as win,
    case when (mpt.team = 'A' and rm.score_a < rm.score_b)
           or (mpt.team = 'B' and rm.score_b < rm.score_a) then 1 else 0 end as lose,
    case when mpt.team = 'A' then rm.score_a - rm.score_b else rm.score_b - rm.score_a end
      as point_diff
  from recent_matches rm
  join match_player_teams mpt on mpt.match_id = rm.match_id
),
standings as (
  select pb_id, player_id,
    count(*) as played, sum(win) as wins, sum(lose) as losses, sum(point_diff) as point_diff
  from player_match_results
  group by pb_id, player_id
)
select
  pb.name as pb_name,
  pl.name as player_name,
  st.played, st.wins, st.losses, st.point_diff,
  rank() over (partition by st.pb_id order by st.wins desc, st.point_diff desc) as rank_in_pb
from standings st
join public.pbs pb on pb.id = st.pb_id
join public.players pl on pl.id = st.player_id
order by pb.name, rank_in_pb;
```

This covers every PB ("owned by any admin"). To scope it to one admin's own
PBs, add `where st.pb_id in (select pb_id from public.pb_admins where admin_id = '<uuid>')`
before the final `order by`.

### Players categorized by level, per PB

"Level" is stored per session (`mabar_session_players.level_at_session`), so
this uses each player's level from their **most recent** session at that PB.

```sql
with latest_level as (
  select distinct on (s.pb_id, msp.player_id)
    s.pb_id, msp.player_id, msp.level_at_session
  from public.mabar_session_players msp
  join public.mabar_sessions s on s.id = msp.mabar_session_id
  order by s.pb_id, msp.player_id, s.match_date desc, s.created_at desc
)
select pb.name as pb_name, ll.level_at_session as level, pl.name as player_name
from latest_level ll
join public.pbs pb on pb.id = ll.pb_id
join public.players pl on pl.id = ll.player_id
order by pb.name, ll.level_at_session, pl.name;
```

Add `count(*)` instead of listing names if you just want totals per level per PB:

```sql
select pb.name as pb_name, ll.level_at_session as level, count(*) as player_count
from latest_level ll  -- reuse the CTE above
join public.pbs pb on pb.id = ll.pb_id
group by pb.name, ll.level_at_session
order by pb.name, ll.level_at_session;
```
