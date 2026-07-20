import {
  ASSIGNMENT_DRAWER_EXPANDED,
  ASSIGNMENT_DRAWER_HEADER,
} from '@/lib/layout'
import { useMemo, useState, type ReactNode } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { useBottomChromePanel } from '@/components/layout/BottomChrome'
import { ScrollRegion } from '@/components/ui/ScrollRegion'
import { useHorizontalWheelScroll } from '@/hooks/useWheelScroll'
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
import { selectChipClass } from '@/lib/selectSurface'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Match, Player } from '@/types'

const assignmentChipRail = 'flex flex-nowrap items-center gap-1 py-0.5 snap-none'

function AssignmentChipRail({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useHorizontalWheelScroll<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={[
        assignmentChipRail,
        'min-w-0 overflow-x-auto overflow-y-hidden ui-scroll-region-x',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

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
        'shrink-0 cursor-grab active:cursor-grabbing',
        selectChipClass(selected ? 'active' : 'default', compact, 'font-semibold leading-tight'),
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
        'shrink-0 cursor-grab active:cursor-grabbing',
        selectChipClass(selected ? 'active' : 'default', compact, [
          'leading-tight',
          compact ? 'max-w-[9rem]' : 'text-xs',
        ].join(' ')),
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
  const zoneHighlightClass = 'rounded-md bg-brand-500/10 shadow-[inset_0_0_0_1px] shadow-brand-400/60'
  const compactRowClass = 'flex items-center gap-2.5 px-2.5'

  const playerSection = compact ? (
    <div className={[playerZoneActive ? zoneHighlightClass : '', 'py-0.5'].join(' ')}>
      <div className={compactRowClass}>
        <p className={labelClass}>{t('assignment.players')}</p>
        <AssignmentChipRail className="min-w-0 flex-1">
          {selectablePlayers.map((player) => (
            <DraggablePlayerChip
              key={player.id}
              player={player}
              compact
              selected={pendingAssignment?.kind === 'player' && pendingAssignment.playerId === player.id}
              onTapSelect={() => togglePlayer(player.id)}
            />
          ))}
        </AssignmentChipRail>
      </div>
    </div>
  ) : (
    <div className={playerZoneActive ? zoneHighlightClass : undefined}>
      <p className={labelClass}>{t('assignment.players')}</p>
      <AssignmentChipRail className="mt-1">
        {selectablePlayers.map((player) => (
          <DraggablePlayerChip
            key={player.id}
            player={player}
            selected={pendingAssignment?.kind === 'player' && pendingAssignment.playerId === player.id}
            onTapSelect={() => togglePlayer(player.id)}
          />
        ))}
      </AssignmentChipRail>
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
      <AssignmentChipRail className="px-2.5">
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
      </AssignmentChipRail>
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
      <AssignmentChipRail className="mt-1.5">
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
      </AssignmentChipRail>
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
  const [expandedInternal, setExpandedInternal] = useState(false)
  const expanded = expandedProp ?? expandedInternal
  const setExpanded = onExpandedChange ?? setExpandedInternal

  const selectablePlayers = useMemo(() => players.filter(isSelectablePlayer), [players])

  const recentDeckLimit = 12

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
      <div className="overflow-hidden rounded-t-2xl border-t border-white/[0.06] bg-surface-elevated/98 shadow-[0_-4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md">
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
          <ScrollRegion
            axis="y"
            className="py-1.5"
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
              compact
            />
          </ScrollRegion>
        ) : null}
      </div>
    ) : null

  const activeTab = useAppStore((store) => store.activeTab)
  useBottomChromePanel(drawerPanel, variant === 'drawer' && activeTab === 'record')

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
      />
    </section>
  )
}

export type { PendingTableAssignment, PendingTableTarget }
