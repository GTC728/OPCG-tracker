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
  compact = false,
  className = '',
}: {
  deck?: Deck | null
  fallback?: string
  showCode?: boolean
  compact?: boolean
  className?: string
}) {
  const { language } = useI18n()

  if (!deck) return <span className={className}>{fallback}</span>

  const leaderLabel = getLeaderDisplayName(deck.leaderName, language)

  return (
    <span
      className={[
        'inline-flex min-w-0 items-center',
        compact ? 'gap-0.5 whitespace-nowrap' : 'gap-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showCode ? <span className="shrink-0">{deck.setCode}</span> : null}
      <ColorDots colors={deck.colors} />
      <span className={compact ? 'min-w-0 truncate' : 'truncate'}>{leaderLabel}</span>
    </span>
  )
}
