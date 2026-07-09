-- V4.11: group roles + group registry foundation + achievement ledger
-- Run after supabase-setup.sql and sync migrations.

-- 1) Member roles (owner / member / reader)
alter table public.group_members
  add column if not exists role text not null default 'member';

alter table public.group_members
  drop constraint if exists group_members_role_check;

alter table public.group_members
  add constraint group_members_role_check
  check (role in ('owner', 'member', 'reader'));

create index if not exists group_members_group_role_idx
  on public.group_members (group_key, role);

-- 2) Group registry (lobby foundation — display names may duplicate)
create table if not exists public.groups (
  group_key text primary key,
  display_name text not null,
  invite_slug text unique,
  owner_user_id uuid references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;

drop policy if exists "Members read group profile" on public.groups;
create policy "Members read group profile" on public.groups
for select to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_key = groups.group_key and gm.user_id = auth.uid()
  )
);

drop policy if exists "Owner updates group profile" on public.groups;
create policy "Owner updates group profile" on public.groups
for update to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_key = groups.group_key
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
);

-- 3) Co-member list (for lobby UI) — MUST use SECURITY DEFINER to avoid RLS recursion
create or replace function public.user_is_group_member(p_group_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_key = p_group_key and user_id = auth.uid()
  );
$$;

drop policy if exists "Users read co-members" on public.group_members;
create policy "Users read co-members" on public.group_members
for select to authenticated
using (public.user_is_group_member(group_key));

-- Ensure own-row read still works (required for first join / offline recovery)
drop policy if exists "Users can read own group memberships" on public.group_members;
create policy "Users can read own group memberships" on public.group_members
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users leave group" on public.group_members;
create policy "Users leave group" on public.group_members
for delete to authenticated
using (auth.uid() = user_id);

-- Helper for RLS (SECURITY DEFINER avoids recursion)
create or replace function public.get_group_member_role(p_group_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.group_members
  where group_key = p_group_key and user_id = auth.uid()
  limit 1;
$$;

-- 4) Server-side achievement ledger (optional sync target)
create table if not exists public.profile_achievement_unlocks (
  id uuid primary key default gen_random_uuid(),
  profile_identity_id text not null,
  achievement_id text not null,
  level integer not null default 1,
  unlocked_at timestamptz not null default now(),
  trigger_match_ids text[] not null default '{}',
  trust_tier text not null default 'self',
  backfilled boolean not null default false,
  unique (profile_identity_id, achievement_id)
);

alter table public.profile_achievement_unlocks enable row level security;

drop policy if exists "Users read own profile achievements" on public.profile_achievement_unlocks;
create policy "Users read own profile achievements" on public.profile_achievement_unlocks
for select to authenticated
using (
  profile_identity_id in (
    select (state->'settings'->>'profileIdentityId')
    from public.app_state_snapshots
    where user_id = auth.uid()
    order by created_at desc
    limit 1
  )
);

-- Note: writes via service role or future Edge Function reconcile job.
