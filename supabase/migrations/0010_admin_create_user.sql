-- ============================================================
-- Focusly — 0010: Admin-created users + Google SMTP for emails
-- Run after 0009.
--
-- PART 1: admin_create_user()
--   Lets an administrator create an account directly from the UI,
--   even while registration is closed. The client only holds the
--   anon key, so this runs as a SECURITY DEFINER function (bypasses
--   RLS) but is guarded by public.is_admin().
--
-- PART 2: Google SMTP (email notifications for registrations)
--   Email notifications are NOT a database setting — they are
--   configured in the Supabase dashboard:
--     1. Supabase Dashboard -> Authentication -> Emails -> SMTP
--     2. Turn ON "Enable custom SMTP"
--     3. Provider: Google / Gmail SMTP, then:
--          Host: smtp.gmail.com
--          Port: 465 (SSL) or 587 (STARTTLS)
--          Username: you@gmail.com
--          Password: an App Password (Google Account -> Security ->
--                    2-Step Verification -> App passwords). Gmail does
--                    NOT accept your normal account password here.
--     4. Save, then send a test email from the dashboard.
--   With SMTP on, Supabase sends confirmation links for new
--   registrations, password resets and invites. "Confirm email"
--   remains enabled so registration emails are actually sent.
--   Admin-created users below are marked email_confirmed_at = now()
--   so they can sign in immediately (no confirmation email needed).
-- ============================================================

-- pgcrypto provides crypt()/gen_salt() for bcrypt password hashing.
create extension if not exists pgcrypto schema extensions;

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_role text default 'user',
  p_custom_fields jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = auth, public, extensions
as $$
declare
  new_id uuid := gen_random_uuid();
  hashed text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can create users';
  end if;

  p_email := lower(trim(p_email));
  if p_email = '' or position('@' in p_email) < 2 then
    raise exception 'A valid email address is required';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  if not exists (select 1 from public.roles where name = p_role) then
    raise exception 'Unknown role: %', p_role;
  end if;
  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'A user with that email already exists';
  end if;

  hashed := crypt(p_password, gen_salt('bf'));

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, invited_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', new_id,
    'authenticated', 'authenticated', p_email, hashed,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    p_custom_fields,
    now(), now()
  );

  -- The on_auth_user_created trigger already made the profile row;
  -- upsert sets the requested role + fields.
  insert into public.profiles (id, email, role, custom_fields)
  values (new_id, p_email, p_role, p_custom_fields)
  on conflict (id) do update
    set role = excluded.role,
        custom_fields = excluded.custom_fields,
        email = excluded.email;

  return new_id;
end;
$$;

revoke execute on function public.admin_create_user(text, text, text, jsonb) from anon, public;
grant execute on function public.admin_create_user(text, text, text, jsonb) to authenticated;