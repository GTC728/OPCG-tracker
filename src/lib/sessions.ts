import { createId, nowIso } from '@/lib/utils'
import type { AppState, Session } from '@/types'

export function getSessionDateLabel(date = new Date()): string {
  return date.toLocaleDateString('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function createSessionName(date = new Date()): string {
  return getSessionDateLabel(date)
}

export function createSession(name = createSessionName()): Session {
  const createdAt = nowIso()

  return {
    id: createId(),
    name,
    startedAt: createdAt,
    endedAt: null,
    archivedAt: null,
    deletedAt: null,
    createdAt,
  }
}

export function isSameLocalDate(leftIso: string, right = new Date()): boolean {
  const left = new Date(leftIso)

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function findOpenSessionForToday(sessions: Session[], date = new Date()): Session | null {
  return (
    sessions.find(
      (session) =>
        session.deletedAt === null &&
        session.archivedAt === null &&
        session.endedAt === null &&
        isSameLocalDate(session.startedAt, date),
    ) ?? null
  )
}

/** Move all matches/roster from source session into target; tombstone source. */
export function mergeSessionsState(
  state: AppState,
  sourceSessionId: string,
  targetSessionId: string,
): AppState {
  if (sourceSessionId === targetSessionId) {
    throw new Error('不能合併同一場次')
  }

  const source = state.sessions.find((session) => session.id === sourceSessionId)
  const target = state.sessions.find((session) => session.id === targetSessionId)
  if (!source || source.deletedAt !== null) {
    throw new Error('找不到要合併的場次')
  }
  if (!target || target.deletedAt !== null) {
    throw new Error('找不到目標場次')
  }

  const timestamp = nowIso()
  let nextMatchNumber = 0

  for (const match of state.matches) {
    if (match.sessionId === targetSessionId && match.deletedAt === null) {
      nextMatchNumber = Math.max(nextMatchNumber, match.matchNumber)
    }
  }
  for (const activeMatch of state.activeMatches) {
    if (activeMatch.sessionId === targetSessionId) {
      nextMatchNumber = Math.max(nextMatchNumber, activeMatch.matchNumber)
    }
  }

  const matchNumberById = new Map<string, number>()
  const sourceMatches = state.matches
    .filter((match) => match.sessionId === sourceSessionId && match.deletedAt === null)
    .sort((left, right) => new Date(left.finishedAt).getTime() - new Date(right.finishedAt).getTime())

  for (const match of sourceMatches) {
    nextMatchNumber += 1
    matchNumberById.set(match.id, nextMatchNumber)
  }

  for (const activeMatch of state.activeMatches.filter((match) => match.sessionId === sourceSessionId)) {
    nextMatchNumber += 1
    matchNumberById.set(activeMatch.id, nextMatchNumber)
  }

  const matches = state.matches.map((match) => {
    const nextNumber = matchNumberById.get(match.id)
    if (nextNumber === undefined) return match
    return {
      ...match,
      sessionId: targetSessionId,
      matchNumber: nextNumber,
      source: 'manual_edit' as const,
    }
  })

  const activeMatches = state.activeMatches.map((match) => {
    if (match.sessionId !== sourceSessionId) return match
    return {
      ...match,
      sessionId: targetSessionId,
      matchNumber: matchNumberById.get(match.id) ?? match.matchNumber,
    }
  })

  const targetPlayerIds = new Set(
    state.sessionPlayers.filter((row) => row.sessionId === targetSessionId).map((row) => row.playerId),
  )
  const sessionPlayers = [
    ...state.sessionPlayers.filter((row) => row.sessionId !== sourceSessionId && row.sessionId !== targetSessionId),
    ...state.sessionPlayers.filter((row) => row.sessionId === targetSessionId),
    ...state.sessionPlayers
      .filter((row) => row.sessionId === sourceSessionId && !targetPlayerIds.has(row.playerId))
      .map((row) => ({ ...row, sessionId: targetSessionId })),
  ]

  const targetDeckIds = new Set(
    state.sessionDecks.filter((row) => row.sessionId === targetSessionId).map((row) => row.deckVariantId),
  )
  const sessionDecks = [
    ...state.sessionDecks.filter((row) => row.sessionId !== sourceSessionId && row.sessionId !== targetSessionId),
    ...state.sessionDecks.filter((row) => row.sessionId === targetSessionId),
    ...state.sessionDecks
      .filter((row) => row.sessionId === sourceSessionId && !targetDeckIds.has(row.deckVariantId))
      .map((row) => ({ ...row, sessionId: targetSessionId })),
  ]

  const nextTableCounts = { ...state.settings.sessionTableCounts }
  const sourceTables = nextTableCounts[sourceSessionId]
  const targetTables = nextTableCounts[targetSessionId]
  delete nextTableCounts[sourceSessionId]
  if (sourceTables !== undefined || targetTables !== undefined) {
    const mergedTables = Math.max(sourceTables ?? 0, targetTables ?? 0)
    if (mergedTables > 0) {
      nextTableCounts[targetSessionId] = mergedTables
    }
  }

  const nextCurrentId =
    state.currentSessionId === sourceSessionId ? targetSessionId : state.currentSessionId

  return {
    ...state,
    currentSessionId: nextCurrentId,
    sessions: state.sessions.map((session) =>
      session.id === sourceSessionId
        ? { ...session, deletedAt: timestamp, endedAt: session.endedAt ?? timestamp }
        : session,
    ),
    matches,
    activeMatches,
    sessionPlayers,
    sessionDecks,
    settings: {
      ...state.settings,
      sessionTableCounts: nextTableCounts,
      rosterPromptSessionId:
        state.settings.rosterPromptSessionId === sourceSessionId
          ? null
          : state.settings.rosterPromptSessionId,
    },
  }
}
