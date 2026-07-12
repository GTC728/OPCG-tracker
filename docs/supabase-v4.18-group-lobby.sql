-- V4.18: Group lobby registry + membership listing
-- Run after supabase-v4.16-achievement-ledger.sql (and v4.11 groups table).

-- Upsert group profile on first join (storage_code maps cloud group_key → local workspace key)
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
begin
  insert into public.groups (group_key, display_name, owner_user_id, settings)
  values (
    p_group_key,
    coalesce(nullif(trim(p_display_name), ''), upper(trim(p_storage_code))),
    p_owner_user_id,
    jsonb_build_object('storage_code', lower(trim(p_storage_code)))
  )
  on conflict (group_key) do nothing;

  if p_owner_user_id is not null then
    update public.groups
    set owner_user_id = coalesce(owner_user_id, p_owner_user_id)
    where group_key = p_group_key and owner_user_id is null;
  end if;
end;
$$;

grant execute on function public.ensure_group_registry(text, text, text, uuid) to authenticated;

-- List memberships + group profile for workspace hub (avoids RLS join pitfalls)
create or replace function public.list_my_group_memberships()
returns table (
  group_key text,
  role text,
  display_name text,
  invite_slug text,
  storage_code text,
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
    gm.joined_at
  from public.group_members gm
  left join public.groups g on g.group_key = gm.group_key
  where gm.user_id = auth.uid()
  order by gm.joined_at desc;
$$;

grant execute on function public.list_my_group_memberships() to authenticated;

-- Optional friendly invite slug → storage code (slug is a secondary join secret)
create or replace function public.resolve_group_invite_slug(p_slug text)
returns table (group_key text, storage_code text, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select g.group_key, g.settings->>'storage_code', g.display_name
  from public.groups g
  where g.invite_slug = lower(trim(p_slug))
  limit 1;
$$;

grant execute on function public.resolve_group_invite_slug(text) to authenticated;

-- Owner may insert group row after becoming first member (client upsert fallback)
drop policy if exists "Owner inserts group profile" on public.groups;
create policy "Owner inserts group profile" on public.groups
for insert to authenticated
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_key = groups.group_key
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
);
