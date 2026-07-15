import { describe, expect, it } from 'vitest'
import {
  formatWinRateTooltip,
  getDisplayWinRate,
  getDisplayWinRateFromRaw,
  getSampleLabel,
  getWinRateHeatmapColor,
  isReliableSample,
} from '@/lib/winRateDisplay'
import { translate } from '@/lib/i18n'
import { getAverageMatchDurationMs, formatMatchDuration } from '@/lib/matchTimer'
import type { Match } from '@/types'

describe('winRateDisplay', () => {
  it('returns null for zero games', () => {
    expect(getDisplayWinRate(0, 0)).toBeNull()
  })

  it('shows raw win rate (3W-6L = 33.3%)', () => {
    expect(getDisplayWinRate(3, 9)).toBeCloseTo(1 / 3, 5)
    expect(getDisplayWinRate(2, 2)).toBeCloseTo(1, 5)
    expect(getDisplayWinRate(0, 2)).toBeCloseTo(0, 5)
    expect(getDisplayWinRate(5, 6)).toBeCloseTo(5 / 6, 5)
  })

  it('marks unreliable samples below MIN_RELIABLE_SAMPLE', () => {
    expect(isReliableSample(2)).toBe(false)
    expect(isReliableSample(3)).toBe(true)
    const t = (key: Parameters<typeof translate>[1]) => translate('zh-Hant', key)
    expect(getSampleLabel(2, t)).toContain('樣本不足')
    expect(getSampleLabel(5, t)).toContain('初步')
  })

  it('uses gray heatmap color for unreliable samples', () => {
    const unreliable = getWinRateHeatmapColor(2, 2)
    const reliable = getWinRateHeatmapColor(6, 10)
    expect(unreliable).toContain('71, 85, 105')
    expect(reliable).toContain('34, 197, 94')
  })

  it('includes reliability and W-L in tooltip', () => {
    const t = (key: Parameters<typeof translate>[1]) => translate('zh-Hant', key)
    const tooltip = formatWinRateTooltip(1, 1, 2, 0.5, t)
    expect(tooltip).toContain('1W-1L')
  })

  it('passes through raw aggregate rate', () => {
    expect(getDisplayWinRateFromRaw(0.6, 10)).toBeCloseTo(0.6, 5)
    expect(getDisplayWinRateFromRaw(null, 5)).toBeNull()
  })
})

describe('matchTimer average duration', () => {
  const base: Omit<Match, 'id' | 'sessionId' | 'matchNumber'> = {
    player1Id: 'p1',
    deck1Id: 'd1',
    player2Id: 'p2',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    winnerDeckId: 'd1',
    firstPlayerId: null,
    resultType: 'normal',
    source: 'live',
    deletedAt: null,
    notes: null,
  }

  it('averages timed matches only', () => {
    const matches: Match[] = [
      {
        ...base,
        id: 'm1',
        sessionId: 's1',
        matchNumber: 1,
        startedAt: '2026-06-01T10:00:00.000Z',
        finishedAt: '2026-06-01T10:30:00.000Z',
      },
      {
        ...base,
        id: 'm2',
        sessionId: 's1',
        matchNumber: 2,
        startedAt: null,
        finishedAt: '2026-06-01T11:00:00.000Z',
      },
    ]
    expect(getAverageMatchDurationMs(matches)).toBe(30 * 60 * 1000)
    expect(formatMatchDuration(30 * 60 * 1000)).toMatch(/30/)
  })
})
