import { DeckLabel } from '@/components/deck/DeckLabel'
import { getDeck, getPlayerName } from '@/lib/entities'
import { uiCard } from '@/lib/uiSurface'
import { formatDateTime } from '@/lib/utils'
import type { Deck, Match, Player } from '@/types'

export function MatchSummaryCard({
  match,
  players,
  decks,
  resultLabel,
  onClick,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  resultLabel?: string
  onClick?: () => void
}) {
  const left = getPlayerName(players, match.player1Id)
  const right = getPlayerName(players, match.player2Id)
  const deck1 = getDeck(decks, match.deck1Id)
  const deck2 = getDeck(decks, match.deck2Id)
  const time = formatDateTime(match.finishedAt).split(' ').slice(-1)[0] ?? ''

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">
          {left} vs {right}
        </p>
        {resultLabel ? (
          <span className="shrink-0 rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase">
            {resultLabel}
          </span>
        ) : (
          <span className="shrink-0 text-xs tabular-nums text-text-secondary">{time}</span>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs text-text-secondary">
        {deck1 ? <DeckLabel deck={deck1} showCode compact className="inline" /> : '—'}
        <span className="mx-1">·</span>
        {deck2 ? <DeckLabel deck={deck2} showCode compact className="inline" /> : '—'}
      </p>
      {resultLabel ? <p className="mt-1 text-xs text-text-secondary">{time}</p> : null}
    </>
  )

  if (!onClick) {
    return <article className={[uiCard, 'px-3.5 py-3'].join(' ')}>{body}</article>
  }

  return (
    <button type="button" className={[uiCard, 'block w-full px-3.5 py-3 text-left'].join(' ')} onClick={onClick}>
      {body}
    </button>
  )
}
