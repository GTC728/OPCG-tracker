import { describe, expect, it } from 'vitest'
import {
  CUSTOM_SEASON_ID,
  OP_SEASON_PRESETS,
  SPLIT_SEASON_PRESETS,
  addDaysYmd,
  buildSeasonWindows,
  currentPeriodPresetId,
  currentSeasonId,
  mapPresetAcrossOpSubdivide,
  matchInSeasonRange,
  resolvePeriodRange,
  resolveSeasonRange,
  seasonPresetsForOpMode,
} from '@/lib/seasons'

describe('set seasons', () => {
  it('builds split windows from one drop to the day before the next', () => {
    const windows = buildSeasonWindows(SPLIT_SEASON_PRESETS)
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

  it('maps presets when toggling OP subdivide', () => {
    expect(mapPresetAcrossOpSubdivide('op16-5', false)).toBe('op16')
    expect(mapPresetAcrossOpSubdivide('op16', true)).toBe('op16')
    expect(seasonPresetsForOpMode(true)).toEqual(SPLIT_SEASON_PRESETS)
    expect(seasonPresetsForOpMode(false)).toEqual(OP_SEASON_PRESETS)
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
    expect(resolvePeriodRange('op', 'op16', '', '', { opSubdivide: true })).toEqual({
      from: '2026-05-30',
      to: '2026-07-10',
    })
    expect(resolvePeriodRange('half', 'op16-5', '', '')).toEqual({
      from: '2026-07-11',
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
