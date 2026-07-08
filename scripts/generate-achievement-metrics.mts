/**
 * Emits metric field bindings for remaining achievements.
 * Run: npx tsx scripts/generate-achievement-metrics.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogSrc = readFileSync(
  join(root, 'src/data/achievementBacklogRemainingCatalog.generated.ts'),
  'utf8',
)
const idRe = /id: '([a-z0-9_]+)'/g
const ids: string[] = []
let m: RegExpExecArray | null
while ((m = idRe.exec(catalogSrc)) !== null) ids.push(m[1])

const V5 = new Set([
  'bo3_ready', 'event_entered', 'swiss_survivor', 'ot_champion', 'teacher', 'sportsmanship',
  'quest_reroll', 'battle_pass_tier', 'global_top100', 'community_top10', 'global_top100',
  'event_check_in', 'event_3_0', 'event_top8', 'event_champion', 'league_points_100',
  'conflict_survivor', 'multi_group_tourist', 'realtime_witness',
])

const EXPLICIT: Record<string, string> = {
  daily_regular: 'maxDayStreak',
  season_opener: 'setWins',
  table_veteran: 'uniqueTableSlots',
  history_keeper: 'editCount',
  loss_survivor: 'streakSaverCount',
  bounce_back: 'bounceBackCount',
  session_heater: 'sessionHeaterMax',
  cold_open: 'coldOpenLosses',
  alternating_fate: 'alternatingSessions',
  no_mercy: 'noMercyStreak',
  first_blood: 'firstPlayerWins',
  second_wind: 'secondPlayerWins',
  turn_hunter: 'firstPlayerWinPct',
  mirror_breaker: 'mirrorWins',
  counter_expert: 'counterPickWins',
  flawless_table: 'flawlessSessionTables',
  clutch_streak: 'clutchStreakCount',
  perfect_week: 'perfectWeekCount',
  upset_chain: 'upsetChainCount',
  clean_record: 'cleanSessionCount',
  set_hopper: 'maxSetsInSession',
  rainbow_pilot: 'rainbowColorWins',
  mono_session: 'monoSessionMax',
  dual_color_master: 'dualColorWins',
  tri_color_trouble: 'triColorWins',
  meta_sheep: 'metaSheepWins',
  meta_rebel: 'metaRebelWins',
  deck_nomad: 'maxDecksInSession',
  op_era: 'uniqueSetCodes',
  nemesis_reversed: 'nemesisReversedCount',
  friendship_games: 'repeatOpponentGames',
  new_face_welcomer: 'newOpponentWins',
  group_anchor: 'groupUniquePlayers',
  sync_pioneer: 'groupCollab',
  peacemaker: 'rivalEven',
  hill_king: 'rivalDominate',
  palindrome_score: 'palindromeSessions',
  lucky_seven: 'luckySevenWins',
  completionist_90: 'maxTierFamilies',
  set_sail: 'setWins',
  expansion_regular: 'uniqueSets',
  class_loyalist: 'uniqueLeaders',
  noted_perfection: 'notesMatches',
  same_turn_sweep: 'speedWins',
  table_flip: 'bounceBackCount',
  red_rush: 'wins',
  green_midrange: 'wins',
  black_control: 'blackWins',
  purple_pilot: 'wins',
  pauper_hero: 'stDeckWins',
  monthly_mythic: 'maxMonthlyGames',
  long_game: 'longGameWins',
  perfect_table_four: 'flawlessSessionTables',
  league_sign_in: 'playDays',
  ambassador: 'newOpponentWins',
  weekly_cap: 'maxWeeklyGames',
  season_lore: 'uniqueMonths',
  profile_complete: 'profileLinked',
  hunter_75: 'maxTierFamilies',
  data_importer: 'importTotal',
  cloud_guardian: 'syncCount',
  daily_duelist: 'maxDayStreak',
  daily_winner: 'wins',
  streak_legend: 'longestWinStreak',
  loss_streak_iron: 'streakSaverCount',
  claim_creator: 'profileLinked',
  st_deck_winner: 'stDeckWins',
  eb_specialist: 'ebDeckWins',
  op16_native: 'op16SessionWins',
  leader_rotation: 'maxLeadersInSession',
  history_editor: 'editCount',
  slot_one_legend: 'slot1Wins',
  slot_wanderer: 'uniqueSlotsWon',
  gg_writer: 'ggNotes',
  rival_top5: 'rivalTop5',
  nemesis_70: 'nemesisReversedCount',
  offline_warrior: 'auditCompleteCount',
  sync_same_day: 'syncCount',
  new_year_first: 'jan1Matches',
  christmas_clash: 'decHolidayMatches',
  summer_surge: 'summerMatches',
  friday_night: 'fridayNightWins',
  sunday_league: 'sundayWins',
  leap_day: 'leapDayMatches',
  monthly_spread: 'uniqueMonths',
  match_100: 'match100',
  match_500: 'match500',
  match_777: 'match777',
  match_1000: 'match1000',
  win_100: 'win100',
  win_250: 'win250',
  exactly_fifty: 'exactlyFiftyPct',
  prime_hunter: 'primeWinCount',
  debut_win: 'debutWins',
  debut_redemption: 'debutRedemption',
  break_opp_streak: 'breakOppStreakCount',
  session_opener_5: 'sessionOpener5',
  session_closer_5: 'sessionCloser5',
  single_table_night: 'singleTableSessions',
  session_end_ritual: 'sessionEndCount',
  new_session_starter: 'sessionsCreated',
  session_archive: 'archivedSessions',
  onboarding_graduate: 'onboardingDone',
  rival_win5: 'rivalTop5',
  rival_even: 'rivalEven',
  rival_dominate: 'rivalDominate',
  rival_respect: 'rivalRespect',
  color_clash_red_blue: 'colorClashRedBlue',
  color_clash_green_purple: 'colorClashGreenPurple',
  black_vs_yellow: 'blackVsYellow',
  tricolor_win: 'tricolorWins',
  single_color_session_sweep: 'monoSessionSweep',
  secret_exodia: 'secretExodiaWeek',
  secret_mirror_hell: 'secretMirrorHell',
  secret_zero_note_streak: 'silentWinStreak',
  chaos_session: 'chaosSessions',
  palindrome_session: 'palindromeSessions',
  group_code_join: 'groupCollab',
}

function guessField(id: string): string {
  if (EXPLICIT[id]) return EXPLICIT[id]
  if (V5.has(id)) return '__v5__'
  if (id.startsWith('event_') || id.startsWith('league_')) return '__v5__'
  if (id.includes('win')) return 'wins'
  if (id.includes('loss') || id.includes('learn')) return 'total'
  if (id.includes('day') || id.includes('regular') || id.includes('sign')) return 'playDays'
  if (id.includes('session')) return 'uniqueSessions'
  if (id.includes('rival') || id.includes('nemesis') || id.includes('friend')) return 'uniqueOpponents'
  if (id.includes('deck') || id.includes('leader') || id.includes('set') || id.includes('meta')) return 'uniqueDecks'
  if (id.includes('secret_')) return 'wins'
  if (id.includes('share') || id.includes('community') || id.includes('appearance') || id.includes('filter')) return '__ui__'
  return 'total'
}

const lines = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(guessField(id))},`)

const out = `/** AUTO-GENERATED — do not edit by hand. Run: npx tsx scripts/generate-achievement-metrics.mts */
export const REMAINING_METRIC_BINDINGS: Record<string, string> = {
${lines.join('\n')}
}
`

writeFileSync(join(root, 'src/data/achievementBacklogRemainingMetrics.generated.ts'), out)
console.log(`Generated ${ids.length} metric bindings.`)
