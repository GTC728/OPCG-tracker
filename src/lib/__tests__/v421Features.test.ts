import { describe, expect, it } from 'vitest'
import {
  buildMatchConflict,
  detectJoinConflicts,
  matchEntitiesDiffer,
  summarizeMatchEntityDiff,
} from '@/lib/conflictResolver'
import { computeUnlockProgressStats } from '@/lib/achievementProgressStats'
import { evaluateRemainingBacklogMetrics } from '@/lib/achievementsBacklogRemainingEval'
import { createDefaultAppState } from '@/lib/constants'
import type { AuditEntry, Match } from '@/types'

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    sessionId: 's1',
    matchNumber: 1,
    player1Id: 'p1',
    player2Id: 'p2',
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    winnerDeckId: 'd1',
    firstPlayerId: 'p1',
    resultType: 'normal',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T10:30:00.000Z',
    notes: '',
    source: 'manual',
    deletedAt: null,
    ...overrides,
  }
}

describe('achievement progress stats', () => {
  it('computes weighted progress from unlock levels', () => {
    const stats = computeUnlockProgressStats([
      {
        achievementId: 'veteran',
        playerId: 'p1',
        profileIdentityId: 'prof-1',
        level: 3,
        unlockedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        achievementId: 'veteran',
        playerId: 'p1',
        profileIdentityId: 'prof-1',
        level: 1,
        unlockedAt: '2026-07-01T01:00:00.000Z',
      },
    ])
    expect(stats.weightedProgressPct).toBeGreaterThanOrEqual(0)
    expect(stats.sameSessionUnlocks).toBeGreaterThanOrEqual(1)
  })
})

describe('backlog stats polish', () => {
  it('detects secret dash wins and progress fields', () => {
    const base = createDefaultAppState()
    const metrics = evaluateRemainingBacklogMetrics(
      'p1',
      base.players,
      base.decks,
      [match({ notes: '———', winnerPlayerId: 'p1' })],
      {
        linkedPlayerId: 'p1',
        settings: {
          ...base.settings,
          profileIdentityId: 'prof-1',
          lastGroupCode: 'club-a',
        },
        auditLog: [] as AuditEntry[],
        matchRevisions: [],
        achievementUnlocks: base.achievementUnlocks,
        sessions: [],
      },
    )
    expect(metrics.secret_all_dash).toBe(1)
    expect(metrics.group_anchor).toBeGreaterThanOrEqual(1)
  })
})

describe('conflict diff codes', () => {
  it('returns diff codes for match conflicts', () => {
    const codes = summarizeMatchEntityDiff(match(), match({ winnerPlayerId: 'p2' }))
    expect(codes).toContain('winnerChanged')
  })
})
