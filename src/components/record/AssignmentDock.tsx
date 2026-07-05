import {
  ASSIGNMENT_DRAWER_EXPANDED,
  ASSIGNMENT_DRAWER_HEADER,
} from '@/lib/layout'
import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { useBottomChromePanel } from '@/components/layout/BottomChrome'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getAssignmentRecentDeckIds } from '@/lib/selectors'
import {
  encodeTableDragPayload,
  type PendingTableAssignment,
  type PendingTableTarget,
  type TableDragPayload,
} from '@/lib/tableMode'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Match, Player } from '@/types'

const H_SCROLL =
  'flex flex-nowrap gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

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
  compact,
  onTapSelect,
}: {
  player: Player
  selected: boolean
  compact?: boolean
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
        'shrink-0 cursor-grab outline-none active:cursor-grabbing text-[10px] leading-tight',
        compact
          ? 'rounded-md px-1.5 py-0.5 font-semibold'
          : 'rounded-lg px-3 py-1.5 text-sm font-semibold',
        selected
          ? compact
            ? 'bg-brand-600 text-white ring-1 ring-brand-400'
            : 'border-2 border-brand-400 bg-brand-600 text-white'
          : compact
            ? 'border border-surface-muted bg-surface text-text-primary'
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
  compact,
  onTapSelect,
}: {
  deck: Deck
  selected: boolean
  compact?: boolean
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
        'shrink-0 cursor-grab outline-none active:cursor-grabbing text-[10px] leading-tight',
        compact
          ? 'max-w-[9rem] rounded-md px-1.5 py-0.5'
          : 'rounded-lg px-2 py-1 text-xs',
        selected
          ? compact
            ? 'bg-brand-600 text-white ring-1 ring-brand-400'
            : 'border-2 border-brand-400 bg-brand-600 text-white'
          : compact
            ? 'border border-surface-muted bg-surface'
            : 'border border-surface-muted bg-surface',
      ].join(' ')}
    >
      <DeckLabel deck={deck} showCode className={['inline-flex truncate', compact ? 'gap-0.5 text-[10px]' : ''].join(' ')} />
    </button>
  )
}

function AssignmentPanelBody({
  sessionId,
  players,
  decks,
  matches,
  pendingAssignment,
  pendingTableTarget = null,
  onSelectAssignment,
  onClearAssignment,
  recentDeckLimit,
  showMoreDecks,
  onShowMoreDecks,
  compact = false,
}: {
  sessionId: string
  players: Player[]
  decks: Deck[]
  matches: Match[]
  pendingAssignment: PendingTableAssignment | null
  pendingTableTarget?: PendingTableTarget | null
  onSelectAssignment: (assignment: PendingTableAssignment | null) => void
  onClearAssignment: () => void
  recentDeckLimit: number
  showMoreDecks: boolean
  onShowMoreDecks: () => void
  compact?: boolean
}) {
  const { t } = useI18n()
  const activeMatches = useAppStore((store) => store.activeMatches)
  const [deckQuery, setDeckQuery] = useState('')

  const selectablePlayers = useMemo(() => players.filter(isSelectablePlayer), [players])

  const recentDeckIds = useMemo(
    () =>
      getAssignmentRecentDeckIds(
        matches,
        activeMatches,
        decks,
        sessionId,
        selectablePlayers.map((player) => player.id),
        recentDeckLimit,
      ),
    [activeMatches, decks, matches, selectablePlayers, recentDeckLimit, sessionId],
  )

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

  const labelClass = 'shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-secondary'
  const hintClass = 'text-xs text-text-secondary'
  const playerZoneActive = pendingTableTarget?.field === 'player'
  const deckZoneActive = pendingTableTarget?.field === 'deck'
  const zoneHighlightClass = 'rounded-md bg-brand-500/10 ring-2 ring-brand-400'
  const compactRowClass = 'flex items-center gap-2.5 px-2.5'

  const playerSection = compact ? (
    <div className={[playerZoneActive ? zoneHighlightClass : '', 'py-0.5'].join(' ')}>
      <div className={compactRowClass}>
        <p className={labelClass}>{t('assignment.players')}</p>
        <div className={[H_SCROLL, 'min-w-0 flex-1'].join(' ')}>
          {selectablePlayers.map((player) => (
            <DraggablePlayerChip
              key={player.id}
              player={player}
              compact
              selected={pendingAssignment?.kind === 'player' && pendingAssignment.playerId === player.id}
              onTapSelect={() => togglePlayer(player.id)}
            />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className={playerZoneActive ? zoneHighlightClass : undefined}>
      <p className={labelClass}>{t('assignment.players')}</p>
      <div className={['mt-1', H_SCROLL].join(' ')}>
        {selectablePlayers.map((player) => (
          <DraggablePlayerChip
            key={player.id}
            player={player}
            selected={pendingAssignment?.kind === 'player' && pendingAssignment.playerId === player.id}
            onTapSelect={() => togglePlayer(player.id)}
          />
        ))}
      </div>
    </div>
  )

  const deckSection = compact ? (
    <div className={[deckZoneActive ? zoneHighlightClass : '', 'space-y-1 py-0.5'].join(' ')}>
      <div className={compactRowClass}>
        <p className={labelClass}>{t('assignment.decks')}</p>
        <input
          className="min-h-7 min-w-0 flex-1 rounded-md border border-surface-muted bg-surface px-2 py-0.5 text-[10px] text-text-primary outline-none focus:border-brand-500"
          placeholder={t('deck.searchPlaceholder')}
          value={deckQuery}
          onChange={(event) => setDeckQuery(event.target.value)}
        />
      </div>
      <div className={['px-2.5', H_SCROLL].join(' ')}>
        {displayDecks.length ? (
          displayDecks.map((deck) => (
            <DraggableDeckChip
              key={deck.id}
              deck={deck}
              compact
              selected={pendingAssignment?.kind === 'deck' && pendingAssignment.deckId === deck.id}
              onTapSelect={() => toggleDeck(deck.id)}
            />
          ))
        ) : (
          <p className="text-[10px] text-text-secondary">
            {deckQuery.trim() ? t('deck.searchEmpty') : t('assignment.noRecentDecks')}
          </p>
        )}
      </div>
      {showMoreDecks ? (
        <button type="button" className="px-2.5 text-[9px] text-brand-400 outline-none" onClick={onShowMoreDecks}>
          {t('assignment.showMoreDecks')}
        </button>
      ) : null}
    </div>
  ) : (
    <div className={deckZoneActive ? zoneHighlightClass : undefined}>
      <p className={labelClass}>{t('assignment.decks')}</p>
      <input
        className="mt-1 min-h-9 w-full rounded-lg border border-surface-muted bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand-500"
        placeholder={t('deck.searchPlaceholder')}
        value={deckQuery}
        onChange={(event) => setDeckQuery(event.target.value)}
      />
      {recentDecks.length && !deckQuery.trim() ? (
        <p className="mt-1 text-[10px] text-text-secondary">{t('deck.recentUsed')}</p>
      ) : null}
      <div className={['mt-1.5', H_SCROLL].join(' ')}>
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
      {showMoreDecks ? (
        <button type="button" className="mt-0.5 text-[9px] text-brand-400 outline-none" onClick={onShowMoreDecks}>
          {t('assignment.showMoreDecks')}
        </button>
      ) : null}
    </div>
  )

  if (compact) {
    return (
      <div className="space-y-1">
        {playerSection}
        {deckSection}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className={[hintClass, pendingAssignment || pendingTableTarget ? 'text-brand-300' : ''].join(' ')}>
        {pendingTableTarget
          ? `${t('table.label')}${pendingTableTarget.slot} · ${pendingTableTarget.side === 'left' ? t('table.sideLeft') : t('table.sideRight')} · ${pendingTableTarget.field === 'player' ? t('assignment.players') : t('assignment.decks')}`
          : pendingAssignment
            ? t('assignment.tapTableSide')
            : t('assignment.hintIndependent')}
      </p>

      {playerSection}
      {deckSection}
    </div>
  )
}

export function AssignmentDock({
  sessionId,
  players,
  decks,
  matches,
  pendingAssignment,
  pendingTableTarget = null,
  onSelectAssignment,
  onClearAssignment,
  onClearTableTarget,
  variant = 'inline',
  expanded: expandedProp,
  onExpandedChange,
}: {
  sessionId: string
  players: Player[]
  decks: Deck[]
  matches: Match[]
  pendingAssignment: PendingTableAssignment | null
  pendingTableTarget?: PendingTableTarget | null
  onSelectAssignment: (assignment: PendingTableAssignment | null) => void
  onClearAssignment: () => void
  onClearTableTarget?: () => void
  variant?: 'inline' | 'drawer'
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}) {
  const { t } = useI18n()
  const [expandedInternal, setExpandedInternal] = useState(variant === 'drawer')
  const [recentExpanded, setRecentExpanded] = useState(false)

  const expanded = expandedProp ?? expandedInternal
  const setExpanded = onExpandedChange ?? setExpandedInternal

  const selectablePlayers = useMemo(() => players.filter(isSelectablePlayer), [players])
  const activeMatches = useAppStore((store) => store.activeMatches)

  const recentDeckLimit = variant === 'drawer' && !recentExpanded ? 8 : 12
  const hasMoreRecentDecks =
    variant === 'drawer' &&
    !recentExpanded &&
    getAssignmentRecentDeckIds(
      matches,
      activeMatches,
      decks,
      sessionId,
      players.map((player) => player.id),
      12,
    ).length > 8

  const pendingLabel = pendingAssignment
    ? pendingAssignment.kind === 'player'
      ? getPlayerName(players, pendingAssignment.playerId)
      : getDeck(decks, pendingAssignment.deckId)?.displayName ?? '—'
    : null

  const collapsedSummary = pendingTableTarget
    ? `${t('table.label')}${pendingTableTarget.slot} · ${pendingTableTarget.side === 'left' ? t('table.sideLeft') : t('table.sideRight')} · ${pendingTableTarget.field === 'player' ? t('assignment.players') : t('assignment.decks')}`
    : pendingLabel
      ? pendingLabel
      : `${selectablePlayers.length} ${t('assignment.playersShort')}`

  const drawerPanel =
    variant === 'drawer' ? (
      <div className="overflow-hidden border-t border-surface-muted bg-surface-elevated/98 shadow-[0_-4px_16px_rgba(0,0,0,0.25)] backdrop-blur">
        <div
          className="flex items-center gap-1.5 border-b border-surface-muted/80 px-2.5"
          style={{ height: ASSIGNMENT_DRAWER_HEADER }}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-[11px] font-semibold">{t('assignment.title')}</span>
            <span className="truncate text-[10px] text-text-secondary">{collapsedSummary}</span>
          </button>
          {pendingAssignment || pendingTableTarget ? (
            <button
              type="button"
              className="shrink-0 text-[10px] text-brand-400 outline-none"
              onClick={() => {
                onClearAssignment()
                onClearTableTarget?.()
              }}
            >
              {t('assignment.tapCancel')}
            </button>
          ) : null}
          <button
            type="button"
            className="shrink-0 px-1.5 py-0.5 text-[10px] text-brand-400 outline-none"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? '▼' : '▲'}
          </button>
        </div>

        {expanded ? (
          <div
            className="overflow-hidden py-1"
            style={{ maxHeight: `calc(${ASSIGNMENT_DRAWER_EXPANDED} - ${ASSIGNMENT_DRAWER_HEADER})` }}
          >
            <AssignmentPanelBody
              sessionId={sessionId}
              players={players}
              decks={decks}
              matches={matches}
              pendingAssignment={pendingAssignment}
              pendingTableTarget={pendingTableTarget}
              onSelectAssignment={onSelectAssignment}
              onClearAssignment={onClearAssignment}
              recentDeckLimit={recentDeckLimit}
              showMoreDecks={hasMoreRecentDecks}
              onShowMoreDecks={() => setRecentExpanded(true)}
              compact
            />
          </div>
        ) : null}
      </div>
    ) : null

  useBottomChromePanel(drawerPanel, variant === 'drawer')

  if (variant === 'drawer') {
    return null
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
            {selectablePlayers.length} {t('assignment.playersShort')} · {recentDeckLimit} {t('assignment.decksShort')}
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
        {pendingAssignment || pendingTableTarget ? (
          <button
            type="button"
            className="text-xs text-brand-400 outline-none"
            onClick={() => {
              onClearAssignment()
              onClearTableTarget?.()
            }}
          >
            {t('assignment.tapCancel')}
          </button>
        ) : (
          <button type="button" className="text-xs text-text-secondary outline-none" onClick={() => setExpanded(false)}>
            ▲
          </button>
        )}
      </div>

      <AssignmentPanelBody
        sessionId={sessionId}
        players={players}
        decks={decks}
        matches={matches}
        pendingAssignment={pendingAssignment}
        pendingTableTarget={pendingTableTarget}
        onSelectAssignment={onSelectAssignment}
        onClearAssignment={onClearAssignment}
        recentDeckLimit={recentDeckLimit}
        showMoreDecks={false}
        onShowMoreDecks={() => setRecentExpanded(true)}
      />
    </section>
  )
}

export type { PendingTableAssignment, PendingTableTarget }
