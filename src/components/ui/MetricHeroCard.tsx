import type { ReactNode } from 'react'

export function MetricHeroCard({
  metrics,
}: {
  metrics: Array<{ label: string; value: ReactNode; accent?: boolean }>
}) {
  return (
    <article className="ui-metric-hero">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 3)}, minmax(0, 1fr))` }}
      >
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
            <p
              className={[
                'mt-1 text-2xl font-bold tabular-nums tracking-tight',
                metric.accent ? 'text-brand-400' : '',
              ].join(' ')}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}
