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
import { formatPercent, type WeeklyWinRateStat } from '@/lib/stats'

export function WeeklyWinRateChart({ stats, title }: { stats: WeeklyWinRateStat[]; title: string }) {
  const chartData = stats.map((item) => ({
    label: item.label,
    winRate: item.total > 0 && item.winRate !== null ? Math.round(item.winRate * 100) : null,
    total: item.total,
  }))

  return (
    <section className={[uiGlassCard, 'space-y-3 p-4'].join(' ')}>
      <div className="flex items-end justify-between gap-2">
        <h2 className={uiSectionTitle}>{title}</h2>
        <p className="text-xs text-text-secondary">無對局週次不顯示數據點</p>
      </div>
      <div className="h-52">
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
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : null
                const payload = item?.payload as { label?: string; total?: number } | undefined
                if (numeric === null) return ['—', payload?.label ?? '']
                return [`${numeric}% · ${payload?.total ?? 0} 場`, payload?.label ?? '']
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
              dataKey="winRate"
              stroke="var(--color-brand-500)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--color-brand-500)' }}
              connectNulls={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-secondary">
        最近 {stats.length} 週 · 有對局週次才顯示勝率點，空週保留走勢線但不落點。
      </p>
    </section>
  )
}

export function WinStreakSummary({
  currentStreak,
  longestStreak,
  currentType,
}: {
  currentStreak: number
  longestStreak: number
  currentType: 'win' | 'loss' | 'none'
}) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <article className={[uiGlassCard, 'p-3'].join(' ')}>
        <p className="text-xs font-medium text-text-secondary">目前連勝</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">
          {currentType === 'win' ? currentStreak : '—'}
        </p>
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
