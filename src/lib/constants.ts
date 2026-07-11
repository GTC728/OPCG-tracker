import { getLocaleAliasesForLeader } from '@/data/leaderLocaleAliases'
import { SEEDED_LEADER_DECKS } from '@/data/leaderDecks'
import { buildDefaultVariantsFromDecks, buildLeadersFromDecks } from '@/lib/dataModel'
import type { AppState, Deck } from '@/types'

export const SCHEMA_VERSION = 18
export const APP_VERSION = '4.14.1'
export const LIVE_APP_URL = 'https://opcg-tracker-v2.pages.dev'
export const GITHUB_REPO_URL = 'https://github.com/GTC728/OPCG-tracker'
export const GITHUB_CREDIT_HANDLE = 'GTC728'
export const STORAGE_KEY = 'opcg-tracker-state'

function seedDecksWithLocale(): Deck[] {
  return SEEDED_LEADER_DECKS.map((deck) => {
    const localeAliases = getLocaleAliasesForLeader(deck.leaderName)
    if (!localeAliases.length) return deck
    return {
      ...deck,
      aliases: Array.from(new Set([...deck.aliases, ...localeAliases])),
    }
  })
}

const LOCALIZED_SEED_DECKS = seedDecksWithLocale()
const DEFAULT_LEADERS = buildLeadersFromDecks(LOCALIZED_SEED_DECKS)
const DEFAULT_DECK_VARIANTS = buildDefaultVariantsFromDecks(LOCALIZED_SEED_DECKS)

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
    decks: LOCALIZED_SEED_DECKS,
    sessions: [],
    activeMatches: [],
    matches: [],
    matchRevisions: [],
    importBatches: [],
    importRows: [],
    importRecords: [],
    profileLifetime: null,
    settings: {
      lastBackupReminder: null,
      backupReminderIntervalDays: 7,
      language: 'zh-Hant',
      onboardingCompleted: false,
      lastGroupCode: null,
      deviceLabel: null,
      lastLoginLinkSentAt: null,
      rosterPromptSessionId: null,
      sessionTableCounts: {},
      groupCollabEnabled: false,
      groupCollabBootstrapped: false,
      sessionDayPromptDismissedFor: null,
      linkedPlayerId: null,
      profileSetupCompleted: false,
      profileIdentityId: null,
      profileDisplayName: null,
      groupProfileLinks: {},
      groupMemberRole: null,
      groupMemberBannedAt: null,
      cloudUserId: null,
      lastCloudBackupAt: null,
      autoBackupOnLogin: true,
      theme: 'dark',
      accent: 'blue',
      density: 'comfortable',
      statsDefaultScope: 'profile',
      achievementNotifications: true,
      lastGroupSyncAt: null,
      lastGroupSyncError: null,
      groupSyncPaused: false,
      groupSyncPausedAt: null,
      groupDataBoundCode: null,
    },
    auditLog: [],
    achievementUnlocks: [],
  }
}
