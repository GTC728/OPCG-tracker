import { DeckArtCard } from '@/components/deck/DeckArtCard'
import { ColorMetaPills } from '@/components/stats/ColorMetaPills'
import { HorizontalRail } from '@/components/ui/HorizontalRail'
import { MetricHeroCard } from '@/components/ui/MetricHeroCard'
import { RankListRow } from '@/components/ui/RankListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useI18n } from '@/lib/i18n'
import {
  formatPercent,
  sortStatsByUsage,
  type DashboardStats,
  type DeckUsageSlice,
  type MetaSummaryStats,
  type RecordStat,
} from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'
import type { Deck, Language } from '@/types'

const PREVIEW_LIMIT = 8

export function StatsOverviewPanel({
  summary,
  dashboard,
  playerStats,
  deckStats,
  decks,
  deckUsageSlices,
  language,
  scopeLabel,
  onOpenPlayer,
  onOpenDeck,
  onViewAllPlayers,
  onViewAllDecks,
}: {
  summary: MetaSummaryStats
  dashboard: DashboardStats
  playerStats: RecordStat[]
  deckStats: RecordStat[]
  decks: Deck[]
  deckUsageSlices: DeckUsageSlice[]
  language: Language
  scopeLabel: string
  onOpenPlayer: (playerId: string) => void
  onOpenDeck: (deckId: string) => void
  onViewAllPlayers: () => void
  onViewAllDecks: () => void
}) {
  const { t } = useI18n()
  const topPlayers = [...playerStats].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0)).slice(0, PREVIEW_LIMIT)
  const topDecks = sortStatsByUsage(deckStats).slice(0, PREVIEW_LIMIT)
  const deckAppearances = topDecks.reduce((sum, stat) => sum + stat.total, 0) || 1

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

      <section className="space-y-2">
        <SectionHeader
          title={t('stats.playersTop5')}
          action={t('achievements.viewAll')}
          onAction={onViewAllPlayers}
        />
        <div className="space-y-2">
          {topPlayers.map((stat, index) => (
            <RankListRow
              key={stat.id}
              rank={index + 1}
              title={stat.name}
              subtitle={`${stat.wins}W-${stat.losses}L · ${formatPercent(getDisplayWinRate(stat.wins, stat.total))}`}
              highlighted={index === 0}
              onClick={() => onOpenPlayer(stat.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title={t('stats.decksTop5')}
          action={t('achievements.viewAll')}
          onAction={onViewAllDecks}
        />
        <HorizontalRail>
          {topDecks.map((stat) => {
            const deck = decks.find((item) => item.id === stat.id)
            if (!deck) return null
            const usage = (stat.total / deckAppearances) * 100
            return (
              <DeckArtCard
                key={stat.id}
                deck={deck}
                language={language}
                subtitle={`${usage.toFixed(0)}% · ${formatPercent(getDisplayWinRate(stat.wins, stat.total))}`}
                onClick={() => onOpenDeck(stat.id)}
              />
            )
          })}
        </HorizontalRail>
      </section>

      {deckUsageSlices.length ? (
        <ColorMetaPills deckUsageSlices={deckUsageSlices} title={t('stats.colorMetaPie')} />
      ) : null}
    </div>
  )
}
