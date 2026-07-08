import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import { buildWeeklyWinRateChartPoints, formatPercent, type WeeklyWinRateStat } from '@/lib/stats'
import { useI18n } from '@/lib/i18n'

export function WeeklyWinRateChart({
  stats,
  title,
  compact = false,
}: {
  stats: WeeklyWinRateStat[]
  title: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const chartData = buildWeeklyWinRateChartPoints(stats)

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      <div className="flex items-end justify-between gap-2">
        <h2 className={uiSectionTitle}>{title}</h2>
        {!compact ? (
          <p className="text-xs text-text-secondary">{t('stats.weeklyWinRateLegend')}</p>
        ) : null}
      </div>
      <div className={compact ? 'h-36' : 'h-52'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="color-mix(in srgb, white 6%, transparent)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickFormatter={(value) => `${value}%`}
              width={36}
            />
            <Tooltip
              formatter={(value, name, item) => {
                const numeric = typeof value === 'number' ? value : null
                const payload = item?.payload as
                  | { label?: string; total?: number; cumulativeWinRate?: number | null }
                  | undefined
                if (numeric === null) return ['—', payload?.label ?? '']
                if (name === 'cumulativeWinRate') {
                  return [`${numeric}% · ${t('stats.weeklyWinRateTrend')}`, payload?.label ?? '']
                }
                return [`${numeric}% · ${payload?.total ?? 0} ${t('stats.matchUnitShort')}`, payload?.label ?? '']
              }}
              contentStyle={{
                background: 'color-mix(in srgb, var(--color-surface-elevated) 92%, transparent)',
                border: '1px solid color-mix(in srgb, white 10%, transparent)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulativeWinRate"
              stroke="color-mix(in srgb, var(--color-text-secondary) 70%, transparent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="weeklyWinRate"
              stroke="var(--color-brand-500)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-brand-500)' }}
              connectNulls={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-secondary">{t('stats.weeklyWinRateHint')}</p>
    </section>
  )
}

export function WinStreakSummary({
  currentStreak,
  longestStreak,
  currentLossStreak = 0,
  currentType,
}: {
  currentStreak: number
  longestStreak: number
  currentLossStreak?: number
  currentType: 'win' | 'loss' | 'none'
}) {
  const currentLabel =
    currentType === 'win' && currentStreak > 0
      ? String(currentStreak)
      : currentType === 'loss' && currentLossStreak > 0
        ? `${currentLossStreak}連敗`
        : '0'

  return (
    <section className="grid grid-cols-2 gap-3">
      <article className={[uiGlassCard, 'p-3'].join(' ')}>
        <p className="text-xs font-medium text-text-secondary">目前連勝</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{currentLabel}</p>
      </article>
      <article className={[uiGlassCard, 'p-3'].join(' ')}>
        <p className="text-xs font-medium text-text-secondary">最高連勝</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{longestStreak || '—'}</p>
      </article>
    </section>
  )
}

export function formatWeeklySummary(stats: WeeklyWinRateStat[]): string {
  const played = stats.filter((item) => item.total > 0)
  if (!played.length) return '—'
  const avg =
    played.reduce((sum, item) => sum + (item.winRate ?? 0), 0) / Math.max(played.length, 1)
  return formatPercent(avg)
}
