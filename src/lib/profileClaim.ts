import { getDeviceId } from '@/lib/deviceId'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { nowIso } from '@/lib/utils'
import type { AppState, Player } from '@/types'

export type ProfileClaimErrorCode =
  | 'name_mismatch'
  | 'player_not_found'
  | 'player_not_selectable'
  | 'claimed_by_other'
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

export function claimPlayerRecord(player: Player, forceReclaim = false): Player {
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
    updatedAt: claimedAt,
  }
}

export function applyProfileClaim(
  state: AppState,
  playerId: string,
  options?: { forceReclaim?: boolean },
): AppState {
  const player = state.players.find((item) => item.id === playerId)
  if (!player || player.deletedAt) {
    throw new ProfileClaimError('player_not_found', '找不到玩家。')
  }
  if (!isSelectablePlayer(player)) {
    throw new ProfileClaimError('player_not_selectable', '此玩家無法連結。')
  }

  const claimed = claimPlayerRecord(player, options?.forceReclaim)
  const profileIdentityId = state.settings.profileIdentityId ?? crypto.randomUUID()
  return {
    ...state,
    players: state.players.map((item) => (item.id === playerId ? claimed : item)),
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
            updatedAt: nowIso(),
          }
        : player,
    ),
    settings: {
      ...state.settings,
      linkedPlayerId: state.settings.linkedPlayerId === playerId ? null : state.settings.linkedPlayerId,
      profileSetupCompleted: state.settings.linkedPlayerId === playerId ? false : state.settings.profileSetupCompleted,
    },
  }
}

export function unlinkProfile(state: AppState): AppState {
  const linkedId = state.settings.linkedPlayerId
  if (!linkedId) {
    return {
      ...state,
      settings: { ...state.settings, linkedPlayerId: null, profileSetupCompleted: false },
    }
  }
  return releaseProfileClaim(state, linkedId)
}
