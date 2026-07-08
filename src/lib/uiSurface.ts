/** Shared surface classes — see docs/UI-DESIGN.md */

import { uiPressable } from '@/lib/motion'

export const uiCard = 'ui-card rounded-xl'
export const uiGlassCard = 'ui-glass-card rounded-xl'
export const uiCardInset = 'ui-card-inset rounded-lg'

export const uiCardInteractive = [uiCard, uiPressable, 'ui-card-interactive'].join(' ')

export const uiSegment = 'ui-segment'

export function uiSegmentButton(active: boolean): string {
  return ['ui-segment-btn', uiPressable, active ? 'ui-segment-btn--active' : ''].filter(Boolean).join(' ')
}

export const uiListRow = [
  'ui-list-row flex w-full items-center gap-3 px-3 py-2.5 text-left',
  uiPressable,
].join(' ')

export const uiLabel = 'text-xs font-medium text-text-secondary'

export const uiSectionTitle = 'text-base font-semibold text-text-primary'

export const uiPill =
  'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'

export const uiBorder = 'border border-[var(--ui-border)]'

export const uiHeaderBar = 'ui-header-bar sticky top-0 z-20 border-b px-5 py-3.5 backdrop-blur-md'

export const uiBottomNav = 'ui-bottom-nav border-t backdrop-blur-md'
