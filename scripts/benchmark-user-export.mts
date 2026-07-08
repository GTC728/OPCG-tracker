/**
 * Benchmark achievement progress against an OPCG Excel export.
 * Run: npx tsx scripts/benchmark-user-export.mts [path-to-xlsx]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readSheet } from 'read-excel-file/node'
import {
  ACHIEVEMENT_DEFINITIONS,
  backlogExtrasFromState,
  computeAchievementSummary,
  getPlayerAchievementProgress,
} from '../src/lib/achievements.ts'
import { importAppStateJson } from '../src/lib/storage.ts'
import type { AppState } from '../src/types/index.ts'

const defaultPath =
  'C:/Users/green/To_D_drive/99_Dowdload/Edge/opcg-tracker-export-2026-07-08.xlsx'
const xlsxPath = process.argv[2] ?? defaultPath

async function loadStateFromExport(path: string): Promise<AppState> {
  const metaRows = await readSheet(path, '_meta')
  const meta = new Map(
    metaRows
      .slice(1)
      .map((row) => [String(row[0] ?? ''), String(row[1] ?? '')] as const)
      .filter(([key]) => key),
  )
  if (meta.get('export_format') !== 'opcg-tracker-excel') {
    throw new Error('Not an OPCG tracker export file')
  }

  const snapshotRows = await readSheet(path, '_app_state_json')
  const snapshot = snapshotRows
    .slice(1)
    .map((row) => String(row[1] ?? ''))
    .join('')
  if (!snapshot) throw new Error('Missing _app_state_json snapshot')
  return importAppStateJson(snapshot)
}

const state = await loadStateFromExport(xlsxPath)
const linkedId = state.settings.linkedPlayerId
const player =
  state.players.find((p) => p.id === linkedId && !p.archived) ??
  state.players.find((p) => !p.archived)

if (!player) {
  console.error('No active player found in export')
  process.exit(1)
}

const extras = backlogExtrasFromState(state)
const progress = getPlayerAchievementProgress(
  player.id,
  state.players,
  state.decks,
  state.matches,
  state.sessions,
  new Map(),
  linkedId,
  extras,
)
const summary = computeAchievementSummary(progress)

const maxed = progress.filter((item) => item.currentLevel >= item.maxLevel)
const highTier = progress.filter((item) => item.currentLevel >= 3)

console.log(`Export: ${xlsxPath}`)
console.log(`Player: ${player.name} (${player.id})`)
console.log(`Matches: ${state.matches.filter((m) => !m.deletedAt).length}`)
console.log(`Achievement families: ${ACHIEVEMENT_DEFINITIONS.length}`)
console.log(`Tier progress: ${summary.tiersEarned}/${summary.totalTiers} (${summary.tierRate}%)`)
console.log(`Max-tier families: ${maxed.length}`)
console.log(`Level ≥3 families: ${highTier.length}\n`)

console.log('--- Max tier (likely too easy) ---')
for (const item of maxed.sort((a, b) => a.definition.id.localeCompare(b.definition.id)).slice(0, 40)) {
  const title = item.definition.title['zh-Hant']
  console.log(
    `  ${item.definition.id}: Lv.${item.currentLevel}/${item.maxLevel} · ${title} · value=${item.currentValue}`,
  )
}
if (maxed.length > 40) console.log(`  … and ${maxed.length - 40} more`)

console.log('\n--- Level ≥3 (sample) ---')
for (const item of highTier.filter((i) => !maxed.includes(i)).slice(0, 20)) {
  console.log(
    `  ${item.definition.id}: Lv.${item.currentLevel}/${item.maxLevel} · value=${item.currentValue}`,
  )
}
