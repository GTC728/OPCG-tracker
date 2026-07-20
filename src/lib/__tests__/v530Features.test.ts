import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '@/lib/constants'
import { getMatchFilterPlayers, mergeSessionRosterPlayerIds } from '@/lib/importRoster'
import { sortPilotStatsForLeaderboard, type PlayerDeckStat } from '@/lib/stats'
import type { Match, Player } from '@/types'

function player(id: string, name: string, archived = false): Player {
  return {
    id,
    name,
    aliases: [],
    archived,
    deletedAt: null,
    profileClaimDeviceId: null,
    profileClaimedAt: null,
    linkedUserId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function match(sessionId: string, p1: string, p2: string): Match {
  return {
    id: `m-${p1}-${p2}`,
    sessionId,
    matchNumber: 1,
    player1Id: p1,
    player2Id: p2,
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: p1,
    winnerDeckId: 'd1',
    firstPlayerId: null,
    resultType: 'normal',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T10:30:00.000Z',
    notes: null,
    source: 'import',
    deletedAt: null,
  }
}

describe('importRoster', () => {
  it('includes players with matches even when not on session roster', () => {
    const state = {
      ...createDefaultAppState(),
      players: [player('p1', 'Simon'), player('p2', 'San')],
      sessionPlayers: [{ sessionId: 's1', playerId: 'p1', defaultDeckVariantId: null }],
      matches: [match('s1', 'p1', 'p2')],
      activeMatches: [],
    }

    const filters = getMatchFilterPlayers(state, 's1')
    expect(filters.map((item) => item.id).sort()).toEqual(['p1', 'p2'])
  })

  it('merges roster ids without dropping existing rows', () => {
    const merged = mergeSessionRosterPlayerIds(
      {
        sessionPlayers: [{ sessionId: 's1', playerId: 'p1', defaultDeckVariantId: 'd9' }],
      },
      's1',
      ['p2'],
    )
    expect(merged).toHaveLength(2)
    expect(merged.find((row) => row.playerId === 'p1')?.defaultDeckVariantId).toBe('d9')
  })
})

describe('sortPilotStatsForLeaderboard', () => {
  const base: PlayerDeckStat = {
    id: 'a',
    playerId: 'p1',
    deckId: 'd1',
    playerName: 'A',
    deckName: 'Deck',
    name: 'A × Deck',
    wins: 0,
    losses: 0,
    total: 0,
    winRate: null,
  }

  it('requires at least 3 games', () => {
    const stats: PlayerDeckStat[] = [
      { ...base, id: '1', wins: 2, losses: 0, total: 2, winRate: 1 },
      { ...base, id: '2', wins: 3, losses: 3, total: 6, winRate: 0.5 },
    ]
    expect(sortPilotStatsForLeaderboard(stats)).toHaveLength(1)
    expect(sortPilotStatsForLeaderboard(stats)[0].id).toBe('2')
  })
})
