/**
 * Parses docs/ACHIEVEMENTS-BACKLOG.md and emits achievement catalog source.
 * Run: npx tsx scripts/generate-achievement-catalog.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const doc = readFileSync(join(root, 'docs/ACHIEVEMENTS-BACKLOG.md'), 'utf8')

const SHIPPED = new Set([
  'veteran', 'first_win', 'win_streak', 'deck_specialist', 'meta_explorer', 'set_collector',
  'mono_maniac', 'rival_bond', 'group_star', 'session_marathon', 'note_poet', 'comeback',
  'perfect_session', 'first_player_king', 'giant_slayer', 'color_spectrum', 'second_striker',
  'upset_alarm', 'mirror_master', 'meta_breaker', 'revenge_win', 'underdog', 'weekend_warrior',
  'rainbow_session', 'achievement_hunter',
  'second_player_king', 'loyalist', 'dual_tone', 'color_devotee', 'deck_rotator', 'ice_breaker',
  'circle_session', 'nemesis_bond', 'balanced_rival', 'night_owl', 'early_bird', 'hot_day',
  'hot_hand', 'clutch_finisher', 'weekday_grind', 'streak_saver', 'clean_sweep', 'leader_loyalty',
  'import_archivist', 'marathon_month', 'nemesis_slayer', 'table_tactician', 'trio_triumph',
  'rivalry_sweep', 'set_dominance',
  'centurion_wins', 'iron_win_rate', 'rematch_king', 'leader_collector', 'round_robin',
  'midnight_duel', 'lunch_break', 'white_mastery', 'blue_mastery', 'red_mastery', 'green_mastery',
  'purple_mastery', 'win_or_learn', 'weekly_grinder', 'store_regular', 'opening_act', 'closer',
  'profile_linked', 'marathon_mind', 'speed_demon',
])

const VALID_CATEGORIES = new Set(['milestone', 'streak', 'skill', 'meta', 'social', 'fun'])

/** Batch B lacks category column — map by id. */
const BATCH_B_CATEGORY: Record<string, string> = {
  set_sail: 'meta', expansion_regular: 'meta', class_loyalist: 'meta', noted_perfection: 'fun',
  same_turn_sweep: 'skill', no_rematch_streak: 'meta', table_flip: 'skill', red_rush: 'meta',
  green_midrange: 'meta', black_control: 'meta', purple_pilot: 'meta', pauper_hero: 'meta',
  monthly_mythic: 'milestone', secret_first_blood: 'fun', secret_mirror_hell: 'fun',
  secret_silent_win: 'fun', secret_unknown_deck: 'fun', secret_exodia: 'skill',
  damage_clock: 'skill', long_game: 'skill', perfect_table_four: 'skill',
  league_sign_in: 'milestone', ambassador: 'social', weekly_cap: 'milestone',
  season_lore: 'milestone', login_streak: 'milestone', profile_complete: 'milestone',
  hunter_75: 'fun', rare_trophy: 'fun', showcase_master: 'fun', data_importer: 'milestone',
  cloud_guardian: 'milestone', daily_duelist: 'milestone', daily_winner: 'milestone',
  swiss_survivor: 'skill', sportsmanship: 'social',
  bo3_ready: 'skill', event_entered: 'milestone', ot_champion: 'skill',
  zero_undo_session: 'fun', teacher: 'social', win_or_learn: 'milestone',
  quest_reroll: 'fun', battle_pass_tier: 'milestone',
}

type Row = { id: string; title: string; category: string }

const rows: Row[] = []
const seen = new Set<string>()

function add(id: string, title: string, category: string) {
  if (SHIPPED.has(id) || seen.has(id)) return
  seen.add(id)
  rows.push({ id, title, category: VALID_CATEGORIES.has(category) ? category : 'fun' })
}

// Part 3/5/5b/5c: | A01 | `id` | title | category | data |
const catRowRe = /^\| [A-Z]\d+ \| `([a-z0-9_]+)` \| ([^|]+?) \| (milestone|streak|skill|meta|social|fun) \|/gm
let m: RegExpExecArray | null
while ((m = catRowRe.exec(doc)) !== null) {
  add(m[1], m[2].trim(), m[3])
}

// Part 4 Batch B: | B01 | `id` | title | inspiration | data |
const batchBRe = /^\| B\d+ \| `([a-z0-9_]+)` \| ([^|]+?) \| [^|]+ \|/gm
while ((m = batchBRe.exec(doc)) !== null) {
  const id = m[1]
  const category = BATCH_B_CATEGORY[id] ?? 'fun'
  add(id, m[2].trim(), category)
}

const easeFor = (category: string) => {
  switch (category) {
    case 'milestone': return 70
    case 'streak': return 45
    case 'skill': return 35
    case 'meta': return 55
    case 'social': return 50
    case 'fun': return 75
    default: return 60
  }
}

const iconFor = (category: string) => {
  switch (category) {
    case 'milestone': return 'medal'
    case 'streak': return 'flame'
    case 'skill': return 'bolt'
    case 'meta': return 'compass'
    case 'social': return 'anchor'
    case 'fun': return 'sparkles'
    default: return 'star'
  }
}

const tierFor = (id: string, category: string) => {
  if (
    id.startsWith('secret_') ||
    id === 'onboarding_graduate' ||
    id === 'profile_complete' ||
    id === 'share_first' ||
    id === 'exactly_fifty' ||
    id === 'leap_day' ||
    id === 'new_year_first'
  ) {
    return [1]
  }
  if (id === 'match_100' || id === 'match_500' || id === 'match_777' || id === 'match_1000') return [1]
  if (id === 'win_100') return [100]
  if (id === 'win_250') return [250]
  if (id === 'weighted_progress_50') return [50]
  if (id === 'weighted_progress_100') return [100]
  if (id.startsWith('event_') || id.startsWith('league_') || id === 'bo3_ready') return [1, 3, 5]
  if (id.endsWith('_gold') || id === 'hunter_75' || id === 'completionist_90') return [12, 30, 60]
  if (id === 'streak_legend') return [8, 12, 16, 20, 25]
  if (id === 'tier_maxer') return [5, 12, 25, 45, 70]
  if (id === 'tier_triple' || id === 'skill_trifecta') return [3, 5, 8, 12, 18]
  if (id.includes('day') || id.includes('regular') || id.includes('sign')) return [8, 20, 45, 90, 180]
  if (id.includes('session') && !id.includes('opener') && !id.includes('closer')) return [8, 20, 45, 80, 150]
  if (id.includes('win') && !id.includes('rate') && !id.includes('learn')) return [15, 40, 80, 150, 250]
  if (id.includes('loss') || id.includes('learn')) return [20, 50, 100, 200, 400]
  if (id.includes('rival') || id.includes('nemesis') || id.includes('friend') || id.includes('opponent')) {
    return [6, 15, 30, 50, 75]
  }
  if (id.includes('deck') || id.includes('leader') || id.includes('set') || id.includes('meta') || id.includes('pie')) {
    return [4, 10, 22, 38, 60]
  }
  if (id.includes('note') || id.includes('gg_')) return [8, 25, 55, 100, 180]
  if (id.includes('edit') || id.includes('history')) return [5, 15, 40, 80, 150]
  if (id.includes('streak')) return [4, 7, 11, 16, 22]
  if (id.includes('import') || id.includes('sync') || id.includes('cloud')) return [1, 5, 15, 40, 100]
  if (id.includes('table') || id.includes('slot')) return [10, 25, 50, 80, 120]

  switch (category) {
    case 'milestone':
      return [20, 50, 100, 200, 400]
    case 'streak':
      return [4, 8, 12, 18, 25]
    case 'skill':
      return [5, 15, 35, 65, 110]
    case 'meta':
      return [4, 10, 22, 38, 60]
    case 'social':
      return [6, 15, 30, 50, 75]
    case 'fun':
      return [3, 10, 25, 50, 90]
    default:
      return [10, 30, 70, 140, 280]
  }
}

const lines = rows.map((r) => {
  const tiers = tierFor(r.id, r.category)
  const kind = r.id.startsWith('secret_') || r.id.includes('event_') ? 'special' : 'grind'
  return `  { id: '${r.id}', category: '${r.category}', kind: '${kind}', ease: ${easeFor(r.category)}, icon: '${iconFor(r.category)}', titleZh: ${JSON.stringify(r.title)}, tiers: ${JSON.stringify(tiers)} },`
})

const out = `/** AUTO-GENERATED — do not edit by hand. Run: npx tsx scripts/generate-achievement-catalog.mts */
import type { AchievementIconKind, AchievementCategory, AchievementKind } from '@/lib/achievements'

export type RemainingCatalogEntry = {
  id: string
  category: AchievementCategory
  kind: AchievementKind
  ease: number
  icon: AchievementIconKind
  titleZh: string
  tiers: number[]
}

export const REMAINING_ACHIEVEMENT_CATALOG: RemainingCatalogEntry[] = [
${lines.join('\n')}
]
`

writeFileSync(join(root, 'src/data/achievementBacklogRemainingCatalog.generated.ts'), out)
console.log(`Generated ${rows.length} remaining achievement catalog entries.`)
