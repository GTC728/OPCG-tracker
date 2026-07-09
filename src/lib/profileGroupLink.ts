import { groupStorageKey } from '@/lib/appStateLayers'
import { isTestGroupCode } from '@/lib/groupTest'
import { reconcileAchievementUnlocks } from '@/lib/achievements'
import { ensureProfileIdentityId } from '@/lib/profileIdentity'
import { applyProfileClaim, isPlayerClaimedByOtherDevice } from '@/lib/profileClaim'
import { rebuildLifetimeFromMatches } from '@/lib/profileLifetime'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import type { AppState, GroupProfileBookmark, Player } from '@/types'

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

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
      profileDisplayName: playerName.trim(),
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

  const displayName = state.settings.profileDisplayName?.trim()
  if (!displayName) return null
  const norm = normalizeName(displayName)
  const byName = state.players.find(
    (player) =>
      player.deletedAt === null &&
      isSelectablePlayer(player) &&
      normalizeName(player.name) === norm,
  )
  if (byName && !isPlayerClaimedByOtherDevice(byName)) return byName
  return null
}

/** After group data loads, restore linkedPlayerId for an existing personal profile. */
export function tryAutoRelinkGroupProfile(state: AppState): AppState {
  if (state.settings.linkedPlayerId) return state
  if (!state.settings.profileIdentityId || !state.settings.profileSetupCompleted) return state
  const groupCode = state.settings.lastGroupCode
  if (!groupCode) return state

  const bookmark = state.settings.groupProfileLinks?.[groupStorageKey(groupCode)]
  if (!bookmark) {
    const displayName = state.settings.profileDisplayName?.trim()
    if (!displayName) return state
    const norm = normalizeName(displayName)
    const byName = state.players.find(
      (player) =>
        player.deletedAt === null &&
        isSelectablePlayer(player) &&
        normalizeName(player.name) === norm,
    )
    if (!byName || isPlayerClaimedByOtherDevice(byName)) return state
    return finalizeProfileLink(applyProfileClaim(state, byName.id))
  }

  const player = findPlayerForBookmark(state, bookmark)
  if (!player) return state
  return finalizeProfileLink(applyProfileClaim(state, player.id))
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

  return reconcileAchievementUnlocks(next, linkedId, {
    provisional: isTestGroupCode(next.settings.lastGroupCode),
  }).state
}

export function finalizeGroupProfileSession(state: AppState): AppState {
  return tryAutoRelinkGroupProfile(state)
}

export function bookmarkCurrentGroupProfile(state: AppState): AppState {
  const linkedId = state.settings.linkedPlayerId
  if (!linkedId || !state.settings.lastGroupCode) return state
  const player = state.players.find((item) => item.id === linkedId)
  if (!player) return state
  return saveGroupProfileBookmark(state, linkedId, player.name)
}
