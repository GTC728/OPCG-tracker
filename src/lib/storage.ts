import { getLocaleAliasesForLeader } from '@/data/leaderLocaleAliases'
import { createDefaultAppState, SCHEMA_VERSION, STORAGE_KEY } from '@/lib/constants'
import { migrateLegacyUnlocks, reconcileAchievementUnlocks } from '@/lib/achievements'
import {
  emptyGroupSnapshot,
  groupStorageKey,
  mergePersonalAndGroup,
  splitAppState,
} from '@/lib/appStateLayers'
import { isTestGroupCode } from '@/lib/groupTest'
import {
  clearLegacyMonolithState,
  loadGroupScopedState,
  loadLegacyMonolithState,
  loadOfflineGroupState,
  loadPersonalState,
  saveGroupScopedState,
  saveOfflineGroupState,
  savePersonalState,
} from '@/lib/indexedDb'
import { ensureProfileIdentityId } from '@/lib/profileIdentity'
import { finalizeProfileLink } from '@/lib/profileGroupLink'
import { rebuildLifetimeFromMatches } from '@/lib/profileLifetime'
import {
  buildDefaultVariantsFromDecks,
  buildLeadersFromDecks,
  buildLegacyDeckView,
  playerAliasesFromPlayers,
} from '@/lib/dataModel'
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
          profileIdentityId: item.profileIdentityId ?? item.playerId,
        })),
        null,
      ),
    }
  },
  9: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    return {
      ...state,
      schemaVersion: 9,
      auditLog: Array.isArray(state.auditLog) ? state.auditLog : [],
      activeMatches: Array.isArray(state.activeMatches)
        ? state.activeMatches.map((match) => ({
            ...match,
            startedAt: match.startedAt ?? null,
          }))
        : [],
      settings: {
        ...settings,
        lastGroupSyncAt: settings.lastGroupSyncAt ?? null,
        lastGroupSyncError: settings.lastGroupSyncError ?? null,
      },
    }
  },
  10: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    return {
      ...state,
      schemaVersion: 10,
      importBatches: (Array.isArray(state.importBatches) ? state.importBatches : []).map((batch) => ({
        ...batch,
        revertedAt: batch.revertedAt ?? null,
        targetSessionId: batch.targetSessionId ?? null,
      })),
      settings: {
        ...settings,
        groupSyncPaused: settings.groupSyncPaused ?? false,
        groupSyncPausedAt: settings.groupSyncPausedAt ?? null,
      },
    }
  },
  11: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    const inGroup = Boolean(settings.lastGroupCode)
    return {
      ...state,
      schemaVersion: 11,
      settings: {
        ...settings,
        groupDataBoundCode: null,
        groupCollabBootstrapped: inGroup ? false : settings.groupCollabBootstrapped,
      },
    }
  },
  12: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    const profileIdentityId = settings.profileIdentityId ?? crypto.randomUUID()
    const unlocks = Array.isArray(state.achievementUnlocks) ? state.achievementUnlocks : []
    let profileLifetime = state.profileLifetime ?? null
    const linkedId = settings.linkedPlayerId
    const matches = Array.isArray(state.matches) ? state.matches : []
    const players = Array.isArray(state.players) ? state.players : []
    if (!profileLifetime && linkedId && !isTestGroupCode(settings.lastGroupCode)) {
      profileLifetime = rebuildLifetimeFromMatches(profileIdentityId, linkedId, players, matches)
    }
    return {
      ...state,
      schemaVersion: 12,
      profileLifetime,
      achievementUnlocks: migrateLegacyUnlocks(unlocks, profileIdentityId),
      settings: {
        ...settings,
        profileIdentityId,
      },
    }
  },
  13: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    const links = settings.groupProfileLinks ?? {}
    if (
      settings.linkedPlayerId &&
      settings.lastGroupCode &&
      !links[groupStorageKey(settings.lastGroupCode)]
    ) {
      const player = (Array.isArray(state.players) ? state.players : []).find(
        (item) => item.id === settings.linkedPlayerId,
      )
      if (player) {
        links[groupStorageKey(settings.lastGroupCode)] = {
          playerId: player.id,
          playerName: player.name,
          linkedAt: new Date().toISOString(),
        }
      }
    }
    return {
      ...state,
      schemaVersion: 13,
      settings: {
        ...settings,
        profileDisplayName:
          settings.profileDisplayName ??
          (settings.linkedPlayerId
            ? (Array.isArray(state.players) ? state.players : []).find(
                (item) => item.id === settings.linkedPlayerId,
              )?.name ?? null
            : null),
        groupProfileLinks: links,
      },
    }
  },
  14: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    const merged = { ...state, settings, schemaVersion: 14 } as AppState
    if (settings.linkedPlayerId) {
      return finalizeProfileLink(merged)
    }
    return merged
  },
  15: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    let merged = {
      ...state,
      schemaVersion: 15,
      settings: {
        ...settings,
        groupMemberRole: settings.groupMemberRole ?? null,
        lastCloudBackupAt: settings.lastCloudBackupAt ?? null,
        autoBackupOnLogin: settings.autoBackupOnLogin ?? true,
      },
    } as AppState
    const linkedId = merged.settings.linkedPlayerId
    const profileId = merged.settings.profileIdentityId
    if (profileId && linkedId && !isTestGroupCode(merged.settings.lastGroupCode)) {
      merged = {
        ...merged,
        profileLifetime: rebuildLifetimeFromMatches(
          profileId,
          linkedId,
          merged.players,
          merged.matches,
        ),
      }
    }
    if (linkedId) {
      merged = reconcileAchievementUnlocks(merged, linkedId).state
    }
    return merged
  },
  16: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    let merged = {
      ...state,
      schemaVersion: 16,
      settings: {
        ...settings,
      },
    } as AppState
    const linkedId = merged.settings.linkedPlayerId
    const profileId = merged.settings.profileIdentityId
    if (profileId && linkedId && !isTestGroupCode(merged.settings.lastGroupCode)) {
      merged = {
        ...merged,
        profileLifetime: rebuildLifetimeFromMatches(
          profileId,
          linkedId,
          merged.players,
          merged.matches,
        ),
      }
    }
    if (linkedId) {
      merged = reconcileAchievementUnlocks(merged, linkedId).state
    }
    return merged
  },
  17: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? { ...defaults.settings, ...(state.settings as AppState['settings']) }
        : defaults.settings
    const { historicalImportUsedAt: _a, historicalImportBatchId: _b, ...restSettings } =
      settings as AppState['settings'] & {
        historicalImportUsedAt?: string | null
        historicalImportBatchId?: string | null
      }
    return {
      ...state,
      schemaVersion: 17,
      settings: restSettings,
    } as AppState
  },
  18: (state) => {
    const defaults = createDefaultAppState()
    const settings =
      state.settings && typeof state.settings === 'object'
        ? {
            ...defaults.settings,
            ...(state.settings as AppState['settings']),
            groupMemberBannedAt:
              (state.settings as AppState['settings']).groupMemberBannedAt ?? null,
            cloudUserId: (state.settings as AppState['settings']).cloudUserId ?? null,
          }
        : defaults.settings
    const players = (Array.isArray(state.players) ? state.players : defaults.players).map(
      (player) => ({
        ...player,
        linkedUserId: player.linkedUserId ?? null,
      }),
    )
    return {
      ...state,
      schemaVersion: 18,
      settings,
      players,
    } as AppState
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
      linkedUserId: player.linkedUserId ?? null,
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
    auditLog: Array.isArray(raw.auditLog) ? raw.auditLog : defaults.auditLog,
    activeMatches: Array.isArray(raw.activeMatches)
      ? raw.activeMatches.map((match) => ({
          ...match,
          tableSlot: typeof match.tableSlot === 'number' ? match.tableSlot : null,
          startedAt: match.startedAt ?? null,
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
    profileLifetime: raw.profileLifetime ?? defaults.profileLifetime,
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
  const normalized = ensureProfileIdentityId(state)
  const { personal, group } = splitAppState(normalized)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  } catch (error) {
    console.error('Failed to save OPCG Tracker state', error)
  }

  void (async () => {
    try {
      await savePersonalState(personal)
      if (normalized.settings.lastGroupCode) {
        await saveGroupScopedState(groupStorageKey(normalized.settings.lastGroupCode), group)
      } else {
        await saveOfflineGroupState(group)
      }
    } catch (error) {
      console.error('Failed to save OPCG Tracker layered state', error)
    }
  })()
}

async function loadLayeredAppState(): Promise<AppState | null> {
  const personal = await loadPersonalState()
  if (personal) {
    const groupCode = personal.settings.lastGroupCode
    const group = groupCode
      ? (await loadGroupScopedState(groupStorageKey(groupCode))) ?? emptyGroupSnapshot()
      : (await loadOfflineGroupState()) ?? emptyGroupSnapshot()
    return migrateState(mergePersonalAndGroup(personal, group))
  }
  return null
}

async function migrateMonolithToLayers(state: Partial<AppState>): Promise<AppState> {
  const migrated = migrateState(state)
  const { personal, group } = splitAppState(migrated)
  await savePersonalState(personal)
  if (migrated.settings.lastGroupCode) {
    await saveGroupScopedState(groupStorageKey(migrated.settings.lastGroupCode), group)
  } else {
    await saveOfflineGroupState(group)
  }
  await clearLegacyMonolithState()
  return migrated
}

export async function loadAppState(): Promise<AppState> {
  try {
    const layered = await loadLayeredAppState()
    if (layered) {
      return layered
    }
  } catch (error) {
    console.error('Failed to load OPCG Tracker layered state', error)
  }

  try {
    const legacyRaw = await loadLegacyMonolithState()
    if (legacyRaw) {
      return migrateMonolithToLayers(legacyRaw as Partial<AppState>)
    }
  } catch (error) {
    console.error('Failed to load legacy IndexedDB state', error)
  }

  const localState = loadLocalAppState()
  if (localState) {
    return migrateMonolithToLayers(localState)
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
