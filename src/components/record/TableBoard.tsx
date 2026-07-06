import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { AssignmentDock } from '@/components/record/AssignmentDock'
import { MatchForm } from '@/components/record/MatchForm'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getOrderedMatchSides } from '@/lib/matchDisplay'
import { selectSurfaceClass } from '@/lib/selectSurface'
import {
  decodeTableDragPayload,
  getActiveMatchForTableSlot,
  getSessionTableCount,
  MAX_TABLE_COUNT,
  type PendingTableAssignment,
  type PendingTableTarget,
  type TableDragPayload,
} from '@/lib/tableMode'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatch, Deck, Match, Player } from '@/types'

function TableNumberBadge({ slot }: { slot: number }) {
  const { t } = useI18n()

  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand-500/15 text-[9px] font-bold leading-none text-brand-400"
      aria-label={`${t('table.label')} ${slot}`}
      title={`${t('table.label')} ${slot}`}
    >
      {slot}
    </span>
  )
}

function TableSideInline({
  playerId,
  deckId,
  players,
  decks,
  align = 'start',
}: {
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  align?: 'start' | 'end'
}) {
  const deck = deckId ? getDeck(decks, deckId) : null
  const name = getPlayerName(players, playerId)

  return (
    <div
      className={[
        'flex min-w-0 items-center gap-0.5 overflow-hidden whitespace-nowrap text-[10px] leading-none',
        align === 'end' ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      <span className="shrink-0 font-semibold text-text-primary">{name}</span>
      {deck ? (
        <>
          <span className="shrink-0 text-text-secondary">·</span>
          <DeckLabel
            deck={deck}
            showCode
            compact
            className="min-w-0 text-text-secondary"
          />
        </>
      ) : null}
    </div>
  )
}

function WinButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-success/40 bg-success/15 text-[9px] font-bold leading-none text-success outline-none active:bg-success/30 touch-manipulation"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      aria-label="W"
    >
      W
    </button>
  )
}

function TableActionsSheet({
  open,
  slot,
  match,
  onClose,
  onRoll,
  onSetFirstPlayer,
  onEdit,
  onClear,
}: {
  open: boolean
  slot: number
  match: ActiveMatch
  onClose: () => void
  onRoll: () => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
  onEdit: () => void
  onClear: () => void
}) {
  const { t } = useI18n()

  return (
    <BottomSheet open={open} title={`${t('table.label')} ${slot}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-10 text-sm" onClick={onRoll}>
          {t('table.roll')}
        </Button>
        <Button
          variant={match.firstPlayerId === match.player1Id ? 'primary' : 'secondary'}
          className="min-h-10 text-sm"
          onClick={() => onSetFirstPlayer(match.player1Id)}
        >
          A {t('table.firstShort')}
        </Button>
        <Button
          variant={match.firstPlayerId === match.player2Id ? 'primary' : 'secondary'}
          className="min-h-10 text-sm"
          onClick={() => onSetFirstPlayer(match.player2Id)}
        >
          B {t('table.firstShort')}
        </Button>
        <Button variant="secondary" className="min-h-10 text-sm" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      </div>
      <Button
        variant="ghost"
        className="mt-3 min-h-10 w-full text-sm text-danger"
        onClick={() => {
          onClear()
          onClose()
        }}
      >
        {t('table.clear')}
      </Button>
    </BottomSheet>
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [left, right] = getOrderedMatchSides(match)

  const rollFirst = () => onSetFirstPlayer(Math.random() < 0.5 ? match.player1Id : match.player2Id)

  return (
    <>
      <article className="flex min-h-8 min-w-0 touch-manipulation items-center gap-1 rounded-xl bg-surface-elevated px-1.5 py-1 ring-1 ring-surface-muted">
        <TableNumberBadge slot={slot} />
        <div className="min-w-0 flex-1 overflow-hidden">
          <TableSideInline playerId={left.playerId} deckId={left.deckId} players={players} decks={decks} />
        </div>
        <div className="flex shrink-0 items-center gap-1 px-0.5">
          <WinButton onClick={() => onComplete(left.playerId)} />
          <span className="text-[8px] font-semibold uppercase text-text-secondary">vs</span>
          <WinButton onClick={() => onComplete(right.playerId)} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <TableSideInline
            playerId={right.playerId}
            deckId={right.deckId}
            players={players}
            decks={decks}
            align="end"
          />
        </div>
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-sm leading-none text-text-secondary outline-none active:bg-surface-muted"
          aria-label={t('table.moreActions')}
          onClick={() => setMenuOpen(true)}
        >
          ⋯
        </button>
      </article>

      <TableActionsSheet
        open={menuOpen}
        slot={slot}
        match={match}
        onClose={() => setMenuOpen(false)}
        onRoll={rollFirst}
        onSetFirstPlayer={onSetFirstPlayer}
        onEdit={() => {
          setMenuOpen(false)
          setEditing(true)
        }}
        onClear={onClear}
      />

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
}

function AssignFieldCell({
  field,
  playerId,
  deckId,
  players,
  decks,
  highlight,
  onDrop,
  onTap,
}: {
  field: 'player' | 'deck'
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
  const isPlayer = field === 'player'
  const filled = isPlayer ? Boolean(playerId) : Boolean(deck)

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
        'min-h-8 rounded-md px-1 py-0.5 text-left transition',
        selectSurfaceClass(
          highlight ? 'active' : filled ? 'filled' : 'empty',
        ),
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
      {filled ? (
        <div className="text-[10px] leading-snug [overflow-wrap:anywhere]">
          {isPlayer ? (
            <span className="font-semibold">{getPlayerName(players, playerId)}</span>
          ) : deck ? (
            <DeckLabel deck={deck} showCode compact className="inline-flex min-w-0 text-[10px] leading-none text-text-secondary" />
          ) : null}
        </div>
      ) : (
        <span className="text-[9px] text-text-secondary">{isPlayer ? t('assignment.playersShort') : t('assignment.decksShort')}</span>
      )}
    </button>
  )
}

function TableSlotPanel({
  slot,
  match,
  players,
  decks,
  matches,
  pendingAssignment,
  pendingTableTarget,
  onAssign,
  onTapField,
  onDismiss,
  onComplete,
  onSetFirstPlayer,
}: {
  slot: number
  match?: ActiveMatch
  players: Player[]
  decks: Deck[]
  matches: Match[]
  pendingAssignment: PendingTableAssignment | null
  pendingTableTarget: PendingTableTarget | null
  onAssign: (side: 'left' | 'right', payload: TableDragPayload) => void
  onTapField: (side: 'left' | 'right', field: 'player' | 'deck') => void
  onDismiss: () => void
  onComplete: (winnerPlayerId: string) => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
}) {
  const isComplete = Boolean(
    match?.player1Id && match?.player2Id && match?.deck1Id && match?.deck2Id,
  )

  const { t } = useI18n()

  const fieldHighlight = (side: 'left' | 'right', field: 'player' | 'deck') => {
    if (
      pendingTableTarget &&
      pendingTableTarget.slot === slot &&
      pendingTableTarget.side === side &&
      pendingTableTarget.field === field
    ) {
      return true
    }
    if (pendingTableTarget) return false
    if (!pendingAssignment) return false
    return pendingAssignment.kind === field
  }

  if (match && isComplete) {
    return (
      <CompactCompleteTable
        slot={slot}
        match={match}
        players={players}
        decks={decks}
        matches={matches}
        onClear={onDismiss}
        onComplete={onComplete}
        onSetFirstPlayer={onSetFirstPlayer}
      />
    )
  }

  return (
    <article className="flex min-h-9 touch-manipulation items-center gap-1 rounded-xl bg-surface-elevated px-1.5 py-1 ring-1 ring-surface-muted">
      <TableNumberBadge slot={slot} />
      <div className="grid min-w-0 flex-1 grid-cols-[1fr_1fr_auto_1fr_1fr] items-stretch gap-0.5">
        <AssignFieldCell
          field="player"
          playerId={match?.player1Id ?? ''}
          deckId={match?.deck1Id ?? ''}
          players={players}
          decks={decks}
          highlight={fieldHighlight('left', 'player')}
          onDrop={(payload) => onAssign('left', payload)}
          onTap={() => onTapField('left', 'player')}
        />
        <AssignFieldCell
          field="deck"
          playerId={match?.player1Id ?? ''}
          deckId={match?.deck1Id ?? ''}
          players={players}
          decks={decks}
          highlight={fieldHighlight('left', 'deck')}
          onDrop={(payload) => onAssign('left', payload)}
          onTap={() => onTapField('left', 'deck')}
        />
        <span className="self-center px-0.5 text-[8px] font-semibold uppercase text-text-secondary">vs</span>
        <AssignFieldCell
          field="player"
          playerId={match?.player2Id ?? ''}
          deckId={match?.deck2Id ?? ''}
          players={players}
          decks={decks}
          highlight={fieldHighlight('right', 'player')}
          onDrop={(payload) => onAssign('right', payload)}
          onTap={() => onTapField('right', 'player')}
        />
        <AssignFieldCell
          field="deck"
          playerId={match?.player2Id ?? ''}
          deckId={match?.deck2Id ?? ''}
          players={players}
          decks={decks}
          highlight={fieldHighlight('right', 'deck')}
          onDrop={(payload) => onAssign('right', payload)}
          onTap={() => onTapField('right', 'deck')}
        />
      </div>
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 items-center justify-center text-[10px] text-text-secondary outline-none hover:text-danger"
        onClick={onDismiss}
        aria-label={match ? t('table.clear') : t('table.removeTable')}
      >
        ×
      </button>
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
  const [pendingTableTarget, setPendingTableTarget] = useState<PendingTableTarget | null>(null)
  const [drawerExpanded, setDrawerExpanded] = useState(true)

  const tableCount = getSessionTableCount(appState, sessionId)
  const sessionMatches = useMemo(
    () => activeMatches.filter((match) => match.sessionId === sessionId),
    [activeMatches, sessionId],
  )
  const overflowMatches = sessionMatches.filter((match) => match.tableSlot === null)

  const applyAssignment = (tableSlot: number, side: 'left' | 'right', payload: TableDragPayload) => {
    try {
      if (payload.kind === 'player') {
        assignTableSide(sessionId, tableSlot, side, { playerId: payload.playerId })
      } else {
        assignTableSide(sessionId, tableSlot, side, { deckId: payload.deckId })
      }
      setPendingAssignment(null)
      setPendingTableTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('table.assignFailed'))
    }
  }

  const handleSelectAssignment = (assignment: PendingTableAssignment | null) => {
    if (assignment && pendingTableTarget) {
      applyAssignment(pendingTableTarget.slot, pendingTableTarget.side, assignment)
      return
    }
    setPendingAssignment(assignment)
    if (assignment) setPendingTableTarget(null)
  }

  const handleTapField = (tableSlot: number, side: 'left' | 'right', field: 'player' | 'deck') => {
    if (pendingAssignment) {
      applyAssignment(tableSlot, side, pendingAssignment)
      return
    }
    setPendingTableTarget({ slot: tableSlot, side, field })
    setPendingAssignment(null)
    if (isMobile) setDrawerExpanded(true)
  }

  const clearAssignmentState = () => {
    setPendingAssignment(null)
    setPendingTableTarget(null)
  }

  const changeTableCount = (delta: number) => {
    try {
      setSessionTableCount(sessionId, tableCount + delta)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('table.countFailed'))
    }
  }

  const handleDismissTable = (slot: number, match?: ActiveMatch) => {
    if (match) {
      clearActiveMatch(match.id)
      if (pendingTableTarget?.slot === slot) setPendingTableTarget(null)
      return
    }
    if (slot === tableCount) {
      changeTableCount(-1)
      return
    }
    toast.error(t('table.removeOnlyLast'))
  }

  return (
    <div className="flex flex-col gap-2">
      {!isMobile ? (
        <AssignmentDock
          sessionId={sessionId}
          players={players}
          decks={decks}
          matches={matches}
          pendingAssignment={pendingAssignment}
          pendingTableTarget={pendingTableTarget}
          onSelectAssignment={handleSelectAssignment}
          onClearAssignment={clearAssignmentState}
          onClearTableTarget={() => setPendingTableTarget(null)}
        />
      ) : null}

      <div className="space-y-2">
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

        <div className="space-y-2">
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
                pendingTableTarget={pendingTableTarget}
                onAssign={(side, payload) => applyAssignment(slot, side, payload)}
                onTapField={(side, field) => handleTapField(slot, side, field)}
                onDismiss={() => handleDismissTable(slot, match)}
                onComplete={(winnerPlayerId) => match && onComplete(match.id, winnerPlayerId)}
                onSetFirstPlayer={(firstPlayerId) => match && onSetFirstPlayer(match.id, firstPlayerId)}
              />
            )
          })}
        </div>

        {overflowMatches.length ? (
          <section className="space-y-1.5">
            <h3 className="text-xs font-semibold text-text-secondary">{t('table.unassigned')}</h3>
            {overflowMatches.map((match) => (
              <CompactCompleteTable
                key={match.id}
                slot={match.matchNumber}
                match={match}
                players={players}
                decks={decks}
                matches={matches}
                onClear={() => clearActiveMatch(match.id)}
                onComplete={(winnerPlayerId) => onComplete(match.id, winnerPlayerId)}
                onSetFirstPlayer={(firstPlayerId) => onSetFirstPlayer(match.id, firstPlayerId)}
              />
            ))}
          </section>
        ) : null}
      </div>

      {isMobile ? (
        <AssignmentDock
          variant="drawer"
          sessionId={sessionId}
          players={players}
          decks={decks}
          matches={matches}
          pendingAssignment={pendingAssignment}
          pendingTableTarget={pendingTableTarget}
          onSelectAssignment={handleSelectAssignment}
          onClearAssignment={clearAssignmentState}
          onClearTableTarget={() => setPendingTableTarget(null)}
          expanded={drawerExpanded}
          onExpandedChange={setDrawerExpanded}
        />
      ) : null}
    </div>
  )
}
