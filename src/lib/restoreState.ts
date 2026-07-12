import { finalizeProfileLink } from '@/lib/profileGroupLink'
import { scheduleAchievementLedgerSync } from '@/lib/achievementLedgerSync'
import { rebuildLifetimeFromMatches } from '@/lib/profileLifetime'
import { reconcileAchievementUnlocks } from '@/lib/achievements'
import type { AppState, Match } from '@/types'

/** After full cloud / Excel restore — eligible sources for achievement backfill. */
export function prepareRestoredAppState(state: AppState): AppState {
  const matches: Match[] = state.matches.map((match) =>
    match.deletedAt !== null || match.source === 'import'
      ? match
      : { ...match, source: 'restore' },
  )
  let next: AppState = { ...state, matches }
  const linkedId = next.settings.linkedPlayerId
  const profileId = next.settings.profileIdentityId
  if (profileId && linkedId && !next.settings.lastGroupCode?.match(/^test/i)) {
    next = {
      ...next,
      profileLifetime: rebuildLifetimeFromMatches(profileId, linkedId, next.players, matches),
    }
    const reconciled = reconcileAchievementUnlocks(next, linkedId)
    next = reconciled.state
  } else if (linkedId) {
    next = finalizeProfileLink(next)
  }
  scheduleAchievementLedgerSync()
  return next
}
