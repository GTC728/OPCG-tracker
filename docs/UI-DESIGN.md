# UI Design Preferences

Living document for OPCG Tracker UI decisions: sizing, spacing, color usage, layout patterns, and mobile-first conventions. Update this file whenever we agree on new standards in chat.

**Related code**

- Theme tokens: `src/index.css` (`@theme`)
- Layout constants: `src/lib/layout.ts`
- App shell / bottom nav: `src/components/layout/AppShell.tsx`
- Mobile assignment drawer: `src/components/record/AssignmentDock.tsx`
- Table rows: `src/components/record/TableBoard.tsx`

---

## Principles

1. **Mobile-first, compact, scannable** — Record page is used standing at a table; minimize vertical scroll and tap targets should stay readable, not oversized.
2. **Align fixed chrome** — Bottom assignment drawer and bottom nav must share the same width model and vertical stacking (drawer sits flush on top of nav, never overlapping tab icons).
3. **Safe-area aware** — Use `env(safe-area-inset-bottom)` for anything fixed above the home indicator (nav, drawer, toasts).
4. **Single source of truth for layout math** — Bottom nav height and offsets live in `src/lib/layout.ts` + CSS variables in `src/index.css`; do not hard-code mismatched `bottom-*` values in individual components.
5. **Bidirectional assignment** — User may pick player/deck in the dock first, then tap a table cell; or tap a table cell first, then pick in the dock. Both flows must show clear highlight state.

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
| Table player/deck inline | `text-[10px]` | Single-line truncate where possible |
| Table slot placeholders | `text-[9px]` | 「玩家」「牌組」 |
| Table number badge | `text-[9px]` in 16×16 badge | Not full 「桌 X」 label |
| VS separator | `text-[8px]` uppercase | Between sides |
| Assignment drawer title | `text-[11px]` font-semibold | Header bar |
| Assignment section labels | `text-[9px]` uppercase | 「玩家」「牌組」 |
| Assignment chips | `text-[10px]` | Horizontal scroll rows |
| Bottom nav labels | `text-[10px]` | Under icon |

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

- Height: **`min-h-11`** (2.75rem / 44px) per tab button — not `min-h-16`.
- Icons: **`text-base`**; labels: **`text-[10px]`**, `gap-0.5`.
- Outer shell: full viewport width, `border-t`, `safe-bottom` padding for home indicator.
- Inner grid: `mx-auto max-w-lg grid-cols-4` (same width constraint as main column).

CSS variable: `--app-bottom-nav-height: 2.75rem`.

---

## Mobile Assignment Drawer (`AssignmentDock` variant=`drawer`)

### Position & width

- Fixed above bottom nav: `bottom: calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom))`.
- **Full-width background** (same as nav bar), content column `mx-auto max-w-lg`.
- **No horizontal inset** (`px-5`) on the drawer shell — that caused left-edge “leak” / misalignment.
- **No `safe-bottom` on the drawer wrapper** — safe area is already in the bottom offset.
- Drawer must **not overlap** bottom nav icons.

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
--app-bottom-nav-height: 2.75rem;

.app-above-bottom-nav {
  bottom: calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom, 0px));
}

.app-main-bottom-pad {
  padding-bottom: calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 1rem);
}
```

TypeScript mirrors: `src/lib/layout.ts` (`BOTTOM_NAV_HEIGHT`, `BOTTOM_NAV_OFFSET`, drawer height constants).

---

## Changelog for this document

| Date | Notes |
|------|--------|
| 2026-07-05 | Initial preferences from V3.8 mobile assignment drawer + compact table board work |
