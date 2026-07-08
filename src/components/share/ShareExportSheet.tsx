import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { TurnOrderBadge, WinLossBadge } from '@/components/match/TurnOrderBadge'
import { shareElementAsPng } from '@/lib/shareExport'
import { getCompletedMatches, formatPercent, buildPlayerStats } from '@/lib/stats'
import { buildWinStreakStats } from '@/lib/stats'
import { useI18n } from '@/lib/i18n'
import type { Deck, Match, Player, Session } from '@/types'

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

export function PlayerShareCard({
  player,
  matches,
}: {
  player: Player
  matches: Match[]
  decks?: Deck[]
}) {
  const stat = buildPlayerStats([player], matches).find((item) => item.id === player.id)
  const streak = buildWinStreakStats(player.id, matches)

  return (
    <ShareCardFrame
      title={player.name}
      subtitle={`${stat?.wins ?? 0}W-${stat?.losses ?? 0}L · ${formatPercent(stat?.winRate ?? null)}`}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--color-surface)] p-2">
          <p className="text-[10px] text-text-secondary">連勝</p>
          <p className="text-lg font-bold">{streak.currentStreak || '—'}</p>
        </div>
        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--color-surface)] p-2">
          <p className="text-[10px] text-text-secondary">最高</p>
          <p className="text-lg font-bold">{streak.longestStreak || '—'}</p>
        </div>
        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--color-surface)] p-2">
          <p className="text-[10px] text-text-secondary">場數</p>
          <p className="text-lg font-bold">{stat?.total ?? 0}</p>
        </div>
      </div>
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
