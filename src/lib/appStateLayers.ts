import type { AppState, ProfileLifetimeStats } from '@/types'
import {
  applyGroupScopedSnapshot,
  captureGroupScopedSnapshot,
  stripGroupScopedEntities,
  type GroupScopedSnapshot,
} from '@/lib/groupScope'

export const PERSONAL_STORAGE_KEY = 'opcg-personal-v1'
export const OFFLINE_GROUP_KEY = 'offline'
export const LEGACY_STORAGE_KEY = 'opcg-tracker-state'

export function groupStorageKey(groupCode: string): string {
  return groupCode.trim().toLowerCase()
}

/** Personal layer — survives group switches; never contains group entity rows. */
export type PersonalAppState = Pick<
  AppState,
  | 'schemaVersion'
  | 'appVersion'
  | 'leaders'
  | 'deckVariants'
  | 'decks'
  | 'achievementUnlocks'
  | 'auditLog'
  | 'settings'
> & {
  profileLifetime: ProfileLifetimeStats | null
}

export function extractPersonalState(state: AppState): PersonalAppState {
  return {
    schemaVersion: state.schemaVersion,
    appVersion: state.appVersion,
    leaders: state.leaders,
    deckVariants: state.deckVariants,
    decks: state.decks,
    achievementUnlocks: state.achievementUnlocks,
    auditLog: state.auditLog,
    profileLifetime: state.profileLifetime,
    settings: { ...state.settings },
  }
}

export function mergePersonalAndGroup(
  personal: PersonalAppState,
  group: GroupScopedSnapshot,
): AppState {
  const shell: AppState = {
    ...personal,
    currentSessionId: null,
    players: [],
    playerAliases: [],
    sessionPlayers: [],
    sessionDecks: [],
    sessions: [],
    activeMatches: [],
    matches: [],
    matchRevisions: [],
    importBatches: [],
    importRows: [],
    importRecords: [],
    syncConflicts: [],
  }
  return applyGroupScopedSnapshot(shell, group)
}

export function splitAppState(state: AppState): {
  personal: PersonalAppState
  group: GroupScopedSnapshot
} {
  return {
    personal: extractPersonalState(state),
    group: captureGroupScopedSnapshot(state),
  }
}

export function emptyGroupSnapshot(): GroupScopedSnapshot {
  const base = stripGroupScopedEntities({
    schemaVersion: 12,
    appVersion: '4.10.0',
    currentSessionId: null,
    players: [],
    playerAliases: [],
    leaders: [],
    deckVariants: [],
    sessionPlayers: [],
    sessionDecks: [],
    decks: [],
    sessions: [],
    activeMatches: [],
    matches: [],
    matchRevisions: [],
    importBatches: [],
    importRows: [],
    importRecords: [],
    achievementUnlocks: [],
    auditLog: [],
    profileLifetime: null,
    syncConflicts: [],
    settings: {} as AppState['settings'],
  })
  return captureGroupScopedSnapshot(base)
}

export function stripProvisionalUnlocks(state: AppState): AppState {
  return {
    ...state,
    achievementUnlocks: state.achievementUnlocks.filter((item) => !item.provisional),
  }
}
