import { ChartLegendSwatch } from '@/components/deck/ChartLegendSwatch'
import { getOpcgColorFill, summarizeColorPreference } from '@/lib/deckChartColors'
import { useI18n } from '@/lib/i18n'
import type { DeckUsageSlice } from '@/lib/stats'
import { SectionHeader } from '@/components/ui/SectionHeader'

function colorLabel(color: string, t: (key: import('@/lib/i18n').TranslationKey) => string): string {
  const key = `stats.colorName.${color}` as import('@/lib/i18n').TranslationKey
  const translated = t(key)
  return translated !== key ? translated : color
}

export function ColorMetaPills({
  deckUsageSlices,
  title,
}: {
  deckUsageSlices: DeckUsageSlice[]
  title: string
}) {
  const { t } = useI18n()
  const colorPref = summarizeColorPreference(deckUsageSlices)
  if (colorPref.length < 1) return null

  return (
    <section className="space-y-2">
      <SectionHeader title={title} />
      <div className="flex flex-wrap gap-2">
        {colorPref.map((item) => (
          <span
            key={item.color}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--glass-inset-bg)] px-3 py-2 text-xs font-semibold"
          >
            <ChartLegendSwatch fill={getOpcgColorFill(item.color)} />
            <span>{colorLabel(item.color, t)}</span>
            <span className="tabular-nums text-text-secondary">{item.pct}%</span>
          </span>
        ))}
      </div>
    </section>
  )
}
