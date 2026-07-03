-- V3.5 entity sync (run after supabase-setup.sql)
-- Group collab: per-row sync instead of whole JSON blob.

create table if not exists public.sync_players (
  id text primary key,
  group_key text not null,
  name text not null,
  archived boolean not null default false,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.sync_sessions (
  id text primary key,
  group_key text not null,
  name text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz
);

create table if not exists public.sync_matches (
  id text primary key,
  group_key text not null,
  session_id text not null,
  match_number integer not null,
  player1_id text not null,
  deck1_id text not null,
  player2_id text not null,
  deck2_id text not null,
  winner_player_id text not null,
  winner_deck_id text not null,
  first_player_id text,
  result_type text not null default 'normal',
  started_at timestamptz not null,
  finished_at timestamptz not null,
  notes text,
  source text not null default 'manual',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz
);

create table if not exists public.sync_active_matches (
  id text primary key,
  group_key text not null,
  session_id text not null,
  match_number integer not null,
  table_slot integer,
  player1_id text not null default '',
  deck1_id text not null default '',
  player2_id text not null default '',
  deck2_id text not null default '',
  first_player_id text,
  started_at timestamptz not null,
  notes text,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists sync_players_group_idx on public.sync_players (group_key, updated_at desc);
create index if not exists sync_sessions_group_idx on public.sync_sessions (group_key, updated_at desc);
create index if not exists sync_matches_group_idx on public.sync_matches (group_key, finished_at desc);
create index if not exists sync_active_matches_group_idx on public.sync_active_matches (group_key, updated_at desc);

alter table public.sync_players enable row level security;
alter table public.sync_sessions enable row level security;
alter table public.sync_matches enable row level security;
alter table public.sync_active_matches enable row level security;

-- sync_players
drop policy if exists "Group members read sync_players" on public.sync_players;
create policy "Group members read sync_players" on public.sync_players for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_players.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members write sync_players" on public.sync_players;
create policy "Group members write sync_players" on public.sync_players for insert to authenticated
with check (auth.uid() = updated_by and exists (select 1 from public.group_members gm where gm.group_key = sync_players.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_players" on public.sync_players;
create policy "Group members update sync_players" on public.sync_players for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_players.group_key and gm.user_id = auth.uid()))
with check (auth.uid() = updated_by);

-- sync_sessions
drop policy if exists "Group members read sync_sessions" on public.sync_sessions;
create policy "Group members read sync_sessions" on public.sync_sessions for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_sessions.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members insert sync_sessions" on public.sync_sessions;
create policy "Group members insert sync_sessions" on public.sync_sessions for insert to authenticated
with check (auth.uid() = updated_by and exists (select 1 from public.group_members gm where gm.group_key = sync_sessions.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_sessions" on public.sync_sessions;
create policy "Group members update sync_sessions" on public.sync_sessions for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_sessions.group_key and gm.user_id = auth.uid()))
with check (auth.uid() = updated_by);

-- sync_matches
drop policy if exists "Group members read sync_matches" on public.sync_matches;
create policy "Group members read sync_matches" on public.sync_matches for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_matches.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members insert sync_matches" on public.sync_matches;
create policy "Group members insert sync_matches" on public.sync_matches for insert to authenticated
with check (auth.uid() = updated_by and exists (select 1 from public.group_members gm where gm.group_key = sync_matches.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_matches" on public.sync_matches;
create policy "Group members update sync_matches" on public.sync_matches for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_matches.group_key and gm.user_id = auth.uid()))
with check (auth.uid() = updated_by);

-- sync_active_matches
drop policy if exists "Group members read sync_active_matches" on public.sync_active_matches;
create policy "Group members read sync_active_matches" on public.sync_active_matches for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_active_matches.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members insert sync_active_matches" on public.sync_active_matches;
create policy "Group members insert sync_active_matches" on public.sync_active_matches for insert to authenticated
with check (auth.uid() = updated_by and exists (select 1 from public.group_members gm where gm.group_key = sync_active_matches.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_active_matches" on public.sync_active_matches;
create policy "Group members update sync_active_matches" on public.sync_active_matches for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_active_matches.group_key and gm.user_id = auth.uid()))
with check (auth.uid() = updated_by);

drop policy if exists "Group members delete sync_active_matches" on public.sync_active_matches;
create policy "Group members delete sync_active_matches" on public.sync_active_matches for delete to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_active_matches.group_key and gm.user_id = auth.uid()));
