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
import type { ActiveMatch, Deck, Player } from '@/types'

type PendingCompletion = {
  matchId: string
  winnerPlayerId: string
}

function PostMatchSheet({
  activeMatch,
  winnerPlayerId,
  players,
  decks,
  open,
  onCancel,
  onConfirm,
}: {
  activeMatch: ActiveMatch | null
  winnerPlayerId: string | null
  players: Player[]
  decks: Deck[]
  open: boolean
  onCancel: () => void
  onConfirm: (notes: string | null) => void
}) {
  const { t } = useI18n()
  const [notes, setNotes] = useState('')

  if (!activeMatch || !winnerPlayerId) return null

  const winnerName = getPlayerName(players, winnerPlayerId)
  const leftPlayer = getPlayerName(players, activeMatch.player1Id)
  const rightPlayer = getPlayerName(players, activeMatch.player2Id)
  const leftDeck = getDeck(decks, activeMatch.deck1Id)
  const rightDeck = getDeck(decks, activeMatch.deck2Id)

  return (
    <BottomSheet open={open} title={t('record.confirmMatch')} onClose={onCancel}>
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
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="button" onClick={() => onConfirm(notes.trim() || null)}>
          {t('record.confirmMatchAction')}
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
  const activeMatches = useAppStore((state) => state.activeMatches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const setActiveMatchFirstPlayer = useAppStore((state) => state.setActiveMatchFirstPlayer)
  const completeActiveMatch = useAppStore((state) => state.completeActiveMatch)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [pendingCompletion, setPendingCompletion] = useState<PendingCompletion | null>(null)

  const rosterPlayers = useMemo(() => {
    if (!currentSessionId) return getListedPlayers(appState)
    return getSortedPlayersForSession(appState, currentSessionId)
  }, [appState, currentSessionId])

  const activeDecks = decks.filter((deck) => !deck.archived)
  const canAssign = rosterPlayers.length >= 2 && activeDecks.length >= 1

  const pendingActiveMatch = pendingCompletion
    ? (activeMatches.find((match) => match.id === pendingCompletion.matchId) ?? null)
    : null

  const handleComplete = (matchId: string, winnerPlayerId: string) => {
    setPendingCompletion({ matchId, winnerPlayerId })
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
        key={pendingCompletion?.matchId}
        activeMatch={pendingActiveMatch}
        winnerPlayerId={pendingCompletion?.winnerPlayerId ?? null}
        players={players}
        decks={decks}
        open={pendingCompletion !== null}
        onCancel={() => setPendingCompletion(null)}
        onConfirm={(notes) => {
          if (!pendingCompletion) return
          try {
            completeActiveMatch(pendingCompletion.matchId, pendingCompletion.winnerPlayerId, notes)
            setPendingCompletion(null)
            toast.success(t('record.matchSaved'))
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t('rematch.failed'))
          }
        }}
      />
    </>
  )
}
