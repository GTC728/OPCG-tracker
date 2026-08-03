import { ColorDots } from '@/components/deck/ColorDots'
import { getLeaderDisplayName } from '@/lib/leaderDisplay'
import { uiPopIn, uiPressable } from '@/lib/motion'
import { formatPercent } from '@/lib/stats'
import { uiGlassCard } from '@/lib/uiSurface'
import { useI18n } from '@/lib/i18n'
import type { Deck, Language } from '@/types'

export function DeckPreviewCard({
  deck,
  language,
  usagePercent,
  winRate,
  record,
  accentFill,
  onClick,
  layout = 'rail',
}: {
  deck: Deck
  language: Language
  usagePercent: number
  winRate: number | null
  record: string
  accentFill?: string
  onClick: () => void
  layout?: 'rail' | 'grid'
}) {
  const { t } = useI18n()
  const leaderLabel = getLeaderDisplayName(deck.leaderName, language)

  const article = (
    <article
      className={[
        uiGlassCard,
        uiPopIn,
        'flex h-full min-w-0 flex-col overflow-hidden border-l-[3px] p-3 text-left',
        accentFill ? 'border-l-solid' : 'border-l-transparent',
        layout === 'rail' ? 'w-[8.75rem] shrink-0 sm:w-[9.5rem]' : '',
      ].join(' ')}
      style={accentFill ? { borderLeftColor: accentFill } : undefined}
    >
      <p className="text-[10px] font-medium tracking-wide text-text-secondary">{deck.setCode}</p>
      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-tight">
        <ColorDots colors={deck.colors} size="sm" />
        <span className="truncate">{leaderLabel}</span>
      </p>
      <p className="mt-3 text-xl font-bold tabular-nums leading-none">{usagePercent}%</p>
      <p className="mt-0.5 text-[10px] text-text-secondary">{t('stats.deckUsageShort')}</p>
      <p className="mt-auto pt-2 text-[11px] tabular-nums text-text-secondary">
        {formatPercent(winRate)} · {record}
      </p>
    </article>
  )

  return (
    <button
      type="button"
      className={[
        uiPressable,
        layout === 'grid' ? 'block h-full min-w-0 text-left' : 'block h-full shrink-0 text-left',
      ].join(' ')}
      onClick={onClick}
    >
      {article}
    </button>
  )
}
