import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MatchListItem } from '@/components/match/MatchResultRow'
import { MatchForm } from '@/components/record/MatchForm'
import { TableBoard } from '@/components/record/TableBoard'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import {
  getSortedPlayersForSession,
} from '@/lib/selectors'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatchInput, Deck, Match, Player, RecentCombo } from '@/types'

interface RecentComboWithMeta extends RecentCombo {
  lastMatchId: string
  winnerPlayerId: string
}

function getRecentCombosWithMeta(
  matches: Match[],
  players: Player[],
  decks: Deck[],
  sessionId: string | null,
): RecentComboWithMeta[] {
  const activePlayers = new Set(players.filter((player) => !player.archived).map((player) => player.id))
  const activeDecks = new Set(decks.filter((deck) => !deck.archived).map((deck) => deck.id))
  const seen = new Set<string>()
  const combos: RecentComboWithMeta[] = []

  for (const match of matches) {
    if (match.deletedAt !== null) continue
    if (sessionId && match.sessionId !== sessionId) continue
    if (
      !activePlayers.has(match.player1Id) ||
      !activePlayers.has(match.player2Id) ||
      !activeDecks.has(match.deck1Id) ||
      !activeDecks.has(match.deck2Id)
    ) {
      continue
    }

    const key = [match.player1Id, match.deck1Id, match.player2Id, match.deck2Id].join(':')
    if (seen.has(key)) continue

    seen.add(key)
    combos.push({
      player1Id: match.player1Id,
      deck1Id: match.deck1Id,
      player2Id: match.player2Id,
      deck2Id: match.deck2Id,
      lastUsedAt: match.finishedAt,
      lastMatchId: match.id,
      winnerPlayerId: match.winnerPlayerId,
    })

    if (combos.length >= 3) break
  }

  return combos
}

function PostMatchSheet({
  match,
  players,
  decks,
  open,
  onSkip,
  onSave,
}: {
  match: Match | null
  players: Player[]
  decks: Deck[]
  open: boolean
  onSkip: () => void
  onSave: (notes: string | null) => void
}) {
  const { t } = useI18n()
  const [notes, setNotes] = useState('')

  if (!match) return null

  const winnerName = getPlayerName(players, match.winnerPlayerId)
  const leftPlayer = getPlayerName(players, match.player1Id)
  const rightPlayer = getPlayerName(players, match.player2Id)
  const leftDeck = getDeck(decks, match.deck1Id)
  const rightDeck = getDeck(decks, match.deck2Id)

  return (
    <BottomSheet open={open} title={t('record.matchSaved')} onClose={onSkip}>
      <p className="text-sm text-text-secondary">
        {t('record.winner')}：<span className="font-semibold text-success">{winnerName}</span>
      </p>
      <p className="mt-2 truncate text-sm text-text-secondary">
        {leftPlayer}
        {leftDeck ? <> <DeckLabel deck={leftDeck} showCode className="inline-flex" /></> : null}
        <span className="mx-1">vs</span>
        {rightPlayer}
        {rightDeck ? <> <DeckLabel deck={rightDeck} showCode className="inline-flex" /></> : null}
      </p>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-text-secondary">{t('record.notesOptional')}</span>
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
          placeholder={t('record.notesPlaceholder')}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onSkip}>
          {t('record.skipNotes')}
        </Button>
        <Button type="button" onClick={() => onSave(notes.trim() || null)}>
          {t('common.save')}
        </Button>
      </div>
    </BottomSheet>
  )
}

function RecentMatchRow({
  combo,
  players,
  decks,
  sessionId,
  onRematch,
}: {
  combo: RecentComboWithMeta
  players: Player[]
  decks: Deck[]
  sessionId: string
  onRematch: () => void
}) {
  const timeLabel = formatDateTime(combo.lastUsedAt).split(' ').slice(-1)[0]
  const match: Match = {
    id: combo.lastMatchId,
    sessionId,
    matchNumber: 0,
    player1Id: combo.player1Id,
    deck1Id: combo.deck1Id,
    player2Id: combo.player2Id,
    deck2Id: combo.deck2Id,
    winnerPlayerId: combo.winnerPlayerId,
    winnerDeckId: combo.winnerPlayerId === combo.player1Id ? combo.deck1Id : combo.deck2Id,
    firstPlayerId: null,
    resultType: 'normal',
    startedAt: combo.lastUsedAt,
    finishedAt: combo.lastUsedAt,
    source: 'manual',
    deletedAt: null,
    notes: null,
  }

  return (
    <MatchListItem
      match={match}
      players={players}
      decks={decks}
      meta={timeLabel}
      showResultColors
      onClick={onRematch}
    />
  )
}

export function MatchRecorder() {
  const { t } = useI18n()
  const toast = useToast()
  const appState = useAppStore()
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const matches = useAppStore((state) => state.matches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const createActiveMatchOnEmptyTable = useAppStore((state) => state.createActiveMatchOnEmptyTable)
  const setActiveMatchFirstPlayer = useAppStore((state) => state.setActiveMatchFirstPlayer)
  const completeActiveMatch = useAppStore((state) => state.completeActiveMatch)
  const undoCompletedMatch = useAppStore((state) => state.undoCompletedMatch)
  const setMatchNotes = useAppStore((state) => state.setMatchNotes)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [rematchInput, setRematchInput] = useState<ActiveMatchInput | null>(null)
  const [pendingNotesMatch, setPendingNotesMatch] = useState<Match | null>(null)

  const rosterPlayers = useMemo(() => {
    if (!currentSessionId) return players.filter((player) => !player.archived)
    return getSortedPlayersForSession(appState, currentSessionId)
  }, [appState, currentSessionId, players])

  const activeDecks = decks.filter((deck) => !deck.archived)
  const recentCombos = useMemo(
    () => getRecentCombosWithMeta(matches, players, decks, currentSessionId),
    [currentSessionId, decks, matches, players],
  )
  const canAssign = rosterPlayers.length >= 2 && activeDecks.length >= 1

  const handleComplete = (matchId: string, winnerPlayerId: string) => {
    const completed = completeActiveMatch(matchId, winnerPlayerId)
    setPendingNotesMatch(completed)
    toast.showToast({
      type: 'success',
      message: t('record.matchSaved'),
      actionLabel: t('common.restore'),
      onAction: () => {
        undoCompletedMatch(completed.id)
        setPendingNotesMatch(null)
      },
    })
  }

  return (
    <>
      {!canAssign ? (
        <section className="rounded-xl bg-warning/10 p-2 text-xs text-yellow-100">
          {rosterPlayers.length < 2 ? t('record.needPlayers') : t('record.needDecks')}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setActiveTab('settings')}>
            {t('record.goSettings')}
          </button>
        </section>
      ) : null}

      {currentSessionId ? (
        <TableBoard
          sessionId={currentSessionId}
          players={rosterPlayers}
          decks={activeDecks}
          matches={matches}
          onComplete={(matchId, winnerPlayerId) => handleComplete(matchId, winnerPlayerId)}
          onSetFirstPlayer={(matchId, firstPlayerId) => {
            setActiveMatchFirstPlayer(matchId, firstPlayerId)
            toast.info(
              firstPlayerId
                ? `${t('record.firstSetPrefix')}${getPlayerName(players, firstPlayerId)}`
                : t('record.firstCleared'),
            )
          }}
        />
      ) : (
        <section className="rounded-xl border border-dashed border-surface-muted px-3 py-4 text-center text-xs text-text-secondary">
          {t('record.needSession')}
        </section>
      )}

      {recentCombos.length && currentSessionId ? (
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold">{t('record.recentMatches')}</h2>
          {recentCombos.map((combo) => (
            <RecentMatchRow
              key={[combo.player1Id, combo.deck1Id, combo.player2Id, combo.deck2Id].join(':')}
              combo={combo}
              players={players}
              decks={decks}
              sessionId={currentSessionId}
              onRematch={() =>
                setRematchInput({
                  player1Id: combo.player1Id,
                  deck1Id: combo.deck1Id,
                  player2Id: combo.player2Id,
                  deck2Id: combo.deck2Id,
                  firstPlayerId: null,
                  notes: null,
                })
              }
            />
          ))}
        </section>
      ) : null}

      <BottomSheet open={rematchInput !== null} title={t('rematch.title')} onClose={() => setRematchInput(null)}>
        <MatchForm
          initial={rematchInput ?? undefined}
          players={rosterPlayers}
          decks={activeDecks}
          matches={matches}
          submitLabel={t('rematch.placeOnTable')}
          onCancel={() => setRematchInput(null)}
          onSave={(input) => {
            try {
              createActiveMatchOnEmptyTable({ ...input, notes: null })
              setRematchInput(null)
              toast.success(t('rematch.placed'))
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : t('rematch.failed'))
            }
          }}
        />
      </BottomSheet>

      <PostMatchSheet
        key={pendingNotesMatch?.id}
        match={pendingNotesMatch}
        players={players}
        decks={decks}
        open={pendingNotesMatch !== null}
        onSkip={() => setPendingNotesMatch(null)}
        onSave={(notes) => {
          if (pendingNotesMatch) setMatchNotes(pendingNotesMatch.id, notes)
          setPendingNotesMatch(null)
          toast.success(t('record.notesSaved'))
        }}
      />
    </>
  )
}
