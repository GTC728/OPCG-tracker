import type { Match, Player, Session } from '@/types'

export function isDeletedMatch(match: Match): boolean {
  return match.deletedAt !== null
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

/** Can assign to tables / roster. */
export function isSelectablePlayer(player: Player): boolean {
  return !player.archived && !isDeletedPlayer(player)
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
