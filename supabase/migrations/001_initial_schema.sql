create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  habits jsonb not null default '[]'::jsonb,
  focus_sessions jsonb not null default '[]'::jsonb,
  activity_dates jsonb not null default '[]'::jsonb,
  active_time_by_date jsonb not null default '{}'::jsonb,
  streak_coins integer not null default 350,
  streak_freezes integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces add column if not exists focus_sessions jsonb not null default '[]'::jsonb;
alter table public.user_workspaces add column if not exists activity_dates jsonb not null default '[]'::jsonb;
alter table public.user_workspaces add column if not exists active_time_by_date jsonb not null default '{}'::jsonb;
alter table public.user_workspaces add column if not exists streak_coins integer not null default 350;
alter table public.user_workspaces add column if not exists streak_freezes integer not null default 1;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_calendar', 'github', 'stripe', 'resend')),
  access_token text,
  refresh_token text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.user_workspaces enable row level security;
alter table public.integration_connections enable row level security;

create policy "Users manage their workspace"
  on public.user_workspaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users view their integration metadata"
  on public.integration_connections for select
  using (auth.uid() = user_id);

create or replace function public.create_workspace_for_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_workspaces(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_workspace_for_user();
