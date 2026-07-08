import { getLocaleAliasesForLeader } from '@/data/leaderLocaleAliases'
import { createDefaultAppState, SCHEMA_VERSION, STORAGE_KEY } from '@/lib/constants'
import { migrateLegacyUnlocks } from '@/lib/achievements'
import {
  buildDefaultVariantsFromDecks,
  buildLeadersFromDecks,
  buildLegacyDeckView,
  playerAliasesFromPlayers,
} from '@/lib/dataModel'
import { loadIndexedAppState, saveIndexedAppState } from '@/lib/indexedDb'
import { getSessionDateLabel } from '@/lib/sessions'
import type { AppState, Deck, Session } from '@/types'

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
  5: (state) => ({
    ...state,
    schemaVersion: 5,
    players: (Array.isArray(state.players) ? state.players : []).map((player) => ({
      ...player,
      deletedAt: player.deletedAt ?? null,
    })),
    sessions: (Array.isArray(state.sessions) ? state.sessions : []).map((session) => ({
      ...session,
      archivedAt: session.archivedAt ?? null,
      deletedAt: session.deletedAt ?? null,
    })),
  }),
  6: (state) => {
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...state.settings }
        : createDefaultAppState().settings
    const rawLanguage = settings.language as string | undefined
    const language =
      rawLanguage === 'zh' || rawLanguage === 'zh-Hant'
        ? 'zh-Hant'
        : rawLanguage === 'zh-Hans'
          ? 'zh-Hans'
          : rawLanguage === 'en' || rawLanguage === 'ja'
            ? rawLanguage
            : 'zh-Hant'
    return {
      ...state,
      schemaVersion: 6,
      settings: {
        ...settings,
        language,
        groupCollabEnabled: settings.lastGroupCode ? true : Boolean(settings.groupCollabEnabled),
      },
    }
  },
  7: (state) => {
    const defaults = createDefaultAppState().settings
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults, ...state.settings }
        : defaults
    return {
      ...state,
      schemaVersion: 7,
      players: (Array.isArray(state.players) ? state.players : []).map((player) => ({
        ...player,
        profileClaimDeviceId: player.profileClaimDeviceId ?? null,
        profileClaimedAt: player.profileClaimedAt ?? null,
      })),
      achievementUnlocks: Array.isArray(state.achievementUnlocks) ? state.achievementUnlocks : [],
      settings: {
        ...settings,
        linkedPlayerId: settings.linkedPlayerId ?? null,
        profileSetupCompleted: Boolean(settings.profileSetupCompleted),
        theme: settings.theme ?? 'dark',
        accent: settings.accent ?? 'blue',
        density: settings.density ?? 'comfortable',
        statsDefaultScope: settings.statsDefaultScope ?? 'profile',
        achievementNotifications: settings.achievementNotifications ?? true,
      },
    }
  },
  8: (state) => {
    const unlocks = Array.isArray(state.achievementUnlocks) ? state.achievementUnlocks : []
    return {
      ...state,
      schemaVersion: 8,
      achievementUnlocks: migrateLegacyUnlocks(
        unlocks.map((item) => ({
          ...item,
          level: typeof item.level === 'number' ? item.level : 1,
        })),
      ),
    }
  },
}

function withLocaleAliases(deck: Deck): Deck {
  const localeAliases = getLocaleAliasesForLeader(deck.leaderName)
  if (!localeAliases.length) return deck
  return {
    ...deck,
    aliases: Array.from(new Set([...deck.aliases, ...localeAliases])),
  }
}

function mergeSeedDecks(decks: Deck[], seedDecks: Deck[]): Deck[] {
  const existingById = new Map(decks.map((deck) => [deck.id, deck]))
  const merged = [...decks]

  for (const seedDeck of seedDecks.map(withLocaleAliases)) {
    const existing = existingById.get(seedDeck.id)

    if (existing) {
      const localeAliases = getLocaleAliasesForLeader(seedDeck.leaderName)
      const aliases = Array.from(new Set([...seedDeck.aliases, ...localeAliases, ...existing.aliases]))
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

function normalizeSessionName(session: Session): Session {
  const legacyDefaultName = `${getSessionDateLabel(new Date(session.startedAt))} 卡店`
  const base =
    session.name === legacyDefaultName
      ? { ...session, name: getSessionDateLabel(new Date(session.startedAt)) }
      : session
  return {
    ...base,
    archivedAt: base.archivedAt ?? null,
    deletedAt: base.deletedAt ?? null,
  }
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
    players: (Array.isArray(raw.players) ? raw.players : defaults.players).map((player) => ({
      ...player,
      deletedAt: player.deletedAt ?? null,
      profileClaimDeviceId: player.profileClaimDeviceId ?? null,
      profileClaimedAt: player.profileClaimedAt ?? null,
    })),
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
    sessions: Array.isArray(raw.sessions) ? raw.sessions.map(normalizeSessionName) : defaults.sessions,
    activeMatches: Array.isArray(raw.activeMatches)
      ? raw.activeMatches.map((match) => ({
          ...match,
          tableSlot: typeof match.tableSlot === 'number' ? match.tableSlot : null,
        }))
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
    achievementUnlocks: Array.isArray(raw.achievementUnlocks)
      ? raw.achievementUnlocks
      : defaults.achievementUnlocks,
    settings: {
      ...defaults.settings,
      ...raw.settings,
      sessionTableCounts:
        raw.settings && typeof raw.settings === 'object' && raw.settings.sessionTableCounts
          ? raw.settings.sessionTableCounts
          : defaults.settings.sessionTableCounts,
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

export function importAppStateJson(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState>
  return migrateState(parsed)
}
