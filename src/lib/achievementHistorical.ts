import type { AchievementDefinition } from '@/lib/achievements'

/** Historical pre-app imports count toward all achievement families. */
export function achievementAllowsHistorical(_def: AchievementDefinition): boolean {
  return true
}

export function mergeTieredAchievementMetrics(
  definitions: AchievementDefinition[],
  cumulativeMetrics: Record<string, number>,
  skillMetrics: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const def of definitions) {
    merged[def.id] = Math.max(
      cumulativeMetrics[def.id] ?? 0,
      skillMetrics[def.id] ?? 0,
    )
  }
  return merged
}
