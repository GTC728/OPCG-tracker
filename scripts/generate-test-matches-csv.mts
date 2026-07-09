/**
 * Generate a CSV of N matches importable via Settings → Import.
 * Run: npx tsx scripts/generate-test-matches-csv.mts [count] [output.csv]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDefaultAppState } from '../src/lib/constants.ts'
import { resolveDeckQuery } from '../src/lib/selectors.ts'
import { SEEDED_LEADER_DECKS } from '../src/data/leaderDecks.ts'

const count = Number.parseInt(process.argv[2] ?? '1000', 10)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.resolve(process.argv[3] ?? path.join(root, 'testdata', 'opcg-1000-matches.csv'))

const PLAYERS = [
  '小明',
  '小華',
  '阿Ken',
  '店長',
  '常客甲',
  '常客乙',
  '新手C',
  '老手D',
  '週末E',
  '週末F',
  '牌組G',
  '牌組H',
]

const DECK_CODES = [
  'OP07-038',
  'OP09-042',
  'OP16-080',
  'OP16-079',
  'OP02-002',
  'OP07-079',
  'OP08-057',
  'OP09-081',
  'OP16-001',
  'ST10-003',
  'OP12-061',
  'OP09-001',
  'OP08-001',
  'EB03-001',
  'OP01-001',
  'OP03-022',
  'OP05-060',
  'OP06-022',
  'OP10-022',
  'OP11-040',
]

const state = createDefaultAppState()
for (const code of DECK_CODES) {
  if (!resolveDeckQuery(state, code)) {
    console.error(`Deck not found in catalog: ${code}`)
    process.exit(1)
  }
}

function esc(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]!
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)
const lines = ['日期,玩家A,牌組A,玩家B,牌組B,勝者,先攻方,備註']

const startMs = Date.UTC(2024, 5, 1, 14, 0)
const endMs = Date.UTC(2026, 6, 1, 22, 0)
const span = endMs - startMs

let sessionDay = ''
let sessionMatches = 0
let sessionCap = 8

for (let i = 0; i < count; i += 1) {
  const progress = i / Math.max(count - 1, 1)
  const baseMs = startMs + Math.floor(span * progress)
  const jitterMin = Math.floor(rand() * 50)
  const date = new Date(baseMs + jitterMin * 60_000)

  const dayKey = date.toISOString().slice(0, 10)
  if (dayKey !== sessionDay || sessionMatches >= sessionCap) {
    sessionDay = dayKey
    sessionMatches = 0
    sessionCap = 6 + Math.floor(rand() * 10)
    date.setHours(13 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0)
  }
  sessionMatches += 1
  date.setMinutes(date.getMinutes() + 18 + Math.floor(rand() * 25))

  const p1 = pick(PLAYERS, i * 2)
  let p2 = pick(PLAYERS, i * 2 + 1)
  if (p2 === p1) p2 = pick(PLAYERS, i + 7)

  const deck1 = pick(DECK_CODES, i)
  let deck2 = pick(DECK_CODES, i + 11)
  if (deck2 === deck1) deck2 = pick(DECK_CODES, i + 17)

  const p1Wins = rand() < 0.52
  const winner = p1Wins ? p1 : p2
  const first = rand() < 0.5 ? p1 : p2
  const notes =
    i % 17 === 0 ? '測試匯入備註' : i % 23 === 0 ? 'GG' : i % 31 === 0 ? '鏡像局' : ''

  lines.push(
    [formatDateTime(date), p1, deck1, p2, deck2, winner, first, notes].map(esc).join(','),
  )
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `\uFEFF${lines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${count} matches to ${outputPath}`)
console.log(`Decks used: ${DECK_CODES.length} leaders from catalog (${SEEDED_LEADER_DECKS.length} total seeded)`)
