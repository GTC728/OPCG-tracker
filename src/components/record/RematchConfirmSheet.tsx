import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { getDeck, getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import type { ActiveMatchInput, Deck, Player } from '@/types'

export function RematchConfirmSheet({
  open,
  input,
  players,
  decks,
  title,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean
  input: ActiveMatchInput | null
  players: Player[]
  decks: Deck[]
  title?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: (input: ActiveMatchInput) => void
}) {
  const { t } = useI18n()
  if (!input) return null

  const player1 = getPlayerName(players, input.player1Id)
  const player2 = getPlayerName(players, input.player2Id)
  const deck1 = getDeck(decks, input.deck1Id)
  const deck2 = getDeck(decks, input.deck2Id)
  const firstName = input.firstPlayerId ? getPlayerName(players, input.firstPlayerId) : null

  return (
    <BottomSheet open={open} title={title ?? t('rematch.confirmTitle')} onClose={onClose}>
      <p className="text-sm text-text-secondary">{t('rematch.confirmDesc')}</p>
      <div className="mt-3 space-y-2 rounded-xl bg-surface p-3 ring-1 ring-surface-muted">
        <p className="text-sm font-semibold">
          {player1}
          {deck1 ? (
            <>
              {' '}
              <DeckLabel deck={deck1} showCode className="inline-flex" />
            </>
          ) : null}
        </p>
        <p className="text-xs font-semibold text-text-secondary">vs</p>
        <p className="text-sm font-semibold">
          {player2}
          {deck2 ? (
            <>
              {' '}
              <DeckLabel deck={deck2} showCode className="inline-flex" />
            </>
          ) : null}
        </p>
        {firstName ? (
          <p className="pt-1 text-xs text-text-secondary">
            {t('table.firstPlayer')}: {firstName}
          </p>
        ) : null}
        {input.notes ? (
          <p className="text-xs text-text-secondary">
            {t('record.notesOptional')}: {input.notes}
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => {
            onConfirm(input)
            onClose()
          }}
        >
          {confirmLabel ?? t('rematch.confirmPlace')}
        </Button>
      </div>
    </BottomSheet>
  )
}
