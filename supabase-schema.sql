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
