-- V5.0: Game lobby — discovery, join policy, requests, admin role, invite links
-- Run after supabase-v4.18-group-lobby.sql

-- ── 1) Group profile extensions ─────────────────────────────────────────────

alter table public.groups
  add column if not exists public_id text,
  add column if not exists visibility text not null default 'public',
  add column if not exists join_policy text not null default 'request',
  add column if not exists description text,
  add column if not exists stats_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists last_active_at timestamptz;

alter table public.groups
  drop constraint if exists groups_visibility_check;
alter table public.groups
  add constraint groups_visibility_check
  check (visibility in ('public', 'unlisted', 'private'));

alter table public.groups
  drop constraint if exists groups_join_policy_check;
alter table public.groups
  add constraint groups_join_policy_check
  check (join_policy in ('open', 'request', 'invite_only'));

create unique index if not exists groups_public_id_uidx
  on public.groups (public_id)
  where public_id is not null;

create index if not exists groups_visibility_active_idx
  on public.groups (visibility, last_active_at desc nulls last);

-- Backfill public_id from storage_code for existing groups
update public.groups g
set public_id = coalesce(g.public_id, g.settings->>'storage_code')
where g.public_id is null and (g.settings->>'storage_code') is not null;

-- ── 2) Admin role + reader migration ────────────────────────────────────────

alter table public.group_members
  drop constraint if exists group_members_role_check;

alter table public.group_members
  add constraint group_members_role_check
  check (role in ('owner', 'admin', 'member', 'reader'));

update public.group_members set role = 'member' where role = 'reader';

-- ── 3) Join requests ────────────────────────────────────────────────────────

create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_key text not null references public.groups(group_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_key, user_id, status)
);

-- Only one pending per user per group (partial unique)
create unique index if not exists group_join_requests_pending_uidx
  on public.group_join_requests (group_key, user_id)
  where status = 'pending';

alter table public.group_join_requests enable row level security;

drop policy if exists "Users read own join requests" on public.group_join_requests;
create policy "Users read own join requests" on public.group_join_requests
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own join requests" on public.group_join_requests;
create policy "Users insert own join requests" on public.group_join_requests
for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

-- ── 4) Invite links (invite_only groups) ────────────────────────────────────

create table if not exists public.group_invite_links (
  id uuid primary key default gen_random_uuid(),
  group_key text not null references public.groups(group_key) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.group_invite_links enable row level security;

-- ── 5) Permission helpers (SECURITY DEFINER) ───────────────────────────────

create or replace function public.user_can_manage_group(p_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_key = p_group_key
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and banned_at is null
  );
$$;

grant execute on function public.user_can_manage_group(text) to authenticated;

create or replace function public.user_is_group_owner(p_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_key = p_group_key
      and user_id = auth.uid()
      and role = 'owner'
      and banned_at is null
  );
$$;

grant execute on function public.user_is_group_owner(text) to authenticated;

-- ── 6) RLS updates ──────────────────────────────────────────────────────────

drop policy if exists "Public read discoverable groups" on public.groups;
create policy "Public read discoverable groups" on public.groups
for select to authenticated
using (
  visibility = 'public'
  or public.user_is_group_member(group_key)
);

drop policy if exists "Owner updates group profile" on public.groups;
create policy "Managers update group profile" on public.groups
for update to authenticated
using (public.user_can_manage_group(group_key));

drop policy if exists "Owner updates co-members" on public.group_members;
create policy "Managers update co-members" on public.group_members
for update to authenticated
using (public.user_can_manage_group(group_key))
with check (public.user_can_manage_group(group_key));

drop policy if exists "Owner removes co-members" on public.group_members;
create policy "Managers remove co-members" on public.group_members
for delete to authenticated
using (
  public.user_can_manage_group(group_key)
  and user_id <> auth.uid()
);

-- Restrict self-join: only via SECURITY DEFINER RPC for policy-aware groups
drop policy if exists "Users can join groups for themselves" on public.group_members;

create or replace function public.join_group_open(
  p_group_key text,
  p_display_name text default 'Member'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.group_members
    where group_key = p_group_key and user_id = auth.uid()
  ) then
    select role into v_role from public.group_members
    where group_key = p_group_key and user_id = auth.uid();
    return v_role;
  end if;

  select count(*) into v_count from public.group_members where group_key = p_group_key;
  v_role := case when v_count = 0 then 'owner' else 'member' end;

  insert into public.group_members (group_key, user_id, display_name, role)
  values (p_group_key, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Member'), v_role);

  return v_role;
end;
$$;

grant execute on function public.join_group_open(text, text) to authenticated;

-- ── 7) Stats snapshot refresh ───────────────────────────────────────────────

create or replace function public.refresh_group_stats_snapshot(p_group_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_players int;
  v_matches int;
  v_sessions int;
  v_last timestamptz;
  v_snapshot jsonb;
begin
  select
    coalesce((select count(*) from public.sync_players where group_key = p_group_key and deleted_at is null), 0),
    coalesce((select count(*) from public.sync_matches where group_key = p_group_key and deleted_at is null), 0),
    coalesce((select count(*) from public.sync_sessions where group_key = p_group_key and deleted_at is null), 0)
  into v_players, v_matches, v_sessions;

  select greatest(
    coalesce((select max(updated_at) from public.sync_matches where group_key = p_group_key), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.sync_sessions where group_key = p_group_key), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.sync_players where group_key = p_group_key), 'epoch'::timestamptz)
  ) into v_last;

  v_snapshot := jsonb_build_object(
    'players', coalesce(v_players, 0),
    'matches', coalesce(v_matches, 0),
    'sessions', coalesce(v_sessions, 0),
    'lastActiveAt', case when v_last > 'epoch'::timestamptz then v_last else null end
  );

  update public.groups
  set stats_snapshot = v_snapshot,
      last_active_at = case when v_last > 'epoch'::timestamptz then v_last else last_active_at end,
      updated_at = now()
  where group_key = p_group_key;

  return v_snapshot;
end;
$$;

grant execute on function public.refresh_group_stats_snapshot(text) to authenticated;

-- ── 8) Search public groups ─────────────────────────────────────────────────

create or replace function public.search_public_groups(
  p_query text default '',
  p_sort text default 'active',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  group_key text,
  storage_code text,
  public_id text,
  display_name text,
  invite_slug text,
  visibility text,
  join_policy text,
  description text,
  stats_snapshot jsonb,
  last_active_at timestamptz,
  is_member boolean,
  join_status text
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select lower(trim(coalesce(p_query, ''))) as term
  )
  select
    g.group_key,
    coalesce(g.settings->>'storage_code', '') as storage_code,
    coalesce(g.public_id, g.settings->>'storage_code') as public_id,
    g.display_name,
    g.invite_slug,
    g.visibility,
    g.join_policy,
    g.description,
    g.stats_snapshot,
    g.last_active_at,
    public.user_is_group_member(g.group_key) as is_member,
    coalesce(
      (select jr.status from public.group_join_requests jr
       where jr.group_key = g.group_key and jr.user_id = auth.uid()
       order by jr.created_at desc limit 1),
      'none'
    ) as join_status
  from public.groups g, q
  where g.visibility = 'public'
    and (
      q.term = ''
      or lower(g.display_name) like '%' || q.term || '%'
      or lower(coalesce(g.public_id, '')) = q.term
      or lower(coalesce(g.invite_slug, '')) = q.term
      or lower(coalesce(g.settings->>'storage_code', '')) = q.term
    )
  order by
    case when p_sort = 'matches' then (g.stats_snapshot->>'matches')::int end desc nulls last,
    case when p_sort = 'players' then (g.stats_snapshot->>'players')::int end desc nulls last,
    g.last_active_at desc nulls last,
    g.display_name asc
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset);
$$;

grant execute on function public.search_public_groups(text, text, int, int) to authenticated;

-- ── 9) Resolve group lookup (public + unlisted for members) ─────────────────

create or replace function public.resolve_group_lookup(p_lookup text)
returns table (
  group_key text,
  storage_code text,
  public_id text,
  display_name text,
  invite_slug text,
  visibility text,
  join_policy text,
  description text,
  stats_snapshot jsonb,
  last_active_at timestamptz,
  is_member boolean,
  join_status text
)
language sql
stable
security definer
set search_path = public
as $$
  with norm as (
    select lower(trim(regexp_replace(coalesce(p_lookup, ''), '^@', ''))) as term
  )
  select
    g.group_key,
    coalesce(g.settings->>'storage_code', '') as storage_code,
    coalesce(g.public_id, g.settings->>'storage_code') as public_id,
    g.display_name,
    g.invite_slug,
    g.visibility,
    g.join_policy,
    g.description,
    g.stats_snapshot,
    g.last_active_at,
    public.user_is_group_member(g.group_key) as is_member,
    coalesce(
      (select jr.status from public.group_join_requests jr
       where jr.group_key = g.group_key and jr.user_id = auth.uid()
       order by jr.created_at desc limit 1),
      'none'
    ) as join_status
  from public.groups g, norm n
  where (
    lower(coalesce(g.public_id, '')) = n.term
    or lower(coalesce(g.invite_slug, '')) = n.term
    or lower(coalesce(g.settings->>'storage_code', '')) = n.term
    or (g.visibility = 'public' and lower(g.display_name) = n.term)
  )
  and (
    g.visibility in ('public', 'unlisted')
    or public.user_is_group_member(g.group_key)
  )
  limit 1;
$$;

grant execute on function public.resolve_group_lookup(text) to authenticated;

-- ── 10) Join with policy ──────────────────────────────────────────────────────

create or replace function public.join_group_with_policy(
  p_lookup text,
  p_message text default null,
  p_invite_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups%rowtype;
  v_storage text;
  v_role text;
  v_display text;
  v_pending_id uuid;
  v_link public.group_invite_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select g.* into v_group
  from public.resolve_group_lookup(p_lookup) r
  join public.groups g on g.group_key = r.group_key
  limit 1;

  if v_group.group_key is null then
    select g.* into v_group
    from public.groups g
    where lower(g.settings->>'storage_code') = lower(trim(p_lookup))
    limit 1;
  end if;

  if v_group.group_key is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_storage := coalesce(v_group.settings->>'storage_code', '');

  if public.user_is_group_member(v_group.group_key) then
    select role into v_role from public.group_members
    where group_key = v_group.group_key and user_id = auth.uid();
    return jsonb_build_object('ok', true, 'joined', true, 'storageCode', v_storage, 'role', v_role);
  end if;

  if v_group.join_policy = 'invite_only' then
    if p_invite_token is null then
      return jsonb_build_object('ok', false, 'error', 'invite_required');
    end if;
    select * into v_link from public.group_invite_links
    where token = p_invite_token and group_key = v_group.group_key;
    if v_link.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_invite');
    end if;
    if v_link.expires_at is not null and v_link.expires_at < now() then
      return jsonb_build_object('ok', false, 'error', 'invite_expired');
    end if;
    if v_link.max_uses is not null and v_link.use_count >= v_link.max_uses then
      return jsonb_build_object('ok', false, 'error', 'invite_exhausted');
    end if;
    update public.group_invite_links set use_count = use_count + 1 where id = v_link.id;
  end if;

  if v_group.join_policy = 'request' then
    if exists (
      select 1 from public.group_join_requests
      where group_key = v_group.group_key and user_id = auth.uid() and status = 'pending'
    ) then
      return jsonb_build_object('ok', true, 'joined', false, 'pending', true, 'storageCode', v_storage);
    end if;
    insert into public.group_join_requests (group_key, user_id, message)
    values (v_group.group_key, auth.uid(), nullif(trim(p_message), ''))
    returning id into v_pending_id;
    return jsonb_build_object('ok', true, 'joined', false, 'pending', true, 'requestId', v_pending_id, 'storageCode', v_storage);
  end if;

  -- open policy
  v_display := coalesce(
    (select display_name from public.group_members where user_id = auth.uid() order by joined_at desc limit 1),
    'Member'
  );
  v_role := public.join_group_open(v_group.group_key, v_display);
  perform public.refresh_group_stats_snapshot(v_group.group_key);
  return jsonb_build_object('ok', true, 'joined', true, 'storageCode', v_storage, 'role', v_role);
end;
$$;

grant execute on function public.join_group_with_policy(text, text, text) to authenticated;

-- ── 11) Join request admin ───────────────────────────────────────────────────

create or replace function public.list_group_join_requests(p_group_key text)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  message text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    jr.id,
    jr.user_id,
    coalesce(gm.display_name, u.email, 'User') as display_name,
    jr.message,
    jr.status,
    jr.created_at
  from public.group_join_requests jr
  left join public.group_members gm on gm.group_key = jr.group_key and gm.user_id = jr.user_id
  left join auth.users u on u.id = jr.user_id
  where jr.group_key = p_group_key
    and jr.status = 'pending'
    and public.user_can_manage_group(p_group_key)
  order by jr.created_at asc;
$$;

grant execute on function public.list_group_join_requests(text) to authenticated;

create or replace function public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.group_join_requests%rowtype;
  v_role text;
  v_storage text;
begin
  select * into v_req from public.group_join_requests where id = p_request_id;
  if v_req.id is null or v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.user_can_manage_group(v_req.group_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_approve then
    v_role := public.join_group_open(v_req.group_key, coalesce(v_req.message, 'Member'));
    update public.group_join_requests
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;
    perform public.refresh_group_stats_snapshot(v_req.group_key);
    select settings->>'storage_code' into v_storage from public.groups where group_key = v_req.group_key;
    return jsonb_build_object('ok', true, 'approved', true, 'role', v_role, 'storageCode', v_storage);
  end if;

  update public.group_join_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
      message = coalesce(nullif(trim(p_note), ''), message)
  where id = p_request_id;
  return jsonb_build_object('ok', true, 'approved', false);
end;
$$;

grant execute on function public.review_join_request(uuid, boolean, text) to authenticated;

-- ── 12) Transfer ownership ──────────────────────────────────────────────────

create or replace function public.transfer_group_ownership(
  p_group_key text,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_is_group_owner(p_group_key) then
    raise exception 'Only owner can transfer';
  end if;
  if not exists (
    select 1 from public.group_members
    where group_key = p_group_key and user_id = p_new_owner_user_id and banned_at is null
  ) then
    raise exception 'Target must be an active member';
  end if;

  update public.group_members set role = 'admin'
  where group_key = p_group_key and user_id = auth.uid();

  update public.group_members set role = 'owner'
  where group_key = p_group_key and user_id = p_new_owner_user_id;

  update public.groups set owner_user_id = p_new_owner_user_id, updated_at = now()
  where group_key = p_group_key;
end;
$$;

grant execute on function public.transfer_group_ownership(text, uuid) to authenticated;

-- ── 13) Invite link management ──────────────────────────────────────────────

create or replace function public.create_group_invite_link(
  p_group_key text,
  p_expires_hours int default 168,
  p_max_uses int default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.user_can_manage_group(p_group_key) then
    raise exception 'Forbidden';
  end if;
  insert into public.group_invite_links (group_key, created_by, expires_at, max_uses)
  values (
    p_group_key,
    auth.uid(),
    case when p_expires_hours > 0 then now() + (p_expires_hours || ' hours')::interval else null end,
    p_max_uses
  )
  returning token into v_token;
  return v_token;
end;
$$;

grant execute on function public.create_group_invite_link(text, int, int) to authenticated;

-- ── 14) Update lobby settings ───────────────────────────────────────────────

create or replace function public.update_group_lobby_settings(
  p_group_key text,
  p_display_name text default null,
  p_public_id text default null,
  p_invite_slug text default null,
  p_description text default null,
  p_visibility text default null,
  p_join_policy text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_can_manage_group(p_group_key) then
    raise exception 'Forbidden';
  end if;

  update public.groups set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    public_id = case
      when p_public_id is not null then nullif(lower(trim(p_public_id)), '')
      else public_id
    end,
    invite_slug = case
      when p_invite_slug is not null then nullif(lower(trim(p_invite_slug)), '')
      else invite_slug
    end,
    description = case when p_description is not null then nullif(trim(p_description), '') else description end,
    visibility = coalesce(p_visibility, visibility),
    join_policy = coalesce(p_join_policy, join_policy),
    updated_at = now()
  where group_key = p_group_key;
end;
$$;

grant execute on function public.update_group_lobby_settings(text, text, text, text, text, text, text) to authenticated;

-- ── 15) Extend ensure_group_registry for V5 fields ──────────────────────────

create or replace function public.ensure_group_registry(
  p_group_key text,
  p_storage_code text,
  p_display_name text default null,
  p_owner_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(p_storage_code));
begin
  insert into public.groups (group_key, display_name, public_id, owner_user_id, settings)
  values (
    p_group_key,
    coalesce(nullif(trim(p_display_name), ''), upper(v_code)),
    v_code,
    p_owner_user_id,
    jsonb_build_object('storage_code', v_code)
  )
  on conflict (group_key) do update set
    public_id = coalesce(public.groups.public_id, excluded.public_id),
    updated_at = now();

  if p_owner_user_id is not null then
    update public.groups
    set owner_user_id = coalesce(owner_user_id, p_owner_user_id)
    where group_key = p_group_key and owner_user_id is null;
  end if;
end;
$$;

-- ── 16) Extend list_my_group_memberships ────────────────────────────────────
-- Return type changed from v4.18 (added public_id, visibility, join_policy).
drop function if exists public.list_my_group_memberships();

create or replace function public.list_my_group_memberships()
returns table (
  group_key text,
  role text,
  display_name text,
  invite_slug text,
  storage_code text,
  public_id text,
  visibility text,
  join_policy text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gm.group_key,
    gm.role,
    coalesce(g.display_name, upper(coalesce(g.settings->>'storage_code', ''))) as display_name,
    g.invite_slug,
    coalesce(g.settings->>'storage_code', '') as storage_code,
    coalesce(g.public_id, g.settings->>'storage_code') as public_id,
    g.visibility,
    g.join_policy,
    gm.joined_at
  from public.group_members gm
  left join public.groups g on g.group_key = gm.group_key
  where gm.user_id = auth.uid()
  order by gm.joined_at desc;
$$;

grant execute on function public.list_my_group_memberships() to authenticated;
