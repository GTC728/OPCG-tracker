import type { ImportMatchInput } from '@/types'

export const LARGE_IMPORT_THRESHOLD = 50
export const IMPORT_CONFIRM_THRESHOLD = 100

const TEST_PLAYER_NAMES = new Set([
  '小明',
  '小華',
  '阿ken',
  '店長',
  '常客甲',
  '常客乙',
  '新手c',
  '老手d',
  '週末e',
  '週末f',
  '牌組g',
  '牌組h',
])

export function normalizeImportName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function summarizeImportRows(rows: ImportMatchInput[]): {
  rowCount: number
  uniquePlayers: string[]
  dateMin: string | null
  dateMax: string | null
  looksLikeTestData: boolean
} {
  const players = new Set<string>()
  const dates: number[] = []
  let testHits = 0

  for (const row of rows) {
    if (row.player1Name) players.add(row.player1Name.trim())
    if (row.player2Name) players.add(row.player2Name.trim())
    if (row.date) {
      const ms = new Date(row.date).getTime()
      if (!Number.isNaN(ms)) dates.push(ms)
    }
    for (const name of [row.player1Name, row.player2Name]) {
      if (name && TEST_PLAYER_NAMES.has(normalizeImportName(name))) testHits += 1
    }
  }

  dates.sort((a, b) => a - b)
  const uniquePlayers = [...players]
  const testRatio = rows.length ? testHits / (rows.length * 2) : 0

  return {
    rowCount: rows.length,
    uniquePlayers,
    dateMin: dates.length ? new Date(dates[0]!).toISOString().slice(0, 10) : null,
    dateMax: dates.length ? new Date(dates.at(-1)!).toISOString().slice(0, 10) : null,
    looksLikeTestData: testRatio >= 0.5,
  }
}

export function detectTestImportWarning(filename: string, rows: ImportMatchInput[]): string | null {
  const summary = summarizeImportRows(rows)
  const nameHint = /test|1000|demo|sample|opcg-1000/i.test(filename)
  const playerHint = summary.uniquePlayers.some((name) => TEST_PLAYER_NAMES.has(normalizeImportName(name)))

  if (nameHint || (playerHint && summary.rowCount >= 20)) {
    return '偵測到疑似測試資料（檔名或玩家名稱）。建議匯入到「新匯入場次」，並先暫停群組同步。'
  }
  if (summary.rowCount >= LARGE_IMPORT_THRESHOLD) {
    return `將匯入 ${summary.rowCount} 場對局。大量匯入會影響統計與成就，且加入群組後會自動同步。`
  }
  return null
}

export function needsTypedConfirm(rowCount: number): boolean {
  return rowCount >= IMPORT_CONFIRM_THRESHOLD
}
