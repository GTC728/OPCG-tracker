-- V5.6: Public lobby discovery fixes (run after supabase-v5.0-group-lobby.sql)
-- - Fuzzy lookup for shorthand public ids (e.g. ghk-2026 vs opcg-hk-2026)
-- - Backfill discoverability fields on legacy groups
-- - Ensure registry rows stay public + active when (re)registered

-- Backfill missing public_id / activity for legacy rows
update public.groups g
set
  public_id = coalesce(g.public_id, g.settings->>'storage_code'),
  visibility = coalesce(nullif(g.visibility, ''), 'public'),
  last_active_at = coalesce(g.last_active_at, g.updated_at, now())
where g.public_id is null
   or g.visibility is null
   or g.last_active_at is null;

create or replace function public.group_lookup_compact(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]', '', 'g');
$$;

-- ── Search public groups (fuzzy) ─────────────────────────────────────────────

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
    select
      lower(trim(coalesce(p_query, ''))) as term,
      public.group_lookup_compact(p_query) as compact
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
  where coalesce(g.visibility, 'public') = 'public'
    and (
      q.term = ''
      or lower(g.display_name) like '%' || q.term || '%'
      or lower(coalesce(g.public_id, '')) like '%' || q.term || '%'
      or lower(coalesce(g.invite_slug, '')) like '%' || q.term || '%'
      or lower(coalesce(g.settings->>'storage_code', '')) like '%' || q.term || '%'
      or public.group_lookup_compact(g.public_id) = q.compact
      or public.group_lookup_compact(g.invite_slug) = q.compact
      or public.group_lookup_compact(g.settings->>'storage_code') = q.compact
      or (
        length(q.compact) >= 4
        and (
          public.group_lookup_compact(g.public_id) like '%' || q.compact || '%'
          or public.group_lookup_compact(g.settings->>'storage_code') like '%' || q.compact || '%'
          or q.compact like '%' || public.group_lookup_compact(g.public_id) || '%'
          or q.compact like '%' || public.group_lookup_compact(g.settings->>'storage_code') || '%'
        )
      )
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

-- ── Resolve group lookup (fuzzy) ─────────────────────────────────────────────

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
    select
      lower(trim(regexp_replace(coalesce(p_lookup, ''), '^@+', ''))) as term,
      public.group_lookup_compact(p_lookup) as compact
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
    or lower(coalesce(g.public_id, '')) like '%' || n.term || '%'
    or lower(coalesce(g.settings->>'storage_code', '')) like '%' || n.term || '%'
    or public.group_lookup_compact(g.public_id) = n.compact
    or public.group_lookup_compact(g.invite_slug) = n.compact
    or public.group_lookup_compact(g.settings->>'storage_code') = n.compact
    or (
      length(n.compact) >= 4
      and (
        public.group_lookup_compact(g.public_id) like '%' || n.compact || '%'
        or public.group_lookup_compact(g.settings->>'storage_code') like '%' || n.compact || '%'
        or n.compact like '%' || public.group_lookup_compact(g.public_id) || '%'
        or n.compact like '%' || public.group_lookup_compact(g.settings->>'storage_code') || '%'
      )
    )
    or (coalesce(g.visibility, 'public') = 'public' and lower(g.display_name) = n.term)
    or (coalesce(g.visibility, 'public') = 'public' and lower(g.display_name) like '%' || n.term || '%')
  )
  and (
    coalesce(g.visibility, 'public') in ('public', 'unlisted')
    or public.user_is_group_member(g.group_key)
  )
  order by
    case
      when lower(coalesce(g.public_id, '')) = n.term then 0
      when lower(coalesce(g.settings->>'storage_code', '')) = n.term then 1
      when public.group_lookup_compact(g.public_id) = n.compact then 2
      when public.group_lookup_compact(g.settings->>'storage_code') = n.compact then 3
      else 4
    end,
    g.last_active_at desc nulls last
  limit 1;
$$;

grant execute on function public.resolve_group_lookup(text) to authenticated;

-- ── Ensure registry keeps groups discoverable ────────────────────────────────

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
  insert into public.groups (group_key, display_name, public_id, owner_user_id, visibility, last_active_at, settings)
  values (
    p_group_key,
    coalesce(nullif(trim(p_display_name), ''), upper(v_code)),
    v_code,
    p_owner_user_id,
    'public',
    now(),
    jsonb_build_object('storage_code', v_code)
  )
  on conflict (group_key) do update set
    public_id = coalesce(public.groups.public_id, excluded.public_id),
    visibility = coalesce(public.groups.visibility, excluded.visibility),
    last_active_at = coalesce(public.groups.last_active_at, excluded.last_active_at),
    updated_at = now();

  if p_owner_user_id is not null then
    update public.groups
    set owner_user_id = coalesce(owner_user_id, p_owner_user_id)
    where group_key = p_group_key and owner_user_id is null;
  end if;
end;
$$;

-- ── Upsert lobby settings when groups row was missing ────────────────────────

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

  if not exists (select 1 from public.groups g where g.group_key = p_group_key) then
    perform public.ensure_group_registry(
      p_group_key,
      coalesce(nullif(lower(trim(p_public_id)), ''), 'group'),
      p_display_name,
      auth.uid()
    );
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
    last_active_at = case
      when coalesce(p_visibility, visibility) = 'public' then coalesce(last_active_at, now())
      else last_active_at
    end,
    updated_at = now()
  where group_key = p_group_key;
end;
$$;

grant execute on function public.update_group_lobby_settings(text, text, text, text, text, text, text) to authenticated;
