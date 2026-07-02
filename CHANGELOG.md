# Changelog

All notable changes to OPCG Tracker are recorded here.

Format:

- `New`: new user-facing features.
- `Changed`: behavior, UI, data format, or documentation changes.
- `Fixed`: bug fixes and reliability improvements.
- `Security`: security, privacy, or data-protection changes.

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
