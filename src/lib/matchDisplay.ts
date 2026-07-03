import type { ActiveMatch, Match } from '@/types'

export interface MatchSide {
  playerId: string
  deckId: string
}

type MatchLike = Pick<
  Match | ActiveMatch,
  'player1Id' | 'player2Id' | 'deck1Id' | 'deck2Id' | 'firstPlayerId'
>

/** First-player side on the left; player A/B order does not determine layout. */
export function getOrderedMatchSides(match: MatchLike): [MatchSide, MatchSide] {
  const sideA: MatchSide = { playerId: match.player1Id, deckId: match.deck1Id }
  const sideB: MatchSide = { playerId: match.player2Id, deckId: match.deck2Id }

  if (match.firstPlayerId === match.player2Id) {
    return [sideB, sideA]
  }

  return [sideA, sideB]
}
