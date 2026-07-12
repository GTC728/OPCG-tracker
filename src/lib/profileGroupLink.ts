import { groupStorageKey } from '@/lib/appStateLayers'
import { isTestGroupCode } from '@/lib/groupTest'
import { reconcileAchievementUnlocks } from '@/lib/achievements'
import { invalidateDerivedCache } from '@/lib/derivedData'
import { scheduleAchievementLedgerSync } from '@/lib/achievementLedgerSync'
import { ensureProfileIdentityId } from '@/lib/profileIdentity'
import { applyProfileClaim, isPlayerClaimedByOtherDevice } from '@/lib/profileClaim'
import { rebuildLifetimeFromMatches } from '@/lib/profileLifetime'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import type { AppState, GroupProfileBookmark, Player } from '@/types'

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Save group roster bookmark only — does not change personal profileDisplayName. */
export function saveGroupProfileBookmark(
  state: AppState,
  playerId: string,
  playerName: string,
): AppState {
  const groupCode = state.settings.lastGroupCode
  if (!groupCode) return state
  const groupKey = groupStorageKey(groupCode)
  const links = { ...(state.settings.groupProfileLinks ?? {}) }
  links[groupKey] = {
    playerId,
    playerName: playerName.trim(),
    linkedAt: new Date().toISOString(),
  }
  return {
    ...state,
    settings: {
      ...state.settings,
      groupProfileLinks: links,
    },
  }
}

function findPlayerForBookmark(state: AppState, bookmark: GroupProfileBookmark): Player | null {
  const byId = state.players.find(
    (player) =>
      player.id === bookmark.playerId &&
      player.deletedAt === null &&
      isSelectablePlayer(player),
  )
  if (byId && !isPlayerClaimedByOtherDevice(byId)) return byId

  const norm = normalizeName(bookmark.playerName)
  const byName = state.players.find(
    (player) =>
      player.deletedAt === null &&
      isSelectablePlayer(player) &&
      normalizeName(player.name) === norm,
  )
  if (byName && !isPlayerClaimedByOtherDevice(byName)) return byName
  return null
}

function findPlayerForCloudClaim(state: AppState): Player | null {
  const userId = state.settings.cloudUserId
  if (!userId) return null
  return (
    state.players.find(
      (player) =>
        player.deletedAt === null &&
        isSelectablePlayer(player) &&
        player.linkedUserId === userId &&
        !isPlayerClaimedByOtherDevice(player),
    ) ?? null
  )
}

/** After group data loads, restore linkedPlayerId for an existing personal profile. */
export function tryAutoRelinkGroupProfile(state: AppState): AppState {
  if (state.settings.linkedPlayerId) return state
  if (!state.settings.profileIdentityId || !state.settings.profileSetupCompleted) return state
  if (!state.settings.lastGroupCode) return state

  const bookmark = state.settings.groupProfileLinks?.[groupStorageKey(state.settings.lastGroupCode)]
  if (bookmark) {
    const player = findPlayerForBookmark(state, bookmark)
    if (player) return finalizeProfileLink(applyProfileClaim(state, player.id))
  }

  const cloudPlayer = findPlayerForCloudClaim(state)
  if (cloudPlayer) return finalizeProfileLink(applyProfileClaim(state, cloudPlayer.id))

  return state
}

/** Rebuild lifetime (non-TEST), reconcile unlocks, persist group bookmark. */
export function finalizeProfileLink(state: AppState): AppState {
  let next = ensureProfileIdentityId(state)
  const linkedId = next.settings.linkedPlayerId
  if (!linkedId) return next

  const player = next.players.find((item) => item.id === linkedId)
  if (player) {
    next = saveGroupProfileBookmark(next, linkedId, player.name)
  }

  const profileId = next.settings.profileIdentityId
  if (profileId && !isTestGroupCode(next.settings.lastGroupCode)) {
    const rebuilt = rebuildLifetimeFromMatches(
      profileId,
      linkedId,
      next.players,
      next.matches,
    )
    const existing =
      next.profileLifetime?.profileIdentityId === profileId ? next.profileLifetime : null
    next = {
      ...next,
      profileLifetime:
        existing && existing.totalMatches >= rebuilt.totalMatches ? existing : rebuilt,
    }
  }

  const result = reconcileAchievementUnlocks(next, linkedId, {
    provisional: isTestGroupCode(next.settings.lastGroupCode),
  })
  scheduleAchievementLedgerSync()
  return result.state
}

export function finalizeGroupProfileSession(state: AppState): AppState {
  invalidateDerivedCache()
  return finalizeProfileLink(tryAutoRelinkGroupProfile(state))
}

export function bookmarkCurrentGroupProfile(state: AppState): AppState {
  const linkedId = state.settings.linkedPlayerId
  if (!linkedId || !state.settings.lastGroupCode) return state
  const player = state.players.find((item) => item.id === linkedId)
  if (!player) return state
  return saveGroupProfileBookmark(state, linkedId, player.name)
}

export function getGroupProfileBookmark(state: AppState): GroupProfileBookmark | null {
  const groupCode = state.settings.lastGroupCode
  if (!groupCode) return null
  return state.settings.groupProfileLinks?.[groupStorageKey(groupCode)] ?? null
}
