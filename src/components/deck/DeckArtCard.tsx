import { getLeaderDisplayName } from '@/lib/leaderDisplay'
import { getDeckArtCoverStyle } from '@/lib/deckArtCover'
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

  const article = (
    <article className={uiDeckArtCard}>
      <div className="ui-deck-art-cover" style={getDeckArtCoverStyle(deck.colors)} />
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
