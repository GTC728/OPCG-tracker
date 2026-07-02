import { createDefaultAppState, SCHEMA_VERSION, STORAGE_KEY } from '@/lib/constants'
import {
  buildDefaultVariantsFromDecks,
  buildLeadersFromDecks,
  buildLegacyDeckView,
  playerAliasesFromPlayers,
} from '@/lib/dataModel'
import { loadIndexedAppState, saveIndexedAppState } from '@/lib/indexedDb'
import type { AppState, Deck } from '@/types'

type Migration = (state: Partial<AppState>) => Partial<AppState>

const migrations: Record<number, Migration> = {
  1: (state) => state,
  2: (state) => state,
  3: (state) => ({
    ...state,
    schemaVersion: 3,
  }),
  4: (state) => {
    const defaults = createDefaultAppState()
    const decks = mergeSeedDecks(Array.isArray(state.decks) ? state.decks : [], defaults.decks)
    const leaders = Array.isArray(state.leaders) && state.leaders.length ? state.leaders : buildLeadersFromDecks(decks)
    const deckVariants =
      Array.isArray(state.deckVariants) && state.deckVariants.length
        ? state.deckVariants
        : buildDefaultVariantsFromDecks(decks)

    return {
      ...state,
      schemaVersion: 4,
      players: Array.isArray(state.players) ? state.players : [],
      playerAliases:
        Array.isArray(state.playerAliases) && state.playerAliases.length
          ? state.playerAliases
          : playerAliasesFromPlayers(Array.isArray(state.players) ? state.players : []),
      leaders,
      deckVariants,
      sessionPlayers: Array.isArray(state.sessionPlayers) ? state.sessionPlayers : [],
      sessionDecks: Array.isArray(state.sessionDecks) ? state.sessionDecks : [],
      decks: buildLegacyDeckView(leaders, deckVariants),
      matchRevisions: Array.isArray(state.matchRevisions) ? state.matchRevisions : [],
      importBatches: Array.isArray(state.importBatches) ? state.importBatches : [],
      importRows: Array.isArray(state.importRows) ? state.importRows : [],
    }
  },
}

function mergeSeedDecks(decks: Deck[], seedDecks: Deck[]): Deck[] {
  const existingById = new Map(decks.map((deck) => [deck.id, deck]))
  const merged = [...decks]

  for (const seedDeck of seedDecks) {
    const existing = existingById.get(seedDeck.id)

    if (existing) {
      const aliases = Array.from(new Set([...seedDeck.aliases, ...existing.aliases]))
      Object.assign(existing, {
        ...seedDeck,
        aliases,
        archived: existing.archived,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      })
    } else {
      merged.push(seedDeck)
    }
  }

  return merged
}

function normalizeState(raw: Partial<AppState>): AppState {
  const defaults = createDefaultAppState()
  const leaders = Array.isArray(raw.leaders) && raw.leaders.length ? raw.leaders : defaults.leaders
  const deckVariants =
    Array.isArray(raw.deckVariants) && raw.deckVariants.length
      ? raw.deckVariants
      : defaults.deckVariants
  const decks = buildLegacyDeckView(leaders, deckVariants)

  return {
    ...defaults,
    ...raw,
    players: Array.isArray(raw.players) ? raw.players : defaults.players,
    playerAliases: Array.isArray(raw.playerAliases)
      ? raw.playerAliases
      : playerAliasesFromPlayers(Array.isArray(raw.players) ? raw.players : []),
    leaders,
    deckVariants,
    sessionPlayers: Array.isArray(raw.sessionPlayers)
      ? raw.sessionPlayers
      : defaults.sessionPlayers,
    sessionDecks: Array.isArray(raw.sessionDecks) ? raw.sessionDecks : defaults.sessionDecks,
    decks: mergeSeedDecks(decks, defaults.decks),
    sessions: Array.isArray(raw.sessions) ? raw.sessions : defaults.sessions,
    activeMatches: Array.isArray(raw.activeMatches)
      ? raw.activeMatches
      : defaults.activeMatches,
    matches: Array.isArray(raw.matches) ? raw.matches : defaults.matches,
    matchRevisions: Array.isArray(raw.matchRevisions)
      ? raw.matchRevisions
      : defaults.matchRevisions,
    importBatches: Array.isArray(raw.importBatches) ? raw.importBatches : defaults.importBatches,
    importRows: Array.isArray(raw.importRows) ? raw.importRows : defaults.importRows,
    importRecords: Array.isArray(raw.importRecords)
      ? raw.importRecords
      : defaults.importRecords,
    settings: {
      ...defaults.settings,
      ...raw.settings,
    },
  }
}

function migrateState(raw: Partial<AppState>): AppState {
  let migrated: Partial<AppState> = { ...raw }
  let version = Number(migrated.schemaVersion ?? 1)

  while (version < SCHEMA_VERSION) {
    const nextVersion = version + 1
    migrated = migrations[nextVersion]?.(migrated) ?? migrated
    migrated.schemaVersion = nextVersion
    version = nextVersion
  }

  return { ...normalizeState(migrated), schemaVersion: SCHEMA_VERSION }
}

function loadLocalAppState(): AppState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as Partial<AppState>
    return migrateState(parsed)
  } catch {
    return null
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save OPCG Tracker state', error)
  }

  saveIndexedAppState(state).catch((error) => {
    console.error('Failed to save OPCG Tracker IndexedDB state', error)
  })
}

export async function loadAppState(): Promise<AppState> {
  try {
    const indexedState = await loadIndexedAppState()
    if (indexedState) {
      return migrateState(indexedState)
    }
  } catch (error) {
    console.error('Failed to load OPCG Tracker IndexedDB state', error)
  }

  const localState = loadLocalAppState()
  if (localState) {
    saveIndexedAppState(localState).catch((error) => {
      console.error('Failed to migrate OPCG Tracker state to IndexedDB', error)
    })
    return localState
  }

  const defaults = createDefaultAppState()
  saveAppState(defaults)
  return defaults
}

export function exportAppStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}
