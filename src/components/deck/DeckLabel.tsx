import { ColorDots } from '@/components/deck/ColorDots'
import { getDeckDisplayName, getLeaderDisplayName } from '@/lib/leaderDisplay'
import { useI18n } from '@/lib/i18n'
import type { Deck, Language } from '@/types'

export function getCompactDeckName(deck: Deck, language: Language): string {
  return getDeckDisplayName(deck, language)
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
  const { language } = useI18n()

  if (!deck) return <span className={className}>{fallback}</span>

  const leaderLabel = getLeaderDisplayName(deck.leaderName, language)

  return (
    <span className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {showCode ? <span>{deck.setCode}</span> : null}
      <ColorDots colors={deck.colors} />
      <span className="truncate">{leaderLabel}</span>
    </span>
  )
}
