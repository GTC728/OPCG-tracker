import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ColorDots } from '@/components/deck/ColorDots'
import { getOpcgColorFill, summarizeColorPreference } from '@/lib/deckChartColors'
import { useI18n } from '@/lib/i18n'
import type { DeckUsageSlice } from '@/lib/stats'
import { uiGlassCard, uiLabel, uiSectionTitle } from '@/lib/uiSurface'

function colorLabel(color: string, t: (key: import('@/lib/i18n').TranslationKey) => string): string {
  const key = `stats.colorName.${color}` as import('@/lib/i18n').TranslationKey
  const translated = t(key)
  return translated !== key ? translated : color
}

export function ColorMetaPieChart({
  deckUsageSlices,
  title,
  compact = false,
}: {
  deckUsageSlices: DeckUsageSlice[]
  title: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const colorPref = summarizeColorPreference(deckUsageSlices)
  if (colorPref.length < 1) return null

  const chartData = colorPref.map((item) => ({
    name: colorLabel(item.color, t),
    colorKey: item.color,
    value: item.count,
    fill: getOpcgColorFill(item.color),
    pct: item.pct,
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      {!compact ? <h2 className={uiSectionTitle}>{title}</h2> : null}
      {compact ? <p className="text-xs font-semibold text-text-primary">{title}</p> : null}

      <div className={compact ? 'h-28' : 'h-44'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 26 : 40}
              outerRadius={compact ? 42 : 64}
              paddingAngle={1}
              stroke="color-mix(in srgb, var(--color-surface) 40%, transparent)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.colorKey} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : 0
                const payload = item?.payload as { name?: string; pct?: number } | undefined
                return [
                  `${numeric.toFixed(1)} (${Math.round((payload?.pct ?? 0) * 100)}%)`,
                  payload?.name ?? '',
                ]
              }}
              contentStyle={{
                background: 'color-mix(in srgb, var(--color-surface-elevated) 92%, transparent)',
                border: '1px solid color-mix(in srgb, white 10%, transparent)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-3'}>
        {chartData.map((item) => (
          <li
            key={item.colorKey}
            className={[
              'flex items-center gap-1.5',
              compact ? 'rounded-md bg-surface/50 px-2 py-1 text-[10px] ring-1 ring-white/[0.06]' : 'text-sm',
            ].join(' ')}
          >
            <span
              className="size-2.5 shrink-0 rounded-full ring-1 ring-white/20"
              style={{ background: item.fill }}
            />
            <ColorDots colors={[item.colorKey]} size="sm" />
            <span className="min-w-0 truncate font-medium">{item.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-text-secondary">
              {Math.round(item.pct * 100)}%
            </span>
          </li>
        ))}
      </ul>

      {!compact ? (
        <p className={uiLabel}>{t('stats.colorMetaPieHint')}</p>
      ) : total > 0 ? (
        <p className="text-[9px] text-text-secondary">{t('stats.colorMetaPieHintShort')}</p>
      ) : null}
    </section>
  )
}
