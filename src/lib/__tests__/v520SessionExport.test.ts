import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '@/lib/constants'
import { getSessionExportState } from '@/lib/excelExport'
import type { Match, Session } from '@/types'

function session(id: string, name: string): Session {
  return {
    id,
    name,
    startedAt: '2026-07-01T10:00:00.000Z',
    endedAt: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    archivedAt: null,
    deletedAt: null,
  }
}

function match(id: string, sessionId: string): Match {
  return {
    id,
    sessionId,
    matchNumber: 1,
    player1Id: 'p1',
    player2Id: 'p2',
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    winnerDeckId: 'd1',
    firstPlayerId: null,
    resultType: 'normal',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T10:30:00.000Z',
    notes: null,
    source: 'manual',
    deletedAt: null,
  }
}

describe('session excel export scope', () => {
  it('keeps only the target session matches and session row', () => {
    const state = {
      ...createDefaultAppState(),
      sessions: [session('s1', 'Night 1'), session('s2', 'Night 2')],
      matches: [match('m1', 's1'), match('m2', 's2'), match('m3', 's1')],
      activeMatches: [],
    }

    const scoped = getSessionExportState(state, 's1')
    expect(scoped.sessions.map((item) => item.id)).toEqual(['s1'])
    expect(scoped.matches.map((item) => item.id).sort()).toEqual(['m1', 'm3'])
  })
})
