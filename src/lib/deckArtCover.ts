import type { CSSProperties } from 'react'
import { getOpcgColorFill } from '@/lib/deckChartColors'

/** Layered fills with highlight/shade for deck art covers (Apple-style depth). */
export function getDeckArtCoverStyle(colors: string[]): CSSProperties {
  const primary = colors[0] ? getOpcgColorFill(colors[0]) : '#64748b'
  const secondary = colors[1] ? getOpcgColorFill(colors[1]) : primary

  const sheen =
    'radial-gradient(115% 85% at 14% 10%, rgba(255,255,255,0.34) 0%, transparent 52%)'
  const shade = 'radial-gradient(95% 75% at 86% 108%, rgba(0,0,0,0.3) 0%, transparent 55%)'
  const grain =
    'repeating-linear-gradient(135deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 3px)'

  if (colors.length > 1) {
    const base = `linear-gradient(152deg, color-mix(in srgb, ${primary} 92%, white 8%) 0%, ${primary} 38%, ${secondary} 72%, color-mix(in srgb, ${secondary} 72%, black 28%) 100%)`
    return { background: `${sheen}, ${shade}, ${grain}, ${base}` }
  }

  const base = `linear-gradient(168deg, color-mix(in srgb, ${primary} 88%, white 12%) 0%, ${primary} 42%, color-mix(in srgb, ${primary} 78%, black 22%) 100%)`
  return { background: `${sheen}, ${shade}, ${grain}, ${base}` }
}
