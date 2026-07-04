import { getCloudSession, getSupabaseClient, resolveGroupKey } from '@/lib/cloudSync'
import type { ActiveMatch, AppState, Match, Player, Session } from '@/types'
import { getAppState, updateAppState } from '@/stores/appStore'

type SyncActiveRow = {
  id: string
  group_key: string
  session_id: string
  match_number: number
  table_slot: number | null
  player1_id: string
  deck1_id: string
  player2_id: string
  deck2_id: string
  first_player_id: string | null
  started_at: string
  notes: string | null
  updated_at: string
  updated_by: string
}

type SyncMatchRow = {
  id: string
  group_key: string
  session_id: string
  match_number: number
  player1_id: string
  deck1_id: string
  player2_id: string
  deck2_id: string
  winner_player_id: string
  winner_deck_id: string
  first_player_id: string | null
  result_type: string
  started_at: string
  finished_at: string
  notes: string | null
  source: string
  updated_at: string
  updated_by: string
  deleted_at: string | null
}

let flushTimer: ReturnType<typeof setTimeout> | null = null
let realtimeUnsubscribe: (() => void) | null = null
let flushRunning = false
let flushQueued = false
/** Local edit timestamp per active match id — blocks stale remote overwrites. */
const localActiveTouch = new Map<string, number>()
/** Local edit timestamp per completed match id. */
const localMatchTouch = new Map<string, number>()
/** Local edit timestamp per player id. */
const localPlayerTouch = new Map<string, number>()
/** Locally purged entity ids — block pull/realtime from restoring deleted rows. */
const localPurgedMatches = new Set<string>()
const localPurgedSessions = new Set<string>()
const localPurgedPlayers = new Set<string>()

function touchLocalActive(ids: Iterable<string>): void {
  const now = Date.now()
  for (const id of ids) localActiveTouch.set(id, now)
}

function touchLocalPlayers(ids: Iterable<string>): void {
  const now = Date.now()
  for (const id of ids) localPlayerTouch.set(id, now)
}

function touchLocalMatches(ids: Iterable<string>): void {
  const now = Date.now()
  for (const id of ids) localMatchTouch.set(id, now)
}

function activePayloadChanged(before: ActiveMatch, after: ActiveMatch): boolean {
  return (
    before.sessionId !== after.sessionId ||
    before.player1Id !== after.player1Id ||
    before.player2Id !== after.player2Id ||
    before.deck1Id !== after.deck1Id ||
    before.deck2Id !== after.deck2Id ||
    before.firstPlayerId !== after.firstPlayerId ||
    before.tableSlot !== after.tableSlot ||
    before.notes !== after.notes
  )
}

function playerPayloadChanged(before: Player, after: Player): boolean {
  return before.name !== after.name || before.archived !== after.archived
}

function shouldApplyRemoteActive(row: SyncActiveRow): boolean {
  const localTouch = localActiveTouch.get(row.id) ?? 0
  const remoteAt = new Date(row.updated_at).getTime()
  return remoteAt >= localTouch
}

function shouldApplyRemoteMatch(existing: Match | undefined, row: SyncMatchRow): boolean {
  if (!existing) return true
  const localTouch = localMatchTouch.get(row.id) ?? 0
  const remoteAt = new Date(row.updated_at).getTime()
  if (remoteAt < localTouch) return false
  const remote = rowToMatch(row)
  if (remote.deletedAt !== existing.deletedAt) return true
  return remoteAt >= localTouch
}

function shouldApplyRemotePlayer(
  existing: Player | undefined,
  remote: { id: string; name: string; archived: boolean; updated_at?: string },
): boolean {
  const localTouch = localPlayerTouch.get(remote.id) ?? 0
  if (remote.updated_at) {
    return new Date(remote.updated_at).getTime() >= localTouch
  }
  return !existing
}

export function isGroupCollabActive(state: AppState): boolean {
  return Boolean(state.settings.groupCollabEnabled && state.settings.lastGroupCode)
}

function toActiveRow(groupKey: string, match: ActiveMatch, userId: string): SyncActiveRow {
  return {
    id: match.id,
    group_key: groupKey,
    session_id: match.sessionId,
    match_number: match.matchNumber,
    table_slot: match.tableSlot,
    player1_id: match.player1Id,
    deck1_id: match.deck1Id,
    player2_id: match.player2Id,
    deck2_id: match.deck2Id,
    first_player_id: match.firstPlayerId,
    started_at: match.startedAt,
    notes: match.notes,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }
}

function toMatchRow(groupKey: string, match: Match, userId: string): SyncMatchRow {
  return {
    id: match.id,
    group_key: groupKey,
    session_id: match.sessionId,
    match_number: match.matchNumber,
    player1_id: match.player1Id,
    deck1_id: match.deck1Id,
    player2_id: match.player2Id,
    deck2_id: match.deck2Id,
    winner_player_id: match.winnerPlayerId,
    winner_deck_id: match.winnerDeckId,
    first_player_id: match.firstPlayerId,
    result_type: match.resultType,
    started_at: match.startedAt,
    finished_at: match.finishedAt,
    notes: match.notes,
    source: match.source,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    deleted_at: match.deletedAt,
  }
}

function rowToActiveMatch(row: SyncActiveRow): ActiveMatch {
  return {
    id: row.id,
    sessionId: row.session_id,
    matchNumber: row.match_number,
    tableSlot: row.table_slot,
    player1Id: row.player1_id,
    deck1Id: row.deck1_id,
    player2Id: row.player2_id,
    deck2Id: row.deck2_id,
    firstPlayerId: row.first_player_id,
    startedAt: row.started_at,
    notes: row.notes,
  }
}

function rowToMatch(row: SyncMatchRow): Match {
  return {
    id: row.id,
    sessionId: row.session_id,
    matchNumber: row.match_number,
    player1Id: row.player1_id,
    deck1Id: row.deck1_id,
    player2Id: row.player2_id,
    deck2Id: row.deck2_id,
    winnerPlayerId: row.winner_player_id,
    winnerDeckId: row.winner_deck_id,
    firstPlayerId: row.first_player_id,
    resultType: row.result_type as Match['resultType'],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    notes: row.notes,
    source: row.source as Match['source'],
    deletedAt: row.deleted_at,
  }
}

async function requireUserId(): Promise<string> {
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入雲端帳號')
  return user.id
}

export async function deleteRemoteActiveMatch(groupCode: string, matchId: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const groupKey = await resolveGroupKey(groupCode)
  await supabase.from('sync_active_matches').delete().eq('group_key', groupKey).eq('id', matchId)
}

export async function deleteRemoteMatch(groupCode: string, matchId: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const groupKey = await resolveGroupKey(groupCode)
  await supabase.from('sync_matches').delete().eq('group_key', groupKey).eq('id', matchId)
}

export async function markRemoteSessionDeleted(groupCode: string, sessionId: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('sync_sessions')
    .update({ deleted_at: now, updated_at: now, updated_by: userId })
    .eq('group_key', groupKey)
    .eq('id', sessionId)
  if (error) throw error
}

export async function deleteRemotePlayer(groupCode: string, playerId: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const groupKey = await resolveGroupKey(groupCode)
  await supabase.from('sync_players').delete().eq('group_key', groupKey).eq('id', playerId)
}

export async function flushGroupCollabSync(groupCode: string, state: AppState): Promise<void> {
  if (!isGroupCollabActive(state)) return
  const supabase = await getSupabaseClient()
  if (!supabase) return

  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)

  if (state.currentSessionId) {
    const session = state.sessions.find((item) => item.id === state.currentSessionId)
    if (session) {
      const { error } = await supabase.from('sync_sessions').upsert({
        id: session.id,
        group_key: groupKey,
        name: session.name,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        updated_at: new Date().toISOString(),
        updated_by: userId,
        deleted_at: null,
      })
      if (error) throw error
    }
  }

  // Row-level entity changes are pushed by notifyGroupCollabChange().
  // Keep this flush scoped to session metadata so a stale tab cannot rewrite
  // active tables or players with a fresh updated_at.
}

export async function pushSyncedActiveMatches(groupCode: string, matches: ActiveMatch[]): Promise<void> {
  if (!matches.length) return
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.from('sync_active_matches').upsert(
    matches.map((match) => toActiveRow(groupKey, match, userId)),
  )
  if (error) throw error
}

export async function pushSyncedPlayers(groupCode: string, players: Player[]): Promise<void> {
  if (!players.length) return
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.from('sync_players').upsert(
    players.map((player) => ({
      id: player.id,
      group_key: groupKey,
      name: player.name,
      archived: player.archived,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })),
  )
  if (error) throw error
}

export async function pushSyncedMatch(groupCode: string, match: Match): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.from('sync_matches').upsert(toMatchRow(groupKey, match, userId))
  if (error) throw error
}

/** @deprecated use pushSyncedMatch */
export async function pushCompletedMatch(groupCode: string, match: Match): Promise<void> {
  await pushSyncedMatch(groupCode, match)
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const groupKey = await resolveGroupKey(groupCode)
  await supabase.from('sync_active_matches').delete().eq('group_key', groupKey).eq('id', match.id)
}

export async function pushSyncedMatches(groupCode: string, matches: Match[]): Promise<void> {
  if (!matches.length) return
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.from('sync_matches').upsert(
    matches.map((match) => toMatchRow(groupKey, match, userId)),
  )
  if (error) throw error
}

function matchPayloadChanged(before: Match, after: Match): boolean {
  return (
    before.deletedAt !== after.deletedAt ||
    before.notes !== after.notes ||
    before.winnerPlayerId !== after.winnerPlayerId ||
    before.winnerDeckId !== after.winnerDeckId ||
    before.player1Id !== after.player1Id ||
    before.player2Id !== after.player2Id ||
    before.deck1Id !== after.deck1Id ||
    before.deck2Id !== after.deck2Id ||
    before.firstPlayerId !== after.firstPlayerId ||
    before.finishedAt !== after.finishedAt
  )
}

let groupCollabNotifyPaused = false

export function pauseGroupCollabNotify(): void {
  groupCollabNotifyPaused = true
}

export function resumeGroupCollabNotify(): void {
  groupCollabNotifyPaused = false
}

/** Central sync entry: diff prev/next after local persist. */
export function notifyGroupCollabChange(prev: AppState | null, next: AppState): void {
  if (groupCollabNotifyPaused || !prev || !isGroupCollabActive(next)) return
  const groupCode = next.settings.lastGroupCode
  if (!groupCode) return

  const touchedActive = new Set<string>()
  const changedActive: ActiveMatch[] = []
  const prevActiveById = new Map(prev.activeMatches.map((match) => [match.id, match]))
  for (const match of next.activeMatches) {
    const before = prevActiveById.get(match.id)
    if (!before || activePayloadChanged(before, match)) {
      touchedActive.add(match.id)
      changedActive.push(match)
    }
  }
  for (const match of prev.activeMatches) {
    if (!next.activeMatches.some((item) => item.id === match.id)) {
      touchedActive.add(match.id)
      void deleteRemoteActiveMatch(groupCode, match.id)
    }
  }
  if (touchedActive.size) {
    touchLocalActive(touchedActive)
    void pushSyncedActiveMatches(groupCode, changedActive)
  }

  const prevMatches = new Map(prev.matches.map((match) => [match.id, match]))
  const changedMatches: Match[] = []
  for (const match of next.matches) {
    const before = prevMatches.get(match.id)
    if (!before || matchPayloadChanged(before, match)) {
      changedMatches.push(match)
    }
  }

  if (changedMatches.length) {
    touchLocalMatches(changedMatches.map((match) => match.id))
    void pushSyncedMatches(groupCode, changedMatches)
    for (const match of changedMatches) {
      if (prev.activeMatches.some((item) => item.id === match.id)) {
        void deleteRemoteActiveMatch(groupCode, match.id)
      }
    }
  }

  const touchedPlayers = new Set<string>()
  const prevPlayers = new Map(prev.players.map((player) => [player.id, player]))
  for (const player of next.players) {
    const before = prevPlayers.get(player.id)
    if (!before || playerPayloadChanged(before, player)) {
      touchedPlayers.add(player.id)
    }
  }
  if (touchedPlayers.size) touchLocalPlayers(touchedPlayers)
  if (touchedPlayers.size) {
    const changedPlayers = next.players.filter((player) => touchedPlayers.has(player.id))
    void pushSyncedPlayers(groupCode, changedPlayers)
  }

  for (const match of prev.matches) {
    if (next.matches.some((item) => item.id === match.id)) continue
    localPurgedMatches.add(match.id)
    touchLocalMatches([match.id])
    void deleteRemoteMatch(groupCode, match.id)
  }

  for (const session of prev.sessions) {
    if (next.sessions.some((item) => item.id === session.id)) continue
    localPurgedSessions.add(session.id)
    void markRemoteSessionDeleted(groupCode, session.id)
  }

  for (const player of prev.players) {
    if (next.players.some((item) => item.id === player.id)) continue
    localPurgedPlayers.add(player.id)
    touchLocalPlayers([player.id])
    void deleteRemotePlayer(groupCode, player.id)
  }

  flushGroupCollabSyncNow(groupCode)
}

export function scheduleGroupCollabSync(groupCode: string, _state?: AppState): void {
  if (!isGroupCollabActive(getAppState())) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    const latest = getAppState()
    if (!isGroupCollabActive(latest) || !latest.settings.lastGroupCode) return
    flushGroupCollabSync(groupCode, latest).catch((error) => {
      console.error('Group collab sync failed', error)
    })
  }, 150)
}

export function flushGroupCollabSyncNow(groupCode: string): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  flushQueued = true
  if (flushRunning) return
  void runFlushQueue(groupCode)
}

async function runFlushQueue(groupCode: string): Promise<void> {
  flushRunning = true
  try {
    while (flushQueued) {
      flushQueued = false
      const state = getAppState()
      if (!isGroupCollabActive(state)) break
      await flushGroupCollabSync(groupCode, state)
    }
  } catch (error) {
    console.error('Group collab sync failed', error)
  } finally {
    flushRunning = false
    if (flushQueued && isGroupCollabActive(getAppState())) {
      void runFlushQueue(groupCode)
    }
  }
}

export async function bootstrapGroupCollab(groupCode: string, state: AppState): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase 未設定')
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)

  const sessionRows = state.sessions.map((session: Session) => ({
    id: session.id,
    group_key: groupKey,
    name: session.name,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    deleted_at: null,
  }))
  if (sessionRows.length) {
    const { error } = await supabase.from('sync_sessions').upsert(sessionRows)
    if (error) throw error
  }

  const playerRows = state.players.filter((p) => !p.archived).map((player: Player) => ({
    id: player.id,
    group_key: groupKey,
    name: player.name,
    archived: player.archived,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }))
  if (playerRows.length) {
    const { error } = await supabase.from('sync_players').upsert(playerRows)
    if (error) throw error
  }

  const matchRows = state.matches
    .filter((match) => match.deletedAt === null)
    .slice(0, 500)
    .map((match) => toMatchRow(groupKey, match, userId))
  if (matchRows.length) {
    const { error } = await supabase.from('sync_matches').upsert(matchRows)
    if (error) throw error
  }

  await pushSyncedActiveMatches(groupCode, state.activeMatches)
  await flushGroupCollabSync(groupCode, state)
}

export async function pullGroupCollabState(groupCode: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase 未設定')
  const groupKey = await resolveGroupKey(groupCode)

  const [activeRes, matchRes, playerRes, sessionRes] = await Promise.all([
    supabase.from('sync_active_matches').select('*').eq('group_key', groupKey),
    supabase.from('sync_matches').select('*').eq('group_key', groupKey).order('finished_at', { ascending: false }).limit(500),
    supabase.from('sync_players').select('*').eq('group_key', groupKey),
    supabase.from('sync_sessions').select('*').eq('group_key', groupKey),
  ])

  if (activeRes.error) throw activeRes.error
  if (matchRes.error) throw matchRes.error
  if (playerRes.error) throw playerRes.error
  if (sessionRes.error) throw sessionRes.error

  updateAppState((current) => {
    const remoteActive = activeRes.data as SyncActiveRow[]
    const remoteMatches = matchRes.data as SyncMatchRow[]
    const remotePlayers = playerRes.data as {
      id: string
      name: string
      archived: boolean
      updated_at: string
    }[]
    const remoteSessions = sessionRes.data as {
      id: string
      name: string
      started_at: string
      ended_at: string | null
      deleted_at: string | null
    }[]

    const activeById = new Map(current.activeMatches.map((match) => [match.id, match]))
    const remoteActiveIds = new Set(remoteActive.map((row) => row.id))
    for (const row of remoteActive) {
      if (!shouldApplyRemoteActive(row)) continue
      activeById.set(row.id, rowToActiveMatch(row))
    }
    for (const [id, match] of activeById) {
      if (!remoteActiveIds.has(id)) {
        const localTouch = localActiveTouch.get(id) ?? 0
        if (!localTouch) {
          activeById.delete(id)
        }
        continue
      }
      const row = remoteActive.find((item) => item.id === id)
      if (row && !shouldApplyRemoteActive(row)) {
        activeById.set(id, current.activeMatches.find((item) => item.id === id) ?? match)
      }
    }

    const matchesById = new Map(current.matches.map((match) => [match.id, match]))
    for (const row of remoteMatches) {
      if (localPurgedMatches.has(row.id)) continue
      const remote = rowToMatch(row)
      const existing = matchesById.get(remote.id)
      if (!existing || shouldApplyRemoteMatch(existing, row)) {
        matchesById.set(remote.id, remote)
      }
    }
    for (const id of localPurgedMatches) {
      matchesById.delete(id)
    }

    const playersById = new Map(current.players.map((player) => [player.id, player]))
    for (const remote of remotePlayers) {
      if (localPurgedPlayers.has(remote.id)) continue
      const existing = playersById.get(remote.id)
      if (!shouldApplyRemotePlayer(existing, remote)) continue
      if (existing) {
        playersById.set(remote.id, { ...existing, name: remote.name, archived: remote.archived })
      } else {
        const now = new Date().toISOString()
        playersById.set(remote.id, {
          id: remote.id,
          name: remote.name,
          aliases: [],
          archived: remote.archived,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    for (const id of localPurgedPlayers) {
      playersById.delete(id)
    }

    const sessionsById = new Map(current.sessions.map((session) => [session.id, session]))
    for (const remote of remoteSessions) {
      if (localPurgedSessions.has(remote.id) || remote.deleted_at) {
        sessionsById.delete(remote.id)
        continue
      }
      const existing = sessionsById.get(remote.id)
      if (existing) {
        sessionsById.set(remote.id, {
          ...existing,
          name: remote.name,
          startedAt: remote.started_at,
          endedAt: remote.ended_at,
        })
      } else {
        const now = new Date().toISOString()
        sessionsById.set(remote.id, {
          id: remote.id,
          name: remote.name,
          startedAt: remote.started_at,
          endedAt: remote.ended_at,
          createdAt: now,
        })
      }
    }
    for (const id of localPurgedSessions) {
      sessionsById.delete(id)
    }

    return {
      ...current,
      activeMatches: [...activeById.values()],
      matches: [...matchesById.values()].sort(
        (left, right) => new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime(),
      ),
      players: [...playersById.values()],
      sessions: [...sessionsById.values()].sort(
        (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      ),
    }
  })
}

function applyRemoteActiveRow(row: SyncActiveRow): void {
  if (!shouldApplyRemoteActive(row)) return
  const match = rowToActiveMatch(row)
  updateAppState((current) => {
    const without = current.activeMatches.filter((item) => item.id !== match.id)
    return { ...current, activeMatches: [match, ...without] }
  })
}

function removeRemoteActiveMatch(matchId: string): void {
  const localTouch = localActiveTouch.get(matchId) ?? 0
  if (Date.now() - localTouch < 500) return
  updateAppState((current) => ({
    ...current,
    activeMatches: current.activeMatches.filter((match) => match.id !== matchId),
  }))
}

function applyRemotePlayerRow(row: { id: string; name: string; archived: boolean; updated_at: string }): void {
  if (localPurgedPlayers.has(row.id)) return
  updateAppState((current) => {
    const existing = current.players.find((player) => player.id === row.id)
    if (!shouldApplyRemotePlayer(existing, row)) return current
    if (existing) {
      return {
        ...current,
        players: current.players.map((player) =>
          player.id === row.id ? { ...player, name: row.name, archived: row.archived } : player,
        ),
      }
    }
    const now = new Date().toISOString()
    const player: Player = {
      id: row.id,
      name: row.name,
      aliases: [],
      archived: row.archived,
      createdAt: now,
      updatedAt: now,
    }
    return { ...current, players: [player, ...current.players] }
  })
}

function applyRemoteMatchRow(row: SyncMatchRow): void {
  if (localPurgedMatches.has(row.id)) return
  const remote = rowToMatch(row)
  updateAppState((current) => {
    const existing = current.matches.find((item) => item.id === remote.id)
    if (existing && !shouldApplyRemoteMatch(existing, row)) {
      return current
    }
    const without = current.matches.filter((item) => item.id !== remote.id)
    const matches = [remote, ...without].sort(
      (left, right) => new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime(),
    )
    return { ...current, matches }
  })
}

function handleRemoteMatchChange(payload: { eventType: string; new: SyncMatchRow | null; old: { id?: string } | null }): void {
  if (payload.eventType === 'DELETE') {
    const matchId = payload.old?.id
    if (!matchId) return
    updateAppState((current) => ({
      ...current,
      matches: current.matches.filter((match) => match.id !== matchId),
    }))
    return
  }
  if (payload.new) applyRemoteMatchRow(payload.new)
}

export async function startGroupCollabRealtime(groupCode: string): Promise<void> {
  stopGroupCollabRealtime()
  const supabase = await getSupabaseClient()
  if (!supabase) return
  await getCloudSession()
  const groupKey = await resolveGroupKey(groupCode)

  const channel = supabase
    .channel(`group-sync-${groupKey}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_active_matches', filter: `group_key=eq.${groupKey}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { id?: string }
          if (oldRow.id) removeRemoteActiveMatch(oldRow.id)
          return
        }
        if (payload.new) applyRemoteActiveRow(payload.new as SyncActiveRow)
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_matches', filter: `group_key=eq.${groupKey}` },
      (payload) => {
        handleRemoteMatchChange({
          eventType: payload.eventType,
          new: (payload.new as SyncMatchRow | null) ?? null,
          old: (payload.old as { id?: string } | null) ?? null,
        })
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_players', filter: `group_key=eq.${groupKey}` },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        if (payload.new) {
          applyRemotePlayerRow(payload.new as { id: string; name: string; archived: boolean; updated_at: string })
        }
      },
    )
    .subscribe((status, error) => {
      if (error) console.error('Group collab realtime error', error)
      if (status === 'SUBSCRIBED') {
        console.debug('Group collab realtime subscribed')
      }
    })

  realtimeUnsubscribe = () => {
    void supabase.removeChannel(channel)
  }
}

export function stopGroupCollabRealtime(): void {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe()
    realtimeUnsubscribe = null
  }
}
