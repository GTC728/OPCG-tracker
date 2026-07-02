create table if not exists public.shared_app_states (
  group_key text primary key,
  state jsonb not null,
  schema_version integer not null,
  app_version text not null,
  device_label text not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_app_states enable row level security;

drop policy if exists "Anyone with group key can read shared state" on public.shared_app_states;
create policy "Anyone with group key can read shared state"
on public.shared_app_states
for select
to anon
using (true);

drop policy if exists "Anyone with group key can insert shared state" on public.shared_app_states;
create policy "Anyone with group key can insert shared state"
on public.shared_app_states
for insert
to anon
with check (true);

drop policy if exists "Anyone with group key can update shared state" on public.shared_app_states;
create policy "Anyone with group key can update shared state"
on public.shared_app_states
for update
to anon
using (true)
with check (true);

create index if not exists shared_app_states_updated_idx
on public.shared_app_states (updated_at desc);
