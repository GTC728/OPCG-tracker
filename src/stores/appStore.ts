import { create } from 'zustand'
import { APP_VERSION, createDefaultAppState } from '@/lib/constants'
import { hasExplicitSessionRoster, resolveDeckQuery, resolvePlayerName } from '@/lib/selectors'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { createSession, findOpenSessionForToday, mergeSessionsState } from '@/lib/sessions'
import { findFirstEmptyTableSlot, getActiveMatchForTableSlot, getSessionTableCount, MAX_TABLE_COUNT } from '@/lib/tableMode'
import {
  notifyGroupCollabChange,
  pauseGroupCollabNotify,
  resumeGroupCollabNotify,
} from '@/lib/groupSync'
import { evaluateNewAchievementUnlocks } from '@/lib/achievements'
import { applyProfileClaim, assertNameConfirmation, ProfileClaimError, unlinkProfile as unlinkProfileState } from '@/lib/profileClaim'
import { loadAppState, saveAppState } from '@/lib/storage'
import { createId, nowIso } from '@/lib/utils'
import type {
  ActiveMatch,
  ActiveMatchInput,
  AppState,
  ImportMatchInput,
  ImportSummary,
  Language,
  Match,
  MatchEditInput,
  Player,
  PlayerInput,
  Session,
  TabId,
} from '@/types'

interface AppStore extends AppState {
  hydrated: boolean
  activeTab: TabId
  pendingAchievementToasts: string[]
  hydrate: () => Promise<void>
  setActiveTab: (tab: TabId) => void
  replaceState: (state: AppState) => void
  resetAllData: () => void
  ensureCurrentSession: () => Session
  createNewSession: (name?: string) => Session
  updateSessionName: (sessionId: string, name: string) => void
  switchSession: (sessionId: string) => void
  endCurrentSession: () => void
  archiveSession: (sessionId: string) => void
  unarchiveSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  mergeSessions: (sourceSessionId: string, targetSessionId: string) => void
  addPlayer: (input: PlayerInput) => Player
  updatePlayer: (id: string, input: PlayerInput) => void
  setPlayerArchived: (id: string, archived: boolean) => void
  mergePlayers: (sourcePlayerId: string, targetPlayerId: string) => void
  setDeckArchived: (id: string, archived: boolean) => void
  updateDeckAliases: (id: string, aliases: string[]) => void
  createActiveMatch: (input: ActiveMatchInput) => ActiveMatch
  createActiveMatchOnEmptyTable: (input: ActiveMatchInput) => ActiveMatch
  setActiveMatchFirstPlayer: (id: string, firstPlayerId: string | null) => void
  completeActiveMatch: (id: string, winnerPlayerId: string) => Match
  updateMatch: (id: string, input: MatchEditInput) => void
  undoCompletedMatch: (matchId: string) => void
  deleteMatch: (matchId: string) => void
  deletePlayer: (playerId: string) => void
  permanentlyDeleteDeck: (deckId: string) => void
  importMatches: (rows: ImportMatchInput[], filename: string, rawData: string) => ImportSummary
  setLanguage: (language: Language) => void
  completeOnboarding: () => void
  updateSettings: (settings: Partial<AppState['settings']>) => void
  createAndClaimProfile: (input: PlayerInput) => Player
  linkProfileToPlayer: (playerId: string, nameConfirmation: string, forceReclaim?: boolean) => void
  unlinkProfile: () => void
  clearPendingAchievementToasts: () => void
  setSessionRoster: (sessionId: string, playerIds: string[]) => void
  setMatchNotes: (matchId: string, notes: string | null) => void
  openSessionRosterPrompt: (sessionId: string) => void
  dismissSessionRosterPrompt: () => void
  updateActiveMatch: (id: string, input: Partial<ActiveMatchInput>) => void
  setSessionTableCount: (sessionId: string, count: number) => void
  assignTableSide: (
    sessionId: string,
    tableSlot: number,
    side: 'left' | 'right',
    assignment: { playerId?: string; deckId?: string },
  ) => ActiveMatch
  clearActiveMatch: (id: string) => void
}

function toPersistedState(store: AppStore): AppState {
  return {
    schemaVersion: store.schemaVersion,
    appVersion: APP_VERSION,
    currentSessionId: store.currentSessionId,
    players: store.players,
    playerAliases: store.playerAliases,
    leaders: store.leaders,
    deckVariants: store.deckVariants,
    sessionPlayers: store.sessionPlayers,
    sessionDecks: store.sessionDecks,
    decks: store.decks,
    sessions: store.sessions,
    activeMatches: store.activeMatches,
    matches: store.matches,
    matchRevisions: store.matchRevisions,
    importBatches: store.importBatches,
    importRows: store.importRows,
    importRecords: store.importRecords,
    achievementUnlocks: store.achievementUnlocks,
    settings: store.settings,
  }
}

function applyAchievementUnlocks(state: AppState, playerIds: string[]): { state: AppState; unlockedIds: string[] } {
  const linkedId = state.settings.linkedPlayerId
  const targets = linkedId && playerIds.includes(linkedId) ? [linkedId] : playerIds
  const unlockedIds: string[] = []
  let nextState = state

  for (const playerId of targets) {
    const fresh = evaluateNewAchievementUnlocks(nextState, playerId)
    if (!fresh.length) continue
    unlockedIds.push(...fresh.map((item) => item.achievementId))
    nextState = {
      ...nextState,
      achievementUnlocks: [...nextState.achievementUnlocks, ...fresh],
    }
  }

  return { state: nextState, unlockedIds }
}

let lastPersistedAppState: AppState | null = null

function persist(state: AppState): AppState {
  const prev = lastPersistedAppState
  const persisted = { ...state, appVersion: APP_VERSION }
  saveAppState(persisted)
  lastPersistedAppState = persisted
  notifyGroupCollabChange(prev, persisted)
  return persisted
}

function ensureSessionState(state: AppState): { state: AppState; session: Session } {
  const currentSession =
    state.sessions.find(
      (session) =>
        session.id === state.currentSessionId &&
        session.deletedAt === null &&
        session.endedAt === null,
    ) ?? null

  if (currentSession) {
    return { state, session: currentSession }
  }

  const todaySession = findOpenSessionForToday(state.sessions)
  if (todaySession) {
    return {
      state: { ...state, currentSessionId: todaySession.id },
      session: todaySession,
    }
  }

  const session = createSession()

  return {
    state: {
      ...state,
      currentSessionId: session.id,
      sessions: [session, ...state.sessions],
    },
    session,
  }
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeUniqueList(values: string[]): string[] {
  const seen = new Set<string>()

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeName(value)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function createPlayerAliasRecords(playerId: string, aliases: string[], source: 'manual' | 'import' | 'merge') {
  return normalizeUniqueList(aliases).map((alias) => ({
    id: createId(),
    playerId,
    alias,
    source,
  }))
}

function assertUniquePlayerName(players: Player[], name: string, currentId?: string): void {
  const target = normalizeName(name)
  const exists = players.some(
    (player) =>
      player.id !== currentId &&
      !player.deletedAt &&
      normalizeName(player.name) === target,
  )

  if (exists) {
    throw new Error('已有同名玩家')
  }
}

function getNextMatchNumber(state: AppState, sessionId: string): number {
  const usedNumbers = new Set<number>()

  for (const activeMatch of state.activeMatches) {
    if (activeMatch.sessionId === sessionId) {
      usedNumbers.add(activeMatch.matchNumber)
    }
  }

  for (const match of state.matches) {
    if (match.sessionId === sessionId) {
      usedNumbers.add(match.matchNumber)
    }
  }

  let candidate = 1
  while (usedNumbers.has(candidate)) {
    candidate += 1
  }

  return candidate
}

function assertValidActiveMatchInput(state: AppState, input: ActiveMatchInput): void {
  if (!input.player1Id || !input.player2Id || !input.deck1Id || !input.deck2Id) {
    throw new Error('請選擇兩位玩家與兩副牌組')
  }
  assertActiveMatchFields(state, input)
}

function assertActiveMatchFields(state: AppState, input: ActiveMatchInput): void {
  if (input.player1Id && input.player2Id && input.player1Id === input.player2Id) {
    throw new Error('玩家 A 與玩家 B 不能相同')
  }

  const players = new Set(state.players.filter(isSelectablePlayer).map((player) => player.id))
  const decks = new Set(state.decks.filter((deck) => !deck.archived).map((deck) => deck.id))

  if (input.player1Id && !players.has(input.player1Id)) {
    throw new Error('玩家不存在或已封存')
  }
  if (input.player2Id && !players.has(input.player2Id)) {
    throw new Error('玩家不存在或已封存')
  }
  if (input.deck1Id && !decks.has(input.deck1Id)) {
    throw new Error('牌組不存在或已封存')
  }
  if (input.deck2Id && !decks.has(input.deck2Id)) {
    throw new Error('牌組不存在或已封存')
  }

  if (
    input.firstPlayerId !== null &&
    input.firstPlayerId !== input.player1Id &&
    input.firstPlayerId !== input.player2Id
  ) {
    throw new Error('先攻玩家必須是玩家 A 或玩家 B')
  }
}

function isCompleteActiveMatchInput(input: ActiveMatchInput): boolean {
  return Boolean(input.player1Id && input.player2Id && input.deck1Id && input.deck2Id)
}

function findOrCreatePlayer(state: AppState, name: string): { state: AppState; player: Player } {
  const existing = resolvePlayerName(state, name)

  if (existing) {
    return { state, player: existing }
  }

  const timestamp = nowIso()
  const player: Player = {
    id: createId(),
    name: name.trim(),
    aliases: [],
    archived: false,
    deletedAt: null,
    profileClaimDeviceId: null,
    profileClaimedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    state: { ...state, players: [player, ...state.players] },
    player,
  }
}

function findDeckByQuery(state: AppState, query: string) {
  return resolveDeckQuery(state, query)?.legacyDeck ?? null
}

function rosterPromptPatch(state: AppState, sessionId: string): AppState['settings'] {
  const activeCount = state.players.filter(isSelectablePlayer).length
  const shouldPrompt = activeCount >= 2 && !hasExplicitSessionRoster(state, sessionId)
  return {
    ...state.settings,
    rosterPromptSessionId: shouldPrompt ? sessionId : null,
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createDefaultAppState(),
  hydrated: false,
  activeTab: 'record',
  pendingAchievementToasts: [],

  hydrate: async () => {
    try {
      const loaded = await loadAppState()
      const { state } = ensureSessionState(loaded)
      const persisted = persist(state)
      set({ ...persisted, hydrated: true })
    } catch (error) {
      console.error('Failed to hydrate OPCG Tracker state', error)
      const { state } = ensureSessionState(createDefaultAppState())
      const persisted = persist(state)
      set({ ...persisted, hydrated: true })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  replaceState: (state) => {
    pauseGroupCollabNotify()
    try {
      lastPersistedAppState = null
      const { state: nextState } = ensureSessionState(state)
      const persisted = persist(nextState)
      set({ ...persisted, hydrated: true })
    } finally {
      resumeGroupCollabNotify()
    }
  },

  resetAllData: () => {
    const { state } = ensureSessionState(createDefaultAppState())
    const persisted = persist(state)
    set({ ...persisted, hydrated: true })
  },

  ensureCurrentSession: () => {
    const current = getAppState()
    const { state, session } = ensureSessionState(current)
    const persisted = persist(state)
    set({ ...persisted })
    return session
  },

  createNewSession: (name) => {
    const current = getAppState()
    const session = createSession(name)
    const nextState = {
      ...current,
      currentSessionId: session.id,
      sessions: [session, ...current.sessions],
    }
    const next = persist({
      ...nextState,
      settings: rosterPromptPatch(nextState, session.id),
    })
    set({ ...next })
    return session
  },

  updateSessionName: (sessionId, name) => {
    const current = getAppState()
    const trimmedName = name.trim()
    if (!trimmedName) throw new Error('Session 名稱不能留空')
    const next = persist({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, name: trimmedName } : session,
      ),
    })
    set({ ...next })
  },

  switchSession: (sessionId) => {
    const current = getAppState()
    const target = current.sessions.find((session) => session.id === sessionId)
    if (!target || target.deletedAt !== null) throw new Error('找不到 Session')

    const updatedSessions = current.sessions.map((session) =>
      session.id === sessionId ? { ...session, endedAt: null } : session,
    )
    const nextState = {
      ...current,
      currentSessionId: sessionId,
      sessions: updatedSessions,
    }
    const next = persist({
      ...nextState,
      settings: rosterPromptPatch(nextState, sessionId),
    })
    set({ ...next })
  },

  endCurrentSession: () => {
    const current = getAppState()
    if (!current.currentSessionId) return

    const next = persist({
      ...current,
      currentSessionId: null,
      sessions: current.sessions.map((session) =>
        session.id === current.currentSessionId && session.endedAt === null
          ? { ...session, endedAt: nowIso() }
          : session,
      ),
    })
    set({ ...next })
  },

  archiveSession: (sessionId) => {
    const current = getAppState()
    const target = current.sessions.find((session) => session.id === sessionId)
    if (!target || target.deletedAt !== null) throw new Error('找不到 Session')
    if (target.archivedAt !== null) return

    const timestamp = nowIso()
    let nextCurrentId = current.currentSessionId
    if (current.currentSessionId === sessionId) {
      const fallback =
        current.sessions.find(
          (session) =>
            session.id !== sessionId &&
            session.deletedAt === null &&
            session.archivedAt === null &&
            session.endedAt === null,
        ) ??
        current.sessions.find(
          (session) =>
            session.id !== sessionId && session.deletedAt === null && session.archivedAt === null,
        ) ??
        null
      nextCurrentId = fallback?.id ?? null
    }

    const next = persist({
      ...current,
      currentSessionId: nextCurrentId,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, archivedAt: timestamp } : session,
      ),
    })
    set({ ...next })
  },

  unarchiveSession: (sessionId) => {
    const current = getAppState()
    const target = current.sessions.find((session) => session.id === sessionId)
    if (!target || target.deletedAt !== null) throw new Error('找不到 Session')

    const next = persist({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, archivedAt: null } : session,
      ),
    })
    set({ ...next })
  },

  deleteSession: (sessionId) => {
    const current = getAppState()
    const target = current.sessions.find((session) => session.id === sessionId)
    if (!target || target.deletedAt !== null) throw new Error('找不到 Session')

    const timestamp = nowIso()
    const wasCurrent = current.currentSessionId === sessionId
    let nextCurrentId = wasCurrent ? null : current.currentSessionId

    if (wasCurrent) {
      const fallback =
        current.sessions.find(
          (session) =>
            session.id !== sessionId &&
            session.deletedAt === null &&
            session.archivedAt === null &&
            session.endedAt === null,
        ) ??
        current.sessions.find(
          (session) =>
            session.id !== sessionId && session.deletedAt === null && session.archivedAt === null,
        ) ??
        null
      nextCurrentId = fallback?.id ?? null
    }

    const next = persist({
      ...current,
      currentSessionId: nextCurrentId,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, deletedAt: timestamp } : session,
      ),
      matches: current.matches.map((match) =>
        match.sessionId === sessionId && match.deletedAt === null
          ? { ...match, deletedAt: timestamp, source: 'manual_edit' }
          : match,
      ),
      activeMatches: current.activeMatches.filter((match) => match.sessionId !== sessionId),
    })
    set({ ...next })
  },

  mergeSessions: (sourceSessionId, targetSessionId) => {
    const current = getAppState()
    const next = persist(mergeSessionsState(current, sourceSessionId, targetSessionId))
    set({ ...next })
  },

  addPlayer: (input) => {
    const current = getAppState()
    const name = input.name.trim()
    if (!name) throw new Error('玩家名稱不能留空')
    assertUniquePlayerName(current.players, name)

    const timestamp = nowIso()
    const player: Player = {
      id: createId(),
      name,
      aliases: normalizeUniqueList(input.aliases),
      archived: false,
      deletedAt: null,
      profileClaimDeviceId: null,
      profileClaimedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const next = persist({
      ...current,
      players: [player, ...current.players],
      playerAliases: [
        ...createPlayerAliasRecords(player.id, player.aliases, 'manual'),
        ...current.playerAliases,
      ],
    })
    set({ ...next })
    return player
  },

  updatePlayer: (id, input) => {
    const current = getAppState()
    const name = input.name.trim()
    if (!name) throw new Error('玩家名稱不能留空')
    assertUniquePlayerName(current.players, name, id)

    const aliases = normalizeUniqueList(input.aliases)
    const next = persist({
      ...current,
      players: current.players.map((player) =>
        player.id === id
          ? {
              ...player,
              name,
              aliases,
              updatedAt: nowIso(),
            }
          : player,
      ),
      playerAliases: [
        ...createPlayerAliasRecords(id, aliases, 'manual'),
        ...current.playerAliases.filter((alias) => alias.playerId !== id),
      ],
    })
    set({ ...next })
  },

  setPlayerArchived: (id, archived) => {
    const current = getAppState()
    const next = persist({
      ...current,
      players: current.players.map((player) =>
        player.id === id ? { ...player, archived, updatedAt: nowIso() } : player,
      ),
    })
    set({ ...next })
  },

  mergePlayers: (sourcePlayerId, targetPlayerId) => {
    if (sourcePlayerId === targetPlayerId) {
      throw new Error('不能合併同一位玩家')
    }

    const current = getAppState()
    const source = current.players.find((player) => player.id === sourcePlayerId)
    const target = current.players.find((player) => player.id === targetPlayerId)
    if (!source || !target) {
      throw new Error('找不到要合併的玩家')
    }

    const mergedAliases = normalizeUniqueList([target.name, ...target.aliases, source.name, ...source.aliases])
    const next = persist({
      ...current,
      players: current.players
        .filter((player) => player.id !== sourcePlayerId)
        .map((player) =>
          player.id === targetPlayerId
            ? { ...player, aliases: mergedAliases, updatedAt: nowIso() }
            : player,
        ),
      playerAliases: [
        ...createPlayerAliasRecords(targetPlayerId, mergedAliases, 'merge'),
        ...current.playerAliases.filter(
          (alias) => alias.playerId !== sourcePlayerId && alias.playerId !== targetPlayerId,
        ),
      ],
      activeMatches: current.activeMatches.map((match) => ({
        ...match,
        player1Id: match.player1Id === sourcePlayerId ? targetPlayerId : match.player1Id,
        player2Id: match.player2Id === sourcePlayerId ? targetPlayerId : match.player2Id,
        firstPlayerId: match.firstPlayerId === sourcePlayerId ? targetPlayerId : match.firstPlayerId,
      })),
      matches: current.matches.map((match) => ({
        ...match,
        player1Id: match.player1Id === sourcePlayerId ? targetPlayerId : match.player1Id,
        player2Id: match.player2Id === sourcePlayerId ? targetPlayerId : match.player2Id,
        winnerPlayerId: match.winnerPlayerId === sourcePlayerId ? targetPlayerId : match.winnerPlayerId,
        firstPlayerId: match.firstPlayerId === sourcePlayerId ? targetPlayerId : match.firstPlayerId,
        source: 'manual_edit',
      })),
    })
    set({ ...next })
  },

  setDeckArchived: (id, archived) => {
    const current = getAppState()
    const next = persist({
      ...current,
      deckVariants: current.deckVariants.map((variant) =>
        variant.id === id ? { ...variant, archived, updatedAt: nowIso() } : variant,
      ),
      decks: current.decks.map((deck) =>
        deck.id === id ? { ...deck, archived, updatedAt: nowIso() } : deck,
      ),
    })
    set({ ...next })
  },

  updateDeckAliases: (id, aliases) => {
    const current = getAppState()
    const normalizedAliases = normalizeUniqueList(aliases)
    const next = persist({
      ...current,
      deckVariants: current.deckVariants.map((variant) =>
        variant.id === id ? { ...variant, aliases: normalizedAliases, updatedAt: nowIso() } : variant,
      ),
      decks: current.decks.map((deck) =>
        deck.id === id ? { ...deck, aliases: normalizedAliases, updatedAt: nowIso() } : deck,
      ),
    })
    set({ ...next })
  },

  createActiveMatch: (input) => {
    const current = getAppState()
    const { state, session } = ensureSessionState(current)
    assertValidActiveMatchInput(state, input)

    const tableSlot =
      input.tableSlot ??
      findFirstEmptyTableSlot(state, session.id)

    const activeMatch: ActiveMatch = {
      id: createId(),
      sessionId: session.id,
      matchNumber: getNextMatchNumber(state, session.id),
      tableSlot: tableSlot ?? null,
      player1Id: input.player1Id,
      deck1Id: input.deck1Id,
      player2Id: input.player2Id,
      deck2Id: input.deck2Id,
      firstPlayerId: input.firstPlayerId,
      startedAt: nowIso(),
      notes: input.notes?.trim() || null,
    }

    const next = persist({
      ...state,
      activeMatches: [activeMatch, ...state.activeMatches],
    })
    set({ ...next })
    return activeMatch
  },

  createActiveMatchOnEmptyTable: (input) => {
    const current = getAppState()
    const sessionId = current.currentSessionId
    if (!sessionId) throw new Error('請先開始場次')

    let slot = findFirstEmptyTableSlot(current, sessionId)
    if (!slot) {
      const count = getSessionTableCount(current, sessionId)
      if (count >= MAX_TABLE_COUNT) {
        throw new Error('沒有空桌，請先清空一桌或完成對局')
      }
      get().setSessionTableCount(sessionId, count + 1)
      slot = getSessionTableCount(getAppState(), sessionId)
    }

    return get().createActiveMatch({ ...input, tableSlot: slot })
  },

  setActiveMatchFirstPlayer: (id, firstPlayerId) => {
    const current = getAppState()
    const activeMatch = current.activeMatches.find((match) => match.id === id)
    if (!activeMatch) return
    if (
      firstPlayerId !== null &&
      firstPlayerId !== activeMatch.player1Id &&
      firstPlayerId !== activeMatch.player2Id
    ) {
      throw new Error('先攻玩家必須是玩家 A 或玩家 B')
    }

    const next = persist({
      ...current,
      activeMatches: current.activeMatches.map((match) =>
        match.id === id ? { ...match, firstPlayerId } : match,
      ),
    })
    set({ ...next })
  },

  completeActiveMatch: (id, winnerPlayerId) => {
    const current = getAppState()
    const activeMatch = current.activeMatches.find((match) => match.id === id)
    if (!activeMatch) {
      throw new Error('找不到進行中對局')
    }

    assertValidActiveMatchInput(current, {
      player1Id: activeMatch.player1Id,
      deck1Id: activeMatch.deck1Id,
      player2Id: activeMatch.player2Id,
      deck2Id: activeMatch.deck2Id,
      firstPlayerId: activeMatch.firstPlayerId,
      notes: activeMatch.notes,
    })

    if (winnerPlayerId !== activeMatch.player1Id && winnerPlayerId !== activeMatch.player2Id) {
      throw new Error('勝方必須是對局中的玩家')
    }

    const winnerDeckId =
      winnerPlayerId === activeMatch.player1Id ? activeMatch.deck1Id : activeMatch.deck2Id

    const match: Match = {
      id: activeMatch.id,
      sessionId: activeMatch.sessionId,
      matchNumber: activeMatch.matchNumber,
      player1Id: activeMatch.player1Id,
      deck1Id: activeMatch.deck1Id,
      player2Id: activeMatch.player2Id,
      deck2Id: activeMatch.deck2Id,
      winnerPlayerId,
      winnerDeckId,
      firstPlayerId: activeMatch.firstPlayerId,
      resultType: 'normal',
      startedAt: activeMatch.startedAt,
      finishedAt: nowIso(),
      source: 'manual',
      deletedAt: null,
      notes: activeMatch.notes,
    }

    const next = persist({
      ...current,
      activeMatches: current.activeMatches.filter((item) => item.id !== id),
      matches: [match, ...current.matches],
    })
    const achievementResult = applyAchievementUnlocks(next, [
      match.player1Id,
      match.player2Id,
    ])
    const persisted = persist(achievementResult.state)
    set({
      ...persisted,
      pendingAchievementToasts: [
        ...get().pendingAchievementToasts,
        ...achievementResult.unlockedIds,
      ],
    })
    return match
  },

  updateMatch: (id, input) => {
    const current = getAppState()
    if (
      !input.player1Id ||
      !input.player2Id ||
      !input.deck1Id ||
      !input.deck2Id ||
      !input.winnerPlayerId
    ) {
      throw new Error('請填齊玩家、牌組與勝方')
    }
    if (input.player1Id === input.player2Id) {
      throw new Error('玩家 A 與玩家 B 不能相同')
    }
    if (input.winnerPlayerId !== input.player1Id && input.winnerPlayerId !== input.player2Id) {
      throw new Error('勝方必須是玩家 A 或玩家 B')
    }
    if (
      input.firstPlayerId !== null &&
      input.firstPlayerId !== input.player1Id &&
      input.firstPlayerId !== input.player2Id
    ) {
      throw new Error('先攻玩家必須是玩家 A 或玩家 B')
    }

    const winnerDeckId = input.winnerPlayerId === input.player1Id ? input.deck1Id : input.deck2Id
    const beforeMatch = current.matches.find((match) => match.id === id)
    if (!beforeMatch) {
      throw new Error('找不到完成對局')
    }
    const afterMatch: Match = {
      ...beforeMatch,
      player1Id: input.player1Id,
      deck1Id: input.deck1Id,
      player2Id: input.player2Id,
      deck2Id: input.deck2Id,
      winnerPlayerId: input.winnerPlayerId,
      winnerDeckId,
      firstPlayerId: input.firstPlayerId,
      notes: input.notes?.trim() || null,
      source: 'manual_edit',
    }
    const next = persist({
      ...current,
      matches: current.matches.map((match) => (match.id === id ? afterMatch : match)),
      matchRevisions: [
        {
          id: createId(),
          matchId: id,
          editedAt: nowIso(),
          before: beforeMatch,
          after: afterMatch,
          reason: 'manual_edit',
        },
        ...current.matchRevisions,
      ],
    })
    set({ ...next })
  },

  undoCompletedMatch: (matchId) => {
    const current = getAppState()
    const match = current.matches.find((item) => item.id === matchId)
    if (!match || match.deletedAt !== null) return

    let tableSlot = findFirstEmptyTableSlot(current, match.sessionId)
    if (!tableSlot) {
      const count = getSessionTableCount(current, match.sessionId)
      if (count < MAX_TABLE_COUNT) {
        get().setSessionTableCount(match.sessionId, count + 1)
        tableSlot = getSessionTableCount(getAppState(), match.sessionId)
      }
    }

    const activeMatch: ActiveMatch = {
      id: match.id,
      sessionId: match.sessionId,
      matchNumber: match.matchNumber,
      tableSlot: tableSlot ?? null,
      player1Id: match.player1Id,
      deck1Id: match.deck1Id,
      player2Id: match.player2Id,
      deck2Id: match.deck2Id,
      firstPlayerId: match.firstPlayerId,
      startedAt: match.startedAt,
      notes: match.notes,
    }

    const next = persist({
      ...current,
      matches: current.matches.filter((item) => item.id !== matchId),
      activeMatches: [activeMatch, ...current.activeMatches],
    })
    set({ ...next })
  },

  deleteMatch: (matchId) => {
    const current = getAppState()
    const match = current.matches.find((item) => item.id === matchId)
    if (!match) throw new Error('找不到對局')
    if (match.deletedAt !== null) return

    const next = persist({
      ...current,
      matches: current.matches.map((item) =>
        item.id === matchId
          ? { ...item, deletedAt: nowIso(), source: 'manual_edit' as const }
          : item,
      ),
    })
    set({ ...next })
  },

  deletePlayer: (playerId) => {
    const current = getAppState()
    const player = current.players.find((item) => item.id === playerId)
    if (!player) throw new Error('找不到玩家')
    if (player.deletedAt !== null) return

    const timestamp = nowIso()
    const next = persist({
      ...current,
      players: current.players.map((item) =>
        item.id === playerId ? { ...item, deletedAt: timestamp, updatedAt: timestamp } : item,
      ),
      sessionPlayers: current.sessionPlayers.filter((item) => item.playerId !== playerId),
    })
    set({ ...next })
  },

  permanentlyDeleteDeck: (deckId) => {
    const current = getAppState()
    const deck = current.decks.find((item) => item.id === deckId)
    if (!deck) throw new Error('找不到牌組')

    const next = persist({
      ...current,
      decks: current.decks.filter((item) => item.id !== deckId),
      sessionDecks: current.sessionDecks.filter((item) => item.deckVariantId !== deckId),
    })
    set({ ...next })
  },

  importMatches: (rows, filename, rawData) => {
    let state = getAppState()
    const errors: Array<{ row: number; message: string }> = []
    const createdMatches: Match[] = []
      const createdMatchIdsByRow = new Map<number, string>()
    const { state: stateWithSession, session } = ensureSessionState(state)
    state = stateWithSession

    rows.forEach((row, index) => {
        const rowNumber = index + 2
      try {
        if (!row.player1Name || !row.player2Name || !row.deck1Query || !row.deck2Query || !row.winnerName) {
          throw new Error('缺少玩家、牌組或勝方')
        }

        const p1 = findOrCreatePlayer(state, row.player1Name)
        state = p1.state
        const p2 = findOrCreatePlayer(state, row.player2Name)
        state = p2.state

        if (p1.player.id === p2.player.id) {
          throw new Error('玩家 A 與玩家 B 不能相同')
        }

        const deck1 = findDeckByQuery(state, row.deck1Query)
        const deck2 = findDeckByQuery(state, row.deck2Query)
        if (!deck1) throw new Error(`找不到牌組 A：${row.deck1Query}`)
        if (!deck2) throw new Error(`找不到牌組 B：${row.deck2Query}`)

        const winnerNormalized = normalizeName(row.winnerName)
        const winnerPlayerId =
          normalizeName(p1.player.name) === winnerNormalized ||
          p1.player.aliases.some((alias) => normalizeName(alias) === winnerNormalized)
            ? p1.player.id
            : normalizeName(p2.player.name) === winnerNormalized ||
                p2.player.aliases.some((alias) => normalizeName(alias) === winnerNormalized)
              ? p2.player.id
              : null

        if (!winnerPlayerId) {
          throw new Error(`勝方不屬於此對局：${row.winnerName}`)
        }

        const firstNormalized = row.firstPlayerName ? normalizeName(row.firstPlayerName) : ''
        const firstPlayerId = firstNormalized
          ? normalizeName(p1.player.name) === firstNormalized ||
            p1.player.aliases.some((alias) => normalizeName(alias) === firstNormalized)
            ? p1.player.id
            : normalizeName(p2.player.name) === firstNormalized ||
                p2.player.aliases.some((alias) => normalizeName(alias) === firstNormalized)
              ? p2.player.id
              : null
          : null

        const startedAt = row.date ? new Date(row.date).toISOString() : nowIso()
        const match: Match = {
          id: createId(),
          sessionId: session.id,
          matchNumber: getNextMatchNumber(
            { ...state, matches: [...state.matches, ...createdMatches] },
            session.id,
          ),
          player1Id: p1.player.id,
          deck1Id: deck1.id,
          player2Id: p2.player.id,
          deck2Id: deck2.id,
          winnerPlayerId,
          winnerDeckId: winnerPlayerId === p1.player.id ? deck1.id : deck2.id,
          firstPlayerId,
          resultType: 'normal',
          startedAt,
          finishedAt: startedAt,
          source: 'import',
          deletedAt: null,
          notes: row.notes?.trim() || null,
        }
        createdMatches.push(match)
          createdMatchIdsByRow.set(rowNumber, match.id)
      } catch (caught) {
        errors.push({
            row: rowNumber,
          message: caught instanceof Error ? caught.message : '匯入失敗',
        })
      }
    })

    const importRecord = {
      id: createId(),
      filename,
      importedAt: nowIso(),
      totalRows: rows.length,
      successCount: createdMatches.length,
      errorCount: errors.length,
      errors,
      rawData,
    }
    const importBatch = {
      id: importRecord.id,
      filename,
      importedAt: importRecord.importedAt,
      schemaVersion: state.schemaVersion,
      totalRows: rows.length,
      successCount: createdMatches.length,
      errorCount: errors.length,
      rawFileHash: `${rawData.length}:${filename}`,
    }
    const importRows = rows.map((row, index) => {
      const rowNumber = index + 2
      const error = errors.find((item) => item.row === rowNumber)

      return {
        id: createId(),
        batchId: importBatch.id,
        rowNumber,
        raw: {
          date: row.date ?? '',
          player1Name: row.player1Name,
          deck1Query: row.deck1Query,
          player2Name: row.player2Name,
          deck2Query: row.deck2Query,
          winnerName: row.winnerName,
          firstPlayerName: row.firstPlayerName ?? '',
          notes: row.notes ?? '',
        },
        status: error ? ('error' as const) : ('imported' as const),
        errorMessage: error?.message ?? null,
        matchId: createdMatchIdsByRow.get(rowNumber) ?? null,
      }
    })

    const next = persist({
      ...state,
      matches: [...createdMatches, ...state.matches],
      importBatches: [importBatch, ...state.importBatches],
      importRows: [...importRows, ...state.importRows],
      importRecords: [importRecord, ...state.importRecords],
    })
    set({ ...next })

    return {
      importRecord,
      createdMatches: createdMatches.length,
    }
  },

  setLanguage: (language) => {
    const current = getAppState()
    const next = persist({
      ...current,
      settings: {
        ...current.settings,
        language,
      },
    })
    set({ ...next })
  },

  completeOnboarding: () => {
    const current = getAppState()
    const next = persist({
      ...current,
      settings: {
        ...current.settings,
        onboardingCompleted: true,
      },
    })
    set({ ...next })
  },

  updateSettings: (settings) => {
    const current = getAppState()
    const next = persist({
      ...current,
      settings: {
        ...current.settings,
        ...settings,
      },
    })
    set({ ...next })
  },

  createAndClaimProfile: (input) => {
    const current = getAppState()
    const name = input.name.trim()
    if (!name) throw new Error('玩家名稱不能留空')
    assertUniquePlayerName(current.players, name)

    const timestamp = nowIso()
    const player: Player = {
      id: createId(),
      name,
      aliases: normalizeUniqueList(input.aliases),
      archived: false,
      deletedAt: null,
      profileClaimDeviceId: null,
      profileClaimedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const withPlayer = {
      ...current,
      players: [player, ...current.players],
      playerAliases: [
        ...createPlayerAliasRecords(player.id, player.aliases, 'manual'),
        ...current.playerAliases,
      ],
    }
    const claimed = applyProfileClaim(withPlayer, player.id)
    const persisted = persist(claimed)
    set({ ...persisted })
    return player
  },

  linkProfileToPlayer: (playerId, nameConfirmation, forceReclaim = false) => {
    const current = getAppState()
    const player = current.players.find((item) => item.id === playerId)
    if (!player) throw new ProfileClaimError('player_not_found', '找不到玩家。')
    assertNameConfirmation(player, nameConfirmation)
    const claimed = applyProfileClaim(current, playerId, { forceReclaim })
    const persisted = persist(claimed)
    set({ ...persisted })
  },

  unlinkProfile: () => {
    const current = getAppState()
    const persisted = persist(unlinkProfileState(current))
    set({ ...persisted })
  },

  clearPendingAchievementToasts: () => {
    set({ pendingAchievementToasts: [] })
  },

  setSessionRoster: (sessionId, playerIds) => {
    const current = getAppState()
    const uniqueIds = Array.from(new Set(playerIds))
    const next = persist({
      ...current,
      sessionPlayers: [
        ...current.sessionPlayers.filter((item) => item.sessionId !== sessionId),
        ...uniqueIds.map((playerId) => ({
          sessionId,
          playerId,
          defaultDeckVariantId: null,
        })),
      ],
      settings: {
        ...current.settings,
        rosterPromptSessionId:
          current.settings.rosterPromptSessionId === sessionId ? null : current.settings.rosterPromptSessionId,
      },
    })
    set({ ...next })
  },

  setMatchNotes: (matchId, notes) => {
    const current = getAppState()
    const next = persist({
      ...current,
      matches: current.matches.map((match) =>
        match.id === matchId ? { ...match, notes: notes?.trim() || null } : match,
      ),
    })
    set({ ...next })
  },

  openSessionRosterPrompt: (sessionId) => {
    const current = getAppState()
    const next = persist({
      ...current,
      settings: { ...current.settings, rosterPromptSessionId: sessionId },
    })
    set({ ...next })
  },

  dismissSessionRosterPrompt: () => {
    const current = getAppState()
    if (!current.settings.rosterPromptSessionId) return
    const next = persist({
      ...current,
      settings: { ...current.settings, rosterPromptSessionId: null },
    })
    set({ ...next })
  },

  updateActiveMatch: (id, input) => {
    const current = getAppState()
    const activeMatch = current.activeMatches.find((match) => match.id === id)
    if (!activeMatch) throw new Error('找不到進行中對局')

    const merged: ActiveMatchInput = {
      player1Id: input.player1Id ?? activeMatch.player1Id,
      deck1Id: input.deck1Id ?? activeMatch.deck1Id,
      player2Id: input.player2Id ?? activeMatch.player2Id,
      deck2Id: input.deck2Id ?? activeMatch.deck2Id,
      firstPlayerId: input.firstPlayerId !== undefined ? input.firstPlayerId : activeMatch.firstPlayerId,
      notes: activeMatch.notes,
    }
    assertActiveMatchFields(current, merged)
    if (isCompleteActiveMatchInput(merged)) {
      assertValidActiveMatchInput(current, merged)
    }

    const next = persist({
      ...current,
      activeMatches: current.activeMatches.map((match) =>
        match.id === id
          ? {
              ...match,
              player1Id: merged.player1Id,
              deck1Id: merged.deck1Id,
              player2Id: merged.player2Id,
              deck2Id: merged.deck2Id,
              firstPlayerId: merged.firstPlayerId,
              tableSlot: input.tableSlot !== undefined ? input.tableSlot ?? null : match.tableSlot,
            }
          : match,
      ),
    })
    set({ ...next })
  },

  setSessionTableCount: (sessionId, count) => {
    const current = getAppState()
    const nextCount = Math.max(1, Math.min(MAX_TABLE_COUNT, count))
    const blocked = current.activeMatches.some(
      (match) => match.sessionId === sessionId && match.tableSlot !== null && match.tableSlot > nextCount,
    )
    if (blocked) {
      throw new Error('請先清空或移走較高桌號的對局')
    }

    const next = persist({
      ...current,
      settings: {
        ...current.settings,
        sessionTableCounts: {
          ...current.settings.sessionTableCounts,
          [sessionId]: nextCount,
        },
      },
    })
    set({ ...next })
  },

  assignTableSide: (sessionId, tableSlot, side, assignment) => {
    const current = getAppState()
    const existing = getActiveMatchForTableSlot(current.activeMatches, sessionId, tableSlot)
    const base: ActiveMatchInput = existing
      ? {
          player1Id: existing.player1Id,
          deck1Id: existing.deck1Id,
          player2Id: existing.player2Id,
          deck2Id: existing.deck2Id,
          firstPlayerId: existing.firstPlayerId,
          notes: existing.notes,
          tableSlot,
        }
      : {
          player1Id: '',
          deck1Id: '',
          player2Id: '',
          deck2Id: '',
          firstPlayerId: null,
          notes: null,
          tableSlot,
        }

    const merged: ActiveMatchInput =
      side === 'left'
        ? {
            ...base,
            player1Id: assignment.playerId ?? base.player1Id,
            deck1Id: assignment.deckId ?? base.deck1Id,
          }
        : {
            ...base,
            player2Id: assignment.playerId ?? base.player2Id,
            deck2Id: assignment.deckId ?? base.deck2Id,
          }

    assertActiveMatchFields(current, merged)

    if (existing) {
      get().updateActiveMatch(existing.id, merged)
      return getAppState().activeMatches.find((match) => match.id === existing.id)!
    }

    if (!isCompleteActiveMatchInput(merged)) {
      const { state, session } = ensureSessionState(current)
      const activeMatch: ActiveMatch = {
        id: createId(),
        sessionId: session.id,
        matchNumber: getNextMatchNumber(state, session.id),
        tableSlot,
        player1Id: merged.player1Id,
        deck1Id: merged.deck1Id,
        player2Id: merged.player2Id,
        deck2Id: merged.deck2Id,
        firstPlayerId: merged.firstPlayerId,
        startedAt: nowIso(),
        notes: null,
      }
      const next = persist({
        ...state,
        activeMatches: [activeMatch, ...state.activeMatches],
      })
      set({ ...next })
      return activeMatch
    }

    return get().createActiveMatch(merged)
  },

  clearActiveMatch: (id) => {
    const current = getAppState()
    const next = persist({
      ...current,
      activeMatches: current.activeMatches.filter((match) => match.id !== id),
    })
    set({ ...next })
  },
}))

export function updateAppState(updater: (state: AppState) => AppState) {
  const current = getAppState()
  pauseGroupCollabNotify()
  try {
    const next = updater(current)
    const persisted = persist(next)
    useAppStore.setState({ ...persisted })
  } finally {
    resumeGroupCollabNotify()
  }
}

export function getAppState(): AppState {
  return toPersistedState(useAppStore.getState())
}
