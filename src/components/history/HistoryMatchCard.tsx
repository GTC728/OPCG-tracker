import { useState } from 'react'
import { ContextMenu } from '@/components/motion/ContextMenu'
import { Collapse } from '@/components/motion/Collapse'
import { LongPress } from '@/components/motion/LongPress'
import { MatchRecordCard } from '@/components/match/MatchRecordCard'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import type { Deck, Match, Player } from '@/types'

export function HistoryMatchCard({
  match,
  players,
  decks,
  perspectivePlayerId,
  onEdit,
  onCopy,
  onDelete,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  perspectivePlayerId?: string
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const time = formatDateTime(match.finishedAt).split(' ').slice(-1)[0] ?? ''

  return (
    <>
      <LongPress onLongPress={() => setMenuOpen(true)}>
        <MatchRecordCard
          match={match}
          players={players}
          decks={decks}
          perspectivePlayerId={perspectivePlayerId}
          timeLabel={time}
          footerRight={
            <span className="text-[10px] text-text-secondary">
              {expanded ? t('common.collapse') : t('common.expand')}
            </span>
          }
          onClick={() => setExpanded((value) => !value)}
        >
          <Collapse open={expanded}>
            <div className="border-t border-surface-muted px-3.5 pb-3 pt-2">
              <p className="text-xs text-text-secondary">{formatDateTime(match.finishedAt)}</p>
              {match.notes ? (
                <p className="mt-1 text-xs text-text-secondary">
                  {t('history.notes')}：{match.notes}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  className="min-h-9 px-2 py-1.5 text-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit()
                  }}
                >
                  {t('history.editShort')}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-9 px-2 py-1.5 text-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onCopy()
                  }}
                >
                  {t('history.rematchShort')}
                </Button>
                <Button
                  variant="danger"
                  className="min-h-9 px-2 py-1.5 text-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete()
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </Collapse>
        </MatchRecordCard>
      </LongPress>
      <ContextMenu
        open={menuOpen}
        title={t('table.moreActions')}
        items={[
          { id: 'edit', label: t('history.editShort'), onSelect: onEdit },
          { id: 'rematch', label: t('history.rematchShort'), onSelect: onCopy },
          { id: 'delete', label: t('common.delete'), danger: true, onSelect: onDelete },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </>
  )
}
