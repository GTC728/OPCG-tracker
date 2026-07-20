import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlayerProfileHub } from '@/components/profile/PlayerProfileHub'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { ProfileLinkSheet } from '@/components/profile/ProfileLinkSheet'
import { getLinkedPlayer } from '@/lib/profileClaim'
import { hasPersonalProfile } from '@/lib/personalProfile'
import { PlayerShareCard, SessionDashboardShareCard, ShareExportSheet } from '@/components/share/ShareExportSheet'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { uiCard, uiCardInteractive, uiGlassCard, uiLink, uiSectionTitle } from '@/lib/uiSurface'
import { MetaTransferChart } from '@/components/stats/MetaTransferChart'
import { StatsReadingGuide } from '@/components/stats/StatsReadingGuide'
import {
  buildDeckStats,
  buildFirstSecondStats,
  buildMatchupStats,
  buildPlayerDeckStats,
  buildWeeklyDeckMetaStats,
  formatPercent,
  getCompletedMatches,
  sortStatsByUsage,
  sortStatsByWeightedWinRate,
  sortPilotStatsForLeaderboard,
  type FirstSecondStat,
  type InsightMessage,
  type MatchupStat,
  type MetaSummaryStats,
  type PlayerDeckStat,
  type PlayerMatchupStat,
  type RecentFormStat,
  type RecordStat,
} from '@/lib/stats'
import { formatMatchDuration, getAverageMatchDurationMs } from '@/lib/matchTimer'
import {
  formatWinRateTooltip,
  getDisplayWinRate,
  getDisplayWinRateFromRaw,
  getSampleLabel,
  getWinRateHeatmapColor,
  isReliableSample,
} from '@/lib/winRateDisplay'
import { useScopedInsights, useScopedStats } from '@/hooks/useDerivedStats'
import type { StatsScope } from '@/lib/derivedData'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Language, Match, Player } from '@/types'

type StatsSectionId = 'overview' | 'players' | 'decks'
type ProfileNavTarget = { type: 'player' | 'deck'; id: string }

function SummaryCard({
  label,
  value,
  detail,
  featured = false,
}: {
  label: string
  value: string
  detail?: string
  featured?: boolean
}) {
  return (
    <article className={[uiCard, featured ? 'p-4' : 'p-3'].join(' ')}>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={['mt-1 font-bold tracking-tight', featured ? 'text-3xl' : 'text-2xl'].join(' ')}>{value}</p>
      {detail ? <p className="mt-0.5 text-xs text-text-secondary">{detail}</p> : null}
    </article>
  )
}

function getMatchupVerdict(
  winRate: number | null,
  total: number,
  t: (key: TranslationKey) => string,
): string {
  if (total < 3 || winRate === null) return t('stats.matchup.insufficient')
  if (winRate >= 0.6) return t('stats.matchup.advantage')
  if (winRate <= 0.4) return t('stats.matchup.disadvantage')
  return t('stats.matchup.even')
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className={[uiCard, 'border border-dashed border-white/[0.08] p-4 text-center text-sm text-text-secondary'].join(' ')}>
      {children}
    </div>
  )
}

function SectionTabs({
  activeSection,
  onChange,
}: {
  activeSection: StatsSectionId
  onChange: (section: StatsSectionId) => void
}) {
  const { t } = useI18n()
  return (
    <SegmentedControl
      className="grid-cols-3"
      value={activeSection}
      onChange={onChange}
      options={[
        { value: 'overview', label: t('stats.section.overview') },
        { value: 'players', label: t('stats.section.players') },
        { value: 'decks', label: t('stats.section.decks') },
      ]}
    />
  )
}

function StatRow({
  stat,
  deck,
  onSelect,
}: {
  stat: RecordStat
  deck?: Deck | null
  onSelect?: () => void
}) {
  const displayWinRate = getDisplayWinRate(stat.wins, stat.total)
  const width = `${Math.round((displayWinRate ?? 0) * 100)}%`

  const content = (
    <article className={[uiCard, 'p-3.5'].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {deck ? <DeckLabel deck={deck} showCode className="inline-flex min-w-0" /> : stat.name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {stat.wins}W-{stat.losses}L · {getSampleLabel(stat.total)}
          </p>
        </div>
        <span className="text-lg font-bold">{formatPercent(displayWinRate)}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-brand-500" style={{ width }} />
      </div>
    </article>
  )

  if (!onSelect) return content

  return (
    <button type="button" className="block w-full text-left" onClick={onSelect}>
      {content}
    </button>
  )
}

function StatSection({
  title,
  stats,
  decks,
  variant = 'player',
  onSelect,
}: {
  title: string
  stats: RecordStat[]
  decks?: Deck[]
  variant?: 'player' | 'deck'
  onSelect?: (stat: RecordStat) => void
}) {
  const { t } = useI18n()
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{title}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.itemCount').replace('{n}', String(stats.length))}
        </span>
      </div>
      {stats.length ? (
        stats.map((stat) => (
          <StatRow
            key={stat.id}
            stat={stat}
            deck={variant === 'deck' ? decks?.find((deck) => deck.id === stat.id) : undefined}
            onSelect={onSelect ? () => onSelect(stat) : undefined}
          />
        ))
      ) : (
        <EmptyState>{t('stats.emptyAfterMatches')}</EmptyState>
      )}
    </section>
  )
}

function HeatmapCell({
  displayWinRate,
  wins,
  losses,
  reliable,
}: {
  displayWinRate: number | null
  wins: number
  losses: number
  reliable: boolean
}) {
  return (
    <span className={['text-[10px] font-semibold leading-tight', reliable ? '' : 'text-text-secondary'].join(' ')}>
      {displayWinRate === null ? '—' : formatPercent(displayWinRate)}
      <span className="block font-normal text-text-secondary">
        {wins}W-{losses}L
      </span>
    </span>
  )
}

function MatchupRow({
  matchup,
  decks,
  anchorDeckId,
}: {
  matchup: MatchupStat
  decks: Deck[]
  anchorDeckId?: string
}) {
  const { t } = useI18n()
  const deckA = decks.find((deck) => deck.id === matchup.deckAId)
  const deckB = decks.find((deck) => deck.id === matchup.deckBId)
  const anchorIsB = anchorDeckId === matchup.deckBId
  const selfDeck = anchorIsB ? deckB : deckA
  const oppDeck = anchorIsB ? deckA : deckB
  const selfWinRate =
    anchorIsB && matchup.deckAWinRate !== null ? 1 - matchup.deckAWinRate : matchup.deckAWinRate
  const selfWins = anchorIsB ? matchup.deckBWins : matchup.deckAWins
  const oppWins = anchorIsB ? matchup.deckAWins : matchup.deckBWins
  const displayWinRate = getDisplayWinRate(selfWins, matchup.total)
  const verdict = getMatchupVerdict(selfWinRate, matchup.total, t)
  const rateClass =
    displayWinRate === null
      ? 'text-text-secondary'
      : displayWinRate >= 0.5
        ? 'text-success'
        : 'text-text-secondary'

  return (
    <article className={[uiCard, 'p-3'].join(' ')}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {anchorDeckId ? (
            <p className="text-xs text-text-secondary">{t('stats.matchup.opponentDeck')}</p>
          ) : (
            <p className="text-xs text-text-secondary">
              <DeckLabel deck={selfDeck} showCode compact className="inline-flex" />
            </p>
          )}
          <p className="mt-1 font-semibold leading-tight">
            <DeckLabel deck={oppDeck} showCode compact className="inline-flex min-w-0" />
          </p>
        </div>
        <div className={`shrink-0 text-right ${rateClass}`}>
          <p className="text-xl font-bold tabular-nums">
            {selfWins}-{oppWins}
          </p>
          <p className="text-sm font-semibold">{formatPercent(displayWinRate)}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={[
            'h-full rounded-full transition-all',
            displayWinRate === null
              ? 'w-1/2 bg-text-secondary/40'
              : displayWinRate >= 0.5
                ? 'bg-success'
                : 'bg-danger',
          ].join(' ')}
          style={{
            width:
              displayWinRate === null ? '50%' : `${Math.max(8, Math.min(92, displayWinRate * 100))}%`,
          }}
        />
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        {verdict} · {getSampleLabel(matchup.total)}
      </p>
    </article>
  )
}

function MatchupHeatmap({
  matchups,
  decks,
  maxDecks = 14,
  title,
  deckIds,
}: {
  matchups: MatchupStat[]
  decks: Deck[]
  maxDecks?: number
  title?: string
  deckIds?: string[]
}) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t('stats.matchup.matrix')
  const deckTotals = new Map<string, { id: string; total: number }>()
  const matchupByPair = new Map(matchups.map((matchup) => [matchup.key, matchup]))

  for (const matchup of matchups) {
    deckTotals.set(matchup.deckAId, {
      id: matchup.deckAId,
      total: (deckTotals.get(matchup.deckAId)?.total ?? 0) + matchup.total,
    })
    deckTotals.set(matchup.deckBId, {
      id: matchup.deckBId,
      total: (deckTotals.get(matchup.deckBId)?.total ?? 0) + matchup.total,
    })
  }

  const scopedDeckIds = deckIds?.length ? new Set(deckIds) : null
  const rankedDecks = [...deckTotals.values()]
    .filter((entry) => !scopedDeckIds || scopedDeckIds.has(entry.id))
    .sort((left, right) => right.total - left.total)
    .slice(0, maxDecks)
  const columnWidth = '6.75rem'
  const rowLabelWidth = '10.5rem'

  function getCell(rowId: string, columnId: string) {
    if (rowId === columnId) return null
    const [deckAId, deckBId] = [rowId, columnId].sort()
    const matchup = matchupByPair.get(`${deckAId}:${deckBId}`)
    if (!matchup || matchup.deckAWinRate === null) return null

    const rowIsDeckA = rowId === matchup.deckAId
    const winRate = rowIsDeckA ? matchup.deckAWinRate : 1 - matchup.deckAWinRate
    const wins = rowIsDeckA ? matchup.deckAWins : matchup.deckBWins
    const losses = rowIsDeckA ? matchup.deckBWins : matchup.deckAWins

    return { winRate, wins, losses, total: matchup.total }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{resolvedTitle}</h2>
        <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.matchup.winRateWL')}
        </span>
      </div>
      <article className={[uiCard, 'overflow-x-auto p-3'].join(' ')}>
        {rankedDecks.length >= 2 ? (
          <div
            className="min-w-max"
            style={{ minWidth: `calc(${rowLabelWidth} + ${rankedDecks.length} * ${columnWidth})` }}
          >
            <div
              className="grid gap-1 text-xs"
              style={{
                gridTemplateColumns: `${rowLabelWidth} repeat(${rankedDecks.length}, ${columnWidth})`,
              }}
            >
              <div />
              {rankedDecks.map((entry) => (
                <div
                  key={entry.id}
                  className="px-1 pb-1 text-center text-text-secondary"
                  title={decks.find((deck) => deck.id === entry.id)?.displayName}
                >
                  <DeckLabel
                    deck={decks.find((deck) => deck.id === entry.id)}
                    showCode
                    compact
                    className="inline-flex max-w-full justify-center text-[10px] leading-tight [overflow-wrap:anywhere] line-clamp-2"
                  />
                </div>
              ))}
              {rankedDecks.map((rowEntry) => (
                <div key={rowEntry.id} className="contents">
                  <div className="flex items-center py-1 pr-2 font-semibold leading-none">
                    <DeckLabel
                      deck={decks.find((deck) => deck.id === rowEntry.id)}
                      showCode
                      compact
                      className="inline-flex min-w-0 max-w-full text-[10px] leading-tight [overflow-wrap:anywhere] line-clamp-2"
                    />
                  </div>
                  {rankedDecks.map((columnEntry) => {
                    const cell = getCell(rowEntry.id, columnEntry.id)
                    const displayWinRate = cell ? getDisplayWinRate(cell.wins, cell.total) : null
                    const reliable = cell ? isReliableSample(cell.total) : false

                    return (
                      <div
                        key={`${rowEntry.id}:${columnEntry.id}`}
                        className="grid min-h-11 place-items-center rounded-lg px-0.5 text-center"
                        style={{
                          backgroundColor: cell
                            ? getWinRateHeatmapColor(cell.wins, cell.total)
                            : 'rgba(71, 85, 105, 0.35)',
                        }}
                        title={
                          cell
                            ? formatWinRateTooltip(cell.wins, cell.losses, cell.total, cell.winRate)
                            : t('stats.matchup.noMatch')
                        }
                      >
                        {cell ? (
                          <HeatmapCell
                            displayWinRate={displayWinRate}
                            wins={cell.wins}
                            losses={cell.losses}
                            reliable={reliable}
                          />
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">{t('stats.matchup.matrixHint')}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.matchup.matrixEmpty')}</p>
        )}
      </article>
    </section>
  )
}

function PlayerMatchupHeatmap({
  matchups,
  maxPlayers = 12,
}: {
  matchups: PlayerMatchupStat[]
  maxPlayers?: number
}) {
  const { t } = useI18n()
  const playerTotals = new Map<string, { id: string; name: string; total: number }>()
  const matchupByPair = new Map(matchups.map((matchup) => [matchup.key, matchup]))

  for (const matchup of matchups) {
    for (const side of [
      { id: matchup.playerAId, name: matchup.playerAName },
      { id: matchup.playerBId, name: matchup.playerBName },
    ]) {
      playerTotals.set(side.id, {
        id: side.id,
        name: side.name,
        total: (playerTotals.get(side.id)?.total ?? 0) + matchup.total,
      })
    }
  }

  const rankedPlayers = [...playerTotals.values()]
    .sort((left, right) => right.total - left.total)
    .slice(0, maxPlayers)
  const columnWidth = '5.5rem'
  const rowLabelWidth = '5.5rem'

  function getCell(rowId: string, columnId: string) {
    if (rowId === columnId) return null
    const [playerAId, playerBId] = [rowId, columnId].sort()
    const matchup = matchupByPair.get(`${playerAId}:${playerBId}`)
    if (!matchup || matchup.playerAWinRate === null) return null

    const rowIsA = rowId === matchup.playerAId
    const winRate = rowIsA ? matchup.playerAWinRate : 1 - matchup.playerAWinRate
    const wins = rowIsA ? matchup.playerAWins : matchup.playerBWins
    const losses = rowIsA ? matchup.playerBWins : matchup.playerAWins
    return { winRate, wins, losses, total: matchup.total }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('stats.matchup.playerMatrix')}</h2>
        <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.matchup.winRateWL')}
        </span>
      </div>
      <article className={[uiCard, 'overflow-x-auto p-3'].join(' ')}>
        {rankedPlayers.length >= 2 ? (
          <div
            className="min-w-max"
            style={{ minWidth: `calc(${rowLabelWidth} + ${rankedPlayers.length} * ${columnWidth})` }}
          >
            <div
              className="grid gap-1 text-xs"
              style={{
                gridTemplateColumns: `${rowLabelWidth} repeat(${rankedPlayers.length}, ${columnWidth})`,
              }}
            >
              <div />
              {rankedPlayers.map((entry) => (
                <div
                  key={entry.id}
                  className="px-0.5 pb-1 text-center text-[10px] font-semibold leading-tight text-text-secondary [overflow-wrap:anywhere] line-clamp-2"
                  title={entry.name}
                >
                  {entry.name}
                </div>
              ))}
              {rankedPlayers.map((rowEntry) => (
                <div key={rowEntry.id} className="contents">
                  <div className="flex items-center py-1 pr-1 text-[10px] font-semibold leading-tight [overflow-wrap:anywhere] line-clamp-2">
                    {rowEntry.name}
                  </div>
                  {rankedPlayers.map((columnEntry) => {
                    const cell = getCell(rowEntry.id, columnEntry.id)
                    const displayWinRate = cell ? getDisplayWinRate(cell.wins, cell.total) : null
                    const reliable = cell ? isReliableSample(cell.total) : false

                    return (
                      <div
                        key={`${rowEntry.id}:${columnEntry.id}`}
                        className="grid min-h-11 place-items-center rounded-lg px-0.5 text-center"
                        style={{
                          backgroundColor: cell
                            ? getWinRateHeatmapColor(cell.wins, cell.total)
                            : 'rgba(71, 85, 105, 0.35)',
                        }}
                        title={
                          cell
                            ? formatWinRateTooltip(cell.wins, cell.losses, cell.total, cell.winRate)
                            : t('stats.matchup.noMatch')
                        }
                      >
                        {cell ? (
                          <HeatmapCell
                            displayWinRate={displayWinRate}
                            wins={cell.wins}
                            losses={cell.losses}
                            reliable={reliable}
                          />
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.matchup.playerMatrixEmpty')}</p>
        )}
      </article>
    </section>
  )
}

function MetaSummarySection({ summary }: { summary: MetaSummaryStats }) {
  const { t } = useI18n()
  if (!summary.totalMatches) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('stats.meta.overview')}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label={t('stats.totalMatches')} value={String(summary.totalMatches)} />
        <SummaryCard label={t('stats.activePlayers')} value={String(summary.uniquePlayers)} />
        <SummaryCard label={t('stats.deckVariety')} value={String(summary.uniqueDecks)} />
        <SummaryCard
          label={t('stats.metaDiversity')}
          value={`${summary.diversityPercent}%`}
          detail={t('stats.metaDiversityDetail')}
        />
      </div>
    </section>
  )
}

function DeckListSection({
  stats,
  decks,
  onSelectDeck,
}: {
  stats: RecordStat[]
  decks: Deck[]
  onSelectDeck: (deckId: string) => void
}) {
  const { t } = useI18n()
  const sorted = sortStatsByUsage(stats)
  const totalAppearances = sorted.reduce((sum, stat) => sum + stat.total, 0)
  if (!sorted.length || !totalAppearances) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('stats.deckList')}</h2>
        <EmptyState>{t('stats.emptyAfterMatches')}</EmptyState>
      </section>
    )
  }

  const deckTag = (stat: RecordStat) => {
    if (stat.total < 3) return t('stats.deckTag.insufficient')
    if ((stat.winRate ?? 0) >= 0.6) return t('stats.deckTag.strong')
    if ((stat.winRate ?? 0) <= 0.4) return t('stats.deckTag.weak')
    return t('stats.deckTag.average')
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('stats.deckList')}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.deckListCount')
            .replace('{n}', String(sorted.length))
            .replace('{total}', String(totalAppearances))}
        </span>
      </div>
      <article className={[uiCard, 'divide-y divide-white/[0.06] overflow-hidden'].join(' ')}>
        {sorted.map((stat) => {
          const usage = (stat.total / totalAppearances) * 100
          const deck = decks.find((item) => item.id === stat.id)
          const tag = deckTag(stat)

          return (
            <button
              key={stat.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-muted/60 active:bg-surface-muted"
              onClick={() => onSelectDeck(stat.id)}
            >
              <div className="min-w-0 flex-1">
                <DeckLabel deck={deck} showCode compact className="inline-flex max-w-full line-clamp-2 leading-tight" />
                <p className="mt-0.5 text-xs text-text-secondary">
                  {stat.wins}W-{stat.losses}L · {getSampleLabel(stat.total)} · {tag}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm font-bold">{usage.toFixed(0)}%</p>
                <p className="text-xs text-text-secondary">
                  {formatPercent(getDisplayWinRate(stat.wins, stat.total))}
                </p>
              </div>
            </button>
          )
        })}
      </article>
    </section>
  )
}

function ProfileMatchupSection({
  title,
  matchups,
  decks,
  anchorDeckId,
  playerDeckIds,
}: {
  title: string
  matchups: MatchupStat[]
  decks: Deck[]
  anchorDeckId?: string
  playerDeckIds?: Set<string>
}) {
  const { t } = useI18n()
  const sorted = [...matchups].sort((left, right) => right.total - left.total)

  const resolveAnchor = (matchup: MatchupStat) => {
    if (anchorDeckId) return anchorDeckId
    if (playerDeckIds?.has(matchup.deckAId)) return matchup.deckAId
    if (playerDeckIds?.has(matchup.deckBId)) return matchup.deckBId
    return undefined
  }

  if (!sorted.length) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <EmptyState>{t('stats.matchup.none')}</EmptyState>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.matchup.pairCount').replace('{n}', String(sorted.length))}
        </span>
      </div>
      <div className="space-y-2">
        {sorted.slice(0, 12).map((matchup) => (
          <MatchupRow
            key={matchup.key}
            matchup={matchup}
            decks={decks}
            anchorDeckId={resolveAnchor(matchup)}
          />
        ))}
      </div>
    </section>
  )
}

function MiniLeaderboard({
  title,
  subtitle,
  stats,
  pilotStats,
  decks,
  variant = 'player',
  onSelect,
  onSelectPilot,
}: {
  title: string
  subtitle?: string
  stats?: RecordStat[]
  pilotStats?: PlayerDeckStat[]
  decks?: Deck[]
  variant?: 'player' | 'deck' | 'pilot'
  onSelect?: (stat: RecordStat) => void
  onSelectPilot?: (stat: PlayerDeckStat) => void
}) {
  const top =
    variant === 'pilot' ? (pilotStats ?? []).slice(0, 5) : (stats ?? []).slice(0, 5)
  if (!top.length) return null

  return (
    <section className={[uiCard, 'p-3'].join(' ')}>
      <h3 className="text-sm font-semibold text-brand-500">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-[10px] text-text-secondary">{subtitle}</p> : null}
      <ol className="mt-2 space-y-1.5">
        {variant === 'pilot'
          ? (top as PlayerDeckStat[]).map((stat, index) => (
              <li key={stat.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                  onClick={() => onSelectPilot?.(stat)}
                  disabled={!onSelectPilot}
                >
                  <span className="w-5 shrink-0 text-xs font-bold text-text-secondary">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{stat.playerName}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-text-secondary">
                      <DeckLabel deck={decks?.find((deck) => deck.id === stat.deckId)} showCode />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {stat.wins}W-{stat.losses}L
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {formatPercent(getDisplayWinRate(stat.wins, stat.total))}
                  </span>
                </button>
              </li>
            ))
          : (top as RecordStat[]).map((stat, index) => (
              <li key={stat.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                  onClick={() => onSelect?.(stat)}
                  disabled={!onSelect}
                >
                  <span className="w-5 shrink-0 text-xs font-bold text-text-secondary">{index + 1}</span>
                  {variant === 'deck' ? (
                    <span className="min-w-0 flex-1 truncate font-medium">
                      <DeckLabel deck={decks?.find((deck) => deck.id === stat.id)} showCode />
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">{stat.name}</span>
                  )}
                  <span className="shrink-0 text-xs text-text-secondary">
                    {stat.wins}W-{stat.losses}L
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {formatPercent(getDisplayWinRate(stat.wins, stat.total))}
                  </span>
                </button>
              </li>
            ))}
      </ol>
    </section>
  )
}

function InsightsSection({ insights }: { insights: InsightMessage[] }) {
  const { t } = useI18n()
  if (!insights.length) return null

  return (
    <section className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25">
      <h2 className="text-lg font-semibold">{t('stats.insights.title')}</h2>
      <div className="mt-3 space-y-2">
        {insights.map((insight) => (
          <p key={insight.id} className="rounded-xl bg-surface/70 p-3 text-sm text-text-primary">
            {insight.text}
          </p>
        ))}
      </div>
    </section>
  )
}

function resolveFirstSecondStat(stats: FirstSecondStat[], key: 'first' | 'second') {
  return stats.find((stat) => stat.label === key || stat.label === (key === 'first' ? '先攻' : '後攻'))
}

function FirstSecondSection({ stats }: { stats: FirstSecondStat[] }) {
  const { t } = useI18n()
  const first = resolveFirstSecondStat(stats, 'first')
  const second = resolveFirstSecondStat(stats, 'second')
  const firstWinRate = getDisplayWinRate(first?.wins ?? 0, first?.total ?? 0)
  const secondWinRate = getDisplayWinRate(second?.wins ?? 0, second?.total ?? 0)
  const firstPercent = firstWinRate ? firstWinRate * 100 : 0
  const secondPercent = secondWinRate ? secondWinRate * 100 : 0
  const sampleTotal = first?.total ?? second?.total ?? 0

  if (!sampleTotal) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('stats.firstSecond.title')}</h2>
      <article className={[uiCard, 'p-4'].join(' ')}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t('stats.first')}</span>
          <span className="text-text-secondary">
            {formatPercent(firstWinRate)} · {first?.wins ?? 0}W · {getSampleLabel(first?.total ?? 0)}
          </span>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${firstPercent}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-medium">{t('stats.second')}</span>
          <span className="text-text-secondary">
            {formatPercent(secondWinRate)} · {second?.wins ?? 0}W · {getSampleLabel(second?.total ?? 0)}
          </span>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${secondPercent}%` }} />
        </div>
      </article>
    </section>
  )
}

function PlayerDeckSection({ stats, decks }: { stats: PlayerDeckStat[]; decks: Deck[] }) {
  const { t } = useI18n()
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('stats.playerDeckMatrix')}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {t('stats.matchup.pairCount').replace('{n}', String(stats.length))}
        </span>
      </div>
      {stats.slice(0, 24).map((stat) => (
        <article key={stat.id} className={[uiCard, 'p-4'].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{stat.playerName}</h3>
              <p className="mt-1 text-sm text-text-secondary">
                <DeckLabel deck={decks.find((deck) => deck.id === stat.deckId)} showCode />
              </p>
            </div>
            <span className="text-right font-bold">
              {formatPercent(getDisplayWinRate(stat.wins, stat.total))}
              <span className="block text-sm font-normal text-text-secondary">
                {getSampleLabel(stat.total)}
              </span>
            </span>
          </div>
        </article>
      ))}
      {!stats.length ? (
        <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
          {t('stats.playerDeckEmpty')}
        </div>
      ) : null}
    </section>
  )
}

function RecentFormSection({ recentForm }: { recentForm: RecentFormStat[] }) {
  const { t } = useI18n()
  const visibleForms = recentForm.filter((form) => form.total > 0 && form.winRate !== null)
  if (!visibleForms.length) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('stats.recentForm.title')}</h2>
      <article className={[uiCard, 'p-4'].join(' ')}>
        <div className="space-y-3">
          {visibleForms.map((form) => {
            const width = `${Math.round((form.winRate ?? 0) * 100)}%`

            return (
              <div key={form.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {t('stats.recentForm.window').replace('{n}', form.label)}
                  </span>
                  <strong>{formatPercent(form.winRate)}</strong>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-brand-500" style={{ width }} />
                </div>
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}

function ProfileHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  onShare,
}: {
  title: ReactNode
  subtitle: string
  onBack: () => void
  backLabel?: string
  onShare?: () => void
}) {
  const { t } = useI18n()
  const backText = backLabel ?? t('stats.backToStats')
  return (
    <section className={[uiGlassCard, 'px-3 py-2.5'].join(' ')}>
      <div className="flex items-center gap-2">
        <button type="button" className={['shrink-0 text-xs font-semibold', uiLink].join(' ')} onClick={onBack}>
          ← {backText}
        </button>
        {onShare ? (
          <Button variant="ghost" className="ml-auto min-h-8 px-2.5 py-1 text-xs" onClick={onShare}>
            {t('share.exportShort')}
          </Button>
        ) : null}
      </div>
      <div className="mt-1.5 min-w-0">
        <h2 className="truncate text-base font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-secondary">{subtitle}</p>
      </div>
    </section>
  )
}

function MiniStatGrid({ stat }: { stat: RecordStat | null }) {
  const { t } = useI18n()
  return (
    <section className="grid grid-cols-3 gap-3">
      <SummaryCard
        label={t('stats.winRate')}
        value={formatPercent(getDisplayWinRate(stat?.wins ?? 0, stat?.total ?? 0))}
        detail={getSampleLabel(stat?.total ?? 0)}
      />
      <SummaryCard label={t('stats.wins')} value={String(stat?.wins ?? 0)} />
      <SummaryCard
        label={t('stats.matchCount')}
        value={String(stat?.total ?? 0)}
        detail={getSampleLabel(stat?.total ?? 0)}
      />
    </section>
  )
}

function PlayerProfileView({
  player,
  allMatches,
  players,
  decks,
  language,
  achievementUnlocks,
  onBack,
  backLabel,
  onOpenDeck,
  onOpenPlayer,
}: {
  player: Player
  allMatches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  achievementUnlocks: ReturnType<typeof useAppStore.getState>['achievementUnlocks']
  onBack: () => void
  backLabel?: string
  onOpenDeck: (deckId: string) => void
  onOpenPlayer: (playerId: string) => void
}) {
  const { t } = useI18n()
  const [shareOpen, setShareOpen] = useState(false)
  const deckStats = buildPlayerDeckStats(players, decks, allMatches, language).filter(
    (item) => item.playerId === player.id,
  )
  const playerDeckIds = new Set(deckStats.map((item) => item.deckId))
  const relevantMatchups = buildMatchupStats(decks, allMatches, language).filter(
    (matchup) => playerDeckIds.has(matchup.deckAId) || playerDeckIds.has(matchup.deckBId),
  )

  return (
    <>
      <PlayerProfileHub
        player={player}
        allMatches={allMatches}
        players={players}
        decks={decks}
        language={language}
        achievementUnlocks={achievementUnlocks}
        onBack={onBack}
        backLabel={backLabel}
        onShare={() => setShareOpen(true)}
        onOpenDeck={onOpenDeck}
        renderFirstSecond={(scopeMatches) => <FirstSecondSection stats={buildFirstSecondStats(scopeMatches)} />}
        renderMatchups={
          <ProfileMatchupSection
            title={t('stats.matchup.analysis')}
            matchups={relevantMatchups}
            decks={decks}
            playerDeckIds={playerDeckIds}
          />
        }
        renderDeckRow={(stat, deck) => (
          <StatRow stat={{ ...stat, id: stat.deckId, name: stat.deckName }} deck={deck} />
        )}
        renderHeadToHeadRow={(stat) => (
          <StatRow stat={stat} onSelect={() => onOpenPlayer(stat.opponentId)} />
        )}
      />
      <ShareExportSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={player.name}
        filename={`opcg-profile-${player.name}.png`}
      >
        <PlayerShareCard
          player={player}
          matches={allMatches}
          players={players}
          decks={decks}
          language={language}
          achievementUnlocks={achievementUnlocks}
        />
      </ShareExportSheet>
    </>
  )
}

function DeckProfileView({
  deck,
  matches,
  players,
  decks,
  language,
  onBack,
  backLabel,
  onOpenPlayer,
}: {
  deck: Deck
  matches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  onBack: () => void
  backLabel?: string
  onOpenPlayer: (playerId: string) => void
}) {
  const { t } = useI18n()
  const deckMatches = getCompletedMatches(matches).filter(
    (match) => match.deck1Id === deck.id || match.deck2Id === deck.id,
  )
  const stat = buildDeckStats(decks, matches, language).find((item) => item.id === deck.id) ?? null
  const pilotStats = buildPlayerDeckStats(players, decks, matches, language).filter(
    (item) => item.deckId === deck.id,
  )
  const relevantMatchups = buildMatchupStats(decks, matches, language).filter(
    (matchup) => matchup.deckAId === deck.id || matchup.deckBId === deck.id,
  )

  return (
    <div className="space-y-4">
      <ProfileHeader
        title={<DeckLabel deck={deck} showCode className="inline-flex" />}
        subtitle={t('stats.deckAppearances').replace('{n}', String(deckMatches.length))}
        onBack={onBack}
        backLabel={backLabel}
      />
      <MiniStatGrid stat={stat} />
      <FirstSecondSection stats={buildFirstSecondStats(deckMatches)} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('stats.pilotPerformance')}</h2>
        {pilotStats.length ? (
          pilotStats.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onOpenPlayer(item.playerId)}
            >
              <StatRow stat={{ ...item, id: item.playerId, name: item.playerName }} />
            </button>
          ))
        ) : (
          <EmptyState>{t('stats.pilotEmpty')}</EmptyState>
        )}
      </section>
      <ProfileMatchupSection
        title={t('stats.matchup.analysis')}
        matchups={relevantMatchups}
        decks={decks}
        anchorDeckId={deck.id}
      />
    </div>
  )
}

export function StatsPage() {
  const { language, t } = useI18n()
  const settings = useAppStore((state) => state.settings)
  const linkedPlayer = useAppStore((state) => getLinkedPlayer(state))
  const achievementUnlocks = useAppStore((state) => state.achievementUnlocks)
  const sessions = useAppStore((state) => state.sessions)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const currentSession = sessions.find((session) => session.id === currentSessionId) ?? null
  const initialScope =
    settings.statsDefaultScope === 'profile' && linkedPlayer
      ? 'all'
      : settings.statsDefaultScope === 'all'
        ? 'all'
        : 'session'
  const [scope, setScope] = useState<'session' | 'all'>(initialScope)
  const [activeSection, setActiveSection] = useState<StatsSectionId>('overview')
  const [profileStack, setProfileStack] = useState<ProfileNavTarget[]>(() =>
    settings.statsDefaultScope === 'profile' && linkedPlayer
      ? [{ type: 'player', id: linkedPlayer.id }]
      : [],
  )
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [sessionShareOpen, setSessionShareOpen] = useState(false)
  const listScrollY = useRef(0)
  const sectionScrollY = useRef<Partial<Record<StatsSectionId, number>>>({})
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const allMatches = useAppStore((state) => state.matches)

  useEffect(() => {
    const snapshot = useAppStore.getState()
    if (!hasPersonalProfile(snapshot)) {
      setProfileSheetOpen(true)
      return
    }
    if (snapshot.settings.lastGroupCode && !getLinkedPlayer(snapshot)) {
      setProfileSheetOpen(true)
    }
  }, [settings.lastGroupCode, linkedPlayer, settings.profileIdentityId])

  const statsScope = useMemo((): StatsScope => {
    if (scope === 'session' && currentSessionId) {
      return { type: 'session', sessionId: currentSessionId }
    }
    return { type: 'all' }
  }, [scope, currentSessionId])

  const {
    scopedMatches,
    dashboard,
    playerStats,
    deckStats,
    playerDeckStats,
    matchupStats,
    playerMatchupStats,
    metaSummary,
    firstSecondStats,
    globalRecentForm,
  } = useScopedStats(statsScope)
  const insights = useScopedInsights(statsScope)

  const averageMatchDurationMs = useMemo(
    () => getAverageMatchDurationMs(scopedMatches),
    [scopedMatches],
  )

  const weeklyDeckMetaStats = useMemo(
    () => buildWeeklyDeckMetaStats(decks, scopedMatches, language),
    [decks, scopedMatches, language],
  )

  const pilotLeaderboard = useMemo(
    () => sortPilotStatsForLeaderboard(playerDeckStats),
    [playerDeckStats],
  )

  const openProfile = (target: ProfileNavTarget) => {
    setProfileStack((prev) => {
      if (prev.length === 0) listScrollY.current = window.scrollY
      const last = prev[prev.length - 1]
      if (last?.type === target.type && last?.id === target.id) return prev
      return [...prev, target]
    })
    requestAnimationFrame(() => window.scrollTo(0, 0))
  }

  const handleProfileBack = () => {
    setProfileStack((prev) => {
      if (prev.length > 1) {
        requestAnimationFrame(() => window.scrollTo(0, 0))
        return prev.slice(0, -1)
      }
      requestAnimationFrame(() => window.scrollTo(0, listScrollY.current))
      return []
    })
  }

  const profileBackLabel = profileStack.length > 1 ? t('stats.back') : t('stats.backToStats')

  const changeSection = (section: StatsSectionId) => {
    sectionScrollY.current[activeSection] = window.scrollY
    setActiveSection(section)
    requestAnimationFrame(() => window.scrollTo(0, sectionScrollY.current[section] ?? 0))
  }
  const profileTarget = profileStack[profileStack.length - 1] ?? null
  const selectedPlayer =
    profileTarget?.type === 'player'
      ? players.find((player) => player.id === profileTarget.id) ?? null
      : null
  const selectedDeck =
    profileTarget?.type === 'deck'
      ? decks.find((deck) => deck.id === profileTarget.id) ?? null
      : null

  if (selectedPlayer) {
    return (
      <>
        <PlayerProfileView
          player={selectedPlayer}
          allMatches={allMatches}
          players={players}
          decks={decks}
          language={language}
          achievementUnlocks={achievementUnlocks}
          onBack={handleProfileBack}
          backLabel={profileBackLabel}
          onOpenDeck={(deckId) => openProfile({ type: 'deck', id: deckId })}
          onOpenPlayer={(playerId) => openProfile({ type: 'player', id: playerId })}
        />
        <ProfileLinkSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
      </>
    )
  }

  if (selectedDeck) {
    return (
      <DeckProfileView
        deck={selectedDeck}
        matches={scopedMatches}
        players={players}
        decks={decks}
        language={language}
        onBack={handleProfileBack}
        backLabel={profileBackLabel}
        onOpenPlayer={(playerId) => openProfile({ type: 'player', id: playerId })}
      />
    )
  }

  return (
    <div className="space-y-4">
      {linkedPlayer ? (
        <section className={[uiGlassCard, 'flex items-center justify-between gap-3 p-4'].join(' ')}>
          <div>
            <p className="text-xs text-text-secondary">{t('profile.myProfile')}</p>
            <p className="text-lg font-bold">{linkedPlayer.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="min-h-9 px-3 py-1.5 text-sm" onClick={() => openProfile({ type: 'player', id: linkedPlayer.id })}>
              {t('profile.openProfile')}
            </Button>
            {scope === 'session' && currentSession ? (
              <Button variant="ghost" className="min-h-9 px-3 py-1.5 text-sm" onClick={() => setSessionShareOpen(true)}>
                {t('share.sessionShort')}
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className={[uiGlassCard, 'space-y-3 p-4'].join(' ')}>
          <p className="text-sm text-text-secondary">{t('profile.statsPrompt')}</p>
          <Button fullWidth onClick={() => setProfileSheetOpen(true)}>
            {t('profile.setupCta')}
          </Button>
        </section>
      )}

      <SegmentedControl
        className="grid-cols-2"
        value={scope}
        onChange={(value) => {
          setScope(value)
          setProfileStack([])
        }}
        options={[
          { value: 'session', label: t('stats.currentSession') },
          { value: 'all', label: t('stats.allData') },
        ]}
      />

      <SectionTabs activeSection={activeSection} onChange={changeSection} />

      {activeSection === 'overview' ? (
        <>
          <section className="grid grid-cols-3 gap-2">
            <SummaryCard label={t('stats.totalMatches')} value={String(dashboard.totalMatches)} />
            {averageMatchDurationMs !== null ? (
              <SummaryCard
                label={t('stats.avgMatchDuration')}
                value={formatMatchDuration(averageMatchDurationMs)}
                detail={t('stats.avgMatchDurationDetail')}
              />
            ) : null}
            {dashboard.firstPlayerSample > 0 ? (
              <SummaryCard
                label={t('stats.firstWinRate')}
                value={formatPercent(
                  getDisplayWinRateFromRaw(dashboard.firstPlayerWinRate, dashboard.firstPlayerSample),
                )}
                detail={getSampleLabel(dashboard.firstPlayerSample)}
              />
            ) : null}
            {dashboard.topPlayer ? (
              <SummaryCard
                label={t('stats.mvp')}
                value={dashboard.topPlayer.name}
                detail={`${formatPercent(getDisplayWinRate(dashboard.topPlayer.wins, dashboard.topPlayer.total))} · ${dashboard.topPlayer.wins}W-${dashboard.topPlayer.losses}L`}
              />
            ) : null}
          </section>
          <MetaSummarySection summary={metaSummary} />
          <StatsReadingGuide />
          <MetaTransferChart stats={weeklyDeckMetaStats} title={t('stats.metaTransfer')} compact />
          <FirstSecondSection stats={firstSecondStats} />
          <RecentFormSection recentForm={globalRecentForm} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <MiniLeaderboard
              title={t('stats.pilotsTop5')}
              subtitle={t('stats.pilotsTop5Hint')}
              variant="pilot"
              pilotStats={pilotLeaderboard}
              decks={decks}
              onSelectPilot={(stat) => openProfile({ type: 'player', id: stat.playerId })}
            />
            <MiniLeaderboard
              title={t('stats.playersTop5')}
              stats={playerStats}
              onSelect={(stat) => openProfile({ type: 'player', id: stat.id })}
            />
            <MiniLeaderboard
              title={t('stats.decksTop5')}
              stats={sortStatsByWeightedWinRate(deckStats)}
              decks={decks}
              variant="deck"
              onSelect={(stat) => openProfile({ type: 'deck', id: stat.id })}
            />
          </div>
          <InsightsSection insights={insights} />
          <section className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={[uiCardInteractive, 'p-3 text-left'].join(' ')}
              onClick={() => changeSection('players')}
            >
              <p className="text-sm text-text-secondary">{t('stats.diveIn')}</p>
              <h2 className="mt-1 text-lg font-bold">{t('stats.playerProfiles')}</h2>
              <div className="mt-3 h-2 rounded-full bg-brand-500/70" />
            </button>
            <button
              type="button"
              className={[uiCardInteractive, 'p-3 text-left'].join(' ')}
              onClick={() => changeSection('decks')}
            >
              <p className="text-sm text-text-secondary">{t('stats.diveIn')}</p>
              <h2 className="mt-1 text-lg font-bold">{t('stats.deckProfiles')}</h2>
              <div className="mt-3 h-2 rounded-full bg-emerald-500/70" />
            </button>
          </section>
        </>
      ) : null}

      {activeSection === 'players' ? (
        <>
          <PlayerMatchupHeatmap matchups={playerMatchupStats} />
          <StatSection
            title={t('stats.playerList')}
            stats={playerStats}
            onSelect={(stat) => openProfile({ type: 'player', id: stat.id })}
          />
          <PlayerDeckSection stats={playerDeckStats} decks={decks} />
        </>
      ) : null}

      {activeSection === 'decks' ? (
        <>
          <MatchupHeatmap matchups={matchupStats} decks={decks} title={t('stats.matchup.deckMatrix')} />
          <DeckListSection
            stats={deckStats}
            decks={decks}
            onSelectDeck={(deckId) => openProfile({ type: 'deck', id: deckId })}
          />
        </>
      ) : null}

      <ProfileLinkSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
      {currentSession ? (
        <ShareExportSheet
          open={sessionShareOpen}
          onClose={() => setSessionShareOpen(false)}
          title={currentSession.name}
          filename={`opcg-session-${currentSession.name}.png`}
        >
          <SessionDashboardShareCard
            session={currentSession}
            players={players}
            decks={decks}
            matches={scopedMatches}
            language={language}
          />
        </ShareExportSheet>
      ) : null}
    </div>
  )
}
