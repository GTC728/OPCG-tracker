import { getLeaderDisplayName } from '@/lib/leaderDisplay'
import { getOpcgColorFill } from '@/lib/deckChartColors'
import { uiPressable } from '@/lib/motion'
import { uiDeckArtCard } from '@/lib/uiSurface'
import type { Deck, Language } from '@/types'

export function DeckArtCard({
  deck,
  language,
  subtitle,
  onClick,
}: {
  deck: Deck
  language: Language
  subtitle: string
  onClick?: () => void
}) {
  const leader = getLeaderDisplayName(deck.leaderName, language)
  const primary = deck.colors[0] ? getOpcgColorFill(deck.colors[0]) : '#64748b'
  const secondary = deck.colors[1] ? getOpcgColorFill(deck.colors[1]) : primary

  const article = (
    <article className={uiDeckArtCard}>
      <div
        className="ui-deck-art-cover"
        style={{
          background:
            deck.colors.length > 1
              ? `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
              : primary,
        }}
      />
      <div className="space-y-0.5 p-3">
        <p className="text-[10px] font-medium text-text-secondary">{deck.setCode}</p>
        <p className="truncate text-sm font-semibold">{leader}</p>
        <p className="text-[11px] text-text-secondary">{subtitle}</p>
      </div>
    </article>
  )

  if (!onClick) return article

  return (
    <button type="button" className={[uiPressable, 'text-left'].join(' ')} onClick={onClick}>
      {article}
    </button>
  )
}
