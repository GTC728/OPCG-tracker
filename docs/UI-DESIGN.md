# UI Design Preferences

Living document for OPCG Tracker UI decisions: sizing, spacing, color usage, layout patterns, and mobile-first conventions. Update this file whenever we agree on new standards in chat.

**Related code**

- Theme tokens: `src/index.css` (`@theme`)
- Runtime Apple palettes: `src/lib/theme.ts`
- Shared surfaces: `src/lib/uiSurface.ts`
- Desktop scrollbar: `.scrollbar-subtle` in `src/index.css`
- Overlay pager: `src/components/ui/FloatingSidePager.tsx` + `.ui-floating-pager-btn`
- Frosted glass: `.ui-frost` / `.ui-frost-bar` / `.ui-frost-control` in `src/index.css`
- Paginated lists: `src/components/ui/PagedList.tsx`
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
4. **V2-inspired clarity (V3.10.6+)** — Reference OPCG Tracker V2 and modern mobile dashboards: clear hierarchy (title → subtitle → data), card-based grouping, segmented filters instead of heavy button grids, left-aligned labels without excessive uppercase tracking.
5. **Shared surfaces** — Use `src/lib/uiSurface.ts` + `.ui-segment` CSS for cards and toggles; avoid one-off `bg-surface-elevated` without ring/shadow.
6. **Bottom chrome scope** — Assignment drawer registers via `useBottomChromePanel` **only when `activeTab === 'record'`** so hidden Record page does not leak the panel onto Stats/History.
7. **Canonical chrome** — Desktop scrollbars always use `.scrollbar-subtle` (or `ScrollRegion`). Side page arrows always use `FloatingSidePager`. Do not invent one-off arrow columns or OS-default thick scrollbars.
8. **Apple Music / App Store direction (V5.4+)** — Large in-page titles, grouped lists, hero metrics, pill filters, deck-cover rails. Dark `#000` / `#1c1c1e` / `#2c2c2e`; light `#f2f2f7` / `#ffffff` / `#d1d1d6`. Accent is user-chosen; **semantic colors stay fixed** (success/danger, and the blue `1st` badge).
9. **Frosted glass is chrome, not data (V5.5.10+)** — Use `.ui-frost*` on bars, sheets, toasts, and floating controls. Keep match cards, table rows, heatmaps, and rank lists solid.

---

## Visual language (V3.10.6+)

Inspired by V2 (light, airy lists) adapted to our dark theme:

| Pattern | Implementation |
|---------|----------------|
| **Card** | `uiCard` — `rounded-xl`, elevated bg + blur, `ring-white/8%`, subtle shadow |
| **Glass card** | `uiGlassCard` — profile/charts/share hero sections |
| **Interactive card** | `uiCardInteractive` — hover/active tint for list rows & drill-down |
| **Segmented control** | `SegmentedControl` + `.ui-segment` — pill toggle (scope, stats tabs) |
| **Section title** | `uiSectionTitle` — `text-base font-semibold`, no ALL CAPS |
| **Metric label** | `text-xs font-medium text-text-secondary` |
| **Metric value** | `text-2xl font-bold tracking-tight` |

**Code:** `src/lib/uiSurface.ts`, `src/components/ui/SegmentedControl.tsx`, `src/index.css` (`.ui-segment*`)

**Avoid:** stacked uppercase brand labels, flat cards without edge definition, duplicate fixed layers.

---

## Color & Theme

| Token | Usage |
|-------|--------|
| `surface` (`#0b1220`) | Page background |
| `surface-elevated` (`#151f32`) | Cards, drawer, elevated panels |
| `surface-muted` (`#2a3548`) | Borders, dashed empty slots, hover fills |
| `brand-400` / `brand-500` / `brand-600` | Nav active, links, primary actions, selected assignment |
| `text-primary` | Names, primary labels |
| `text-secondary` | Placeholders, VS, secondary hints, metric labels |
| `success` | Win button (`W`) tint |
| `danger` | Clear / remove actions on hover |

Card edges use **`ring` / `--ui-border`** instead of heavy gray borders.

**V4.0+:** Theme is user-configurable via `src/lib/theme.ts` — `dark` / `light` / `system` plus accent presets. CSS variables on `:root` / `[data-theme]` override `@theme` defaults at runtime.

**V5.4+ Apple palettes (runtime, not `@theme` defaults):**

| Mode | page | elevated | muted | text |
|------|------|----------|-------|------|
| Dark | `#000000` | `#1c1c1e` | `#2c2c2e` | `#ffffff` / `#98989d` |
| Light | `#f2f2f7` | `#ffffff` | `#d1d1d6` | `#000000` / `#6c6c70` |

---

## Desktop scrollbar (canonical, V5.5.9.1+)

**Always** `.scrollbar-subtle` on overflow lists, or `ScrollRegion` (which applies the same tokens). Horizontal rails (`.ui-scroll-region-x`) hide the bar on touch and show this bar on mouse/trackpad.

| Token / property | Value |
|------------------|--------|
| Width / height | `4px` (`--ui-scrollbar-size`) |
| Track | transparent |
| Thumb (dark) | `white` at **16%** |
| Thumb hover (dark) | `white` at **32%** |
| Thumb (light) | `black` at **18%** |
| Thumb hover (light) | `black` at **32%** |
| Shape | pill (`border-radius: 999px`) |
| Firefox | `scrollbar-width: thin` |

Do **not** use the default Windows/Chrome thick light scrollbar.

---

## Floating side pager (canonical, V5.5.9+)

**Component:** `FloatingSidePager` — overlay pills, never layout columns (those compress card width).

Used by `PagedList` and Stats player ranking. Parent must be `position: relative`.

| Setting | Value |
|---------|--------|
| Position | `absolute`, vertically centered (`top: 50%` + `translateY(-50%)`) |
| Z-index | `10` |
| Size | `2.25rem` (36px) square |
| Shape | circle (`border-radius: 9999px`) |
| Left / right inset | `0.25rem` (4px) — `--prev` uses `left`, `--next` uses `right` (both required) |
| List inset | Parent list uses `px-11` when arrows are shown so card text is not under the 36px pills |
| Fill | `--ui-frost-fill-control` (elevated **55%** dark / **68%** light) |
| Glyph | white **80%** (dark) / black **70%** (light), `1rem`, semibold, `‹` / `›` |
| Ring | `--ui-frost-ring` (white **14%** dark) |
| Blur | **56px** Gaussian + saturate **1.4** (canonical frost) |
| Shadow | 1px ring only |
| Hover | mix control fill with **12%** white; glyph full white / black |
| Disabled | `opacity: 0.2`, no pointer events |
| Motion | 150ms ease on fill + glyph color |

CSS: `.ui-floating-pager-btn` in `src/index.css` (uses frost control tokens).

---

## Frosted glass (canonical, V5.5.10+)

Apple-style **vibrancy**: translucent fill + Gaussian backdrop blur. CSS `backdrop-filter: blur()` is the web equivalent of iOS `UIBlurEffect` / Android `RenderEffect.createBlurEffect` — that *is* Gaussian blur. Do not add a JS/canvas Gaussian library.

Behind text should read as color wash, not sharp letters. If overlay copy is hard to read, raise `--ui-frost-fill-sheet` (sheets) or `--ui-frost-fill-bar` (chrome) first, then blur.

Do **not** put `transform` / enter animation on the same element (or an ancestor) as `backdrop-filter`. A leftover `transform: none` from `animation-fill-mode: both` still disables blur, so the page shows through as sharp letters. Sheets: frost on `.ui-sheet-frost`, slide the `.ui-sheet-panel-body` sibling.

### Tokens

| Token | Dark | Light |
|-------|------|--------|
| `--ui-frost-blur` | `56px` (Gaussian) | `56px` |
| `--ui-frost-saturate` | `1.4` | `1.4` |
| `--ui-frost-fill` (panels / glass cards) | elevated **78%** | elevated **88%** |
| `--ui-frost-fill-bar` (app header / bottom chrome only) | surface **88%** | elevated **90%** |
| `--ui-frost-fill-sheet` (bottom sheets) | elevated **94%** | elevated **96%** |
| `--ui-frost-fill-control` (pills / overlay buttons) | elevated **55%** | elevated **68%** |
| `--ui-frost-ring` | white **14%** | muted **50%** |

### Classes

| Class | Use |
|-------|-----|
| `.ui-frost` | Toasts and other overlay chips (not sheets) |
| `.ui-sheet-frost` | Bottom sheet glass — title + body, one layer; sibling of animated content |
| `.ui-frost-bar` | Sticky app header and bottom chrome only — **do not nest** inside `.ui-frost` |
| `.ui-frost-control` | Workspace chip, other floating pills |
| `.ui-floating-pager-btn` | Side page arrows (frost control + layout) |
| `.ui-glass-card` | Profile / chart heroes — same blur tokens |
| `.ui-sheet-backdrop` | Dim **50%** black + **20px** blur behind sheets |

`prefers-reduced-transparency: reduce` turns frost into solid `surface-elevated`.

### Where it is applied

- App header (sticky over page scroll)
- Bottom chrome (assignment drawer + nav) — drawer itself is transparent; chrome frosts
- Bottom sheets (workspace, filters, profile panels): **one** `.ui-sheet-frost` layer (94% fill); title row is transparent; slide animation is on the content sibling
- Toasts
- Floating page arrows
- Workspace chip
- Existing glass hero cards (`uiGlassCard`)

### Where it is **not** applied

Record table rows, `MatchRecordCard`, heatmaps, player rank lists, grouped settings rows — those stay solid for contrast at the table.

---

## Match records & profile (V5.5.7–V5.5.9.1, 2026-08-26)

### Shared match card

- `MatchRecordCard` for History, Record recent matches, and Profile.
- Table assignment order by default (player1 left). **When viewing / filtering a player, that player is always on the left** (`perspectivePlayerId` → `resolveMatchRecordSides`).
- Winner: green left bar + `W`; loser: muted + `L`.
- **`1st` badge is always blue** (`#3b82f6` fill/border, `#60a5fa` text) — **not** the accent color (green accent must not turn `1st` green).

### Win–loss text

- Always `nW-nL` (including `0W-0L`).
- UI: `WinLossRecord`; strings: `formatWinLossRecord`.

### Profile hub

| Block | Decision |
|-------|----------|
| Identity | Keep original layout; metrics **場次 → 戰績 → 勝率 → 連勝** |
| Recent form | Continuous W/L color band + 勝率 / 勝 / 敗 |
| Decks | Pie chart **left** of original `DeckPreviewCard`s; cards are the legend |
| Achievements | Unchanged |
| Rivals | Avatar initial + one-line name / `0W-0L` |
| Trends | Unchanged |
| Matches | Preview **3** `MatchRecordCard`s; view-all uses `PagedList` **10 per page** (overlay arrows, page chips, jump input) |

### Pagination

- Reuse `PagedList` (`DEFAULT_PAGE_SIZE = 10`) for any long list that needs paging.
- Side arrows: `FloatingSidePager` only. Bottom: page chips + number input +「前往」.

---

## V4 Glass & Radius (2026-07-07)

### Layering (selective glass — not global)

| Surface | Class / token | Where |
|---------|---------------|--------|
| **Standard card** | `uiCard` — `rounded-xl`, `bg-surface-elevated/88`, `backdrop-blur-xl` | Stats lists, settings rows |
| **Glass hero** | `uiGlassCard` — canonical frost tokens (56px Gaussian / 1.4) | Profile charts, deck pie, trend cards |
| **Inset chip** | `uiCardInset` — `/55` opacity, 12px blur | Profile link sheet options |
| **Record / Table** | Solid surfaces (no frost) | Readability at the table |

**Rule:** Do not apply frost to Record page table rows, match cards, heatmaps, or rank lists. Use `.ui-frost*` for chrome only (V5.5.10).

### Border radius (V4)

| Element | V3.10 | V4 |
|---------|-------|-----|
| Cards | `rounded-2xl` (16px) | `rounded-xl` (12px) |
| Buttons / inputs | `rounded-xl` (12px) | `rounded-lg` (8px) |
| Match rows / share list items | `rounded-xl` | `rounded-lg` |
| Pills (1st/2nd, badges) | — | `rounded-md` (6px) via `uiPill` |
| Segmented shell | `0.875rem` | unchanged |

### Turn order & result badges

- **`FirstPlayerBadge` / `TurnOrderBadge` (1st)**: always blue (`#3b82f6` / `#60a5fa`), independent of accent.
- **`WinLossBadge`**: compact `W` / `L` square badge.
- Use on match record cards, profile lists, and share cards.

### Share export cards

- Fixed layout in `src/components/share/ShareExportSheet.tsx` — export-safe (no interactive blur).
- Trigger: Profile header「輸出」、Stats my-profile「場次卡」.
- PNG via `html-to-image`; Web Share API when available.

### Personal profile UX (V4.1, updated V5.5.8)

- **Hub page**: identity hero + recent form + deck rail (pie + cards) + achievements + rivals + trends + 3 recent matches.
- Detail sheets for overview / decks / achievements / rivals / trends; **matches sheet** uses `PagedList`.
- **Achievements**: one card per achievement family showing `Lv.X/Y`; detail sheet lists all tiers.

### Achievement icons (V4.1)

- Use `AchievementIcon` SVG badges (`src/components/achievements/AchievementIcon.tsx`) — category tint, not emoji-only.
- Emoji acceptable as fallback in toasts only.

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
- **Tap** opens sync controls sheet (`GroupSyncSection`) — V4.12+.
- **Offline:** `bg-warning/10`, neutral copy — local changes still saved.
- **Pending sync:** `bg-brand-500/10`, shows queue count from IndexedDB outbox.
- Do not use red for offline (environmental state, not error).

## Workspace Chip (V4.12+)

- Shown in `AppShell` header next to brand credit — always visible (`本機` or group code).
- Tap opens `WorkspaceHub` bottom sheet (switch workspace, quick links).
- Settings uses **scope-first** layout: **工作區** vs **個人** sections — see `docs/WORKSPACE.md`.

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

Expanded body uses `overflow-y-auto scrollbar-none` with `max-height` cap (`ASSIGNMENT_DRAWER_EXPANDED` = `min(46dvh, 12rem)`) so bottom chip text is never clipped. Chip rows use `items-center` + `min-h-[1.375rem]` on compact chips.

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
| 2026-08-26 | V5.5.11.2: denser sheet frost (94%) on a non-transformed layer so blur works and copy stays readable |
| 2026-08-26 | V5.5.11.1: sheet title shares panel frost (no nested frost-bar); overlay pager `--next` + list inset |
| 2026-08-26 | V5.5.11: frost blur 56px Gaussian + denser fills for overlay readability |
| 2026-08-26 | V5.5.9.x: canonical 4px desktop scrollbar; overlay `FloatingSidePager`; profile/match decisions (0W-0L, player-left, blue 1st, 3+10 paging); Apple Music/App Store palettes restated |
| 2026-07-07 | V4 personal system: glass layering, smaller radius, 1st/2nd badges, theme/accent tokens, share cards |
| 2026-07-07 | V2-inspired visual language; `uiSurface` + `SegmentedControl`; assignment drawer tab-gated + taller body; refined dark tokens |
| 2026-07-05 | Initial preferences from V3.8 mobile assignment drawer + compact table board work |
| 2026-07-05 | Unified BottomChrome; `isListedPlayer` rules; history custom date range + FilterPicker |
