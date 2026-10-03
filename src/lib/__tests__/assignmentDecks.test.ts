import { describe, expect, it } from 'vitest'
import { getAssignmentRecentDeckIds } from '@/lib/selectors'
import type { Deck, Match } from '@/types'

const decks: Deck[] = [
  {
    id: 'd1',
    displayName: 'Deck 1',
    setCode: 'OP01',
    leaderCode: 'OP01-001',
    leaderName: 'Luffy',
    colors: ['red'],
    aliases: [],
    archived: false,
  },
  {
    id: 'd2',
    displayName: 'Deck 2',
    setCode: 'OP02',
    leaderCode: 'OP02-001',
    leaderName: 'Zoro',
    colors: ['green'],
    aliases: [],
    archived: false,
  },
  {
    id: 'd3',
    displayName: 'Deck 3',
    setCode: 'OP03',
    leaderCode: 'OP03-001',
    leaderName: 'Nami',
    colors: ['blue'],
    aliases: [],
    archived: false,
  },
]

function match(partial: Partial<Match> & Pick<Match, 'id'>): Match {
  return {
    sessionId: 's1',
    player1Id: 'alice',
    player2Id: 'bob',
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: 'alice',
    firstPlayerId: null,
    notes: '',
    startedAt: '2026-01-01T10:00:00.000Z',
    finishedAt: '2026-01-01T10:30:00.000Z',
    deletedAt: null,
    ...partial,
  }
}

describe('getAssignmentRecentDeckIds', () => {
  it('prioritizes focus player decks when assigning a deck slot', () => {
    const matches: Match[] = [
      match({ id: 'm1', player1Id: 'alice', deck1Id: 'd3' }),
      match({ id: 'm2', player1Id: 'bob', deck1Id: 'd1' }),
    ]

    const ids = getAssignmentRecentDeckIds(matches, [], decks, 's1', ['alice', 'bob'], 12, 'alice')

    expect(ids[0]).toBe('d3')
  })
})
