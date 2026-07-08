import fs from 'node:fs'
import { createDefaultAppState } from '../src/lib/constants.ts'
import { resolveDeckQuery } from '../src/lib/selectors.ts'

const inputPath = process.argv[2]
const outputPath = process.argv[3]
if (!inputPath || !outputPath) {
  console.error('Usage: npx tsx scripts/prepare-import-csv.mts <input.csv> <output.csv>')
  process.exit(1)
}

const deckMap: Record<string, string> = {
  'UY 女帝': 'OP07-038',
  'OP07 U 巴基': 'OP09-042',
  'OP16 BY 黑胡': 'OP16-080',
  'OP16 B 大和': 'OP16-079',
  'OP09 GP 柯大師': 'OP02-002',
  'OP07 B 路奇': 'OP07-079',
  'B KING仔': 'OP08-057',
  'OP09 B 黑胡': 'OP09-081',
  'OP16 R 艾斯': 'OP16-001',
  'ST10 RP 基德': 'ST10-003',
  'OP12 PY 柯拉松': 'OP12-061',
  'OP09 R 紅髮': 'OP09-001',
  'RG 喬巴': 'OP08-001',
  'EB03 RU 薇薇': 'EB03-001',
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += char
  }
  out.push(cur)
  return out
}

function esc(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function mapDeck(raw: string): string {
  return deckMap[raw.trim()] ?? raw.trim()
}

function to24Hour(time: string): string {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return time.trim()
  let hour = Number.parseInt(match[1], 10)
  const minute = match[2]
  const period = match[3].toUpperCase()
  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeDateTime(raw: string, sessionDate: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return `${sessionDate} 00:00`

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return formatDateTime(parsed)
  }

  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
    return `${sessionDate} ${to24Hour(trimmed)}`
  }

  return trimmed
}

function readInputText(path: string): string {
  const buffer = fs.readFileSync(path)
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8')
  }
  return buffer.toString('utf8')
}

const input = readInputText(inputPath).replace(/^\uFEFF/, '')
const lines = input.trim().split(/\r?\n/)
const headerCells = parseCsvLine(lines[0])
const index = Object.fromEntries(headerCells.map((cell, i) => [cell.trim(), i]))
const sessionDate = '2026-06-19'
const hasDateColumn = '日期' in index
const hasTimeColumn = '時間' in index
const outLines = ['日期,玩家A,牌組A,玩家B,牌組B,勝者,先攻方,備註']
const state = createDefaultAppState()
const failures: string[] = []

for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
  const row = parseCsvLine(lines[lineIndex])
  const rawDateTime = hasDateColumn
    ? row[index['日期']]
    : hasTimeColumn
      ? row[index['時間']]
      : row[0]
  const player1 = row[index['玩家A']]
  const deck1 = mapDeck(row[index['牌組A']])
  const player2 = row[index['玩家B']]
  const deck2 = mapDeck(row[index['牌組B']])
  const winner = row[index['勝者']]
  const first = row[index['先攻方']] ?? ''
  const notes = row[index['備註']] ?? ''
  const date = normalizeDateTime(rawDateTime, sessionDate)

  for (const [label, query] of [
    ['A', deck1],
    ['B', deck2],
  ] as const) {
    if (!resolveDeckQuery(state, query)) {
      failures.push(`row ${lineIndex + 1} deck${label}: ${query}`)
    }
  }

  outLines.push([date, player1, deck1, player2, deck2, winner, first, notes].map(esc).join(','))
}

// UTF-8 BOM helps Excel on Windows show Chinese headers correctly.
fs.writeFileSync(outputPath, `\uFEFF${outLines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${outLines.length - 1} rows to ${outputPath}`)
if (failures.length) {
  console.error('Unresolved decks:')
  for (const failure of failures) console.error(failure)
  process.exit(1)
}
console.log('All decks resolve OK')
