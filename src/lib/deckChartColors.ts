import type { DeckUsageSlice } from '@/lib/stats'

const colorHue: Record<string, number> = {
  Red: 0,
  Green: 142,
  Blue: 217,
  Purple: 271,
  Black: 215,
  Yellow: 45,
}

/** Distinct fill per deck: hue from leader colors, lightness steps for same-hue decks. */
export function getDeckSliceFill(slice: DeckUsageSlice, index: number, slices: DeckUsageSlice[]): string {
  const primary = slice.colors[0] ?? 'Blue'
  const hue = colorHue[primary] ?? 217
  const sameHueBefore = slices
    .slice(0, index)
    .filter((item) => (item.colors[0] ?? 'Blue') === primary).length
  const lightnessSteps = [58, 46, 68, 38, 76]
  const lightness = lightnessSteps[sameHueBefore % lightnessSteps.length]
  const saturation = slice.colors.length > 1 ? 72 : 64
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

/** Ring stroke to separate adjacent same-color slices in the legend. */
export function getDeckSliceStroke(slice: DeckUsageSlice, index: number): string {
  const fill = getDeckSliceFill(slice, index, [])
  return `color-mix(in srgb, ${fill} 55%, white)`
}

export function summarizeColorPreference(slices: DeckUsageSlice[]): Array<{ color: string; count: number; pct: number }> {
  const totals = new Map<string, number>()
  let grand = 0
  for (const slice of slices) {
    const key = slice.colors[0] ?? 'Other'
    totals.set(key, (totals.get(key) ?? 0) + slice.count)
    grand += slice.count
  }
  return [...totals.entries()]
    .map(([color, count]) => ({ color, count, pct: grand ? count / grand : 0 }))
    .sort((a, b) => b.count - a.count)
}
