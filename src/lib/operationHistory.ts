import { getDeviceId } from '@/lib/deviceId'
import { summarizePartialMatchDiffCodes, type EntityDiffCode } from '@/lib/entityDiff'
import type { AuditActor, AuditEntry, ActiveMatch, AppState, Match, MatchRevision } from '@/types'

export interface OperationHistoryInput {
  auditLog: AuditEntry[]
  matchRevisions: MatchRevision[]
  matches: Match[]
  activeMatches: ActiveMatch[]
  settings: AppState['settings']
}

export interface OperationHistoryItem {
  id: string
  at: string
  kind: AuditEntry['kind']
  message: string
  actorLabel: string
  entityId: string | null
  revision: MatchRevision | null
  canUndo: boolean
  undoKind: 'complete' | 'edit' | 'delete' | null
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
    if (match) return match
  }
  const numberMatch = entry.message.match(/#(\d+)/)
  if (!numberMatch) return null
  const matchNumber = Number(numberMatch[1])
  if (!Number.isFinite(matchNumber)) return null
  return input.matches.find((item) => item.matchNumber === matchNumber) ?? null
}

export function isLocalAuditActor(actor: AuditActor | undefined, settings: AppState['settings']): boolean {
  if (!actor) return true
  if (actor.type === 'remote') return false
  if (actor.type === 'user') return actor.id === settings.cloudUserId
  return actor.id === getDeviceId()
}

function resolveUndoKind(
  input: OperationHistoryInput,
  entry: AuditEntry,
  match: Match | null,
  revision: MatchRevision | null,
): OperationHistoryItem['undoKind'] {
  if (!isLocalAuditActor(entry.actor, input.settings)) return null

  if (entry.kind === 'match_complete' && match && match.deletedAt === null) {
    if (input.activeMatches.every((item) => item.id !== match.id)) return 'complete'
    return null
  }

  if (entry.kind === 'match_edit' && match && match.deletedAt === null && revision) {
    return 'edit'
  }

  if (entry.kind === 'match_delete' && match && match.deletedAt !== null) {
    return 'delete'
  }

  return null
}

export function canUndoAuditEntry(input: OperationHistoryInput, entry: AuditEntry): boolean {
  const match = resolveMatchForEntry(input, entry)
  const revision = revisionForEntry(entry, input.matchRevisions ?? [])
  return resolveUndoKind(input, entry, match, revision) !== null
}

export function buildOperationHistory(input: OperationHistoryInput, limit = 40): OperationHistoryItem[] {
  return (input.auditLog ?? []).slice(0, limit).map((entry) => {
    const match = resolveMatchForEntry(input, entry)
    const revision = revisionForEntry(entry, input.matchRevisions ?? [])
    const undoKind = resolveUndoKind(input, entry, match, revision)
    return {
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      message: entry.message,
      actorLabel: entry.actor?.label ?? '',
      entityId: entry.entityId ?? match?.id ?? null,
      revision,
      canUndo: undoKind !== null,
      undoKind,
      match,
    }
  })
}

export function summarizeRevisionDiff(revision: MatchRevision): EntityDiffCode[] {
  return summarizePartialMatchDiffCodes(revision.before, revision.after)
}
