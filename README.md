# OPCG Tracker

**Live Demo:** [https://opcg-tracker-v2.pages.dev](https://opcg-tracker-v2.pages.dev)

**V3.8**: mobile assignment drawer above bottom nav, bidirectional table assign, compact single-row complete tables, UI design preferences doc ([`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)).

Language versions:

- English: [`README.md`](README.md)
- 繁體中文: [`README.zh-HK.md`](README.zh-HK.md)
- 日本語: [`README.ja.md`](README.ja.md)

OPCG Tracker helps players and small playtest groups record matches, manage players and Leaders, analyze results, import old spreadsheets, export durable Excel backups, and share one dataset across phone and desktop.

## What It Is For

- Record OPCG matches quickly during store play, testing sessions, or pre-event practice.
- Track player records, Leader records, first/second performance, recent form, and matchup data.
- Keep data usable long term through IndexedDB, Excel backup/restore, and optional Supabase cloud sync.
- Share data inside a trusted group using email login and group codes.

## First Use

1. Open the app.
2. Choose a language. New users default to English and can change it later in `Settings`.
3. To share data between phone and desktop, go to `Cloud & Group`, sign in by email, and join a group code.
4. Go to `Settings`.
5. Open `Players`.
6. Add at least two players.
7. Return to `Record`.
8. Tap `+ New Match`.
9. Select two players and two Leaders/decks.
10. When the match ends, tap the winner.
11. Use `Stats` for analysis or `History` to fix previous matches.

## Main Features

- `Record`: create active matches, choose players and Leaders, set first player, and record the winner.
- `Stats`: review win rates, first/second results, player profiles, deck profiles, matchup data, and recent form.
- `History`: search, filter, edit, copy, soft-delete, and restore completed matches.
- `Settings`: manage players, Leader aliases, language, sessions, Excel tools, cloud backup, and group sharing.

## Excel Import

1. Go to `Settings -> Import / Export`.
2. Choose an `.xlsx`, `.xls`, or `.csv` file.
3. For normal spreadsheets, map fields such as Player A, Deck A, Player B, Deck B, winner, and first player.
4. Preview the mapped rows.
5. Confirm import.

OPCG Tracker also detects its own Excel export format and can restore the full app state after confirmation.

## Excel Export

1. Go to `Settings -> Import / Export`.
2. Tap `Export Excel`.
3. The workbook contains:
   - Human-readable sheets such as `README` and `對局總表`.
   - Machine-readable sheets such as `_meta`, `matches`, and `_app_state_json`.

The `_app_state_json` sheet is the safest long-term restore path.

## Cloud And Group Sharing

1. Go to `Settings -> Cloud & Group`.
2. Enter your email and open the magic link.
3. Enter a group code with at least 8 characters.
4. Group members can upload or download the shared group dataset.

Group codes are invite secrets. Share them only with trusted people.

## Project Direction

Current priorities are personal match tracking, playtest group sharing, durable backups, and useful analytics. Future planning includes:

- Store tournament mode for small Swiss events.
- League/ruleset mode for long-running custom scoring systems.
- Better public/shareable reports for store events and meta analysis.

See [`docs/EVENTS-AND-LEAGUES.md`](docs/EVENTS-AND-LEAGUES.md) for the current design blueprint.

## Documentation

- User guide: [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md)
- Development: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- Cloud sync setup: [`docs/CLOUD-SYNC.md`](docs/CLOUD-SYNC.md)
- Excel format: [`docs/EXCEL-FORMAT.md`](docs/EXCEL-FORMAT.md)
- Git workflow: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md)
- UI design preferences: [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
- Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Project history: [`docs/PROJECT-HISTORY.md`](docs/PROJECT-HISTORY.md)
- Engineering log: [`docs/ENGINEERING-LOG.md`](docs/ENGINEERING-LOG.md)
- Product plan: [`docs/OPCG-Tracker-Product-Plan-V2.1.md`](docs/OPCG-Tracker-Product-Plan-V2.1.md)
- Event and League blueprint: [`docs/EVENTS-AND-LEAGUES.md`](docs/EVENTS-AND-LEAGUES.md)
