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
        'inline-flex size-[22px] shrink-0 items-center justify-center rounded-md text-[10px] font-bold leading-none',
        won
          ? 'border border-success/40 bg-success/15 text-success'
          : 'border border-danger/35 bg-danger/12 text-danger',
      ].join(' ')}
    >
      {won ? 'W' : 'L'}
    </span>
  )
}

export function FirstPlayerBadge({ label }: { label?: string }) {
  const { t } = useI18n()

  return (
    <span
      className="inline-flex h-[22px] shrink-0 items-center justify-center rounded-md border border-brand-500/40 bg-brand-500/12 px-1 text-[9px] font-bold leading-none text-brand-400"
      title={t('match.firstTurn')}
    >
      {label ?? t('match.firstTurn')}
    </span>
  )
}
