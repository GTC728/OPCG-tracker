import { REMAINING_ACHIEVEMENT_CATALOG } from '@/data/achievementBacklogRemainingCatalog.generated'
import { REMAINING_METRIC_BINDINGS } from '@/data/achievementBacklogRemainingMetrics.generated'
import { buildBacklogStats, type BacklogExtras } from '@/lib/achievementsBacklogStats'
import { REMAINING_ACHIEVEMENT_DEFINITIONS } from '@/lib/achievementsRemainingDefinitions'
import type { AchievementUnlock, Deck, Match, Player } from '@/types'

function filterBacklogUnlocks(playerId: string, extras: BacklogExtras): AchievementUnlock[] {
  if (extras.linkedPlayerId === playerId && extras.settings.profileIdentityId) {
    return extras.achievementUnlocks.filter(
      (u) =>
        (u.profileIdentityId ?? u.playerId) === extras.settings.profileIdentityId && !u.provisional,
    )
  }
  return extras.achievementUnlocks.filter((u) => u.playerId === playerId && !u.provisional)
}

function maxUnlockBurst(unlocks: AchievementUnlock[], windowMs = 8 * 60 * 60 * 1000): number {
  if (!unlocks.length) return 0
  const times = unlocks
    .map((item) => new Date(item.unlockedAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
  if (!times.length) return 0

  let best = 1
  let left = 0
  for (let right = 0; right < times.length; right += 1) {
    while (left <= right && times[right] - times[left] > windowMs) left += 1
    best = Math.max(best, right - left + 1)
  }
  return best
}

function computeBacklogProgressStats(unlocks: AchievementUnlock[]) {
  const levelById = new Map<string, number>()
  for (const unlock of unlocks) {
    const prev = levelById.get(unlock.achievementId) ?? 0
    levelById.set(unlock.achievementId, Math.max(prev, unlock.level))
  }

  let totalWeight = 0
  let totalMax = 0
  const categoriesWithMax = new Set<string>()
  const maxCountByCategory: Record<string, number> = {}

  for (const definition of REMAINING_ACHIEVEMENT_DEFINITIONS) {
    if (definition.id === 'achievement_hunter') continue
    const maxLevel = definition.tiers[definition.tiers.length - 1]?.level ?? 0
    if (!maxLevel) continue
    const level = levelById.get(definition.id) ?? 0
    totalWeight += level
    totalMax += maxLevel
    if (level >= maxLevel) {
      categoriesWithMax.add(definition.category)
      maxCountByCategory[definition.category] = (maxCountByCategory[definition.category] ?? 0) + 1
    }
  }

  return {
    weightedProgressPct: totalMax ? Math.round((totalWeight / totalMax) * 100) : 0,
    categoryUnlocked: categoriesWithMax.size,
    skillMaxCount: maxCountByCategory.skill ?? 0,
    funMaxCount: maxCountByCategory.fun ?? 0,
    socialMaxCount: maxCountByCategory.social ?? 0,
    metaMaxCount: maxCountByCategory.meta ?? 0,
    sameSessionUnlocks: maxUnlockBurst(unlocks),
  }
}

export function evaluateRemainingBacklogMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  extras: BacklogExtras,
): Record<string, number> {
  const stats = buildBacklogStats(playerId, players, decks, matches, extras)
  const progress = computeBacklogProgressStats(filterBacklogUnlocks(playerId, extras))
  const statRecord = { ...stats, ...progress } as unknown as Record<string, number>
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
  out.secret_lucky_roll = stats.secretLuckyRollWins ?? 0
  out.secret_all_dash = stats.secretAllDashWins ?? 0
  out.secret_midnight_mirror = stats.secretMirrorHell ?? 0
  out.secret_achievement_hunter = stats.maxTierFamilies >= 5 ? 1 : 0
  out.one_session_five_unlock = progress.sameSessionUnlocks ?? 0

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
  out.group_anchor = stats.groupParticipation ?? 0

  if (extras.linkedPlayerId === playerId) {
    out.conflict_survivor = extras.settings.conflictsResolvedCount ?? 0
    out.multi_group_tourist = extras.settings.groupVisitCodes?.length ?? 0
  }

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
