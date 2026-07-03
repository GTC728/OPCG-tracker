# OPCG Tracker Project History

This document records the product and engineering history that happened before formal V3 changelog discipline was introduced. It is intentionally narrative: the goal is to preserve why the project changed, not only what files changed.

## Origin

OPCG Tracker started from a practical need: record One Piece Card Game matches quickly during store play and playtest sessions. The early workflow was based on spreadsheets, but spreadsheets were too slow for live play, easy to mistype, and hard to analyze afterward.

The first product direction was:

- Build a mobile-first match recording app.
- Keep match entry fast enough for real store play.
- Preserve enough structure for future import, export, analytics, and sync.
- Treat player names, deck names, and aliases as first-class data problems.

## V1.0 Core App

V1 created the basic app experience.

### Product Scope

- Record active matches.
- Select two players and two decks.
- Mark winner quickly.
- Undo accidental completion.
- Review completed matches in history.
- Filter historical matches.
- Soft-delete and restore wrong records.
- Show basic win/loss stats.

### Engineering Scope

- React + TypeScript + Vite app shell.
- Tailwind UI.
- Zustand store.
- Local app state persistence.
- Core entities: player, deck, session, active match, completed match, import record.
- Bottom navigation: Record, Stats, History, Settings.

### Outcome

The app became usable as a simple replacement for manual match logging, but the data model and UI still assumed a relatively small local dataset.

## V1.2 UX Polish

V1.2 focused on real player behavior. The main question was: would someone actually use this between games?

### Product Decisions

- Match completion must be one obvious tap.
- Recent pairings should be reusable.
- Stats should not dump everything onto one page.
- Low-value remarks such as tiny sample warnings should be reduced.
- Visual priority matters: important stats can be larger, secondary details should be smaller.

### Features And Improvements

- Quick Mode.
- Large WIN cards.
- Rematch and swap-rematch shortcuts.
- Recent combinations.
- Better Settings Hub direction.
- Stats layering and profile-style thinking.
- Matchup, first/second, player/deck, and recent-form analysis concepts.

### Outcome

The app moved from a simple data-entry tool toward a live play companion.

## V1.3 Data Foundation

V1.3 was the database design pass. The key realization was that long-term compatibility matters more than short-term convenience.

### Problems Addressed

- The same Leader can appear under many local names.
- Deck search needs set code, leader code, leader name, colors, aliases, and old spreadsheet names.
- Player aliases need to survive import and merge workflows.
- Match edits should be traceable.
- Import should preserve enough row-level information to debug bad data later.

### Engineering Decisions

- Add schema versioning.
- Normalize around `Leader` and `DeckVariant`.
- Keep a legacy `Deck` view so existing UI can keep working during migration.
- Add `PlayerAlias`.
- Add `SessionPlayer` and `SessionDeck` placeholders for future session-scoped rosters.
- Add `MatchRevision`.
- Add `ImportBatch` and `ImportRow`.
- Add selector helpers so UI reads through a stable layer.

### Outcome

The app became much more future-proof while still preserving old data compatibility.

## V2.0 Long-Term Use And Cloud Direction

V2 focused on long-term use across phone and desktop.

### Product Decisions

- The app should work as a long-running personal and group tool, not only a local browser toy.
- Local data must be more reliable than plain localStorage.
- Cloud sync should support trusted groups.
- Email login is clearer and safer than anonymous PIN-only sharing.

### Engineering Direction

- Add PWA metadata and service worker for app-shell behavior.
- Move primary persistence to IndexedDB with Dexie.
- Keep localStorage fallback.
- Add Supabase email login.
- Add personal cloud snapshots.
- Add group shared app state.
- Add RLS policies for personal and group data.

### Outcome

OPCG Tracker became usable across devices and ready for group workflows, while still staying offline-first locally.

## V2.1 Product Plan

V2.1 formalized the product proposal and technical specification.

### Covered Areas

- Executive summary.
- Problem statement.
- Target users and use cases.
- Functional requirements.
- Data model.
- UX principles.
- Technical architecture.
- Roadmap.
- Risks and limitations.
- Success metrics.

### Outcome

The plan became the base document for V3 and later development.

## V3 Transition

V3 introduced release discipline and user-facing polish:

- Semantic versioning.
- Changelog.
- English / Chinese / Japanese UI foundation.
- First-run language onboarding.
- Global toast feedback.
- Button loading states.
- Human-readable Excel export.
- Full app-state Excel restore.
- Cleaner Settings layout.
- Cloud/group security hardening.

V3.1 and V3.2 then refined usability around deck search, compact Leader display, settings organization, session switching, and mobile bottom-sheet behavior.

## Current Direction After V3.2

The app now has a stable base for three future product lines:

- Personal match tracking.
- Group playtest data.
- Event and League workflows.

The next major planning question is how to add Store Tournament and League Ruleset modules without contaminating the clean base match database.
