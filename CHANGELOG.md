# Changelog

All notable changes to OPCG Tracker are recorded here.

Format:

- `New`: new user-facing features.
- `Changed`: behavior, UI, data format, or documentation changes.
- `Fixed`: bug fixes and reliability improvements.
- `Security`: security, privacy, or data-protection changes.

## V4.20.0 - 2026-07-12

### New

- **Conflict merge UI (G-03)**: Detect join/pull entity conflicts; `GroupConflictPanel` with keep local / keep remote; banner alert.
- **Deck meta transfer chart (S-02)**: 100% stacked weekly deck appearance chart on Stats overview.
- **iPad landscape record layout (R-04)**: Tables left, assignment dock right; wider shell in landscape tablet.

See `docs/V4.20-CONFLICT-META-LANDSCAPE.md` and `docs/V4.16-ROADMAP.md` for V4.21+ schedule.

## V4.19.0 - 2026-07-12

### New

- **Operation history panel (R-02)**: Desktop `OperationHistoryPanel` — audit kinds, expandable match revisions, undo from history.
- **Structured audit (R-03)**: `AuditEntry` gains `actor`, `entityId`, `meta`; `MatchRevision` gains `actor`; group pulls log remote updater.
- **Foreground auto sync (9E)**: `groupAutoSync.ts` centralizes throttled flush (3s) and pull (10s); `lastGroupPullAt` in settings.

### Changed

- `useGroupCollab` uses `runGroupForegroundSync` instead of ad-hoc intervals.
- Mobile audit list shows actor labels; desktop gets full history panel.

See `docs/V4.19-OPERATION-TRACEABILITY.md` and `docs/V4.16-ROADMAP.md` for V4.20+ schedule.

## V4.18.0 - 2026-07-12

### New

- **群組大廳（G-05）**：`groups` 表 registry — 顯示名稱、邀請代碼；管理員可編輯 `GroupLobbyPanel`。
- **多群組列表（G-01+）**：登入後從 `list_my_group_memberships` 拉取已加入群組，合併進 `WorkspaceHub`。
- **邀請代碼加入**：可輸入 slug（3 字以上）代替 8 字群組碼。

### Changed

- **雲端 Profile claim（G-04）**：`tryAutoRelinkGroupProfile` 依 `sync_players.linked_user_id` 自動連結；`linkedUserId` 變更會觸發群組推送。

### Database

- 請執行 `docs/supabase-v4.18-group-lobby.sql`（需先完成 v4.11 `groups` 表）。

See `docs/V4.16-ROADMAP.md` for V4.19+ schedule.

## V4.17.0 - 2026-07-12

### New

- **均局時長（R-01）**：Stats 總覽顯示計時對局平均時長；歷史紀錄列表顯示每場 duration。
- **週勝率趨勢（S-01a）**：Stats 總覽（已連結個人檔案時）顯示週勝率圖，沿用 Profile 圖表元件。

### Changed

- **對位置信度 UI（S-03）**：Heatmap 小樣本灰階、平滑勝率顯示；tooltip 含可靠性標籤與實際戰績。
- **勝率顯示統一**：`winRateDisplay.ts` 整合 `getWeightedWinRate`，Stats / Profile 不再重複實作。

See `docs/V4.16-ROADMAP.md` for V4.18+ schedule.

## V4.16.0 - 2026-07-12

### New

- **成就伺服器帳本（A-02）**：`achievementLedgerSync` — 登入/reconcile 後 pull→merge→push `profile_achievement_unlocks`。
- **Import 去重（D-01）**：匯入前偵測重複對局指紋，預覽與匯入時自動略過。
- **週期雲端備份（A-04）**：App 啟動與回到前景時依 `backupReminderIntervalDays` 自動備份。
- **同步佇列明細（G-02）**：頂部 `SyncStatusBanner` + `SyncQueuePanel` 列出待送項目與錯誤。

### Database

- 請執行 `docs/supabase-v4.16-achievement-ledger.sql`（需先完成 v4.15）。

See `docs/V4.16-ROADMAP.md` for V4.17+ schedule.

## V4.15.1 - 2026-07-12

### Fixed

- **手機成就不同步**：群組拉取/即時同步對局後，會重算 `profileLifetime` 與 `achievementUnlocks`（先前僅 PC 匯入時在本機計算，手機有對局紀錄但成就為 0）。
- **升級歷史還原未推送**：`source` 變更（`import` → `historical`）現在會觸發群組同步。

## V4.15.0 - 2026-07-11

### New

- **伺服器完整性驗證**：Supabase RLS 限制觀眾/封禁帳號寫入 `sync_*`；觸發器驗證對局來源與勝方；歷史還原需 `integrity_grant_id`。
- **歷史還原授權 RPC**：`request_historical_import_grant` 於伺服器驗證 ≤100 場、≥30 天跨度。
- **`app_privileges` 特權表**：開發者於 Dashboard 手動加入 UUID 可略過跨度限制（不寫入 GitHub）。

### Security

- 群組同步拒絕 `import` source；`historical` 對局須附伺服器 grant 方可寫入。

### Database

- 請在 Supabase 執行 `docs/supabase-v4.15-integrity.sql`（需先完成 v4.13）。
- 詳見 `docs/SERVER-INTEGRITY.md`。

## V4.14.2 - 2026-07-11

### Changed

- **歷史還原成就**：所有類型成就（含連勝、技巧、趣味等）皆計入，不再僅限累積型。
- **歷史還原確認**：移除需輸入「歷史還原」文字的步驟，符合條件即可直接匯入。

## V4.14.1 - 2026-07-11

### Fixed

- **PWA stale cache on mobile Edge**: service worker uses network-first for HTML/JS; versioned cache busting from `APP_VERSION`; auto-reload when a new build is detected.

## V4.14.0 - 2026-07-11

### Changed

- **玩家管理整合群組成員**：名單卡片顯示角色標籤與帳號名稱；未連結名單的帳號集中於同一頁管理。
- **角色標籤**：記錄者 / 觀看者 / 管理員（取代易混淆的「成員」）。
- **移除頂部同步欄**：同步狀態改在工作區 hub 與設定中查看。

### Fixed

- **成員名稱亂碼**：優先顯示帳號名稱或對應玩家名，並自動同步個人檔案名稱至 Supabase。
- **角色選擇重複「成員」**：修正 OptionPicker 多出一個無效選項。
- **角色變更無回饋**：操作期間顯示「更新中…」提示。

## V4.13.0 - 2026-07-10

### New

- **群組成員管理**：管理員可列出所有 `group_members`（含未連結名單的觀眾），變更角色（成員/觀眾）、封禁、移除。
- **名單 ↔ 帳號連結**：玩家名單顯示背後連結的 Supabase 帳號；`sync_players.linked_user_id` 跨裝置同步。
- **黑名單**：`group_members.banned_at` — 封禁後無法記錄對局（觀眾權限亦被覆寫）。

### Changed

- **移除 Header 工作區 chip**；群組碼與角色併入頂部同步狀態列，點擊開啟工作區 sheet。
- **玩家管理**分「名單」與「成員」分頁；設定 → 工作區新增「群組成員」入口。

### Database

- 請在 Supabase 執行 `docs/supabase-v4.13.sql`（需先完成 v4.11）。

## V4.12.0 - 2026-07-10

### New

- **工作區架構**：Personal vs Workspace scope-first 設定頁；Header 工作區 chip（本機 / 群組）。
- **`switchWorkspace()`**：統一 join / leave / 多群組切換 orchestration（沿用 V4.10 layered storage）。
- **WorkspaceHub**：切換本機與已快取群組、場次/玩家/同步/加入群組入口。
- **帳號與備份分離**：`AccountBackupPanel`（個人）與 `GroupMembershipPanel`（工作區）取代混在一起的 Cloud 頁。

### Changed

- 同步狀態 Banner 可點擊，開啟 `GroupSyncSection` 精簡 sheet。
- 場次管理、玩家管理移至 **設定 → 工作區**（不再與個人設定混列）。
- `SystemStatusPanel` 共用 `GroupSyncSection`，避免重複同步 UI。

See `docs/WORKSPACE.md`.

## V4.11.2 - 2026-07-10

### Changed

- **歷史戰績還原**：移除「終身一次」限制，改為可多次使用的匯入機制；每次仍須 ≤100 場、日期跨度 ≥30 天。匯入畫面與升級確認會列出完整規則。

## V4.11.1 - 2026-07-10

### New

- **歷史戰績還原**：`source: historical` — ≤100 場、日期跨度 ≥30 天；計入累積型（grind）成就，技巧/時間型仍只算 live 對局。
- **升級既有匯入**：匯入紀錄可「升級歷史還原」（適用你已匯入的 39 場等舊資料）。

### Fixed

- Supabase RLS hotfix script (`docs/supabase-v4.11.1-fix-rls.sql`).

## V4.11.0 - 2026-07-09

### New

- **Achievement eligibility engine**: 5-minute match duration, 5-minute gap between consecutive matches, 20 eligible matches per player per session; CSV import never counts toward permanent achievements.
- **Cloud backup-first**: auto-backup on login (24h throttle), backup age reminders; full cloud/Excel restore backfills achievements via `restore` source.
- **Opponent achievements**: 廣結牌緣 (unique opponents faced), 老對手 (repeat rival grinds).
- **Group roles (foundation)**: owner / member / reader; readers are view-only on Record; only owners can delete matches in groups.
- **Supabase schema** (`docs/supabase-v4.11.sql`): member roles, groups registry stub, profile achievement ledger.

### Changed

- Leaving a group now removes your Supabase membership (re-joinable); first joiner becomes owner when role column exists.
- Stats still include all matches; only achievements and lifetime use eligible subset.

### Security

- Non-owner members can no longer delete synced matches in group mode.

## V4.10.2 - 2026-07-09

### Changed

- **Personal profile vs group identity**: login creates a persistent personal profile name (e.g. GTC); each group links a separate roster name (e.g. Bobby) via bookmarks without overwriting your personal profile.
- **Settings UI**: shows personal profile even after leaving a group; group link is a separate step.
- **Achievement display**: wall shows unlocked tiers from saved records only; fixed false unlocks from mis-bound metrics (onboarding, secrets, group roster size).

### Fixed

- Leaving a group no longer looks like losing your personal profile in Settings.
- Secret / onboarding achievements no longer unlock for everyone with zero or minimal matches.
- Removed confusing `???` prefixes from secret achievement titles.

## V4.10.1 - 2026-07-09

### Changed

- **Personal profile persists across groups**: `profileDisplayName` + `groupProfileLinks` auto-relink you to the same player name when rejoining a group; leaving saves a bookmark instead of forgetting who you are.
- **Link profile reconciles achievements**: connecting your profile rebuilds lifetime stats and syncs unlocks immediately (not only after the next match).
- **Achievement fairness**: `group_anchor` counts your own matches, not group roster size; group/sync badges apply only to the linked profile owner.

### Fixed

- Switching groups no longer forces manual re-link every time (when the same player name exists).
- Achievement wall no longer shows most players as having completed group-wide achievements in large rosters.
- First-time profile setup prompt only appears when you have no `profileIdentityId` yet.

## V4.10.0 - 2026-07-09

### Changed

- **Personal lifetime stats (Model B)**: cross-group cumulative counters (`profileLifetime`) drive veteran, streak, and related achievements; stable `profileIdentityId` binds unlocks to your profile, not group player UUIDs.
- **Layered IndexedDB storage**: personal data (achievements, lifetime, settings, deck catalog) and group data (matches, players, sessions) persist in separate keys; each group code gets its own IndexedDB slot.
- **Achievement reconcile**: deleting or reverting matches can lower achievement tiers; TEST* group matches skip lifetime/unlocks (provisional), discarded when leaving test groups.

### Fixed

- Test imports no longer permanently dirty cross-group achievement progress when leaving a TEST* group.
- Re-linking profile in a new group shows the same achievement wall via `profileIdentityId`.

## V4.9.0 - 2026-07-09

### Changed

- **Group-bound local data**: sessions, players, and matches follow the active group. Leaving a group clears local collab data automatically; joining pulls that group's cloud data (or seeds a new empty group once). No join-mode picker — behavior is automatic.
- **Join logic**: existing groups pull-first (no more blind bootstrap upload); new empty groups still receive local data once when appropriate.
- **Leave flow**: flushes pending sync, clears the outbox, and resets local collab slice before disconnecting.
- **Excel export**: human-readable match sheet shows active matches only; README splits active vs deleted counts.

### Fixed

- Switching test ↔ production groups no longer mixes local datasets or uploads stale data to the wrong group (upgrade triggers one rebind on next load).

## V4.8.0 - 2026-07-09

### New

- **Import safety**: auto snapshot before each import (keeps last 5); revert whole import batches; impact preview, test-data warning, typed confirm for ≥100 rows; default target is a new import session.
- **Sync controls**: pause/resume group push from System settings; LWW merge model explained in UI; paginated match sync (fixes 500-match cap on pull/push/bootstrap).

### Changed

- **Fine achievement tier**: fun-category ladder now **5 → 10 → 15 → 30 → 50** (was 5/10/10/20/30 style steps).
- **Large imports in groups**: auto-pause push during ≥50-row imports; resume triggers full state push.

### Fixed

- Group collab bootstrap and pull no longer silently drop matches beyond the first 500.

## V4.7.8 - 2026-07-09

### Changed

- **Tier ladders**: unified 5/10-multiple curves via `achievementTierCurves.ts` — fine (lv3≈10), medium (lv5=100), large (lv5=1000). Core, extra, batch, and remaining catalog share the same curves.
- **老兵 (`veteran`)**: now 10 → 50 → 100 → 500 → 1000 total matches; description updated for long-term goal.

### Removed (merged elsewhere)

- `win_or_learn` → `veteran` (total matches)
- `match_100` / `match_500` / `match_1000` → `veteran` tiers; `win_250` → `centurion_wins`
- Achievement count: **151** families (was 156)

## V4.7.7 - 2026-07-09

### Changed

- **Achievement consolidation**: pruned ~146 redundant/unimplemented families (UI stubs, V5 events, duplicates of core/batch). Wall now shows **156** meaningful families.
- **Achievement icons**: Lucide stroke icons — each family gets a distinct icon (160 unique glyphs).
- **Achievement copy**: remaining families use plain-language zh-Hant descriptions instead of generic「累積進度成就」.

### Removed (merged elsewhere)

- UI-only stubs (分享、備份、外觀…), unimplemented V5 events, and duplicates such as `tier_maxer`/`tier_triple` → `completionist_90`, `mirror_breaker` → `mirror_master`, etc.

## V4.7.6 - 2026-07-09

### Changed

- **Deck usage chart**: high-contrast indexed palette for pie slices and card accents; deck color dots still show identity.
- **Weekly win rate**: dashed cumulative-average trend line alongside weekly dots; sparse weeks no longer imply a broken chart.
- **Achievement balance**: year-scale tier curves for backlog catalog; UI/export achievements no longer inherit match totals; core social/meta tiers raised.
- **zh-Hant copy**: achievement catalog titles and stats chart hints use Traditional Chinese.

### Fixed

- **Achievement inflation**: ~70 backlog achievements incorrectly bound to total match count (e.g. 卡圖工匠 maxing at 82 games).

## V4.7.5 - 2026-07-09

### Changed

- **Achievement list mode**: dense rows (title + tier bar only; details in sheet); removed broken virtual scroll — panel uses native sheet scroll.
- **Deck usage hub**: compact pie without legend; top-5 cap with “other” slice; deck preview cards show color dots + left accent matching chart.
- **App header**: page title only — dropped truncated subtitle line.

## V4.7.4 - 2026-07-09

### Changed

- **Header**: single-line layout — page title + subtitle inline on the left; brand, version, and GitHub credit on one line right.
- **Profile card**: removed duplicate recent-20 win-rate bar; kept W/L strip only.
- **Deck pie preview**: color swatch legend maps each slice to deck name and usage %.
- **Stats navigation**: profile/deck views use a stack — back returns to previous profile (e.g. deck → player) instead of always resetting to main stats.

### Fixed

- Bottom sheet panels portal to `document.body`, center on desktop, cap height above bottom nav — no more off-screen or inconsistent placement.

## V4.7.3 - 2026-07-09

### Changed

- **Achievement panel stability**: removed async skeleton reload that flashed every ~5s during group sync; achievement data now stays mounted while recomputing.
- **Header credit**: GitHub `@GTC728` link moved to the right beside version; same credit shown in Settings → About.
- **Profile hub**: last-20 win-rate bar + per-match strip in identity card; weekly trend chart as its own section; compact deck usage pie preview on hub.
- **Motion**: tab slide transitions (left/right), bottom-sheet popup animation, themed scrollbars on desktop.

### Fixed

- Double scrollbar on achievement wall (panel vs virtual list); styled thin scrollbars for dark UI.

## V4.7.1 - 2026-07-09

### Changed

- **Materialized stats layer** (`materializedStats.ts`): win/loss, deck usage, matchup, and meta aggregates update incrementally on match CRUD (O(1) per match) instead of rescanning all matches on every stats read.
- **Store wiring**: hydrate, import, merge, undo/delete, and group sync paths keep materialized aggregates in sync with entity state.
- **Achievements wall**: flat list mode virtualizes 50+ rows; panel shows skeleton while achievement eval runs on idle callback.

### Fixed

- Stats bundle reads no longer trigger full-match rescans when materialized fingerprint is already current.

## V4.7.0 - 2026-07-09

### Changed

- **Derived data layer** (`derivedData.ts` + `useDerivedStats`): stats, profile bundles, and achievement evals are fingerprint-cached and shared across pages instead of recomputing on every render.
- **Lazy tab mounting**: Stats / History / Settings pages mount on first visit only; Record stays default.
- **Debounced persistence**: rapid table assignments batch into a single localStorage/IndexedDB write (~150ms); flush on tab close.
- **Achievement perf (V4.6 follow-up)**: single pass per player for leaderboards; cached player eval reused for progress UI.

### Fixed

- Achievement panel and stats pages no longer block the main thread with O(achievements × players) recomputation when opening profile or achievements wall.

## V4.6.0 - 2026-07-09

### New

- **Full achievement backlog**: added remaining ~230 achievement families from `docs/ACHIEVEMENTS-BACKLOG.md` (Batches A–E), bringing total families to ~300.
- **Data-driven catalog**: generator scripts for catalog definitions and metric bindings; shared stats engine for backlog evaluation.

### Changed

- Achievement evaluation accepts audit log, settings, and session context for sync/profile milestones.

## V4.5.0 - 2026-07-09

### New

- **Match timer**: starts when both players and decks are assigned; compact elapsed on table row, full duration in table menu and match history.
- **Audit log**: local operation history (complete, undo, edit, delete) under Settings → 系統與同步.
- **Sync status**: banner shows last sync time; settings panel with device label and manual retry.
- **20 new achievement families** from backlog (color mastery, centurion wins, timers, store regular, etc.).
- **Achievements UI**: category accordion sections, search filter, default category sort.

### Changed

- **Profile hub**: streak + recent-10 win rate merged into identity card; section order (decks → rivals → trends → recent matches); deck preview no longer duplicates color dots.
- **App header**:「OPCG Tracker」on the right; credit line `done by github@GTC728` instead of raw repo link.
- **Assignment drawer**: rounded top corners (`rounded-t-2xl`).
- **Schema v9**: `auditLog`, `lastGroupSyncAt`, nullable `ActiveMatch.startedAt`.

## V4.3.5 - 2026-07-08

### Changed

- **Profile identity card**: merged 戰績摘要 into top card with 戰績詳細 link; removed「詳細資訊」label.
- **Horizontal rails**: aligned with page padding (no left-edge bleed); preview limit raised to 10 items.
- **Trends section**: bar chart for recent win rates; streak shows win 🔥 or loss 連敗 (not blank dash).
- **Deck previews**: color dots + usage % + win rate on each card.

## V4.3.4 - 2026-07-08

### Changed

- **App header**: restored「OPCG Tracker」branding with GitHub repo link.
- **Profile layout**: each detail category (overview, trends, decks, rivals) is its own section with glass preview cards; unified `ProfileSection` headers.
- **Cross-session profile data**: achievements, streaks, and recent matches always use all-time data regardless of stats scope toggle.
- **Achievement section**: clearer meta line (項 + 階段進度) separate from「查看全部」link.

## V4.3.3 - 2026-07-08

### Changed

- **Light mode contrast**: semantic `--color-link` and warning callout tokens; accent text readable on white backgrounds.
- **Profile layout**: compact header with W/L + win rate; achievements first (title「成就」);「詳細資訊」preview cards at bottom (glass style like achievements).
- **Achievement rail**: fixed card edge overlap (snap scroll, no glow bleed in compact mode).
- **Bottom nav**: icons only with accessible labels (`aria-label`).

## V4.3.2 - 2026-07-08

### New

- **Achievement community page**: global unlock rates and player rankings in a dedicated sheet; entry via「社群數據」next to sort controls.
- **Session export**: session dashboard PNG from Record and Stats (leaderboard, MVP, deck usage, meta).
- **Richer profile export**: streaks, first/second, recent form, top decks, rivals, achievement tier progress.

### Changed

- **Achievement cards**: global rate removed from card corner; shown only in detail sheet with explanation.
- **Progress display**: header shows families unlocked + weighted tier progress (Lv.1/5 no longer counts as 100%).
- **App header**: more compact title bar.
- **Assignment dock**: removed unused「顯示更多牌組」.

## V4.3.1 - 2026-07-08

### Fixed

- **Achievement preview**: fallback to top unlocked achievements when no `unlockedAt` timestamps (legacy players).
- **Deck pie colors**: Black vs Blue hue separation; dual-color decks use 50/50 blend + split color-preference stats.
- **Profile share export**: solid export card (no backdrop-blur stacking artifacts).
- **Button press animation**: global `.ui-pressable` CSS active scale.

### Changed

- **Achievements UX**: tier metal segment bars; global rate as side pill (not row background); default sort = personal progress.
- **Peer ranking**: collapsible compact panel; tap player to view their achievement page.
- **Achievement wall title**: "我的成就" by default; global rate decoupled from primary sort.

## V4.3.0 - 2026-07-08

### New

- **50 achievement families** — full brainstorm set (25 core + 25 extended): Loyalist, Ice Breaker, Night Owl, Nemesis Bond, Set Dominance, etc.
- **Global achievement rates** — computed from all local players with match history; BG3-style list view with completion % bars.
- **Per-player completion rates** — peer ranking panel in achievement detail; sort default = global rate (most common first).
- **Frosted glass UI** — `ui-card` / `ui-glass-card` use backdrop-blur + theme-aware borders/shadows (light & dark).
- **Density modes wired** — `comfortable` = current default layout; `compact` tightens spacing via CSS variables.

### Changed

- Light mode borders/shadows strengthened for readability (settings, cards, inputs, achievement rows).
- Unified shadow tokens via `--glass-shadow` / `--ui-border` (fixes inconsistent ring-only surfaces).

## V4.2.1 - 2026-07-08

### New

- **Interaction feedback** — button/nav/segment press scale animations; subtle tap/toggle/success sounds (respects reduced motion).

### Changed

- Toast slide-in animation; theme-aware toast colors in light mode.
- Achievement unlock plays success sound when notifications enabled.

## V4.2.0 - 2026-07-08

### New

- **10 new achievements**: Mono Maniac, Mirror Master, Meta Breaker, Revenge Match, Underdog, Weekend Warrior, Group Star, Note Poet, Achievement Hunter, plus expanded skill tiers.
- **Achievement browsing**: category filter chips, sort by common-first / progress / category / name; grouped sections when sorted by category.
- **Profile achievement rail**: shows **recently unlocked** badges (by `unlockedAt`), not definition order.

### Changed

- **Grind achievements** capped at **5 tiers**, calibrated for ~1.5 sessions/month (~100 matches/year max for Veteran).
- **Repeatable skill achievements** capped at **3 tiers** with count-based progress (comeback, giant slayer, upset alarm, etc.).
- Each definition has `ease` weight for default sort (more common achievements first).

## V4.1.0 - 2026-07-08

### New

- **Profile hub layout**: horizontal preview cards (overview, trends, decks, matches, achievements, rivals) — tap for full detail in bottom sheets.
- **Tiered achievements**: grouped levels (e.g. Veteran Lv.1–7 for 1→500 matches); tap any badge for tier breakdown.
- **Skill / fun achievements**: Color Spectrum (win with each primary color), Giant Slayer, Upset Alarm, Rainbow Session, Second Striker tiers, etc.
- **SVG achievement icons** (`AchievementIcon`) — category-colored badges instead of emoji-only.

### Changed

- **Deck usage pie**: hue from leader color preference; same-hue decks distinguished by lightness + ring stroke; color-preference summary chips.
- Schema v8: `AchievementUnlock.level` + legacy achievement ID migration.
- Profile main page shows summaries + horizontal recent matches; details moved to sheets.

## V4.0.0 - 2026-07-07

### New

- **Personal player profile**: create-or-link flow with device claim and exact-name verification; Settings → 個人玩家.
- **Profile stats**: current/longest win streak, deck usage pie chart, weekly win-rate line chart (weeks with no games have no dot).
- **Share cards**: export Profile or Session summary as PNG (Web Share or download).
- **Achievements**: 15 milestones/streaks/meta badges with unlock toasts.
- **Appearance settings**: dark/light/system theme, 5 accent colors, UI density, default stats scope.
- **Turn order badges**: `1st` / `2nd` pills on profile match lists and share cards.

### Changed

- Schema v7 (`linkedPlayerId`, theme settings, `achievementUnlocks`, player claim fields).
- Card surfaces use selective glassmorphism; border radius reduced (cards 12px, buttons/rows 8px).
- Event/League roadmap moved to **V5.x**; V4 focuses on personal system & UI.

## V3.10.6 - 2026-07-07

### Changed

- **Visual refresh (V2-inspired)**: refined dark tokens, card rings/shadows, segmented controls for stats filters, cleaner headers and list rows. See `docs/UI-DESIGN.md`.
- **Shared UI**: `uiSurface.ts`, `SegmentedControl`, `.ui-segment` CSS applied to Record, Stats, History surfaces.

### Fixed

- **Assignment drawer on wrong tab**: bottom chrome panel only active on Record tab (no longer overlays Stats/History).
- **Assignment drawer clipping**: taller expanded cap + scroll fallback; chip rows aligned so bottom text displays fully.

## V3.10.5 - 2026-07-06

### Changed

- **Stats UI simplification**: removed redundant「常見玩家/牌組對位」card lists, daily volume trend, donut chart, and separate deck distribution table — heatmaps and unified deck list cover the same data.
- **Deck tab**: merged usage × win-rate into a single clickable **牌組列表** (tap row → deck profile).
- **Heatmap cells**: show win rate + W-L per matchup.
- **Player profile**: merged duplicate「玩家對位」/「對手勝率」into one section; tap opponent to open their profile.

### Fixed

- **Scroll position**: stats tab and sub-sections (總覽/玩家/牌組) remember scroll when switching tabs or opening/closing profiles.

## V3.10.4 - 2026-07-06

### New

- **Stats review mode**: environment summary, daily volume chart, global recent form, and full deck usage × win-rate table for post-session analysis.
- **Player vs player matchup matrix** on the Players tab; **deck vs deck matrix** on the Decks tab.

### Changed

- **MVP / top deck**: both show win rate + W-L; only players/decks with ≥3 matches qualify.
- **Unified select highlight** (`selectSurface`): inset shadow instead of border+ring stacking — fixes highlight overflow on table cells and assignment chips.
- **Heatmap labels**: up to 2 lines when names are long.
- **Profile matchups**: card list only (full matrices live on list tabs).

### Fixed

- **King (OP08)** Traditional Chinese: 燼 (was simplified 烬).

## V3.10.3 - 2026-07-06

### Changed

- **Player merge UI**: vertical picker flow with bottom sheets, match counts on each name, and confirm dialog.

### Fixed

- **Player merge list**: excludes deleted players and players with no visible matches (no more duplicate ghost entries).
- **Deck profile stats**: appearance count and first/second split exclude soft-deleted matches (aligned with win-rate cards).

## V3.10.2 - 2026-07-06

### Changed

- **Stats**: removed standalone 對位 tab; matchup heatmap + cards live under player/deck profiles.
- **Matchup UI**: wider heatmap columns, shorter rows, single-line deck labels; mobile-friendly matchup cards with win-rate bar.
- **Rematch**: recent-match tap places directly on an empty table (no legacy form sheet).
- **Deck label**: compact single-line layout on table rows.

### Fixed

- **Luffy & Ace / Ace & Newgate** Chinese locale names (no longer show English with `*`).
- **Undo match (還原)**: restored active match goes back to an empty table slot instead of legacy unassigned card UI.
- **Table deck display**: player + deck on one line with proper truncation.

## V3.10.1 - 2026-07-06

### New

- **Session merge** (`mergeSessions`): move matches, roster, table count from source session into target; renumber matches; tombstone source. UI in Session Manager.

## V3.10.0 - 2026-07-06

### New

- **Mandatory group sync**: joining a group auto-enables entity sync; leaving stops Realtime.
- **Offline sync queue** (`syncQueue.ts` + Dexie): local changes queue when offline; flush on reconnect; `SyncStatusBanner` shows offline / pending count.
- **Head-to-head stats** on player profile (`buildHeadToHeadStats`).
- **Leader locale table** for all 76 seed leaders (`leaderLocaleNames.ts`); manual translations marked with `*`.
- **繁體中文 + 简体中文** (`zh-Hant`, `zh-Hans`); schema migration from legacy `zh`.

### Changed

- Group collab toggle and manual group JSON upload/download removed while in a synced group.
- Player merge syncs remote delete + target upsert + match rewires in group.
- Player and leader management: delete-only UI (archive removed from settings cards).
- Bottom nav: SVG icons, smaller height (`min-h-9`).
- Matchup rows use anchor deck perspective in deck profile.
- Matchup heatmap: up to 14 decks, larger cells, word-wrapped labels.

### Fixed

- Table assignment deck names no longer hard-truncated at `8rem`.

### Backlog (documented in `docs/V3.10-RELEASE.md`)

- Session merge → **3.9.2**
- Recent form denominator investigation
- Profile-scoped matchup heatmap

## V3.9.0 - 2026-07-05

### New

- **Unified bottom chrome** (`BottomChromeShell`): mobile assignment drawer and bottom nav share one fixed container; height measured via `ResizeObserver` → `--bottom-chrome-height`.
- **Listed player rules** (`isListedPlayer`, `getListedPlayers`): central visibility for assignment, filters, and settings counts; visible match count excludes tombstoned matches.
- **History filter UI** (`FilterPicker`): session/player pickers use app-styled rows + BottomSheet; date presets (全部/今日/近7日) plus **custom from–to range**.
- i18n: `history.dateCustom`, `history.dateFrom`, `history.dateTo`, `history.playerAll`, `history.deckFilter*`.

### Changed

- Assignment drawer registers into bottom chrome via `useBottomChromePanel` (no separate fixed `bottom-*` layer).
- Settings data overview counts listed players and visible (non-deleted) matches only.
- Stats player leaderboard excludes tombstoned players.
- Record assignment roster: explicit session roster, or players with ≥1 visible match in session when no roster.

### Fixed

- Bottom drawer no longer overlaps bottom nav on varying safe-area / device heights.
- Test/orphan players with zero visible matches no longer appear in assignment or history player filter.
- Settings match/player counts no longer include tombstoned records.

## V3.8.0 - 2026-07-05

### New

- **Mobile assignment drawer**: fixed panel above bottom nav (keyboard-style), replacing per-table BottomSheet picker; stays visible while assigning across tables.
- **Bidirectional table assign**: pick player/deck in drawer then tap table cell, or tap table cell first then pick in drawer; active field highlights matching drawer section (player row or deck row).
- **Compact complete table row**: single line `# | side · deck | W vs W | side · deck | ⋯` with secondary actions in ⋯ menu (roll, first A/B, edit, clear).
- **Layout tokens**: `src/lib/layout.ts` + CSS vars (`--app-bottom-nav-height`, `.app-above-bottom-nav`, `.app-main-bottom-pad`) for safe-area-aware bottom chrome.
- **UI design doc**: [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md) — living record of spacing, typography, drawer/table patterns (update when we agree new standards).
- i18n: `table.removeTable`, `table.removeOnlyLast`, `table.winShort`, `table.moreActions`, `table.actionsTitle`.

### Changed

- **Assignment drawer layout (mobile)**: players label + chips on one row; deck label + search on one row; recent decks on separate horizontal scroll row; `px-2.5` / `gap-2.5` (10px) on those rows.
- **Drawer width/position**: full-width shell aligned with bottom nav; inner `max-w-lg`; sits flush on top of nav (`BOTTOM_NAV_OFFSET`), no left-edge gap, no overlap with tab icons.
- **Bottom nav**: shorter (`min-h-11`), smaller icons/labels (`text-base` / `text-[10px]`).
- **Incomplete table row**: `[#][player][deck] vs [player][deck][×]` grid; table number as 16×16 badge; win buttons always **W** (all locales).
- **× on incomplete tables**: always shown; clears partial match or removes last empty table slot.
- **Max tables**: `MAX_TABLE_COUNT` 12 → 32.
- **Settings player list**: hides tombstoned/deleted players from management UI (`isDeletedPlayer` filter).
- Removed `TableAssignSheet` (tap-table BottomSheet flow superseded by drawer).

### Fixed

- Assignment drawer no longer eats bottom nav space or shows vertical scrollbar on typical content height.
- Main content bottom padding and toast position follow shared bottom-nav offset (includes safe-area).
- Drawer section highlight when tapping table assign cells (`pendingTableTarget`).

## V3.7.0 - 2026-07-05

### New

- **Unified tombstone sync**: match, player, and session deletes sync across group devices via `deleted_at` / `archived_at` UPSERT (requires `docs/supabase-sync-v3.7.sql`).
- **Session archive**: collapse old nights under「過往場次」; archived sessions keep match history and stats.
- **Session cascade delete**: deleting a test/wrong session tombstones all its matches on every device.
- **History filters**: filter completed matches by session and date range.
- **Mobile table assign**: tap a table slot to open player/deck picker; empty tables fold to a compact row on phone.

### Changed

- Single **删除** for matches (no soft delete → permanent delete flow).
- Player delete keeps the row for historical names; player is hidden from assignment lists.
- Assignment dock hidden on mobile; use tap-to-assign on table slots.

### Fixed

- Player and match permanent deletes now sync to other group devices (V3.6.1 hard DELETE failed under RLS).

## V3.6.1 - 2026-07-05

### New

- Record session details show weighted top deck (win rate) instead of most-used deck.
- Cross-day session prompt with new / continue / manage actions.
- Compact settings list row layout.

### Fixed

- Permanent delete and session delete no longer roll back when group collab is enabled: purges push to Supabase and block pull/realtime restore.

## V3.6.0 - 2026-07-04

### New

- **Mobile record layout**: tables appear above the assignment dock on phone; recent decks collapse to a horizontal strip (6 items) with expand.
- **Session management**: rename, switch, create, end, and permanently delete sessions from Record page sheet and Settings.
- **Permanent delete**: after soft-delete/archive, permanently remove matches, players, and decks with backup reminder prompt.
- **Backup versions**: pick and restore older personal cloud snapshots; group upload history when collab is off (requires `docs/supabase-group-snapshots-v3.6.sql`).

### Changed

- Assignment dock starts collapsed on mobile to reduce scroll distance to tables.

## V3.5.4 - 2026-07-04

### Fixed

- Prevent stale active-table rollback by pushing only changed active rows and guarding remote active updates with local edit timestamps.
- Player management sync now pushes changed players directly and listens to `sync_players` Realtime.
- Settings overview active count now matches Record page by counting only the current session.
- Added visible-tab polling fallback so player changes and missed active-table deletes sync even when Realtime events are dropped.

## V3.5.3 - 2026-07-04

### Fixed

- Prevent stale group sync rollback on Record page by pushing only changed active/player/match rows instead of rewriting all local rows during every flush.
- Remove mobile `focus` pull loop; remote state now pulls on startup and when returning from hidden tab only.
- Player management now syncs through `sync_players` Realtime; SQL adds `sync_players` to `supabase_realtime`.

## V3.5.2 - 2026-07-04

### Fixed

- **Centralized group collab sync** in `persist()`: diff prev/next state instead of per-action hooks — covers soft delete, restore, edit, clear table, notes, undo, etc.
- Remote pull no longer echoes back to Supabase (`pauseGroupCollabNotify` during inbound merge).
- History match cards use two-row layout (no overlapping text on mobile).

## V3.5.1 - 2026-07-04

### Fixed

- Group collab Realtime now applies **completed matches** on INSERT and UPDATE (upsert no longer missed).
- Removed same-account skip on remote events — multi-device sync under one login works without manual refresh.
- Pull on tab focus / Realtime subscribe as fallback; run new Realtime SQL block in `supabase-sync-v3.5.sql` if live sync still silent.

### Changed

- Record page: removed add-player from assignment dock (roster sheet only); session bar buttons re-layout for mobile.
- Table slots use chip-style border when filled or awaiting tap-assign.
- History + 最近對局 share stacked `match-result-row` layout (player + deck per side).
- Deck Top 5 ranked by **weighted win rate** (3-game prior toward 50%).

## V3.5.0 - 2026-07-04

### New

- **Group realtime collab (Plan B)**: optional entity sync via Supabase (`sync_active_matches`, `sync_matches`, etc.) with Realtime subscriptions.
- Settings → Cloud: toggle **即時協作** when joined to a group; legacy JSON upload/download hidden while collab is on.
- Run [`docs/supabase-sync-v3.5.sql`](docs/supabase-sync-v3.5.sql) on Supabase after base setup.

### Changed

- Table slots show assigned **deck first** — player optional until filled.
- **本輪參與玩家** lists all active players; inline **新增** without going to Settings.
- Assignment dock also supports quick-add player (auto-adds to explicit session roster).

## V3.4.2 - 2026-07-04

### Fixed

- Assignment dock no longer auto-collapses after each drag/tap assign.
- Session roster without explicit list now keeps **all active players** visible (was shrinking to match participants only).
- Player and deck assign **independently** — dragging a player no longer auto-fills their recent deck.
- Recent decks in assignment dock include session matches, active tables, and per-player history.
- Player/deck chip selection uses border instead of ring (fixes wrong-size white focus box).
- Recent section renamed **最近對局**; single-row layout with green winner + time; tap row to rematch.

## V3.4.1 - 2026-07-04

### Changed

- **Compact table cards**: filled tables hide drop zones; smaller WIN buttons (~2 tables per mobile screen).
- **AssignmentDock** replaces「新對局」: players + deck search/recent chips; drag or tap-to-assign.
- Assignment dock auto-collapses after a successful assign; expandable summary bar.
- **Recent combos only**: removed duplicate「最近完成」; shows last winner + rematch → empty table (auto +1 table if needed).

## V3.4.0 - 2026-07-04

### New

- **Table Mode** on Record page: configurable table count (+/−), drag-and-drop players and decks to left/right sides.
- Partial table assignments persist as draft active matches until both sides are filled.
- Recent deck chips draggable separately from player chips.

### Changed

- Active matches section replaced by table board; overflow matches without table slot shown below.
- Loser side no longer uses red styling in match rows (winner green only).

## V3.3.2 - 2026-07-04

### Changed

- All deck/leader name displays use `DeckLabel` (color dots + localized names) across stats, history, record, and settings.
- Leader names localize by UI language: zh / ja / en, with alias fallback for full database coverage.
- Match rows order by **first-player left** (not player A/B); winner green, other side neutral.
- Matchup heatmap and win-rate indicators use **green/red** (advantage / disadvantage).
- Settings menu reordered: language → players → session → cloud → leaders → import/export → about.
- Chinese UI translations: 場次 (session), 主將 (leader), 牌組 (deck), and related strings unified.

## V3.3.1 - 2026-07-04

### New

- Record page **新 Session** button when no session is active.
- Global session roster prompt: appears on any tab after creating or switching sessions.
- Active match editing (players and decks) from expanded in-progress cards.
- Leader display names for zh / ja via centralized `leaderDisplay` map.
- History match list uses compact expandable rows (tap to show details).

### Changed

- Deck search: focus shows player's recent decks first; typing switches to full search; re-tap selected deck to search again.
- Recent combo rows no longer show duplicate borders.
- Stats deck Top 5 shows color dots and localized leader names via `DeckLabel`.
- Session roster prompt moved to app level (`rosterPromptSessionId` in settings).

### Fixed

- Creating a session in Settings no longer requires switching to Record tab to see roster picker.
- Deck search could not re-open after selecting a deck without clearing first.
- Duplicate box styling on recent match / combo rows.

## V3.3.0 - 2026-07-03

### New

- Session roster picker: choose tonight's participants when starting or editing a session.
- Post-match notes sheet after recording a winner.
- Stats overview mini-leaderboards for top players and decks by usage.
- Built-in Leader locale aliases (zh-Hant, ja, Cantonese) for search.
- Player and deck alias chip UI with add/remove buttons.
- Live demo link in all README files.

### Changed

- Record page uses compact single-line session summary and collapsible active matches.
- Deck picker uses combobox mode: selected deck fills the input, results close after pick.
- Deck recommendations show 2–3 recent distinct decks per player.
- History winner display uses color-coded result rows.
- History edit form uses vertical layout.
- Pie chart and deck list sorted by usage (appearances), not win rate.
- Expanded rule-based insights (streaks, upsets, diversity, MVP margin).
- Added `docs/V3.3-DESIGN-DISCUSSION.md` and roadmap entries for V3.3 / V3.4.

### Fixed

- Removed pre-match notes field; notes are captured after match completion instead.

## V3.2.1 - 2026-07-03

### New

- Added English-first GitHub README with language links.
- Added Japanese README.
- Added Traditional Chinese README copy.
- Added `docs/PROJECT-HISTORY.md` to preserve V1/V2 planning and implementation history.
- Added `docs/EVENTS-AND-LEAGUES.md` for future Store Tournament and League Ruleset planning.

### Changed

- Backfilled pre-V3 history into the changelog.
- Updated roadmap with V3.1, V3.2, and V4 Event / League direction.
- Extended the V2.1 product plan with Event Mode and League Mode scenarios and appendix guidance.

## V3.2.0 - 2026-07-03

### New

- Added session switching so users can return to older sessions.

### Changed

- Moved match creation sheets higher and constrained them to dynamic viewport height for better mobile keyboard behavior.
- New Match deck results now stay hidden until the user searches.
- Settings now has a separate language section, separate player and Leader management, and inline About information at the bottom.
- Player merge now lives inside player management.
- Stats and remaining deck-heavy UI now use compact Leader names instead of full leader card codes.

### Fixed

- Removed duplicate small `OPxx-xxx` deck subtitles from deck search results and Leader management cards.

## V3.1.0 - 2026-07-03

### New

- Added reusable compact deck labels with color dots.
- Added searchable deck picking in History filters and match editing.
- Added email login rate-limit guidance and resend cooldown.
- Added persisted group code and device label settings.

### Changed

- Decks now display as compact set code + color dots + leader name in high-scan UI.
- New Match form now uses clearer Player A / Player B cards and larger first-player controls.
- Player and deck alias fields now accept comma, Chinese comma, semicolon, slash, and newline separators while preserving normal spaces.

### Fixed

- Fixed History deck editing requiring users to scroll a full deck list.
- Fixed cloud group/device values resetting every time the Cloud Backup screen reopened.

## V3.0.0 - 2026-07-03

### New

- Added full app version bump to V3.0.
- Added editable session names.
- Added first-run onboarding to ask users to choose their language.
- Added first-run cloud/group guidance explaining email login and group sync.
- Added Chinese / English / Japanese UI language foundation.
- Added language selector in `設定 → App 資料`.
- Added global toast feedback system.
- Added button loading states and stronger active/focus interaction states.
- Added custom highlighted Excel / CSV file picker.
- Added readable Excel export sheets: `README` and `對局總表`.
- Added app-native Excel restore flow using `_meta` and `_app_state_json`.
- Added dedicated user and technical documentation files.

### Changed

- Session default name now uses the date only, without the extra store/location suffix.
- Default language is now English for new users.
- Settings page now uses a cleaner standard settings layout with category rows and detail pages.
- Renamed the stats tab/page from Today to Stats / 統計.
- Reworked `README.md` into a user-first guide.
- Moved roadmap, development notes, cloud setup, Excel format, and engineering notes into `docs/`.
- Improved Excel export from database-first to human-first while preserving machine-compatible sheets.
- Updated main navigation, settings, import/export, cloud, record, and history surfaces to use translation keys.
- Improved user feedback for import/export, cloud backup, group sync, player management, match recording, and history actions.

### Fixed

- Replaced native `Choose File` control with a visible upload card so users can clearly see where to click.
- Added direct OPCG Excel export detection during import so exported backups no longer go through manual field mapping.
- Normalized Supabase auth URL usage to avoid invalid auth request paths.

### Security

- Added stricter Supabase group sharing design with `group_members`.
- Restricted group state read/write policies to group members.
- Treated group code as an invite secret.
- Limited service worker caching to same-origin app assets.

## Historical Record Before V3

These entries backfill the early design and implementation work that happened before formal V3 release notes were introduced.

## V2.1 Planning Document - 2026-07-02

### New

- Established the original product plan and technical specification for a mobile-first OPCG match tracker.
- Defined core user groups: store players, playtest groups, small event players, store organizers, teams, and meta analysts.
- Defined core flows for ordinary store play, multi-player playtest loops, historical Excel import, and post-session analysis.
- Specified the first long-term data model covering players, decks, sessions, active matches, completed matches, and import records.

### Changed

- Shifted the project from an ad hoc match logger idea into a structured product roadmap.
- Prioritized fast match creation, low-friction mobile use, alias handling, sample-size-aware analytics, and future import/export compatibility.

## V2.0 Cloud And Long-Term Use Direction

### New

- Added the long-term multi-device direction: PWA installability, IndexedDB local durability, and Supabase cloud backup.
- Introduced email login and group sharing as the preferred model over the earlier PIN-only sharing idea.
- Added the idea that one trusted group can share a single match dataset.

### Changed

- Moved storage direction from localStorage-only to IndexedDB-first with localStorage fallback.
- Changed group sharing from lightweight PIN mode to authenticated email login plus group code membership.

### Security

- Introduced Row Level Security planning for personal snapshots and group shared states.
- Treated group codes as invite secrets rather than public identifiers.

## V1.3 Data Foundation

### New

- Added schema V4 data foundation with normalized `Leader`, `DeckVariant`, `PlayerAlias`, `SessionPlayer`, `SessionDeck`, `MatchRevision`, `ImportBatch`, and `ImportRow`.
- Added selector-layer helpers so UI code could read deck/player/session data without depending directly on one storage shape.
- Added match revision logging for edits and import batch/row tracking for import accountability.

### Changed

- Preserved the legacy `decks` view for compatibility while preparing for Leader + DeckVariant migration.
- Improved deck/player alias handling for historical Excel compatibility and long-term data cleanup.

## V1.2 UX Polish

### New

- Added Quick Mode, large WIN cards, rematch shortcuts, and recent combinations.
- Added richer stats concepts such as insights, matchup views, first/second split, recent form, and player/deck profile thinking.
- Added Settings Hub direction for data management, aliases, imports, and cleanup.

### Changed

- Shifted the UI from a single dense stats page toward layered navigation and profile-style drill-downs.
- Reduced low-value remarks and emphasized high-signal visual summaries.

## V1.0 Core App

### New

- Created the initial React + TypeScript + Vite + Tailwind app shell.
- Added bottom navigation for Record, Stats, History, and Settings.
- Added player and deck management.
- Added match creation, active matches, winner recording, undo, match numbering, history, filters, soft delete, restore, and basic stats.
- Added CSV / Excel import with mapping preview and import report.

### Changed

- Replaced manual spreadsheet-only tracking with a structured app workflow for daily OPCG play.
