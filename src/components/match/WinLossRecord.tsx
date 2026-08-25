import { CountUp } from '@/components/motion/CountUp'

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
      <CountUp value={wins} />
      W-
      <CountUp value={losses} />
      L
    </span>
  )
}
