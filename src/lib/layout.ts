/** Matches BottomNav `min-h-11` (2.75rem). Keep in sync with AppShell. */
export const BOTTOM_NAV_HEIGHT = '2.75rem'

/** Fixed elements that sit flush above the bottom nav (includes safe-area). */
export const BOTTOM_NAV_OFFSET = `calc(${BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px))`

/** Drawer header bar height. */
export const ASSIGNMENT_DRAWER_HEADER = '2.125rem'

/** Expanded drawer body cap — fits 3 compact rows without clipping chip text. */
export const ASSIGNMENT_DRAWER_EXPANDED = 'min(46dvh, 12rem)'

export const ASSIGNMENT_DRAWER_HEIGHT = (expanded: boolean) =>
  expanded ? ASSIGNMENT_DRAWER_EXPANDED : ASSIGNMENT_DRAWER_HEADER
