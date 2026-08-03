import { ColorDots } from '@/components/deck/ColorDots'
import { getOpcgColorFill } from '@/lib/deckChartColors'

type SwatchSize = 'xs' | 'sm' | 'md'

const sizeClass: Record<SwatchSize, string> = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
}

/**
 * Single color indicator for charts and lists — never pair with ColorDots on the same row.
 */
export function ChartLegendSwatch({
  fill,
  metaColor,
  deckColors,
  size = 'sm',
}: {
  fill?: string
  metaColor?: string
  deckColors?: string[]
  size?: SwatchSize
}) {
  if (fill) {
    return (
      <span
        className={[sizeClass[size], 'shrink-0 rounded-full ring-1 ring-white/20'].join(' ')}
        style={{ background: fill }}
        aria-hidden
      />
    )
  }

  if (metaColor) {
    return (
      <span
        className={[sizeClass[size], 'shrink-0 rounded-full ring-1 ring-white/20'].join(' ')}
        style={{ background: getOpcgColorFill(metaColor) }}
        aria-hidden
      />
    )
  }

  if (deckColors?.length) {
    return <ColorDots colors={deckColors} size={size === 'md' ? 'md' : 'sm'} />
  }

  return (
    <span
      className={[sizeClass[size], 'shrink-0 rounded-full bg-slate-500 ring-1 ring-white/20'].join(' ')}
      aria-hidden
    />
  )
}
