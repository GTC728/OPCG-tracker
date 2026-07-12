-- V4.16: achievement ledger client sync (run after v4.11 + v4.15)
-- Enables cross-device achievement unlocks via profile_achievement_unlocks.

-- 1) Tie rows to auth user (simpler RLS than snapshot subquery)
alter table public.profile_achievement_unlocks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists profile_achievement_unlocks_user_idx
  on public.profile_achievement_unlocks (user_id, profile_identity_id);

-- 2) Replace read-only snapshot-based policy with user-owned rows
drop policy if exists "Users read own profile achievements" on public.profile_achievement_unlocks;

drop policy if exists "Users read own achievement ledger" on public.profile_achievement_unlocks;
create policy "Users read own achievement ledger" on public.profile_achievement_unlocks
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own achievement ledger" on public.profile_achievement_unlocks;
create policy "Users insert own achievement ledger" on public.profile_achievement_unlocks
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own achievement ledger" on public.profile_achievement_unlocks;
create policy "Users update own achievement ledger" on public.profile_achievement_unlocks
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Note: client upserts with onConflict profile_identity_id,achievement_id.
-- Rows created before this migration may have null user_id; re-push from client after login.
