import { ColorDots } from '@/components/deck/ColorDots'
import type { Deck } from '@/types'

export function getCompactDeckName(deck: Deck): string {
  return [deck.setCode, deck.leaderName].filter(Boolean).join(' ')
}

export function DeckLabel({
  deck,
  fallback = '未知牌組',
  showCode = true,
  className = '',
}: {
  deck?: Deck | null
  fallback?: string
  showCode?: boolean
  className?: string
}) {
  if (!deck) return <span className={className}>{fallback}</span>

  return (
    <span className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {showCode ? <span>{deck.setCode}</span> : null}
      <ColorDots colors={deck.colors} />
      <span>{deck.leaderName}</span>
    </span>
  )
}
