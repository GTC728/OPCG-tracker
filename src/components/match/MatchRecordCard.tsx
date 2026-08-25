import type { ReactNode } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { FirstPlayerBadge, WinLossBadge } from '@/components/match/TurnOrderBadge'
import { getDeck, getPlayerName } from '@/lib/entities'
import { uiCard } from '@/lib/uiSurface'
import type { Deck, Match, Player } from '@/types'

function MatchRecordSide({
  playerId,
  deckId,
  players,
  decks,
  isWinner,
  isFirst,
}: {
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  isWinner: boolean
  isFirst: boolean
}) {
  const deck = deckId ? getDeck(decks, deckId) : null

  return (
    <div
      className={[
        'min-w-0 flex-1',
        isWinner ? 'border-l-[3px] border-success pl-2' : 'opacity-75',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={[
              'truncate text-sm font-semibold',
              isWinner ? 'text-success' : 'text-text-primary',
            ].join(' ')}
          >
            {getPlayerName(players, playerId)}
          </span>
          {isFirst ? <FirstPlayerBadge /> : null}
        </div>
        <WinLossBadge won={isWinner} />
      </div>
      <div className="mt-1 min-w-0">
        {deck ? (
          <DeckLabel deck={deck} showCode compact className="text-[11px] text-text-secondary" />
        ) : (
          <span className="text-[11px] text-text-secondary">—</span>
        )}
      </div>
    </div>
  )
}

export function MatchRecordCard({
  match,
  players,
  decks,
  timeLabel,
  footerRight,
  onClick,
  className,
  children,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  timeLabel?: string
  footerRight?: ReactNode
  onClick?: () => void
  className?: string
  children?: ReactNode
}) {
  const winnerId = match.winnerPlayerId
  const body = (
    <>
      <div className="flex items-stretch gap-2">
        <MatchRecordSide
          playerId={match.player1Id}
          deckId={match.deck1Id}
          players={players}
          decks={decks}
          isWinner={winnerId === match.player1Id}
          isFirst={match.firstPlayerId === match.player1Id}
        />
        <div className="w-px shrink-0 bg-surface-muted" />
        <MatchRecordSide
          playerId={match.player2Id}
          deckId={match.deck2Id}
          players={players}
          decks={decks}
          isWinner={winnerId === match.player2Id}
          isFirst={match.firstPlayerId === match.player2Id}
        />
      </div>
      {timeLabel || footerRight ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          {timeLabel ? (
            <span className="text-xs tabular-nums text-text-secondary">{timeLabel}</span>
          ) : (
            <span />
          )}
          {footerRight}
        </div>
      ) : null}
    </>
  )

  return (
    <article className={[uiCard, className].filter(Boolean).join(' ')}>
      {onClick ? (
        <button type="button" className="block w-full px-3.5 py-3 text-left outline-none" onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className="px-3.5 py-3">{body}</div>
      )}
      {children}
    </article>
  )
}
