export interface SetSeasonPreset {
  id: string
  /** Inclusive start (YYYY-MM-DD, local calendar). */
  startDate: string
}

/** Main OP set seasons (release through day before next OP). */
export const OP_SEASON_PRESETS: SetSeasonPreset[] = [
  { id: 'op16', startDate: '2026-05-30' },
  { id: 'op17', startDate: '2026-08-22' },
]

/** Split windows: main OP block, half set, next OP block, … */
export const SPLIT_SEASON_PRESETS: SetSeasonPreset[] = [
  { id: 'op16', startDate: '2026-05-30' },
  { id: 'op16-5', startDate: '2026-07-11' },
  { id: 'op17', startDate: '2026-08-22' },
]

/** @deprecated Use SPLIT_SEASON_PRESETS */
export const SET_SEASON_PRESETS = SPLIT_SEASON_PRESETS

/** @deprecated Half mode now uses SPLIT_SEASON_PRESETS */
export const HALF_POINT_PRESETS: SetSeasonPreset[] = SPLIT_SEASON_PRESETS

export const CUSTOM_SEASON_ID = 'custom'

export type PeriodMode = 'op' | 'quarter' | 'year'

export interface SeasonWindow {
  id: string
  from: string
  /** Inclusive end date, or null if the season is still open. */
  to: string | null
}

function ymdParts(ymd: string): [number, number, number] {
  const [year, month, day] = ymd.split('-').map(Number)
  return [year, month, day]
}

export function ymdStamp(ymd: string): number {
  const [year, month, day] = ymdParts(ymd)
  return year * 10000 + month * 100 + day
}

export function isoToLocalYmd(iso: string): string {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymdParts(ymd)
  const date = new Date(year, month - 1, day + days)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

export function formatYmdDisplay(ymd: string): string {
  const [year, month, day] = ymdParts(ymd)
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`
}

export function buildSeasonWindows(presets: SetSeasonPreset[] = SPLIT_SEASON_PRESETS): SeasonWindow[] {
  return presets.map((preset, index) => {
    const next = presets[index + 1]
    return {
      id: preset.id,
      from: preset.startDate,
      to: next ? addDaysYmd(next.startDate, -1) : null,
    }
  })
}

export function buildHalfPointWindows(
  halfPresets: SetSeasonPreset[] = HALF_POINT_PRESETS,
  opPresets: SetSeasonPreset[] = OP_SEASON_PRESETS,
): SeasonWindow[] {
  return halfPresets.map((preset) => {
    const nextOp = opPresets.find((op) => ymdStamp(op.startDate) > ymdStamp(preset.startDate))
    return {
      id: preset.id,
      from: preset.startDate,
      to: nextOp ? addDaysYmd(nextOp.startDate, -1) : null,
    }
  })
}

export function quarterPresetsForYear(year: number): SetSeasonPreset[] {
  return [
    { id: `${year}-q1`, startDate: `${year}-01-01` },
    { id: `${year}-q2`, startDate: `${year}-04-01` },
    { id: `${year}-q3`, startDate: `${year}-07-01` },
    { id: `${year}-q4`, startDate: `${year}-10-01` },
  ]
}

export function quarterWindow(year: number, quarter: 1 | 2 | 3 | 4): SeasonWindow {
  const ranges: Record<1 | 2 | 3 | 4, { from: string; to: string }> = {
    1: { from: `${year}-01-01`, to: `${year}-03-31` },
    2: { from: `${year}-04-01`, to: `${year}-06-30` },
    3: { from: `${year}-07-01`, to: `${year}-09-30` },
    4: { from: `${year}-10-01`, to: `${year}-12-31` },
  }
  const range = ranges[quarter]
  return { id: `${year}-q${quarter}`, from: range.from, to: range.to }
}

export function yearPresets(count = 4, now = new Date()): SetSeasonPreset[] {
  const currentYear = now.getFullYear()
  return Array.from({ length: count }, (_, index) => {
    const year = currentYear - index
    return { id: String(year), startDate: `${year}-01-01` }
  })
}

export function yearOptions(count = 10, now = new Date()): number[] {
  const currentYear = now.getFullYear()
  return Array.from({ length: count }, (_, index) => currentYear - index)
}

export function seasonPresetsForOpMode(subdivide: boolean): SetSeasonPreset[] {
  return subdivide ? SPLIT_SEASON_PRESETS : OP_SEASON_PRESETS
}

export function mapPresetAcrossOpSubdivide(presetId: string, subdivide: boolean): string {
  if (subdivide) {
    if (presetId === 'op16') return 'op16'
    if (presetId === 'op17') return 'op17'
    return presetId
  }
  if (presetId === 'op16-5' || presetId === 'op16') return 'op16'
  if (presetId.startsWith('op') && presetId.includes('-5')) {
    return presetId.replace('-5', '')
  }
  return presetId
}

export function presetsForMode(mode: PeriodMode, now = new Date()): SetSeasonPreset[] {
  if (mode === 'year') return yearPresets(10, now)
  return OP_SEASON_PRESETS
}

export function latestOpSeasonId(now = new Date()): string {
  return currentSeasonId(now, OP_SEASON_PRESETS)
}

export function quarterPickerLabelKey(quarter: 1 | 2 | 3 | 4): import('@/lib/i18n').TranslationKey {
  switch (quarter) {
    case 1:
      return 'stats.period.quarter.q1Picker'
    case 2:
      return 'stats.period.quarter.q2Picker'
    case 3:
      return 'stats.period.quarter.q3Picker'
    case 4:
      return 'stats.period.quarter.q4Picker'
  }
}

export function quarterChipLabelKey(quarter: 1 | 2 | 3 | 4): import('@/lib/i18n').TranslationKey {
  switch (quarter) {
    case 1:
      return 'stats.period.quarter.q1Short'
    case 2:
      return 'stats.period.quarter.q2Short'
    case 3:
      return 'stats.period.quarter.q3Short'
    case 4:
      return 'stats.period.quarter.q4Short'
  }
}

export function currentSeasonId(now = new Date(), presets: SetSeasonPreset[] = SPLIT_SEASON_PRESETS): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayStamp = ymdStamp(today)
  let current = presets[0]?.id ?? CUSTOM_SEASON_ID
  for (const preset of presets) {
    if (ymdStamp(preset.startDate) <= todayStamp) current = preset.id
  }
  return current
}

export function currentPeriodPresetId(mode: PeriodMode, now = new Date()): string {
  if (mode === 'quarter') {
    const year = now.getFullYear()
    const quarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4
    return `${year}-q${quarter}`
  }
  if (mode === 'year') {
    return String(now.getFullYear())
  }
  return currentSeasonId(now, presetsForMode(mode, now))
}

export function seasonWindowById(
  id: string,
  presets: SetSeasonPreset[] = SPLIT_SEASON_PRESETS,
): SeasonWindow | null {
  return buildSeasonWindows(presets).find((window) => window.id === id) ?? null
}

export function periodWindowById(
  mode: PeriodMode,
  id: string,
  options?: { opSubdivide?: boolean },
): SeasonWindow | null {
  if (mode === 'op') {
    const presets = seasonPresetsForOpMode(Boolean(options?.opSubdivide))
    return seasonWindowById(id, presets)
  }
  if (mode === 'quarter') {
    const match = id.match(/^(\d{4})-q([1-4])$/)
    if (!match) return null
    return quarterWindow(Number(match[1]), Number(match[2]) as 1 | 2 | 3 | 4)
  }
  if (mode === 'year' && /^\d{4}$/.test(id)) {
    return { id, from: `${id}-01-01`, to: `${id}-12-31` }
  }
  return null
}

export function resolveSeasonRange(
  presetId: string,
  customFrom: string,
  customTo: string,
  presets: SetSeasonPreset[] = SPLIT_SEASON_PRESETS,
): { from: string; to: string | null } {
  if (presetId === CUSTOM_SEASON_ID) {
    const from = customFrom.trim() || (presets[0]?.startDate ?? isoToLocalYmd(new Date().toISOString()))
    const to = customTo.trim() || null
    if (to && ymdStamp(from) > ymdStamp(to)) return { from: to, to: from }
    return { from, to }
  }
  const window = seasonWindowById(presetId, presets)
  if (!window) {
    const fallback = buildSeasonWindows(presets).at(-1)
    return { from: fallback?.from ?? '2026-01-01', to: fallback?.to ?? null }
  }
  return { from: window.from, to: window.to }
}

export function resolvePeriodRange(
  mode: PeriodMode,
  presetId: string,
  customFrom: string,
  customTo: string,
  options?: { opSubdivide?: boolean },
): { from: string; to: string | null } {
  if (presetId === CUSTOM_SEASON_ID) {
    const presets =
      mode === 'op'
        ? seasonPresetsForOpMode(Boolean(options?.opSubdivide))
        : presetsForMode(mode)
    return resolveSeasonRange(CUSTOM_SEASON_ID, customFrom, customTo, presets)
  }
  const window = periodWindowById(mode, presetId, options)
  if (!window) {
    const fallbackId = currentPeriodPresetId(mode)
    const fallback = periodWindowById(mode, fallbackId, options)
    return { from: fallback?.from ?? '2026-01-01', to: fallback?.to ?? null }
  }
  return { from: window.from, to: window.to }
}

export function matchInSeasonRange(finishedAt: string, from: string, to: string | null): boolean {
  const day = ymdStamp(isoToLocalYmd(finishedAt))
  if (day < ymdStamp(from)) return false
  if (to && day > ymdStamp(to)) return false
  return true
}

export function seasonLabelKey(id: string): import('@/lib/i18n').TranslationKey {
  switch (id) {
    case 'op16':
      return 'stats.period.op.op16'
    case 'op16-5':
      return 'stats.period.half.op165'
    case 'op17':
      return 'stats.period.op.op17'
    default:
      return 'stats.period.custom'
  }
}

export function periodLabelKey(mode: PeriodMode, id: string): import('@/lib/i18n').TranslationKey {
  if (id === CUSTOM_SEASON_ID) return 'stats.period.custom'
  if (mode === 'year' && /^\d{4}$/.test(id)) return 'stats.period.custom'
  if (mode === 'quarter') {
    const match = id.match(/^\d{4}-q([1-4])$/)
    if (match) {
      switch (match[1]) {
        case '1':
          return 'stats.period.quarter.q1'
        case '2':
          return 'stats.period.quarter.q2'
        case '3':
          return 'stats.period.quarter.q3'
        case '4':
          return 'stats.period.quarter.q4'
      }
    }
  }
  return seasonLabelKey(id)
}

export function periodPresetButtonLabel(mode: PeriodMode, id: string): string {
  if (mode === 'year' && /^\d{4}$/.test(id)) return id
  if (mode === 'quarter') {
    const match = id.match(/^(\d{4})-q([1-4])$/)
    if (match) return `${match[1]} Q${match[2]}`
  }
  return id
}
