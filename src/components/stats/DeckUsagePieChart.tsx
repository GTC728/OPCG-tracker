import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ColorDots } from '@/components/deck/ColorDots'
import { getChartSliceFill, summarizeColorPreference } from '@/lib/deckChartColors'
import { uiGlassCard, uiLabel, uiSectionTitle } from '@/lib/uiSurface'
import { useI18n } from '@/lib/i18n'
import type { DeckUsageSlice } from '@/lib/stats'

const PREVIEW_SLICE_LIMIT = 5

function collapseUsageSlices(slices: DeckUsageSlice[], limit: number): DeckUsageSlice[] {
  if (slices.length <= limit) return slices
  const head = slices.slice(0, limit - 1)
  const tail = slices.slice(limit - 1)
  const otherCount = tail.reduce((sum, slice) => sum + slice.count, 0)
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  return [
    ...head,
    {
      deckId: '__other__',
      deckName: '…',
      count: otherCount,
      percentage: total ? otherCount / total : 0,
      colors: ['Black'],
    },
  ]
}

function DeckSliceLegend({ slices }: { slices: DeckUsageSlice[] }) {
  return (
    <ul className="space-y-2">
      {slices.map((slice, index) => (
        <li key={slice.deckId} className="flex items-center gap-2 text-sm">
          <span
            className="size-3 shrink-0 rounded-full ring-2 ring-white/15"
            style={{ background: getChartSliceFill(index) }}
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

  const chartSlices = compact ? collapseUsageSlices(slices, PREVIEW_SLICE_LIMIT) : slices
  const colorPref = summarizeColorPreference(slices)
  const chartData = chartSlices.map((slice, index) => ({
    name: slice.deckId === '__other__' ? t('stats.deckUsageOther') : slice.deckName,
    value: slice.count,
    fill: getChartSliceFill(index),
    deckId: slice.deckId,
  }))

  return (
    <section className={[uiGlassCard, compact ? 'space-y-2 p-3' : 'space-y-3 p-4'].join(' ')}>
      {!compact ? <h2 className={uiSectionTitle}>{title}</h2> : null}

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

      <div className={compact ? 'h-28' : 'h-48'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 28 : 42}
              outerRadius={compact ? 44 : 68}
              paddingAngle={2}
              stroke="color-mix(in srgb, var(--color-surface) 40%, transparent)"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.deckId} fill={getChartSliceFill(index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : 0
                const total = chartSlices.reduce((sum, slice) => sum + slice.count, 0)
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

      {!compact ? (
        <>
          <DeckSliceLegend slices={slices} />
          <p className={uiLabel}>{t('stats.deckColorHint')}</p>
        </>
      ) : null}
    </section>
  )
}

/** Map deck id → chart slice fill for accent UI on deck preview cards. */
export function buildDeckUsageFillMap(slices: DeckUsageSlice[]): Map<string, string> {
  const map = new Map<string, string>()
  slices.forEach((slice, index) => {
    map.set(slice.deckId, getChartSliceFill(index))
  })
  return map
}
