import { playInteractionSound, uiPressable } from '@/lib/motion'
import { uiLink, uiSectionTitle } from '@/lib/uiSurface'

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
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
      ) : null}
    </div>
  )
}
