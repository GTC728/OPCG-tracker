import {
  backlogExtrasFromState,
  computeAchievementLeaderboards,
  evaluateAchievementState,
  getPlayerAchievementProgress,
  type AchievementGlobalRate,
  type AchievementProgress,
} from '@/lib/achievements'
import type { BacklogExtras } from '@/lib/achievementsBacklogStats'
import {
  materializedDashboardStats,
  materializedDeckStats,
  materializedFirstSecondStats,
  materializedMatchupStats,
  materializedMetaSummary,
  materializedPlayerDeckStats,
  materializedPlayerMatchupStats,
  materializedPlayerStats,
  syncMaterializedStats,
  resetMaterializedStats,
} from '@/lib/materializedStats'
import {
  buildDeckUsageDistribution,
  buildHeadToHeadStats,
  buildInsightMessages,
  buildRecentForm,
  buildWeeklyWinRateStats,
  buildWinStreakStats,
  getCompletedMatches,
  type DashboardStats,
  type DeckUsageSlice,
  type FirstSecondStat,
  type InsightMessage,
  type MatchupStat,
  type MetaSummaryStats,
  type PlayerDeckStat,
  type PlayerMatchupStat,
  type RecentFormStat,
  type RecordStat,
} from '@/lib/stats'
import type { AppState, AchievementUnlock, Deck, Language, Match, Player } from '@/types'

/** Slice of app state that affects derived analytics & achievements. */
export interface AppDataSlice {
  matches: Match[]
  players: Player[]
  decks: Deck[]
  achievementUnlocks: AchievementUnlock[]
  matchRevisions: AppState['matchRevisions']
  auditLog: AppState['auditLog']
  settings: AppState['settings']
  sessions: AppState['sessions']
}

export function pickAppDataSlice(state: AppState): AppDataSlice {
  return {
    matches: state.matches,
    players: state.players,
    decks: state.decks,
    achievementUnlocks: state.achievementUnlocks,
    matchRevisions: state.matchRevisions,
    auditLog: state.auditLog,
    settings: state.settings,
    sessions: state.sessions,
  }
}

export function computeAppDataFingerprint(slice: AppDataSlice): string {
  const completed = getCompletedMatches(slice.matches)
  let lastId = ''
  let lastFinishedAt = ''
  if (completed.length) {
    let last = completed[0]
    for (let i = 1; i < completed.length; i += 1) {
      if (new Date(completed[i].finishedAt).getTime() > new Date(last.finishedAt).getTime()) {
        last = completed[i]
      }
    }
    lastId = last.id
    lastFinishedAt = last.finishedAt
  }
  return [
    completed.length,
    lastId,
    lastFinishedAt,
    slice.players.length,
    slice.decks.length,
    slice.achievementUnlocks.length,
    slice.matchRevisions.length,
    slice.auditLog.length,
    slice.settings.linkedPlayerId ?? '',
  ].join('|')
}

export interface MatchIndex {
  completed: Match[]
  bySessionId: Map<string, Match[]>
}

const matchIndexCache = new Map<string, MatchIndex>()

export function getMatchIndex(slice: AppDataSlice): MatchIndex {
  const fp = computeAppDataFingerprint(slice)
  const cached = matchIndexCache.get(fp)
  if (cached) return cached

  const completed = getCompletedMatches(slice.matches)
  const bySessionId = new Map<string, Match[]>()
  for (const match of completed) {
    const list = bySessionId.get(match.sessionId)
    if (list) list.push(match)
    else bySessionId.set(match.sessionId, [match])
  }

  const index: MatchIndex = { completed, bySessionId }
  matchIndexCache.set(fp, index)
  if (matchIndexCache.size > 4) {
    const oldest = matchIndexCache.keys().next().value
    if (oldest) matchIndexCache.delete(oldest)
  }
  return index
}

export type StatsScope = { type: 'all' } | { type: 'session'; sessionId: string }

function scopeKey(scope: StatsScope): string {
  return scope.type === 'all' ? 'all' : `session:${scope.sessionId}`
}

function resolveScopedMatches(index: MatchIndex, scope: StatsScope): Match[] {
  if (scope.type === 'all') return index.completed
  return index.bySessionId.get(scope.sessionId) ?? []
}

export interface ScopedStatsBundle {
  scopedMatches: Match[]
  dashboard: DashboardStats
  playerStats: RecordStat[]
  deckStats: RecordStat[]
  playerDeckStats: PlayerDeckStat[]
  matchupStats: MatchupStat[]
  playerMatchupStats: PlayerMatchupStat[]
  metaSummary: MetaSummaryStats
  firstSecondStats: FirstSecondStat[]
  globalRecentForm: RecentFormStat[]
}

const statsBundleCache = new Map<string, ScopedStatsBundle>()

export function getScopedStatsBundle(
  slice: AppDataSlice,
  scope: StatsScope,
  language: Language,
): ScopedStatsBundle {
  const key = `${computeAppDataFingerprint(slice)}:${scopeKey(scope)}:${language}`
  const cached = statsBundleCache.get(key)
  if (cached) return cached

  const index = getMatchIndex(slice)
  syncMaterializedStats(index.completed)
  const scopedMatches = resolveScopedMatches(index, scope)
  const bundle: ScopedStatsBundle = {
    scopedMatches,
    dashboard: materializedDashboardStats(slice.players, slice.decks, scope, language),
    playerStats: materializedPlayerStats(slice.players, scope),
    deckStats: materializedDeckStats(slice.decks, scope, language),
    playerDeckStats: materializedPlayerDeckStats(slice.players, slice.decks, scope, language),
    matchupStats: materializedMatchupStats(slice.decks, scope, language),
    playerMatchupStats: materializedPlayerMatchupStats(slice.players, scope),
    metaSummary: materializedMetaSummary(scope),
    firstSecondStats: materializedFirstSecondStats(scope),
    globalRecentForm: buildRecentForm(scopedMatches),
  }
  statsBundleCache.set(key, bundle)
  if (statsBundleCache.size > 8) {
    const oldest = statsBundleCache.keys().next().value
    if (oldest) statsBundleCache.delete(oldest)
  }
  return bundle
}

const insightsCache = new Map<string, InsightMessage[]>()

export function getScopedInsights(
  slice: AppDataSlice,
  scope: StatsScope,
  language: Language,
): InsightMessage[] {
  const key = `${computeAppDataFingerprint(slice)}:${scopeKey(scope)}:${language}:insights`
  const cached = insightsCache.get(key)
  if (cached) return cached
  const scopedMatches = resolveScopedMatches(getMatchIndex(slice), scope)
  const insights = buildInsightMessages(slice.players, slice.decks, scopedMatches, language)
  insightsCache.set(key, insights)
  if (insightsCache.size > 8) {
    const oldest = insightsCache.keys().next().value
    if (oldest) insightsCache.delete(oldest)
  }
  return insights
}

export interface PlayerProfileBundle {
  playerMatches: Match[]
  stat: RecordStat | null
  streak: ReturnType<typeof buildWinStreakStats>
  deckUsage: DeckUsageSlice[]
  deckUsageById: Map<string, DeckUsageSlice>
  weeklyStats: ReturnType<typeof buildWeeklyWinRateStats>
  deckStats: PlayerDeckStat[]
  headToHead: ReturnType<typeof buildHeadToHeadStats>
  recentForm: RecentFormStat[]
  recentMatches: Match[]
}

const playerProfileCache = new Map<string, PlayerProfileBundle>()

export function getPlayerProfileBundle(
  slice: AppDataSlice,
  playerId: string,
  language: Language,
): PlayerProfileBundle {
  const key = `${computeAppDataFingerprint(slice)}:player:${playerId}:${language}`
  const cached = playerProfileCache.get(key)
  if (cached) return cached

  const completed = getMatchIndex(slice).completed
  syncMaterializedStats(completed)
  const scope = { type: 'all' as const }
  const playerMatches = completed.filter((m) => m.player1Id === playerId || m.player2Id === playerId)
  const stat = materializedPlayerStats(slice.players, scope).find((item) => item.id === playerId) ?? null
  const deckUsage = buildDeckUsageDistribution(playerId, slice.decks, completed, language)
  const bundle: PlayerProfileBundle = {
    playerMatches,
    stat,
    streak: buildWinStreakStats(playerId, completed),
    deckUsage,
    deckUsageById: new Map(deckUsage.map((sliceItem) => [sliceItem.deckId, sliceItem])),
    weeklyStats: buildWeeklyWinRateStats(playerId, completed),
    deckStats: materializedPlayerDeckStats(slice.players, slice.decks, scope, language).filter(
      (item) => item.playerId === playerId,
    ),
    headToHead: buildHeadToHeadStats(playerId, slice.players, completed),
    recentForm: buildRecentForm(completed, playerId),
    recentMatches: [...playerMatches]
      .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
      .slice(0, 10),
  }
  playerProfileCache.set(key, bundle)
  if (playerProfileCache.size > 16) {
    const oldest = playerProfileCache.keys().next().value
    if (oldest) playerProfileCache.delete(oldest)
  }
  return bundle
}

interface AchievementStateCache {
  metrics: Record<string, number>
  levels: Record<string, number>
}

const playerAchievementCache = new Map<string, AchievementStateCache>()
let leaderboardCacheKey = ''
let leaderboardCache: {
  globalRates: Map<string, AchievementGlobalRate>
  peerRateByPlayer: Map<string, number>
  levelByPlayer: Map<string, Record<string, number>>
} | null = null

function achievementExtrasFingerprint(slice: AppDataSlice): string {
  return `${slice.matchRevisions.length}:${slice.auditLog.length}:${slice.sessions.length}`
}

function playerAchievementCacheKey(
  slice: AppDataSlice,
  playerId: string,
  linkedPlayerId: string | null,
): string {
  return `${computeAppDataFingerprint(slice)}:${achievementExtrasFingerprint(slice)}:${playerId}:${linkedPlayerId ?? ''}`
}

export function getCachedAchievementState(
  slice: AppDataSlice,
  playerId: string,
  linkedPlayerId: string | null,
  extras?: BacklogExtras,
): AchievementStateCache {
  const backlogExtras = extras ?? backlogExtrasFromState(slice as AppState)
  const key = playerAchievementCacheKey(slice, playerId, linkedPlayerId)
  const cached = playerAchievementCache.get(key)
  if (cached) return cached

  const state = evaluateAchievementState(
    playerId,
    slice.players,
    slice.decks,
    slice.matches,
    linkedPlayerId,
    backlogExtras,
  )
  playerAchievementCache.set(key, state)
  if (playerAchievementCache.size > 32) {
    const oldest = playerAchievementCache.keys().next().value
    if (oldest) playerAchievementCache.delete(oldest)
  }
  return state
}

export function getCachedAchievementLeaderboards(slice: AppDataSlice): {
  globalRates: Map<string, AchievementGlobalRate>
  peerRateByPlayer: Map<string, number>
} {
  const key = computeAppDataFingerprint(slice)
  if (leaderboardCache && leaderboardCacheKey === key) {
    return {
      globalRates: leaderboardCache.globalRates,
      peerRateByPlayer: leaderboardCache.peerRateByPlayer,
    }
  }

  const result = computeAchievementLeaderboards(slice.players, slice.decks, slice.matches)
  leaderboardCacheKey = key
  leaderboardCache = {
    globalRates: result.globalRates,
    peerRateByPlayer: result.peerRateByPlayer,
    levelByPlayer: new Map(),
  }
  return result
}

export function getCachedPlayerAchievementProgress(
  slice: AppDataSlice,
  playerId: string,
  linkedPlayerId: string | null,
  globalRates: Map<string, AchievementGlobalRate>,
  extras?: BacklogExtras,
): AchievementProgress[] {
  const precomputed = getCachedAchievementState(slice, playerId, linkedPlayerId, extras)
  return getPlayerAchievementProgress(
    playerId,
    slice.players,
    slice.decks,
    slice.matches,
    slice.achievementUnlocks,
    globalRates,
    linkedPlayerId,
    extras,
    precomputed,
  )
}

export function invalidateDerivedCache(): void {
  resetMaterializedStats()
  matchIndexCache.clear()
  statsBundleCache.clear()
  insightsCache.clear()
  playerProfileCache.clear()
  playerAchievementCache.clear()
  leaderboardCache = null
  leaderboardCacheKey = ''
}
