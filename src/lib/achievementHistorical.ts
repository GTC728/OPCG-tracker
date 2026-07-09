import type { AchievementDefinition } from '@/lib/achievements'

/** Grind / cumulative achievements accept historical pre-app imports; skill/time do not. */
export function achievementAllowsHistorical(def: AchievementDefinition): boolean {
  if (def.kind !== 'grind') return false
  if (def.category === 'streak') return false
  if (def.category === 'fun') return false
  return true
}

export function mergeTieredAchievementMetrics(
  definitions: AchievementDefinition[],
  cumulativeMetrics: Record<string, number>,
  skillMetrics: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...skillMetrics }
  for (const def of definitions) {
    if (achievementAllowsHistorical(def)) {
      merged[def.id] = cumulativeMetrics[def.id] ?? skillMetrics[def.id] ?? 0
    }
  }
  return merged
}
