import { useMemo, useState } from 'react'
import { MatchListItem } from '@/components/match/MatchResultRow'
import { RematchConfirmSheet } from '@/components/record/RematchConfirmSheet'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatchInput, Deck, Match, Player } from '@/types'

function recentSessionMatches(matches: Match[], sessionId: string, limit = 8): Match[] {
  return matches
    .filter((match) => match.sessionId === sessionId && match.deletedAt === null && match.finishedAt)
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, limit)
}

export function RecentMatchesSection({
  sessionId,
  matches,
  players,
  decks,
}: {
  sessionId: string
  matches: Match[]
  players: Player[]
  decks: Deck[]
}) {
  const { t } = useI18n()
  const toast = useToast()
  const createActiveMatchOnEmptyTable = useAppStore((state) => state.createActiveMatchOnEmptyTable)
  const [pendingRematch, setPendingRematch] = useState<ActiveMatchInput | null>(null)

  const recentMatches = useMemo(
    () => recentSessionMatches(matches, sessionId),
    [matches, sessionId],
  )

  const placeRematch = (input: ActiveMatchInput) => {
    try {
      createActiveMatchOnEmptyTable({ ...input, notes: null })
      toast.success(t('rematch.placed'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('rematch.failed'))
    }
  }

  if (!recentMatches.length) return null

  return (
    <>
      <CollapsibleSection title={t('record.recentMatches')} defaultOpen>
        <div className="space-y-2">
          {recentMatches.map((match) => {
            const timeLabel = formatDateTime(match.finishedAt).split(' ').slice(-1)[0]
            return (
              <MatchListItem
                key={match.id}
                match={match}
                players={players}
                decks={decks}
                meta={timeLabel}
                showResultColors
                onClick={() =>
                  setPendingRematch({
                    player1Id: match.player1Id,
                    deck1Id: match.deck1Id,
                    player2Id: match.player2Id,
                    deck2Id: match.deck2Id,
                    firstPlayerId: null,
                    notes: null,
                  })
                }
              />
            )
          })}
        </div>
      </CollapsibleSection>

      <RematchConfirmSheet
        open={pendingRematch !== null}
        input={pendingRematch}
        players={players}
        decks={decks}
        confirmLabel={t('rematch.confirmPlace')}
        onClose={() => setPendingRematch(null)}
        onConfirm={placeRematch}
      />
    </>
  )
}
