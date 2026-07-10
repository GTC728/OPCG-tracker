# Workspace Architecture (V4.12+)

## Mental model

OPCG Tracker separates **Personal** (profile, achievements, deck catalog, cloud backup) from **Workspace** (sessions, players, matches — local or group-scoped).

| Layer | Storage | Survives switch? |
|-------|---------|------------------|
| Personal | `opcg-personal-v1` (IndexedDB) | Always |
| Local workspace | `groupStates['offline']` | Yes (cached) |
| Group workspace | `groupStates[normalizedCode]` | Yes (cached per group) |

## Orchestration

All join / leave / switch flows use **`switchWorkspace(target)`** in `appStore.ts`:

```text
switchWorkspace('local' | groupCode, options?)
  1. Save outgoing slice (group or offline)
  2. Optional: leave Supabase membership
  3. Load target slice from IndexedDB (or preserve collab for init on first join)
  4. Reset bootstrap flags → useGroupCollab rebinds → initializeGroupCollab
  5. tryAutoRelinkGroupProfile + achievement reconcile
```

- **`leaveGroupCollab`** = `switchWorkspace('local', { leaveMembership: true })`
- **First join** = `joinGroupWithRole` + `switchWorkspace(code, { preserveCollabForInit: true })`

## UI (scope-first Settings)

| Area | Contents |
|------|----------|
| **Sync status bar** | Group code + role + sync state; tap → workspace sheet (V4.13+, replaces header chip) |
| **Settings → 工作區** | WorkspaceHub: switch list, session/players/**members**/sync/join |
| **Settings → 個人** | Profile, account backup, appearance, language, leaders, import |
| **玩家管理** | Tabs: **名單** (roster) + **成員** (auth members admin) |

## Group admin (V4.13+)

Two parallel models — do not conflate:

| Model | Table / store | Purpose |
|-------|---------------|---------|
| **Auth members** | `group_members` | Who joined the group (owner/member/reader), ban, kick |
| **Roster players** | `sync_players` + local claim | Game names at the table |

- `Player.linkedUserId` ↔ `sync_players.linked_user_id` when profile linked while logged in.
- Owners manage all auth members including unlinked viewers via **群組成員** panel.
- Run `docs/supabase-v4.13.sql` on Supabase for owner UPDATE/DELETE policies and new columns.

Reuse (do not duplicate):

- `SessionManager`, `DataManagers`, `GroupSyncSection`
- `AccountBackupPanel`, `GroupMembershipPanel`
- `appStateLayers` split/merge — no new persistence model

## Roadmap hooks

| ID | V4.12 | Next |
|----|-------|------|
| G-01 multi-group switch | Local + cached groups list | + Supabase membership list |
| G-02 sync indicator | Banner → sheet | Queue detail |
| G-05 group registry | Display normalized code | `groups.display_name`, invite slug |

See also: `docs/UI-DESIGN.md` (workspace chip + banner), `docs/ROADMAP.md`.
