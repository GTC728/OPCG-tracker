import type { ReactNode } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { TurnOrderBadge, WinLossBadge } from '@/components/match/TurnOrderBadge'
import { getDeck, getPlayerName } from '@/lib/entities'
import { formatMatchDuration, getMatchDurationMs } from '@/lib/matchTimer'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
import { uiCardInteractive } from '@/lib/uiSurface'
import type { Deck, Match, Player } from '@/types'

function SideBlock({
  playerId,
  deckId,
  players,
  decks,
  isWinner,
  showResultColors = true,
  align = 'start',
}: {
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  isWinner: boolean
  showResultColors?: boolean
  align?: 'start' | 'end'
}) {
  const deck = getDeck(decks, deckId)
  const name = getPlayerName(players, playerId)
  const colorClass = !showResultColors
    ? 'text-text-primary'
    : isWinner
      ? 'text-success'
      : 'text-text-primary'

  return (
    <div
      className={[
        'match-result-side min-w-0 flex-1',
        align === 'end' ? 'items-end text-right' : 'items-start text-left',
        'flex flex-col gap-0.5',
      ].join(' ')}
    >
      <p className={['truncate text-xs font-semibold leading-tight', colorClass].join(' ')}>{name}</p>
      {deck ? (
        <div className={['min-w-0 max-w-full overflow-hidden', align === 'end' ? 'text-right' : ''].join(' ')}>
          <DeckLabel deck={deck} showCode className="inline-flex max-w-full text-[11px] text-text-secondary" />
        </div>
      ) : (
        <p className="text-[10px] text-text-secondary">—</p>
      )}
    </div>
  )
}

export function MatchResultRow({
  match,
  players,
  decks,
  compact = false,
  bare = false,
  meta,
  showResultColors = true,
  perspectivePlayerId,
  showTurnOrder = false,
  showWinLossBadge = false,
  showDuration = false,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  compact?: boolean
  bare?: boolean
  meta?: string
  showResultColors?: boolean
  perspectivePlayerId?: string
  showTurnOrder?: boolean
  showWinLossBadge?: boolean
  showDuration?: boolean
}) {
  const [left, right] = getOrderedMatchSides(match)
  const durationMs = showDuration ? getMatchDurationMs(match.startedAt, match.finishedAt) : null
  const durationLabel = durationMs !== null ? formatMatchDuration(durationMs) : null
  const resolvedMeta = meta ?? durationLabel
  const badges =
    perspectivePlayerId && (showTurnOrder || showWinLossBadge) ? (
      <div className="flex shrink-0 items-center gap-1.5">
        {showTurnOrder ? (
          <TurnOrderBadge firstPlayerId={match.firstPlayerId} perspectivePlayerId={perspectivePlayerId} />
        ) : null}
        {showWinLossBadge ? (
          <WinLossBadge won={match.winnerPlayerId === perspectivePlayerId} />
        ) : null}
      </div>
    ) : null

  if (compact) {
    return (
      <div
        className={[
          'match-result-row match-result-row--compact grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0.5',
          bare ? '' : 'rounded-lg bg-surface/60 px-3 py-2 ring-1 ring-white/[0.06] backdrop-blur-sm',
        ].join(' ')}
      >
        <SideBlock
          playerId={left.playerId}
          deckId={left.deckId}
          players={players}
          decks={decks}
          isWinner={match.winnerPlayerId === left.playerId}
          showResultColors={showResultColors}
          align="start"
        />
        <div className="flex shrink-0 flex-col items-center gap-1 self-center">
          <span className="match-result-vs text-[10px] font-semibold uppercase text-text-secondary">vs</span>
          {badges}
        </div>
        <SideBlock
          playerId={right.playerId}
          deckId={right.deckId}
          players={players}
          decks={decks}
          isWinner={match.winnerPlayerId === right.playerId}
          showResultColors={showResultColors}
          align="end"
        />
        {resolvedMeta ? (
          <span className="match-result-meta col-span-3 text-right text-xs tabular-nums text-text-secondary">
            {resolvedMeta}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="match-result-row match-result-row--full space-y-2">
      <div
        className={[
          'match-result-side rounded-xl p-3',
          showResultColors && match.winnerPlayerId === left.playerId
            ? 'border-l-4 border-success bg-success/10'
            : 'bg-surface',
        ].join(' ')}
      >
        <p
          className={[
            'font-semibold',
            showResultColors && match.winnerPlayerId === left.playerId ? 'text-success' : 'text-text-primary',
          ].join(' ')}
        >
          {getPlayerName(players, left.playerId)}
        </p>
        {getDeck(decks, left.deckId) ? (
          <p className="mt-1 text-sm text-text-secondary">
            <DeckLabel deck={getDeck(decks, left.deckId)} showCode />
          </p>
        ) : null}
      </div>
      <div
        className={[
          'match-result-side rounded-xl p-3',
          showResultColors && match.winnerPlayerId === right.playerId
            ? 'border-l-4 border-success bg-success/10'
            : 'bg-surface',
        ].join(' ')}
      >
        <p
          className={[
            'font-semibold',
            showResultColors && match.winnerPlayerId === right.playerId ? 'text-success' : 'text-text-primary',
          ].join(' ')}
        >
          {getPlayerName(players, right.playerId)}
        </p>
        {getDeck(decks, right.deckId) ? (
          <p className="mt-1 text-sm text-text-secondary">
            <DeckLabel deck={getDeck(decks, right.deckId)} showCode />
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function MatchListItem({
  match,
  players,
  decks,
  meta,
  badge,
  showResultColors = true,
  perspectivePlayerId,
  showTurnOrder = false,
  showWinLossBadge = false,
  showDuration = false,
  onClick,
  className = '',
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  meta?: string
  badge?: ReactNode
  showResultColors?: boolean
  perspectivePlayerId?: string
  showTurnOrder?: boolean
  showWinLossBadge?: boolean
  showDuration?: boolean
  onClick?: () => void
  className?: string
}) {
  const durationMs = showDuration ? getMatchDurationMs(match.startedAt, match.finishedAt) : null
  const durationLabel = durationMs !== null ? formatMatchDuration(durationMs) : null
  const resolvedMeta = meta ?? durationLabel

  const content = (
    <>
      {(badge || resolvedMeta) && (
        <div className="match-list-item__header flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">{badge}</div>
          {resolvedMeta ? (
            <span className="match-list-item__meta shrink-0 text-xs tabular-nums text-text-secondary">{resolvedMeta}</span>
          ) : null}
        </div>
      )}
      <div className="match-list-item__body min-w-0 w-full">
        <MatchResultRow
          match={match}
          players={players}
          decks={decks}
          compact
          bare
          showResultColors={showResultColors}
          perspectivePlayerId={perspectivePlayerId}
          showTurnOrder={showTurnOrder}
          showWinLossBadge={showWinLossBadge}
        />
      </div>
    </>
  )

  const classes = [
    'match-list-item flex w-full flex-col gap-1.5 px-3 py-2.5 text-left outline-none',
    uiCardInteractive,
    onClick ? '' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    )
  }

  return <div className={classes}>{content}</div>
}
