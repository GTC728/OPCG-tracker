import type { AppState, Match, Player, Session } from '@/types'

export function isDeletedMatch(match: Match): boolean {
  return match.deletedAt !== null
}

/** Match still shown in history, stats, and visible match counts. */
export function isVisibleMatch(match: Match): boolean {
  return !isDeletedMatch(match)
}

export function countVisibleMatchesForPlayer(
  state: Pick<AppState, 'matches' | 'activeMatches'>,
  playerId: string,
  options?: { sessionId?: string },
): number {
  let count = 0

  for (const match of state.matches) {
    if (!isVisibleMatch(match)) continue
    if (options?.sessionId && match.sessionId !== options.sessionId) continue
    if (match.player1Id === playerId || match.player2Id === playerId) count += 1
  }

  for (const match of state.activeMatches) {
    if (options?.sessionId && match.sessionId !== options.sessionId) continue
    if (match.player1Id === playerId || match.player2Id === playerId) count += 1
  }

  return count
}

export function hasVisibleMatchesForPlayer(
  state: Pick<AppState, 'matches' | 'activeMatches'>,
  playerId: string,
  options?: { sessionId?: string },
): boolean {
  return countVisibleMatchesForPlayer(state, playerId, options) > 0
}

export function isDeletedSession(session: Session): boolean {
  return session.deletedAt !== null
}

export function isArchivedSession(session: Session): boolean {
  return session.archivedAt !== null
}

/** Shown in main session switcher (not archived, not deleted). */
export function isActiveSessionListing(session: Session): boolean {
  return !isDeletedSession(session) && !isArchivedSession(session)
}

export function isDeletedPlayer(player: Player): boolean {
  return player.deletedAt !== null
}

/** Can assign to tables / roster pickers (not deleted or archived). */
export function isSelectablePlayer(player: Player): boolean {
  return !player.archived && !isDeletedPlayer(player)
}

/** Explicit session roster was saved. */
export function hasExplicitSessionRoster(state: Pick<AppState, 'sessionPlayers'>, sessionId: string): boolean {
  return state.sessionPlayers.some((row) => row.sessionId === sessionId)
}

/**
 * Player appears in assignment / filter lists.
 * - Tombstoned players never listed.
 * - With explicit roster: roster members only (may have 0 visible matches for first game).
 * - Without roster: must have ≥1 visible (non-deleted) match in that session.
 * - Without sessionId: must have ≥1 visible match globally.
 */
export function isListedPlayer(
  state: Pick<AppState, 'players' | 'matches' | 'activeMatches' | 'sessionPlayers'>,
  player: Player,
  sessionId?: string,
): boolean {
  if (!isSelectablePlayer(player)) return false

  if (sessionId && hasExplicitSessionRoster(state, sessionId)) {
    return state.sessionPlayers.some((row) => row.sessionId === sessionId && row.playerId === player.id)
  }

  if (sessionId) {
    return hasVisibleMatchesForPlayer(state, player.id, { sessionId })
  }

  return hasVisibleMatchesForPlayer(state, player.id)
}

export function getListedPlayers(
  state: Pick<AppState, 'players' | 'matches' | 'activeMatches' | 'sessionPlayers'>,
  sessionId?: string,
): Player[] {
  return state.players.filter((player) => isListedPlayer(state, player, sessionId))
}

export function countListedPlayers(state: AppState): number {
  return getListedPlayers(state).length
}

export function countVisibleMatches(state: Pick<AppState, 'matches'>): number {
  return state.matches.filter(isVisibleMatch).length
}

export function countVisibleActiveMatches(
  state: Pick<AppState, 'activeMatches'>,
  sessionId?: string,
): number {
  return state.activeMatches.filter((match) => !sessionId || match.sessionId === sessionId).length
}

export function countSessionMatches(
  sessionId: string,
  matches: Match[],
  activeMatches: { sessionId: string; id: string }[],
): number {
  return (
    matches.filter((match) => match.sessionId === sessionId && !isDeletedMatch(match)).length +
    activeMatches.filter((match) => match.sessionId === sessionId).length
  )
}

export function visibleSessions(sessions: Session[]): Session[] {
  return sessions.filter((session) => !isDeletedSession(session))
}

export function activeListedSessions(sessions: Session[]): Session[] {
  return sessions.filter(isActiveSessionListing)
}

export function archivedSessions(sessions: Session[]): Session[] {
  return sessions.filter((session) => isArchivedSession(session) && !isDeletedSession(session))
}
