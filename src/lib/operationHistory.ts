import type { ActiveMatch, AuditEntry, AuditKind, Match, MatchRevision } from '@/types'

export interface OperationHistoryInput {
  auditLog: AuditEntry[]
  matchRevisions: MatchRevision[]
  matches: Match[]
  activeMatches: ActiveMatch[]
}

export interface OperationHistoryItem {
  id: string
  at: string
  kind: AuditKind
  message: string
  actorLabel: string
  entityId: string | null
  revision: MatchRevision | null
  canUndo: boolean
  match: Match | null
}

function revisionForEntry(
  entry: AuditEntry,
  revisions: MatchRevision[],
): MatchRevision | null {
  if (entry.kind !== 'match_edit') return null
  const entityId = entry.entityId
  if (!entityId) return null
  return revisions.find((item) => item.matchId === entityId) ?? null
}

function resolveMatchForEntry(input: OperationHistoryInput, entry: AuditEntry): Match | null {
  if (entry.entityId) {
    const match = input.matches.find((item) => item.id === entry.entityId)
    if (match && match.deletedAt === null) return match
  }
  const numberMatch = entry.message.match(/#(\d+)/)
  if (!numberMatch) return null
  const matchNumber = Number(numberMatch[1])
  if (!Number.isFinite(matchNumber)) return null
  return (
    input.matches.find(
      (item) => item.matchNumber === matchNumber && item.deletedAt === null,
    ) ?? null
  )
}

export function canUndoAuditEntry(input: OperationHistoryInput, entry: AuditEntry): boolean {
  if (entry.kind !== 'match_complete') return false
  const match = resolveMatchForEntry(input, entry)
  if (!match) return false
  return input.activeMatches.every((item) => item.id !== match.id)
}

export function buildOperationHistory(input: OperationHistoryInput, limit = 40): OperationHistoryItem[] {
  return (input.auditLog ?? []).slice(0, limit).map((entry) => {
    const match = resolveMatchForEntry(input, entry)
    const revision = revisionForEntry(entry, input.matchRevisions ?? [])
    return {
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      message: entry.message,
      actorLabel: entry.actor?.label ?? '',
      entityId: entry.entityId ?? match?.id ?? null,
      revision,
      canUndo: canUndoAuditEntry(input, entry),
      match,
    }
  })
}

export function summarizeRevisionDiff(revision: MatchRevision): string[] {
  const lines: string[] = []
  const { before, after } = revision
  if (before.winnerPlayerId !== after.winnerPlayerId) {
    lines.push('Winner changed')
  }
  if (before.player1Id !== after.player1Id || before.player2Id !== after.player2Id) {
    lines.push('Players changed')
  }
  if (before.deck1Id !== after.deck1Id || before.deck2Id !== after.deck2Id) {
    lines.push('Decks changed')
  }
  if (before.firstPlayerId !== after.firstPlayerId) {
    lines.push('Turn order changed')
  }
  if (before.notes !== after.notes) {
    lines.push('Notes changed')
  }
  return lines.length ? lines : ['Fields updated']
}
