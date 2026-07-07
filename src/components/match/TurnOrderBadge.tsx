import { useI18n } from '@/lib/i18n'
import { uiPill } from '@/lib/uiSurface'

export function TurnOrderBadge({
  firstPlayerId,
  perspectivePlayerId,
}: {
  firstPlayerId: string | null
  perspectivePlayerId?: string
}) {
  const { t } = useI18n()

  if (!firstPlayerId || !perspectivePlayerId) return null

  const isFirst = firstPlayerId === perspectivePlayerId
  const label = isFirst ? t('match.firstTurn') : t('match.secondTurn')

  return (
    <span
      className={[
        uiPill,
        isFirst ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/25' : 'bg-surface-muted/50 text-text-secondary ring-1 ring-white/[0.06]',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

export function WinLossBadge({ won }: { won: boolean }) {
  return (
    <span
      className={[
        'inline-flex size-6 items-center justify-center rounded-md text-xs font-bold',
        won ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-danger/10 text-danger ring-1 ring-danger/25',
      ].join(' ')}
    >
      {won ? 'W' : 'L'}
    </span>
  )
}
