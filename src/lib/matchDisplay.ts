import type { ActiveMatch, Match } from '@/types'

export interface MatchSide {
  playerId: string
  deckId: string
}

type MatchLike = Pick<
  Match | ActiveMatch,
  'player1Id' | 'player2Id' | 'deck1Id' | 'deck2Id' | 'firstPlayerId'
>

/** Fixed table sides: left = player1, right = player2. Turn order uses badges, not layout. */
export function getOrderedMatchSides(match: MatchLike): [MatchSide, MatchSide] {
  return [
    { playerId: match.player1Id, deckId: match.deck1Id },
    { playerId: match.player2Id, deckId: match.deck2Id },
  ]
}
