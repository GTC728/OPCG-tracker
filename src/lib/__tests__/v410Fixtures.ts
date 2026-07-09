import { createDefaultAppState } from '@/lib/constants'
import { isTestGroupCode } from '@/lib/groupTest'
import {
  rebuildLifetimeFromMatches,
  removeCompletedMatchFromLifetime,
} from '@/lib/profileLifetime'
import { ensureProfileIdentityId, unlocksForProfile } from '@/lib/profileIdentity'
import { reconcileAchievementUnlocks } from '@/lib/achievements'
import {
  captureGroupScopedSnapshot,
  stripGroupScopedEntities,
} from '@/lib/groupScope'
import { bookmarkCurrentGroupProfile } from '@/lib/profileGroupLink'
import {
  mergePersonalAndGroup,
  splitAppState,
  stripProvisionalUnlocks,
} from '@/lib/appStateLayers'
import type { AppState, Match, Player } from '@/types'

export const PROFILE_ID = '11111111-1111-4111-8111-111111111111'
export const PLAYER_A = 'player-a'
export const PLAYER_B = 'player-b'
export const SESSION_ID = 'session-1'

export function makePlayer(id: string, name: string): Player {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id,
    name,
    aliases: [],
    archived: false,
    deletedAt: null,
    profileClaimDeviceId: null,
    profileClaimedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function makeMatch(
  id: string,
  winnerId: string,
  loserId: string,
  index: number,
  deckId?: string,
): Match {
  const deck = deckId ?? 'deck-op01-001'
  const stamp = `2026-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`
  return {
    id,
    sessionId: SESSION_ID,
    matchNumber: index + 1,
    player1Id: winnerId,
    deck1Id: deck,
    player2Id: loserId,
    deck2Id: 'deck-op01-002',
    winnerPlayerId: winnerId,
    winnerDeckId: deck,
    firstPlayerId: winnerId,
    resultType: 'normal',
    startedAt: stamp,
    finishedAt: stamp,
    source: 'manual',
    deletedAt: null,
    notes: null,
  }
}

export function makeWinStreak(
  count: number,
  winnerId: string,
  loserId: string,
  deckId?: string,
): Match[] {
  return Array.from({ length: count }, (_, index) =>
    makeMatch(`match-${index}`, winnerId, loserId, index, deckId),
  )
}

export function baseLinkedState(overrides?: Partial<AppState['settings']>): AppState {
  const base = createDefaultAppState()
  return {
    ...base,
    players: [makePlayer(PLAYER_A, 'King仔'), makePlayer(PLAYER_B, '對手')],
    sessions: [
      {
        id: SESSION_ID,
        name: '測試場',
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        archivedAt: null,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    settings: {
      ...base.settings,
      linkedPlayerId: PLAYER_A,
      profileIdentityId: PROFILE_ID,
      profileSetupCompleted: true,
      lastGroupCode: 'PROD2026',
      ...overrides,
    },
  }
}

/** Mirrors appStore leaveGroupCollab stripping (without network). */
export function simulateLeaveGroup(state: AppState): AppState {
  const groupCode = state.settings.lastGroupCode
  let stripped = stripGroupScopedEntities(bookmarkCurrentGroupProfile(state))
  if (isTestGroupCode(groupCode)) {
    stripped = stripProvisionalUnlocks(stripped)
  }
  return {
    ...stripped,
    settings: {
      ...stripped.settings,
      lastGroupCode: null,
      groupCollabEnabled: false,
      groupCollabBootstrapped: false,
      groupDataBoundCode: null,
    },
  }
}

export function completeMatchesInState(
  state: AppState,
  matches: Match[],
  options?: { provisional?: boolean },
): AppState {
  let next = ensureProfileIdentityId({
    ...state,
    matches: [...state.matches, ...matches],
  })
  const linkedId = next.settings.linkedPlayerId
  const profileId = next.settings.profileIdentityId ?? PROFILE_ID

  if (linkedId && !isTestGroupCode(next.settings.lastGroupCode)) {
    next = {
      ...next,
      profileLifetime: rebuildLifetimeFromMatches(
        profileId,
        linkedId,
        next.players,
        next.matches,
      ),
    }
  }

  const provisional =
    options?.provisional ?? isTestGroupCode(next.settings.lastGroupCode)
  if (linkedId) {
    const result = reconcileAchievementUnlocks(next, linkedId, { provisional })
    next = result.state
  }
  return next
}

export function deleteMatchFromState(state: AppState, matchId: string): AppState {
  const match = state.matches.find((item) => item.id === matchId)
  if (!match) return state

  const remaining = state.matches.map((item) =>
    item.id === matchId ? { ...item, deletedAt: '2026-07-09T00:00:00.000Z' } : item,
  )
  let next: AppState = { ...state, matches: remaining }
  const linkedId = next.settings.linkedPlayerId
  if (linkedId && next.profileLifetime && !isTestGroupCode(next.settings.lastGroupCode)) {
    next = {
      ...next,
      profileLifetime: removeCompletedMatchFromLifetime(
        next.profileLifetime!,
        match,
        linkedId,
        next.players,
        remaining.filter((item) => item.deletedAt === null),
      ),
    }
  }
  if (linkedId) {
    next = reconcileAchievementUnlocks(next, linkedId).state
  }
  return next
}

export function veteranLevel(state: AppState, profileId?: string | null): number {
  const id = profileId ?? state.settings.profileIdentityId ?? PROFILE_ID
  const unlock = unlocksForProfile(state.achievementUnlocks, id).find(
    (item) => item.achievementId === 'veteran',
  )
  return unlock?.level ?? 0
}

export function rawVeteranUnlock(state: AppState) {
  return state.achievementUnlocks.find((item) => item.achievementId === 'veteran')
}

export function saveGroupToIndexedDbLayer(state: AppState, groupCode: string) {
  const { group } = splitAppState(state)
  return { groupKey: groupCode.trim().toLowerCase(), snapshot: captureGroupScopedSnapshot(state), group }
}

export function reloadGroupFromLayer(personal: ReturnType<typeof splitAppState>['personal'], groupSnapshot: ReturnType<typeof captureGroupScopedSnapshot>): AppState {
  return mergePersonalAndGroup(personal, groupSnapshot)
}
