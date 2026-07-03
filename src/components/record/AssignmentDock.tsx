import { useEffect, useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getDeck } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getAssignmentRecentDeckIds } from '@/lib/selectors'
import {
  encodeTableDragPayload,
  type PendingTableAssignment,
  type TableDragPayload,
} from '@/lib/tableMode'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Match, Player } from '@/types'

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[-_\s.]/g, '')
}

function deckMatchesSearch(deck: Deck, query: string): boolean {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return true
  const candidates = [deck.displayName, deck.setCode, deck.leaderCode, deck.leaderName, ...deck.colors, ...deck.aliases]
  return candidates.some((candidate) => normalizeSearch(candidate).includes(normalizedQuery))
}

function DraggablePlayerChip({
  player,
  selected,
  onTapSelect,
}: {
  player: Player
  selected: boolean
  onTapSelect: () => void
}) {
  const onDragStart = (event: React.DragEvent) => {
    const payload: TableDragPayload = { kind: 'player', playerId: player.id }
    event.dataTransfer.setData('application/opcg-table', encodeTableDragPayload(payload))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onTapSelect}
      className={[
        'shrink-0 cursor-grab rounded-lg px-3 py-1.5 text-sm font-semibold outline-none active:cursor-grabbing',
        selected
          ? 'border-2 border-brand-400 bg-brand-600 text-white'
          : 'border border-surface-muted bg-surface text-text-primary',
      ].join(' ')}
    >
      {player.name}
    </button>
  )
}

function DraggableDeckChip({
  deck,
  selected,
  onTapSelect,
}: {
  deck: Deck
  selected: boolean
  onTapSelect: () => void
}) {
  const onDragStart = (event: React.DragEvent) => {
    const payload: TableDragPayload = { kind: 'deck', deckId: deck.id }
    event.dataTransfer.setData('application/opcg-table', encodeTableDragPayload(payload))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onTapSelect}
      className={[
        'shrink-0 cursor-grab rounded-lg px-2 py-1 text-xs outline-none active:cursor-grabbing',
        selected
          ? 'border-2 border-brand-400 bg-brand-600 text-white'
          : 'border border-surface-muted bg-surface',
      ].join(' ')}
    >
      <DeckLabel deck={deck} showCode className="inline-flex text-inherit" />
    </button>
  )
}

export function AssignmentDock({
  sessionId,
  players,
  decks,
  matches,
  pendingAssignment,
  onSelectAssignment,
  onClearAssignment,
}: {
  sessionId: string
  players: Player[]
  decks: Deck[]
  matches: Match[]
  pendingAssignment: PendingTableAssignment | null
  onSelectAssignment: (assignment: PendingTableAssignment | null) => void
  onClearAssignment: () => void
}) {
  const { t } = useI18n()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const activeMatches = useAppStore((store) => store.activeMatches)
  const [expanded, setExpanded] = useState(true)
  const [recentExpanded, setRecentExpanded] = useState(false)
  const [deckQuery, setDeckQuery] = useState('')

  useEffect(() => {
    setExpanded(!isMobile)
  }, [isMobile])

  const recentDeckLimit = isMobile && !recentExpanded ? 6 : 12
  const recentDeckIds = useMemo(
    () =>
      getAssignmentRecentDeckIds(
        matches,
        activeMatches,
        decks,
        sessionId,
        players.map((player) => player.id),
        recentDeckLimit,
      ),
    [activeMatches, decks, matches, players, recentDeckLimit, sessionId],
  )
  const hasMoreRecentDecks =
    isMobile &&
    !recentExpanded &&
    getAssignmentRecentDeckIds(
      matches,
      activeMatches,
      decks,
      sessionId,
      players.map((player) => player.id),
      12,
    ).length > 6

  const recentDecks = useMemo(
    () =>
      recentDeckIds
        .map((id) => getDeck(decks, id))
        .filter((deck): deck is Deck => Boolean(deck)),
    [decks, recentDeckIds],
  )

  const searchDecks = useMemo(() => {
    if (!deckQuery.trim()) return []
    return decks.filter((deck) => deckMatchesSearch(deck, deckQuery)).slice(0, 12)
  }, [deckQuery, decks])

  const displayDecks = deckQuery.trim() ? searchDecks : recentDecks

  const togglePlayer = (playerId: string) => {
    if (pendingAssignment?.kind === 'player' && pendingAssignment.playerId === playerId) {
      onClearAssignment()
    } else {
      onSelectAssignment({ kind: 'player', playerId })
    }
  }

  const toggleDeck = (deckId: string) => {
    if (pendingAssignment?.kind === 'deck' && pendingAssignment.deckId === deckId) {
      onClearAssignment()
    } else {
      onSelectAssignment({ kind: 'deck', deckId })
    }
  }

  if (!expanded) {
    return (
      <section className="rounded-xl bg-surface-elevated px-3 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left text-sm outline-none"
          onClick={() => setExpanded(true)}
        >
          <span className="font-semibold">{t('assignment.title')}</span>
          <span className="text-xs text-text-secondary">
            {players.length} {t('assignment.playersShort')} · {recentDecks.length} {t('assignment.decksShort')}
          </span>
          <span className="text-xs text-brand-400">▼</span>
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-xl bg-surface-elevated p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t('assignment.title')}</p>
        {pendingAssignment ? (
          <button type="button" className="text-xs text-brand-400 outline-none" onClick={onClearAssignment}>
            {t('assignment.tapCancel')}
          </button>
        ) : (
          <button type="button" className="text-xs text-text-secondary outline-none" onClick={() => setExpanded(false)}>
            ▲
          </button>
        )}
      </div>

      {pendingAssignment ? (
        <p className="mt-1 text-xs text-brand-300">{t('assignment.tapTableSide')}</p>
      ) : (
        <p className="mt-1 text-xs text-text-secondary">{t('assignment.hintIndependent')}</p>
      )}

      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {t('assignment.players')}
        </p>
        <div className="mt-1 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          {players.map((player) => (
            <DraggablePlayerChip
              key={player.id}
              player={player}
              selected={pendingAssignment?.kind === 'player' && pendingAssignment.playerId === player.id}
              onTapSelect={() => togglePlayer(player.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          {t('assignment.decks')}
        </p>
        <input
          className="mt-1 min-h-9 w-full rounded-lg border border-surface-muted bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand-500"
          placeholder={t('deck.searchPlaceholder')}
          value={deckQuery}
          onChange={(event) => setDeckQuery(event.target.value)}
        />
        {recentDecks.length && !deckQuery.trim() ? (
          <p className="mt-1 text-[10px] text-text-secondary">{t('deck.recentUsed')}</p>
        ) : null}
        <div
          className={[
            'mt-1.5 flex gap-1',
            deckQuery.trim() ? 'flex-wrap' : 'overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible',
          ].join(' ')}
        >
          {displayDecks.length ? (
            displayDecks.map((deck) => (
              <DraggableDeckChip
                key={deck.id}
                deck={deck}
                selected={pendingAssignment?.kind === 'deck' && pendingAssignment.deckId === deck.id}
                onTapSelect={() => toggleDeck(deck.id)}
              />
            ))
          ) : (
            <p className="text-xs text-text-secondary">
              {deckQuery.trim() ? t('deck.searchEmpty') : t('assignment.noRecentDecks')}
            </p>
          )}
        </div>
        {hasMoreRecentDecks ? (
          <button
            type="button"
            className="mt-1 text-[10px] text-brand-400 outline-none"
            onClick={() => setRecentExpanded(true)}
          >
            {t('assignment.showMoreDecks')}
          </button>
        ) : null}
      </div>
    </section>
  )
}

export type { PendingTableAssignment }

