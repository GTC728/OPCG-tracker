import { playInteractionSound, uiPressable } from '@/lib/motion'
import { uiLink, uiSectionTitle } from '@/lib/uiSurface'

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  meta,
}: {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
  meta?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h3 className={uiSectionTitle}>{title}</h3>
        {action && onAction ? (
          <button
            type="button"
            className={[uiLink, uiPressable, 'shrink-0 text-sm font-semibold'].join(' ')}
            onClick={() => {
              playInteractionSound('tap')
              onAction()
            }}
          >
            {action} ›
          </button>
        ) : meta ? (
          <span className="shrink-0 text-xs tabular-nums text-text-secondary">{meta}</span>
        ) : null}
      </div>
      {subtitle ? <p className="px-0.5 text-xs text-text-secondary">{subtitle}</p> : null}
    </div>
  )
}
