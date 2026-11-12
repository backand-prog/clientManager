-- BackPlan PostgreSQL schema for Supabase
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'trainer', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workout_status as enum ('Beütemezve', 'Teljesítve', 'Lemondva');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null,
  specialty text,
  goal text,
  trainer_application_status text not null default 'none',
  status text not null default 'Aktív',
  adherence integer not null default 0 check (adherence between 0 and 100),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists trainer_application_status text not null default 'none';

alter table public.profiles
  drop constraint if exists profiles_trainer_application_status_check;
alter table public.profiles
  add constraint profiles_trainer_application_status_check
  check (trainer_application_status in ('none', 'pending', 'approved', 'rejected'));

-- Az edzői regisztrációhoz már nem kell adminisztrátori jóváhagyás: a korábban függőben lévők edzők lesznek.
update public.profiles set role = 'trainer', trainer_application_status = 'approved'
where trainer_application_status = 'pending' and role = 'client';
update public.profiles set trainer_application_status = 'none' where trainer_application_status = 'rejected';
-- A korábbi Studio csomag csapatkezelése megszűnt: az al-edzői kapcsolat és a hozzá tartozó jogosultságok törlődnek.
alter table public.profiles drop constraint if exists profiles_parent_studio_not_self;
drop index if exists public.profiles_parent_studio_idx;
alter table public.profiles drop column if exists parent_studio_id;

create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_check boolean := false;
begin
  if old.role = 'admin' then
    if tg_op = 'DELETE' then
      should_check := true;
    elsif new.role <> 'admin' then
      should_check := true;
    end if;
    if should_check then
      perform pg_catalog.pg_advisory_xact_lock(87243, 1);
      if not exists (
        select 1
        from public.profiles
        where role = 'admin' and id <> old.id
      ) then
        raise exception using
          errcode = '23514',
          message = 'Az utolsó adminfiók nem törölhető és nem fokozható le.';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_last_admin_removal on public.profiles;
create trigger profiles_prevent_last_admin_removal
before update of role or delete on public.profiles
for each row execute function public.prevent_last_admin_removal();

revoke all on function public.prevent_last_admin_removal() from public, anon, authenticated;

create table if not exists public.client_trainers (
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, trainer_id),
  check (client_id <> trainer_id)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  workout_date date not null,
  workout_time time not null,
  workout_type text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status public.workout_status not null default 'Beütemezve',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists client_trainers_trainer_idx on public.client_trainers (trainer_id);
create index if not exists workouts_client_idx on public.workouts (client_id, workout_date desc);
create index if not exists workouts_trainer_idx on public.workouts (trainer_id, workout_date desc);
create index if not exists profiles_pending_trainer_applications_idx
on public.profiles (created_at)
where trainer_application_status = 'pending';

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_assigned_trainer(client uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.client_trainers
    where client_id = client and trainer_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.client_trainers enable row level security;
alter table public.workouts enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_role() = 'admin'
  or (public.current_role() = 'trainer' and exists (
    select 1 from public.client_trainers ct where ct.client_id = profiles.id and ct.trainer_id = auth.uid()
  ))
);

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from public, anon, authenticated;
grant update (full_name, specialty, goal, status, adherence, notes) on public.profiles to authenticated;

drop policy if exists assignments_read on public.client_trainers;
create policy assignments_read on public.client_trainers for select to authenticated
using (
  client_id = auth.uid() or trainer_id = auth.uid() or public.current_role() = 'admin'
);

drop policy if exists assignments_admin_write on public.client_trainers;
create policy assignments_admin_write on public.client_trainers for all to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists workouts_read on public.workouts;
create policy workouts_read on public.workouts for select to authenticated
using (
  client_id = auth.uid() or trainer_id = auth.uid() or public.is_assigned_trainer(client_id) or public.current_role() = 'admin'
);

-- Kliens csak saját, edző nélküli (egyéni) edzést vehet fel. Edző a hozzá rendelt kliensnek veheti fel,
-- az edző megadható másik, a klienshez rendelt edzőre is (ezt a guard_workout_assignment trigger ellenőrzi).
drop policy if exists workouts_write on public.workouts;
create policy workouts_write on public.workouts for insert to authenticated
with check (
  public.current_role() = 'admin'
  or (public.current_role() = 'client' and client_id = auth.uid() and trainer_id is null)
  or (public.current_role() = 'trainer' and public.is_assigned_trainer(client_id) and trainer_id is not null)
);

drop policy if exists workouts_update on public.workouts;
create policy workouts_update on public.workouts for update to authenticated
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'client' and client_id = auth.uid())
  or (public.current_role() = 'trainer' and trainer_id = auth.uid())
)
with check (
  public.current_role() = 'admin'
  or (public.current_role() = 'client' and client_id = auth.uid())
  or (public.current_role() = 'trainer' and (trainer_id = auth.uid() or (public.is_assigned_trainer(client_id) and trainer_id is not null)))
);

-- A korábbi Studio csapatkezelés jogosultságainak eltávolítása.
drop policy if exists profiles_studio_update on public.profiles;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, specialty, goal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Új felhasználó'),
    case when new.raw_user_meta_data->>'requested_role' = 'trainer' then 'trainer'::public.user_role else 'client'::public.user_role end,
    case when new.raw_user_meta_data->>'requested_role' = 'trainer' then left(new.raw_user_meta_data->>'specialty', 120) else null end,
    case when new.raw_user_meta_data->>'requested_role' = 'client' then left(new.raw_user_meta_data->>'goal', 160) else null end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- A korábbi Studio csomag Premium néven él tovább.
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
update public.subscriptions set plan = 'premium' where plan = 'studio';
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('free', 'pro', 'premium'));

-- Stripe azonosítók (nullable: az ingyenes fiókoknak nincs Stripe-adatuk)
alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists subscriptions_stripe_customer_id_key
  on public.subscriptions (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions
for select to authenticated
using (user_id = auth.uid() or public.current_role() = 'admin');

revoke all on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;

create or replace function public.current_plan()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan from public.subscriptions s
     where s.user_id = auth.uid() and s.status in ('active', 'trialing')),
    'free'
  );
$$;

revoke all on function public.current_plan() from public, anon;
grant execute on function public.current_plan() to authenticated;

-- Csomag-limitek egy helyen. NULL = korlátlan (Premium).
create or replace function public.plan_limit(plan_name text, limit_kind text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case limit_kind
    when 'clients' then case plan_name when 'free' then 5 when 'pro' then 30 else null end
    when 'group_capacity' then case plan_name when 'free' then 8 when 'pro' then 20 else null end
    when 'training_plans' then case plan_name when 'free' then 2 else null end
  end;
$$;

revoke all on function public.plan_limit(text, text) from public, anon;
grant execute on function public.plan_limit(text, text) to authenticated;

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_subscription_created on public.profiles;
create trigger profiles_subscription_created
after insert on public.profiles
for each row execute function public.handle_new_user_subscription();

revoke all on function public.handle_new_user_subscription() from public, anon, authenticated;

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  recipient_name text not null,
  requester_role public.user_role not null check (requester_role in ('trainer', 'client')),
  recipient_role public.user_role not null check (recipient_role in ('trainer', 'client')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id),
  check (requester_role <> recipient_role)
);

create index if not exists connection_requests_requester_idx on public.connection_requests (requester_id, created_at desc);
create index if not exists connection_requests_recipient_idx on public.connection_requests (recipient_id, status, created_at desc);
create unique index if not exists connection_requests_pending_pair_idx
on public.connection_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
where status = 'pending';

create table if not exists public.connection_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.connection_requests(id) on delete cascade,
  kind text not null check (kind in ('request_received', 'request_sent', 'request_approved', 'request_declined', 'workout_cancelled', 'group_workout_cancelled', 'group_workout_left')),
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.connection_notifications
  alter column request_id drop not null;

alter table public.connection_notifications
  drop constraint if exists connection_notifications_kind_check;
alter table public.connection_notifications
  add constraint connection_notifications_kind_check
  check (kind in ('request_received', 'request_sent', 'request_approved', 'request_declined', 'workout_cancelled', 'group_workout_cancelled', 'group_workout_left', 'workout_status_reminder'));

create index if not exists connection_notifications_user_idx on public.connection_notifications (user_id, created_at desc);

-- Napi emlékeztető az edzőnek a tegnapi (és az elmúlt hét) még le nem zárt edzéseiről. Nem kötelező, csak figyelmeztet.
create or replace function public.create_workout_status_reminder()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  today_value date := (now() at time zone 'Europe/Budapest')::date;
  pending_count integer;
  names text;
begin
  if actor_id is null or public.current_role() is distinct from 'trainer' then
    return 0;
  end if;
  if exists (
    select 1 from public.connection_notifications n
    where n.user_id = actor_id and n.kind = 'workout_status_reminder'
      and (n.created_at at time zone 'Europe/Budapest')::date = today_value
  ) then
    return 0;
  end if;

  select count(*), string_agg(distinct p.full_name, ', ')
  into pending_count, names
  from public.workouts w
  join public.profiles p on p.id = w.client_id
  where w.trainer_id = actor_id
    and w.status = 'Beütemezve'
    and w.workout_date < today_value
    and w.workout_date >= today_value - 7;

  if pending_count = 0 then
    return 0;
  end if;

  insert into public.connection_notifications (user_id, request_id, kind, message)
  values (actor_id, null, 'workout_status_reminder',
    pending_count || ' korábbi edzésed még nincs lezárva (' || left(names, 150) || '). Jelöld meg, hogy teljesült-e vagy elmaradt. Ez nem kötelező, de segít a pontos nyilvántartásban.');
  return pending_count;
end;
$$;

revoke all on function public.create_workout_status_reminder() from public, anon;
grant execute on function public.create_workout_status_reminder() to authenticated;

alter table public.connection_requests enable row level security;
alter table public.connection_notifications enable row level security;

drop policy if exists connection_requests_participant_read on public.connection_requests;
create policy connection_requests_participant_read on public.connection_requests
for select to authenticated
using (requester_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists connection_notifications_owner_read on public.connection_notifications;
create policy connection_notifications_owner_read on public.connection_notifications
for select to authenticated
using (user_id = auth.uid());

grant select on public.connection_requests, public.connection_notifications to authenticated;

create or replace function public.notify_workout_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  client_name text;
  trainer_name text;
  when_label text;
begin
  if new.status <> 'Lemondva' or old.status is not distinct from 'Lemondva' then
    return new;
  end if;

  select p.full_name into client_name from public.profiles p where p.id = new.client_id;
  select p.full_name into trainer_name from public.profiles p where p.id = new.trainer_id;
  when_label := to_char(new.workout_date, 'YYYY.MM.DD.') || ' ' || to_char(new.workout_time, 'HH24:MI');

  if actor_id is distinct from new.client_id then
    insert into public.connection_notifications (user_id, request_id, kind, message)
    values (new.client_id, null, 'workout_cancelled', coalesce(trainer_name, 'Az edződ') || ' lemondta a ' || when_label || ' időpontú edzésedet (' || new.workout_type || ').');
  end if;
  if new.trainer_id is not null and actor_id is distinct from new.trainer_id then
    insert into public.connection_notifications (user_id, request_id, kind, message)
    values (new.trainer_id, null, 'workout_cancelled', coalesce(client_name, 'A kliensed') || ' lemondta a ' || when_label || ' időpontú edzést (' || new.workout_type || ').');
  end if;
  return new;
end;
$$;

drop trigger if exists workouts_notify_cancelled on public.workouts;
create trigger workouts_notify_cancelled
after update of status on public.workouts
for each row execute function public.notify_workout_cancelled();

revoke all on function public.notify_workout_cancelled() from public, anon, authenticated;

create table if not exists public.coach_public_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  specialty text not null,
  bio text not null check (char_length(bio) <= 2000),
  phone text not null default '' check (char_length(phone) <= 40),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  location text not null default '' check (char_length(location) <= 160),
  availability text not null default '' check (char_length(availability) <= 300),
  photo_paths text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (cardinality(photo_paths) <= 5)
);

alter table public.coach_public_profiles
  add column if not exists phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists location text not null default '',
  add column if not exists availability text not null default '';

alter table public.coach_public_profiles
  add column if not exists short_bio text not null default '';
alter table public.coach_public_profiles
  drop constraint if exists coach_public_profiles_short_bio_check;
alter table public.coach_public_profiles
  add constraint coach_public_profiles_short_bio_check check (char_length(short_bio) <= 200);

-- Szolgáltatások: az edző a személyi edzés mellett masszázst is vállalhat.
alter table public.coach_public_profiles
add column if not exists services text[] not null default '{training}';
alter table public.coach_public_profiles
drop constraint if exists coach_public_profiles_services_check;
alter table public.coach_public_profiles
add constraint coach_public_profiles_services_check
check (cardinality(services) >= 1 and services <@ array['training', 'massage']::text[]);

alter table public.coach_public_profiles enable row level security;

drop policy if exists coach_public_profiles_authenticated_read on public.coach_public_profiles;
create policy coach_public_profiles_authenticated_read on public.coach_public_profiles
for select to authenticated
using (public.current_role() in ('client', 'trainer', 'admin'));

grant select on public.coach_public_profiles to authenticated;

drop function if exists public.save_coach_profile(text, text, text[]);
drop function if exists public.save_coach_profile(text, text, text[], text, text, text, text);
drop function if exists public.save_coach_profile(text, text, text[], text, text, text, text, text);

create or replace function public.save_coach_profile(
  profile_specialty text,
  profile_bio text,
  profile_photo_paths text[],
  profile_phone text default '',
  profile_contact_email text default '',
  profile_location text default '',
  profile_availability text default '',
  profile_short_bio text default '',
  profile_services text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  coach_profile public.profiles%rowtype;
  safe_photo_paths text[] := coalesce(profile_photo_paths, '{}');
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.';
  end if;

  select * into coach_profile
  from public.profiles
  where id = auth.uid();
  if coach_profile.role <> 'trainer' then
    raise exception 'Csak edző szerkesztheti az edzői bemutatkozást.';
  end if;
  if length(trim(coalesce(profile_specialty, ''))) = 0 or length(profile_specialty) > 120 then
    raise exception 'Adj meg egy legfeljebb 120 karakteres szakterületet.';
  end if;
  if length(trim(coalesce(profile_bio, ''))) = 0 or length(profile_bio) > 2000 then
    raise exception 'A bemutatkozás legyen 1 és 2000 karakter között.';
  end if;
  if length(coalesce(profile_short_bio, '')) > 200 then
    raise exception 'A rövid bemutatkozás legfeljebb 200 karakter lehet.';
  end if;
  if length(coalesce(profile_phone, '')) > 40 then
    raise exception 'A telefonszám legfeljebb 40 karakter lehet.';
  end if;
  if length(coalesce(profile_contact_email, '')) > 254
    or (length(trim(coalesce(profile_contact_email, ''))) > 0 and trim(profile_contact_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Adj meg egy érvényes kapcsolati e-mail-címet.';
  end if;
  if length(coalesce(profile_location, '')) > 160 then
    raise exception 'A helyszín legfeljebb 160 karakter lehet.';
  end if;
  if length(coalesce(profile_availability, '')) > 300 then
    raise exception 'Az idősávok leírása legfeljebb 300 karakter lehet.';
  end if;
  if profile_services is not null and (
    cardinality(profile_services) < 1 or not (profile_services <@ array['training', 'massage']::text[])
  ) then
    raise exception 'Válassz legalább egy szolgáltatást (edzés vagy masszázs).';
  end if;
  if cardinality(safe_photo_paths) > 5 then
    raise exception 'Legfeljebb 5 kép tölthető fel.';
  end if;
  if exists (
    select 1 from unnest(safe_photo_paths) as photo_path
    where split_part(photo_path, '/', 1) <> auth.uid()::text
  ) then
    raise exception 'Csak a saját képeid használhatók.';
  end if;

  update public.profiles
  set specialty = trim(profile_specialty)
  where id = auth.uid();

  insert into public.coach_public_profiles (id, display_name, specialty, bio, short_bio, phone, contact_email, location, availability, photo_paths, services, updated_at)
  values (auth.uid(), coach_profile.full_name, trim(profile_specialty), trim(profile_bio), trim(coalesce(profile_short_bio, '')), trim(coalesce(profile_phone, '')), trim(coalesce(profile_contact_email, '')), trim(coalesce(profile_location, '')), trim(coalesce(profile_availability, '')), safe_photo_paths, coalesce(profile_services, '{training}'), now())
  on conflict (id) do update
  set display_name = excluded.display_name,
      specialty = excluded.specialty,
      bio = excluded.bio,
      short_bio = excluded.short_bio,
      phone = excluded.phone,
      contact_email = excluded.contact_email,
      location = excluded.location,
      availability = excluded.availability,
      photo_paths = excluded.photo_paths,
      services = case when profile_services is null then public.coach_public_profiles.services else excluded.services end,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_coach_profile(text, text, text[], text, text, text, text, text, text[]) from public;
grant execute on function public.save_coach_profile(text, text, text[], text, text, text, text, text, text[]) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-profile-images', 'coach-profile-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists coach_profile_images_authenticated_read on storage.objects;
create policy coach_profile_images_authenticated_read on storage.objects
for select to authenticated
using (bucket_id = 'coach-profile-images');

drop policy if exists coach_profile_images_owner_insert on storage.objects;
create policy coach_profile_images_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'coach-profile-images'
  and public.current_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists coach_profile_images_owner_delete on storage.objects;
create policy coach_profile_images_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'coach-profile-images'
  and public.current_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.create_connection_request_by_id(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  client_profile public.profiles%rowtype;
  trainer_profile public.profiles%rowtype;
  new_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.';
  end if;

  select * into actor_profile
  from public.profiles
  where id = auth.uid();

  if coalesce(public.current_role() not in ('trainer', 'client'), true) then
    raise exception 'Csak kliens vagy edző küldhet kapcsolódási kérést.';
  end if;

  select p.* into target_profile
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.id = target_user_id
    and p.role in ('trainer', 'client')
    and p.trainer_application_status in ('none', 'approved');

  if not found then
    raise exception 'Nem található ilyen e-mail-című regisztrált edző vagy kliens.';
  end if;
  if target_profile.id = actor_profile.id then
    raise exception 'Saját magadnak nem küldhetsz kapcsolódási kérést.';
  end if;
  if target_profile.role = actor_profile.role then
    raise exception 'Kliens csak edzőt, edző csak klienst kereshet meg.';
  end if;

  if actor_profile.role = 'client' then
    client_profile := actor_profile;
    trainer_profile := target_profile;
  else
    client_profile := target_profile;
    trainer_profile := actor_profile;
  end if;

  if exists (
    select 1 from public.client_trainers ct
    where ct.client_id = client_profile.id and ct.trainer_id = trainer_profile.id
  ) then
    raise exception 'Ez a kliens már ehhez az edzőhöz van rendelve.';
  end if;
  if exists (
    select 1 from public.connection_requests cr
    where cr.status = 'pending'
      and ((cr.requester_id = actor_profile.id and cr.recipient_id = target_profile.id)
        or (cr.requester_id = target_profile.id and cr.recipient_id = actor_profile.id))
  ) then
    raise exception 'Ehhez a felhasználóhoz már van függőben lévő kérés.';
  end if;

  insert into public.connection_requests (requester_id, recipient_id, requester_name, recipient_name, requester_role, recipient_role)
  values (actor_profile.id, target_profile.id, actor_profile.full_name, target_profile.full_name, actor_profile.role, target_profile.role)
  returning id into new_request_id;

  insert into public.connection_notifications (user_id, request_id, kind, message)
  values
    (target_profile.id, new_request_id, 'request_received', actor_profile.full_name || ' kapcsolódási kérést küldött.'),
    (actor_profile.id, new_request_id, 'request_sent', 'A kapcsolódási kérésed elküldve ' || target_profile.full_name || ' részére.');

  return new_request_id;
end;
$$;

create or replace function public.create_connection_request(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  select p.id into target_user_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(target_email))
    and p.role in ('trainer', 'client')
    and p.trainer_application_status in ('none', 'approved');
  if target_user_id is null then
    raise exception 'Nem található ilyen e-mail-című regisztrált edző vagy kliens.';
  end if;
  return public.create_connection_request_by_id(target_user_id);
end;
$$;

create or replace function public.respond_connection_request(request_id uuid, decision text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.connection_requests%rowtype;
  v_client_id uuid;
  v_trainer_id uuid;
  v_client_limit integer;
  decision_message text;
  notification_kind text;
begin
  if auth.uid() is null then
    raise exception 'Bejelentkezés szükséges.';
  end if;
  if decision is null or decision not in ('approved', 'declined') then
    raise exception 'Érvénytelen döntés.';
  end if;

  select * into request_row
  from public.connection_requests
  where id = request_id
  for update;

  if not found or request_row.recipient_id <> auth.uid() or request_row.status <> 'pending' then
    raise exception 'A kérés már nem elérhető.';
  end if;

  update public.connection_requests
  set status = decision, responded_at = now()
  where id = request_row.id;

  if decision = 'approved' then
    if request_row.requester_role = 'client' then
      v_client_id := request_row.requester_id;
      v_trainer_id := request_row.recipient_id;
    else
      v_client_id := request_row.recipient_id;
      v_trainer_id := request_row.requester_id;
    end if;
    -- Az edző csomagja számít (a döntést a kliens is hozhatja); előfizetés nélkül Free.
    v_client_limit := public.plan_limit(
      coalesce((select s.plan from public.subscriptions s where s.user_id = v_trainer_id and s.status in ('active', 'trialing')), 'free'),
      'clients'
    );
    if v_client_limit is not null
      and not exists (select 1 from public.client_trainers ct where ct.client_id = v_client_id and ct.trainer_id = v_trainer_id)
      and (select count(*) from public.client_trainers ct where ct.trainer_id = v_trainer_id) >= v_client_limit then
      raise exception 'A csomagod legfeljebb % aktív klienst enged. További kliensekhez magasabb csomag szükséges.', v_client_limit;
    end if;
    insert into public.client_trainers (client_id, trainer_id)
    values (v_client_id, v_trainer_id)
    on conflict (client_id, trainer_id) do nothing;
    decision_message := 'jóváhagyta';
    notification_kind := 'request_approved';
  else
    decision_message := 'elutasította';
    notification_kind := 'request_declined';
  end if;

  insert into public.connection_notifications (user_id, request_id, kind, message)
  values
    (request_row.requester_id, request_row.id, notification_kind, request_row.recipient_name || ' ' || decision_message || ' a kapcsolódási kérésedet.'),
    (request_row.recipient_id, request_row.id, notification_kind, request_row.requester_name || ' kapcsolódási kérését ' || decision_message || '.');

  return request_row.id;
end;
$$;

create or replace function public.mark_connection_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.connection_notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.create_connection_request(text) from public;
revoke all on function public.create_connection_request_by_id(uuid) from public;
revoke all on function public.respond_connection_request(uuid, text) from public;
revoke all on function public.mark_connection_notifications_read() from public;
grant execute on function public.create_connection_request(text) to authenticated;
grant execute on function public.create_connection_request_by_id(uuid) to authenticated;
grant execute on function public.respond_connection_request(uuid, text) to authenticated;
grant execute on function public.mark_connection_notifications_read() to authenticated;

create table if not exists public.group_workouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  capacity integer not null check (capacity between 2 and 100),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.group_workout_registrations (
  group_workout_id uuid not null references public.group_workouts(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_workout_id, client_id)
);

create index if not exists group_workouts_trainer_start_idx
on public.group_workouts (trainer_id, starts_at);
create index if not exists group_workout_registrations_client_idx
on public.group_workout_registrations (client_id, group_workout_id);

-- Csoportos edzés helyszíne és várólista.
alter table public.group_workouts
  add column if not exists location varchar(120);

alter table public.group_workout_registrations
  add column if not exists status text not null default 'registered';
alter table public.group_workout_registrations
  drop constraint if exists group_workout_registrations_status_check;
alter table public.group_workout_registrations
  add constraint group_workout_registrations_status_check
  check (status in ('registered', 'waitlisted'));
create index if not exists group_workout_registrations_queue_idx
on public.group_workout_registrations (group_workout_id, status, created_at);

alter table public.group_workouts enable row level security;
alter table public.group_workout_registrations enable row level security;

drop policy if exists group_workouts_read on public.group_workouts;
create policy group_workouts_read on public.group_workouts
for select to authenticated
using (
  trainer_id = auth.uid()
  or public.current_role() = 'admin'
  or exists (
    select 1 from public.client_trainers ct
    where ct.client_id = auth.uid() and ct.trainer_id = group_workouts.trainer_id
  )
);

drop policy if exists group_workouts_trainer_insert on public.group_workouts;
create policy group_workouts_trainer_insert on public.group_workouts
for insert to authenticated
with check (trainer_id = auth.uid() and public.current_role() = 'trainer');

drop policy if exists group_workout_registrations_read on public.group_workout_registrations;
create policy group_workout_registrations_read on public.group_workout_registrations
for select to authenticated
using (
  client_id = auth.uid()
  or public.current_role() = 'admin'
  or exists (
    select 1 from public.group_workouts gw
    where gw.id = group_workout_registrations.group_workout_id
      and gw.trainer_id = auth.uid()
  )
);

revoke all on public.group_workouts, public.group_workout_registrations from public, anon, authenticated;
grant select on public.group_workouts, public.group_workout_registrations to authenticated;
grant insert (trainer_id, title, description, starts_at, duration_minutes, capacity, location)
on public.group_workouts to authenticated;

drop function if exists public.get_group_workouts();
drop function if exists public.create_group_workout(text, text, timestamptz, integer, integer);
drop function if exists public.update_group_workout(uuid, text, text, timestamptz, integer, integer);

create or replace function public.get_group_workouts()
returns table (
  id uuid,
  trainer_id uuid,
  trainer_name text,
  title text,
  description text,
  starts_at timestamptz,
  duration_minutes integer,
  capacity integer,
  participant_count bigint,
  is_registered boolean,
  cancelled_at timestamptz,
  participant_names text[],
  location text,
  waitlist_count bigint,
  is_waitlisted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gw.id,
    gw.trainer_id,
    p.full_name,
    gw.title,
    gw.description,
    gw.starts_at,
    gw.duration_minutes,
    gw.capacity,
    (select count(*) from public.group_workout_registrations gwr where gwr.group_workout_id = gw.id and gwr.status = 'registered'),
    exists (
      select 1 from public.group_workout_registrations gwr
      where gwr.group_workout_id = gw.id and gwr.client_id = auth.uid() and gwr.status = 'registered'
    ),
    gw.cancelled_at,
    case
      when gw.trainer_id = auth.uid() or public.current_role() = 'admin' then
        coalesce((
          select array_agg(cp.full_name order by cp.full_name)
          from public.group_workout_registrations gwr
          join public.profiles cp on cp.id = gwr.client_id
          where gwr.group_workout_id = gw.id and gwr.status = 'registered'
        ), '{}')
      else '{}'::text[]
    end,
    gw.location::text,
    (select count(*) from public.group_workout_registrations gwr where gwr.group_workout_id = gw.id and gwr.status = 'waitlisted'),
    exists (
      select 1 from public.group_workout_registrations gwr
      where gwr.group_workout_id = gw.id and gwr.client_id = auth.uid() and gwr.status = 'waitlisted'
    )
  from public.group_workouts gw
  join public.profiles p on p.id = gw.trainer_id
  where auth.uid() is not null
    and (
      public.current_role() = 'admin'
      or gw.trainer_id = auth.uid()
      or exists (
        select 1 from public.client_trainers ct
        where ct.client_id = auth.uid() and ct.trainer_id = gw.trainer_id
      )
    )
  order by gw.starts_at;
$$;

create or replace function public.create_group_workout(
  workout_title text,
  workout_description text,
  workout_starts_at timestamptz,
  workout_duration_minutes integer,
  workout_capacity integer,
  workout_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workout_id uuid;
begin
  if auth.uid() is null or public.current_role() <> 'trainer' then
    raise exception 'Csoportos edzést csak bejelentkezett edző hozhat létre.';
  end if;
  if char_length(coalesce(workout_location, '')) > 120 then
    raise exception 'A helyszín legfeljebb 120 karakter lehet.';
  end if;
  if char_length(trim(coalesce(workout_title, ''))) not between 1 and 120 then
    raise exception 'Az edzés neve 1 és 120 karakter közötti legyen.';
  end if;
  if char_length(coalesce(workout_description, '')) > 2000 then
    raise exception 'A leírás legfeljebb 2000 karakter lehet.';
  end if;
  if workout_starts_at is null or workout_starts_at <= now() then
    raise exception 'Csoportos edzés csak jövőbeli időpontra hozható létre.';
  end if;
  if workout_duration_minutes not between 1 and 480 then
    raise exception 'Az időtartam 1 és 480 perc közötti legyen.';
  end if;
  if workout_capacity not between 2 and 100 then
    raise exception 'A létszám 2 és 100 fő közötti legyen.';
  end if;
  if workout_capacity > coalesce(public.plan_limit(public.current_plan(), 'group_capacity'), 100) then
    raise exception 'A csomagodban a csoportos edzés legfeljebb % fős lehet. Nagyobb csoporthoz magasabb csomag szükséges.', public.plan_limit(public.current_plan(), 'group_capacity');
  end if;

  insert into public.group_workouts (trainer_id, title, description, starts_at, duration_minutes, capacity, location)
  values (auth.uid(), trim(workout_title), coalesce(workout_description, ''), workout_starts_at, workout_duration_minutes, workout_capacity, nullif(trim(coalesce(workout_location, '')), ''))
  returning id into new_workout_id;
  return new_workout_id;
end;
$$;

create or replace function public.join_group_workout(workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_row public.group_workouts%rowtype;
begin
  if auth.uid() is null or public.current_role() <> 'client' then
    raise exception 'Csoportos edzésre csak bejelentkezett kliens jelentkezhet.';
  end if;

  select * into workout_row
  from public.group_workouts
  where id = workout_id
  for update;
  if not found then
    raise exception 'A csoportos edzés nem található.';
  end if;
  if not exists (
    select 1 from public.client_trainers ct
    where ct.client_id = auth.uid() and ct.trainer_id = workout_row.trainer_id
  ) then
    raise exception 'Csak az edzőhöz kapcsolt kliensek jelentkezhetnek.';
  end if;
  if workout_row.cancelled_at is not null then
    raise exception 'A csoportos edzést az edző lemondta.';
  end if;
  if workout_row.starts_at <= now() then
    raise exception 'Az edzés kezdete után már nem lehet jelentkezni.';
  end if;
  if exists (
    select 1 from public.group_workout_registrations gwr
    where gwr.group_workout_id = workout_id and gwr.client_id = auth.uid()
  ) then
    return workout_id;
  end if;

  -- A státuszt (registered / waitlisted) a group_workout_registrations_assign_status trigger állítja be.
  insert into public.group_workout_registrations (group_workout_id, client_id)
  values (workout_id, auth.uid());
  return workout_id;
end;
$$;

create or replace function public.leave_group_workout(workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_row public.group_workouts%rowtype;
  client_name text;
begin
  if auth.uid() is null or public.current_role() <> 'client' then
    raise exception 'Csak bejelentkezett kliens iratkozhat le.';
  end if;
  select * into workout_row
  from public.group_workouts
  where id = workout_id
  for update;
  if not found or workout_row.starts_at <= now() then
    raise exception 'A kezdés után már nem lehet leiratkozni.';
  end if;
  delete from public.group_workout_registrations
  where group_workout_id = workout_id and client_id = auth.uid();
  if found then
    select p.full_name into client_name from public.profiles p where p.id = auth.uid();
    insert into public.connection_notifications (user_id, request_id, kind, message)
    values (workout_row.trainer_id, null, 'group_workout_left', coalesce(client_name, 'Egy kliensed') || ' leiratkozott a(z) „' || workout_row.title || '” csoportos edzésről.');
  end if;
  return workout_id;
end;
$$;

create or replace function public.cancel_group_workout(workout_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_row public.group_workouts%rowtype;
  trainer_name text;
begin
  if auth.uid() is null or public.current_role() <> 'trainer' then
    raise exception 'Csoportos edzést csak edző mondhat le.';
  end if;
  select * into workout_row
  from public.group_workouts
  where id = workout_id and trainer_id = auth.uid()
  for update;
  if not found then
    raise exception 'A csoportos edzés nem található, vagy nem a te edzésed.';
  end if;
  if workout_row.cancelled_at is not null then
    return workout_id;
  end if;

  update public.group_workouts
  set cancelled_at = now()
  where id = workout_id;

  select p.full_name into trainer_name from public.profiles p where p.id = auth.uid();
  insert into public.connection_notifications (user_id, request_id, kind, message)
  select gwr.client_id, null, 'group_workout_cancelled',
    coalesce(trainer_name, 'Az edződ') || ' lemondta a(z) „' || workout_row.title || '” csoportos edzést ('
    || to_char(workout_row.starts_at at time zone 'Europe/Budapest', 'YYYY.MM.DD. HH24:MI') || ').'
  from public.group_workout_registrations gwr
  where gwr.group_workout_id = workout_id;
  return workout_id;
end;
$$;

create or replace function public.update_group_workout(
  workout_id uuid,
  workout_title text,
  workout_description text,
  workout_starts_at timestamptz,
  workout_duration_minutes integer,
  workout_capacity integer,
  workout_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_row public.group_workouts%rowtype;
  registration_count integer;
begin
  if auth.uid() is null or public.current_role() <> 'trainer' then
    raise exception 'Csoportos edzést csak edző módosíthat.';
  end if;
  if char_length(coalesce(workout_location, '')) > 120 then
    raise exception 'A helyszín legfeljebb 120 karakter lehet.';
  end if;
  select * into workout_row
  from public.group_workouts
  where id = workout_id and trainer_id = auth.uid()
  for update;
  if not found then
    raise exception 'A csoportos edzés nem található, vagy nem a te edzésed.';
  end if;
  if workout_row.cancelled_at is not null then
    raise exception 'A lemondott edzés már nem szerkeszthető.';
  end if;
  if char_length(trim(coalesce(workout_title, ''))) not between 1 and 120 then
    raise exception 'Az edzés neve 1 és 120 karakter közötti legyen.';
  end if;
  if char_length(coalesce(workout_description, '')) > 2000 then
    raise exception 'A leírás legfeljebb 2000 karakter lehet.';
  end if;
  if workout_starts_at is null or workout_starts_at <= now() then
    raise exception 'A csoportos edzés kezdése jövőbeli időpont legyen.';
  end if;
  if workout_duration_minutes not between 1 and 480 then
    raise exception 'Az időtartam 1 és 480 perc közötti legyen.';
  end if;
  select count(*) into registration_count
  from public.group_workout_registrations
  where group_workout_id = workout_id and status = 'registered';
  if workout_capacity is null or workout_capacity < greatest(2, registration_count) or workout_capacity > 100 then
    raise exception 'A létszám a jelentkezettek száma és 100 fő között lehet.';
  end if;
  if workout_capacity > coalesce(public.plan_limit(public.current_plan(), 'group_capacity'), 100) then
    raise exception 'A csomagodban a csoportos edzés legfeljebb % fős lehet. Nagyobb csoporthoz magasabb csomag szükséges.', public.plan_limit(public.current_plan(), 'group_capacity');
  end if;

  update public.group_workouts
  set title = trim(workout_title),
      description = coalesce(workout_description, ''),
      starts_at = workout_starts_at,
      duration_minutes = workout_duration_minutes,
      capacity = workout_capacity,
      location = nullif(trim(coalesce(workout_location, '')), '')
  where id = workout_id;
  return workout_id;
end;
$$;

-- Várólista: a betelt edzésre jelentkezők 'waitlisted' státuszt kapnak.
-- A workout sor zárolása sorosítja az egyidejű jelentkezéseket.
create or replace function public.assign_group_workout_registration_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_capacity integer;
  registered_count integer;
begin
  select gw.capacity into workout_capacity
  from public.group_workouts gw
  where gw.id = new.group_workout_id
  for update;
  if not found then
    return new;
  end if;

  select count(*) into registered_count
  from public.group_workout_registrations gwr
  where gwr.group_workout_id = new.group_workout_id and gwr.status = 'registered';

  new.status := case when registered_count < workout_capacity then 'registered' else 'waitlisted' end;
  return new;
end;
$$;

-- A felszabadult helyekre a legrégebbi (created_at) várólistásokat lépteti elő.
create or replace function public.promote_group_workout_waitlist(target_workout_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  workout_capacity integer;
  free_slots integer;
begin
  select gw.capacity into workout_capacity
  from public.group_workouts gw
  where gw.id = target_workout_id and gw.cancelled_at is null
  for update;
  if not found then
    return;
  end if;

  select workout_capacity - count(*) into free_slots
  from public.group_workout_registrations gwr
  where gwr.group_workout_id = target_workout_id and gwr.status = 'registered';
  if free_slots <= 0 then
    return;
  end if;

  update public.group_workout_registrations gwr
  set status = 'registered'
  where gwr.group_workout_id = target_workout_id
    and gwr.client_id in (
      select w.client_id
      from public.group_workout_registrations w
      where w.group_workout_id = target_workout_id and w.status = 'waitlisted'
      order by w.created_at, w.client_id
      limit free_slots
    );
end;
$$;

create or replace function public.group_workout_registration_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'registered' then
    perform public.promote_group_workout_waitlist(old.group_workout_id);
  end if;
  return null;
end;
$$;

create or replace function public.group_workout_capacity_increased()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.promote_group_workout_waitlist(new.id);
  return null;
end;
$$;

drop trigger if exists group_workout_registrations_assign_status on public.group_workout_registrations;
create trigger group_workout_registrations_assign_status
before insert on public.group_workout_registrations
for each row execute function public.assign_group_workout_registration_status();

drop trigger if exists group_workout_registrations_promote_waitlist on public.group_workout_registrations;
create trigger group_workout_registrations_promote_waitlist
after delete on public.group_workout_registrations
for each row execute function public.group_workout_registration_removed();

drop trigger if exists group_workouts_promote_waitlist on public.group_workouts;
create trigger group_workouts_promote_waitlist
after update of capacity on public.group_workouts
for each row when (new.capacity > old.capacity)
execute function public.group_workout_capacity_increased();

revoke all on function public.assign_group_workout_registration_status() from public, anon, authenticated;
revoke all on function public.promote_group_workout_waitlist(uuid) from public, anon, authenticated;
revoke all on function public.group_workout_registration_removed() from public, anon, authenticated;
revoke all on function public.group_workout_capacity_increased() from public, anon, authenticated;

revoke all on function public.get_group_workouts() from public;
revoke all on function public.create_group_workout(text, text, timestamptz, integer, integer, text) from public;
revoke all on function public.join_group_workout(uuid) from public;
revoke all on function public.leave_group_workout(uuid) from public;
revoke all on function public.cancel_group_workout(uuid) from public;
revoke all on function public.update_group_workout(uuid, text, text, timestamptz, integer, integer, text) from public;
grant execute on function public.get_group_workouts() to authenticated;
grant execute on function public.create_group_workout(text, text, timestamptz, integer, integer, text) to authenticated;
grant execute on function public.join_group_workout(uuid) to authenticated;
grant execute on function public.leave_group_workout(uuid) to authenticated;
grant execute on function public.cancel_group_workout(uuid) to authenticated;
grant execute on function public.update_group_workout(uuid, text, text, timestamptz, integer, integer, text) to authenticated;

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_plan_clients (
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  primary key (plan_id, client_id)
);

create table if not exists public.training_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 30),
  title text not null check (char_length(trim(title)) between 1 and 120),
  notes text not null default '' check (char_length(notes) <= 1000)
);

alter table public.training_plan_days
  drop constraint if exists training_plan_days_plan_id_day_number_key;

-- A már teljesített edzések által használt, később módosított napok régi verziója archiválva marad.
alter table public.training_plan_days
  add column if not exists archived_at timestamptz;

alter table public.workouts
  add column if not exists training_plan_day_id uuid references public.training_plan_days(id) on delete set null;

create index if not exists workouts_training_plan_day_idx
on public.workouts (training_plan_day_id)
where training_plan_day_id is not null;

create table if not exists public.training_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.training_plan_days(id) on delete cascade,
  position integer not null check (position between 1 and 30),
  name text not null check (char_length(trim(name)) between 1 and 120),
  sets integer not null check (sets between 1 and 30),
  reps text not null check (char_length(trim(reps)) between 1 and 60),
  rest_seconds integer check (rest_seconds between 0 and 1800),
  notes text not null default '' check (char_length(notes) <= 1000),
  unique (day_id, position)
);

create index if not exists training_plans_trainer_updated_idx
on public.training_plans (trainer_id, updated_at desc);
create index if not exists training_plan_clients_client_idx
on public.training_plan_clients (client_id, plan_id);

create or replace function public.can_view_training_plan(candidate_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role() in ('admin', 'trainer', 'client')
    and exists (
      select 1
      from public.training_plans tp
      where tp.id = candidate_plan_id
        and (
          tp.trainer_id = auth.uid()
          or tp.is_public
          or exists (
            select 1
            from public.training_plan_clients tpc
            join public.client_trainers ct
              on ct.client_id = tpc.client_id and ct.trainer_id = tp.trainer_id
            where tpc.plan_id = tp.id and tpc.client_id = auth.uid()
          )
        )
    );
$$;

revoke all on function public.can_view_training_plan(uuid) from public, anon;
grant execute on function public.can_view_training_plan(uuid) to authenticated;

alter table public.training_plans enable row level security;
alter table public.training_plan_clients enable row level security;
alter table public.training_plan_days enable row level security;
alter table public.training_plan_exercises enable row level security;

drop policy if exists training_plans_read on public.training_plans;
create policy training_plans_read on public.training_plans
for select to authenticated
using (public.can_view_training_plan(id));

drop policy if exists training_plan_clients_read on public.training_plan_clients;
create policy training_plan_clients_read on public.training_plan_clients
for select to authenticated
using (
  (
    client_id = auth.uid()
    and exists (
      select 1
      from public.training_plans tp
      join public.client_trainers ct on ct.trainer_id = tp.trainer_id
      where tp.id = training_plan_clients.plan_id and ct.client_id = auth.uid()
    )
  )
  or exists (
    select 1 from public.training_plans tp
    where tp.id = training_plan_clients.plan_id
      and tp.trainer_id = auth.uid()
  )
);

drop policy if exists training_plan_days_read on public.training_plan_days;
create policy training_plan_days_read on public.training_plan_days
for select to authenticated
using (public.can_view_training_plan(plan_id));

drop policy if exists training_plan_exercises_read on public.training_plan_exercises;
create policy training_plan_exercises_read on public.training_plan_exercises
for select to authenticated
using (
  exists (
    select 1
    from public.training_plan_days tpd
    where tpd.id = training_plan_exercises.day_id
      and public.can_view_training_plan(tpd.plan_id)
  )
);

revoke all on public.training_plans, public.training_plan_clients,
  public.training_plan_days, public.training_plan_exercises
from public, anon, authenticated;
grant select on public.training_plans, public.training_plan_clients,
  public.training_plan_days, public.training_plan_exercises to authenticated;

create or replace function public.validate_workout_training_plan_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.user_role := public.current_role();
  plan_trainer_id uuid;
  plan_is_public boolean;
begin
  if new.training_plan_day_id is null then
    return new;
  end if;

  -- Ugyanannak a tervnek egy másik verziójára való átállás (terv módosításakor) nem jelent új hozzáférést.
  if tg_op = 'UPDATE' and old.training_plan_day_id is not null
    and new.client_id = old.client_id and new.trainer_id is not distinct from old.trainer_id
    and (select plan_id from public.training_plan_days where id = new.training_plan_day_id)
        is not distinct from (select plan_id from public.training_plan_days where id = old.training_plan_day_id) then
    return new;
  end if;

  select tp.trainer_id, tp.is_public
  into plan_trainer_id, plan_is_public
  from public.training_plan_days tpd
  join public.training_plans tp on tp.id = tpd.plan_id
  where tpd.id = new.training_plan_day_id;

  if not found then
    raise exception 'A kiválasztott edzéstervnap nem található.';
  end if;

  if actor_role = 'admin' then
    return new;
  elsif actor_role = 'trainer' then
    if new.trainer_id is distinct from auth.uid()
      or plan_trainer_id is distinct from new.trainer_id
      or not exists (
        select 1 from public.client_trainers ct
        where ct.client_id = new.client_id and ct.trainer_id = new.trainer_id
      ) then
      raise exception 'Csak saját edzésterved napját kapcsolhatod hozzád rendelt klienshez.';
    end if;
  elsif actor_role = 'client' then
    if new.client_id <> auth.uid() then
      raise exception 'Edzésnapot csak a saját edzésedhez választhatsz.';
    end if;
  else
    raise exception 'Nincs jogosultságod edzésnapot kapcsolni.';
  end if;

  if not plan_is_public and not exists (
    select 1
    from public.training_plan_clients tpc
    join public.client_trainers ct
      on ct.client_id = tpc.client_id and ct.trainer_id = plan_trainer_id
    where tpc.plan_id = (
      select tpd.plan_id from public.training_plan_days tpd where tpd.id = new.training_plan_day_id
    )
      and tpc.client_id = new.client_id
  ) then
    raise exception 'Az edzésterv nincs megosztva ezzel a klienssel.';
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_validate_training_plan_day on public.workouts;
create trigger workouts_validate_training_plan_day
before insert or update of training_plan_day_id, trainer_id, client_id on public.workouts
for each row execute function public.validate_workout_training_plan_day();

revoke all on function public.validate_workout_training_plan_day() from public, anon, authenticated;

-- Biztonság: az edzés kliense nem módosítható, az edző csak a klienshez rendelt edző lehet.
-- Admin és szerver oldali (auth.uid() nélküli) hívások mentesek.
create or replace function public.guard_workout_assignment()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_role() = 'admin' then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.client_id is distinct from old.client_id then
    raise exception 'Az edzés kliense nem módosítható.';
  end if;

  -- Kliens nem adhat meg edzőt: csak saját, egyéni edzést vehet fel, a meglévő edzők nem módosíthatók.
  if public.current_role() = 'client' then
    if tg_op = 'INSERT' and new.trainer_id is not null then
      raise exception 'Kliens csak edző nélküli, egyéni edzést vehet fel.';
    end if;
    if tg_op = 'UPDATE' and new.trainer_id is distinct from old.trainer_id then
      raise exception 'Kliens nem módosíthatja az edzés edzőjét.';
    end if;
  end if;

  if new.trainer_id is not null
    and (tg_op = 'INSERT' or new.trainer_id is distinct from old.trainer_id)
    and not exists (
      select 1 from public.client_trainers ct
      where ct.client_id = new.client_id and ct.trainer_id = new.trainer_id
    ) then
    raise exception 'Az edző nincs a klienshez rendelve.';
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_guard_assignment on public.workouts;
create trigger workouts_guard_assignment
before insert or update on public.workouts
for each row execute function public.guard_workout_assignment();

revoke all on function public.guard_workout_assignment() from public, anon, authenticated;

-- Az edzők neve és a kliensekhez rendelt edzők listája: a kliens és az edző a profiles táblából
-- nem látja más edzők nevét, ezért ez az RPC adja a megjelenítéshez és az edző-választóhoz.
create or replace function public.get_client_trainer_directory()
returns table (client_id uuid, trainer_id uuid, trainer_name text)
language sql stable security definer set search_path = ''
as $$
  select ct.client_id, ct.trainer_id, p.full_name
  from public.client_trainers ct
  join public.profiles p on p.id = ct.trainer_id
  where ct.client_id = auth.uid()
    or public.is_assigned_trainer(ct.client_id)
    or public.current_role() = 'admin';
$$;

revoke all on function public.get_client_trainer_directory() from public, anon;
grant execute on function public.get_client_trainer_directory() to authenticated;

create or replace function public.save_training_plan(plan_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_plan_id uuid;
  title_value text;
  description_value text;
  public_value boolean;
  client_ids_value jsonb;
  days_value jsonb;
  day_value jsonb;
  exercise_value jsonb;
  day_id uuid;
  payload_day_id uuid;
  kept_day_ids uuid[] := array[]::uuid[];
  day_number_value integer := 0;
  exercise_position integer;
  requested_client_count integer;
  distinct_client_count integer;
  sets_value integer;
  rest_value integer;
  day_title text;
  day_notes text;
  cur_day uuid;
  skip_exercises boolean;
  old_title text;
  old_notes text;
  old_content jsonb;
  new_content jsonb;
begin
  if actor_id is null or public.current_role() is distinct from 'trainer' then
    raise exception 'Edzéstervet csak bejelentkezett edző hozhat létre vagy módosíthat.';
  end if;
  if coalesce(jsonb_typeof(plan_payload), '') <> 'object' then
    raise exception 'Érvénytelen edzésterv-adatok.';
  end if;

  title_value := trim(coalesce(plan_payload->>'title', ''));
  description_value := coalesce(plan_payload->>'description', '');
  public_value := coalesce((plan_payload->>'isPublic')::boolean, false);
  client_ids_value := coalesce(plan_payload->'clientIds', '[]'::jsonb);
  days_value := plan_payload->'days';

  if char_length(title_value) not between 1 and 120 then
    raise exception 'Az edzésterv neve 1 és 120 karakter közötti legyen.';
  end if;
  if char_length(description_value) > 2000 then
    raise exception 'A leírás legfeljebb 2000 karakter lehet.';
  end if;
  if coalesce(jsonb_typeof(client_ids_value), '') <> 'array' then
    raise exception 'Érvénytelen edzésterv-megosztási lista.';
  end if;
  if public_value and jsonb_array_length(client_ids_value) > 0 then
    raise exception 'Publikus edzéstervnél nem szükséges külön klienseket kijelölni.';
  end if;
  if coalesce(jsonb_typeof(days_value), '') <> 'array' then
    raise exception 'Érvénytelen edzésnaplista.';
  end if;
  if jsonb_array_length(days_value) not between 1 and 30 then
    raise exception 'Az edzésterv 1 és 30 közötti edzésnapot tartalmazzon.';
  end if;
  if public.current_plan() = 'free' then
    if jsonb_array_length(days_value) > 3 then
      raise exception 'A Free csomagban egy edzésterv legfeljebb 3 edzésnapot tartalmazhat. További napokhoz Pro csomag szükséges.';
    end if;
  end if;
  if (plan_payload->>'id' is null or plan_payload->>'id' = '')
    and public.plan_limit(public.current_plan(), 'training_plans') is not null
    and (select count(*) from public.training_plans tp where tp.trainer_id = actor_id)
        >= public.plan_limit(public.current_plan(), 'training_plans') then
    raise exception 'A csomagodban legfeljebb % edzésterv készíthető. További tervekhez magasabb csomag szükséges.', public.plan_limit(public.current_plan(), 'training_plans');
  end if;

  select count(*), count(distinct value)
  into requested_client_count, distinct_client_count
  from jsonb_array_elements_text(client_ids_value);
  if requested_client_count <> distinct_client_count then
    raise exception 'Egy kliens nem szerepelhet többször a megosztási listában.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(client_ids_value) requested(client_id)
    where not exists (
      select 1 from public.client_trainers ct
      where ct.client_id = requested.client_id::uuid
        and ct.trainer_id = actor_id
    )
  ) then
    raise exception 'Csak a hozzád rendelt kliensekkel oszthatod meg az edzéstervet.';
  end if;

  if plan_payload->>'id' is null or plan_payload->>'id' = '' then
    insert into public.training_plans (trainer_id, title, description, is_public)
    values (actor_id, title_value, description_value, public_value)
    returning id into target_plan_id;
  else
    target_plan_id := (plan_payload->>'id')::uuid;
    update public.training_plans
    set title = title_value,
        description = description_value,
        is_public = public_value,
        updated_at = now()
    where id = target_plan_id
      and trainer_id = actor_id;
    if not found then
      raise exception 'Az edzésterv nem található, vagy nincs jogosultságod a módosításához.';
    end if;
  end if;

  delete from public.training_plan_clients where training_plan_clients.plan_id = target_plan_id;

  insert into public.training_plan_clients (plan_id, client_id)
  select target_plan_id, value::uuid
  from jsonb_array_elements_text(client_ids_value);

  for day_value in select value from jsonb_array_elements(days_value) loop
    day_number_value := day_number_value + 1;
    day_id := null;
    day_title := trim(coalesce(day_value->>'title', ''));
    day_notes := coalesce(day_value->>'notes', '');
    if char_length(day_title) not between 1 and 120 or char_length(day_notes) > 1000 then
      raise exception 'Minden edzésnap neve legyen 1 és 120 karakter közötti, a megjegyzés legfeljebb 1000 karakter.';
    end if;
    if coalesce(jsonb_typeof(day_value->'exercises'), '') <> 'array' then
      raise exception 'Érvénytelen gyakorlatlista.';
    end if;
    if jsonb_array_length(day_value->'exercises') not between 1 and 30 then
      raise exception 'Minden edzésnaphoz 1 és 30 közötti gyakorlatot adj meg.';
    end if;

    payload_day_id := null;
    if coalesce(day_value->>'id', '') <> '' then
      begin
        payload_day_id := (day_value->>'id')::uuid;
      exception when invalid_text_representation then
        payload_day_id := null;
      end;
    end if;
    skip_exercises := false;
    if payload_day_id is not null then
      select tpd.id, tpd.title, tpd.notes into day_id, old_title, old_notes
      from public.training_plan_days tpd
      where tpd.id = payload_day_id and tpd.plan_id = target_plan_id and tpd.archived_at is null;
    end if;
    cur_day := day_id;
    if day_id is null then
      insert into public.training_plan_days (plan_id, day_number, title, notes)
      values (target_plan_id, day_number_value, day_title, day_notes)
      returning id into day_id;
    elsif exists (select 1 from public.workouts w where w.training_plan_day_id = cur_day and w.status = 'Teljesítve') then
      -- Már teljesített edzés is használja ezt a napot: a régi verzió változatlanul megmarad (archiválva),
      -- a módosítás csak az új verzióra és a még el nem végzett edzésekre vonatkozik.
      begin
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', trim(t.e->>'name'), 'sets', (t.e->>'sets')::integer, 'reps', trim(t.e->>'reps'),
          'rest', nullif(t.e->>'restSeconds', '')::integer, 'notes', coalesce(t.e->>'notes', '')
        ) order by t.ord), '[]'::jsonb) into new_content
        from jsonb_array_elements(day_value->'exercises') with ordinality as t(e, ord);
      exception when others then
        raise exception 'Ellenőrizd a gyakorlat nevét, sorozatait, ismétléseit, pihenőidejét és megjegyzését.';
      end;
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', tpe.name, 'sets', tpe.sets, 'reps', tpe.reps,         'rest', tpe.rest_seconds, 'notes', coalesce(tpe.notes, '')
      ) order by tpe.position), '[]'::jsonb) into old_content
      from public.training_plan_exercises tpe where tpe.day_id = cur_day;

      if old_title is not distinct from day_title and old_notes is not distinct from day_notes and old_content = new_content then
        update public.training_plan_days set day_number = day_number_value where id = cur_day;
        skip_exercises := true;
      else
        update public.training_plan_days set archived_at = now() where id = cur_day;
        insert into public.training_plan_days (plan_id, day_number, title, notes)
        values (target_plan_id, day_number_value, day_title, day_notes)
        returning id into day_id;
        update public.workouts set training_plan_day_id = day_id
        where training_plan_day_id = cur_day and status <> 'Teljesítve';
      end if;
    else
      update public.training_plan_days
      set day_number = day_number_value, title = day_title, notes = day_notes
      where id = cur_day;
      delete from public.training_plan_exercises tpe where tpe.day_id = cur_day;
    end if;
    kept_day_ids := array_append(kept_day_ids, day_id);

    exercise_position := 0;
    for exercise_value in select value from jsonb_array_elements(case when skip_exercises then '[]'::jsonb else day_value->'exercises' end) loop
      exercise_position := exercise_position + 1;
      begin
        sets_value := (exercise_value->>'sets')::integer;
        rest_value := nullif(exercise_value->>'restSeconds', '')::integer;
      exception when invalid_text_representation then
        raise exception 'A sorozatok és a pihenőidő egész szám legyen.';
      end;
      if char_length(trim(coalesce(exercise_value->>'name', ''))) not between 1 and 120
        or sets_value is null
        or sets_value not between 1 and 30
        or char_length(trim(coalesce(exercise_value->>'reps', ''))) not between 1 and 60
        or (rest_value is not null and rest_value not between 0 and 1800)
        or char_length(coalesce(exercise_value->>'notes', '')) > 1000 then
        raise exception 'Ellenőrizd a gyakorlat nevét, sorozatait, ismétléseit, pihenőidejét és megjegyzését.';
      end if;

      insert into public.training_plan_exercises (
        day_id, position, name, sets, reps, rest_seconds, notes
      )
      values (
        day_id,
        exercise_position,
        trim(exercise_value->>'name'),
        sets_value,
        trim(exercise_value->>'reps'),
        rest_value,
        coalesce(exercise_value->>'notes', '')
      );
    end loop;
  end loop;

  -- Eltávolított napok: a még el nem végzett edzések leválnak róla, a teljesítettek miatt a nap archiválva megmarad.
  update public.workouts set training_plan_day_id = null
  where status <> 'Teljesítve'
    and training_plan_day_id in (
      select tpd.id from public.training_plan_days tpd
      where tpd.plan_id = target_plan_id and tpd.archived_at is null and not (tpd.id = any(kept_day_ids))
    );
  update public.training_plan_days tpd set archived_at = now()
  where tpd.plan_id = target_plan_id and tpd.archived_at is null and not (tpd.id = any(kept_day_ids))
    and exists (select 1 from public.workouts w where w.training_plan_day_id = tpd.id and w.status = 'Teljesítve');
  delete from public.training_plan_days
  where plan_id = target_plan_id and archived_at is null and not (id = any(kept_day_ids));

  return target_plan_id;
end;
$$;

create or replace function public.delete_training_plan(plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.current_role() is distinct from 'trainer' then
    raise exception 'Edzéstervet csak bejelentkezett edző törölhet.';
  end if;
  delete from public.training_plans
  where id = $1 and trainer_id = auth.uid();
  if not found then
    raise exception 'Az edzésterv nem található, vagy nincs jogosultságod a törléséhez.';
  end if;
end;
$$;

revoke all on function public.save_training_plan(jsonb) from public, anon;
revoke all on function public.delete_training_plan(uuid) from public, anon;
grant execute on function public.save_training_plan(jsonb) to authenticated;
grant execute on function public.delete_training_plan(uuid) to authenticated;

-- A Studio csapatkezelés segédfüggvényei már nem használtak.
drop function if exists public.is_studio_head_of(uuid);
drop function if exists public.is_studio_client(uuid);
