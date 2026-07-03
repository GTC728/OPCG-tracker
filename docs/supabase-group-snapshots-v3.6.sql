-- Group backup version history (run in Supabase SQL editor)
create table if not exists public.group_app_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  group_key text not null,
  state jsonb not null,
  schema_version integer not null,
  app_version text not null,
  device_label text not null,
  updated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.group_app_state_snapshots enable row level security;

drop policy if exists "Group members can read group snapshots" on public.group_app_state_snapshots;
create policy "Group members can read group snapshots"
on public.group_app_state_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members
    where group_members.group_key = group_app_state_snapshots.group_key
      and group_members.user_id = auth.uid()
  )
);

drop policy if exists "Group members can insert group snapshots" on public.group_app_state_snapshots;
create policy "Group members can insert group snapshots"
on public.group_app_state_snapshots
for insert
to authenticated
with check (
  auth.uid() = updated_by
  and exists (
    select 1
    from public.group_members
    where group_members.group_key = group_app_state_snapshots.group_key
      and group_members.user_id = auth.uid()
  )
);

create index if not exists group_app_state_snapshots_group_created_idx
on public.group_app_state_snapshots (group_key, created_at desc);
