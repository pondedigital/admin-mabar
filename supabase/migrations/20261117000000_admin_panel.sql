-- ============================================================
-- Platform admin panel: a trusted super-admin can create a user account
-- and attach it to a PB (create the PB if new). Nothing else.
-- Safe to re-run. Run once in the Supabase SQL editor (free tier is fine).
-- See docs/admin-panel.md.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1. Who is a platform admin. This table is NOT writable through the API:
--    it has no insert/update/delete policy, so only the dashboard (SQL /
--    service role) can change it. Bootstrap the first admin by hand:
--
--      insert into public.platform_admins (user_id)
--      select id from auth.users where email = 'you@gmail.com';
-- ------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- security definer, so it reads platform_admins without recursing through RLS.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "platform admins can read the admin list" on public.platform_admins;
create policy "platform admins can read the admin list"
  on public.platform_admins for select
  to authenticated
  using (public.is_platform_admin());

-- ------------------------------------------------------------
-- 2. admin_create_user: create a loginable Gmail+password account and attach
--    it to a PB (reusing the PB if the name already exists). Gated to platform
--    admins by the check on the first line. Returns a short status code.
-- ------------------------------------------------------------
create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_pb_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_pb text := trim(coalesce(p_pb_name, ''));
  v_user_id uuid := gen_random_uuid();
  v_pb_id bigint;
begin
  if not public.is_platform_admin() then
    return 'forbidden';
  end if;
  if v_email !~ '^[a-z0-9]([a-z0-9.+_-]*[a-z0-9])?@(gmail|googlemail)\.com$' then
    return 'invalid_email';
  end if;
  if char_length(coalesce(p_password, '')) < 6 then
    return 'weak_password';
  end if;
  if char_length(v_pb) < 2 or char_length(v_pb) > 60 then
    return 'invalid_pb';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    return 'email_taken';
  end if;

  -- Create the auth user. Token columns are set to '' (not null): GoTrue
  -- fails to scan null token fields, which would block login.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('email', v_email, 'email_verified', true),
    now(), now(), false, false,
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Reuse the PB if the name exists, else create it; link the user as admin.
  select id into v_pb_id from public.pbs where lower(name) = lower(v_pb) limit 1;
  if v_pb_id is null then
    insert into public.pbs (name) values (v_pb) returning id into v_pb_id;
  end if;
  insert into public.pb_admins (pb_id, admin_id)
  values (v_pb_id, v_user_id)
  on conflict (pb_id, admin_id) do nothing;

  return 'ok';
exception
  when unique_violation then
    return 'email_taken';
end;
$$;

revoke all on function public.admin_create_user(text, text, text) from public;
grant execute on function public.admin_create_user(text, text, text) to authenticated;
