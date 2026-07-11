import { describe, expect, it } from 'vitest'
import { achievementAllowsHistorical } from '@/lib/achievementHistorical'
import { getAchievementDefinition } from '@/lib/achievements'
import {
  dateSpanDaysFromImportRows,
  validateHistoricalImportRows,
} from '@/lib/historicalImport'
import type { ImportMatchInput } from '@/types'

describe('historicalImport', () => {
  it('requires ≥30 day span and ≤100 rows', () => {
    const rows: ImportMatchInput[] = Array.from({ length: 39 }, (_, index) => ({
      date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10),
      player1Name: 'A',
      player2Name: 'B',
      deck1Query: 'op01',
      deck2Query: 'op02',
      winnerName: 'A',
    }))
    expect(dateSpanDaysFromImportRows(rows)).toBe(38)
    expect(validateHistoricalImportRows(rows).ok).toBe(true)
  })

  it('rejects short span', () => {
    const rows: ImportMatchInput[] = [
      {
        date: '2025-01-01',
        player1Name: 'A',
        player2Name: 'B',
        deck1Query: 'op01',
        deck2Query: 'op02',
        winnerName: 'A',
      },
      {
        date: '2025-01-10',
        player1Name: 'A',
        player2Name: 'B',
        deck1Query: 'op01',
        deck2Query: 'op02',
        winnerName: 'A',
      },
    ]
    const result = validateHistoricalImportRows(rows)
    expect(result.ok).toBe(false)
  })
})

describe('achievementHistorical', () => {
  it('allows all achievement families for historical imports', () => {
    expect(achievementAllowsHistorical(getAchievementDefinition('veteran')!)).toBe(true)
    expect(achievementAllowsHistorical(getAchievementDefinition('win_streak')!)).toBe(true)
    expect(achievementAllowsHistorical(getAchievementDefinition('comeback')!)).toBe(true)
  })
})
