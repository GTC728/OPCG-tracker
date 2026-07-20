import type { AppState, Player } from '@/types'
import {
  isDeletedPlayer,
  isListedPlayer,
  isVisibleMatch,
} from '@/lib/entityVisibility'

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
