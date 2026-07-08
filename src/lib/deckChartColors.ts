import type { DeckUsageSlice } from '@/lib/stats'

const COLOR_HSL: Record<string, { h: number; s: number; l: number }> = {
  Red: { h: 4, s: 72, l: 52 },
  Green: { h: 142, s: 52, l: 40 },
  Blue: { h: 215, s: 76, l: 54 },
  Purple: { h: 271, s: 58, l: 54 },
  Black: { h: 220, s: 8, l: 22 },
  Yellow: { h: 45, s: 90, l: 54 },
}

/** High-contrast fills for pie slices and card accents on dark UI. */
export const CHART_SLICE_PALETTE = [
  'hsl(142 58% 48%)',
  'hsl(271 62% 62%)',
  'hsl(45 90% 56%)',
  'hsl(215 76% 58%)',
  'hsl(4 72% 56%)',
  'hsl(188 62% 46%)',
  'hsl(28 82% 54%)',
  'hsl(320 58% 58%)',
  'hsl(160 45% 42%)',
  'hsl(250 48% 68%)',
] as const

function hslString(color: string): string {
  const tone = COLOR_HSL[color] ?? COLOR_HSL.Blue
  return `hsl(${tone.h} ${tone.s}% ${tone.l}%)`
}

/** Blend two deck colors 50/50 for dual-color leaders. */
export function blendDeckColors(colors: string[]): string {
  const unique = [...new Set(colors.filter(Boolean))]
  if (unique.length >= 2) {
    return `color-mix(in srgb, ${hslString(unique[0])} 50%, ${hslString(unique[1])} 50%)`
  }
  return hslString(unique[0] ?? 'Blue')
}

/** Indexed palette fill — distinct on dark backgrounds; links pie slice to card accent. */
export function getChartSliceFill(index: number): string {
  return CHART_SLICE_PALETTE[index % CHART_SLICE_PALETTE.length]
}

/** Deck identity color for dots / labels; lifts very dark tones for visibility. */
export function getDeckIdentityFill(slice: DeckUsageSlice, index: number, slices: DeckUsageSlice[]): string {
  const base = blendDeckColors(slice.colors)
  const primary = slice.colors[0] ?? 'Blue'
  if (primary !== 'Black' && !slice.colors.includes('Black')) {
    return getDeckSliceFill(slice, index, slices)
  }
  return `color-mix(in srgb, ${base} 55%, ${getChartSliceFill(index)} 45%)`
}

/** Distinct fill per deck slice; dual-color decks use a 50/50 blend. */
export function getDeckSliceFill(slice: DeckUsageSlice, index: number, slices: DeckUsageSlice[]): string {
  const base = blendDeckColors(slice.colors)

  if (slice.colors.length <= 1) {
    const primary = slice.colors[0] ?? 'Blue'
    const sameBefore = slices
      .slice(0, index)
      .filter((item) => item.colors.length === 1 && (item.colors[0] ?? 'Blue') === primary).length
    const tone = COLOR_HSL[primary] ?? COLOR_HSL.Blue
    const lightnessOffsets = [0, -10, 12, -18, 20]
    let l = Math.min(88, Math.max(16, tone.l + lightnessOffsets[sameBefore % lightnessOffsets.length]))
    if (primary === 'Black') l = Math.max(l, 42)
    return `hsl(${tone.h} ${Math.max(tone.s, 18)}% ${l}%)`
  }

  const sameBlendBefore = slices
    .slice(0, index)
    .filter(
      (item) =>
        item.colors.length >= 2 &&
        item.colors[0] === slice.colors[0] &&
        item.colors[1] === slice.colors[1],
    ).length
  if (sameBlendBefore === 0) return base
  return `color-mix(in srgb, ${base} 78%, white ${8 + sameBlendBefore * 6}%)`
}

export function summarizeColorPreference(
  slices: DeckUsageSlice[],
): Array<{ color: string; count: number; pct: number }> {
  const totals = new Map<string, number>()
  let grand = 0
  for (const slice of slices) {
    const colors = slice.colors.filter(Boolean)
    if (colors.length >= 2) {
      const share = slice.count / 2
      for (const color of colors.slice(0, 2)) {
        totals.set(color, (totals.get(color) ?? 0) + share)
      }
      grand += slice.count
      continue
    }
    const key = colors[0] ?? 'Other'
    totals.set(key, (totals.get(key) ?? 0) + slice.count)
    grand += slice.count
  }
  return [...totals.entries()]
    .map(([color, count]) => ({ color, count, pct: grand ? count / grand : 0 }))
    .sort((a, b) => b.count - a.count)
}
