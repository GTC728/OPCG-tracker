create table if not exists public.app_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null,
  schema_version integer not null,
  app_version text not null,
  device_label text not null,
  created_at timestamptz not null default now()
);

alter table public.app_state_snapshots enable row level security;

drop policy if exists "Users can read own app snapshots" on public.app_state_snapshots;
create policy "Users can read own app snapshots"
on public.app_state_snapshots
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own app snapshots" on public.app_state_snapshots;
create policy "Users can insert own app snapshots"
on public.app_state_snapshots
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own app snapshots" on public.app_state_snapshots;
create policy "Users can delete own app snapshots"
on public.app_state_snapshots
for delete
using (auth.uid() = user_id);

create index if not exists app_state_snapshots_user_created_idx
on public.app_state_snapshots (user_id, created_at desc);
