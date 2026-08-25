import { formatWinLossRecord } from '@/lib/winLossRecord'

export function WinLossRecord({
  wins,
  losses,
  className,
}: {
  wins: number
  losses: number
  className?: string
}) {
  return (
    <span className={['tabular-nums', className].filter(Boolean).join(' ')}>
      {formatWinLossRecord(wins, losses)}
    </span>
  )
}
