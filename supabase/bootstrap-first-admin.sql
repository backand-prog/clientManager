-- Run once in Supabase SQL Editor after registering and confirming the first admin account.
-- Replace the placeholder with that account's confirmed email address.
do $$
declare
  admin_email text := lower(trim('REPLACE_WITH_CONFIRMED_ADMIN_EMAIL'));
  admin_user_id uuid;
begin
  if admin_email = 'replace_with_confirmed_admin_email' then
    raise exception 'Replace the email placeholder before running this script.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(87243, 1);

  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An admin already exists; this bootstrap script can only run when there are no admins.';
  end if;

  select u.id into admin_user_id
  from auth.users u
  where lower(u.email) = admin_email
    and u.email_confirmed_at is not null;

  if admin_user_id is null then
    raise exception 'No confirmed account was found for that email. Register and confirm it first.';
  end if;

  update public.profiles
  set role = 'admin', trainer_application_status = 'none'
  where id = admin_user_id;

  if not found then
    raise exception 'The account has no profile; run the application schema and retry.';
  end if;
end;
$$;
