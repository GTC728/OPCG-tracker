import { buildLegacyDeckView } from '@/lib/dataModel'
import type { AppState, Deck, DeckVariant, Leader, Player } from '@/types'

export interface ResolvedDeckQuery {
  variant: DeckVariant
  leader: Leader
  legacyDeck: Deck
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeSearch(value: string): string {
  return normalizeName(value).replace(/[-_\s]/g, '')
}

function getLegacyDecks(state: AppState): Deck[] {
  return state.decks.length ? state.decks : buildLegacyDeckView(state.leaders, state.deckVariants)
}

export function getLeader(state: AppState, leaderId: string): Leader | undefined {
  return state.leaders.find((leader) => leader.id === leaderId)
}

export function getDeckVariant(state: AppState, variantId: string): DeckVariant | undefined {
  return state.deckVariants.find((variant) => variant.id === variantId)
}

export function getLeaderByVariantId(state: AppState, variantId: string): Leader | undefined {
  const variant = getDeckVariant(state, variantId)
  return variant ? getLeader(state, variant.leaderId) : undefined
}

export function getDeckDisplayName(state: AppState, variantId: string): string {
  const legacyDeck = getLegacyDecks(state).find((deck) => deck.id === variantId)
  if (legacyDeck) return legacyDeck.displayName

  const variant = getDeckVariant(state, variantId)
  const leader = variant ? getLeader(state, variant.leaderId) : undefined
  if (!variant || !leader) return '未知牌組'

  return variant.name === 'Default'
    ? `${leader.code} ${leader.name}`
    : `${leader.code} ${leader.name} / ${variant.name}`
}

export function getPlayerAliases(state: AppState, playerId: string): string[] {
  const player = state.players.find((item) => item.id === playerId)
  const aliasRows = state.playerAliases
    .filter((alias) => alias.playerId === playerId)
    .map((alias) => alias.alias)

  return Array.from(new Set([...(player?.aliases ?? []), ...aliasRows]))
}

export function getSessionRoster(state: AppState, sessionId: string): Player[] {
  const sessionPlayerIds = new Set(
    state.sessionPlayers
      .filter((sessionPlayer) => sessionPlayer.sessionId === sessionId)
      .map((sessionPlayer) => sessionPlayer.playerId),
  )

  if (sessionPlayerIds.size) {
    return state.players.filter((player) => sessionPlayerIds.has(player.id))
  }

  const matchPlayerIds = new Set<string>()
  for (const match of [...state.activeMatches, ...state.matches]) {
    if (match.sessionId !== sessionId) continue
    matchPlayerIds.add(match.player1Id)
    matchPlayerIds.add(match.player2Id)
  }

  return state.players.filter((player) => matchPlayerIds.has(player.id))
}

export function getActiveSessionDecks(state: AppState, sessionId: string): Deck[] {
  const sessionDeckIds = new Set(
    state.sessionDecks
      .filter((sessionDeck) => sessionDeck.sessionId === sessionId)
      .map((sessionDeck) => sessionDeck.deckVariantId),
  )
  const decks = getLegacyDecks(state)

  if (sessionDeckIds.size) {
    return decks.filter((deck) => sessionDeckIds.has(deck.id) && !deck.archived)
  }

  return decks.filter((deck) => !deck.archived)
}

export function resolveDeckQuery(state: AppState, query: string): ResolvedDeckQuery | null {
  const normalized = normalizeSearch(query)
  if (!normalized) return null

  const legacyDeck = getLegacyDecks(state).find((deck) => {
    const candidates = [
      deck.displayName,
      deck.setCode,
      deck.leaderCode,
      deck.leaderName,
      ...deck.aliases,
    ]

    return candidates.some((candidate) => normalizeSearch(candidate).includes(normalized))
  })

  if (!legacyDeck) return null

  const variant = getDeckVariant(state, legacyDeck.id)
  const leader = variant ? getLeader(state, variant.leaderId) : undefined
  if (!variant || !leader) return null

  return { variant, leader, legacyDeck }
}

export function resolvePlayerName(state: AppState, name: string): Player | null {
  const normalized = normalizeName(name)
  if (!normalized) return null

  return (
    state.players.find(
      (player) =>
        normalizeName(player.name) === normalized ||
        getPlayerAliases(state, player.id).some((alias) => normalizeName(alias) === normalized),
    ) ?? null
  )
}
