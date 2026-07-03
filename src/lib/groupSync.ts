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

export async function flushGroupCollabSync(groupCode: string, state: AppState): Promise<void> {
  if (!isGroupCollabActive(state)) return
  const supabase = await getSupabaseClient()
  if (!supabase) return

  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)

  const activeRows = state.activeMatches.map((match) => toActiveRow(groupKey, match, userId))
  if (activeRows.length) {
    const { error } = await supabase.from('sync_active_matches').upsert(activeRows)
    if (error) throw error
  }

  const remoteActive = await supabase
    .from('sync_active_matches')
    .select('id')
    .eq('group_key', groupKey)
  if (remoteActive.error) throw remoteActive.error

  const localActiveIds = new Set(state.activeMatches.map((match) => match.id))
  const staleIds = (remoteActive.data ?? [])
    .map((row) => row.id as string)
    .filter((id) => !localActiveIds.has(id))

  if (staleIds.length) {
    await supabase.from('sync_active_matches').delete().eq('group_key', groupKey).in('id', staleIds)
  }

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

  const rosterIds = state.sessionPlayers
    .filter((item) => item.sessionId === state.currentSessionId)
    .map((item) => item.playerId)
  const rosterPlayers = state.players.filter((player) => rosterIds.includes(player.id))
  if (rosterPlayers.length) {
    const { error } = await supabase.from('sync_players').upsert(
      rosterPlayers.map((player) => ({
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
}

export async function pushCompletedMatch(groupCode: string, match: Match): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const userId = await requireUserId()
  const groupKey = await resolveGroupKey(groupCode)
  const { error: matchError } = await supabase.from('sync_matches').upsert(toMatchRow(groupKey, match, userId))
  if (matchError) throw matchError
  await supabase.from('sync_active_matches').delete().eq('group_key', groupKey).eq('id', match.id)
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
  }, 400)
}

export function flushGroupCollabSyncNow(groupCode: string): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const state = getAppState()
  if (!isGroupCollabActive(state)) return
  void flushGroupCollabSync(groupCode, state).catch((error) => {
    console.error('Group collab sync failed', error)
  })
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
    const remotePlayers = playerRes.data as { id: string; name: string; archived: boolean }[]
    const remoteSessions = sessionRes.data as {
      id: string
      name: string
      started_at: string
      ended_at: string | null
    }[]

    const activeById = new Map(current.activeMatches.map((match) => [match.id, match]))
    for (const row of remoteActive) {
      activeById.set(row.id, rowToActiveMatch(row))
    }

    const matchesById = new Map(current.matches.map((match) => [match.id, match]))
    for (const row of remoteMatches) {
      const remote = rowToMatch(row)
      const existing = matchesById.get(remote.id)
      if (!existing || new Date(remote.finishedAt) >= new Date(existing.finishedAt)) {
        matchesById.set(remote.id, remote)
      }
    }

    const playersById = new Map(current.players.map((player) => [player.id, player]))
    for (const remote of remotePlayers) {
      const existing = playersById.get(remote.id)
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

    const sessionsById = new Map(current.sessions.map((session) => [session.id, session]))
    for (const remote of remoteSessions) {
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
  const match = rowToActiveMatch(row)
  updateAppState((current) => {
    const without = current.activeMatches.filter((item) => item.id !== match.id)
    return { ...current, activeMatches: [match, ...without] }
  })
}

function removeRemoteActiveMatch(matchId: string): void {
  updateAppState((current) => ({
    ...current,
    activeMatches: current.activeMatches.filter((match) => match.id !== matchId),
  }))
}

function applyRemoteMatchRow(row: SyncMatchRow): void {
  const remote = rowToMatch(row)
  updateAppState((current) => {
    const existing = current.matches.find((item) => item.id === remote.id)
    if (existing && new Date(remote.finishedAt).getTime() < new Date(existing.finishedAt).getTime()) {
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
    .subscribe((status, error) => {
      if (error) console.error('Group collab realtime error', error)
      if (status === 'SUBSCRIBED') {
        void pullGroupCollabState(groupCode).catch((pullError) => {
          console.error('Group collab pull after subscribe failed', pullError)
        })
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
