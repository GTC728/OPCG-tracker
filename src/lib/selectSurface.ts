type SelectSurfaceState = 'empty' | 'default' | 'filled' | 'active'

const surfaceBase =
  'border bg-surface transition-colors outline-none touch-manipulation box-border'

export function selectSurfaceClass(state: SelectSurfaceState, className = ''): string {
  const stateClass =
    state === 'active'
      ? 'border-brand-400 bg-brand-600/25 shadow-[inset_0_0_0_1px] shadow-brand-400/60'
      : state === 'filled'
        ? 'border-brand-400/50 bg-brand-500/10'
        : state === 'empty'
          ? 'border-dashed border-surface-muted bg-surface/50'
          : 'border-surface-muted bg-surface'

  return [surfaceBase, stateClass, className].filter(Boolean).join(' ')
}

type SelectChipState = 'default' | 'active'

const chipBase =
  'inline-flex items-center border font-semibold outline-none touch-manipulation box-border transition-colors'

export function selectChipClass(state: SelectChipState, compact = false, className = ''): string {
  const sizeClass = compact
    ? 'min-h-[1.375rem] items-center rounded-md px-1.5 py-0.5 text-[10px] leading-tight'
    : 'rounded-lg px-3 py-1.5 text-sm'
  const stateClass =
    state === 'active'
      ? 'border-brand-400/80 bg-brand-600 text-white shadow-[inset_0_0_0_1px] shadow-white/20'
      : 'border-surface-muted bg-surface text-text-primary'

  return [chipBase, sizeClass, stateClass, className].filter(Boolean).join(' ')
}

export function selectPickerOptionClass(active: boolean, className = ''): string {
  return [
    'flex w-full rounded-xl px-3 py-2.5 text-left text-sm outline-none box-border border transition-colors',
    active
      ? 'border-brand-400/60 bg-brand-600/20 font-semibold text-brand-300 shadow-[inset_0_0_0_1px] shadow-brand-400/50'
      : 'border-transparent bg-surface ring-1 ring-surface-muted',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
