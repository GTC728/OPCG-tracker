import type { Deck, DeckVariant, Leader, Player, PlayerAlias } from '@/types'

const DEFAULT_VARIANT_NAME = 'Default'

export function leaderFromDeck(deck: Deck): Leader {
  return {
    id: deck.leaderCode,
    code: deck.leaderCode,
    setCode: deck.setCode,
    name: deck.leaderName,
    colors: deck.colors,
    traits: deck.aliases.filter((alias) => alias !== deck.leaderCode && alias !== deck.leaderName),
    source: 'seed',
    updatedAt: deck.updatedAt,
  }
}

export function defaultVariantFromDeck(deck: Deck): DeckVariant {
  return {
    id: deck.id,
    leaderId: deck.leaderCode,
    name: DEFAULT_VARIANT_NAME,
    ownerPlayerId: null,
    aliases: deck.aliases,
    archived: deck.archived,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
  }
}

export function playerAliasesFromPlayers(players: Player[]): PlayerAlias[] {
  return players.flatMap((player) =>
    player.aliases.map((alias) => ({
      id: `alias-${player.id}-${alias.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')}`,
      playerId: player.id,
      alias,
      source: 'manual' as const,
    })),
  )
}

export function buildLeadersFromDecks(decks: Deck[]): Leader[] {
  const leadersById = new Map<string, Leader>()

  for (const deck of decks) {
    leadersById.set(deck.leaderCode, leaderFromDeck(deck))
  }

  return [...leadersById.values()].sort((left, right) => left.code.localeCompare(right.code))
}

export function buildDefaultVariantsFromDecks(decks: Deck[]): DeckVariant[] {
  const variantsById = new Map<string, DeckVariant>()

  for (const deck of decks) {
    variantsById.set(deck.id, defaultVariantFromDeck(deck))
  }

  return [...variantsById.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function buildLegacyDeckView(leaders: Leader[], variants: DeckVariant[]): Deck[] {
  const leaderById = new Map(leaders.map((leader) => [leader.id, leader]))

  return variants
    .map((variant) => {
      const leader = leaderById.get(variant.leaderId)
      if (!leader) return null

      const displayName =
        variant.name === DEFAULT_VARIANT_NAME
          ? `${leader.code} ${leader.name}`
          : `${leader.code} ${leader.name} / ${variant.name}`

      return {
        id: variant.id,
        setCode: leader.setCode,
        leaderCode: leader.code,
        leaderName: leader.name,
        colors: leader.colors,
        displayName,
        aliases: variant.aliases,
        archived: variant.archived,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
      } satisfies Deck
    })
    .filter((deck): deck is Deck => deck !== null)
}
