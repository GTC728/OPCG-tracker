import type { ImportMatchInput, Match } from '@/types'

export const HISTORICAL_IMPORT_MAX_ROWS = 100
export const HISTORICAL_IMPORT_MIN_SPAN_DAYS = 30
export const HISTORICAL_IMPORT_CONFIRM_TEXT = '歷史還原'

/** Short bullet list for import UI */
export const HISTORICAL_IMPORT_RULES = [
  `單次最多 ${HISTORICAL_IMPORT_MAX_ROWS} 場`,
  `日期跨度 ≥ ${HISTORICAL_IMPORT_MIN_SPAN_DAYS} 天（最早～最晚對局）`,
  '可多次匯入，每次須符合上述條件',
  '計入累積型成就（老將、對手數等）',
  '不計技巧/時間/連勝/趣味型成就',
  '一般 CSV 匯入（未勾選）仍不計任何成就',
] as const

export function computeDateSpanDays(timestampsMs: number[]): number | null {
  const valid = timestampsMs.filter((value) => !Number.isNaN(value))
  if (valid.length < 2) return null
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  return (max - min) / (24 * 60 * 60 * 1000)
}

export function dateSpanDaysFromImportRows(rows: ImportMatchInput[]): number | null {
  const stamps = rows
    .map((row) => (row.date ? new Date(row.date).getTime() : Number.NaN))
    .filter((value) => !Number.isNaN(value))
  return computeDateSpanDays(stamps)
}

export function dateSpanDaysFromMatches(matches: Match[]): number | null {
  const stamps = matches.flatMap((match) => [
    new Date(match.startedAt).getTime(),
    new Date(match.finishedAt).getTime(),
  ])
  return computeDateSpanDays(stamps)
}

export function validateHistoricalImportRows(
  rows: ImportMatchInput[],
): { ok: true; spanDays: number } | { ok: false; error: string } {
  if (!rows.length) {
    return { ok: false, error: '沒有可匯入的資料列' }
  }
  if (rows.length > HISTORICAL_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `歷史還原單次上限 ${HISTORICAL_IMPORT_MAX_ROWS} 場（目前 ${rows.length} 場）`,
    }
  }
  const dated = rows.filter((row) => row.date?.trim())
  if (dated.length < 2) {
    return { ok: false, error: '歷史還原需要至少 2 筆有效日期欄位' }
  }
  const spanDays = dateSpanDaysFromImportRows(rows)
  if (spanDays === null) {
    return { ok: false, error: '無法計算日期跨度，請確認日期格式' }
  }
  if (spanDays < HISTORICAL_IMPORT_MIN_SPAN_DAYS) {
    return {
      ok: false,
      error: `日期跨度需 ≥ ${HISTORICAL_IMPORT_MIN_SPAN_DAYS} 天（目前約 ${Math.floor(spanDays)} 天）`,
    }
  }
  return { ok: true, spanDays }
}

export function validateHistoricalImportMatches(
  matches: Match[],
): { ok: true; spanDays: number } | { ok: false; error: string } {
  if (!matches.length) {
    return { ok: false, error: '此批次沒有有效對局' }
  }
  if (matches.length > HISTORICAL_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `超過歷史還原上限 ${HISTORICAL_IMPORT_MAX_ROWS} 場`,
    }
  }
  const spanDays = dateSpanDaysFromMatches(matches)
  if (spanDays === null) {
    return { ok: false, error: '無法計算日期跨度' }
  }
  if (spanDays < HISTORICAL_IMPORT_MIN_SPAN_DAYS) {
    return {
      ok: false,
      error: `日期跨度需 ≥ ${HISTORICAL_IMPORT_MIN_SPAN_DAYS} 天（目前約 ${Math.floor(spanDays)} 天）`,
    }
  }
  return { ok: true, spanDays }
}
