import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { FirstPlayerBadge, WinLossBadge } from '@/components/match/TurnOrderBadge'
import { Button } from '@/components/ui/Button'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { uiCard } from '@/lib/uiSurface'
import { formatDateTime } from '@/lib/utils'
import type { Deck, Match, Player } from '@/types'

function getHistoryDisplaySides(match: Match): [
  { playerId: string; deckId: string },
  { playerId: string; deckId: string },
] {
  const left = { playerId: match.player1Id, deckId: match.deck1Id }
  const right = { playerId: match.player2Id, deckId: match.deck2Id }
  if (match.winnerPlayerId === match.player2Id) return [right, left]
  return [left, right]
}

function HistorySideBlock({
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

export function HistoryMatchCard({
  match,
  players,
  decks,
  onEdit,
  onCopy,
  onDelete,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [winnerSide, loserSide] = getHistoryDisplaySides(match)
  const winnerId = match.winnerPlayerId
  const time = formatDateTime(match.finishedAt).split(' ').slice(-1)[0] ?? ''

  return (
    <article className={uiCard}>
      <button
        type="button"
        className="block w-full px-3.5 py-3 text-left outline-none"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-stretch gap-2">
          <HistorySideBlock
            playerId={winnerSide.playerId}
            deckId={winnerSide.deckId}
            players={players}
            decks={decks}
            isWinner={winnerId === winnerSide.playerId}
            isFirst={match.firstPlayerId === winnerSide.playerId}
          />
          <div className="w-px shrink-0 bg-surface-muted" />
          <HistorySideBlock
            playerId={loserSide.playerId}
            deckId={loserSide.deckId}
            players={players}
            decks={decks}
            isWinner={winnerId === loserSide.playerId}
            isFirst={match.firstPlayerId === loserSide.playerId}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-text-secondary">{time}</span>
          <span className="text-[10px] text-text-secondary">{expanded ? t('common.collapse') : t('common.expand')}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-surface-muted px-3.5 pb-3 pt-2">
          <p className="text-xs text-text-secondary">{formatDateTime(match.finishedAt)}</p>
          {match.notes ? (
            <p className="mt-1 text-xs text-text-secondary">
              {t('history.notes')}：{match.notes}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              className="min-h-9 px-2 py-1.5 text-xs"
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            >
              {t('history.editShort')}
            </Button>
            <Button
              variant="secondary"
              className="min-h-9 px-2 py-1.5 text-xs"
              onClick={(event) => {
                event.stopPropagation()
                onCopy()
              }}
            >
              {t('history.rematchShort')}
            </Button>
            <Button
              variant="danger"
              className="min-h-9 px-2 py-1.5 text-xs"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
