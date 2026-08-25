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
        isFirst
          ? 'bg-[#3b82f6]/20 text-[#60a5fa] ring-1 ring-[#3b82f6]/40'
          : 'bg-surface-muted/50 text-text-secondary ring-1 ring-white/[0.06]',
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
      className="inline-flex h-[22px] shrink-0 items-center justify-center rounded-md border border-[#3b82f6]/50 bg-[#3b82f6]/20 px-1 text-[9px] font-bold leading-none text-[#60a5fa]"
      title={t('match.firstTurn')}
    >
      {label ?? t('match.firstTurn')}
    </span>
  )
}
