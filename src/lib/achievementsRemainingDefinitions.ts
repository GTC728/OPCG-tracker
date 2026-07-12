import { REMAINING_ACHIEVEMENT_CATALOG } from '@/data/achievementBacklogRemainingCatalog.generated'
import { buildRemainingAchievementDefinitions } from '@/lib/achievementsBacklogHelpers'

/** Isolated from remainingEval to avoid circular imports with achievements.ts. */
export const REMAINING_ACHIEVEMENT_DEFINITIONS = buildRemainingAchievementDefinitions(
  REMAINING_ACHIEVEMENT_CATALOG,
)
