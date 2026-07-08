import { uiGlassCard, uiHorizontalRailItem } from '@/lib/uiSurface'
import { uiPopIn, uiPressable } from '@/lib/motion'

export function ProfilePreviewCard({
  label,
  value,
  detail,
  onClick,
}: {
  label: string
  value: string
  detail?: string
  onClick?: () => void
}) {
  const card = (
    <article
      className={[uiGlassCard, uiPopIn, 'flex h-full flex-col overflow-hidden p-3 text-left'].join(' ')}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1.5 line-clamp-1 text-lg font-bold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-secondary">{detail}</p> : null}
    </article>
  )

  if (!onClick) {
    return <div className={uiHorizontalRailItem}>{card}</div>
  }

  return (
    <button type="button" className={[uiHorizontalRailItem, 'block h-full', uiPressable].join(' ')} onClick={onClick}>
      {card}
    </button>
  )
}
