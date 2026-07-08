import type { AchievementUnlock, AppState } from '@/types'

export function ensureProfileIdentityId(state: AppState): AppState {
  if (state.settings.profileIdentityId) return state
  return {
    ...state,
    settings: {
      ...state.settings,
      profileIdentityId: crypto.randomUUID(),
    },
  }
}

export function unlockProfileId(unlock: AchievementUnlock): string {
  return unlock.profileIdentityId ?? unlock.playerId
}

export function unlocksForProfile(
  unlocks: AchievementUnlock[],
  profileIdentityId: string | null,
): AchievementUnlock[] {
  if (!profileIdentityId) return []
  return unlocks.filter(
    (item) => unlockProfileId(item) === profileIdentityId && !item.provisional,
  )
}
