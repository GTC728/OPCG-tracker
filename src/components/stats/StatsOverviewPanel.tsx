import { useMemo, useState, type ReactNode } from 'react'
import { DeckArtCard } from '@/components/deck/DeckArtCard'
import { WinLossRecord } from '@/components/match/WinLossRecord'
import { ColorMetaPieChart } from '@/components/stats/ColorMetaPieChart'
import { FloatingSidePager } from '@/components/ui/FloatingSidePager'
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

const RANK_PAGE_SIZE = 5

function RankPager({
  page,
  totalPages,
  onPrev,
  onNext,
  children,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  children: ReactNode
}) {
  const { t } = useI18n()

  if (totalPages <= 1) {
    return <div className="space-y-2">{children}</div>
  }

  return (
    <div className="relative">
      <div className="space-y-2 px-11">{children}</div>
      <FloatingSidePager
        canPrev={page > 0}
        canNext={page < totalPages - 1}
        onPrev={onPrev}
        onNext={onNext}
        prevLabel={t('common.previous')}
        nextLabel={t('common.next')}
      />
    </div>
  )
}

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
  const [playerPage, setPlayerPage] = useState(0)

  const rankedPlayers = useMemo(
    () => [...playerStats].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0)),
    [playerStats],
  )
  const rankedDecks = useMemo(() => sortStatsByUsage(deckStats), [deckStats])
  const deckAppearances = rankedDecks.reduce((sum, stat) => sum + stat.total, 0) || 1
  const playerTotalPages = Math.max(1, Math.ceil(rankedPlayers.length / RANK_PAGE_SIZE))
  const visiblePlayers = rankedPlayers.slice(
    playerPage * RANK_PAGE_SIZE,
    playerPage * RANK_PAGE_SIZE + RANK_PAGE_SIZE,
  )

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
                    detail: (
                      <>
                        {formatPercent(getDisplayWinRate(dashboard.topPlayer.wins, dashboard.topPlayer.total))} ·{' '}
                        <WinLossRecord wins={dashboard.topPlayer.wins} losses={dashboard.topPlayer.losses} />
                      </>
                    ),
                    accent: true,
                  },
                ]
              : []),
          ]}
        />
      ) : null}

      {rankedPlayers.length ? (
        <section className="space-y-2">
          <SectionHeader
            title={t('stats.playerRanking')}
            action={t('achievements.viewAll')}
            onAction={onViewAllPlayers}
          />
          <RankPager
            page={playerPage}
            totalPages={playerTotalPages}
            onPrev={() => setPlayerPage((value) => Math.max(0, value - 1))}
            onNext={() => setPlayerPage((value) => Math.min(playerTotalPages - 1, value + 1))}
          >
            {visiblePlayers.map((stat, index) => (
              <RankListRow
                key={stat.id}
                rank={playerPage * RANK_PAGE_SIZE + index + 1}
                title={stat.name}
                subtitle={
                  <>
                    <WinLossRecord wins={stat.wins} losses={stat.losses} /> ·{' '}
                    {formatPercent(getDisplayWinRate(stat.wins, stat.total))}
                  </>
                }
                highlighted={playerPage === 0 && index === 0}
                onClick={() => onOpenPlayer(stat.id)}
              />
            ))}
          </RankPager>
        </section>
      ) : null}

      {rankedDecks.length ? (
        <section className="space-y-2">
          <SectionHeader
            title={t('stats.deckRanking')}
            action={t('achievements.viewAll')}
            onAction={onViewAllDecks}
          />
          <HorizontalRail>
            {rankedDecks.map((stat) => {
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
      ) : null}

      {deckUsageSlices.length ? (
        <ColorMetaPieChart deckUsageSlices={deckUsageSlices} title={t('stats.colorMetaPie')} compact />
      ) : null}
    </div>
  )
}
