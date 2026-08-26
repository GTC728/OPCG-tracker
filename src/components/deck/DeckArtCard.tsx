import { getLeaderDisplayName } from '@/lib/leaderDisplay'
import { getDeckArtCoverStyle } from '@/lib/deckArtCover'
import { Zoomable } from '@/components/motion/Zoomable'
import { uiPressable } from '@/lib/motion'
import { uiDeckArtCard } from '@/lib/uiSurface'
import type { Deck, Language } from '@/types'
import { useAppStore } from '@/stores/appStore'

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
  const variant = useAppStore((state) => state.settings.leaderNameVariant ?? 'hk')
  const leader = getLeaderDisplayName(deck.leaderName, language, variant)

  const article = (
    <article className={uiDeckArtCard}>
      <Zoomable>
        <div className="ui-deck-art-cover" style={getDeckArtCoverStyle(deck.colors)} />
      </Zoomable>
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
