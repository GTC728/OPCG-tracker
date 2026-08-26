import { getDeviceId } from '@/lib/deviceId'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { nowIso } from '@/lib/utils'
import type { AppState, Player } from '@/types'

export type ProfileClaimErrorCode =
  | 'name_mismatch'
  | 'player_not_found'
  | 'player_not_selectable'
  | 'claimed_by_other'
  | 'claimed_by_other_user'
  | 'duplicate_name'

export class ProfileClaimError extends Error {
  code: ProfileClaimErrorCode

  constructor(code: ProfileClaimErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isPlayerClaimedByOtherDevice(player: Player): boolean {
  if (!player.profileClaimDeviceId) return false
  return player.profileClaimDeviceId !== getDeviceId()
}

export function isPlayerLinkedToOtherUser(player: Player, cloudUserId?: string | null): boolean {
  if (!player.linkedUserId) return false
  if (!cloudUserId) return true
  return player.linkedUserId !== cloudUserId
}

export function uniqueRosterName(players: Player[], base: string): string {
  const trimmed = base.trim() || 'Member'
  const taken = new Set(
    players.filter((player) => !player.deletedAt).map((player) => player.name.trim().toLowerCase()),
  )
  if (!taken.has(trimmed.toLowerCase())) return trimmed
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${trimmed} ${index}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  return `${trimmed} ${crypto.randomUUID().slice(0, 4)}`
}

export function getLinkedPlayer(state: AppState): Player | null {
  const linkedId = state.settings.linkedPlayerId
  if (!linkedId) return null
  const player = state.players.find((item) => item.id === linkedId) ?? null
  if (!player || player.deletedAt || !isSelectablePlayer(player)) return null
  return player
}

export function validateProfileLink(state: AppState): string | null {
  const linked = getLinkedPlayer(state)
  if (!linked) {
    if (state.settings.linkedPlayerId) return 'linked_player_missing'
    return null
  }
  if (isPlayerClaimedByOtherDevice(linked)) return 'linked_player_claimed_elsewhere'
  if (linked.profileClaimDeviceId && linked.profileClaimDeviceId !== getDeviceId()) {
    return 'linked_player_claim_mismatch'
  }
  return null
}

export function assertNameConfirmation(player: Player, nameConfirmation: string): void {
  if (normalizeName(nameConfirmation) !== normalizeName(player.name)) {
    throw new ProfileClaimError('name_mismatch', '名稱確認不符，請輸入完整玩家名稱。')
  }
}

export function claimPlayerRecord(
  player: Player,
  forceReclaim = false,
  linkedUserId?: string | null,
): Player {
  if (isPlayerLinkedToOtherUser(player, linkedUserId ?? null)) {
    throw new ProfileClaimError(
      'claimed_by_other_user',
      '此玩家已連結其他帳號。請選未連結的名字，或請管理員解除連結。',
    )
  }
  if (isPlayerClaimedByOtherDevice(player) && !forceReclaim) {
    throw new ProfileClaimError(
      'claimed_by_other',
      '此玩家已在另一裝置連結。若這是你本人，請再次輸入完整名稱以確認身分。',
    )
  }

  const deviceId = getDeviceId()
  const claimedAt = nowIso()
  return {
    ...player,
    profileClaimDeviceId: deviceId,
    profileClaimedAt: claimedAt,
    linkedUserId: linkedUserId !== undefined ? linkedUserId : player.linkedUserId,
    updatedAt: claimedAt,
  }
}

export function applyProfileClaim(
  state: AppState,
  playerId: string,
  options?: { forceReclaim?: boolean; linkedUserId?: string | null },
): AppState {
  const player = state.players.find((item) => item.id === playerId)
  if (!player || player.deletedAt) {
    throw new ProfileClaimError('player_not_found', '找不到玩家。')
  }
  if (!isSelectablePlayer(player)) {
    throw new ProfileClaimError('player_not_selectable', '此玩家無法連結。')
  }

  const linkedUserId = options?.linkedUserId ?? state.settings.cloudUserId ?? null
  const claimed = claimPlayerRecord(player, options?.forceReclaim, linkedUserId)
  const profileIdentityId = state.settings.profileIdentityId ?? crypto.randomUUID()
  const claimedAt = claimed.updatedAt
  return {
    ...state,
    players: state.players.map((item) => {
      if (item.id === playerId) return claimed
      if (linkedUserId && item.linkedUserId === linkedUserId) {
        return {
          ...item,
          linkedUserId: null,
          profileClaimDeviceId: null,
          profileClaimedAt: null,
          updatedAt: claimedAt,
        }
      }
      return item
    }),
    settings: {
      ...state.settings,
      linkedPlayerId: playerId,
      profileSetupCompleted: true,
      profileIdentityId,
    },
  }
}

export function releaseProfileClaim(state: AppState, playerId: string): AppState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            profileClaimDeviceId: null,
            profileClaimedAt: null,
            linkedUserId: null,
            updatedAt: nowIso(),
          }
        : player,
    ),
    settings: {
      ...state.settings,
      linkedPlayerId: state.settings.linkedPlayerId === playerId ? null : state.settings.linkedPlayerId,
      profileSetupCompleted:
        state.settings.linkedPlayerId === playerId
          ? Boolean(state.settings.profileIdentityId)
          : state.settings.profileSetupCompleted,
    },
  }
}

export function bindRosterPlayerToUser(state: AppState, playerId: string, userId: string): AppState {
  const timestamp = nowIso()
  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === playerId) {
        return { ...player, linkedUserId: userId, updatedAt: timestamp }
      }
      if (player.linkedUserId === userId) {
        return {
          ...player,
          linkedUserId: null,
          profileClaimDeviceId: null,
          profileClaimedAt: null,
          updatedAt: timestamp,
        }
      }
      return player
    }),
  }
}

export function clearRosterLinksForUser(state: AppState, userId: string): AppState {
  const timestamp = nowIso()
  const linkedId = state.settings.linkedPlayerId
  const linkedPlayer = linkedId ? state.players.find((player) => player.id === linkedId) : null
  const clearsCurrent = Boolean(linkedPlayer?.linkedUserId === userId)
  return {
    ...state,
    players: state.players.map((player) =>
      player.linkedUserId === userId
        ? {
            ...player,
            linkedUserId: null,
            profileClaimDeviceId: null,
            profileClaimedAt: null,
            updatedAt: timestamp,
          }
        : player,
    ),
    settings: {
      ...state.settings,
      linkedPlayerId: clearsCurrent ? null : state.settings.linkedPlayerId,
    },
  }
}

export function unlinkProfile(state: AppState): AppState {
  const linkedId = state.settings.linkedPlayerId
  if (!linkedId) {
    return {
      ...state,
      settings: {
        ...state.settings,
        linkedPlayerId: null,
        profileSetupCompleted: Boolean(state.settings.profileIdentityId),
      },
    }
  }
  return releaseProfileClaim(state, linkedId)
}
