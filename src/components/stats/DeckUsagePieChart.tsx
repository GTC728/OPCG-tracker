import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ColorDots } from '@/components/deck/ColorDots'
import { getDeckSliceFill, summarizeColorPreference } from '@/lib/deckChartColors'
import { uiGlassCard, uiLabel, uiSectionTitle } from '@/lib/uiSurface'
import { useI18n } from '@/lib/i18n'
import type { DeckUsageSlice } from '@/lib/stats'

function DeckSliceLegend({
  slices,
  compact = false,
}: {
  slices: DeckUsageSlice[]
  compact?: boolean
}) {
  return (
    <ul className={compact ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2' : 'space-y-2'}>
      {slices.map((slice, index) => (
        <li
          key={slice.deckId}
          className={[
            'flex items-center gap-2',
            compact ? 'rounded-md bg-surface/35 px-2 py-1 text-[11px]' : 'text-sm',
          ].join(' ')}
        >
          <span
            className={['shrink-0 rounded-full ring-2 ring-white/15', compact ? 'size-2.5' : 'size-3'].join(' ')}
            style={{ background: getDeckSliceFill(slice, index, slices) }}
          />
          <ColorDots colors={slice.colors} />
          <span className="min-w-0 truncate font-medium">{slice.deckName}</span>
          <span className="ml-auto shrink-0 tabular-nums text-text-secondary">
            {slice.count} · {Math.round(slice.percentage * 100)}%
          </span>
        </li>
      ))}
    </ul>
  )
}

export function DeckUsagePieChart({
  slices,
  title,
  compact = false,
}: {
  slices: DeckUsageSlice[]
  title: string
  compact?: boolean
}) {
  const { t } = useI18n()
  if (!slices.length) return null

  const colorPref = summarizeColorPreference(slices)
  const chartData = slices.map((slice, index) => ({
    name: slice.deckName,
    value: slice.count,
    fill: getDeckSliceFill(slice, index, slices),
    deckId: slice.deckId,
  }))

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      <h2 className={uiSectionTitle}>{title}</h2>

      {!compact && colorPref.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {colorPref.map((item) => (
            <span
              key={item.color}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface/50 px-2 py-1 text-[10px] ring-1 ring-white/[0.06]"
            >
              <ColorDots colors={[item.color]} />
              <span className="text-text-secondary">{Math.round(item.pct * 100)}%</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className={compact ? 'h-36' : 'h-48'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 34 : 42}
              outerRadius={compact ? 54 : 68}
              paddingAngle={2}
              stroke="color-mix(in srgb, var(--color-surface) 40%, transparent)"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.deckId} fill={getDeckSliceFill(slices[index], index, slices)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : 0
                const total = slices.reduce((sum, slice) => sum + slice.count, 0)
                const payload = item?.payload as { name?: string } | undefined
                return [`${numeric} (${Math.round((numeric / total) * 100)}%)`, payload?.name ?? '']
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

      <DeckSliceLegend slices={slices} compact={compact} />
      {!compact ? <p className={uiLabel}>{t('stats.deckColorHint')}</p> : null}
    </section>
  )
}
