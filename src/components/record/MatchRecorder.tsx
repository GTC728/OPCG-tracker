import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { TableBoard } from '@/components/record/TableBoard'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { getListedPlayers } from '@/lib/entityVisibility'
import { getSortedPlayersForSession } from '@/lib/selectors'
import { uiCalloutWarning } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Match, Player } from '@/types'

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

export function MatchRecorder() {
  const { t } = useI18n()
  const toast = useToast()
  const appState = useAppStore()
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const matches = useAppStore((state) => state.matches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const setActiveMatchFirstPlayer = useAppStore((state) => state.setActiveMatchFirstPlayer)
  const completeActiveMatch = useAppStore((state) => state.completeActiveMatch)
  const undoCompletedMatch = useAppStore((state) => state.undoCompletedMatch)
  const setMatchNotes = useAppStore((state) => state.setMatchNotes)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [pendingNotesMatch, setPendingNotesMatch] = useState<Match | null>(null)

  const rosterPlayers = useMemo(() => {
    if (!currentSessionId) return getListedPlayers(appState)
    return getSortedPlayersForSession(appState, currentSessionId)
  }, [appState, currentSessionId])

  const activeDecks = decks.filter((deck) => !deck.archived)
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
        <section className={[uiCalloutWarning, 'p-2 text-xs'].join(' ')}>
          {rosterPlayers.length < 2 ? t('record.needPlayers') : t('record.needDecks')}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setActiveTab('settings')}>
            {t('record.goSettings')}
          </button>
        </section>
      ) : null}

      {currentSessionId ? (
        <TableBoard
          embedded
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
