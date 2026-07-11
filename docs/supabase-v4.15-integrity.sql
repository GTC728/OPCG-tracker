-- V4.15: server-side integrity — role/ban RLS, match validation, historical import grants
-- Run after supabase-v4.13.sql (and v4.11.1 RLS fix if needed).

-- ---------------------------------------------------------------------------
-- 1) Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_can_write_group_collab(p_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_key = p_group_key
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'member')
      and gm.banned_at is null
  );
$$;

create or replace function public.user_has_historical_bypass()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_privileges ap
    where ap.user_id = auth.uid()
      and ap.historical_bypass_span = true
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) App privileges (insert rows via Supabase Dashboard — never commit emails)
-- ---------------------------------------------------------------------------

create table if not exists public.app_privileges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  historical_bypass_span boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

alter table public.app_privileges enable row level security;

drop policy if exists "Users read own app privileges" on public.app_privileges;
create policy "Users read own app privileges" on public.app_privileges
for select to authenticated
using (auth.uid() = user_id);

-- No client insert/update/delete — manage via Dashboard or service role.

-- ---------------------------------------------------------------------------
-- 3) Historical import grants (consumed when syncing source=historical matches)
-- ---------------------------------------------------------------------------

create table if not exists public.historical_import_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_key text,
  match_count integer not null check (match_count > 0 and match_count <= 100),
  span_days numeric not null check (span_days >= 0),
  min_started_at timestamptz not null,
  max_finished_at timestamptz not null,
  bypass_span boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_count integer not null default 0,
  consumed_at timestamptz
);

create index if not exists historical_import_grants_user_idx
  on public.historical_import_grants (user_id, created_at desc);

alter table public.historical_import_grants enable row level security;

drop policy if exists "Users read own historical grants" on public.historical_import_grants;
create policy "Users read own historical grants" on public.historical_import_grants
for select to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4) sync_matches.integrity_grant_id
-- ---------------------------------------------------------------------------

alter table public.sync_matches
  add column if not exists integrity_grant_id uuid references public.historical_import_grants(id);

create index if not exists sync_matches_integrity_grant_idx
  on public.sync_matches (integrity_grant_id)
  where integrity_grant_id is not null;

-- ---------------------------------------------------------------------------
-- 5) Tighten sync_* RLS — owner/member only, not banned (G-06)
-- ---------------------------------------------------------------------------

-- sync_players
drop policy if exists "Group members write sync_players" on public.sync_players;
create policy "Group collab writers insert sync_players" on public.sync_players
for insert to authenticated
with check (
  auth.uid() = updated_by
  and public.user_can_write_group_collab(sync_players.group_key)
);

drop policy if exists "Group members update sync_players" on public.sync_players;
create policy "Group collab writers update sync_players" on public.sync_players
for update to authenticated
using (public.user_can_write_group_collab(sync_players.group_key))
with check (auth.uid() = updated_by);

-- sync_sessions
drop policy if exists "Group members insert sync_sessions" on public.sync_sessions;
create policy "Group collab writers insert sync_sessions" on public.sync_sessions
for insert to authenticated
with check (
  auth.uid() = updated_by
  and public.user_can_write_group_collab(sync_sessions.group_key)
);

drop policy if exists "Group members update sync_sessions" on public.sync_sessions;
create policy "Group collab writers update sync_sessions" on public.sync_sessions
for update to authenticated
using (public.user_can_write_group_collab(sync_sessions.group_key))
with check (auth.uid() = updated_by);

-- sync_matches
drop policy if exists "Group members insert sync_matches" on public.sync_matches;
create policy "Group collab writers insert sync_matches" on public.sync_matches
for insert to authenticated
with check (
  auth.uid() = updated_by
  and public.user_can_write_group_collab(sync_matches.group_key)
);

drop policy if exists "Group members update sync_matches" on public.sync_matches;
create policy "Group collab writers update sync_matches" on public.sync_matches
for update to authenticated
using (public.user_can_write_group_collab(sync_matches.group_key))
with check (auth.uid() = updated_by);

-- sync_active_matches
drop policy if exists "Group members insert sync_active_matches" on public.sync_active_matches;
create policy "Group collab writers insert sync_active_matches" on public.sync_active_matches
for insert to authenticated
with check (
  auth.uid() = updated_by
  and public.user_can_write_group_collab(sync_active_matches.group_key)
);

drop policy if exists "Group members update sync_active_matches" on public.sync_active_matches;
create policy "Group collab writers update sync_active_matches" on public.sync_active_matches
for update to authenticated
using (public.user_can_write_group_collab(sync_active_matches.group_key))
with check (auth.uid() = updated_by);

drop policy if exists "Group members delete sync_active_matches" on public.sync_active_matches;
create policy "Group collab writers delete sync_active_matches" on public.sync_active_matches
for delete to authenticated
using (public.user_can_write_group_collab(sync_active_matches.group_key));

-- ---------------------------------------------------------------------------
-- 6) Match integrity trigger
-- ---------------------------------------------------------------------------

create or replace function public.validate_sync_match_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant public.historical_import_grants%rowtype;
begin
  -- Allowed sources for group sync (import is local-only, never synced)
  if new.source not in ('manual', 'manual_edit', 'restore', 'historical') then
    raise exception 'invalid match source: %', new.source;
  end if;

  if new.source = 'import' then
    raise exception 'import source cannot be synced to group';
  end if;

  if new.winner_player_id is distinct from new.player1_id
     and new.winner_player_id is distinct from new.player2_id then
    raise exception 'winner must be player1 or player2';
  end if;

  if new.winner_deck_id is distinct from new.deck1_id
     and new.winner_deck_id is distinct from new.deck2_id then
    raise exception 'winner deck must be deck1 or deck2';
  end if;

  if new.player1_id = new.player2_id then
    raise exception 'player1 and player2 must differ';
  end if;

  if new.started_at > new.finished_at then
    raise exception 'started_at must be <= finished_at';
  end if;

  if new.source = 'historical'
     and (tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.source is distinct from 'historical')) then
    if new.integrity_grant_id is null then
      raise exception 'historical matches require integrity_grant_id';
    end if;

    select * into v_grant
    from public.historical_import_grants
    where id = new.integrity_grant_id
    for update;

    if not found then
      raise exception 'historical import grant not found';
    end if;

    if v_grant.user_id is distinct from auth.uid() then
      raise exception 'historical import grant does not belong to caller';
    end if;

    if v_grant.expires_at < now() then
      raise exception 'historical import grant expired';
    end if;

    if v_grant.consumed_at is not null
       and v_grant.consumed_count >= v_grant.match_count then
      raise exception 'historical import grant already consumed';
    end if;

    if v_grant.group_key is not null and v_grant.group_key is distinct from new.group_key then
      raise exception 'historical import grant group mismatch';
    end if;

    if new.started_at < v_grant.min_started_at
       or new.finished_at > v_grant.max_finished_at then
      raise exception 'match timestamps outside grant window';
    end if;

    update public.historical_import_grants
    set consumed_count = consumed_count + 1,
        consumed_at = case
          when consumed_count + 1 >= match_count then now()
          else consumed_at
        end
    where id = v_grant.id;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sync_match_row_trigger on public.sync_matches;
create trigger validate_sync_match_row_trigger
before insert or update on public.sync_matches
for each row
execute function public.validate_sync_match_row();

-- ---------------------------------------------------------------------------
-- 7) RPC: request historical import grant
-- ---------------------------------------------------------------------------

create or replace function public.request_historical_import_grant(
  p_match_count integer,
  p_timestamps timestamptz[],
  p_group_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_bypass boolean;
  v_min_ts timestamptz;
  v_max_ts timestamptz;
  v_span_days numeric;
  v_grant_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_match_count is null or p_match_count < 1 or p_match_count > 100 then
    raise exception 'match count must be between 1 and 100';
  end if;

  if p_timestamps is null or array_length(p_timestamps, 1) < 2 then
    raise exception 'at least two timestamps required';
  end if;

  select min(ts), max(ts)
  into v_min_ts, v_max_ts
  from unnest(p_timestamps) as ts;

  v_span_days := extract(epoch from (v_max_ts - v_min_ts)) / 86400.0;

  v_bypass := public.user_has_historical_bypass();

  if not v_bypass and v_span_days < 30 then
    raise exception 'date span must be >= 30 days (got % days)', floor(v_span_days);
  end if;

  if p_group_key is not null and not public.user_can_write_group_collab(p_group_key) then
    raise exception 'not allowed to write group collab data';
  end if;

  insert into public.historical_import_grants (
    user_id,
    group_key,
    match_count,
    span_days,
    min_started_at,
    max_finished_at,
    bypass_span,
    expires_at
  )
  values (
    v_user_id,
    p_group_key,
    p_match_count,
    v_span_days,
    v_min_ts,
    v_max_ts,
    v_bypass,
    now() + interval '24 hours'
  )
  returning id into v_grant_id;

  return v_grant_id;
end;
$$;

grant execute on function public.request_historical_import_grant(integer, timestamptz[], text)
  to authenticated;

grant execute on function public.user_has_historical_bypass()
  to authenticated;
