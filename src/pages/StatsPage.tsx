import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlayerProfileHub } from '@/components/profile/PlayerProfileHub'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { ProfileLinkSheet } from '@/components/profile/ProfileLinkSheet'
import { PlayerShareCard, SessionDashboardShareCard, ShareExportSheet } from '@/components/share/ShareExportSheet'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { getLinkedPlayer } from '@/lib/profileClaim'
import { useI18n } from '@/lib/i18n'
import { uiCard, uiCardInteractive, uiGlassCard, uiLink, uiSectionTitle } from '@/lib/uiSurface'
import {
  buildDeckStats,
  buildFirstSecondStats,
  buildMatchupStats,
  buildPlayerDeckStats,
  formatPercent,
  getCompletedMatches,
  sortStatsByUsage,
  sortStatsByWeightedWinRate,
  type FirstSecondStat,
  type InsightMessage,
  type MatchupStat,
  type MetaSummaryStats,
  type PlayerDeckStat,
  type PlayerMatchupStat,
  type RecentFormStat,
  type RecordStat,
} from '@/lib/stats'
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

function getWinRateColor(winRate: number | null): string {
  if (winRate === null) return 'rgba(71, 85, 105, 0.35)'
  const opacity = 0.24 + Math.abs(winRate - 0.5) * 1.3
  return winRate >= 0.5 ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`
}

function getSampleLabel(total: number): string {
  if (total === 0) return ''
  if (total < 3) return `資料不足 · ${total}場`
  if (total <= 5) return `初步 · ${total}場`
  if (total <= 10) return `可參考 · ${total}場`
  return `可信 · ${total}場`
}

function getDisplayWinRate(winRate: number | null, total: number): number | null {
  return total > 0 ? winRate : null
}

function getMatchupVerdict(winRate: number | null, total: number): string {
  if (total < 3 || winRate === null) return '資料不足'
  if (winRate >= 0.6) return '優勢'
  if (winRate <= 0.4) return '劣勢'
  return '接近'
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
  return (
    <SegmentedControl
      className="grid-cols-3"
      value={activeSection}
      onChange={onChange}
      options={[
        { value: 'overview', label: '總覽' },
        { value: 'players', label: '玩家' },
        { value: 'decks', label: '牌組' },
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
  const displayWinRate = getDisplayWinRate(stat.winRate, stat.total)
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
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{title}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {stats.length} 項
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
        <EmptyState>完成對局後會顯示統計。</EmptyState>
      )}
    </section>
  )
}

function HeatmapCell({
  displayWinRate,
  wins,
  losses,
}: {
  displayWinRate: number | null
  wins: number
  losses: number
}) {
  return (
    <span className="text-[10px] font-semibold leading-tight">
      {displayWinRate === null ? '不足' : formatPercent(displayWinRate)}
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
  const deckA = decks.find((deck) => deck.id === matchup.deckAId)
  const deckB = decks.find((deck) => deck.id === matchup.deckBId)
  const anchorIsB = anchorDeckId === matchup.deckBId
  const selfDeck = anchorIsB ? deckB : deckA
  const oppDeck = anchorIsB ? deckA : deckB
  const selfWinRate =
    anchorIsB && matchup.deckAWinRate !== null ? 1 - matchup.deckAWinRate : matchup.deckAWinRate
  const selfWins = anchorIsB ? matchup.deckBWins : matchup.deckAWins
  const oppWins = anchorIsB ? matchup.deckAWins : matchup.deckBWins
  const displayWinRate = getDisplayWinRate(selfWinRate, matchup.total)
  const verdict = getMatchupVerdict(selfWinRate, matchup.total)
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
            <p className="text-xs text-text-secondary">對手牌組</p>
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
  title = '對位表',
  deckIds,
}: {
  matchups: MatchupStat[]
  decks: Deck[]
  maxDecks?: number
  title?: string
  deckIds?: string[]
}) {
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
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          勝率 / W-L
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
                    const displayWinRate = cell ? getDisplayWinRate(cell.winRate, cell.total) : null

                    return (
                      <div
                        key={`${rowEntry.id}:${columnEntry.id}`}
                        className="grid min-h-11 place-items-center rounded-lg px-0.5 text-center"
                        style={{ backgroundColor: getWinRateColor(displayWinRate) }}
                        title={
                          cell
                            ? `${getSampleLabel(cell.total)} ${formatPercent(displayWinRate)} · ${cell.wins}W-${cell.losses}L`
                            : '未有對局'
                        }
                      >
                        {cell ? (
                          <HeatmapCell
                            displayWinRate={displayWinRate}
                            wins={cell.wins}
                            losses={cell.losses}
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
            <p className="mt-3 text-xs text-text-secondary">少於 3 場標示資料不足；綠色優勢，紅色劣勢。左右滑動可查看更多牌組。</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">完成兩種以上牌組對局後會顯示對位矩陣。</p>
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
        <h2 className="text-lg font-semibold">玩家對位表</h2>
        <span className="shrink-0 rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          勝率 / W-L
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
                    const displayWinRate = cell ? getDisplayWinRate(cell.winRate, cell.total) : null

                    return (
                      <div
                        key={`${rowEntry.id}:${columnEntry.id}`}
                        className="grid min-h-11 place-items-center rounded-lg px-0.5 text-center"
                        style={{ backgroundColor: getWinRateColor(displayWinRate) }}
                        title={
                          cell
                            ? `${getSampleLabel(cell.total)} ${formatPercent(displayWinRate)} · ${cell.wins}W-${cell.losses}L`
                            : '未有對局'
                        }
                      >
                        {cell ? (
                          <HeatmapCell
                            displayWinRate={displayWinRate}
                            wins={cell.wins}
                            losses={cell.losses}
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
          <p className="text-sm text-text-secondary">完成兩位以上玩家的對局後會顯示對位矩陣。</p>
        )}
      </article>
    </section>
  )
}

function MetaSummarySection({ summary }: { summary: MetaSummaryStats }) {
  if (!summary.totalMatches) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">環境概覽</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="總場數" value={String(summary.totalMatches)} />
        <SummaryCard label="活躍玩家" value={String(summary.uniquePlayers)} />
        <SummaryCard label="牌組種類" value={String(summary.uniqueDecks)} />
        <SummaryCard label="Meta 多樣度" value={`${summary.diversityPercent}%`} detail="牌組數 / 總場數" />
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
  const sorted = sortStatsByUsage(stats)
  const totalAppearances = sorted.reduce((sum, stat) => sum + stat.total, 0)
  if (!sorted.length || !totalAppearances) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">牌組列表</h2>
        <EmptyState>完成對局後會顯示牌組統計。</EmptyState>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">牌組列表</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {sorted.length} 項 · 總出場 {totalAppearances}
        </span>
      </div>
      <article className={[uiCard, 'divide-y divide-white/[0.06] overflow-hidden'].join(' ')}>
        {sorted.map((stat) => {
          const usage = (stat.total / totalAppearances) * 100
          const deck = decks.find((item) => item.id === stat.id)
          const tag =
            stat.total >= 3 && (stat.winRate ?? 0) >= 0.6
              ? '強勢'
              : stat.total >= 3 && (stat.winRate ?? 0) <= 0.4
                ? '弱勢'
                : stat.total >= 3
                  ? '平均'
                  : '樣本不足'

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
                  {formatPercent(getDisplayWinRate(stat.winRate, stat.total))}
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
        <EmptyState>暫時未有可分析對位。</EmptyState>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {sorted.length} 組
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
  const top = stats.slice(0, 5)
  if (!top.length) return null

  return (
    <section className={[uiCard, 'p-3'].join(' ')}>
      <h3 className="text-sm font-semibold text-brand-500">{title}</h3>
      <ol className="mt-2 space-y-1.5">
        {top.map((stat, index) => (
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
                {formatPercent(getDisplayWinRate(stat.winRate, stat.total))}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function InsightsSection({ insights }: { insights: InsightMessage[] }) {
  if (!insights.length) return null

  return (
    <section className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25">
      <h2 className="text-lg font-semibold">今晚 Insights</h2>
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

function FirstSecondSection({ stats }: { stats: FirstSecondStat[] }) {
  const first = stats.find((stat) => stat.label === '先攻')
  const second = stats.find((stat) => stat.label === '後攻')
  const firstWinRate = getDisplayWinRate(first?.winRate ?? null, first?.total ?? 0)
  const secondWinRate = getDisplayWinRate(second?.winRate ?? null, second?.total ?? 0)
  const firstPercent = firstWinRate ? firstWinRate * 100 : 0
  const secondPercent = secondWinRate ? secondWinRate * 100 : 0

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">先後攻拆分</h2>
      <article className={[uiCard, 'p-4'].join(' ')}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">先攻勝率</span>
          <strong>{formatPercent(firstWinRate)}</strong>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${firstPercent}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-text-secondary">後攻勝率</span>
          <strong>{formatPercent(secondWinRate)}</strong>
        </div>
        <div className="mt-2 h-4 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${secondPercent}%` }} />
        </div>
      </article>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const displayWinRate = getDisplayWinRate(stat.winRate, stat.total)
          return (
            <article key={stat.label} className={[uiCard, 'p-4'].join(' ')}>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold">{formatPercent(displayWinRate)}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {stat.wins}W · {getSampleLabel(stat.total)}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PlayerDeckSection({ stats, decks }: { stats: PlayerDeckStat[]; decks: Deck[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">玩家 × 牌組</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          {stats.length} 組
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
              {formatPercent(getDisplayWinRate(stat.winRate, stat.total))}
              <span className="block text-sm font-normal text-text-secondary">
                {getSampleLabel(stat.total)}
              </span>
            </span>
          </div>
        </article>
      ))}
      {!stats.length ? (
        <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
          完成對局後會顯示每位玩家使用不同牌組的表現。
        </div>
      ) : null}
    </section>
  )
}

function RecentFormSection({ recentForm }: { recentForm: RecentFormStat[] }) {
  const visibleForms = recentForm.filter((form) => form.total > 0 && form.winRate !== null)
  if (!visibleForms.length) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">近期形態</h2>
      <article className={[uiCard, 'p-4'].join(' ')}>
        <div className="space-y-3">
          {visibleForms.map((form) => {
            const width = `${Math.round((form.winRate ?? 0) * 100)}%`

            return (
              <div key={form.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{form.label.replace(' 場', '')}</span>
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
  return (
    <section className="grid grid-cols-3 gap-3">
      <SummaryCard
        label="勝率"
        value={formatPercent(getDisplayWinRate(stat?.winRate ?? null, stat?.total ?? 0))}
        detail={getSampleLabel(stat?.total ?? 0)}
      />
      <SummaryCard label="勝場" value={String(stat?.wins ?? 0)} />
      <SummaryCard label="場數" value={String(stat?.total ?? 0)} detail={getSampleLabel(stat?.total ?? 0)} />
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
            title="對位分析"
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
        subtitle={`${deckMatches.length} 次出場`}
        onBack={onBack}
        backLabel={backLabel}
      />
      <MiniStatGrid stat={stat} />
      <FirstSecondSection stats={buildFirstSecondStats(deckMatches)} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">使用者表現</h2>
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
          <EmptyState>此牌組暫時未有玩家使用數據。</EmptyState>
        )}
      </section>
      <ProfileMatchupSection
        title="對位分析"
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
    if (!settings.profileIdentityId && !linkedPlayer) {
      setProfileSheetOpen(true)
    }
  }, [settings.profileIdentityId, linkedPlayer])

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
            <SummaryCard label="總場數" value={String(dashboard.totalMatches)} />
            {dashboard.firstPlayerSample > 0 ? (
              <SummaryCard
                label="先攻勝率"
                value={formatPercent(
                  getDisplayWinRate(dashboard.firstPlayerWinRate, dashboard.firstPlayerSample),
                )}
                detail={getSampleLabel(dashboard.firstPlayerSample)}
              />
            ) : null}
            {dashboard.topPlayer ? (
              <SummaryCard
                label="MVP"
                value={dashboard.topPlayer.name}
                detail={`${formatPercent(dashboard.topPlayer.winRate)} · ${dashboard.topPlayer.wins}W-${dashboard.topPlayer.losses}L`}
              />
            ) : null}
          </section>
          <MetaSummarySection summary={metaSummary} />
          <FirstSecondSection stats={firstSecondStats} />
          <RecentFormSection recentForm={globalRecentForm} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniLeaderboard
              title="玩家 Top 5"
              stats={playerStats}
              onSelect={(stat) => openProfile({ type: 'player', id: stat.id })}
            />
            <MiniLeaderboard
              title="牌組 Top 5（勝率）"
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
              <p className="text-sm text-text-secondary">深入查看</p>
              <h2 className="mt-1 text-lg font-bold">玩家檔案</h2>
              <div className="mt-3 h-2 rounded-full bg-brand-500/70" />
            </button>
            <button
              type="button"
              className={[uiCardInteractive, 'p-3 text-left'].join(' ')}
              onClick={() => changeSection('decks')}
            >
              <p className="text-sm text-text-secondary">深入查看</p>
              <h2 className="mt-1 text-lg font-bold">牌組檔案</h2>
              <div className="mt-3 h-2 rounded-full bg-emerald-500/70" />
            </button>
          </section>
        </>
      ) : null}

      {activeSection === 'players' ? (
        <>
          <PlayerMatchupHeatmap matchups={playerMatchupStats} />
          <StatSection
            title="玩家列表"
            stats={playerStats}
            onSelect={(stat) => openProfile({ type: 'player', id: stat.id })}
          />
          <PlayerDeckSection stats={playerDeckStats} decks={decks} />
        </>
      ) : null}

      {activeSection === 'decks' ? (
        <>
          <MatchupHeatmap matchups={matchupStats} decks={decks} title="牌組對位表" />
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
