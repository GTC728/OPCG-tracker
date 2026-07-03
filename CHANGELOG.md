# Changelog

All notable changes to OPCG Tracker are recorded here.

Format:

- `New`: new user-facing features.
- `Changed`: behavior, UI, data format, or documentation changes.
- `Fixed`: bug fixes and reliability improvements.
- `Security`: security, privacy, or data-protection changes.

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
