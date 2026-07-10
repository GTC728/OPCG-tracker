-- V4.13: group member admin + roster ↔ auth link
-- Run after supabase-v4.11.sql (and v4.11.1 RLS fix if needed).

-- 1) Member display + ban
alter table public.group_members
  add column if not exists display_name text;

alter table public.group_members
  add column if not exists banned_at timestamptz;

create index if not exists group_members_banned_idx
  on public.group_members (group_key, banned_at)
  where banned_at is not null;

-- 2) Owner can update co-member roles / ban (not self-demote via app guard)
drop policy if exists "Owner updates co-members" on public.group_members;
create policy "Owner updates co-members" on public.group_members
for update to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_key = group_members.group_key
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
      and gm.banned_at is null
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_key = group_members.group_key
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
      and gm.banned_at is null
  )
);

-- 3) Owner can remove co-members (kick)
drop policy if exists "Owner removes co-members" on public.group_members;
create policy "Owner removes co-members" on public.group_members
for delete to authenticated
using (
  auth.uid() != user_id
  and exists (
    select 1 from public.group_members gm
    where gm.group_key = group_members.group_key
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
      and gm.banned_at is null
  )
);

-- 4) Roster player ↔ auth user link (visible to group for admin UI)
alter table public.sync_players
  add column if not exists linked_user_id uuid references auth.users(id);

create index if not exists sync_players_linked_user_idx
  on public.sync_players (group_key, linked_user_id)
  where linked_user_id is not null;
