import { playInteractionSound, uiPressable } from '@/lib/motion'
import { uiMetricHero } from '@/lib/uiSurface'

export function WorkspaceHeroCard({
  title,
  subtitle,
  pillLabel,
  onClick,
}: {
  title: string
  subtitle: string
  pillLabel?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-base font-semibold">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
      {pillLabel ? (
        <span className="shrink-0 rounded-full bg-brand-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
          {pillLabel}
        </span>
      ) : null}
    </>
  )

  if (!onClick) {
    return (
      <div className={[uiMetricHero, 'flex items-center justify-between gap-3'].join(' ')}>{content}</div>
    )
  }

  return (
    <button
      type="button"
      className={[uiMetricHero, uiPressable, 'flex w-full items-center justify-between gap-3'].join(' ')}
      onClick={() => {
        playInteractionSound('tap')
        onClick()
      }}
    >
      {content}
    </button>
  )
}
