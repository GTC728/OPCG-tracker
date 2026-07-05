# UI Design Preferences

Living document for OPCG Tracker UI decisions: sizing, spacing, color usage, layout patterns, and mobile-first conventions. Update this file whenever we agree on new standards in chat.

**Related code**

- Theme tokens: `src/index.css` (`@theme`)
- Layout constants: `src/lib/layout.ts`
- App shell / bottom nav: `src/components/layout/AppShell.tsx`
- Sync status banner: `src/components/layout/SyncStatusBanner.tsx`
- Mobile assignment drawer: `src/components/record/AssignmentDock.tsx`
- Table rows: `src/components/record/TableBoard.tsx`

---

## Principles

1. **Mobile-first, compact, scannable** — Record page is used standing at a table; minimize vertical scroll and tap targets should stay readable, not oversized.
2. **Unified bottom chrome** — On mobile Record, assignment drawer and bottom nav live in one `BottomChromeShell` (drawer stacked directly above nav in DOM). Height is measured via `ResizeObserver` → `--bottom-chrome-height`. Do not use separate fixed `bottom-*` offsets for drawer vs nav.
3. **Safe-area aware** — `safe-bottom` on the chrome shell only; main padding uses `--bottom-chrome-height`.

---

## Color & Theme

| Token | Usage |
|-------|--------|
| `surface` (`#0f172a`) | Page background |
| `surface-elevated` (`#1e293b`) | Cards, drawer, elevated panels |
| `surface-muted` (`#334155`) | Borders, dashed empty slots |
| `brand-500` / `brand-600` | Primary actions, selected assignment, table highlight |
| `text-primary` | Names, primary labels |
| `text-secondary` | Placeholders, VS, secondary hints |
| `success` | Win button (`W`) tint |
| `danger` | Clear / remove actions on hover |

Dark theme only for now. Avoid introducing light-mode-specific colors until we explicitly plan dual themes.

---

## Typography (compact / mobile Record)

| Element | Size | Notes |
|---------|------|--------|
| Table player/deck inline | `text-[10px]` | Prefer `[overflow-wrap:anywhere]` over hard truncate for deck names |
| Table slot placeholders | `text-[9px]` | 「玩家」「牌組」 |
| Table number badge | `text-[9px]` in 16×16 badge | Not full 「桌 X」 label |
| VS separator | `text-[8px]` uppercase | Between sides |
| Assignment drawer title | `text-[11px]` font-semibold | Header bar |
| Assignment section labels | `text-[9px]` uppercase | 「玩家」「牌組」 |
| Assignment chips | `text-[10px]` | Horizontal scroll rows |
| Bottom nav labels | `text-[9px]` | Under SVG icon (V3.10+) |

---

## Sync Status Banner (V3.10+)

- Shown below sticky header when user is in a group (`lastGroupCode`).
- **Offline:** `bg-warning/10`, neutral copy — local changes still saved.
- **Pending sync:** `bg-brand-500/10`, shows queue count from IndexedDB outbox.
- Do not use red for offline (environmental state, not error).

---

## Spacing

| Pattern | Value | Where |
|---------|-------|--------|
| Main content horizontal padding | `px-5` (20px) | `AppShell` main |
| Compact assignment row padding | `px-2.5` (10px) | Drawer player/deck title rows |
| Compact assignment row gap | `gap-2.5` (10px) | Between label and chips / search |
| Table row internal gap | `gap-0.5` ~ `gap-1` | TableBoard cells |
| Table list vertical spacing | `space-y-2` | Between table rows |

When the user says **「px10」** in chat, use Tailwind **`px-2.5`** / **`gap-2.5`** (10px).

---

## Bottom Navigation

- Height: **`min-h-9`** per tab button (V3.10; was `min-h-11`).
- Icons: inline **SVG** 16×16 (`h-4 w-4`); no emoji.
- Labels: **`text-[9px]`**, `gap-0.5`.
- Outer shell: full viewport width, `border-t`, `safe-bottom` padding for home indicator.
- Inner grid: `mx-auto max-w-lg grid-cols-4` (same width constraint as main column).

CSS variable: `--app-bottom-nav-height` — measured via `BottomChromeShell` `ResizeObserver` (prefer over fixed rem).

---

## Mobile Assignment Drawer (`AssignmentDock` variant=`drawer`)

### Position (unified bottom chrome)

- Renders inside `BottomChromeShell` via `useBottomChromePanel` — **stacked directly above nav** in the same fixed container (not a second fixed layer).
- Shell: `src/components/layout/BottomChrome.tsx`; nav in `AppShell.tsx`.
- `--bottom-chrome-height` updated by `ResizeObserver` on the shell; main padding and toasts use this variable.
- Full-width shell, inner `max-w-lg`, `safe-bottom` on shell only.

### Header

- Collapsed height: **2.125rem** (`ASSIGNMENT_DRAWER_HEADER`).
- Shows title + summary (pending target, selected player/deck, or player count).
- Cancel clears both `pendingAssignment` and `pendingTableTarget`.
- Expand/collapse toggle: ▲ / ▼.

### Body layout (compact)

Stacked sections, **not** two-column grid:

1. **Row 1 — Players:** label and player chips **on one line** (`flex`, `px-2.5`, `gap-2.5`); chips in horizontal scroll.
2. **Row 2 — Decks:** label and search input **on one line** (same 10px spacing).
3. **Row 3 — Recent decks:** **independent row**; horizontal scroll chip strip only.

No vertical scrollbar in drawer body — use `overflow-hidden` and sized `max-height` (`ASSIGNMENT_DRAWER_EXPANDED`).

### Highlight when table slot tapped

- `pendingTableTarget.field === 'player'` → player section gets `ring-2 ring-brand-400` + light brand background.
- `pendingTableTarget.field === 'deck'` → deck section (title+search block) gets same treatment.
- Tapping a chip while target is active applies assignment to that slot.

---

## Table Board (`TableBoard`)

### Incomplete table row

Layout: **`[#][player][deck] vs [player][deck][×]`** — players and decks alternate per side (not grouped all-players-left).

- Empty cells: dashed border, placeholder 「玩家」/「牌組」.
- Active target cell: `border-2 border-brand-400` + brand tint.
- **× always visible** on incomplete rows (layout consistency):
  - Has match data → clear match.
  - Empty table at **last slot** → decrement table count.
  - Empty table not last → toast 「只能從最後一桌移除空桌」.

### Complete table row

Single compact row: **`# | left name·deck | W vs W | right name·deck | ⋯`**

- Win buttons label: **`W`** in all locales (not translated win text).
- Secondary actions (roll, first player A/B, edit, clear) in **⋯** bottom sheet — not inline.

### Table count

- `MAX_TABLE_COUNT = 32`.
- ± controls in table header.

---

## Win Button

- Always display **`W`** (all languages).
- Size: ~20×20px (`h-5 w-5`), `text-[9px]` bold, success-tinted border/background.

---

## Fixed Element Offsets (reference)

```css
--bottom-chrome-height: measured by ResizeObserver on BottomChromeShell;

.app-main-bottom-pad {
  padding-bottom: calc(var(--bottom-chrome-height, 4.5rem) + 1rem);
}

.app-above-bottom-chrome {
  bottom: calc(var(--bottom-chrome-height, 4.5rem) + 0.5rem);
}
```

Legacy nav-only constants remain in `src/lib/layout.ts` for drawer body height caps.

## Player listing (`entityVisibility.ts`)

| Helper | Use |
|--------|-----|
| `isVisibleMatch` | Not tombstoned — counts toward stats, history, filters |
| `isListedPlayer` | Shown in assignment, history player filter, settings player count |
| `getListedPlayers` | Filter lists; roster mode vs session-activity mode |
| `isSelectablePlayer` | Not deleted/archived — used when **building** roster in SessionRosterSheet |

**Listed rules:** tombstoned players never listed. Explicit session roster → roster members only (0 visible matches OK for first game). No roster → need ≥1 visible match in session (global if no sessionId).

TypeScript drawer height caps: `src/lib/layout.ts` (`ASSIGNMENT_DRAWER_HEADER`, `ASSIGNMENT_DRAWER_EXPANDED`).

---

## Changelog for this document

| Date | Notes |
|------|--------|
| 2026-07-05 | Initial preferences from V3.8 mobile assignment drawer + compact table board work |
| 2026-07-05 | Unified BottomChrome; `isListedPlayer` rules; history custom date range + FilterPicker |
