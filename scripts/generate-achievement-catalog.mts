/**
 * Parses docs/ACHIEVEMENTS-BACKLOG.md and emits achievement catalog source.
 * Run: npx tsx scripts/generate-achievement-catalog.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickTierCurve } from '../src/lib/achievementTierCurves.ts'

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
  'purple_mastery', 'weekly_grinder', 'store_regular', 'opening_act', 'closer',
  'profile_linked', 'marathon_mind', 'speed_demon',
  'conflict_survivor', 'multi_group_tourist',
  // Batch B — already in BACKLOG_BATCH_DEFINITIONS
  'set_sail', 'expansion_regular', 'class_loyalist', 'noted_perfection', 'same_turn_sweep',
  'no_rematch_streak', 'bo3_ready', 'table_flip', 'red_rush', 'green_midrange', 'black_control',
  'purple_pilot', 'pauper_hero', 'event_entered', 'swiss_survivor', 'monthly_mythic',
  'secret_first_blood', 'secret_mirror_hell', 'secret_silent_win', 'secret_unknown_deck', 'secret_exodia',
  'damage_clock', 'long_game', 'ot_champion', 'zero_undo_session', 'perfect_table_four',
  'league_sign_in', 'teacher', 'ambassador', 'sportsmanship', 'weekly_cap', 'season_lore',
  'login_streak', 'profile_complete', 'hunter_75', 'rare_trophy', 'showcase_master',
  'data_importer', 'cloud_guardian', 'daily_duelist', 'daily_winner', 'quest_reroll', 'battle_pass_tier',
])

/** Pruned: unimplemented UI, future V5, or merged into another achievement family. */
const EXCLUDED = new Set([
  // UI / settings — not wired to stats yet
  'share_first', 'share_evangelist', 'session_poster', 'card_case_artist', 'community_peek',
  'peer_parity', 'lonely_elite', 'claim_reclaim', 'alias_spirit', 'locale_polyglot',
  'roster_solo', 'merge_survivor', 'session_merged', 'archive_diver', 'soft_delete_phoenix',
  'copy_reopen', 'assign_speedrun', 'dock_master', 'first_only', 'second_only',
  'multi_device', 'backup_hero', 'appearance_guru', 'compact_veteran', 'light_mode_hero',
  'sound_checker', 'lunar_spark', 'heatmap_reader', 'scope_toggle', 'trend_rider', 'trend_faller',
  'overflow_veteran', 'drag_drop_debut', 'tap_assign_only', 'roster_prompt_hero',
  'merge_session_witness', 'tombstone_purge', 'filter_master', 'date_range_archaeologist',
  'deck_search_sniper', 'starter_only_month', 'achievement_sort_all', 'grind_level_up_live',
  'read_every_desc', 'email_login', 'group_upload_first', 'group_download_first', 'queue_hero',
  'login_streak', 'rare_trophy', 'showcase_master', 'no_rematch_streak', 'fibonacci_win',
  'anti_meta_day', 'same_deck_different_pilots', 'pilot_swap_win', 'zero_undo_session',
  'secret_first_blood', 'secret_silent_win', 'secret_unknown_deck', 'share_unlock',
  'community_bottom10', 'offline_warrior',
  // V5 / events / league — future features
  'global_top100', 'community_top10', 'realtime_witness', 'conflict_survivor', 'multi_group_tourist',
  'event_check_in', 'event_3_0', 'event_top8', 'event_champion', 'league_points_100',
  'bo3_ready', 'event_entered', 'swiss_survivor', 'ot_champion', 'teacher', 'sportsmanship',
  'quest_reroll', 'battle_pass_tier',
  // Merged duplicates (keep the canonical family elsewhere)
  'tier_maxer', 'tier_triple', // → completionist_90 / hunter_75
  'claim_creator', // → profile_linked / profile_complete
  'history_editor', // → history_keeper
  'mirror_breaker', // → mirror_master
  'counter_expert', // → counter_pick / meta_breaker
  'loss_streak_iron', // → streak_saver / loss_survivor
  'first_blood', 'second_wind', // → first_player_king / second_striker
  'extend_own_streak', // → win_streak / streak_legend
  'notes_streak', // → note_poet / noted_perfection
  'rival_win5', 'rival_even', 'rival_dominate', // → rival_top5 / balanced_rival / nemesis_slayer
  'nemesis_reversed', // → revenge_win / nemesis_70
  'table_32_touch', // → table_veteran / table_tactician
  'palindrome_session', // → palindrome_score
  'daily_regular', // → store_regular / daily_duelist
  'season_opener', // → set_sail
  'sync_same_day', 'sync_pioneer', // → cloud_guardian / group_code_join
  'excel_surgeon', // → data_importer / import_archivist
  'win_100', // → centurion_wins
  'win_or_learn', // → veteran (total matches)
  'match_100', 'match_500', 'match_1000', 'win_250', // → veteran / centurion_wins
  'quarterly_regular', 'monthly_spread', // → monthly_mythic / season_lore / marathon_month
  'peacemaker', 'hill_king', // → balanced_rival / nemesis_slayer
  'red_rush', 'green_midrange', 'black_control', 'purple_pilot', 'pauper_hero', // → color masteries
  'leader_wall', 'class_loyalist', 'set_pair_master', 'pie_master', // → leader_collector / meta_explorer
  'all_time_legend', // → centurion_wins
  'damage_clock', // → same_turn_sweep / speed_demon
  'skill_gold', 'fun_gold', 'social_gold', 'meta_gold', // → category_sweep
  'nemesis_chain', 'new_rival', 'old_rival', // → rival_bond / group_star
  'noted_perfection', // → note_poet (batch duplicate in catalog)
  'set_sail', 'expansion_regular', // batch dupes if doc re-parses
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
  zero_undo_session: 'fun', teacher: 'social',
  quest_reroll: 'fun', battle_pass_tier: 'milestone',
}

type Row = { id: string; title: string; category: string }

const rows: Row[] = []
const seen = new Set<string>()

function add(id: string, title: string, category: string) {
  if (SHIPPED.has(id) || EXCLUDED.has(id) || seen.has(id)) return
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

const tierFor = (id: string, category: string) => [...pickTierCurve(id, category)]

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
