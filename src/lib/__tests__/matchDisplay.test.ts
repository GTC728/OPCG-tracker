import { describe, expect, it } from 'vitest'
import { getOrderedMatchSides } from '@/lib/matchDisplay'

describe('getOrderedMatchSides', () => {
  it('keeps player1 on the left even when player2 goes first', () => {
    const sides = getOrderedMatchSides({
      player1Id: 'p1',
      player2Id: 'p2',
      deck1Id: 'd1',
      deck2Id: 'd2',
      firstPlayerId: 'p2',
    })

    expect(sides[0]).toEqual({ playerId: 'p1', deckId: 'd1' })
    expect(sides[1]).toEqual({ playerId: 'p2', deckId: 'd2' })
  })
})
