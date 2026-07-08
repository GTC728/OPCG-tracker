import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { TurnOrderBadge, WinLossBadge } from '@/components/match/TurnOrderBadge'
import { shareElementAsPng } from '@/lib/shareExport'
import {
  getCompletedMatches,
  formatPercent,
  buildPlayerStats,
  buildWinStreakStats,
  buildHeadToHeadStats,
  buildFirstSecondStats,
  buildRecentForm,
  buildPlayerDeckStats,
  buildDashboardStats,
  buildMetaSummaryStats,
} from '@/lib/stats'
import {
  computeGlobalAchievementRates,
  computeAchievementSummary,
  getPlayerAchievementProgress,
} from '@/lib/achievements'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import type { AchievementUnlock, Deck, Language, Match, Player, Session } from '@/types'

function ShareCardFrame({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="share-export-card overflow-hidden rounded-xl border border-[var(--ui-border)] bg-[var(--color-surface-elevated)]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--color-surface-muted)]/25 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">OPCG Tracker</p>
        <h3 className="mt-1 text-lg font-bold">{title}</h3>
        <p className="text-xs text-text-secondary">{subtitle}</p>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  )
}

function ShareStatGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-[var(--ui-border)] bg-[var(--color-surface)] p-2">
          <p className="text-[10px] text-text-secondary">{item.label}</p>
          <p className="text-sm font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function ShareRowList({ title, rows }: { title: string; rows: Array<{ left: string; right: string }> }) {
  if (!rows.length) return null
  return (
    <section>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{title}</p>
      <ol className="space-y-1">
        {rows.map((row, index) => (
          <li
            key={`${row.left}-${index}`}
            className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs"
          >
            <span className="truncate font-medium">{row.left}</span>
            <span className="shrink-0 pl-2 font-semibold text-brand-400">{row.right}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function PlayerShareCard({
  player,
  matches,
  players = [],
  decks = [],
  language = 'zh-Hant',
  achievementUnlocks = [],
}: {
  player: Player
  matches: Match[]
  players?: Player[]
  decks?: Deck[]
  language?: Language
  achievementUnlocks?: AchievementUnlock[]
}) {
  const playerMatches = getCompletedMatches(matches).filter(
    (match) => match.player1Id === player.id || match.player2Id === player.id,
  )
  const stat = buildPlayerStats(players.length ? players : [player], matches).find((item) => item.id === player.id)
  const streak = buildWinStreakStats(player.id, matches)
  const headToHead = buildHeadToHeadStats(player.id, players.length ? players : [player], matches)
  const topRival = headToHead[0]
  const deckStats = buildPlayerDeckStats(players.length ? players : [player], decks, matches, language).filter(
    (item) => item.playerId === player.id,
  )
  const topDeck = deckStats[0]
  const firstSecond = buildFirstSecondStats(playerMatches)
  const recent5 = buildRecentForm(matches, player.id).find((item) => item.label.includes('5'))
  const globalRates = players.length
    ? computeGlobalAchievementRates(players, decks, matches)
    : new Map()
  const achievements = getPlayerAchievementProgress(
    player.id,
    players.length ? players : [player],
    decks,
    matches,
    achievementUnlocks,
    globalRates,
  )
  const achievementSummary = computeAchievementSummary(achievements)

  return (
    <ShareCardFrame
      title={player.name}
      subtitle={`${stat?.wins ?? 0}W-${stat?.losses ?? 0}L · ${formatPercent(stat?.winRate ?? null)} · ${stat?.total ?? 0} 場`}
    >
      <ShareStatGrid
        items={[
          { label: '勝率', value: formatPercent(stat?.winRate ?? null) },
          { label: '連勝', value: streak.currentStreak > 0 ? String(streak.currentStreak) : '—' },
          { label: '最高連勝', value: streak.longestStreak > 0 ? String(streak.longestStreak) : '—' },
        ]}
      />
      <ShareStatGrid
        items={[
          {
            label: '先攻',
            value: formatPercent(firstSecond.find((item) => item.label === '先攻')?.winRate ?? null),
          },
          {
            label: '後攻',
            value: formatPercent(firstSecond.find((item) => item.label === '後攻')?.winRate ?? null),
          },
          {
            label: '近5場',
            value: recent5?.total
              ? `${recent5.wins}W · ${formatPercent(recent5.winRate)}`
              : '—',
          },
        ]}
      />
      <ShareRowList
        title="常用牌組"
        rows={deckStats.slice(0, 3).map((item) => ({
          left: item.deckName,
          right: `${item.total}場 · ${formatPercent(item.winRate)}`,
        }))}
      />
      <ShareRowList
        title="對手戰績"
        rows={headToHead.slice(0, 4).map((item) => ({
          left: item.name,
          right: `${item.wins}W-${item.losses}L`,
        }))}
      />
      <ShareStatGrid
        items={[
          {
            label: '成就項目',
            value: `${achievementSummary.familiesUnlocked}/${achievementSummary.totalFamilies}`,
          },
          {
            label: '階段進度',
            value: `${achievementSummary.tierRate}%`,
          },
          {
            label: '頭號對手',
            value: topRival ? `${topRival.wins}W-${topRival.losses}L` : '—',
          },
        ]}
      />
      {topDeck ? (
        <p className="text-center text-[10px] text-text-secondary">
          主牌組 {topDeck.deckName} · {Math.round((topDeck.total / Math.max(stat?.total ?? 1, 1)) * 100)}% 使用率
        </p>
      ) : null}
    </ShareCardFrame>
  )
}

export function SessionDashboardShareCard({
  session,
  players,
  decks,
  matches,
  language = 'zh-Hant',
}: {
  session: Session
  players: Player[]
  decks: Deck[]
  matches: Match[]
  language?: Language
}) {
  const scoped = getCompletedMatches(matches).filter((match) => match.sessionId === session.id)
  const dashboard = buildDashboardStats(players, decks, scoped, language)
  const meta = buildMetaSummaryStats(scoped)
  const leaderboard = buildPlayerStats(players, scoped)
    .filter((item) => item.total > 0)
    .sort((a, b) => {
      if ((b.winRate ?? 0) !== (a.winRate ?? 0)) return (b.winRate ?? 0) - (a.winRate ?? 0)
      return b.total - a.total
    })
    .slice(0, 6)
  const deckStats = buildPlayerDeckStats(players, decks, scoped, language)
    .reduce<Map<string, { name: string; total: number; wins: number }>>((map, item) => {
      const current = map.get(item.deckId) ?? { name: item.deckName, total: 0, wins: 0 }
      current.total += item.total
      current.wins += item.wins
      map.set(item.deckId, current)
      return map
    }, new Map())
  const topDecks = [...deckStats.entries()]
    .map(([id, value]) => ({ id, ...value, winRate: value.total ? value.wins / value.total : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)

  return (
    <ShareCardFrame
      title={session.name}
      subtitle={`${formatDateTime(session.startedAt)} · ${dashboard.totalMatches} 場完成`}
    >
      <ShareStatGrid
        items={[
          { label: '對局', value: String(dashboard.totalMatches) },
          { label: '玩家', value: String(meta.uniquePlayers) },
          { label: '牌組', value: String(meta.uniqueDecks) },
        ]}
      />
      <ShareStatGrid
        items={[
          { label: '先攻勝率', value: formatPercent(dashboard.firstPlayerWinRate) },
          {
            label: 'MVP',
            value: dashboard.topPlayer ? formatPercent(dashboard.topPlayer.winRate) : '—',
          },
          {
            label: '熱門牌組',
            value: dashboard.mostUsedDeck ? String(dashboard.mostUsedDeck.total) : '—',
          },
        ]}
      />
      <ShareRowList
        title="玩家排行"
        rows={leaderboard.map((item, index) => ({
          left: `${index + 1}. ${item.name}`,
          right: `${item.wins}W-${item.losses}L · ${formatPercent(item.winRate)}`,
        }))}
      />
      <ShareRowList
        title="牌組使用"
        rows={topDecks.map((item) => ({
          left: item.name,
          right: `${item.total}場 · ${formatPercent(item.winRate)}`,
        }))}
      />
      {dashboard.topPlayer ? (
        <p className="text-center text-[10px] text-text-secondary">
          MVP {dashboard.topPlayer.name} · {dashboard.topPlayer.wins}W-{dashboard.topPlayer.losses}L
        </p>
      ) : null}
    </ShareCardFrame>
  )
}

export function SessionShareCard({
  session,
  player,
  matches,
  players,
  decks,
}: {
  session: Session
  player: Player | null
  matches: Match[]
  players: Player[]
  decks: Deck[]
}) {
  const scoped = getCompletedMatches(matches).filter((match) => match.sessionId === session.id)
  const playerMatches = player
    ? scoped.filter((match) => match.player1Id === player.id || match.player2Id === player.id)
    : scoped
  const stat = player ? buildPlayerStats(players, playerMatches).find((item) => item.id === player.id) : null

  return (
    <ShareCardFrame
      title={session.name}
      subtitle={
        player
          ? `${player.name} · ${stat?.wins ?? 0}W-${stat?.losses ?? 0}L`
          : `${scoped.length} matches`
      }
    >
      <ol className="space-y-2">
        {playerMatches.slice(0, 12).map((match, index) => {
          const opponentId = match.player1Id === player?.id ? match.player2Id : match.player1Id
          const opponentDeckId = match.player1Id === player?.id ? match.deck2Id : match.deck1Id
          const deck = decks.find((item) => item.id === opponentDeckId)
          const opponent = players.find((item) => item.id === opponentId)
          const won = match.winnerPlayerId === player?.id
          return (
            <li
              key={match.id}
              className="flex items-center gap-2 rounded-lg bg-surface-elevated/70 px-2.5 py-2 ring-1 ring-white/[0.06]"
            >
              <span className="w-4 text-[10px] tabular-nums text-text-secondary">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{opponent?.name ?? '—'}</p>
                {deck ? <DeckLabel deck={deck} showCode className="text-[10px] text-text-secondary" /> : null}
              </div>
              <TurnOrderBadge firstPlayerId={match.firstPlayerId} perspectivePlayerId={player?.id} />
              <WinLossBadge won={won} />
            </li>
          )
        })}
      </ol>
    </ShareCardFrame>
  )
}

export function ShareExportSheet({
  open,
  onClose,
  title,
  filename,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  filename: string
  children: ReactNode
}) {
  const { t } = useI18n()
  const cardRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = async () => {
    if (!cardRef.current) return
    setLoading(true)
    setMessage(null)
    try {
      const result = await shareElementAsPng(cardRef.current, { title, filename })
      setMessage(result === 'shared' ? t('share.shared') : t('share.downloaded'))
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : t('share.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('share.title')}>
      <div className="space-y-4">
        <div ref={cardRef} className="share-export-root isolate">
          {children}
        </div>
        <Button fullWidth loading={loading} onClick={handleExport}>
          {t('share.exportButton')}
        </Button>
        {message ? (
          <p className="text-sm text-text-secondary" data-export-exclude="true">
            {message}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  )
}
