import { uiPressable } from '@/lib/motion'

export function RankListRow({
  rank,
  title,
  subtitle,
  highlighted = false,
  onClick,
}: {
  rank?: number
  title: string
  subtitle?: string
  highlighted?: boolean
  onClick?: () => void
}) {
  const row = (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5',
        highlighted ? 'bg-surface-elevated ring-1 ring-[var(--ui-border)]' : 'bg-[var(--glass-inset-bg)]',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {rank !== undefined ? (
          <span className="w-5 shrink-0 text-sm font-bold tabular-nums text-text-secondary">{rank}</span>
        ) : null}
        <span className="truncate text-sm font-semibold">{title}</span>
      </div>
      {subtitle ? <span className="shrink-0 text-xs tabular-nums text-text-secondary">{subtitle}</span> : null}
    </div>
  )

  if (!onClick) return row

  return (
    <button type="button" className={[uiPressable, 'block w-full text-left'].join(' ')} onClick={onClick}>
      {row}
    </button>
  )
}
