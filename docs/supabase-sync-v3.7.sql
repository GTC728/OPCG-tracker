-- V3.7 tombstone sync (run after supabase-sync-v3.5.sql)
-- Unified soft-delete via UPDATE/UPSERT instead of hard DELETE.

alter table public.sync_players
  add column if not exists deleted_at timestamptz;

alter table public.sync_sessions
  add column if not exists archived_at timestamptz;

-- sync_matches.deleted_at and sync_sessions.deleted_at already exist in v3.5.

create index if not exists sync_players_deleted_idx on public.sync_players (group_key, deleted_at);
create index if not exists sync_sessions_archived_idx on public.sync_sessions (group_key, archived_at);

-- Ensure UPDATE policies exist (required for tombstone pushes).
drop policy if exists "Group members update sync_players" on public.sync_players;
create policy "Group members update sync_players" on public.sync_players for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_players.group_key and gm.user_id = auth.uid()))
with check (exists (select 1 from public.group_members gm where gm.group_key = sync_players.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_sessions" on public.sync_sessions;
create policy "Group members update sync_sessions" on public.sync_sessions for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_sessions.group_key and gm.user_id = auth.uid()))
with check (exists (select 1 from public.group_members gm where gm.group_key = sync_sessions.group_key and gm.user_id = auth.uid()));

drop policy if exists "Group members update sync_matches" on public.sync_matches;
create policy "Group members update sync_matches" on public.sync_matches for update to authenticated
using (exists (select 1 from public.group_members gm where gm.group_key = sync_matches.group_key and gm.user_id = auth.uid()))
with check (exists (select 1 from public.group_members gm where gm.group_key = sync_matches.group_key and gm.user_id = auth.uid()));

-- Realtime: enable sync_sessions if not already (Dashboard → Database → Replication).
-- alter publication supabase_realtime add table public.sync_sessions;
