import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getChartSliceFill } from '@/lib/deckChartColors'
import { useI18n } from '@/lib/i18n'
import {
  buildMetaTransferChartPoints,
  type WeeklyDeckMetaStat,
} from '@/lib/stats'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'

export function MetaTransferChart({
  stats,
  title,
  compact = false,
}: {
  stats: WeeklyDeckMetaStat[]
  title: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const hasData = stats.some((week) => week.total > 0)
  if (!hasData) return null

  const { points, deckKeys } = buildMetaTransferChartPoints(stats)

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      <div className="flex items-end justify-between gap-2">
        <h2 className={uiSectionTitle}>{title}</h2>
        <p className="text-xs text-text-secondary">{t('stats.metaTransferLegend')}</p>
      </div>
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
      <p className="text-[10px] text-text-secondary">{t('stats.metaTransferHint')}</p>
    </section>
  )
}
