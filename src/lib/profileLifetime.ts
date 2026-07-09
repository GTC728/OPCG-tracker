import { playerEligibleMatches } from '@/lib/achievementEligibility'
import { getLongestWinStreak, sortByFinished } from '@/lib/achievements'
import type { AppState, Match, Player, ProfileLifetimeStats } from '@/types'

const OUTCOME_CAP = 400

export function createEmptyLifetime(profileIdentityId: string): ProfileLifetimeStats {
  return {
    profileIdentityId,
    totalMatches: 0,
    totalWins: 0,
    longestWinStreak: 0,
    maxDeckWins: 0,
    uniqueDeckIds: [],
    uniqueOpponentNames: [],
    maxSessionMatches: 0,
    notesMatches: 0,
    recentOutcomes: [],
    updatedAt: new Date().toISOString(),
  }
}

function opponentName(match: Match, playerId: string, players: Player[]): string {
  const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
  return players.find((p) => p.id === opponentId)?.name.trim().toLowerCase() ?? opponentId
}

function deckIdForPlayer(match: Match, playerId: string): string {
  return match.player1Id === playerId ? match.deck1Id : match.deck2Id
}

function recomputeLongestStreak(outcomes: ('w' | 'l')[]): number {
  let best = 0
  let current = 0
  for (const outcome of outcomes) {
    if (outcome === 'w') {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  return best
}

function pushOutcome(lifetime: ProfileLifetimeStats, won: boolean): ProfileLifetimeStats {
  const recentOutcomes = [...lifetime.recentOutcomes, won ? ('w' as const) : ('l' as const)].slice(
    -OUTCOME_CAP,
  )
  return {
    ...lifetime,
    recentOutcomes,
    longestWinStreak: recomputeLongestStreak(recentOutcomes),
  }
}

function popOutcome(lifetime: ProfileLifetimeStats, won: boolean): ProfileLifetimeStats {
  const recentOutcomes: ('w' | 'l')[] = [...lifetime.recentOutcomes]
  const target = won ? 'w' : 'l'
  for (let index = recentOutcomes.length - 1; index >= 0; index -= 1) {
    if (recentOutcomes[index] === target) {
      recentOutcomes.splice(index, 1)
      break
    }
  }
  return {
    ...lifetime,
    recentOutcomes,
    longestWinStreak: recomputeLongestStreak(recentOutcomes),
  }
}

function maxDeckWinsFromMatches(playerId: string, matches: Match[]): number {
  const counts = new Map<string, number>()
  for (const match of matches) {
    if (match.deletedAt !== null || match.winnerPlayerId !== playerId) continue
    const deckId = deckIdForPlayer(match, playerId)
    counts.set(deckId, (counts.get(deckId) ?? 0) + 1)
  }
  return counts.size ? Math.max(...counts.values()) : 0
}

export function applyCompletedMatchToLifetime(
  lifetime: ProfileLifetimeStats,
  match: Match,
  playerId: string,
  players: Player[],
  allMatches: Match[],
): ProfileLifetimeStats {
  if (match.deletedAt !== null) return lifetime
  if (match.player1Id !== playerId && match.player2Id !== playerId) return lifetime

  const won = match.winnerPlayerId === playerId
  const deckId = deckIdForPlayer(match, playerId)
  const opponent = opponentName(match, playerId, players)
  const sessionMatches = allMatches.filter(
    (item) =>
      item.deletedAt === null &&
      item.sessionId === match.sessionId &&
      (item.player1Id === playerId || item.player2Id === playerId),
  ).length

  const uniqueDeckIds = lifetime.uniqueDeckIds.includes(deckId)
    ? lifetime.uniqueDeckIds
    : [...lifetime.uniqueDeckIds, deckId]
  const uniqueOpponentNames = lifetime.uniqueOpponentNames.includes(opponent)
    ? lifetime.uniqueOpponentNames
    : [...lifetime.uniqueOpponentNames, opponent]

  let next = {
    ...lifetime,
    totalMatches: lifetime.totalMatches + 1,
    totalWins: lifetime.totalWins + (won ? 1 : 0),
    uniqueDeckIds,
    uniqueOpponentNames,
    maxSessionMatches: Math.max(lifetime.maxSessionMatches, sessionMatches),
    notesMatches: lifetime.notesMatches + (match.notes?.trim() ? 1 : 0),
    updatedAt: new Date().toISOString(),
  }
  next = pushOutcome(next, won)
  next.maxDeckWins = Math.max(next.maxDeckWins, maxDeckWinsFromMatches(playerId, allMatches))
  return next
}

export function removeCompletedMatchFromLifetime(
  lifetime: ProfileLifetimeStats,
  match: Match,
  playerId: string,
  players: Player[],
  remainingMatches: Match[],
): ProfileLifetimeStats {
  if (match.player1Id !== playerId && match.player2Id !== playerId) return lifetime

  const won = match.winnerPlayerId === playerId
  const deckId = deckIdForPlayer(match, playerId)
  const opponent = opponentName(match, playerId, players)

  const deckStillUsed = remainingMatches.some(
    (item) =>
      item.deletedAt === null &&
      item.player1Id !== item.player2Id &&
      (item.player1Id === playerId || item.player2Id === playerId) &&
      deckIdForPlayer(item, playerId) === deckId,
  )
  const opponentStillUsed = remainingMatches.some(
    (item) =>
      item.deletedAt === null &&
      (item.player1Id === playerId || item.player2Id === playerId) &&
      opponentName(item, playerId, players) === opponent,
  )

  let next = {
    ...lifetime,
    totalMatches: Math.max(0, lifetime.totalMatches - 1),
    totalWins: Math.max(0, lifetime.totalWins - (won ? 1 : 0)),
    uniqueDeckIds: deckStillUsed
      ? lifetime.uniqueDeckIds
      : lifetime.uniqueDeckIds.filter((id) => id !== deckId),
    uniqueOpponentNames: opponentStillUsed
      ? lifetime.uniqueOpponentNames
      : lifetime.uniqueOpponentNames.filter((name) => name !== opponent),
    notesMatches: Math.max(0, lifetime.notesMatches - (match.notes?.trim() ? 1 : 0)),
    updatedAt: new Date().toISOString(),
  }
  next = popOutcome(next, won)
  next.maxDeckWins = maxDeckWinsFromMatches(playerId, remainingMatches)
  next.maxSessionMatches = Math.max(
    0,
    ...remainingMatches
      .filter(
        (item) =>
          item.deletedAt === null &&
          (item.player1Id === playerId || item.player2Id === playerId),
      )
      .reduce((map, item) => {
        map.set(item.sessionId, (map.get(item.sessionId) ?? 0) + 1)
        return map
      }, new Map<string, number>())
      .values(),
  )
  return next
}

/** Merge cross-group lifetime counters into achievement metrics for the linked profile. */
export function mergeLifetimeAchievementMetrics(
  metrics: Record<string, number>,
  lifetime: ProfileLifetimeStats | null,
  playerId: string,
  linkedPlayerId: string | null,
  matches: Match[],
): Record<string, number> {
  if (!lifetime || playerId !== linkedPlayerId) return metrics

  const relevant = playerEligibleMatches(playerId, matches)
  const sorted = sortByFinished(relevant)
  const groupStreak = getLongestWinStreak(sorted, playerId)

  return {
    ...metrics,
    veteran: lifetime.totalMatches,
    first_win: lifetime.totalWins >= 1 ? 1 : 0,
    win_streak: Math.max(lifetime.longestWinStreak, groupStreak),
    deck_specialist: Math.max(metrics.deck_specialist ?? 0, lifetime.maxDeckWins),
    meta_explorer: Math.max(metrics.meta_explorer ?? 0, lifetime.uniqueDeckIds.length),
    group_star: Math.max(metrics.group_star ?? 0, lifetime.uniqueOpponentNames.length),
    session_marathon: Math.max(metrics.session_marathon ?? 0, lifetime.maxSessionMatches),
    note_poet: Math.max(metrics.note_poet ?? 0, lifetime.notesMatches),
  }
}

export function rebuildLifetimeFromMatches(
  profileIdentityId: string,
  playerId: string,
  players: Player[],
  matches: Match[],
): ProfileLifetimeStats {
  let lifetime = createEmptyLifetime(profileIdentityId)
  const eligible = playerEligibleMatches(playerId, matches)
  const completed = sortByFinished(eligible)
  for (const match of completed) {
    lifetime = applyCompletedMatchToLifetime(lifetime, match, playerId, players, completed)
  }
  return lifetime
}

export function getOrCreateLifetime(state: AppState): ProfileLifetimeStats | null {
  const profileId = state.settings.profileIdentityId
  if (!profileId) return null
  return state.profileLifetime?.profileIdentityId === profileId
    ? state.profileLifetime
    : createEmptyLifetime(profileId)
}
