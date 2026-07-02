import { SEEDED_LEADER_DECKS } from '@/data/leaderDecks'
import { buildDefaultVariantsFromDecks, buildLeadersFromDecks } from '@/lib/dataModel'
import type { AppState } from '@/types'

export const SCHEMA_VERSION = 4
export const APP_VERSION = '3.0.0'
export const STORAGE_KEY = 'opcg-tracker-state'
const DEFAULT_LEADERS = buildLeadersFromDecks(SEEDED_LEADER_DECKS)
const DEFAULT_DECK_VARIANTS = buildDefaultVariantsFromDecks(SEEDED_LEADER_DECKS)

export function createDefaultAppState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    currentSessionId: null,
    players: [],
    playerAliases: [],
    leaders: DEFAULT_LEADERS,
    deckVariants: DEFAULT_DECK_VARIANTS,
    sessionPlayers: [],
    sessionDecks: [],
    decks: SEEDED_LEADER_DECKS,
    sessions: [],
    activeMatches: [],
    matches: [],
    matchRevisions: [],
    importBatches: [],
    importRows: [],
    importRecords: [],
    settings: {
      lastBackupReminder: null,
      backupReminderIntervalDays: 7,
      language: 'en',
      onboardingCompleted: false,
    },
  }
}
