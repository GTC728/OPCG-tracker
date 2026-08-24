import type { ReactNode } from 'react'
import { uiPressable } from '@/lib/motion'
import { uiGroupedRow, uiGroupedSection, uiPageEyebrow } from '@/lib/uiSurface'

export function GroupedListSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      {title ? <p className={[uiPageEyebrow, 'px-1 uppercase tracking-wide'].join(' ')}>{title}</p> : null}
      <div className={uiGroupedSection}>{children}</div>
    </section>
  )
}

export function GroupedListRow({
  title,
  description,
  meta,
  onClick,
}: {
  title: string
  description?: string
  meta?: string
  onClick: () => void
}) {
  return (
    <button type="button" className={[uiGroupedRow, uiPressable].join(' ')} onClick={onClick}>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-text-secondary line-clamp-1">{description}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary">
        {meta ? <span className="max-w-[6.5rem] truncate tabular-nums">{meta}</span> : null}
        <span aria-hidden className="text-sm leading-none text-text-secondary">
          ›
        </span>
      </span>
    </button>
  )
}
