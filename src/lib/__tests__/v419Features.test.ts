import { describe, expect, it } from 'vitest'
import {
  appendAuditEntry,
  remoteAuditActor,
  resolveLocalAuditActor,
} from '@/lib/auditLog'
import { createDefaultAppState } from '@/lib/constants'
import {
  buildOperationHistory,
  canUndoAuditEntry,
  summarizeRevisionDiff,
} from '@/lib/operationHistory'
import type { AuditEntry, Match, MatchRevision } from '@/types'

function completedMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    matchNumber: 42,
    player1Id: 'p1',
    player2Id: 'p2',
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    firstPlayerId: 'p1',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T10:30:00.000Z',
    notes: '',
    archivedAt: null,
    deletedAt: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  }
}

function auditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'audit-1',
    at: '2026-07-01T11:00:00.000Z',
    kind: 'match_complete',
    message: '#42 completed',
    entityId: 'match-1',
    ...overrides,
  }
}

describe('auditLog actors', () => {
  it('resolves local device actor when not signed in', () => {
    const state = createDefaultAppState()
    const actor = resolveLocalAuditActor(state)
    expect(actor.type).toBe('device')
    expect(actor.id).toBeTruthy()
    expect(actor.label).toBeTruthy()
  })

  it('resolves cloud user actor when signed in', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      settings: {
        ...base.settings,
        cloudUserId: 'user-123',
        profileDisplayName: 'Alice',
      },
    }
    const actor = resolveLocalAuditActor(state)
    expect(actor.type).toBe('user')
    expect(actor.id).toBe('user-123')
    expect(actor.label).toBe('Alice')
  })

  it('appends structured audit entry with actor and entityId', () => {
    const state = createDefaultAppState()
    const next = appendAuditEntry(state, 'match_complete', '#1 done', {
      entityId: 'm-1',
      meta: { source: 'test' },
    })
    expect(next.auditLog).toHaveLength(1)
    expect(next.auditLog[0].entityId).toBe('m-1')
    expect(next.auditLog[0].actor?.type).toBe('device')
    expect(next.auditLog[0].meta?.source).toBe('test')
  })

  it('builds remote actor for group pull', () => {
    const actor = remoteAuditActor('remote-user-id', 'Bob')
    expect(actor.type).toBe('remote')
    expect(actor.label).toBe('Bob')
  })
})

describe('operationHistory', () => {
  const match = completedMatch()
  const settings = createDefaultAppState().settings

  it('allows undo when match is completed and not active', () => {
    const entry = auditEntry()
    expect(
      canUndoAuditEntry(
        { auditLog: [entry], matchRevisions: [], matches: [match], activeMatches: [], settings },
        entry,
      ),
    ).toBe(true)
  })

  it('disallows undo when match is already active', () => {
    const entry = auditEntry()
    expect(
      canUndoAuditEntry(
        {
          auditLog: [entry],
          matchRevisions: [],
          matches: [match],
          activeMatches: [{ ...match, tableSlot: 1 } as import('@/types').ActiveMatch],
          settings,
        },
        entry,
      ),
    ).toBe(false)
  })

  it('allows undo for local match_edit with revision', () => {
    const revision: MatchRevision = {
      id: 'rev-1',
      matchId: 'match-1',
      editedAt: '2026-07-01T12:00:00.000Z',
      before: { winnerPlayerId: 'p1' },
      after: { winnerPlayerId: 'p2' },
      reason: 'manual_edit',
    }
    const entry = auditEntry({ kind: 'match_edit' })
    expect(
      canUndoAuditEntry(
        { auditLog: [entry], matchRevisions: [revision], matches: [match], activeMatches: [], settings },
        entry,
      ),
    ).toBe(true)
  })

  it('disallows undo for remote match_edit', () => {
    const entry = auditEntry({
      kind: 'match_edit',
      actor: remoteAuditActor('other-user'),
    })
    expect(
      canUndoAuditEntry(
        { auditLog: [entry], matchRevisions: [], matches: [match], activeMatches: [], settings },
        entry,
      ),
    ).toBe(false)
  })

  it('builds history with revision and undo flag', () => {
    const revision: MatchRevision = {
      id: 'rev-1',
      matchId: 'match-1',
      editedAt: '2026-07-01T12:00:00.000Z',
      before: { winnerPlayerId: 'p1' },
      after: { winnerPlayerId: 'p2' },
      reason: 'manual_edit',
    }
    const complete = auditEntry()
    const edit = auditEntry({
      id: 'audit-2',
      kind: 'match_edit',
      message: '#42 edited',
      entityId: 'match-1',
    })

    const items = buildOperationHistory({
      auditLog: [edit, complete],
      matchRevisions: [revision],
      matches: [match],
      activeMatches: [],
      settings,
    })

    expect(items).toHaveLength(2)
    expect(items[0].revision?.id).toBe('rev-1')
    expect(items[0].canUndo).toBe(true)
    expect(items[0].undoKind).toBe('edit')
    expect(items[1].canUndo).toBe(true)
    expect(items[1].match?.id).toBe('match-1')
  })

  it('summarizes revision field changes', () => {
    const revision: MatchRevision = {
      id: 'rev-1',
      matchId: 'match-1',
      editedAt: '2026-07-01T12:00:00.000Z',
      before: { winnerPlayerId: 'p1', notes: 'a' },
      after: { winnerPlayerId: 'p2', notes: 'b' },
      reason: 'manual_edit',
    }
    const lines = summarizeRevisionDiff(revision)
    expect(lines).toContain('winnerChanged')
    expect(lines).toContain('notesChanged')
  })
})
