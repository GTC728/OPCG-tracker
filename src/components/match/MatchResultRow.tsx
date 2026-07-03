import type { ReactNode } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { getDeck, getPlayerName } from '@/lib/entities'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
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
        <div className={['min-w-0', align === 'end' ? 'justify-end' : ''].join(' ')}>
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
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  compact?: boolean
  bare?: boolean
  meta?: string
  showResultColors?: boolean
}) {
  const [left, right] = getOrderedMatchSides(match)

  if (compact) {
    return (
      <div
        className={[
          'match-result-row match-result-row--compact flex min-w-0 items-center gap-2',
          bare ? '' : 'rounded-xl bg-surface px-3 py-2 ring-1 ring-surface-muted',
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
        <span className="match-result-vs shrink-0 px-0.5 text-[10px] font-semibold uppercase text-text-secondary">
          vs
        </span>
        <SideBlock
          playerId={right.playerId}
          deckId={right.deckId}
          players={players}
          decks={decks}
          isWinner={match.winnerPlayerId === right.playerId}
          showResultColors={showResultColors}
          align="end"
        />
        {meta ? <span className="match-result-meta ml-1 shrink-0 text-xs tabular-nums text-text-secondary">{meta}</span> : null}
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
  onClick,
  className = '',
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  meta?: string
  badge?: ReactNode
  showResultColors?: boolean
  onClick?: () => void
  className?: string
}) {
  const content = (
    <>
      {badge}
      <div className="min-w-0 flex-1">
        <MatchResultRow
          match={match}
          players={players}
          decks={decks}
          compact
          bare
          showResultColors={showResultColors}
        />
      </div>
      {meta ? <span className="match-list-item__meta shrink-0 text-xs tabular-nums text-text-secondary">{meta}</span> : null}
    </>
  )

  const classes = [
    'match-list-item flex w-full items-center gap-2 rounded-xl bg-surface-elevated px-3 py-2 text-left ring-1 ring-surface-muted outline-none transition',
    onClick ? 'hover:bg-surface-muted/40 active:bg-surface-muted/60' : '',
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
