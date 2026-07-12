import { describe, expect, it } from 'vitest'
import {
  formatWinRateTooltip,
  getDisplayWinRate,
  getDisplayWinRateFromRaw,
  getSampleLabel,
  getWinRateHeatmapColor,
  isReliableSample,
} from '@/lib/winRateDisplay'
import { getAverageMatchDurationMs, formatMatchDuration } from '@/lib/matchTimer'
import type { Match } from '@/types'

describe('winRateDisplay', () => {
  it('returns null for zero games', () => {
    expect(getDisplayWinRate(0, 0)).toBeNull()
  })

  it('smooths small samples toward 50%', () => {
    expect(getDisplayWinRate(2, 2)).toBeCloseTo(0.7, 3)
    expect(getDisplayWinRate(0, 2)).toBeCloseTo(0.3, 3)
  })

  it('marks unreliable samples below MIN_RELIABLE_SAMPLE', () => {
    expect(isReliableSample(2)).toBe(false)
    expect(isReliableSample(3)).toBe(true)
    expect(getSampleLabel(2)).toContain('資料不足')
    expect(getSampleLabel(5)).toContain('初步')
  })

  it('uses gray heatmap color for unreliable samples', () => {
    const unreliable = getWinRateHeatmapColor(2, 2)
    const reliable = getWinRateHeatmapColor(6, 10)
    expect(unreliable).toContain('71, 85, 105')
    expect(reliable).toContain('34, 197, 94')
  })

  it('includes smoothed and raw rates in tooltip for small samples', () => {
    const tooltip = formatWinRateTooltip(1, 1, 2, 0.5)
    expect(tooltip).toContain('平滑')
    expect(tooltip).toContain('實際')
    expect(tooltip).toContain('1W-1L')
  })

  it('derives display rate from raw aggregate', () => {
    expect(getDisplayWinRateFromRaw(0.6, 10)).toBeCloseTo(0.577, 2)
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
        startedAt: '2026-06-01T11:00:00.000Z',
        finishedAt: '2026-06-01T11:20:00.000Z',
      },
      {
        ...base,
        id: 'm3',
        sessionId: 's1',
        matchNumber: 3,
        startedAt: null,
        finishedAt: '2026-06-01T12:00:00.000Z',
      },
    ]
    const avg = getAverageMatchDurationMs(matches)
    expect(avg).toBe(25 * 60 * 1000)
    expect(formatMatchDuration(avg!)).toBe('25:00')
  })

  it('returns null when no timed matches', () => {
    expect(
      getAverageMatchDurationMs([
        {
          ...base,
          id: 'm1',
          sessionId: 's1',
          matchNumber: 1,
          startedAt: null,
          finishedAt: '2026-06-01T12:00:00.000Z',
        },
      ]),
    ).toBeNull()
  })
})
