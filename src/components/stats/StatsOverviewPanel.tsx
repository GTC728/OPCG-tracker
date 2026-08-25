import { ColorMetaPieChart } from '@/components/stats/ColorMetaPieChart'
import { GroupedListRow, GroupedListSection } from '@/components/ui/GroupedList'
import { MetricHeroCard } from '@/components/ui/MetricHeroCard'
import { useI18n } from '@/lib/i18n'
import {
  formatPercent,
  type DashboardStats,
  type DeckUsageSlice,
  type MetaSummaryStats,
  type RecordStat,
} from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'

export function StatsOverviewPanel({
  summary,
  dashboard,
  playerStats,
  deckStats,
  decks,
  deckUsageSlices,
  scopeLabel,
  onViewAllPlayers,
  onViewAllDecks,
}: {
  summary: MetaSummaryStats
  dashboard: DashboardStats
  playerStats: RecordStat[]
  deckStats: RecordStat[]
  decks: unknown[]
  deckUsageSlices: DeckUsageSlice[]
  language: unknown
  scopeLabel: string
  onOpenPlayer: (playerId: string) => void
  onOpenDeck: (deckId: string) => void
  onViewAllPlayers: () => void
  onViewAllDecks: () => void
}) {
  const { t } = useI18n()
  void decks
  void playerStats
  void deckStats

  return (
    <div className="space-y-5">
      <MetricHeroCard
        metrics={[
          { label: t('stats.totalMatches'), value: String(summary.totalMatches) },
          { label: t('stats.activePlayers'), value: String(summary.uniquePlayers) },
          { label: t('stats.deckVariety'), value: String(summary.uniqueDecks) },
        ]}
        subtitle={scopeLabel}
      />

      {dashboard.firstPlayerSample > 0 || dashboard.topPlayer ? (
        <MetricHeroCard
          split
          metrics={[
            ...(dashboard.firstPlayerSample > 0
              ? [
                  {
                    label: t('stats.firstWinRate'),
                    value: formatPercent(dashboard.firstPlayerWinRate),
                  },
                ]
              : []),
            ...(dashboard.topPlayer
              ? [
                  {
                    label: t('stats.mvp'),
                    value: dashboard.topPlayer.name,
                    detail: `${formatPercent(getDisplayWinRate(dashboard.topPlayer.wins, dashboard.topPlayer.total))} · ${dashboard.topPlayer.wins}W-${dashboard.topPlayer.losses}L`,
                    accent: true,
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      <GroupedListSection variant="separated">
        <GroupedListRow
          variant="separated"
          title={t('stats.playersTop5')}
          meta={String(summary.uniquePlayers)}
          onClick={onViewAllPlayers}
        />
        <GroupedListRow
          variant="separated"
          title={t('stats.decksTop5')}
          meta={String(summary.uniqueDecks)}
          onClick={onViewAllDecks}
        />
      </GroupedListSection>

      {deckUsageSlices.length ? (
        <ColorMetaPieChart deckUsageSlices={deckUsageSlices} title={t('stats.colorMetaPie')} compact />
      ) : null}
    </div>
  )
}
