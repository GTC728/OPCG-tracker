export interface SetSeasonPreset {
  id: string
  /** Inclusive start (YYYY-MM-DD, local calendar). */
  startDate: string
}

/**
 * Official set-drop seasons: from this release through the day before the next.
 * Append new drops at the end when dates are confirmed.
 */
export const SET_SEASON_PRESETS: SetSeasonPreset[] = [
  { id: 'op16', startDate: '2026-05-30' },
  { id: 'op16-5', startDate: '2026-07-11' },
  { id: 'op17', startDate: '2026-08-22' },
]

export const CUSTOM_SEASON_ID = 'custom'

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

export function buildSeasonWindows(presets: SetSeasonPreset[] = SET_SEASON_PRESETS): SeasonWindow[] {
  return presets.map((preset, index) => {
    const next = presets[index + 1]
    return {
      id: preset.id,
      from: preset.startDate,
      to: next ? addDaysYmd(next.startDate, -1) : null,
    }
  })
}

export function currentSeasonId(now = new Date(), presets: SetSeasonPreset[] = SET_SEASON_PRESETS): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayStamp = ymdStamp(today)
  let current = presets[0]?.id ?? CUSTOM_SEASON_ID
  for (const preset of presets) {
    if (ymdStamp(preset.startDate) <= todayStamp) current = preset.id
  }
  return current
}

export function seasonWindowById(
  id: string,
  presets: SetSeasonPreset[] = SET_SEASON_PRESETS,
): SeasonWindow | null {
  return buildSeasonWindows(presets).find((window) => window.id === id) ?? null
}

export function resolveSeasonRange(
  presetId: string,
  customFrom: string,
  customTo: string,
  presets: SetSeasonPreset[] = SET_SEASON_PRESETS,
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

export function matchInSeasonRange(finishedAt: string, from: string, to: string | null): boolean {
  const day = ymdStamp(isoToLocalYmd(finishedAt))
  if (day < ymdStamp(from)) return false
  if (to && day > ymdStamp(to)) return false
  return true
}

export function seasonLabelKey(id: string): import('@/lib/i18n').TranslationKey {
  switch (id) {
    case 'op16':
      return 'stats.season.op16'
    case 'op16-5':
      return 'stats.season.op165'
    case 'op17':
      return 'stats.season.op17'
    default:
      return 'stats.season.custom'
  }
}
