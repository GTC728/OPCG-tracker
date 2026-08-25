import { uiGlassCard, uiHorizontalRailItem } from '@/lib/uiSurface'
import { uiPopIn, uiPressable } from '@/lib/motion'
import type { ReactNode } from 'react'

export function ProfilePreviewCard({
  label,
  value,
  detail,
  onClick,
  layout = 'stack',
}: {
  label: string
  value: ReactNode
  detail?: string
  onClick?: () => void
  layout?: 'stack' | 'avatar'
}) {
  const initial = Array.from(label)[0] ?? '?'

  const card =
    layout === 'avatar' ? (
      <article
        className={[uiGlassCard, uiPopIn, 'flex h-full items-center gap-2.5 overflow-hidden p-2.5 text-left'].join(' ')}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm font-bold">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-text-secondary">
            {value}
            {detail ? ` · ${detail}` : ''}
          </p>
        </div>
      </article>
    ) : (
      <article
        className={[uiGlassCard, uiPopIn, 'flex h-full flex-col overflow-hidden p-3 text-left'].join(' ')}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-1.5 line-clamp-1 text-lg font-bold tracking-tight">{value}</p>
        {detail ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-secondary">{detail}</p> : null}
      </article>
    )

  const wrapClass = layout === 'avatar' ? 'w-[10.75rem] shrink-0 snap-start' : uiHorizontalRailItem

  if (!onClick) {
    return <div className={wrapClass}>{card}</div>
  }

  return (
    <button type="button" className={[wrapClass, 'block h-full', uiPressable].join(' ')} onClick={onClick}>
      {card}
    </button>
  )
}
