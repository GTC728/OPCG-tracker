import { getMatchDurationMs } from '@/lib/matchTimer'
import { getCompletedMatches } from '@/lib/stats'
import type { Match, MatchSource } from '@/types'

/** Minimum in-match duration for achievement credit (5 minutes). */
export const MIN_ACHIEVEMENT_MATCH_MS = 5 * 60 * 1000

/** Minimum gap between consecutive matches for the same player (5 minutes). */
export const MIN_ACHIEVEMENT_GAP_MS = 5 * 60 * 1000

/** Max achievement-eligible matches per player per session. */
export const SESSION_ACHIEVEMENT_CAP_PER_PLAYER = 20

export type EligibilityReason =
  | 'ok'
  | 'import_source'
  | 'forfeit'
  | 'too_short'
  | 'overlap_gap'
  | 'session_cap'

const REASON_LABELS: Record<EligibilityReason, string> = {
  ok: '',
  import_source: '匯入來源不計成就（請用雲端備份還原歷史資料）',
  forfeit: '投降/早降不計成就',
  too_short: '對局不足 5 分鐘不計成就',
  overlap_gap: '與上一場完成時間間隔不足 5 分鐘',
  session_cap: `單場次超過 ${SESSION_ACHIEVEMENT_CAP_PER_PLAYER} 場成就上限`,
}

export function eligibilityReasonLabel(reason: EligibilityReason): string {
  return REASON_LABELS[reason]
}

/** Sources that may count toward permanent achievements when plausibility checks pass. */
export function isSourceEligibleForAchievements(source: MatchSource): boolean {
  return source === 'manual' || source === 'manual_edit' || source === 'restore'
}

function sortByFinished(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
}

/**
 * Per-player eligibility map for completed matches.
 * Import rows never count; restore + live-recorded rows pass time/session rules.
 */
export function computePlayerMatchEligibility(
  playerId: string,
  matches: Match[],
): Map<string, EligibilityReason> {
  const result = new Map<string, EligibilityReason>()
  const relevant = sortByFinished(
    getCompletedMatches(matches).filter(
      (match) => match.player1Id === playerId || match.player2Id === playerId,
    ),
  )

  const sessionEligibleCounts = new Map<string, number>()
  let lastFinishedAtMs: number | null = null

  for (const match of relevant) {
    if (!isSourceEligibleForAchievements(match.source)) {
      result.set(match.id, 'import_source')
      continue
    }
    if (match.resultType === 'forfeit') {
      result.set(match.id, 'forfeit')
      continue
    }

    const durationMs = getMatchDurationMs(match.startedAt, match.finishedAt)
    if (durationMs !== null && durationMs < MIN_ACHIEVEMENT_MATCH_MS) {
      result.set(match.id, 'too_short')
      continue
    }

    const startedMs = new Date(match.startedAt).getTime()
    if (
      lastFinishedAtMs !== null &&
      !Number.isNaN(startedMs) &&
      startedMs - lastFinishedAtMs < MIN_ACHIEVEMENT_GAP_MS
    ) {
      result.set(match.id, 'overlap_gap')
      continue
    }

    const sessionCount = sessionEligibleCounts.get(match.sessionId) ?? 0
    if (sessionCount >= SESSION_ACHIEVEMENT_CAP_PER_PLAYER) {
      result.set(match.id, 'session_cap')
      continue
    }

    result.set(match.id, 'ok')
    sessionEligibleCounts.set(match.sessionId, sessionCount + 1)
    const finishedMs = new Date(match.finishedAt).getTime()
    if (!Number.isNaN(finishedMs)) {
      lastFinishedAtMs = finishedMs
    }
  }

  return result
}

/** Matches that count toward achievements for a player. Stats use the full match list. */
export function playerEligibleMatches(playerId: string, matches: Match[]): Match[] {
  const eligibility = computePlayerMatchEligibility(playerId, matches)
  return getCompletedMatches(matches).filter(
    (match) =>
      (match.player1Id === playerId || match.player2Id === playerId) &&
      eligibility.get(match.id) === 'ok',
  )
}

export function isMatchEligibleForPlayer(
  playerId: string,
  matchId: string,
  allMatches: Match[],
): boolean {
  return computePlayerMatchEligibility(playerId, allMatches).get(matchId) === 'ok'
}

export function countEligibleMatches(playerId: string, matches: Match[]): number {
  return playerEligibleMatches(playerId, matches).length
}
