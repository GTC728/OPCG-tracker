import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MetaTransferStackedChart } from '@/components/stats/MetaTransferChart'
import { getChartSliceFill } from '@/lib/deckChartColors'
import { useI18n } from '@/lib/i18n'
import {
  buildMetaHeatmapRows,
  buildRollingDeckMetaShare,
  buildTopDeckShareTrend,
  MIN_WEEKLY_META_MATCHES,
  partitionWeeklyMetaStats,
  type WeeklyDeckMetaStat,
} from '@/lib/stats'

function MetaHeatmapTable({ stats }: { stats: ReturnType<typeof buildMetaHeatmapRows> }) {
  const { t } = useI18n()
  if (!stats.length) {
    return <p className="text-sm text-text-secondary">{t('stats.metaDetail.noQualifiedWeeks')}</p>
  }

  const deckHeaders = stats[0]?.cells ?? []

  return (
    <div className="overflow-x-auto ui-scroll-region-x">
      <table className="w-full min-w-[28rem] border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface-elevated p-1 text-left text-text-secondary">
              {t('stats.metaDetail.week')}
            </th>
            {deckHeaders.map((cell) => (
              <th
                key={cell.deckId}
                className="max-w-[4.5rem] truncate p-1 text-center font-medium text-text-secondary"
              >
                {cell.deckName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => (
            <tr key={row.label} className="border-t border-white/[0.06]">
              <td className="sticky left-0 bg-surface-elevated p-1 font-medium">
                {row.label}
                <span className="block text-[9px] text-text-secondary">
                  {row.matchCount}
                  {t('stats.matchUnitShort')}
                </span>
              </td>
              {row.cells.map((cell) => (
                <td key={cell.deckId} className="p-0.5">
                  <div
                    className="rounded px-0.5 py-1 text-center tabular-nums"
                    style={{
                      background: `color-mix(in srgb, var(--color-brand-500) ${Math.round(cell.share * 72)}%, transparent)`,
                    }}
                    title={`${cell.count}`}
                  >
                    {cell.share > 0 ? `${Math.round(cell.share * 100)}%` : '—'}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MetaTransferDetailSheet({
  open,
  onClose,
  stats,
  title,
}: {
  open: boolean
  onClose: () => void
  stats: WeeklyDeckMetaStat[]
  title: string
}) {
  const { t } = useI18n()
  const { skipped } = partitionWeeklyMetaStats(stats, MIN_WEEKLY_META_MATCHES)
  const { deckIds, points: trendPoints } = buildTopDeckShareTrend(stats, 3, MIN_WEEKLY_META_MATCHES)
  const heatmap = buildMetaHeatmapRows(stats, 8, MIN_WEEKLY_META_MATCHES)
  const rolling = buildRollingDeckMetaShare(stats, 4, 5, MIN_WEEKLY_META_MATCHES)

  const trendChartData = trendPoints.map((point) => {
    const row: Record<string, string | number> = {
      label: point.label,
      matchCount: point.matchCount,
    }
    for (const share of point.shares) {
      row[share.deckId] = Math.round(share.share * 1000) / 10
    }
    return row
  })

  const rollingDeckIds = [...new Set(rolling.flatMap((w) => w.decks.map((d) => d.deckId)))]

  return (
    <BottomSheet open={open} title={title} onClose={onClose} manageScroll>
      <div className="space-y-5 pb-2">
        <p className="text-xs text-text-secondary">
          {t('stats.metaDetail.intro').replace('{min}', String(MIN_WEEKLY_META_MATCHES))}
        </p>
        {skipped.length ? (
          <p className="text-xs text-text-secondary">
            {t('stats.metaDetail.skippedWeeks').replace(
              '{labels}',
              skipped.map((week) => `${week.label}(${week.matchCount})`).join('、'),
            )}
          </p>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('stats.metaTransfer')}</h3>
          <MetaTransferStackedChart stats={stats} compact minMatches={MIN_WEEKLY_META_MATCHES} />
        </section>

        {trendChartData.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t('stats.metaDetail.top3Trend')}</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid stroke="color-mix(in srgb, white 6%, transparent)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    tickFormatter={(value) => `${value}%`}
                    width={32}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const deck = deckIds.find((d) => d.id === String(item?.dataKey))
                      return [`${value}%`, deck?.name ?? '']
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {deckIds.map((deck, index) => (
                    <Line
                      key={deck.id}
                      type="monotone"
                      dataKey={deck.id}
                      name={deck.name}
                      stroke={getChartSliceFill(index)}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        {rolling.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t('stats.metaDetail.rolling4w')}</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={rolling.map((week) => {
                    const row: Record<string, string | number> = {
                      label: week.label,
                      matchCount: week.matchCount,
                    }
                    for (const deck of week.decks) {
                      row[deck.deckId] = Math.round(deck.share * 1000) / 10
                    }
                    return row
                  })}
                  stackOffset="expand"
                >
                  <CartesianGrid stroke="color-mix(in srgb, white 6%, transparent)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                  <YAxis
                    tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    width={36}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const key = String(item?.dataKey ?? '')
                      const deck = rolling[0]?.decks.find((d) => d.deckId === key)
                      return [`${Math.round(Number(value) * 100)}%`, deck?.deckName ?? key]
                    }}
                  />
                  {rollingDeckIds.map((deckId, index) => (
                    <Area
                      key={deckId}
                      type="monotone"
                      dataKey={deckId}
                      stackId="roll"
                      stroke={getChartSliceFill(index)}
                      fill={getChartSliceFill(index)}
                      fillOpacity={0.75}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('stats.metaDetail.heatmap')}</h3>
          <MetaHeatmapTable stats={heatmap} />
        </section>
      </div>
    </BottomSheet>
  )
}
