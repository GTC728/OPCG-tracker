/** Shared surface classes — see docs/UI-DESIGN.md */

export const uiCard =
  'rounded-2xl bg-surface-elevated ring-1 ring-white/[0.07] shadow-[0_1px_2px_rgba(0,0,0,0.24)]'

export const uiCardInset = 'rounded-xl bg-surface/60 ring-1 ring-white/[0.05]'

export const uiCardInteractive = [
  uiCard,
  'transition-colors hover:bg-surface-muted/25 active:bg-surface-muted/40',
].join(' ')

export const uiSegment = 'ui-segment'

export function uiSegmentButton(active: boolean): string {
  return ['ui-segment-btn', active ? 'ui-segment-btn--active' : ''].filter(Boolean).join(' ')
}

export const uiListRow =
  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/30 active:bg-surface-muted/45'

export const uiLabel = 'text-xs font-medium text-text-secondary'

export const uiSectionTitle = 'text-base font-semibold text-text-primary'
