import { DeckLabel } from '@/components/deck/DeckLabel'
import { getDeck, getPlayerName } from '@/lib/entities'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
import type { Deck, Match, Player } from '@/types'

function SideLabel({
  playerId,
  deckId,
  players,
  decks,
  isWinner,
  showResultColors = true,
  compact = false,
}: {
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  isWinner: boolean
  showResultColors?: boolean
  compact?: boolean
}) {
  const deck = getDeck(decks, deckId)
  const name = getPlayerName(players, playerId)
  const colorClass = !showResultColors
    ? 'text-text-secondary'
    : isWinner
      ? 'font-semibold text-success'
      : 'text-text-secondary'

  if (compact) {
    return (
      <span className={['inline-flex min-w-0 items-center gap-1', colorClass].join(' ')}>
        <span className="truncate">{name}</span>
        {deck ? (
          <span className="inline-flex min-w-0 items-center gap-1 opacity-90">
            <DeckLabel deck={deck} showCode className="inline-flex min-w-0 text-inherit" />
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <div
      className={[
        'rounded-xl p-3',
        showResultColors && isWinner ? 'border-l-4 border-success bg-success/10' : 'bg-surface',
      ].join(' ')}
    >
      <p className={['font-semibold', colorClass].join(' ')}>{name}</p>
      {deck ? (
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
          <DeckLabel deck={deck} showCode />
        </p>
      ) : null}
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
          'flex min-w-0 items-center gap-2 text-sm',
          bare ? '' : 'rounded-xl bg-surface px-3 py-2 ring-1 ring-surface-muted',
        ].join(' ')}
      >
        <SideLabel
          playerId={left.playerId}
          deckId={left.deckId}
          players={players}
          decks={decks}
          isWinner={match.winnerPlayerId === left.playerId}
          showResultColors={showResultColors}
          compact
        />
        <span className="shrink-0 text-text-secondary">vs</span>
        <SideLabel
          playerId={right.playerId}
          deckId={right.deckId}
          players={players}
          decks={decks}
          isWinner={match.winnerPlayerId === right.playerId}
          showResultColors={showResultColors}
          compact
        />
        {meta ? <span className="ml-auto shrink-0 text-xs text-text-secondary">{meta}</span> : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <SideLabel
        playerId={left.playerId}
        deckId={left.deckId}
        players={players}
        decks={decks}
        isWinner={match.winnerPlayerId === left.playerId}
        showResultColors={showResultColors}
      />
      <SideLabel
        playerId={right.playerId}
        deckId={right.deckId}
        players={players}
        decks={decks}
        isWinner={match.winnerPlayerId === right.playerId}
        showResultColors={showResultColors}
      />
    </div>
  )
}
