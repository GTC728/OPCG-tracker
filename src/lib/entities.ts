import type { Deck, Player } from '@/types'

export function getPlayer(players: Player[], id: string): Player | undefined {
  return players.find((player) => player.id === id)
}

export function getDeck(decks: Deck[], id: string): Deck | undefined {
  return decks.find((deck) => deck.id === id)
}

export function getPlayerName(players: Player[], id: string): string {
  return getPlayer(players, id)?.name ?? '未知玩家'
}

export function getDeckName(decks: Deck[], id: string): string {
  return getDeck(decks, id)?.displayName ?? '未知牌組'
}

export function getDeckLabel(decks: Deck[], id: string): string {
  const deck = getDeck(decks, id)
  if (!deck) return '未知牌組'

  return [deck.displayName, deck.setCode].filter(Boolean).join(' · ')
}
