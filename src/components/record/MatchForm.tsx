import { useState } from 'react'
import { DeckSearchField } from '@/components/deck/DeckSearchField'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { Button } from '@/components/ui/Button'
import { getDeck } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getRecentDistinctDeckIdsForPlayer } from '@/lib/selectors'
import type { ActiveMatchInput, Deck, Match, Player } from '@/types'

export const emptyMatchInput: ActiveMatchInput = {
  player1Id: '',
  deck1Id: '',
  player2Id: '',
  deck2Id: '',
  firstPlayerId: null,
  notes: null,
}

function PlayerChip({
  player,
  active,
  onClick,
}: {
  player: Player
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'min-h-10 rounded-xl px-3 py-1.5 text-sm font-semibold transition',
        active ? 'bg-brand-600 text-white' : 'bg-surface text-text-primary ring-1 ring-surface-muted',
      ].join(' ')}
      onClick={onClick}
    >
      {player.name}
    </button>
  )
}

function MatchSideCard({
  label,
  playerId,
  deckId,
  players,
  decks,
  preferredDeckIds,
  onPlayerChange,
  onDeckChange,
}: {
  label: string
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  preferredDeckIds: string[]
  onPlayerChange: (playerId: string) => void
  onDeckChange: (deckId: string) => void
}) {
  const deck = getDeck(decks, deckId)

  return (
    <section className="rounded-xl bg-surface p-3 ring-1 ring-surface-muted">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-500">{label}</p>
        {deck ? (
          <div className="min-w-0 truncate text-xs text-text-secondary">
            <DeckLabel deck={deck} showCode />
          </div>
        ) : null}
      </div>
      <div className="mt-2">
        <p className="mb-1.5 text-xs font-semibold text-text-secondary">{/* players */}玩家</p>
        <div className="flex flex-wrap gap-1.5">
          {players.map((player) => (
            <PlayerChip
              key={player.id}
              player={player}
              active={playerId === player.id}
              onClick={() => onPlayerChange(player.id)}
            />
          ))}
        </div>
      </div>
      <div className="mt-3">
        <DeckSearchField
          label="牌組"
          value={deckId}
          decks={decks}
          preferredDeckIds={preferredDeckIds}
          onChange={onDeckChange}
          showResultsWhenEmpty={false}
        />
      </div>
    </section>
  )
}

export function MatchForm({
  initial,
  players,
  decks,
  matches,
  submitLabel,
  onCancel,
  onSave,
}: {
  initial?: ActiveMatchInput
  players: Player[]
  decks: Deck[]
  matches: Match[]
  submitLabel?: string
  onCancel: () => void
  onSave: (input: ActiveMatchInput) => void
}) {
  const { t } = useI18n()
  const [input, setInput] = useState<ActiveMatchInput>(initial ?? emptyMatchInput)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = Boolean(input.player1Id && input.player2Id && input.deck1Id && input.deck2Id)

  const updateInput = (patch: Partial<ActiveMatchInput>) => {
    setInput((current) => {
      const next = { ...current, ...patch }
      if (
        next.firstPlayerId !== null &&
        next.firstPlayerId !== next.player1Id &&
        next.firstPlayerId !== next.player2Id
      ) {
        next.firstPlayerId = null
      }
      return next
    })
  }

  const swapPlayers = () => {
    setInput((current) => ({
      ...current,
      player1Id: current.player2Id,
      deck1Id: current.deck2Id,
      player2Id: current.player1Id,
      deck2Id: current.deck1Id,
    }))
  }

  const rollFirstPlayer = () => {
    if (!input.player1Id || !input.player2Id) return
    updateInput({ firstPlayerId: Math.random() < 0.5 ? input.player1Id : input.player2Id })
  }

  const choosePlayer = (slot: 'player1' | 'player2', playerId: string) => {
    const recentDeckId = getRecentDistinctDeckIdsForPlayer(matches, decks, playerId)[0] ?? ''
    setInput((current) => ({
      ...current,
      ...(slot === 'player1'
        ? { player1Id: playerId, deck1Id: recentDeckId || current.deck1Id }
        : { player2Id: playerId, deck2Id: recentDeckId || current.deck2Id }),
    }))
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) {
          setError(t('rematch.incomplete'))
          return
        }
        try {
          onSave(input)
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : t('rematch.failed'))
        }
      }}
    >
      <MatchSideCard
        label="A"
        playerId={input.player1Id}
        deckId={input.deck1Id}
        players={players}
        decks={decks}
        preferredDeckIds={getRecentDistinctDeckIdsForPlayer(matches, decks, input.player1Id)}
        onPlayerChange={(playerId) => choosePlayer('player1', playerId)}
        onDeckChange={(deck1Id) => updateInput({ deck1Id })}
      />

      <MatchSideCard
        label="B"
        playerId={input.player2Id}
        deckId={input.deck2Id}
        players={players}
        decks={decks}
        preferredDeckIds={getRecentDistinctDeckIdsForPlayer(matches, decks, input.player2Id)}
        onPlayerChange={(playerId) => choosePlayer('player2', playerId)}
        onDeckChange={(deck2Id) => updateInput({ deck2Id })}
      />

      <section className="rounded-xl bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-500">{t('table.firstPlayer')}</p>
          <Button type="button" className="min-h-9 py-1 text-xs" variant="ghost" onClick={swapPlayers}>
            {t('rematch.swap')}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" variant="secondary" className="min-h-9 px-2 py-1 text-xs" onClick={rollFirstPlayer}>
            {t('table.roll')}
          </Button>
          <Button
            type="button"
            variant={input.firstPlayerId === input.player1Id ? 'primary' : 'ghost'}
            className="min-h-9 px-2 py-1 text-xs"
            disabled={!input.player1Id}
            onClick={() => updateInput({ firstPlayerId: input.player1Id })}
          >
            A
          </Button>
          <Button
            type="button"
            variant={input.firstPlayerId === input.player2Id ? 'primary' : 'ghost'}
            className="min-h-9 px-2 py-1 text-xs"
            disabled={!input.player2Id}
            onClick={() => updateInput({ firstPlayerId: input.player2Id })}
          >
            B
          </Button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-danger/10 p-2 text-sm text-red-200">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" className="min-h-10" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="min-h-10" disabled={!canSubmit}>
          {submitLabel ?? t('rematch.confirm')}
        </Button>
      </div>
    </form>
  )
}
