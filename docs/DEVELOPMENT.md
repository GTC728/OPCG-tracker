# Development

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand
- Dexie / IndexedDB
- Supabase
- read-excel-file
- write-excel-file

## Local Development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
├── components/
│   ├── layout/
│   ├── record/
│   ├── settings/
│   └── ui/
├── data/
├── i18n/
├── lib/
├── pages/
├── stores/
└── types/
```

## Leader Database

The app includes seeded English OPCG leader data from the `buhbbl/punk-records` static dataset.

Update seed data:

```bash
python scripts/generate-leader-decks.py
```

Users can search leaders with values such as `OP01`, `OP-01`, `ST10`, `EB01`, leader names, colors, traits, and local aliases.

## Data Foundation

Schema V4 introduced:

- `Leader`
- `DeckVariant`
- `PlayerAlias`
- `SessionPlayer`
- `SessionDeck`
- `MatchRevision`
- `ImportBatch`
- `ImportRow`

The legacy `decks` view is retained for compatibility while newer code can use `leaders + deckVariants`.

## UI And Layout

- Design preferences (spacing, mobile drawer, table rows, theme tokens): [`docs/UI-DESIGN.md`](UI-DESIGN.md)
- Bottom nav / drawer offsets: `src/lib/layout.ts`, `src/index.css` (`--app-bottom-nav-height`)
