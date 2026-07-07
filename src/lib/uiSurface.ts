/** Shared surface classes — see docs/UI-DESIGN.md */

export const uiCard =
  'rounded-xl bg-surface-elevated/88 backdrop-blur-xl ring-1 ring-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.18)]'

export const uiGlassCard =
  'rounded-xl bg-surface-elevated/72 backdrop-blur-2xl ring-1 ring-white/[0.1] shadow-[0_12px_32px_rgba(0,0,0,0.22)]'

export const uiCardInset = 'rounded-lg bg-surface/55 backdrop-blur-md ring-1 ring-white/[0.06]'

export const uiCardInteractive = [
  uiCard,
  'transition-colors hover:bg-surface-muted/20 active:bg-surface-muted/35',
].join(' ')

export const uiSegment = 'ui-segment'

export function uiSegmentButton(active: boolean): string {
  return ['ui-segment-btn', active ? 'ui-segment-btn--active' : ''].filter(Boolean).join(' ')
}

export const uiListRow =
  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/25 active:bg-surface-muted/40'

export const uiLabel = 'text-xs font-medium text-text-secondary'

export const uiSectionTitle = 'text-base font-semibold text-text-primary'

export const uiPill =
  'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'
