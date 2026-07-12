import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements'
import type { AchievementUnlock } from '@/types'

const ACHIEVEMENT_CATEGORIES = ['milestone', 'streak', 'skill', 'meta', 'social', 'fun'] as const

export interface UnlockProgressStats {
  weightedProgressPct: number
  categoryUnlocked: number
  skillMaxCount: number
  funMaxCount: number
  socialMaxCount: number
  metaMaxCount: number
  sameSessionUnlocks: number
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

export function computeUnlockProgressStats(unlocks: AchievementUnlock[]): UnlockProgressStats {
  const levelById = new Map<string, number>()
  for (const unlock of unlocks) {
    const prev = levelById.get(unlock.achievementId) ?? 0
    levelById.set(unlock.achievementId, Math.max(prev, unlock.level))
  }

  let totalWeight = 0
  let totalMax = 0
  const categoriesWithMax = new Set<string>()
  const maxCountByCategory: Record<string, number> = {}

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
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

export function countCategoriesRepresented(unlocks: AchievementUnlock[]): number {
  const categories = new Set<string>()
  const unlockedIds = new Set(unlocks.map((item) => item.achievementId))
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (!unlockedIds.has(definition.id)) continue
    categories.add(definition.category)
  }
  return categories.size
}

export { ACHIEVEMENT_CATEGORIES }
