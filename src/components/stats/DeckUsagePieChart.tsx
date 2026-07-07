import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ColorDots } from '@/components/deck/ColorDots'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import type { DeckUsageSlice } from '@/lib/stats'

const colorHex: Record<string, string> = {
  Red: '#ef4444',
  Green: '#22c55e',
  Blue: '#3b82f6',
  Purple: '#a855f7',
  Black: '#334155',
  Yellow: '#eab308',
}

function sliceColor(colors: string[], index: number): string {
  const primary = colors[0]
  if (primary && colorHex[primary]) return colorHex[primary]
  const fallback = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4']
  return fallback[index % fallback.length]
}

export function DeckUsagePieChart({ slices, title }: { slices: DeckUsageSlice[]; title: string }) {
  if (!slices.length) return null

  const chartData = slices.map((slice, index) => ({
    name: slice.deckName,
    value: slice.count,
    fill: sliceColor(slice.colors, index),
  }))

  return (
    <section className={[uiGlassCard, 'space-y-3 p-4'].join(' ')}>
      <h2 className={uiSectionTitle}>{title}</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              stroke="transparent"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const numeric = typeof value === 'number' ? value : 0
                const total = slices.reduce((sum, slice) => sum + slice.count, 0)
                const payload = item?.payload as { name?: string } | undefined
                return [
                  `${numeric} 場 (${Math.round((numeric / total) * 100)}%)`,
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
      <ul className="space-y-2">
        {slices.map((slice, index) => (
          <li key={slice.deckId} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: sliceColor(slice.colors, index) }}
              />
              <ColorDots colors={slice.colors} />
              <span className="truncate">{slice.deckName}</span>
            </span>
            <span className="shrink-0 tabular-nums text-text-secondary">
              {Math.round(slice.percentage * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
