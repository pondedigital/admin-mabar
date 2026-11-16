-- ============================================================
-- Gmail login, legacy account claim, and "create your PB" onboarding.
-- Safe to re-run. Run once in the Supabase SQL editor (free tier is fine).
-- See docs/auth-gmail.md for the full flow.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ------------------------------------------------------------
-- 1. Failed claim attempts, for brute-force protection.
--    Lives in `private`, which PostgREST does not expose.
-- ------------------------------------------------------------
create table if not exists private.claim_attempts (
  id bigint generated always as identity primary key,
  username text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists claim_attempts_username_time_idx
  on private.claim_attempts (username, attempted_at desc);
create index if not exists claim_attempts_time_idx
  on private.claim_attempts (attempted_at desc);

-- ------------------------------------------------------------
-- 2. claim_legacy_account: move an old username account onto a Gmail.
--    Same auth user id -> pb_admins, sessions and history are kept.
--    Verifies the old password server-side; sends no email.
--    Returns a status code instead of raising, so failed attempts
--    are actually recorded (an exception would roll the insert back).
-- ------------------------------------------------------------
create or replace function public.claim_legacy_account(
  p_username text,
  p_password text,
  p_new_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_new_email, '')));
  v_username text := trim(coalesce(p_username, ''));
  v_user_id uuid;
  v_current_email text;
  v_hash text;
begin
  if v_email !~ '^[a-z0-9]([a-z0-9.+_-]*[a-z0-9])?@(gmail|googlemail)\.com$' then
    return 'invalid_email';
  end if;

  -- 5 failures per username per 15 minutes, 30 failures overall per 5 minutes.
  if (select count(*) from private.claim_attempts
        where username = v_username and attempted_at > now() - interval '15 minutes') >= 5
     or (select count(*) from private.claim_attempts
        where attempted_at > now() - interval '5 minutes') >= 30 then
    return 'locked';
  end if;

  select u.id, u.email::text, u.encrypted_password
    into v_user_id, v_current_email, v_hash
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = v_username
  limit 1;

  if v_user_id is null
     or v_hash is null
     or v_hash = ''
     or v_hash <> extensions.crypt(coalesce(p_password, ''), v_hash) then
    insert into private.claim_attempts (username) values (v_username);
    return 'invalid_credentials';
  end if;

  -- Already on a Gmail address: nothing to claim, just sign in with it.
  if lower(coalesce(v_current_email, '')) ~ '@(gmail|googlemail)\.com$' then
    return 'already_claimed';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email and id <> v_user_id) then
    return 'email_taken';
  end if;

  update auth.users
  set email = v_email,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = v_user_id;

  update auth.identities
  set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_email)),
      updated_at = now()
  where user_id = v_user_id
    and provider = 'email';

  delete from private.claim_attempts where username = v_username;
  return 'ok';
end;
$$;

revoke all on function public.claim_legacy_account(text, text, text) from public;
grant execute on function public.claim_legacy_account(text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. create_my_pb: a signed-in account with no PB creates one
--    and becomes its admin. Raises a short code the app maps to copy.
-- ------------------------------------------------------------
create or replace function public.create_my_pb(p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_pb_id bigint;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;
  if exists (select 1 from public.pb_admins where admin_id = v_uid) then
    raise exception 'already_has_pb';
  end if;
  if exists (select 1 from public.pbs where lower(name) = lower(v_name)) then
    raise exception 'name_taken';
  end if;

  insert into public.pbs (name) values (v_name) returning id into v_pb_id;
  insert into public.pb_admins (pb_id, admin_id) values (v_pb_id, v_uid);
  return v_pb_id;
exception
  when unique_violation then
    raise exception 'name_taken';
end;
$$;

revoke all on function public.create_my_pb(text) from public;
grant execute on function public.create_my_pb(text) to authenticated;

-- ------------------------------------------------------------
-- 4. OPTIONAL, after every legacy admin has claimed their account:
--    the old username -> email lookup is no longer used by the app.
--    Revoking it stops anyone from looking up emails by username.
-- ------------------------------------------------------------
-- revoke execute on function public.email_for_username(text) from anon, authenticated;



┌──────────────────────────────┬──────────────────────────┐
│            Email             │        Password           │
├──────────────────────────────┼──────────────────────────┤
├──────────────────────────────┼──────────────────────────┤
│ lala@gmail.com               │ lala                     │
├──────────────────────────────┼──────────────────────────┤
│ windo@gmail.com              │ windo                    │
├──────────────────────────────┼──────────────────────────┤
│ pandu@gmail.com              │ pandu                    │
├──────────────────────────────┼──────────────────────────┤
│ pandu… ipul@gmail.com        │ ipul                     │
└──────────────────────────────┴────────────────────────── 

