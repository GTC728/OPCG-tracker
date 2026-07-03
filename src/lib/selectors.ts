import { buildLegacyDeckView } from '@/lib/dataModel'
import type { AppState, Deck, DeckVariant, Leader, Match, Player } from '@/types'

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

  return state.players.filter((player) => !player.archived)
}

export function hasExplicitSessionRoster(state: AppState, sessionId: string): boolean {
  return state.sessionPlayers.some((sessionPlayer) => sessionPlayer.sessionId === sessionId)
}

function countPlayerMatches(
  state: AppState,
  playerId: string,
  options?: { sinceMs?: number; sessionId?: string },
): number {
  let count = 0

  for (const match of state.activeMatches) {
    if (options?.sessionId && match.sessionId !== options.sessionId) continue
    const time = new Date(match.startedAt).getTime()
    if (options?.sinceMs !== undefined && time < options.sinceMs) continue
    if (match.player1Id === playerId || match.player2Id === playerId) count += 1
  }

  for (const match of state.matches) {
    if (match.deletedAt !== null) continue
    if (options?.sessionId && match.sessionId !== options.sessionId) continue
    const time = new Date(match.finishedAt).getTime()
    if (options?.sinceMs !== undefined && time < options.sinceMs) continue
    if (match.player1Id === playerId || match.player2Id === playerId) count += 1
  }

  return count
}

export function getSortedPlayersForSession(state: AppState, sessionId: string): Player[] {
  const roster = getSessionRoster(state, sessionId)
  const pool = roster.length
    ? roster
    : state.players.filter((player) => !player.archived)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  return [...pool].sort((left, right) => {
    const leftSession = countPlayerMatches(state, left.id, { sessionId })
    const rightSession = countPlayerMatches(state, right.id, { sessionId })
    const leftRecent = countPlayerMatches(state, left.id, { sinceMs: thirtyDaysAgo })
    const rightRecent = countPlayerMatches(state, right.id, { sinceMs: thirtyDaysAgo })
    const leftScore = leftSession * 2 + leftRecent
    const rightScore = rightSession * 2 + rightRecent
    if (rightScore !== leftScore) return rightScore - leftScore
    return left.name.localeCompare(right.name)
  })
}

export function getDefaultRosterPlayerIds(state: AppState): string[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const activePlayers = state.players.filter((player) => !player.archived)

  const ranked = [...activePlayers]
    .map((player) => ({
      id: player.id,
      count: countPlayerMatches(state, player.id, { sinceMs: sevenDaysAgo }),
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)

  if (ranked.length) {
    return ranked.slice(0, 8).map((item) => item.id)
  }

  return activePlayers.slice(0, 8).map((player) => player.id)
}

export function getRecentDistinctDeckIdsForPlayer(
  matches: Match[],
  decks: Deck[],
  playerId: string,
  limit = 3,
): string[] {
  const seenLeaderNames = new Set<string>()
  const deckIds: string[] = []

  for (const match of matches) {
    if (match.deletedAt !== null) continue

    const deckId =
      match.player1Id === playerId
        ? match.deck1Id
        : match.player2Id === playerId
          ? match.deck2Id
          : null

    if (!deckId) continue

    const deck = decks.find((item) => item.id === deckId)
    const leaderKey = deck?.leaderName ?? deckId
    if (seenLeaderNames.has(leaderKey)) continue

    seenLeaderNames.add(leaderKey)
    deckIds.push(deckId)
    if (deckIds.length >= limit) break
  }

  return deckIds
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

export function getSessionRecentDistinctDeckIds(
  matches: Match[],
  sessionId: string | null,
  limit = 10,
): string[] {
  const seen = new Set<string>()
  const deckIds: string[] = []

  for (const match of matches) {
    if (match.deletedAt !== null) continue
    if (sessionId && match.sessionId !== sessionId) continue

    for (const deckId of [match.deck1Id, match.deck2Id]) {
      if (seen.has(deckId)) continue
      seen.add(deckId)
      deckIds.push(deckId)
      if (deckIds.length >= limit) return deckIds
    }
  }

  return deckIds
}

export function getAssignmentRecentDeckIds(
  matches: Match[],
  activeMatches: { sessionId: string; deck1Id: string; deck2Id: string }[],
  decks: Deck[],
  sessionId: string,
  playerIds: string[],
  limit = 12,
): string[] {
  const seen = new Set<string>()
  const deckIds: string[] = []

  const pushDeck = (deckId: string) => {
    if (!deckId || seen.has(deckId)) return
    if (!decks.some((deck) => deck.id === deckId && !deck.archived)) return
    seen.add(deckId)
    deckIds.push(deckId)
  }

  for (const match of matches) {
    if (match.deletedAt !== null) continue
    if (match.sessionId !== sessionId) continue
    pushDeck(match.deck1Id)
    pushDeck(match.deck2Id)
    if (deckIds.length >= limit) return deckIds
  }

  for (const activeMatch of activeMatches) {
    if (activeMatch.sessionId !== sessionId) continue
    pushDeck(activeMatch.deck1Id)
    pushDeck(activeMatch.deck2Id)
    if (deckIds.length >= limit) return deckIds
  }

  for (const playerId of playerIds) {
    for (const deckId of getRecentDistinctDeckIdsForPlayer(matches, decks, playerId, 2)) {
      pushDeck(deckId)
      if (deckIds.length >= limit) return deckIds
    }
  }

  return deckIds
}
