import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MatchForm } from '@/components/record/MatchForm'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatch, Deck, Match, Player } from '@/types'

export function ActiveMatchCard({
  match,
  players,
  decks,
  matches,
  onComplete,
  onSetFirstPlayer,
  compact = true,
}: {
  match: ActiveMatch
  players: Player[]
  decks: Deck[]
  matches: Match[]
  onComplete: (winnerPlayerId: string) => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
  compact?: boolean
}) {
  const { t } = useI18n()
  const updateActiveMatch = useAppStore((state) => state.updateActiveMatch)
  const [editing, setEditing] = useState(false)
  const [left, right] = getOrderedMatchSides(match)
  const leftDeck = getDeck(decks, left.deckId)
  const rightDeck = getDeck(decks, right.deckId)
  const rollFirstPlayer = () => {
    onSetFirstPlayer(Math.random() < 0.5 ? match.player1Id : match.player2Id)
  }
  const isComplete = Boolean(
    match.player1Id && match.player2Id && match.deck1Id && match.deck2Id,
  )

  const body = (
    <>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="shrink-0 text-xs font-semibold text-brand-500">#{match.matchNumber}</span>
        {match.firstPlayerId ? (
          <span className="text-[10px] text-text-secondary">
            {t('table.firstShort')}:{getPlayerName(players, match.firstPlayerId).slice(0, 3)}
          </span>
        ) : null}
        <div className="ml-auto flex gap-0.5">
          <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-surface" onClick={rollFirstPlayer}>
            {t('table.roll')}
          </button>
          <button
            type="button"
            className={['rounded px-1.5 py-0.5 text-[10px]', match.firstPlayerId === match.player1Id ? 'bg-brand-600 text-white' : 'text-text-secondary hover:bg-surface'].join(' ')}
            onClick={() => onSetFirstPlayer(match.player1Id)}
          >
            A
          </button>
          <button
            type="button"
            className={['rounded px-1.5 py-0.5 text-[10px]', match.firstPlayerId === match.player2Id ? 'bg-brand-600 text-white' : 'text-text-secondary hover:bg-surface'].join(' ')}
            onClick={() => onSetFirstPlayer(match.player2Id)}
          >
            B
          </button>
          <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-surface" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 px-2 pb-2">
        <button
          type="button"
          className="rounded-lg bg-surface px-2 py-1.5 text-left transition hover:bg-green-950/40 active:bg-green-900/50 disabled:opacity-40"
          disabled={!isComplete}
          onClick={() => onComplete(match.player1Id)}
        >
          <p className="truncate text-xs font-semibold">{getPlayerName(players, match.player1Id)}</p>
          {leftDeck ? (
            <p className="truncate text-[10px] text-text-secondary">
              <DeckLabel deck={leftDeck} showCode className="inline-flex" />
            </p>
          ) : null}
          <p className="mt-0.5 text-center text-base font-black text-success">WIN</p>
        </button>
        <button
          type="button"
          className="rounded-lg bg-surface px-2 py-1.5 text-left transition hover:bg-green-950/40 active:bg-green-900/50 disabled:opacity-40"
          disabled={!isComplete}
          onClick={() => onComplete(match.player2Id)}
        >
          <p className="truncate text-xs font-semibold">{getPlayerName(players, match.player2Id)}</p>
          {rightDeck ? (
            <p className="truncate text-[10px] text-text-secondary">
              <DeckLabel deck={rightDeck} showCode className="inline-flex" />
            </p>
          ) : null}
          <p className="mt-0.5 text-center text-base font-black text-success">WIN</p>
        </button>
      </div>
      <BottomSheet open={editing} title={t('table.editMatch')} onClose={() => setEditing(false)}>
        <MatchForm
          initial={{
            player1Id: match.player1Id,
            deck1Id: match.deck1Id,
            player2Id: match.player2Id,
            deck2Id: match.deck2Id,
            firstPlayerId: match.firstPlayerId,
            notes: match.notes,
          }}
          players={players}
          decks={decks}
          matches={matches}
          onCancel={() => setEditing(false)}
          onSave={(input) => {
            updateActiveMatch(match.id, input)
            setEditing(false)
          }}
        />
      </BottomSheet>
    </>
  )

  if (compact) {
    return <article className="rounded-xl bg-surface-elevated ring-1 ring-surface-muted">{body}</article>
  }

  return (
    <article className="rounded-xl bg-surface-elevated ring-1 ring-surface-muted">
      <div className="border-b border-surface-muted px-2 py-1 text-xs text-text-secondary">{t('table.unassigned')}</div>
      {body}
    </article>
  )
}
