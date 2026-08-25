import type { Match } from '@/types'

export function resolveMatchRecordSides(
  match: Pick<Match, 'player1Id' | 'player2Id' | 'deck1Id' | 'deck2Id'>,
  perspectivePlayerId?: string,
) {
  const focusLeft = Boolean(perspectivePlayerId) && perspectivePlayerId === match.player2Id
  if (focusLeft) {
    return {
      left: { playerId: match.player2Id, deckId: match.deck2Id },
      right: { playerId: match.player1Id, deckId: match.deck1Id },
    }
  }

  return {
    left: { playerId: match.player1Id, deckId: match.deck1Id },
    right: { playerId: match.player2Id, deckId: match.deck2Id },
  }
}
