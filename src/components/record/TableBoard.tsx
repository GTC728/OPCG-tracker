import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { ActiveMatchCard } from '@/components/record/ActiveMatchCard'
import { AssignmentDock } from '@/components/record/AssignmentDock'
import { MatchForm } from '@/components/record/MatchForm'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getDeck, getPlayerName } from '@/lib/entities'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
import {
  decodeTableDragPayload,
  getActiveMatchForTableSlot,
  getSessionTableCount,
  MAX_TABLE_COUNT,
  type PendingTableAssignment,
  type TableDragPayload,
} from '@/lib/tableMode'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatch, Deck, Match, Player } from '@/types'

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[-_\s.]/g, '')
}

function deckMatchesSearch(deck: Deck, query: string): boolean {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return true
  const candidates = [deck.displayName, deck.setCode, deck.leaderCode, deck.leaderName, ...deck.colors, ...deck.aliases]
  return candidates.some((candidate) => normalizeSearch(candidate).includes(normalizedQuery))
}

function TableSlotAssignSheet({
  open,
  slot,
  side,
  players,
  decks,
  onClose,
  onPickPlayer,
  onPickDeck,
}: {
  open: boolean
  slot: number
  side: 'left' | 'right'
  players: Player[]
  decks: Deck[]
  onClose: () => void
  onPickPlayer: (playerId: string) => void
  onPickDeck: (deckId: string) => void
}) {
  const { t } = useI18n()
  const [deckQuery, setDeckQuery] = useState('')
  const selectablePlayers = players.filter(isSelectablePlayer)
  const activeDecks = decks.filter((deck) => !deck.archived)
  const filteredDecks = useMemo(
    () => activeDecks.filter((deck) => deckMatchesSearch(deck, deckQuery)).slice(0, 24),
    [activeDecks, deckQuery],
  )

  return (
    <BottomSheet
      open={open}
      title={`${t('table.label')} ${slot} · ${side === 'left' ? t('table.sideLeft') : t('table.sideRight')}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-text-secondary">{t('table.pickPlayer')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectablePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                className="rounded-lg border border-surface-muted bg-surface px-3 py-1.5 text-sm font-semibold"
                onClick={() => {
                  onPickPlayer(player.id)
                  onClose()
                }}
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block">
            <span className="text-sm text-text-secondary">{t('table.pickDeck')}</span>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
              value={deckQuery}
              onChange={(event) => setDeckQuery(event.target.value)}
              placeholder={t('table.deckSearch')}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {filteredDecks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                className="rounded-lg border border-surface-muted bg-surface px-2 py-1 text-xs"
                onClick={() => {
                  onPickDeck(deck.id)
                  onClose()
                }}
              >
                <DeckLabel deck={deck} showCode className="inline-flex" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

function CompactEmptyTableSlot({
  slot,
  onTap,
}: {
  slot: number
  onTap: () => void
}) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      className="flex h-10 w-full items-center justify-between rounded-xl bg-surface-elevated px-3 ring-1 ring-surface-muted outline-none"
      onClick={onTap}
    >
      <span className="text-xs font-semibold text-brand-500">
        {t('table.label')} {slot}
      </span>
      <span className="text-[10px] text-text-secondary">{t('table.tapToAssign')}</span>
    </button>
  )
}

function CompactSideDrop({
  label,
  playerId,
  deckId,
  players,
  decks,
  highlight,
  onDrop,
  onTap,
}: {
  label: string
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  highlight: boolean
  onDrop: (payload: TableDragPayload) => void
  onTap: () => void
}) {
  const { t } = useI18n()
  const [over, setOver] = useState(false)
  const deck = deckId ? getDeck(decks, deckId) : null
  const hasPlayer = Boolean(playerId)
  const hasDeck = Boolean(deck)
  const filled = hasPlayer || hasDeck

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setOver(false)
    const raw = event.dataTransfer.getData('application/opcg-table')
    const payload = decodeTableDragPayload(raw)
    if (payload) onDrop(payload)
  }

  return (
    <button
      type="button"
      className={[
        'min-h-11 rounded-lg p-1.5 text-left transition outline-none',
        highlight
          ? 'border-2 border-brand-400 bg-brand-600/25 shadow-[0_0_0_1px_rgba(96,165,250,0.35)]'
          : filled
            ? 'border-2 border-brand-400/80 bg-brand-500/10 border-solid'
            : 'border border-dashed border-surface-muted bg-surface/60',
        over && !highlight ? 'border-brand-500 bg-brand-500/10' : '',
      ].join(' ')}
      onClick={onTap}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <p className="text-[9px] font-semibold uppercase text-text-secondary">{label}</p>
      {filled ? (
        <div className="mt-0.5 min-w-0">
          {hasPlayer ? (
            <p className="truncate text-xs font-semibold">{getPlayerName(players, playerId)}</p>
          ) : (
            <p className="text-[10px] text-text-secondary">{t('table.dropPlayer')}</p>
          )}
          {hasDeck ? (
            <p className="truncate text-[10px] text-text-secondary">
              <DeckLabel deck={deck} showCode className="inline-flex" />
            </p>
          ) : hasPlayer ? (
            <p className="text-[10px] text-text-secondary">{t('table.dropDeck')}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-text-secondary">{t('table.dropPlayerOrDeck')}</p>
      )}
    </button>
  )
}

function CompactCompleteTable({
  slot,
  match,
  players,
  decks,
  matches,
  onClear,
  onComplete,
  onSetFirstPlayer,
}: {
  slot: number
  match: ActiveMatch
  players: Player[]
  decks: Deck[]
  matches: Match[]
  onClear: () => void
  onComplete: (winnerPlayerId: string) => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
}) {
  const { t } = useI18n()
  const updateActiveMatch = useAppStore((state) => state.updateActiveMatch)
  const [editing, setEditing] = useState(false)
  const [left, right] = getOrderedMatchSides(match)
  const leftDeck = getDeck(decks, left.deckId)
  const rightDeck = getDeck(decks, right.deckId)

  const rollFirst = () => onSetFirstPlayer(Math.random() < 0.5 ? match.player1Id : match.player2Id)

  return (
    <article className="rounded-xl bg-surface-elevated ring-1 ring-surface-muted">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="text-xs font-semibold text-brand-500">
          {t('table.label')} {slot}
        </span>
        {match.firstPlayerId ? (
          <span className="text-[10px] text-text-secondary">
            {t('table.firstShort')}:{getPlayerName(players, match.firstPlayerId).slice(0, 4)}
          </span>
        ) : null}
        <button type="button" className="ml-auto text-[10px] text-text-secondary hover:text-danger" onClick={onClear}>
          {t('table.clear')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 px-2 pb-1">
        <button
          type="button"
          className="rounded-lg bg-surface px-2 py-1 text-left transition hover:bg-green-950/40 active:bg-green-900/50"
          onClick={() => onComplete(left.playerId)}
        >
          <p className="truncate text-xs font-semibold">{getPlayerName(players, left.playerId)}</p>
          {leftDeck ? (
            <p className="truncate text-[10px] text-text-secondary">
              <DeckLabel deck={leftDeck} showCode className="inline-flex" />
            </p>
          ) : null}
          <p className="text-center text-base font-black text-success">WIN</p>
        </button>
        <button
          type="button"
          className="rounded-lg bg-surface px-2 py-1 text-left transition hover:bg-green-950/40 active:bg-green-900/50"
          onClick={() => onComplete(right.playerId)}
        >
          <p className="truncate text-xs font-semibold">{getPlayerName(players, right.playerId)}</p>
          {rightDeck ? (
            <p className="truncate text-[10px] text-text-secondary">
              <DeckLabel deck={rightDeck} showCode className="inline-flex" />
            </p>
          ) : null}
          <p className="text-center text-base font-black text-success">WIN</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-1 px-2 pb-2">
        <button type="button" className="rounded px-1.5 py-0.5 text-[10px] bg-surface text-text-secondary" onClick={rollFirst}>
          {t('table.roll')}
        </button>
        <button
          type="button"
          className={['rounded px-1.5 py-0.5 text-[10px]', match.firstPlayerId === match.player1Id ? 'bg-brand-600 text-white' : 'bg-surface text-text-secondary'].join(' ')}
          onClick={() => onSetFirstPlayer(match.player1Id)}
        >
          A
        </button>
        <button
          type="button"
          className={['rounded px-1.5 py-0.5 text-[10px]', match.firstPlayerId === match.player2Id ? 'bg-brand-600 text-white' : 'bg-surface text-text-secondary'].join(' ')}
          onClick={() => onSetFirstPlayer(match.player2Id)}
        >
          B
        </button>
        <button type="button" className="rounded px-1.5 py-0.5 text-[10px] bg-surface text-text-secondary" onClick={() => setEditing(true)}>
          {t('common.edit')}
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
    </article>
  )
}

function TableSlotPanel({
  slot,
  match,
  players,
  decks,
  matches,
  pendingAssignment,
  onAssign,
  onTapSide,
  onClear,
  onComplete,
  onSetFirstPlayer,
  compactEmpty,
}: {
  slot: number
  match?: ActiveMatch
  players: Player[]
  decks: Deck[]
  matches: Match[]
  pendingAssignment: PendingTableAssignment | null
  onAssign: (side: 'left' | 'right', payload: TableDragPayload) => void
  onTapSide: (side: 'left' | 'right') => void
  onClear: () => void
  onComplete: (winnerPlayerId: string) => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
  compactEmpty?: boolean
}) {
  const { t } = useI18n()
  const isComplete = Boolean(
    match?.player1Id && match?.player2Id && match?.deck1Id && match?.deck2Id,
  )

  if (compactEmpty && !match) {
    return <CompactEmptyTableSlot slot={slot} onTap={() => onTapSide('left')} />
  }

  if (match && isComplete) {
    return (
      <CompactCompleteTable
        slot={slot}
        match={match}
        players={players}
        decks={decks}
        matches={matches}
        onClear={onClear}
        onComplete={onComplete}
        onSetFirstPlayer={onSetFirstPlayer}
      />
    )
  }

  return (
    <article className="rounded-xl bg-surface-elevated ring-1 ring-surface-muted">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <span className="text-xs font-semibold text-brand-500">
          {t('table.label')} {slot}
        </span>
        {match ? (
          <button type="button" className="text-[10px] text-text-secondary hover:text-danger" onClick={onClear}>
            {t('table.clear')}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 px-2 pb-2">
        <CompactSideDrop
          label={t('table.sideLeft')}
          playerId={match?.player1Id ?? ''}
          deckId={match?.deck1Id ?? ''}
          players={players}
          decks={decks}
          highlight={Boolean(pendingAssignment)}
          onDrop={(payload) => onAssign('left', payload)}
          onTap={() => onTapSide('left')}
        />
        <span className="self-center text-[10px] text-text-secondary">vs</span>
        <CompactSideDrop
          label={t('table.sideRight')}
          playerId={match?.player2Id ?? ''}
          deckId={match?.deck2Id ?? ''}
          players={players}
          decks={decks}
          highlight={Boolean(pendingAssignment)}
          onDrop={(payload) => onAssign('right', payload)}
          onTap={() => onTapSide('right')}
        />
      </div>
    </article>
  )
}

export function TableBoard({
  sessionId,
  players,
  decks,
  matches,
  onComplete,
  onSetFirstPlayer,
}: {
  sessionId: string
  players: Player[]
  decks: Deck[]
  matches: Match[]
  onComplete: (matchId: string, winnerPlayerId: string) => void
  onSetFirstPlayer: (matchId: string, firstPlayerId: string | null) => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const appState = useAppStore()
  const activeMatches = useAppStore((state) => state.activeMatches)
  const assignTableSide = useAppStore((state) => state.assignTableSide)
  const setSessionTableCount = useAppStore((state) => state.setSessionTableCount)
  const clearActiveMatch = useAppStore((state) => state.clearActiveMatch)

  const [pendingAssignment, setPendingAssignment] = useState<PendingTableAssignment | null>(null)
  const [slotPicker, setSlotPicker] = useState<{ slot: number; side: 'left' | 'right' } | null>(null)

  const tableCount = getSessionTableCount(appState, sessionId)
  const sessionMatches = activeMatches.filter((match) => match.sessionId === sessionId)
  const overflowMatches = sessionMatches.filter((match) => match.tableSlot === null)

  const applyAssignment = (tableSlot: number, side: 'left' | 'right', payload: TableDragPayload) => {
    try {
      if (payload.kind === 'player') {
        assignTableSide(sessionId, tableSlot, side, { playerId: payload.playerId })
      } else {
        assignTableSide(sessionId, tableSlot, side, { deckId: payload.deckId })
      }
      setPendingAssignment(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('table.assignFailed'))
    }
  }

  const handleAssign = (tableSlot: number, side: 'left' | 'right', payload: TableDragPayload) => {
    applyAssignment(tableSlot, side, payload)
  }

  const handleTapSide = (tableSlot: number, side: 'left' | 'right') => {
    if (pendingAssignment) {
      applyAssignment(tableSlot, side, pendingAssignment)
      return
    }
    setSlotPicker({ slot: tableSlot, side })
  }

  const changeTableCount = (delta: number) => {
    try {
      setSessionTableCount(sessionId, tableCount + delta)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('table.countFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="order-1 space-y-2 md:order-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('table.title')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="min-h-8 px-2 py-0.5 text-xs" disabled={tableCount <= 1} onClick={() => changeTableCount(-1)}>
            −
          </Button>
          <span className="min-w-6 text-center text-sm font-semibold">{tableCount}</span>
          <Button variant="ghost" className="min-h-8 px-2 py-0.5 text-xs" disabled={tableCount >= MAX_TABLE_COUNT} onClick={() => changeTableCount(1)}>
            +
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {Array.from({ length: tableCount }, (_, index) => {
          const slot = index + 1
          const match = getActiveMatchForTableSlot(sessionMatches, sessionId, slot)
          return (
            <TableSlotPanel
              key={slot}
              slot={slot}
              match={match}
              players={players}
              decks={decks}
              matches={matches}
              pendingAssignment={pendingAssignment}
              onAssign={(side, payload) => handleAssign(slot, side, payload)}
              onTapSide={(side) => handleTapSide(slot, side)}
              onClear={() => {
                if (match) clearActiveMatch(match.id)
              }}
              onComplete={(winnerPlayerId) => match && onComplete(match.id, winnerPlayerId)}
              onSetFirstPlayer={(firstPlayerId) => match && onSetFirstPlayer(match.id, firstPlayerId)}
              compactEmpty={isMobile}
            />
          )
        })}
      </div>

      {overflowMatches.length ? (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold text-text-secondary">{t('table.unassigned')}</h3>
          {overflowMatches.map((match) => (
            <ActiveMatchCard
              key={match.id}
              match={match}
              players={players}
              decks={decks}
              matches={matches}
              compact
              onComplete={(winnerPlayerId) => onComplete(match.id, winnerPlayerId)}
              onSetFirstPlayer={(firstPlayerId) => onSetFirstPlayer(match.id, firstPlayerId)}
            />
          ))}
        </section>
      ) : null}

      {!sessionMatches.length ? (
        <div className="rounded-xl border border-dashed border-surface-muted px-3 py-3 text-center text-xs text-text-secondary">
          {t('table.empty')}
        </div>
      ) : null}
      </div>

      <div className="order-2 hidden md:block md:order-1">
        <AssignmentDock
          sessionId={sessionId}
          players={players}
          decks={decks}
          matches={matches}
          pendingAssignment={pendingAssignment}
          onSelectAssignment={setPendingAssignment}
          onClearAssignment={() => setPendingAssignment(null)}
        />
      </div>

      <TableSlotAssignSheet
        open={slotPicker !== null}
        slot={slotPicker?.slot ?? 0}
        side={slotPicker?.side ?? 'left'}
        players={players}
        decks={decks}
        onClose={() => setSlotPicker(null)}
        onPickPlayer={(playerId) => {
          if (!slotPicker) return
          applyAssignment(slotPicker.slot, slotPicker.side, { kind: 'player', playerId })
        }}
        onPickDeck={(deckId) => {
          if (!slotPicker) return
          applyAssignment(slotPicker.slot, slotPicker.side, { kind: 'deck', deckId })
        }}
      />
    </div>
  )
}
