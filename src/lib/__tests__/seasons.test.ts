import { describe, expect, it } from 'vitest'
import {
  CUSTOM_SEASON_ID,
  OP_SEASON_PRESETS,
  addDaysYmd,
  buildHalfPointWindows,
  buildSeasonWindows,
  currentPeriodPresetId,
  currentSeasonId,
  matchInSeasonRange,
  resolvePeriodRange,
  resolveSeasonRange,
} from '@/lib/seasons'

describe('set seasons', () => {
  it('builds inclusive windows from one drop to the day before the next', () => {
    const windows = buildSeasonWindows()
    expect(windows).toEqual([
      { id: 'op16', from: '2026-05-30', to: '2026-07-10' },
      { id: 'op16-5', from: '2026-07-11', to: '2026-08-21' },
      { id: 'op17', from: '2026-08-22', to: null },
    ])
    expect(addDaysYmd('2026-07-11', -1)).toBe('2026-07-10')
  })

  it('builds OP season windows through the next OP drop', () => {
    expect(buildSeasonWindows(OP_SEASON_PRESETS)).toEqual([
      { id: 'op16', from: '2026-05-30', to: '2026-08-21' },
      { id: 'op17', from: '2026-08-22', to: null },
    ])
  })

  it('builds half-point windows until the next OP drop', () => {
    expect(buildHalfPointWindows()).toEqual([
      { id: 'op16-5', from: '2026-07-11', to: '2026-08-21' },
    ])
  })

  it('picks the latest started season as current', () => {
    expect(currentSeasonId(new Date(2026, 6, 11))).toBe('op16-5')
    expect(currentSeasonId(new Date(2026, 7, 22))).toBe('op17')
    expect(currentSeasonId(new Date(2026, 4, 30))).toBe('op16')
  })

  it('picks current presets per period mode', () => {
    const sep = new Date(2026, 8, 1)
    expect(currentPeriodPresetId('op', sep)).toBe('op17')
    expect(currentPeriodPresetId('half', new Date(2026, 7, 15))).toBe('op16-5')
    expect(currentPeriodPresetId('quarter', sep)).toBe('2026-q3')
    expect(currentPeriodPresetId('year', sep)).toBe('2026')
  })

  it('filters matches by local calendar range', () => {
    const inOp165 = new Date(2026, 6, 11, 12, 0, 0).toISOString()
    const beforeOp16 = new Date(2026, 4, 29, 12, 0, 0).toISOString()
    const inOp16Season = new Date(2026, 6, 1, 12, 0, 0).toISOString()
    const inOp17 = new Date(2026, 8, 1, 12, 0, 0).toISOString()
    expect(matchInSeasonRange(inOp165, '2026-07-11', '2026-08-21')).toBe(true)
    expect(matchInSeasonRange(beforeOp16, '2026-05-30', '2026-07-10')).toBe(false)
    expect(matchInSeasonRange(inOp16Season, '2026-05-30', '2026-08-21')).toBe(true)
    expect(matchInSeasonRange(inOp17, '2026-08-22', null)).toBe(true)
  })

  it('resolves custom ranges and swaps inverted dates', () => {
    expect(resolveSeasonRange(CUSTOM_SEASON_ID, '2026-08-01', '2026-07-01')).toEqual({
      from: '2026-07-01',
      to: '2026-08-01',
    })
    expect(resolvePeriodRange('op', 'op16', '', '')).toEqual({
      from: '2026-05-30',
      to: '2026-08-21',
    })
    expect(resolvePeriodRange('quarter', '2026-q2', '', '')).toEqual({
      from: '2026-04-01',
      to: '2026-06-30',
    })
    expect(resolvePeriodRange('year', '2025', '', '')).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    })
  })
})
