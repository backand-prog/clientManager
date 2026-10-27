-- Form & Function PostgreSQL schema for Supabase
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
  status text not null default 'Aktív',
  adherence integer not null default 0 check (adherence between 0 and 100),
  notes text,
  created_at timestamptz not null default now()
);

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

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
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
using (client_id = auth.uid() or trainer_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists assignments_admin_write on public.client_trainers;
create policy assignments_admin_write on public.client_trainers for all to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists workouts_read on public.workouts;
create policy workouts_read on public.workouts for select to authenticated
using (client_id = auth.uid() or trainer_id = auth.uid() or public.is_assigned_trainer(client_id) or public.current_role() = 'admin');

drop policy if exists workouts_write on public.workouts;
create policy workouts_write on public.workouts for insert to authenticated
with check (
  public.current_role() = 'admin'
  or client_id = auth.uid()
  or (public.current_role() = 'trainer' and public.is_assigned_trainer(client_id) and trainer_id = auth.uid())
  or (trainer_id is null and client_id = auth.uid())
);

drop policy if exists workouts_update on public.workouts;
create policy workouts_update on public.workouts for update to authenticated
using (public.current_role() = 'admin' or client_id = auth.uid() or trainer_id = auth.uid())
with check (public.current_role() = 'admin' or client_id = auth.uid() or trainer_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, specialty, goal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Új felhasználó'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'client'),
    new.raw_user_meta_data->>'specialty',
    new.raw_user_meta_data->>'goal'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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
  request_id uuid not null references public.connection_requests(id) on delete cascade,
  kind text not null check (kind in ('request_received', 'request_sent', 'request_approved', 'request_declined')),
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists connection_notifications_user_idx on public.connection_notifications (user_id, created_at desc);

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

create table if not exists public.coach_public_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  specialty text not null,
  bio text not null check (char_length(bio) <= 2000),
  photo_paths text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (cardinality(photo_paths) <= 5)
);

alter table public.coach_public_profiles enable row level security;

drop policy if exists coach_public_profiles_authenticated_read on public.coach_public_profiles;
create policy coach_public_profiles_authenticated_read on public.coach_public_profiles
for select to authenticated
using (public.current_role() in ('client', 'trainer', 'admin'));

grant select on public.coach_public_profiles to authenticated;

create or replace function public.save_coach_profile(profile_specialty text, profile_bio text, profile_photo_paths text[])
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

  insert into public.coach_public_profiles (id, display_name, specialty, bio, photo_paths, updated_at)
  values (auth.uid(), coach_profile.full_name, trim(profile_specialty), trim(profile_bio), safe_photo_paths, now())
  on conflict (id) do update
  set display_name = excluded.display_name,
      specialty = excluded.specialty,
      bio = excluded.bio,
      photo_paths = excluded.photo_paths,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_coach_profile(text, text, text[]) from public;
grant execute on function public.save_coach_profile(text, text, text[]) to authenticated;

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

  if actor_profile.role not in ('trainer', 'client') then
    raise exception 'Csak kliens vagy edző küldhet kapcsolódási kérést.';
  end if;

  select p.* into target_profile
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.id = target_user_id
    and p.role in ('trainer', 'client');

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
    and p.role in ('trainer', 'client');
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
  client_id uuid;
  trainer_id uuid;
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
      client_id := request_row.requester_id;
      trainer_id := request_row.recipient_id;
    else
      client_id := request_row.recipient_id;
      trainer_id := request_row.requester_id;
    end if;
    insert into public.client_trainers (client_id, trainer_id)
    values (client_id, trainer_id)
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
