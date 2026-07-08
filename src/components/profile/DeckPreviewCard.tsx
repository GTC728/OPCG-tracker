import { ColorDots } from '@/components/deck/ColorDots'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { uiPopIn, uiPressable } from '@/lib/motion'
import { formatPercent } from '@/lib/stats'
import { uiGlassCard, uiHorizontalRailItem } from '@/lib/uiSurface'
import { useI18n } from '@/lib/i18n'
import type { Deck } from '@/types'

export function DeckPreviewCard({
  deck,
  usagePercent,
  winRate,
  record,
  onClick,
}: {
  deck: Deck
  usagePercent: number
  winRate: number | null
  record: string
  onClick: () => void
}) {
  const { t } = useI18n()

  return (
    <button type="button" className={[uiHorizontalRailItem, 'block h-full', uiPressable].join(' ')} onClick={onClick}>
      <article className={[uiGlassCard, uiPopIn, 'flex h-full flex-col overflow-hidden p-3 text-left'].join(' ')}>
        <div className="flex items-center gap-1.5">
          <ColorDots colors={deck.colors} size="md" />
          <DeckLabel deck={deck} compact showCode className="min-w-0 text-[11px]" />
        </div>
        <p className="mt-2 text-lg font-bold">{usagePercent}%</p>
        <p className="text-[10px] text-text-secondary">{t('stats.deckUsageShort')}</p>
        <p className="mt-auto pt-2 text-[11px] text-text-secondary">
          {formatPercent(winRate)} · {record}
        </p>
      </article>
    </button>
  )
}
