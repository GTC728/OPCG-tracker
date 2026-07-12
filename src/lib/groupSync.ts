import { appendAuditEntry, remoteAuditActor } from '@/lib/auditLog'
import { getCloudSession, getSupabaseClient, resolveGroupKey } from '@/lib/cloudSync'
import {
  applyGroupScopedSnapshot,
  captureGroupScopedSnapshot,
  hasGroupScopedData,
  stripGroupScopedEntities,
} from '@/lib/groupScope'
import { finalizeGroupProfileSession } from '@/lib/profileGroupLink'
import { resolveIntegrityGrantIdForMatch, ensureHistoricalGrantsForState } from '@/lib/serverIntegrity'
import {
  enqueueSyncOp,
  listSyncQueue,
  markSyncQueueFailed,
  removeSyncQueueItem,
  type SyncQueueOp,
} from '@/lib/syncQueue'
import type { ActiveMatch, AppState, Match, Player, Session } from '@/types'
import { getAppState, updateAppState, useAppStore } from '@/stores/appStore'

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
  integrity_grant_id?: string | null
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
/** Local edit timestamp per session id. */
const localSessionTouch = new Map<string, number>()

function touchLocalActive(ids: Iterable<string>): void {
  const now = Date.now()
  for (const id of ids) localActiveTouch.set(id, now)
}

function touchLocalSessions(ids: Iterable<string>): void {
  const now = Date.now()
  for (const id of ids) localSessionTouch.set(id, now)
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
  return (
    before.name !== after.name ||
    before.archived !== after.archived ||
    before.deletedAt !== after.deletedAt ||
    before.linkedUserId !== after.linkedUserId ||
    before.aliases.join('\u0000') !== after.aliases.join('\u0000')
  )
}

function sessionPayloadChanged(before: Session, after: Session): boolean {
  return (
    before.name !== after.name ||
    before.startedAt !== after.startedAt ||
    before.endedAt !== after.endedAt ||
    before.archivedAt !== after.archivedAt ||
    before.deletedAt !== after.deletedAt
  )
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
  remote: { id: string; name: string; archived: boolean; deleted_at?: string | null; updated_at?: string },
): boolean {
  const localTouch = localPlayerTouch.get(remote.id) ?? 0
  if (remote.updated_at) {
    return new Date(remote.updated_at).getTime() >= localTouch
  }
  return !existing
}

function shouldApplyRemoteSession(
  existing: Session | undefined,
  remote: { updated_at?: string },
): boolean {
  const localTouch = existing ? localSessionTouch.get(existing.id) ?? 0 : 0
  if (remote.updated_at) {
    return new Date(remote.updated_at).getTime() >= localTouch
  }
  return !existing
}

/** Group membership implies entity sync (v3.10+). */
export function isGroupCollabActive(state: AppState): boolean {
  return Boolean(state.settings.lastGroupCode)
}

/** Push to group is allowed when collab is active and not paused. Pull still runs when paused. */
export function isGroupCollabPushEnabled(state: AppState): boolean {
  return isGroupCollabActive(state) && !state.settings.groupSyncPaused
}

const MATCH_SYNC_PAGE = 500

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function queueOp(op: SyncQueueOp): Promise<void> {
  await enqueueSyncOp(op)
  if (isOnline()) {
    const state = getAppState()
    const groupCode = state.settings.lastGroupCode
    if (groupCode) flushGroupCollabSyncNow(groupCode)
  }
}

async function executeSyncOp(op: SyncQueueOp, state: AppState): Promise<void> {
  switch (op.kind) {
    case 'upsert_active': {
      const matches = op.matchIds
        .map((id) => state.activeMatches.find((match) => match.id === id))
        .filter((match): match is ActiveMatch => Boolean(match))
      await pushSyncedActiveMatches(op.groupCode, matches)
      return
    }
    case 'delete_active':
      await deleteRemoteActiveMatch(op.groupCode, op.matchId)
      return
    case 'upsert_matches': {
      const matches = op.matchIds
        .map((id) => state.matches.find((match) => match.id === id))
        .filter((match): match is Match => Boolean(match))
      await pushSyncedMatches(op.groupCode, matches)
      for (const match of matches) {
        if (state.activeMatches.some((item) => item.id === match.id)) {
          await deleteRemoteActiveMatch(op.groupCode, match.id)
        }
      }
      return
    }
    case 'upsert_players': {
      const players = op.playerIds
        .map((id) => state.players.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player))
      await pushSyncedPlayers(op.groupCode, players)
      return
    }
    case 'delete_player':
      await deleteRemotePlayer(op.groupCode, op.playerId)
      return
    case 'upsert_sessions': {
      const sessions = op.sessionIds
        .map((id) => state.sessions.find((session) => session.id === id))
        .filter((session): session is Session => Boolean(session))
      await pushSyncedSessions(op.groupCode, sessions)
      return
    }
    case 'merge_players': {
      const target = state.players.find((player) => player.id === op.targetPlayerId)
      if (target) {
        await pushSyncedPlayers(op.groupCode, [target])
      }
      await deleteRemotePlayer(op.groupCode, op.sourcePlayerId)
      const rewiredMatches = state.matches.filter(
        (match) => match.player1Id === op.targetPlayerId || match.player2Id === op.targetPlayerId,
      )
      if (rewiredMatches.length) {
        await pushSyncedMatches(op.groupCode, rewiredMatches)
      }
      const rewiredActive = state.activeMatches.filter(
        (match) => match.player1Id === op.targetPlayerId || match.player2Id === op.targetPlayerId,
      )
      if (rewiredActive.length) {
        await pushSyncedActiveMatches(op.groupCode, rewiredActive)
      }
      return
    }
    default:
      return
  }
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
    started_at: match.startedAt ?? new Date().toISOString(),
    notes: match.notes,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }
}

function toMatchRow(
  groupKey: string,
  match: Match,
  userId: string,
  integrityGrantId?: string | null,
): SyncMatchRow {
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
    started_at: match.startedAt ?? new Date().toISOString(),
    finished_at: match.finishedAt,
    notes: match.notes,
    source: match.source,
    integrity_grant_id: integrityGrantId ?? null,
    updated_at: new Date().toISOString(),
    updated_by: userId,
    deleted_at: match.deletedAt,
  }
}

function matchRowFromState(groupKey: string, match: Match, userId: string): SyncMatchRow {
  const grantId =
    match.source === 'historical'
      ? resolveIntegrityGrantIdForMatch(getAppState(), match.id)
      : null
  return toMatchRow(groupKey, match, userId, grantId)
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

function toPlayerRow(groupKey: string, player: Player, userId: string) {
  return {
    id: player.id,
    group_key: groupKey,
    name: player.name,
    archived: player.archived,
    deleted_at: player.deletedAt,
    linked_user_id: player.linkedUserId,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }
}

type RemotePlayerRow = {
  id: string
  name: string
  archived: boolean
  deleted_at: string | null
  linked_user_id?: string | null
  updated_at: string
}

function mergeRemotePlayer(existing: Player | undefined, remote: RemotePlayerRow): Player {
  if (existing) {
    return {
      ...existing,
      name: remote.name,
      archived: remote.archived,
      deletedAt: remote.deleted_at ?? null,
      linkedUserId: remote.linked_user_id ?? existing.linkedUserId ?? null,
      updatedAt: remote.updated_at,
    }
  }
  const now = new Date().toISOString()
  return {
    id: remote.id,
    name: remote.name,
    aliases: [],
    archived: remote.archived,
    deletedAt: remote.deleted_at ?? null,
    profileClaimDeviceId: null,
    profileClaimedAt: null,
    linkedUserId: remote.linked_user_id ?? null,
    createdAt: now,
    updatedAt: remote.updated_at,
  }
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

export async function flushGroupCollabSync(_groupCode: string, _state: AppState): Promise<void> {
  if (!isGroupCollabActive(_state) || !isOnline()) return

  let state = _state
  try {
    const withGrants = await ensureHistoricalGrantsForState(state)
    if (withGrants !== state) {
      updateAppState(() => withGrants)
      state = withGrants
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Historical grant failed'
    useAppStore.getState().updateSettings({ lastGroupSyncError: message })
    throw error
  }

  const pending = await listSyncQueue()
  if (!pending.length) {
    useAppStore.getState().updateSettings({
      lastGroupSyncAt: new Date().toISOString(),
      lastGroupSyncError: null,
    })
    return
  }

  const latestState = getAppState()
  for (const item of pending) {
    if (item.op.groupCode !== _groupCode) continue
    try {
      await executeSyncOp(item.op, latestState)
      await removeSyncQueueItem(item.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      await markSyncQueueFailed(item.id, message)
      useAppStore.getState().updateSettings({ lastGroupSyncError: message })
      console.error('Group collab queue item failed', item.op.kind, error)
      throw error
    }
  }

  useAppStore.getState().updateSettings({
    lastGroupSyncAt: new Date().toISOString(),
    lastGroupSyncError: null,
  })
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
    players.map((player) => toPlayerRow(groupKey, player, userId)),
  )
  if (error) throw error
}

export async function pushSyncedSessions(groupCode: string, sessions: Session[]): Promise<void> {
  if (!sessions.length) return
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.from('sync_sessions').upsert(
    sessions.map((session) => ({
      id: session.id,
      group_key: groupKey,
      name: session.name,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      archived_at: session.archivedAt,
      deleted_at: session.deletedAt,
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
  const { error } = await supabase.from('sync_matches').upsert(matchRowFromState(groupKey, match, userId))
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
    matches.map((match) => matchRowFromState(groupKey, match, userId)),
  )
  if (error) throw error
}

function matchPayloadChanged(before: Match, after: Match): boolean {
  return (
    before.deletedAt !== after.deletedAt ||
    before.source !== after.source ||
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
  if (groupCollabNotifyPaused || !prev || !isGroupCollabPushEnabled(next)) return
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
      void queueOp({ kind: 'delete_active', groupCode, matchId: match.id })
    }
  }
  if (changedActive.length) {
    touchLocalActive(touchedActive)
    void queueOp({ kind: 'upsert_active', groupCode, matchIds: changedActive.map((match) => match.id) })
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
    void queueOp({ kind: 'upsert_matches', groupCode, matchIds: changedMatches.map((match) => match.id) })
  }

  const touchedPlayers = new Set<string>()
  const prevPlayers = new Map(prev.players.map((player) => [player.id, player]))
  for (const player of next.players) {
    const before = prevPlayers.get(player.id)
    if (!before || playerPayloadChanged(before, player)) {
      touchedPlayers.add(player.id)
    }
  }
  for (const player of prev.players) {
    if (!next.players.some((item) => item.id === player.id)) {
      void queueOp({ kind: 'delete_player', groupCode, playerId: player.id })
    }
  }
  if (touchedPlayers.size) {
    touchLocalPlayers(touchedPlayers)
    void queueOp({
      kind: 'upsert_players',
      groupCode,
      playerIds: [...touchedPlayers],
    })
  }

  const touchedSessions = new Set<string>()
  const prevSessions = new Map(prev.sessions.map((session) => [session.id, session]))
  const changedSessions: Session[] = []
  for (const session of next.sessions) {
    const before = prevSessions.get(session.id)
    if (!before || sessionPayloadChanged(before, session)) {
      touchedSessions.add(session.id)
      changedSessions.push(session)
    }
  }
  if (touchedSessions.size) touchLocalSessions(touchedSessions)
  if (changedSessions.length) {
    void queueOp({
      kind: 'upsert_sessions',
      groupCode,
      sessionIds: changedSessions.map((session) => session.id),
    })
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

export async function flushGroupCollabSyncNowAsync(groupCode: string): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  flushQueued = true
  await runFlushQueue(groupCode)
}

export async function remoteGroupHasData(groupCode: string): Promise<boolean> {
  const supabase = await getSupabaseClient()
  if (!supabase) return false
  const groupKey = await resolveGroupKey(groupCode)

  const checks = await Promise.all([
    supabase
      .from('sync_matches')
      .select('id', { count: 'exact', head: true })
      .eq('group_key', groupKey)
      .is('deleted_at', null),
    supabase
      .from('sync_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('group_key', groupKey)
      .is('deleted_at', null),
    supabase
      .from('sync_players')
      .select('id', { count: 'exact', head: true })
      .eq('group_key', groupKey)
      .is('deleted_at', null),
    supabase.from('sync_active_matches').select('id', { count: 'exact', head: true }).eq('group_key', groupKey),
  ])

  for (const result of checks) {
    if (result.error) throw result.error
    if ((result.count ?? 0) > 0) return true
  }
  return false
}

/**
 * Bind local collab slice to a group: clear stale local data, pull remote or seed empty group once.
 * Keeps UX automatic — no join-mode picker.
 */
export async function initializeGroupCollab(groupCode: string): Promise<void> {
  const current = getAppState()
  const incomingSnapshot = captureGroupScopedSnapshot(current)
  const hadLocalData = hasGroupScopedData(current)

  pauseGroupCollabNotify()
  try {
    updateAppState((state) => stripGroupScopedEntities(state))

    const hasRemote = await remoteGroupHasData(groupCode)
    if (hasRemote) {
      await pullGroupCollabState(groupCode)
      updateAppState((state) => finalizeGroupProfileSession(state))
      return
    }

    if (hadLocalData) {
      updateAppState((state) => applyGroupScopedSnapshot(state, incomingSnapshot))
      await bootstrapGroupCollab(groupCode, getAppState())
      updateAppState((state) => finalizeGroupProfileSession(state))
    }
  } finally {
    resumeGroupCollabNotify()
  }
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

  let workingState = state
  const withGrants = await ensureHistoricalGrantsForState(workingState)
  if (withGrants !== workingState) {
    updateAppState(() => withGrants)
    workingState = withGrants
  }
  state = workingState

  const sessionRows = state.sessions.map((session: Session) => ({
    id: session.id,
    group_key: groupKey,
    name: session.name,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    archived_at: session.archivedAt,
    deleted_at: session.deletedAt,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }))
  if (sessionRows.length) {
    const { error } = await supabase.from('sync_sessions').upsert(sessionRows)
    if (error) throw error
  }

  const playerRows = state.players.map((player: Player) => toPlayerRow(groupKey, player, userId))
  if (playerRows.length) {
    const { error } = await supabase.from('sync_players').upsert(playerRows)
    if (error) throw error
  }

  const matchRows = state.matches.map((match) => matchRowFromState(groupKey, match, userId))
  for (let offset = 0; offset < matchRows.length; offset += MATCH_SYNC_PAGE) {
    const chunk = matchRows.slice(offset, offset + MATCH_SYNC_PAGE)
    if (!chunk.length) continue
    const { error } = await supabase.from('sync_matches').upsert(chunk)
    if (error) throw error
  }

  await pushSyncedActiveMatches(groupCode, state.activeMatches)
  await flushGroupCollabSync(groupCode, state)
}

async function fetchAllRemoteMatches(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  groupKey: string,
): Promise<SyncMatchRow[]> {
  if (!supabase) return []
  const all: SyncMatchRow[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('sync_matches')
      .select('*')
      .eq('group_key', groupKey)
      .order('finished_at', { ascending: false })
      .range(offset, offset + MATCH_SYNC_PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...(data as SyncMatchRow[]))
    if (data.length < MATCH_SYNC_PAGE) break
    offset += MATCH_SYNC_PAGE
  }
  return all
}

/** Push all local entities after sync pause ends (LWW merge — tombstones included). */
export async function pushFullGroupState(groupCode: string, state: AppState): Promise<void> {
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
    archived_at: session.archivedAt,
    deleted_at: session.deletedAt,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }))
  if (sessionRows.length) {
    const { error } = await supabase.from('sync_sessions').upsert(sessionRows)
    if (error) throw error
  }

  const playerRows = state.players.map((player: Player) => toPlayerRow(groupKey, player, userId))
  if (playerRows.length) {
    const { error } = await supabase.from('sync_players').upsert(playerRows)
    if (error) throw error
  }

  const matchRows = state.matches.map((match) => matchRowFromState(groupKey, match, userId))
  for (let offset = 0; offset < matchRows.length; offset += MATCH_SYNC_PAGE) {
    const chunk = matchRows.slice(offset, offset + MATCH_SYNC_PAGE)
    if (!chunk.length) continue
    const { error } = await supabase.from('sync_matches').upsert(chunk)
    if (error) throw error
  }

  await pushSyncedActiveMatches(groupCode, state.activeMatches)
}

export async function pullGroupCollabState(groupCode: string): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase 未設定')
  const groupKey = await resolveGroupKey(groupCode)

  const [activeRes, matchRes, playerRes, sessionRes] = await Promise.all([
    supabase.from('sync_active_matches').select('*').eq('group_key', groupKey),
    fetchAllRemoteMatches(supabase, groupKey),
    supabase.from('sync_players').select('*').eq('group_key', groupKey),
    supabase.from('sync_sessions').select('*').eq('group_key', groupKey),
  ])

  if (activeRes.error) throw activeRes.error
  if (playerRes.error) throw playerRes.error
  if (sessionRes.error) throw sessionRes.error

  let remoteMatchUpdates = 0
  let remoteUpdaterId: string | null = null

  updateAppState((current) => {
    const remoteActive = activeRes.data as SyncActiveRow[]
    const remoteMatches = matchRes
    const remotePlayers = playerRes.data as RemotePlayerRow[]
    const remoteSessions = sessionRes.data as {
      id: string
      name: string
      started_at: string
      ended_at: string | null
      archived_at: string | null
      deleted_at: string | null
      updated_at: string
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
      const remote = rowToMatch(row)
      const existing = matchesById.get(remote.id)
      if (!existing || shouldApplyRemoteMatch(existing, row)) {
        if (
          row.updated_by &&
          row.updated_by !== current.settings.cloudUserId &&
          (!existing || existing.finishedAt !== remote.finishedAt || existing.winnerPlayerId !== remote.winnerPlayerId)
        ) {
          remoteMatchUpdates += 1
          remoteUpdaterId = row.updated_by
        }
        matchesById.set(remote.id, remote)
      }
    }

    const playersById = new Map(current.players.map((player) => [player.id, player]))
    for (const remote of remotePlayers) {
      const existing = playersById.get(remote.id)
      if (!shouldApplyRemotePlayer(existing, remote)) continue
      playersById.set(remote.id, mergeRemotePlayer(existing, remote))
    }

    const sessionsById = new Map(current.sessions.map((session) => [session.id, session]))
    for (const remote of remoteSessions) {
      const existing = sessionsById.get(remote.id)
      if (existing && !shouldApplyRemoteSession(existing, remote)) continue
      if (existing) {
        sessionsById.set(remote.id, {
          ...existing,
          name: remote.name,
          startedAt: remote.started_at,
          endedAt: remote.ended_at,
          archivedAt: remote.archived_at ?? null,
          deletedAt: remote.deleted_at ?? null,
        })
      } else {
        const now = new Date().toISOString()
        sessionsById.set(remote.id, {
          id: remote.id,
          name: remote.name,
          startedAt: remote.started_at,
          endedAt: remote.ended_at,
          archivedAt: remote.archived_at ?? null,
          deletedAt: remote.deleted_at ?? null,
          createdAt: now,
        })
      }
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
  if (remoteMatchUpdates > 0 && remoteUpdaterId) {
    const updaterId = remoteUpdaterId
    updateAppState((state) =>
      appendAuditEntry(state, 'sync', `Group pull: ${remoteMatchUpdates} match update(s)`, {
        actor: remoteAuditActor(updaterId),
        meta: { updated_by: updaterId },
      }),
    )
  }
  updateAppState((state) => finalizeGroupProfileSession(state))
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

function applyRemotePlayerRow(row: RemotePlayerRow): void {
  updateAppState((current) => {
    const existing = current.players.find((player) => player.id === row.id)
    if (!shouldApplyRemotePlayer(existing, row)) return current
    if (existing) {
      return {
        ...current,
        players: current.players.map((player) =>
          player.id === row.id ? mergeRemotePlayer(player, row) : player,
        ),
      }
    }
    return { ...current, players: [mergeRemotePlayer(undefined, row), ...current.players] }
  })
}

function applyRemoteSessionRow(row: {
  id: string
  name: string
  started_at: string
  ended_at: string | null
  archived_at?: string | null
  deleted_at?: string | null
  updated_at: string
}): void {
  updateAppState((current) => {
    const existing = current.sessions.find((session) => session.id === row.id)
    if (existing && !shouldApplyRemoteSession(existing, row)) return current
    if (existing) {
      return {
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === row.id
            ? {
                ...session,
                name: row.name,
                startedAt: row.started_at,
                endedAt: row.ended_at,
                archivedAt: row.archived_at ?? null,
                deletedAt: row.deleted_at ?? null,
              }
            : session,
        ),
      }
    }
    const now = new Date().toISOString()
    const session: Session = {
      id: row.id,
      name: row.name,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      archivedAt: row.archived_at ?? null,
      deletedAt: row.deleted_at ?? null,
      createdAt: now,
    }
    return { ...current, sessions: [session, ...current.sessions] }
  })
}

let reconcileAfterRemoteMatchTimer: ReturnType<typeof setTimeout> | null = null

/** Rebuild profile lifetime + achievement unlocks after remote match ingest. */
function scheduleReconcileAfterRemoteMatches(): void {
  if (reconcileAfterRemoteMatchTimer) clearTimeout(reconcileAfterRemoteMatchTimer)
  reconcileAfterRemoteMatchTimer = setTimeout(() => {
    reconcileAfterRemoteMatchTimer = null
    updateAppState((state) => finalizeGroupProfileSession(state))
  }, 300)
}

function applyRemoteMatchRow(row: SyncMatchRow): void {
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
  scheduleReconcileAfterRemoteMatches()
}

function handleRemoteMatchChange(payload: { eventType: string; new: SyncMatchRow | null; old: { id?: string } | null }): void {
  if (payload.eventType === 'DELETE') {
    const matchId = payload.old?.id
    if (!matchId) return
    const timestamp = new Date().toISOString()
    updateAppState((current) => ({
      ...current,
      matches: current.matches.map((match) =>
        match.id === matchId && match.deletedAt === null
          ? { ...match, deletedAt: timestamp, source: 'manual_edit' }
          : match,
      ),
    }))
    scheduleReconcileAfterRemoteMatches()
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
          applyRemotePlayerRow(
            payload.new as RemotePlayerRow,
          )
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_sessions', filter: `group_key=eq.${groupKey}` },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        if (payload.new) {
          applyRemoteSessionRow(
            payload.new as {
              id: string
              name: string
              started_at: string
              ended_at: string | null
              archived_at?: string | null
              deleted_at?: string | null
              updated_at: string
            },
          )
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
