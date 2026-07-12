import type { EntityDiffCode } from '@/lib/entityDiff'
import {
  summarizeActiveDiffCodes,
  summarizeMatchDiffCodes,
  summarizePlayerDiffCodes,
  summarizeSessionDiffCodes,
} from '@/lib/entityDiff'
import type { GroupScopedSnapshot } from '@/lib/groupScope'
import { createId, nowIso } from '@/lib/utils'
import type {
  ActiveMatch,
  AppState,
  Match,
  Player,
  Session,
  SyncConflict,
} from '@/types'

export type ConflictEntityKind = SyncConflict['entityKind']
export type ConflictSource = SyncConflict['source']

export interface RemoteGroupEntities {
  activeMatches: ActiveMatch[]
  matches: Match[]
  players: Player[]
  sessions: Session[]
  meta: {
    matchUpdatedAt: Map<string, string>
    matchUpdatedBy: Map<string, string | null>
    playerUpdatedAt: Map<string, string>
    playerUpdatedBy: Map<string, string | null>
    sessionUpdatedAt: Map<string, string>
    sessionUpdatedBy: Map<string, string | null>
    activeUpdatedAt: Map<string, string>
    activeUpdatedBy: Map<string, string | null>
  }
}

function matchLabel(match: Match): string {
  return `#${match.matchNumber}`
}

function playerLabel(player: Player): string {
  return player.name
}

function sessionLabel(session: Session): string {
  return session.name
}

function activeLabel(match: ActiveMatch): string {
  return `#${match.matchNumber}`
}

export function matchEntitiesDiffer(left: Match, right: Match): boolean {
  return (
    left.deletedAt !== right.deletedAt ||
    left.source !== right.source ||
    left.notes !== right.notes ||
    left.winnerPlayerId !== right.winnerPlayerId ||
    left.winnerDeckId !== right.winnerDeckId ||
    left.player1Id !== right.player1Id ||
    left.player2Id !== right.player2Id ||
    left.deck1Id !== right.deck1Id ||
    left.deck2Id !== right.deck2Id ||
    left.firstPlayerId !== right.firstPlayerId ||
    left.finishedAt !== right.finishedAt
  )
}

export function playerEntitiesDiffer(left: Player, right: Player): boolean {
  return (
    left.name !== right.name ||
    left.archived !== right.archived ||
    left.deletedAt !== right.deletedAt ||
    left.linkedUserId !== right.linkedUserId ||
    left.aliases.join('\u0000') !== right.aliases.join('\u0000')
  )
}

export function sessionEntitiesDiffer(left: Session, right: Session): boolean {
  return (
    left.name !== right.name ||
    left.startedAt !== right.startedAt ||
    left.endedAt !== right.endedAt ||
    left.archivedAt !== right.archivedAt ||
    left.deletedAt !== right.deletedAt
  )
}

export function activeEntitiesDiffer(left: ActiveMatch, right: ActiveMatch): boolean {
  return (
    left.sessionId !== right.sessionId ||
    left.player1Id !== right.player1Id ||
    left.player2Id !== right.player2Id ||
    left.deck1Id !== right.deck1Id ||
    left.deck2Id !== right.deck2Id ||
    left.firstPlayerId !== right.firstPlayerId ||
    left.tableSlot !== right.tableSlot ||
    left.notes !== right.notes
  )
}

export function summarizeMatchEntityDiff(left: Match, right: Match): EntityDiffCode[] {
  return summarizeMatchDiffCodes(left, right)
}

export function summarizePlayerEntityDiff(left: Player, right: Player): EntityDiffCode[] {
  return summarizePlayerDiffCodes(left, right)
}

export function summarizeSessionEntityDiff(left: Session, right: Session): EntityDiffCode[] {
  return summarizeSessionDiffCodes(left, right)
}

export function summarizeActiveEntityDiff(left: ActiveMatch, right: ActiveMatch): EntityDiffCode[] {
  return summarizeActiveDiffCodes(left, right)
}

export interface JoinConflictContext {
  cloudUserId: string | null
  bookmarkPlayerId: string | null
}

/** Profile-link-only drift for the bookmarked roster identity — safe to auto-merge. */
export function isBenignPlayerJoinDrift(
  local: Player,
  remote: Player,
  ctx: JoinConflictContext,
): boolean {
  const diffs = summarizePlayerEntityDiff(local, remote)
  const materialDiffs = diffs.filter((code) => code !== 'aliasesChanged')
  if (materialDiffs.length !== 1 || materialDiffs[0] !== 'profileLinkChanged') return false

  const localLink = local.linkedUserId ?? null
  const remoteLink = remote.linkedUserId ?? null
  if (localLink === remoteLink) return true

  if (ctx.bookmarkPlayerId && local.id !== ctx.bookmarkPlayerId) return false

  if (!ctx.cloudUserId) return localLink === null || remoteLink === null

  return localLink === ctx.cloudUserId || remoteLink === ctx.cloudUserId || localLink === null || remoteLink === null
}

export function mergeBenignJoinedPlayer(
  local: Player | undefined,
  remote: Player,
  ctx: JoinConflictContext | undefined,
): Player {
  if (!local || !ctx || !isBenignPlayerJoinDrift(local, remote, ctx)) return remote
  return {
    ...remote,
    linkedUserId: local.linkedUserId ?? remote.linkedUserId,
    aliases: local.aliases.length ? local.aliases : remote.aliases,
  }
}

function buildConflictBase(
  source: ConflictSource,
  entityKind: ConflictEntityKind,
  entityId: string,
  localLabel: string,
  remoteLabel: string,
  diffCodes: EntityDiffCode[],
  remoteUpdatedAt: string,
  remoteUpdatedBy: string | null,
): SyncConflict {
  return {
    id: createId(),
    at: nowIso(),
    source,
    entityKind,
    entityId,
    localLabel,
    remoteLabel,
    diffCodes,
    remoteUpdatedAt,
    remoteUpdatedBy,
  }
}

export function buildMatchConflict(
  source: ConflictSource,
  local: Match,
  remote: Match,
  remoteUpdatedAt: string,
  remoteUpdatedBy: string | null,
): SyncConflict {
  return {
    ...buildConflictBase(
      source,
      'match',
      local.id,
      matchLabel(local),
      matchLabel(remote),
      summarizeMatchEntityDiff(local, remote),
      remoteUpdatedAt,
      remoteUpdatedBy,
    ),
    localMatch: local,
    remoteMatch: remote,
  }
}

export function buildPlayerConflict(
  source: ConflictSource,
  local: Player,
  remote: Player,
  remoteUpdatedAt: string,
  remoteUpdatedBy: string | null,
): SyncConflict {
  return {
    ...buildConflictBase(
      source,
      'player',
      local.id,
      playerLabel(local),
      playerLabel(remote),
      summarizePlayerEntityDiff(local, remote),
      remoteUpdatedAt,
      remoteUpdatedBy,
    ),
    localPlayer: local,
    remotePlayer: remote,
  }
}

export function buildSessionConflict(
  source: ConflictSource,
  local: Session,
  remote: Session,
  remoteUpdatedAt: string,
  remoteUpdatedBy: string | null,
): SyncConflict {
  return {
    ...buildConflictBase(
      source,
      'session',
      local.id,
      sessionLabel(local),
      sessionLabel(remote),
      summarizeSessionEntityDiff(local, remote),
      remoteUpdatedAt,
      remoteUpdatedBy,
    ),
    localSession: local,
    remoteSession: remote,
  }
}

export function buildActiveConflict(
  source: ConflictSource,
  local: ActiveMatch,
  remote: ActiveMatch,
  remoteUpdatedAt: string,
  remoteUpdatedBy: string | null,
): SyncConflict {
  return {
    ...buildConflictBase(
      source,
      'active_match',
      local.id,
      activeLabel(local),
      activeLabel(remote),
      summarizeActiveEntityDiff(local, remote),
      remoteUpdatedAt,
      remoteUpdatedBy,
    ),
    localActive: local,
    remoteActive: remote,
  }
}

export function detectJoinConflicts(
  snapshot: GroupScopedSnapshot,
  remote: RemoteGroupEntities,
  ctx?: JoinConflictContext,
): SyncConflict[] {
  const conflicts: SyncConflict[] = []
  const conflictIds = new Set<string>()

  for (const local of snapshot.matches) {
    const remoteMatch = remote.matches.find((item) => item.id === local.id)
    if (!remoteMatch || !matchEntitiesDiffer(local, remoteMatch)) continue
    conflicts.push(
      buildMatchConflict(
        'join',
        local,
        remoteMatch,
        remote.meta.matchUpdatedAt.get(local.id) ?? nowIso(),
        remote.meta.matchUpdatedBy.get(local.id) ?? null,
      ),
    )
    conflictIds.add(local.id)
  }

  for (const local of snapshot.players) {
    const remotePlayer = remote.players.find((item) => item.id === local.id)
    if (!remotePlayer || !playerEntitiesDiffer(local, remotePlayer)) continue
    if (ctx && isBenignPlayerJoinDrift(local, remotePlayer, ctx)) continue
    conflicts.push(
      buildPlayerConflict(
        'join',
        local,
        remotePlayer,
        remote.meta.playerUpdatedAt.get(local.id) ?? nowIso(),
        remote.meta.playerUpdatedBy.get(local.id) ?? null,
      ),
    )
    conflictIds.add(local.id)
  }

  for (const local of snapshot.sessions) {
    const remoteSession = remote.sessions.find((item) => item.id === local.id)
    if (!remoteSession || !sessionEntitiesDiffer(local, remoteSession)) continue
    conflicts.push(
      buildSessionConflict(
        'join',
        local,
        remoteSession,
        remote.meta.sessionUpdatedAt.get(local.id) ?? nowIso(),
        remote.meta.sessionUpdatedBy.get(local.id) ?? null,
      ),
    )
    conflictIds.add(local.id)
  }

  for (const local of snapshot.activeMatches) {
    const remoteActive = remote.activeMatches.find((item) => item.id === local.id)
    if (!remoteActive || !activeEntitiesDiffer(local, remoteActive)) continue
    conflicts.push(
      buildActiveConflict(
        'join',
        local,
        remoteActive,
        remote.meta.activeUpdatedAt.get(local.id) ?? nowIso(),
        remote.meta.activeUpdatedBy.get(local.id) ?? null,
      ),
    )
    conflictIds.add(local.id)
  }

  return conflicts
}

export function mergeUniqueConflicts(
  existing: SyncConflict[],
  incoming: SyncConflict[],
): SyncConflict[] {
  const byEntity = new Map(existing.map((item) => [`${item.entityKind}:${item.entityId}`, item]))
  for (const conflict of incoming) {
    byEntity.set(`${conflict.entityKind}:${conflict.entityId}`, conflict)
  }
  return [...byEntity.values()].sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  )
}

export function applyRemoteConflictResolution(
  state: AppState,
  conflict: SyncConflict,
): AppState {
  switch (conflict.entityKind) {
    case 'match': {
      if (!conflict.remoteMatch) return state
      const matches = [
        conflict.remoteMatch,
        ...state.matches.filter((item) => item.id !== conflict.entityId),
      ].sort(
        (left, right) => new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime(),
      )
      return { ...state, matches }
    }
    case 'active_match': {
      if (!conflict.remoteActive) return state
      return {
        ...state,
        activeMatches: [
          conflict.remoteActive,
          ...state.activeMatches.filter((item) => item.id !== conflict.entityId),
        ],
      }
    }
    case 'player': {
      if (!conflict.remotePlayer) return state
      return {
        ...state,
        players: [
          conflict.remotePlayer,
          ...state.players.filter((item) => item.id !== conflict.entityId),
        ],
      }
    }
    case 'session': {
      if (!conflict.remoteSession) return state
      return {
        ...state,
        sessions: [
          conflict.remoteSession,
          ...state.sessions.filter((item) => item.id !== conflict.entityId),
        ].sort(
          (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
        ),
      }
    }
    default:
      return state
  }
}

export function applyLocalConflictResolution(
  state: AppState,
  conflict: SyncConflict,
): AppState {
  switch (conflict.entityKind) {
    case 'match': {
      if (!conflict.localMatch) return state
      const matches = [
        conflict.localMatch,
        ...state.matches.filter((item) => item.id !== conflict.entityId),
      ].sort(
        (left, right) => new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime(),
      )
      return { ...state, matches }
    }
    case 'active_match': {
      if (!conflict.localActive) return state
      return {
        ...state,
        activeMatches: [
          conflict.localActive,
          ...state.activeMatches.filter((item) => item.id !== conflict.entityId),
        ],
      }
    }
    case 'player': {
      if (!conflict.localPlayer) return state
      return {
        ...state,
        players: [
          conflict.localPlayer,
          ...state.players.filter((item) => item.id !== conflict.entityId),
        ],
      }
    }
    case 'session': {
      if (!conflict.localSession) return state
      return {
        ...state,
        sessions: [
          conflict.localSession,
          ...state.sessions.filter((item) => item.id !== conflict.entityId),
        ].sort(
          (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
        ),
      }
    }
    default:
      return state
  }
}

export function conflictEntityIds(conflicts: SyncConflict[]): Set<string> {
  return new Set(conflicts.map((item) => `${item.entityKind}:${item.entityId}`))
}

export function isConflictEntity(
  conflicts: SyncConflict[],
  entityKind: ConflictEntityKind,
  entityId: string,
): boolean {
  return conflicts.some((item) => item.entityKind === entityKind && item.entityId === entityId)
}
