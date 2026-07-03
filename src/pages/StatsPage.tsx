import { useState, type ReactNode } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { useI18n } from '@/lib/i18n'
import {
  buildDashboardStats,
  buildDeckStats,
  buildFirstSecondStats,
  buildInsightMessages,
  buildMatchupStats,
  buildPlayerDeckStats,
  buildPlayerStats,
  buildRecentForm,
  formatPercent,
  sortStatsByUsage,
  type FirstSecondStat,
  type MatchupStat,
  type PlayerDeckStat,
  type RecordStat,
} from '@/lib/stats'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Language, Match, Player } from '@/types'

type StatsSectionId = 'overview' | 'players' | 'decks' | 'matchups'
type ProfileTarget = { type: 'player' | 'deck'; id: string } | null

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
    <article className={['rounded-2xl bg-surface-elevated', featured ? 'p-4' : 'p-3'].join(' ')}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">{label}</p>
      <p className={['mt-2 font-bold', featured ? 'text-4xl' : 'text-2xl'].join(' ')}>{value}</p>
      {detail ? <p className="mt-1 text-sm text-text-secondary">{detail}</p> : null}
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
    <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
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
  const sections: Array<{ id: StatsSectionId; label: string }> = [
    { id: 'overview', label: '總覽' },
    { id: 'players', label: '玩家' },
    { id: 'decks', label: '牌組' },
    { id: 'matchups', label: '對位' },
  ]

  return (
    <section className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-elevated p-2">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={[
            'rounded-xl px-2 py-3 text-sm font-semibold',
            activeSection === section.id ? 'bg-brand-600 text-white' : 'text-text-secondary',
          ].join(' ')}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </button>
      ))}
    </section>
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
    <article className="rounded-2xl bg-surface-elevated p-4">
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
        <h2 className="text-lg font-semibold">{title}</h2>
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

function DonutChart({ stats, decks }: { stats: RecordStat[]; decks: Deck[] }) {
  const usageSorted = sortStatsByUsage(stats)
  const topStats = usageSorted.slice(0, 5)
  const otherTotal = Math.max(
    0,
    usageSorted.slice(5).reduce((sum, stat) => sum + stat.total, 0),
  )
  const slices = otherTotal
    ? [...topStats, { id: 'other', name: '其他', total: otherTotal, wins: 0, losses: 0, winRate: null }]
    : topStats
  const total = slices.reduce((sum, stat) => sum + stat.total, 0)
  const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#eab308', '#64748b']
  let cursor = 0
  const gradient = slices.length
    ? slices
        .map((slice, index) => {
          const start = cursor
          const end = cursor + (slice.total / total) * 100
          cursor = end
          return `${colors[index % colors.length]} ${start}% ${end}%`
        })
        .join(', ')
    : '#334155 0% 100%'

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">牌組分佈</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          出場比例
        </span>
      </div>
      <article className="rounded-2xl bg-surface-elevated p-4">
        {total ? (
          <div className="flex items-center gap-5">
            <div
              className="grid h-32 w-32 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(${gradient})` }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-surface-elevated text-center">
                <span className="text-xs text-text-secondary">
                  總出場
                  <strong className="block text-xl text-text-primary">{total}</strong>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {slices.map((slice, index) => (
                <div key={slice.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="truncate">
                      {slice.id === 'other' ? (
                        slice.name
                      ) : (
                        <DeckLabel deck={decks.find((deck) => deck.id === slice.id)} showCode />
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-text-secondary">
                    {((slice.total / total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">完成對局後會顯示環境分佈。</p>
        )}
      </article>
    </section>
  )
}

function MatchupRow({ matchup, decks }: { matchup: MatchupStat; decks: Deck[] }) {
  const deckA = decks.find((deck) => deck.id === matchup.deckAId)
  const deckB = decks.find((deck) => deck.id === matchup.deckBId)
  const displayWinRate = getDisplayWinRate(matchup.deckAWinRate, matchup.total)
  const verdict = getMatchupVerdict(matchup.deckAWinRate, matchup.total)
  const rateClass =
    displayWinRate === null
      ? 'text-text-secondary'
      : displayWinRate >= 0.5
        ? 'text-success'
        : 'text-text-secondary'

  return (
    <article className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold">
            <DeckLabel deck={deckA} showCode className="inline-flex min-w-0" />
          </h3>
          <p className="text-sm text-text-secondary">
            vs <DeckLabel deck={deckB} showCode className="inline-flex min-w-0" />
          </p>
        </div>
        <span className={`text-right text-sm font-semibold ${rateClass}`}>
          {matchup.deckAWins}-{matchup.deckBWins}
          <span className="block">{formatPercent(displayWinRate)}</span>
        </span>
      </div>
      <p className="mt-2 text-xs text-text-secondary">{verdict} · {getSampleLabel(matchup.total)}</p>
    </article>
  )
}

function MatchupHeatmap({ matchups, decks }: { matchups: MatchupStat[]; decks: Deck[] }) {
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

  const topDecks = [...deckTotals.values()].sort((left, right) => right.total - left.total).slice(0, 6)

  function getCell(rowId: string, columnId: string) {
    if (rowId === columnId) return null
    const [deckAId, deckBId] = [rowId, columnId].sort()
    const matchup = matchupByPair.get(`${deckAId}:${deckBId}`)
    if (!matchup || matchup.deckAWinRate === null) return null

    const rowIsDeckA = rowId === matchup.deckAId
    const winRate = rowIsDeckA ? matchup.deckAWinRate : 1 - matchup.deckAWinRate
    const wins = rowIsDeckA ? matchup.deckAWins : matchup.deckBWins

    return { winRate, wins, total: matchup.total }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">對位 Heatmap</h2>
        <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
          結論 / 場數
        </span>
      </div>
      <article className="overflow-x-auto rounded-2xl bg-surface-elevated p-4">
        {topDecks.length >= 2 ? (
          <div className="min-w-[520px]">
            <div
              className="grid gap-1 text-xs"
              style={{ gridTemplateColumns: `7.5rem repeat(${topDecks.length}, minmax(3.75rem, 1fr))` }}
            >
              <div />
              {topDecks.map((entry) => (
                <div key={entry.id} className="truncate px-1 text-center text-text-secondary">
                  <DeckLabel
                    deck={decks.find((deck) => deck.id === entry.id)}
                    showCode
                    className="inline-flex max-w-full justify-center text-[10px]"
                  />
                </div>
              ))}
              {topDecks.map((rowEntry) => (
                <div key={rowEntry.id} className="contents">
                  <div className="truncate py-2 pr-2 font-semibold">
                    <DeckLabel
                      deck={decks.find((deck) => deck.id === rowEntry.id)}
                      showCode
                      className="inline-flex max-w-full text-xs"
                    />
                  </div>
                  {topDecks.map((columnEntry) => {
                    const cell = getCell(rowEntry.id, columnEntry.id)
                    const displayWinRate = cell ? getDisplayWinRate(cell.winRate, cell.total) : null

                    return (
                      <div
                        key={`${rowEntry.id}:${columnEntry.id}`}
                        className="grid min-h-14 place-items-center rounded-xl px-1 text-center"
                        style={{ backgroundColor: getWinRateColor(displayWinRate) }}
                        title={cell ? `${getSampleLabel(cell.total)} ${formatPercent(displayWinRate)}` : '未有對局'}
                      >
                        {cell ? (
                          <span className="text-[11px] font-semibold">
                            {displayWinRate === null ? '不足' : formatPercent(displayWinRate)}
                            <span className="block font-normal text-text-secondary">{cell.total}場</span>
                          </span>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">少於 3 場標示資料不足；綠色優勢，紅色劣勢。</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">完成兩種以上牌組對局後會顯示對位矩陣。</p>
        )}
      </article>
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
    <section className="rounded-2xl bg-surface-elevated p-3">
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

function InsightsSection({
  players,
  decks,
  matches,
  language,
}: {
  players: Player[]
  decks: Deck[]
  matches: Match[]
  language: Language
}) {
  const insights = buildInsightMessages(players, decks, matches, language)
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
      <article className="rounded-2xl bg-surface-elevated p-4">
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
            <article key={stat.label} className="rounded-2xl bg-surface-elevated p-4">
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
      {stats.slice(0, 12).map((stat) => (
        <article key={stat.id} className="rounded-2xl bg-surface-elevated p-4">
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

function RecentFormSection({ recentForm }: { recentForm: ReturnType<typeof buildRecentForm> }) {
  const visibleForms = recentForm.filter((form) => form.total > 0 && form.winRate !== null)
  if (!visibleForms.length) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">近期形態</h2>
      <article className="rounded-2xl bg-surface-elevated p-4">
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
}: {
  title: ReactNode
  subtitle: string
  onBack: () => void
}) {
  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <button type="button" className="text-sm font-semibold text-brand-400" onClick={onBack}>
        ← 返回統計
      </button>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
        Profile
      </p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
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
  matches,
  players,
  decks,
  language,
  onBack,
  onOpenDeck,
}: {
  player: Player
  matches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  onBack: () => void
  onOpenDeck: (deckId: string) => void
}) {
  const playerMatches = matches.filter(
    (match) => match.player1Id === player.id || match.player2Id === player.id,
  )
  const stat = buildPlayerStats(players, matches).find((item) => item.id === player.id) ?? null
  const deckStats = buildPlayerDeckStats(players, decks, matches, language).filter(
    (item) => item.playerId === player.id,
  )
  const playerDeckIds = new Set(deckStats.map((item) => item.deckId))
  const relevantMatchups = buildMatchupStats(decks, matches, language).filter(
    (matchup) => playerDeckIds.has(matchup.deckAId) || playerDeckIds.has(matchup.deckBId),
  )

  return (
    <div className="space-y-4">
      <ProfileHeader
        title={player.name}
        subtitle={`玩家資料 · ${playerMatches.length} 場對局`}
        onBack={onBack}
      />
      <MiniStatGrid stat={stat} />
      <RecentFormSection recentForm={buildRecentForm(matches, player.id)} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">使用牌組</h2>
        {deckStats.length ? (
          deckStats.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onOpenDeck(item.deckId)}
            >
              <StatRow
                stat={{ ...item, id: item.deckId, name: item.deckName }}
                deck={decks.find((deck) => deck.id === item.deckId)}
              />
            </button>
          ))
        ) : (
          <EmptyState>此玩家未有牌組數據。</EmptyState>
        )}
      </section>
      <FirstSecondSection stats={buildFirstSecondStats(playerMatches)} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">相關對位</h2>
        {relevantMatchups.length ? (
          relevantMatchups.slice(0, 8).map((matchup) => (
            <MatchupRow key={matchup.key} matchup={matchup} decks={decks} />
          ))
        ) : (
          <EmptyState>此玩家暫時未有可分析對位。</EmptyState>
        )}
      </section>
    </div>
  )
}

function DeckProfileView({
  deck,
  matches,
  players,
  decks,
  language,
  onBack,
  onOpenPlayer,
}: {
  deck: Deck
  matches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  onBack: () => void
  onOpenPlayer: (playerId: string) => void
}) {
  const deckMatches = matches.filter((match) => match.deck1Id === deck.id || match.deck2Id === deck.id)
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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">牌組對位</h2>
        {relevantMatchups.length ? (
          relevantMatchups.map((matchup) => <MatchupRow key={matchup.key} matchup={matchup} decks={decks} />)
        ) : (
          <EmptyState>此牌組暫時未有 matchup 數據。</EmptyState>
        )}
      </section>
    </div>
  )
}

export function StatsPage() {
  const { language, t } = useI18n()
  const [scope, setScope] = useState<'session' | 'all'>('session')
  const [activeSection, setActiveSection] = useState<StatsSectionId>('overview')
  const [profileTarget, setProfileTarget] = useState<ProfileTarget>(null)
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const matches = useAppStore((state) => state.matches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const scopedMatches =
    scope === 'session' && currentSessionId
      ? matches.filter((match) => match.sessionId === currentSessionId)
      : matches
  const dashboard = buildDashboardStats(players, decks, scopedMatches, language)
  const playerStats = buildPlayerStats(players, scopedMatches)
  const deckStats = buildDeckStats(decks, scopedMatches, language)
  const matchupStats = buildMatchupStats(decks, scopedMatches, language)
  const playerDeckStats = buildPlayerDeckStats(players, decks, scopedMatches, language)
  const firstSecondStats = buildFirstSecondStats(scopedMatches)
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
      <PlayerProfileView
        player={selectedPlayer}
        matches={scopedMatches}
        players={players}
        decks={decks}
        language={language}
        onBack={() => setProfileTarget(null)}
        onOpenDeck={(deckId) => setProfileTarget({ type: 'deck', id: deckId })}
      />
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
        onBack={() => setProfileTarget(null)}
        onOpenPlayer={(playerId) => setProfileTarget({ type: 'player', id: playerId })}
      />
    )
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-elevated p-2">
        <button
          type="button"
          className={[
            'rounded-xl px-3 py-3 text-sm font-semibold',
            scope === 'session' ? 'bg-brand-600 text-white' : 'text-text-secondary',
          ].join(' ')}
          onClick={() => {
            setScope('session')
            setProfileTarget(null)
          }}
        >
          {t('stats.currentSession')}
        </button>
        <button
          type="button"
          className={[
            'rounded-xl px-3 py-3 text-sm font-semibold',
            scope === 'all' ? 'bg-brand-600 text-white' : 'text-text-secondary',
          ].join(' ')}
          onClick={() => {
            setScope('all')
            setProfileTarget(null)
          }}
        >
          {t('stats.allData')}
        </button>
      </section>

      <SectionTabs activeSection={activeSection} onChange={setActiveSection} />

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
                detail={`${dashboard.topPlayer.wins}W`}
              />
            ) : null}
          </section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniLeaderboard
              title="玩家 Top 5"
              stats={playerStats}
              onSelect={(stat) => setProfileTarget({ type: 'player', id: stat.id })}
            />
            <MiniLeaderboard
              title="牌組 Top 5（出場）"
              stats={sortStatsByUsage(deckStats)}
              decks={decks}
              variant="deck"
              onSelect={(stat) => setProfileTarget({ type: 'deck', id: stat.id })}
            />
          </div>
          <InsightsSection players={players} decks={decks} matches={scopedMatches} language={language} />
          <section className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="rounded-2xl bg-surface-elevated p-3 text-left"
              onClick={() => setActiveSection('players')}
            >
              <p className="text-sm text-text-secondary">深入查看</p>
              <h2 className="mt-1 text-lg font-bold">玩家檔案</h2>
              <div className="mt-3 h-2 rounded-full bg-brand-500/70" />
            </button>
            <button
              type="button"
              className="rounded-2xl bg-surface-elevated p-3 text-left"
              onClick={() => setActiveSection('decks')}
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
          <StatSection
            title="玩家列表"
            stats={playerStats}
            onSelect={(stat) => setProfileTarget({ type: 'player', id: stat.id })}
          />
          <PlayerDeckSection stats={playerDeckStats.slice(0, 8)} decks={decks} />
        </>
      ) : null}

      {activeSection === 'decks' ? (
        <>
          <DonutChart stats={deckStats} decks={decks} />
          <StatSection
            title="牌組列表"
            stats={sortStatsByUsage(deckStats)}
            decks={decks}
            variant="deck"
            onSelect={(stat) => setProfileTarget({ type: 'deck', id: stat.id })}
          />
        </>
      ) : null}

      {activeSection === 'matchups' ? (
        <>
          <MatchupHeatmap matchups={matchupStats} decks={decks} />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">常見對位</h2>
              <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
                {matchupStats.length} 組
              </span>
            </div>
            {matchupStats.length ? (
              matchupStats.slice(0, 16).map((matchup) => (
                <MatchupRow key={matchup.key} matchup={matchup} decks={decks} />
              ))
            ) : (
              <EmptyState>完成不同牌組之間的對局後會顯示 matchup。</EmptyState>
            )}
          </section>
          <FirstSecondSection stats={firstSecondStats} />
        </>
      ) : null}
    </div>
  )
}
