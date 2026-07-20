import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { getChartSliceFill } from '@/lib/deckChartColors'
import { useI18n } from '@/lib/i18n'
import {
  buildMetaTransferChartPoints,
  MIN_WEEKLY_META_MATCHES,
  partitionWeeklyMetaStats,
  type WeeklyDeckMetaStat,
} from '@/lib/stats'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'

export function MetaTransferStackedChart({
  stats,
  compact = false,
  minMatches = MIN_WEEKLY_META_MATCHES,
}: {
  stats: WeeklyDeckMetaStat[]
  compact?: boolean
  minMatches?: number
}) {
  const { t } = useI18n()
  const { points, deckKeys } = buildMetaTransferChartPoints(stats, minMatches)
  if (!points.length) return null

  return (
    <>
      <div className={compact ? 'h-40' : 'h-52'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} stackOffset="expand">
            <CartesianGrid stroke="color-mix(in srgb, white 6%, transparent)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
              width={36}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : 0
                const payload = item?.payload as { total?: number; label?: string } | undefined
                const deckKey = String(item?.dataKey ?? '')
                const deckName =
                  deckKey === '__other__'
                    ? t('stats.metaOther')
                    : deckKeys.find((deck) => deck.key === deckKey)?.name ?? ''
                const share = payload?.total ? Math.round((numeric / payload.total) * 100) : 0
                return [`${share}% · ${numeric} ${t('stats.matchUnitShort')}`, deckName]
              }}
              contentStyle={{
                background: 'color-mix(in srgb, var(--color-surface-elevated) 92%, transparent)',
                border: '1px solid color-mix(in srgb, white 10%, transparent)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            {[...deckKeys].reverse().map((deck, index) => (
              <Area
                key={deck.key}
                type="monotone"
                dataKey={deck.key}
                stackId="meta"
                stroke={getChartSliceFill(deckKeys.length - 1 - index)}
                fill={getChartSliceFill(deckKeys.length - 1 - index)}
                fillOpacity={0.85}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-secondary">
        {deckKeys.map((deck, index) => (
          <li key={deck.key} className="flex items-center gap-1">
            <span
              className="size-2 rounded-full"
              style={{ background: getChartSliceFill(index) }}
            />
            <span className="truncate">
              {deck.key === '__other__' ? t('stats.metaOther') : deck.name}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function MetaTransferChart({
  stats,
  title,
  compact = false,
  minMatches = MIN_WEEKLY_META_MATCHES,
  onOpenDetail,
  showDetailButton = true,
  embedded = false,
}: {
  stats: WeeklyDeckMetaStat[]
  title: string
  compact?: boolean
  minMatches?: number
  onOpenDetail?: () => void
  showDetailButton?: boolean
  embedded?: boolean
}) {
  const { t } = useI18n()
  const hasData = stats.some((week) => week.matchCount > 0)
  if (!hasData) return null

  const { qualified, skipped } = partitionWeeklyMetaStats(stats, minMatches)
  const chartBody = (
    <MetaTransferStackedChart stats={stats} compact={compact} minMatches={minMatches} />
  )

  const hints = (
    <>
      {qualified.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {t('stats.metaTransferNoQualified').replace('{min}', String(minMatches))}
        </p>
      ) : null}
      {skipped.length > 0 ? (
        <p className="text-[10px] text-text-secondary">
          {t('stats.metaTransferSkippedWeeks')
            .replace('{min}', String(minMatches))
            .replace('{n}', String(skipped.length))}
        </p>
      ) : null}
      <p className="text-[10px] text-text-secondary">
        {t('stats.metaTransferHint').replace('{min}', String(minMatches))}
      </p>
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-2">
        {chartBody}
        {hints}
      </div>
    )
  }

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {title ? <h2 className={uiSectionTitle}>{title}</h2> : null}
          <p className="text-xs text-text-secondary">{t('stats.metaTransferLegend')}</p>
        </div>
        {showDetailButton && onOpenDetail ? (
          <Button variant="ghost" className="shrink-0 px-2 py-1 text-xs" onClick={onOpenDetail}>
            {t('stats.metaDetail.open')}
          </Button>
        ) : null}
      </div>
      {qualified.length > 0 ? chartBody : null}
      {hints}
    </section>
  )
}
