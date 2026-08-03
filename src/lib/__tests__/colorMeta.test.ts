import { describe, expect, it } from 'vitest'
import { summarizeColorPreference } from '@/lib/deckChartColors'
import type { DeckUsageSlice } from '@/lib/stats'

describe('summarizeColorPreference', () => {
  it('splits dual-color deck appearances 50/50', () => {
    const slices: DeckUsageSlice[] = [
      {
        deckId: 'd1',
        deckName: 'RG',
        count: 10,
        percentage: 1,
        colors: ['Red', 'Green'],
      },
    ]
    const summary = summarizeColorPreference(slices)
    const red = summary.find((item) => item.color === 'Red')
    const green = summary.find((item) => item.color === 'Green')
    expect(red?.count).toBe(5)
    expect(green?.count).toBe(5)
    expect(red?.pct).toBeCloseTo(0.5)
  })
})
