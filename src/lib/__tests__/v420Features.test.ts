import { describe, expect, it } from 'vitest'
import {
  buildMatchConflict,
  detectJoinConflicts,
  matchEntitiesDiffer,
  mergeUniqueConflicts,
  summarizeMatchEntityDiff,
  type RemoteGroupEntities,
} from '@/lib/conflictResolver'
import { createDefaultAppState } from '@/lib/constants'
import {
  buildMetaTransferChartPoints,
  buildWeeklyDeckMetaStats,
} from '@/lib/stats'
import type { Deck, Match } from '@/types'

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

describe('conflictResolver', () => {
  it('detects match entity differences', () => {
    expect(matchEntitiesDiffer(match(), match({ winnerPlayerId: 'p2' }))).toBe(true)
    expect(matchEntitiesDiffer(match(), match())).toBe(false)
  })

  it('summarizes match diff codes', () => {
    const lines = summarizeMatchEntityDiff(match(), match({ winnerPlayerId: 'p2', notes: 'x' }))
    expect(lines).toContain('winnerChanged')
    expect(lines).toContain('notesChanged')
  })

  it('detects join conflicts on overlapping ids', () => {
    const local = match()
    const remote = match({ winnerPlayerId: 'p2' })
    const remoteBundle: RemoteGroupEntities = {
      activeMatches: [],
      matches: [remote],
      players: [],
      sessions: [],
      meta: {
        matchUpdatedAt: new Map([[remote.id, '2026-07-02T00:00:00.000Z']]),
        matchUpdatedBy: new Map([[remote.id, 'user-b']]),
        playerUpdatedAt: new Map(),
        playerUpdatedBy: new Map(),
        sessionUpdatedAt: new Map(),
        sessionUpdatedBy: new Map(),
        activeUpdatedAt: new Map(),
        activeUpdatedBy: new Map(),
      },
    }

    const conflicts = detectJoinConflicts(
      {
        currentSessionId: null,
        players: [],
        playerAliases: [],
        sessionPlayers: [],
        sessionDecks: [],
        sessions: [],
        activeMatches: [],
        matches: [local],
        matchRevisions: [],
        importBatches: [],
        importRows: [],
        importRecords: [],
      },
      remoteBundle,
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].entityKind).toBe('match')
    expect(conflicts[0].localMatch?.winnerPlayerId).toBe('p1')
    expect(conflicts[0].remoteMatch?.winnerPlayerId).toBe('p2')
  })

  it('merges conflicts by entity key', () => {
    const first = buildMatchConflict('pull', match(), match({ winnerPlayerId: 'p2' }), '', null)
    const second = buildMatchConflict('join', match(), match({ notes: 'edited' }), '', null)
    const merged = mergeUniqueConflicts([first], [second])
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('join')
  })
})

describe('weekly deck meta stats', () => {
  const decks: Deck[] = [
    {
      id: 'd1',
      setCode: 'OP01',
      leaderCode: '001',
      leaderName: 'Luffy',
      colors: ['Red'],
      displayName: 'Red Luffy',
      aliases: [],
      archived: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'd2',
      setCode: 'OP02',
      leaderCode: '002',
      leaderName: 'Zoro',
      colors: ['Green'],
      displayName: 'Green Zoro',
      aliases: [],
      archived: false,
      createdAt: '',
      updatedAt: '',
    },
  ]

  it('builds weekly deck appearance buckets', () => {
    const now = new Date()
    const stats = buildWeeklyDeckMetaStats(decks, [
      match({ deck1Id: 'd1', deck2Id: 'd2', finishedAt: now.toISOString() }),
      match({ id: 'm2', deck1Id: 'd1', deck2Id: 'd2', finishedAt: now.toISOString() }),
    ], 'en', 4)

    const withData = stats.filter((week) => week.total > 0)
    expect(withData.length).toBeGreaterThan(0)
    expect(withData[withData.length - 1].total).toBe(4)
  })

  it('produces stacked chart points that sum to match count per week', () => {
    const now = new Date()
    const stats = buildWeeklyDeckMetaStats(decks, [
      match({ deck1Id: 'd1', deck2Id: 'd2', finishedAt: now.toISOString() }),
    ], 'en', 4)
    const week = stats.find((item) => item.total > 0)
    expect(week).toBeTruthy()
    const { points, deckKeys } = buildMetaTransferChartPoints(stats)
    expect(deckKeys.length).toBeGreaterThan(0)
    const point = points.find((item) => item.total > 0)
    expect(point).toBeTruthy()
    const sum = deckKeys.reduce((total, deck) => total + Number(point?.[deck.key] ?? 0), 0)
    expect(sum).toBe(point?.total)
  })
})

describe('default app state', () => {
  it('includes empty syncConflicts', () => {
    expect(createDefaultAppState().syncConflicts).toEqual([])
  })
})
