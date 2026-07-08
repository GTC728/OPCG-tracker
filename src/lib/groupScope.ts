import type { AppState } from '@/types'

/** Synced collab entities — cleared on leave / rebound on join. */
export type GroupScopedSnapshot = Pick<
  AppState,
  | 'currentSessionId'
  | 'players'
  | 'playerAliases'
  | 'sessionPlayers'
  | 'sessionDecks'
  | 'sessions'
  | 'activeMatches'
  | 'matches'
  | 'matchRevisions'
  | 'importBatches'
  | 'importRows'
  | 'importRecords'
>

export function captureGroupScopedSnapshot(state: AppState): GroupScopedSnapshot {
  return {
    currentSessionId: state.currentSessionId,
    players: state.players,
    playerAliases: state.playerAliases,
    sessionPlayers: state.sessionPlayers,
    sessionDecks: state.sessionDecks,
    sessions: state.sessions,
    activeMatches: state.activeMatches,
    matches: state.matches,
    matchRevisions: state.matchRevisions,
    importBatches: state.importBatches,
    importRows: state.importRows,
    importRecords: state.importRecords,
  }
}

export function applyGroupScopedSnapshot(state: AppState, snapshot: GroupScopedSnapshot): AppState {
  return {
    ...state,
    ...snapshot,
  }
}

export function hasGroupScopedData(state: AppState): boolean {
  return (
    state.activeMatches.length > 0 ||
    state.matches.some((match) => match.deletedAt === null) ||
    state.sessions.some((session) => session.deletedAt === null) ||
    state.players.some((player) => player.deletedAt === null)
  )
}

/** Remove group-bound entities; keep personal catalog, achievements, UI prefs. */
export function stripGroupScopedEntities(state: AppState): AppState {
  return {
    ...state,
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
    settings: {
      ...state.settings,
      linkedPlayerId: null,
      rosterPromptSessionId: null,
      sessionTableCounts: {},
      sessionDayPromptDismissedFor: null,
      groupCollabBootstrapped: false,
      lastGroupSyncAt: null,
      lastGroupSyncError: null,
      groupSyncPaused: false,
      groupSyncPausedAt: null,
    },
  }
}
