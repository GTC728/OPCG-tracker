import { REMAINING_ACHIEVEMENT_CATALOG } from '@/data/achievementBacklogRemainingCatalog.generated'
import { REMAINING_METRIC_BINDINGS } from '@/data/achievementBacklogRemainingMetrics.generated'
import { buildRemainingAchievementDefinitions } from '@/lib/achievementsBacklogHelpers'
import { buildBacklogStats, type BacklogExtras } from '@/lib/achievementsBacklogStats'
import type { Deck, Match, Player } from '@/types'

export const REMAINING_ACHIEVEMENT_DEFINITIONS = buildRemainingAchievementDefinitions(
  REMAINING_ACHIEVEMENT_CATALOG,
)

export function evaluateRemainingBacklogMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  extras: BacklogExtras,
): Record<string, number> {
  const stats = buildBacklogStats(playerId, players, decks, matches, extras)
  const statRecord = stats as unknown as Record<string, number>
  const out: Record<string, number> = {}

  for (const entry of REMAINING_ACHIEVEMENT_CATALOG) {
    const binding = REMAINING_METRIC_BINDINGS[entry.id]
    if (binding === '__v5__' || binding === '__ui__') {
      out[entry.id] = 0
      continue
    }
    if (binding && binding in statRecord) {
      out[entry.id] = statRecord[binding] ?? 0
      continue
    }
    out[entry.id] = 0
  }

  // Broken / mis-bound metrics — require real conditions
  out.onboarding_graduate = 0
  out.secret_handshake = 0
  out.secret_lucky_roll = 0
  out.secret_all_dash = 0
  out.secret_midnight_mirror = stats.secretMirrorHell ?? 0
  out.secret_achievement_hunter = stats.maxTierFamilies >= 5 ? 1 : 0

  if (extras.settings.onboardingCompleted && stats.total >= 10) {
    out.onboarding_graduate = 1
  }
  if (stats.wins >= 5 && stats.longestWinStreak >= 3) {
    out.secret_handshake = 1
  }
  if (extras.linkedPlayerId === playerId) {
    out.claim_creator = 1
    out.profile_complete = 1
  }
  // Personal participation in the group — not roster headcount
  out.group_anchor = stats.total

  // Settings-aware overrides — group/sync badges only for the linked profile owner
  if (extras.linkedPlayerId === playerId && extras.settings.lastGroupCode) {
    out.group_code_join = Math.max(out.group_code_join ?? 0, 1)
    out.sync_pioneer = Math.max(out.sync_pioneer ?? 0, extras.settings.groupCollabBootstrapped ? 1 : 0)
    out.cloud_guardian = Math.max(out.cloud_guardian ?? 0, extras.settings.lastGroupSyncAt ? 1 : 0)
  }
  if (stats.wins >= 1 && stats.notesMatches >= 1) {
    out.noted_perfection = Math.max(out.noted_perfection ?? 0, stats.notesMatches)
  }

  return out
}
