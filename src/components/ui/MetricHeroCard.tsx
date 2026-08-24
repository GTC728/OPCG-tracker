import type { ReactNode } from 'react'

export function MetricHeroCard({
  metrics,
  subtitle,
  split = false,
}: {
  metrics: Array<{ label: string; value: ReactNode; detail?: string; accent?: boolean }>
  subtitle?: string
  /** Two-metric layout with center divider (Record / MVP row). */
  split?: boolean
}) {
  if (split && metrics.length === 2) {
    const [left, right] = metrics
    return (
      <article className="ui-metric-hero">
        {subtitle ? <p className="mb-3 text-sm text-text-secondary">{subtitle}</p> : null}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          <MetricCell metric={left} />
          <div className="h-full min-h-[3rem] w-px self-stretch bg-[var(--ui-border)]" />
          <MetricCell metric={right} />
        </div>
      </article>
    )
  }

  return (
    <article className="ui-metric-hero">
      {subtitle ? <p className="mb-3 text-sm text-text-secondary">{subtitle}</p> : null}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))` }}
      >
        {metrics.map((metric) => (
          <MetricCell key={metric.label} metric={metric} />
        ))}
      </div>
    </article>
  )
}

function MetricCell({
  metric,
}: {
  metric: { label: string; value: ReactNode; detail?: string; accent?: boolean }
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
      <p
        className={[
          'mt-1 font-bold tabular-nums tracking-tight',
          typeof metric.value === 'string' && metric.value.length > 8 ? 'text-xl' : 'text-2xl',
          metric.accent ? 'text-brand-400' : '',
        ].join(' ')}
      >
        {metric.value}
      </p>
      {metric.detail ? <p className="mt-0.5 text-[11px] text-text-secondary">{metric.detail}</p> : null}
    </div>
  )
}
