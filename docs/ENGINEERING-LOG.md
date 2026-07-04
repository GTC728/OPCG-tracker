# Engineering Log

## 2026-07-03 Security Hardening

### Goal

Reduce the chance that another authenticated user can read or overwrite shared group data.

### Decisions

- Add `group_members`.
- Restrict group state RLS to group members.
- Treat group code as an invite secret.
- Avoid service worker caching cross-origin/API requests.

### Changed Areas

- `docs/supabase-setup.sql`: stricter group sharing policies.
- `src/lib/cloudSync.ts`: group membership creation before read/write.
- `src/components/settings/CloudSyncTool.tsx`: stronger group code guidance.
- `public/service-worker.js`: cache only same-origin app assets.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`

### Risks / Follow-up

- Supabase SQL must be re-run after deployment.

## 2026-07-03 Excel Export / Import Format

### Goal

Create an Excel format that is readable by humans and still suitable for future full restore/import.

### Decisions

- Add human-first sheets: `README`, `對局總表`.
- Preserve machine sheets for round-trip import.
- Use `_app_state_json` as the safest restore path.
- Keep normal CSV/Excel mapping import for old files.

### Changed Areas

- `src/lib/excelExport.ts`: workbook generation and sheet structure.
- `src/components/settings/DataTools.tsx`: export button and OPCG export import detection.
- `src/lib/storage.ts`: JSON app state import helper.
- `docs/EXCEL-FORMAT.md`: format documentation.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`
- Runtime inspection confirmed sheet order: `README`, `對局總表`, `_meta`, `matches`.

### Risks / Follow-up

- Future import from normalized sheets can be added if `_app_state_json` is unavailable.

## 2026-07-03 Interaction, I18n, And Documentation

### Goal

Make the app easier to understand and operate by improving visible interaction feedback, adding Chinese/English/Japanese UI support, and moving mixed README content into dedicated docs.

### Decisions

- Use Toast + button loading + inline messages.
- Replace native file input visuals with a custom upload control.
- Add language setting to app state.
- Keep card/leader names as source data rather than translated text.
- Rewrite `README.md` for users, not developers.

### Changed Areas

- `README.md`: user-facing entry point.
- `docs/USER-GUIDE.md`: long-form usage guide.
- `docs/ROADMAP.md`: implementation roadmap.
- `docs/DEVELOPMENT.md`: local development and project structure.
- `docs/CLOUD-SYNC.md`: Supabase and group sharing setup.
- `docs/ENGINEERING-LOG.md`: project log.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`
- Manual UI check: custom file upload control is visible and clickable.
- Manual UI check: language selector switches visible UI from Chinese to English.

### Risks / Follow-up

- Some deep analytics labels and card data labels can be further refined in future copy passes.

## 2026-07-03 V3 Versioning And Push Summaries

### Goal

Name the large interaction, i18n, Excel, documentation, and security upgrade as V3 and establish a simple push summary format.

### Decisions

- Use `3.0.0` for the V3 release.
- Keep `package.json` and `src/lib/constants.ts` app version aligned.
- Add `CHANGELOG.md` as the high-level version history.
- Use `New / Changed / Fixed / Security / Verify` for push summaries.

### Changed Areas

- `package.json`: app package version bumped to `3.0.0`.
- `src/lib/constants.ts`: `APP_VERSION` bumped to `3.0.0`.
- `README.md`: V3 label and links to changelog/workflow docs.
- `CHANGELOG.md`: V3.0.0 release notes.
- `docs/GIT-WORKFLOW.md`: push summary and version iteration workflow.
- `docs/ROADMAP.md`: V3 marked as completed.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`

### Risks / Follow-up

- Future pushes should update `CHANGELOG.md` when user-visible behavior changes.

## 2026-07-03 Session And Settings UX Refinement

### Goal

Make session naming simpler, make Settings behave more like a normal app settings screen, and fix the stats tab naming.

### Decisions

- Default session names should be date-only.
- Current session name should be editable.
- Settings should use a category list with detail pages rather than repeated large cards.
- The stats tab should be named `統計 / Stats`, not `今日 / Today`.

### Changed Areas

- `src/lib/sessions.ts`: default session name changed to date-only.
- `src/stores/appStore.ts`: added `updateSessionName`.
- `src/pages/SettingsPage.tsx`: refactored settings navigation and added session rename UI.
- `src/i18n/*.ts`: renamed stats labels and added session/settings keys.
- `CHANGELOG.md`: recorded the V3 UX refinement.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`
- Manual UI check: stats tab shows `統計`.
- Manual UI check: Settings home uses category rows.
- Manual UI check: Session detail page supports editing the current session name.

### Risks / Follow-up

- Existing sessions keep their old names until edited by the user.

## 2026-07-03 First Run Language And Cloud Onboarding

### Goal

Make English the default language and guide users to choose a language before entering the app, while also explaining that they can log in and join a group for cloud sharing.

### Decisions

- New users default to English.
- First run shows a language selector before the main app.
- Onboarding explains email login, group code, and Cloud Backup sharing.
- Onboarding completion is stored in app settings.

### Changed Areas

- `src/lib/constants.ts`: default language changed to `en`.
- `src/types/index.ts`: added `onboardingCompleted`.
- `src/stores/appStore.ts`: added `completeOnboarding`.
- `src/App.tsx`: added first-run onboarding screen.
- `src/i18n/*.ts`: added onboarding copy.
- `README.md`: updated first-use instructions.

### Verification

- Pending final build and audit.

### Risks / Follow-up

- Existing local users will see onboarding once because the completion flag is new.

## 2026-07-03 V3.1 Usability Patch

### Goal

Improve high-friction daily-use flows without changing the underlying data model.

### Decisions

- Keep full deck identifiers in the database/search layer, but show compact deck labels in the UI.
- Use color dots as the primary deck color indicator.
- Treat Supabase email quota as a server-side limit; only show local resend cooldown and clear guidance.
- Persist cloud group/device preferences locally for convenience.
- Preserve normal spaces in aliases, because player names may contain spaces.

### Changed Areas

- `src/components/deck/`: shared deck color, label, and search UI.
- `src/components/record/MatchRecorder.tsx`: clearer New Match flow and compact deck labels.
- `src/pages/HistoryPage.tsx`: searchable deck filter/edit controls.
- `src/components/settings/DataManagers.tsx`: compact deck labels and improved alias parsing.
- `src/components/settings/CloudSyncTool.tsx`: email cooldown, friendly rate-limit message, persisted group/device settings.
- `src/types/index.ts`, `src/lib/constants.ts`, `src/stores/appStore.ts`: new persisted settings.

### Verification

- Pending final lint/build/audit.

## 2026-07-05 V3.8 Mobile Assignment Drawer And UI Standards

### Goal

Replace V3.7 tap-table BottomSheet assign flow with a fixed mobile assignment drawer; compact table rows; shared bottom-layout tokens; document UI preferences for future work.

### Product / UX Decisions

- Mobile assign uses **fixed drawer above bottom nav**, not inline dock and not per-table sheet.
- **Bidirectional assign**: drawer → table or table cell → drawer; highlight active drawer zone (`player` vs `deck`).
- Drawer compact rows: player label + chips same line; deck label + search same line; recent decks separate scroll row; 10px (`px-2.5` / `gap-2.5`) spacing.
- Drawer shell **full width like bottom nav**, content `max-w-lg`, bottom offset includes safe-area; no left inset gap.
- Bottom nav shortened to `min-h-11`.
- Incomplete table: `[#][player][deck] vs [player][deck][×]`; × always visible; remove last empty slot or clear match.
- Complete table: one row + ⋯ menu; win buttons always **W**.
- `MAX_TABLE_COUNT` raised to 32.
- Living UI prefs: `docs/UI-DESIGN.md`.

### Changed Areas

- `src/components/record/AssignmentDock.tsx`: drawer variant, compact stacked rows, zone highlight, layout constants import.
- `src/components/record/TableBoard.tsx`: `AssignFieldCell` grid, `CompactCompleteTable`, `PendingTableTarget`, dismiss table logic, mobile drawer integration.
- `src/components/layout/AppShell.tsx`: shorter bottom nav, `app-main-bottom-pad`.
- `src/lib/layout.ts`: new — bottom nav height, drawer height, offset strings.
- `src/lib/tableMode.ts`: `PendingTableTarget`, `MAX_TABLE_COUNT = 32`.
- `src/index.css`: `--app-bottom-nav-height`, `.app-above-bottom-nav`, `.app-main-bottom-pad`, `.scrollbar-none`.
- `src/components/ui/Toast.tsx`: uses `.app-above-bottom-nav`.
- `src/components/settings/DataManagers.tsx`: filter deleted players from list.
- `src/i18n/{zh,en,ja}.ts`: table remove/win/actions strings.
- Removed: `src/components/record/TableAssignSheet.tsx` (if present in branch).

### Verification

- `npx tsc --noEmit`
- Manual: mobile width ≤767px — drawer aligns with nav, no overlap, tap table cell highlights drawer section.

## 2026-07-03 V3.2 Mobile And Settings Refinement

### Goal

Fix mobile usability issues found after V3.1 and make settings/navigation clearer for daily use.

### Changed Areas

- `src/components/ui/BottomSheet.tsx`: moved sheets higher and used dynamic viewport height.
- `src/components/deck/DeckSearchField.tsx`: hide results until search when requested and remove duplicate leader code subtitles.
- `src/pages/SettingsPage.tsx`: separate language/player/Leader settings, inline About, session switching.
- `src/components/settings/DataManagers.tsx`: player merge moved into player management; Leader management can be shown separately.
- `src/lib/stats.ts`: compact deck names in stats.
- `src/stores/appStore.ts`: added `switchSession`.

### Verification

- Pending final lint/build/audit.
