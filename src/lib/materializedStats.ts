import { getDeckDisplayName } from '@/lib/leaderDisplay'
import {
  getWinRate,
  getWeightedWinRate,
  MIN_RELIABLE_SAMPLE,
  sortStatsByWeightedWinRate,
  type DashboardStats,
  type FirstSecondStat,
  type MatchupStat,
  type MetaSummaryStats,
  type PlayerDeckStat,
  type PlayerMatchupStat,
  type RecordStat,
} from '@/lib/stats'
import type { Deck, Language, Match, Player } from '@/types'

export type MaterializedScope = { type: 'all' } | { type: 'session'; sessionId: string }

interface WinLossAgg {
  wins: number
  losses: number
}

interface PairAgg {
  aId: string
  bId: string
  aWins: number
  bWins: number
}

export interface ScopeMaterialized {
  totalMatches: number
  players: Map<string, WinLossAgg>
  decks: Map<string, WinLossAgg>
  playerDecks: Map<string, WinLossAgg>
  deckUsage: Map<string, number>
  uniquePlayers: Set<string>
  uniqueDecks: Set<string>
  firstPlayerWins: number
  firstPlayerTotal: number
  firstAttackWins: number
  firstAttackTotal: number
  playerMatchups: Map<string, PairAgg>
  deckMatchups: Map<string, PairAgg>
}

interface MaterializedStore {
  fingerprint: string
  global: ScopeMaterialized
  bySession: Map<string, ScopeMaterialized>
}

let store: MaterializedStore | null = null

function emptyScope(): ScopeMaterialized {
  return {
    totalMatches: 0,
    players: new Map(),
    decks: new Map(),
    playerDecks: new Map(),
    deckUsage: new Map(),
    uniquePlayers: new Set(),
    uniqueDecks: new Set(),
    firstPlayerWins: 0,
    firstPlayerTotal: 0,
    firstAttackWins: 0,
    firstAttackTotal: 0,
    playerMatchups: new Map(),
    deckMatchups: new Map(),
  }
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function bumpWinLoss(map: Map<string, WinLossAgg>, id: string, won: boolean, delta: number) {
  const current = map.get(id) ?? { wins: 0, losses: 0 }
  if (won) current.wins += delta
  else current.losses += delta
  if (current.wins <= 0 && current.losses <= 0) map.delete(id)
  else map.set(id, current)
}

function bumpUsage(map: Map<string, number>, id: string, delta: number) {
  const next = (map.get(id) ?? 0) + delta
  if (next <= 0) map.delete(id)
  else map.set(id, next)
}

function bumpPairMatchup(
  map: Map<string, PairAgg>,
  idA: string,
  idB: string,
  winnerId: string,
  delta: number,
) {
  const [aId, bId] = idA < idB ? [idA, idB] : [idB, idA]
  const key = pairKey(aId, bId)
  const current = map.get(key) ?? { aId, bId, aWins: 0, bWins: 0 }
  if (winnerId === aId) current.aWins += delta
  else if (winnerId === bId) current.bWins += delta
  if (current.aWins <= 0 && current.bWins <= 0) map.delete(key)
  else map.set(key, current)
}

function applyMatchToScope(scope: ScopeMaterialized, match: Match, delta: number) {
  scope.totalMatches += delta

  const p1Won = match.winnerPlayerId === match.player1Id
  bumpWinLoss(scope.players, match.player1Id, p1Won, delta)
  bumpWinLoss(scope.players, match.player2Id, !p1Won, delta)

  const d1Won = match.winnerDeckId === match.deck1Id
  bumpWinLoss(scope.decks, match.deck1Id, d1Won, delta)
  bumpWinLoss(scope.decks, match.deck2Id, !d1Won, delta)

  bumpWinLoss(scope.playerDecks, `${match.player1Id}:${match.deck1Id}`, p1Won, delta)
  bumpWinLoss(scope.playerDecks, `${match.player2Id}:${match.deck2Id}`, !p1Won, delta)

  bumpUsage(scope.deckUsage, match.deck1Id, delta)
  bumpUsage(scope.deckUsage, match.deck2Id, delta)

  if (delta > 0) {
    scope.uniquePlayers.add(match.player1Id)
    scope.uniquePlayers.add(match.player2Id)
    scope.uniqueDecks.add(match.deck1Id)
    scope.uniqueDecks.add(match.deck2Id)
  }

  if (match.firstPlayerId !== null) {
    scope.firstPlayerTotal += delta
    if (match.firstPlayerId === match.winnerPlayerId) scope.firstPlayerWins += delta
    scope.firstAttackTotal += delta
    if (match.firstPlayerId === match.winnerPlayerId) scope.firstAttackWins += delta
  }

  bumpPairMatchup(scope.playerMatchups, match.player1Id, match.player2Id, match.winnerPlayerId, delta)

  if (match.deck1Id !== match.deck2Id) {
    bumpPairMatchup(scope.deckMatchups, match.deck1Id, match.deck2Id, match.winnerDeckId, delta)
  }
}

function isActiveCompletedMatch(match: Match): boolean {
  return match.deletedAt === null
}

export function computeMaterializedFingerprint(matches: Match[]): string {
  const completed = matches.filter(isActiveCompletedMatch)
  let lastId = ''
  let lastFinishedAt = ''
  if (completed.length) {
    let last = completed[0]
    for (let i = 1; i < completed.length; i += 1) {
      if (new Date(completed[i].finishedAt).getTime() > new Date(last.finishedAt).getTime()) {
        last = completed[i]
      }
    }
    lastId = last.id
    lastFinishedAt = last.finishedAt
  }
  return `${completed.length}|${lastId}|${lastFinishedAt}`
}

function parseFingerprint(fp: string): { count: number; lastId: string; lastFinishedAt: string } {
  const [countStr, lastId = '', lastFinishedAt = ''] = fp.split('|')
  return { count: Number.parseInt(countStr, 10) || 0, lastId, lastFinishedAt }
}

function bumpFingerprintOnAdd(match: Match): void {
  const current = ensureStore()
  const { count, lastId, lastFinishedAt } = parseFingerprint(current.fingerprint)
  const nextCount = count + 1
  const matchTime = new Date(match.finishedAt).getTime()
  const lastTime = lastFinishedAt ? new Date(lastFinishedAt).getTime() : 0
  if (matchTime >= lastTime) {
    current.fingerprint = `${nextCount}|${match.id}|${match.finishedAt}`
  } else {
    current.fingerprint = `${nextCount}|${lastId}|${lastFinishedAt}`
  }
}

function bumpFingerprintOnRemove(match: Match): void {
  const current = ensureStore()
  const { count, lastId, lastFinishedAt } = parseFingerprint(current.fingerprint)
  const nextCount = Math.max(0, count - 1)
  if (match.id === lastId) {
    current.fingerprint = ''
    return
  }
  current.fingerprint = `${nextCount}|${lastId}|${lastFinishedAt}`
}

function ensureStore(): MaterializedStore {
  if (!store) {
    store = {
      fingerprint: '',
      global: emptyScope(),
      bySession: new Map(),
    }
  }
  return store
}

function sessionScope(sessionId: string): ScopeMaterialized {
  const current = ensureStore()
  let scope = current.bySession.get(sessionId)
  if (!scope) {
    scope = emptyScope()
    current.bySession.set(sessionId, scope)
  }
  return scope
}

export function rebuildMaterializedStats(matches: Match[]): void {
  const current = ensureStore()
  current.fingerprint = computeMaterializedFingerprint(matches)
  current.global = emptyScope()
  current.bySession = new Map()

  for (const match of matches) {
    if (!isActiveCompletedMatch(match)) continue
    applyMatchToScope(current.global, match, 1)
    applyMatchToScope(sessionScope(match.sessionId), match, 1)
  }
}

export function rebuildMaterializedIfStale(matches: Match[]): void {
  const current = ensureStore()
  if (!current.fingerprint) rebuildMaterializedStats(matches)
}

export function applyMaterializedMatch(match: Match): void {
  if (!isActiveCompletedMatch(match)) return
  const current = ensureStore()
  applyMatchToScope(current.global, match, 1)
  applyMatchToScope(sessionScope(match.sessionId), match, 1)
  bumpFingerprintOnAdd(match)
}

export function removeMaterializedMatch(match: Match): void {
  if (!isActiveCompletedMatch(match)) return
  const current = ensureStore()
  applyMatchToScope(current.global, match, -1)
  applyMatchToScope(sessionScope(match.sessionId), match, -1)
  bumpFingerprintOnRemove(match)
}

export function replaceMaterializedMatch(before: Match, after: Match): void {
  removeMaterializedMatch(before)
  applyMaterializedMatch(after)
}

export function syncMaterializedStats(matches: Match[]): void {
  const fp = computeMaterializedFingerprint(matches)
  const current = ensureStore()
  if (current.fingerprint !== fp) rebuildMaterializedStats(matches)
  else current.fingerprint = fp
}

function resolveScope(scope: MaterializedScope): ScopeMaterialized {
  const current = ensureStore()
  if (scope.type === 'all') return current.global
  return current.bySession.get(scope.sessionId) ?? emptyScope()
}

function toRecordStat(id: string, name: string, agg: WinLossAgg): RecordStat {
  const total = agg.wins + agg.losses
  return {
    id,
    name,
    wins: agg.wins,
    losses: agg.losses,
    total,
    winRate: getWinRate(agg.wins, total),
  }
}

function pickReliableTop(stats: RecordStat[]): RecordStat | null {
  const eligible = sortStatsByWeightedWinRate(stats.filter((s) => s.total >= MIN_RELIABLE_SAMPLE))
  return eligible[0] ?? null
}

export function materializedPlayerStats(players: Player[], scope: MaterializedScope): RecordStat[] {
  const agg = resolveScope(scope)
  return players
    .filter((p) => !p.deletedAt && agg.players.has(p.id))
    .map((p) => toRecordStat(p.id, p.name, agg.players.get(p.id)!))
    .sort((a, b) => {
      const left = getWeightedWinRate(a.wins, a.total)
      const right = getWeightedWinRate(b.wins, b.total)
      if (right !== left) return right - left
      return b.total - a.total
    })
}

export function materializedDeckStats(decks: Deck[], scope: MaterializedScope, language: Language): RecordStat[] {
  const agg = resolveScope(scope)
  return decks
    .filter((d) => !d.archived && agg.decks.has(d.id))
    .map((d) => toRecordStat(d.id, getDeckDisplayName(d, language), agg.decks.get(d.id)!))
    .sort((a, b) => {
      const left = getWeightedWinRate(a.wins, a.total)
      const right = getWeightedWinRate(b.wins, b.total)
      if (right !== left) return right - left
      return b.total - a.total
    })
}

export function materializedPlayerDeckStats(
  players: Player[],
  decks: Deck[],
  scope: MaterializedScope,
  language: Language,
): PlayerDeckStat[] {
  const agg = resolveScope(scope)
  const playerNameById = new Map(players.map((p) => [p.id, p.name]))
  const deckById = new Map(decks.map((d) => [d.id, d]))
  const result: PlayerDeckStat[] = []

  for (const [key, wl] of agg.playerDecks) {
    const [playerId, deckId] = key.split(':')
    const deck = deckById.get(deckId)
    if (!deck) continue
    const base = toRecordStat(deckId, getDeckDisplayName(deck, language), wl)
    result.push({
      ...base,
      playerId,
      deckId,
      playerName: playerNameById.get(playerId) ?? '未知玩家',
      deckName: base.name,
    })
  }

  return result.sort((a, b) => b.total - a.total)
}

export function materializedPlayerMatchupStats(players: Player[], scope: MaterializedScope): PlayerMatchupStat[] {
  const agg = resolveScope(scope)
  const names = new Map(players.filter((p) => !p.deletedAt).map((p) => [p.id, p.name]))

  return [...agg.playerMatchups.values()]
    .filter((pair) => names.has(pair.aId) && names.has(pair.bId))
    .map((pair) => {
      const total = pair.aWins + pair.bWins
      return {
        key: pairKey(pair.aId, pair.bId),
        playerAId: pair.aId,
        playerAName: names.get(pair.aId) ?? '未知玩家',
        playerBId: pair.bId,
        playerBName: names.get(pair.bId) ?? '未知玩家',
        playerAWins: pair.aWins,
        playerBWins: pair.bWins,
        total,
        playerAWinRate: getWinRate(pair.aWins, total),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function materializedMatchupStats(decks: Deck[], scope: MaterializedScope, language: Language): MatchupStat[] {
  const agg = resolveScope(scope)
  const names = new Map(decks.map((d) => [d.id, getDeckDisplayName(d, language)]))

  return [...agg.deckMatchups.values()]
    .map((pair) => {
      const total = pair.aWins + pair.bWins
      return {
        key: pairKey(pair.aId, pair.bId),
        deckAId: pair.aId,
        deckAName: names.get(pair.aId) ?? '未知牌組',
        deckBId: pair.bId,
        deckBName: names.get(pair.bId) ?? '未知牌組',
        deckAWins: pair.aWins,
        deckBWins: pair.bWins,
        total,
        deckAWinRate: getWinRate(pair.aWins, total),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function materializedMetaSummary(scope: MaterializedScope): MetaSummaryStats {
  const agg = resolveScope(scope)
  const uniqueDecks = agg.decks.size
  return {
    totalMatches: agg.totalMatches,
    uniquePlayers: agg.players.size,
    uniqueDecks,
    diversityPercent: agg.totalMatches > 0 ? Math.round((uniqueDecks / agg.totalMatches) * 100) : 0,
  }
}

export function materializedFirstSecondStats(scope: MaterializedScope): FirstSecondStat[] {
  const agg = resolveScope(scope)
  const firstWins = agg.firstAttackWins
  const total = agg.firstAttackTotal
  const secondWins = total - firstWins
  return [
    { label: '先攻', wins: firstWins, total, winRate: getWinRate(firstWins, total) },
    { label: '後攻', wins: secondWins, total, winRate: getWinRate(secondWins, total) },
  ]
}

export function materializedDashboardStats(
  players: Player[],
  decks: Deck[],
  scope: MaterializedScope,
  language: Language,
): DashboardStats {
  const agg = resolveScope(scope)
  const playerStats = materializedPlayerStats(players, scope)
  const deckStats = materializedDeckStats(decks, scope, language)

  const mostUsedEntry = [...agg.deckUsage.entries()].sort((a, b) => b[1] - a[1])[0]
  const mostUsedDeckData = mostUsedEntry ? decks.find((d) => d.id === mostUsedEntry[0]) : null

  return {
    totalMatches: agg.totalMatches,
    firstPlayerWinRate: getWinRate(agg.firstPlayerWins, agg.firstPlayerTotal),
    firstPlayerSample: agg.firstPlayerTotal,
    topPlayer: pickReliableTop(playerStats),
    topDeck: pickReliableTop(deckStats),
    mostUsedDeck: mostUsedEntry
      ? {
          id: mostUsedEntry[0],
          name: mostUsedDeckData ? getDeckDisplayName(mostUsedDeckData, language) : '未知牌組',
          total: mostUsedEntry[1],
        }
      : null,
  }
}

export function resetMaterializedStats(): void {
  store = null
}
