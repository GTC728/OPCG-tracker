import type { AppState, Player } from '@/types'
import {
  isDeletedPlayer,
  isListedPlayer,
  isVisibleMatch,
} from '@/lib/entityVisibility'
import { nowIso } from '@/lib/utils'

function comparePlayerNames(left: Player, right: Player): number {
  return left.name.localeCompare(right.name, 'zh-Hant')
}

/** Player ids that appear on at least one visible match (optional session scope). */
export function collectPlayerIdsFromMatches(
  state: Pick<AppState, 'matches'>,
  sessionId?: string,
): Set<string> {
  const ids = new Set<string>()
  for (const match of state.matches) {
    if (!isVisibleMatch(match)) continue
    if (sessionId && match.sessionId !== sessionId) continue
    ids.add(match.player1Id)
    ids.add(match.player2Id)
  }
  return ids
}

/**
 * Players for history / stats filters: listed roster + anyone with visible matches in scope.
 * Fixes imported players missing from lobby roster but present in match rows.
 */
export function getMatchFilterPlayers(
  state: Pick<AppState, 'players' | 'matches' | 'activeMatches' | 'sessionPlayers'>,
  sessionId?: string,
): Player[] {
  const fromMatches = collectPlayerIdsFromMatches(state, sessionId)
  const byId = new Map<string, Player>()

  for (const player of state.players) {
    if (isDeletedPlayer(player)) continue
    if (isListedPlayer(state, player, sessionId) || fromMatches.has(player.id)) {
      byId.set(player.id, player)
    }
  }

  return [...byId.values()].sort(comparePlayerNames)
}

/** Merge player ids into explicit session roster (e.g. after import). */
export function mergeSessionRosterPlayerIds(
  state: Pick<AppState, 'sessionPlayers'>,
  sessionId: string,
  playerIds: Iterable<string>,
): AppState['sessionPlayers'] {
  const existing = state.sessionPlayers.filter((row) => row.sessionId === sessionId)
  const idSet = new Set(existing.map((row) => row.playerId))
  for (const playerId of playerIds) {
    if (playerId) idSet.add(playerId)
  }

  return [
    ...state.sessionPlayers.filter((row) => row.sessionId !== sessionId),
    ...[...idSet].map((playerId) => {
      const prior = existing.find((row) => row.playerId === playerId)
      return {
        sessionId,
        playerId,
        defaultDeckVariantId: prior?.defaultDeckVariantId ?? null,
      }
    }),
  ]
}

/** Collect unique player ids from matches. */
export function playerIdsFromMatches(matches: Array<{ player1Id: string; player2Id: string }>): string[] {
  const ids = new Set<string>()
  for (const match of matches) {
    ids.add(match.player1Id)
    ids.add(match.player2Id)
  }
  return [...ids]
}

/**
 * Ensure imported / restored players are selectable in lobby roster for the session.
 * Unarchives players that appear in matches but were archived.
 */
export function ensureImportPlayersInSession(
  state: AppState,
  sessionId: string,
  playerIds: Iterable<string>,
): AppState {
  const idSet = new Set(playerIds)
  const players = state.players.map((player) => {
    if (!idSet.has(player.id)) return player
    if (player.archived || player.deletedAt) {
      return {
        ...player,
        archived: false,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      }
    }
    return player
  })

  return {
    ...state,
    players,
    sessionPlayers: mergeSessionRosterPlayerIds(state, sessionId, idSet),
  }
}

/** Merge match participants into each session roster (import / repair). */
export function syncSessionRostersFromMatches(state: AppState): AppState {
  let next = state
  const sessionIds = new Set<string>()
  for (const match of state.matches) {
    if (!isVisibleMatch(match)) continue
    sessionIds.add(match.sessionId)
  }
  for (const sessionId of sessionIds) {
    next = ensureImportPlayersInSession(next, sessionId, collectPlayerIdsFromMatches(next, sessionId))
  }
  return next
}

function buildPlayerNamesFromImportRows(state: AppState): Map<string, string> {
  const names = new Map<string, string>()
  for (const row of state.importRows) {
    if (row.status !== 'imported' || !row.matchId) continue
    const match = state.matches.find((item) => item.id === row.matchId)
    if (!match || !isVisibleMatch(match)) continue
    const p1 = row.raw.player1Name?.trim()
    const p2 = row.raw.player2Name?.trim()
    if (p1) names.set(match.player1Id, p1)
    if (p2) names.set(match.player2Id, p2)
  }
  return names
}

/**
 * Restore players removed by sync but still referenced on visible matches (e.g. after import).
 */
export function repairPlayersReferencedByMatches(state: AppState): AppState {
  const needed = collectPlayerIdsFromMatches(state)
  if (!needed.size) return state

  const namesFromImport = buildPlayerNamesFromImportRows(state)
  const byId = new Map(state.players.map((player) => [player.id, player]))
  let changed = false
  const players = [...state.players]

  for (const playerId of needed) {
    const existing = byId.get(playerId)
    if (existing && !isDeletedPlayer(existing)) continue

    const recoveredName = namesFromImport.get(playerId) ?? existing?.name ?? '未知玩家'
    const timestamp = nowIso()

    if (existing) {
      const index = players.findIndex((player) => player.id === playerId)
      if (index >= 0) {
        players[index] = {
          ...existing,
          name: recoveredName,
          archived: false,
          deletedAt: null,
          updatedAt: timestamp,
        }
        changed = true
      }
      continue
    }

    const player: Player = {
      id: playerId,
      name: recoveredName,
      aliases: [],
      archived: false,
      deletedAt: null,
      profileClaimDeviceId: null,
      profileClaimedAt: null,
      linkedUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    players.unshift(player)
    byId.set(playerId, player)
    changed = true
  }

  if (!changed) {
    return syncSessionRostersFromMatches(state)
  }

  let next: AppState = { ...state, players }
  return syncSessionRostersFromMatches(next)
}
