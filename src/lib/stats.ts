import { isDeletedPlayer } from '@/lib/entityVisibility'
import { translate } from '@/lib/i18n'
import type { Deck, Language, Match, Player } from '@/types'
import { getDeckDisplayName } from '@/lib/leaderDisplay'

export const MIN_RELIABLE_SAMPLE = 3
/** Minimum games for pilot / leaderboard rows (same as reliable sample). */
export const MIN_PILOT_LEADERBOARD_SAMPLE = MIN_RELIABLE_SAMPLE

export interface PlayerMatchupStat {
  key: string
  playerAId: string
  playerAName: string
  playerBId: string
  playerBName: string
  playerAWins: number
  playerBWins: number
  total: number
  playerAWinRate: number | null
}

export interface MetaSummaryStats {
  totalMatches: number
  uniquePlayers: number
  uniqueDecks: number
  diversityPercent: number
}

export interface RecordStat {
  id: string
  name: string
  wins: number
  losses: number
  total: number
  winRate: number | null
}

export interface DashboardStats {
  totalMatches: number
  firstPlayerWinRate: number | null
  firstPlayerSample: number
  topPlayer: RecordStat | null
  topDeck: RecordStat | null
  mostUsedDeck: { id: string; name: string; total: number } | null
}

export interface MatchupStat {
  key: string
  deckAId: string
  deckAName: string
  deckBId: string
  deckBName: string
  deckAWins: number
  deckBWins: number
  total: number
  deckAWinRate: number | null
}

export interface PlayerDeckStat extends RecordStat {
  playerId: string
  deckId: string
  playerName: string
  deckName: string
}

export interface FirstSecondStat {
  label: string
  wins: number
  total: number
  winRate: number | null
}

export interface DailyTrendStat {
  date: string
  total: number
}

export interface RecentFormStat {
  label: string
  wins: number
  total: number
  winRate: number | null
}

export function getCompletedMatches(matches: Match[]): Match[] {
  return matches.filter((match) => match.deletedAt === null)
}

export function getWinRate(wins: number, total: number): number | null {
  if (total === 0) return null
  return wins / total
}

/** Bayesian-style win rate: regresses small samples toward 50% (priorGames virtual games). */
export function getWeightedWinRate(wins: number, total: number, priorGames = 3, priorWinRate = 0.5): number {
  const priorWins = priorGames * priorWinRate
  return (wins + priorWins) / (total + priorGames)
}

export function sortStatsByWeightedWinRate(stats: RecordStat[]): RecordStat[] {
  return [...stats].sort((left, right) => {
    const leftScore = getWinRate(left.wins, left.total) ?? -1
    const rightScore = getWinRate(right.wins, right.total) ?? -1
    if (rightScore !== leftScore) return rightScore - leftScore
    return right.total - left.total
  })
}

function localizedDeckName(deck: Deck, language: Language): string {
  return getDeckDisplayName(deck, language)
}

export function buildPlayerStats(players: Player[], matches: Match[]): RecordStat[] {
  const completed = getCompletedMatches(matches)

  return players
    .filter((player) => !isDeletedPlayer(player))
    .map((player) => {
      let wins = 0
      let losses = 0

      for (const match of completed) {
        if (match.player1Id !== player.id && match.player2Id !== player.id) continue

        if (match.winnerPlayerId === player.id) {
          wins += 1
        } else {
          losses += 1
        }
      }

      const total = wins + losses

      return {
        id: player.id,
        name: player.name,
        wins,
        losses,
        total,
        winRate: getWinRate(wins, total),
      }
    })
    .filter((stat) => stat.total > 0)
    .sort((left, right) => {
      if ((right.winRate ?? 0) !== (left.winRate ?? 0)) {
        return (right.winRate ?? 0) - (left.winRate ?? 0)
      }
      return right.total - left.total
    })
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function getReliabilityLabel(total: number, t?: (key: import('@/lib/i18n').TranslationKey) => string): string {
  if (t) {
    if (total === 0) return t('stats.reliability.none')
    if (total <= 2) return t('stats.reliability.low')
    if (total <= 5) return t('stats.reliability.preliminary')
    if (total <= 10) return t('stats.reliability.reference')
    return t('stats.reliability.high')
  }
  if (total === 0) return '無資料'
  if (total <= 2) return '樣本不足'
  if (total <= 5) return '初步參考'
  if (total <= 10) return '參考'
  return '較可信'
}

export function buildDeckStats(decks: Deck[], matches: Match[], language: Language = 'en'): RecordStat[] {
  const completed = getCompletedMatches(matches)

  return decks
    .map((deck) => {
      let wins = 0
      let losses = 0

      for (const match of completed) {
        if (match.deck1Id !== deck.id && match.deck2Id !== deck.id) continue

        if (match.winnerDeckId === deck.id) {
          wins += 1
        } else {
          losses += 1
        }
      }

      const total = wins + losses

      return {
        id: deck.id,
        name: localizedDeckName(deck, language),
        wins,
        losses,
        total,
        winRate: getWinRate(wins, total),
      }
    })
    .filter((stat) => stat.total > 0)
    .sort((left, right) => {
      const leftScore = getWinRate(left.wins, left.total) ?? -1
      const rightScore = getWinRate(right.wins, right.total) ?? -1
      if (rightScore !== leftScore) return rightScore - leftScore
      return right.total - left.total
    })
}

export function buildDashboardStats(
  players: Player[],
  decks: Deck[],
  matches: Match[],
  language: Language = 'en',
): DashboardStats {
  const completed = getCompletedMatches(matches)
  const firstPlayerMatches = completed.filter((match) => match.firstPlayerId !== null)
  const firstPlayerWins = firstPlayerMatches.filter(
    (match) => match.firstPlayerId === match.winnerPlayerId,
  ).length
  const playerStats = buildPlayerStats(players, matches)
  const deckStats = buildDeckStats(decks, matches, language)
  const usageByDeck = new Map<string, number>()

  for (const match of completed) {
    usageByDeck.set(match.deck1Id, (usageByDeck.get(match.deck1Id) ?? 0) + 1)
    usageByDeck.set(match.deck2Id, (usageByDeck.get(match.deck2Id) ?? 0) + 1)
  }

  const mostUsedDeckEntry = [...usageByDeck.entries()].sort((left, right) => right[1] - left[1])[0]
  const mostUsedDeckData = mostUsedDeckEntry
    ? decks.find((deck) => deck.id === mostUsedDeckEntry[0])
    : null
  const mostUsedDeck = mostUsedDeckEntry
    ? {
        id: mostUsedDeckEntry[0],
        name: mostUsedDeckData ? localizedDeckName(mostUsedDeckData, language) : '未知牌組',
        total: mostUsedDeckEntry[1],
      }
    : null

  return {
    totalMatches: completed.length,
    firstPlayerWinRate: getWinRate(firstPlayerWins, firstPlayerMatches.length),
    firstPlayerSample: firstPlayerMatches.length,
    topPlayer: pickReliableTop(playerStats),
    topDeck: pickReliableTop(deckStats),
    mostUsedDeck,
  }
}

function pickReliableTop(stats: RecordStat[]): RecordStat | null {
  const eligible = sortStatsByWeightedWinRate(stats.filter((stat) => stat.total >= MIN_RELIABLE_SAMPLE))
  return eligible[0] ?? null
}

export function buildPlayerMatchupStats(players: Player[], matches: Match[]): PlayerMatchupStat[] {
  const playerNameById = new Map(
    players.filter((player) => !isDeletedPlayer(player)).map((player) => [player.id, player.name]),
  )
  const stats = new Map<string, PlayerMatchupStat>()

  for (const match of getCompletedMatches(matches)) {
    if (!playerNameById.has(match.player1Id) || !playerNameById.has(match.player2Id)) continue

    const [playerAId, playerBId] = [match.player1Id, match.player2Id].sort()
    const key = `${playerAId}:${playerBId}`
    const current =
      stats.get(key) ??
      ({
        key,
        playerAId,
        playerAName: playerNameById.get(playerAId) ?? '未知玩家',
        playerBId,
        playerBName: playerNameById.get(playerBId) ?? '未知玩家',
        playerAWins: 0,
        playerBWins: 0,
        total: 0,
        playerAWinRate: null,
      } satisfies PlayerMatchupStat)

    if (match.winnerPlayerId === playerAId) current.playerAWins += 1
    else if (match.winnerPlayerId === playerBId) current.playerBWins += 1
    current.total = current.playerAWins + current.playerBWins
    current.playerAWinRate = getWinRate(current.playerAWins, current.total)
    stats.set(key, current)
  }

  return [...stats.values()].sort((left, right) => right.total - left.total)
}

export function buildMetaSummaryStats(matches: Match[]): MetaSummaryStats {
  const completed = getCompletedMatches(matches)
  const uniquePlayers = new Set<string>()
  const uniqueDecks = new Set<string>()

  for (const match of completed) {
    uniquePlayers.add(match.player1Id)
    uniquePlayers.add(match.player2Id)
    uniqueDecks.add(match.deck1Id)
    uniqueDecks.add(match.deck2Id)
  }

  return {
    totalMatches: completed.length,
    uniquePlayers: uniquePlayers.size,
    uniqueDecks: uniqueDecks.size,
    diversityPercent:
      completed.length > 0 ? Math.round((uniqueDecks.size / completed.length) * 100) : 0,
  }
}

export function buildDailyTrendStats(matches: Match[]): DailyTrendStat[] {
  const counts = new Map<string, number>()

  for (const match of getCompletedMatches(matches)) {
    const date = match.finishedAt.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, total]) => ({ date, total }))
}

export function buildMatchupStats(decks: Deck[], matches: Match[], language: Language = 'en'): MatchupStat[] {
  const deckNameById = new Map(decks.map((deck) => [deck.id, localizedDeckName(deck, language)]))
  const stats = new Map<string, MatchupStat>()

  for (const match of getCompletedMatches(matches)) {
    if (match.deck1Id === match.deck2Id) continue

    const [deckAId, deckBId] = [match.deck1Id, match.deck2Id].sort()
    const key = `${deckAId}:${deckBId}`
    const current =
      stats.get(key) ??
      ({
        key,
        deckAId,
        deckAName: deckNameById.get(deckAId) ?? '未知牌組',
        deckBId,
        deckBName: deckNameById.get(deckBId) ?? '未知牌組',
        deckAWins: 0,
        deckBWins: 0,
        total: 0,
        deckAWinRate: null,
      } satisfies MatchupStat)

    if (match.winnerDeckId === deckAId) {
      current.deckAWins += 1
    } else if (match.winnerDeckId === deckBId) {
      current.deckBWins += 1
    }

    current.total += 1
    current.deckAWinRate = getWinRate(current.deckAWins, current.total)
    stats.set(key, current)
  }

  return [...stats.values()].sort((left, right) => right.total - left.total)
}

export function buildPlayerDeckStats(
  players: Player[],
  decks: Deck[],
  matches: Match[],
  language: Language = 'en',
): PlayerDeckStat[] {
  const playerNameById = new Map(players.map((player) => [player.id, player.name]))
  const deckNameById = new Map(decks.map((deck) => [deck.id, localizedDeckName(deck, language)]))
  const stats = new Map<string, PlayerDeckStat>()

  for (const match of getCompletedMatches(matches)) {
    const entries = [
      { playerId: match.player1Id, deckId: match.deck1Id },
      { playerId: match.player2Id, deckId: match.deck2Id },
    ]

    for (const entry of entries) {
      const key = `${entry.playerId}:${entry.deckId}`
      const current =
        stats.get(key) ??
        ({
          id: key,
          playerId: entry.playerId,
          deckId: entry.deckId,
          playerName: playerNameById.get(entry.playerId) ?? '未知玩家',
          deckName: deckNameById.get(entry.deckId) ?? '未知牌組',
          name: `${playerNameById.get(entry.playerId) ?? '未知玩家'} × ${
            deckNameById.get(entry.deckId) ?? '未知牌組'
          }`,
          wins: 0,
          losses: 0,
          total: 0,
          winRate: null,
        } satisfies PlayerDeckStat)

      if (match.winnerPlayerId === entry.playerId) {
        current.wins += 1
      } else {
        current.losses += 1
      }
      current.total = current.wins + current.losses
      current.winRate = getWinRate(current.wins, current.total)
      stats.set(key, current)
    }
  }

  return [...stats.values()].sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total
    return (right.winRate ?? 0) - (left.winRate ?? 0)
  })
}

export function sortPilotStatsForLeaderboard(stats: PlayerDeckStat[]): PlayerDeckStat[] {
  return [...stats]
    .filter((stat) => stat.total >= MIN_PILOT_LEADERBOARD_SAMPLE)
    .sort((left, right) => {
      const leftScore = getWinRate(left.wins, left.total) ?? -1
      const rightScore = getWinRate(right.wins, right.total) ?? -1
      if (rightScore !== leftScore) return rightScore - leftScore
      return right.total - left.total
    })
}

export function pickTopPilot(stats: PlayerDeckStat[]): PlayerDeckStat | null {
  return sortPilotStatsForLeaderboard(stats)[0] ?? null
}

export function buildFirstSecondStats(matches: Match[]): FirstSecondStat[] {
  const completed = getCompletedMatches(matches).filter((match) => match.firstPlayerId !== null)
  const firstWins = completed.filter((match) => match.firstPlayerId === match.winnerPlayerId).length
  const secondWins = completed.length - firstWins

  return [
    {
      label: 'first',
      wins: firstWins,
      total: completed.length,
      winRate: getWinRate(firstWins, completed.length),
    },
    {
      label: 'second',
      wins: secondWins,
      total: completed.length,
      winRate: getWinRate(secondWins, completed.length),
    },
  ]
}

export function buildDailyTrends(matches: Match[]): DailyTrendStat[] {
  const counts = new Map<string, number>()

  for (const match of getCompletedMatches(matches)) {
    const date = new Date(match.finishedAt).toISOString().slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function sortStatsByUsage(stats: RecordStat[]): RecordStat[] {
  return [...stats].sort((left, right) => right.total - left.total)
}

export interface InsightMessage {
  id: string
  text: string
}

export function buildInsightMessages(
  players: Player[],
  decks: Deck[],
  matches: Match[],
  language: Language = 'en',
): InsightMessage[] {
  const completed = getCompletedMatches(matches)
  const insights: InsightMessage[] = []
  const appearance = buildDeckAppearanceSummary(decks, matches, language)
  const { qualified, skipped } = partitionWeeklyMetaStats(
    buildWeeklyDeckMetaStats(decks, matches, language),
    MIN_WEEKLY_META_MATCHES,
  )
  const playerDeckStats = buildPlayerDeckStats(players, decks, matches, language)
  const playerStats = buildPlayerStats(players, matches)

  if (appearance.length >= 1 && completed.length >= 6) {
    const top = appearance[0]
    insights.push({
      id: 'meta-top-deck',
      text: translate(language, 'stats.insight.metaTopDeck')
        .replace('{deck}', top.name)
        .replace('{pct}', formatPercent(top.share))
        .replace('{n}', String(top.appearances)),
    })
  }

  if (appearance.length >= 3 && completed.length >= 10) {
    const topThreeShare =
      appearance.slice(0, 3).reduce((sum, item) => sum + item.share, 0)
    insights.push({
      id: 'meta-top-three',
      text: translate(language, 'stats.insight.metaTopThree')
        .replace('{pct}', formatPercent(topThreeShare))
        .replace('{n}', '3'),
    })
  }

  if (qualified.length > 0 || skipped.length > 0) {
    insights.push({
      id: 'meta-qualified-weeks',
      text: translate(language, 'stats.insight.metaQualifiedWeeks')
        .replace('{qualified}', String(qualified.length))
        .replace('{skipped}', String(skipped.length))
        .replace('{min}', String(MIN_WEEKLY_META_MATCHES)),
    })
  }

  const topPilot = sortPilotStatsForLeaderboard(playerDeckStats)[0]
  if (topPilot && (topPilot.winRate ?? 0) >= 0.55) {
    insights.push({
      id: 'top-pilot',
      text: translate(language, 'stats.insight.topPilot')
        .replace('{player}', topPilot.playerName)
        .replace('{deck}', topPilot.deckName)
        .replace('{rate}', formatPercent(topPilot.winRate))
        .replace('{wins}', String(topPilot.wins))
        .replace('{losses}', String(topPilot.losses)),
    })
  }

  const firstSecond = buildFirstSecondStats(matches)
  const first = firstSecond.find((stat) => stat.label === 'first')
  const second = firstSecond.find((stat) => stat.label === 'second')

  if (first && second && first.total >= 3) {
    insights.push({
      id: 'first-second',
      text: translate(language, 'stats.insight.firstSecond')
        .replace('{first}', formatPercent(first.winRate))
        .replace('{second}', formatPercent(second.winRate)),
    })
  }

  if (playerStats.length >= 2) {
    const margin = playerStats[0].wins - playerStats[1].wins
    if (margin >= 2) {
      insights.push({
        id: 'mvp-margin',
        text: translate(language, 'stats.insight.mvpMargin')
          .replace('{leader}', playerStats[0].name)
          .replace('{runner}', playerStats[1].name)
          .replace('{margin}', String(margin)),
      })
    }
  }

  const uniqueDecks = new Set<string>()
  for (const match of completed) {
    uniqueDecks.add(match.deck1Id)
    uniqueDecks.add(match.deck2Id)
  }
  if (completed.length >= 8) {
    insights.push({
      id: 'diversity',
      text: translate(language, 'stats.insight.diversity')
        .replace('{decks}', String(uniqueDecks.size))
        .replace('{matches}', String(completed.length))
        .replace('{pct}', ((uniqueDecks.size / completed.length) * 100).toFixed(0)),
    })
  }

  return insights.slice(0, 5)
}

export function buildHeadToHeadStats(
  playerId: string,
  players: Player[],
  matches: Match[],
): Array<RecordStat & { opponentId: string }> {
  const playerNameById = new Map(players.map((player) => [player.id, player.name]))
  const stats = new Map<string, { wins: number; losses: number; total: number }>()

  for (const match of getCompletedMatches(matches)) {
    if (match.player1Id !== playerId && match.player2Id !== playerId) continue
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const current = stats.get(opponentId) ?? { wins: 0, losses: 0, total: 0 }
    if (match.winnerPlayerId === playerId) {
      current.wins += 1
    } else {
      current.losses += 1
    }
    current.total = current.wins + current.losses
    stats.set(opponentId, current)
  }

  return [...stats.entries()]
    .map(([opponentId, value]) => ({
      id: opponentId,
      opponentId,
      name: playerNameById.get(opponentId) ?? '未知玩家',
      wins: value.wins,
      losses: value.losses,
      total: value.total,
      winRate: getWinRate(value.wins, value.total),
    }))
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total
      return (right.winRate ?? 0) - (left.winRate ?? 0)
    })
}

export function buildRecentForm(matches: Match[], playerId?: string): RecentFormStat[] {
  const windows = [5, 10, 20]
  const relevantMatches = getCompletedMatches(matches)
    .filter((match) => !playerId || match.player1Id === playerId || match.player2Id === playerId)
    .sort((left, right) => new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime())

  return windows.map((windowSize) => {
    const windowMatches = relevantMatches.slice(0, windowSize)
    const wins = playerId
      ? windowMatches.filter((match) => match.winnerPlayerId === playerId).length
      : windowMatches.length

    return {
      label: String(windowSize),
      wins,
      total: windowMatches.length,
      winRate: playerId ? getWinRate(wins, windowMatches.length) : null,
    }
  })
}

export interface WinStreakStats {
  currentStreak: number
  longestStreak: number
  currentLossStreak: number
  currentType: 'win' | 'loss' | 'none'
}

export function buildWinStreakStats(playerId: string, matches: Match[]): WinStreakStats {
  const relevant = getCompletedMatches(matches)
    .filter((match) => match.player1Id === playerId || match.player2Id === playerId)
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())

  if (!relevant.length) {
    return { currentStreak: 0, longestStreak: 0, currentLossStreak: 0, currentType: 'none' }
  }

  let longest = 0
  let run = 0
  let runType: 'win' | 'loss' | null = null

  for (const match of relevant) {
    const won = match.winnerPlayerId === playerId
    const type: 'win' | 'loss' = won ? 'win' : 'loss'
    if (type === runType) {
      run += 1
    } else {
      runType = type
      run = 1
    }
    if (type === 'win') longest = Math.max(longest, run)
  }

  const last = relevant[relevant.length - 1]
  const lastWon = last.winnerPlayerId === playerId
  let currentStreak = 0
  for (let i = relevant.length - 1; i >= 0; i -= 1) {
    const won = relevant[i].winnerPlayerId === playerId
    if (i === relevant.length - 1) {
      if (!won) break
      currentStreak = 1
      continue
    }
    if (won) currentStreak += 1
    else break
  }

  let currentLossStreak = 0
  for (let i = relevant.length - 1; i >= 0; i -= 1) {
    if (relevant[i].winnerPlayerId === playerId) break
    currentLossStreak += 1
  }

  return {
    currentStreak: lastWon ? currentStreak : 0,
    longestStreak: longest,
    currentLossStreak,
    currentType: lastWon ? 'win' : currentLossStreak > 0 ? 'loss' : 'none',
  }
}

export interface DeckUsageSlice {
  deckId: string
  deckName: string
  count: number
  percentage: number
  colors: string[]
}

export function buildDeckUsageDistribution(
  playerId: string,
  decks: Deck[],
  matches: Match[],
  language: Language,
): DeckUsageSlice[] {
  const counts = new Map<string, number>()
  for (const match of getCompletedMatches(matches)) {
    if (match.player1Id !== playerId && match.player2Id !== playerId) continue
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    counts.set(deckId, (counts.get(deckId) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0)
  if (!total) return []

  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  return [...counts.entries()]
    .map(([deckId, count]) => {
      const deck = deckById.get(deckId)
      return {
        deckId,
        deckName: deck ? localizedDeckName(deck, language) : '未知牌組',
        count,
        percentage: count / total,
        colors: deck?.colors ?? [],
      }
    })
    .sort((a, b) => b.count - a.count)
}

export interface WeeklyWinRateStat {
  weekStart: string
  label: string
  wins: number
  total: number
  winRate: number | null
}

function getWeekStart(date: Date): string {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function buildWeeklyWinRateStats(
  playerId: string,
  matches: Match[],
  weekCount = 12,
): WeeklyWinRateStat[] {
  const now = new Date()
  const weeks: WeeklyWinRateStat[] = []

  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const anchor = new Date(now)
    anchor.setDate(anchor.getDate() - offset * 7)
    const weekStart = getWeekStart(anchor)
    const weekStartDate = new Date(`${weekStart}T00:00:00`)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    const weekMatches = getCompletedMatches(matches).filter((match) => {
      if (match.player1Id !== playerId && match.player2Id !== playerId) return false
      const finished = new Date(match.finishedAt)
      return finished >= weekStartDate && finished < weekEndDate
    })

    const wins = weekMatches.filter((match) => match.winnerPlayerId === playerId).length
    weeks.push({
      weekStart,
      label: formatWeekLabel(weekStart),
      wins,
      total: weekMatches.length,
      winRate: weekMatches.length ? getWinRate(wins, weekMatches.length) : null,
    })
  }

  return weeks
}

export interface WeeklyWinRateChartPoint {
  label: string
  weeklyWinRate: number | null
  cumulativeWinRate: number | null
  total: number
}

/** Weekly dots plus cumulative win-rate trend for sparse weeks. */
export function buildWeeklyWinRateChartPoints(stats: WeeklyWinRateStat[]): WeeklyWinRateChartPoint[] {
  let cumulativeWins = 0
  let cumulativeTotal = 0

  return stats.map((item) => {
    if (item.total > 0) {
      cumulativeWins += item.wins
      cumulativeTotal += item.total
    }
    return {
      label: item.label,
      weeklyWinRate:
        item.total > 0 && item.winRate !== null ? Math.round(item.winRate * 100) : null,
      cumulativeWinRate:
        cumulativeTotal > 0 ? Math.round((cumulativeWins / cumulativeTotal) * 100) : null,
      total: item.total,
    }
  })
}

export const MIN_WEEKLY_META_MATCHES = 10

export interface WeeklyDeckMetaSlice {
  deckId: string
  deckName: string
  count: number
  share: number
}

export interface WeeklyDeckMetaStat {
  weekStart: string
  label: string
  /** Completed matches in this calendar week (Mon–Sun). */
  matchCount: number
  /** Deck appearance slots (≈ 2 × matchCount). */
  total: number
  decks: WeeklyDeckMetaSlice[]
}

export function buildWeeklyDeckMetaStats(
  decks: Deck[],
  matches: Match[],
  language: Language,
  weekCount = 12,
  topN = 6,
): WeeklyDeckMetaStat[] {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const now = new Date()
  const weeks: WeeklyDeckMetaStat[] = []

  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const anchor = new Date(now)
    anchor.setDate(anchor.getDate() - offset * 7)
    const weekStart = getWeekStart(anchor)
    const weekStartDate = new Date(`${weekStart}T00:00:00`)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    const counts = new Map<string, number>()
    let matchCount = 0
    for (const match of getCompletedMatches(matches)) {
      const finished = new Date(match.finishedAt)
      if (finished < weekStartDate || finished >= weekEndDate) continue
      matchCount += 1
      counts.set(match.deck1Id, (counts.get(match.deck1Id) ?? 0) + 1)
      counts.set(match.deck2Id, (counts.get(match.deck2Id) ?? 0) + 1)
    }

    const total = [...counts.values()].reduce((sum, value) => sum + value, 0)
    const sorted = [...counts.entries()]
      .map(([deckId, count]) => ({
        deckId,
        deckName: deckById.get(deckId)
          ? localizedDeckName(deckById.get(deckId)!, language)
          : '未知牌組',
        count,
        share: total ? count / total : 0,
      }))
      .sort((left, right) => right.count - left.count)

    const head = sorted.slice(0, Math.max(1, topN - 1))
    const tail = sorted.slice(Math.max(1, topN - 1))
    const otherCount = tail.reduce((sum, item) => sum + item.count, 0)
    const deckSlices =
      tail.length > 0
        ? [
            ...head,
            {
              deckId: '__other__',
              deckName: 'Other',
              count: otherCount,
              share: total ? otherCount / total : 0,
            },
          ]
        : head

    weeks.push({
      weekStart,
      label: formatWeekLabel(weekStart),
      matchCount,
      total,
      decks: deckSlices,
    })
  }

  return weeks
}

export interface MetaTransferChartPoint {
  label: string
  total: number
  [deckKey: string]: number | string
}

/** Stable deck keys for stacked chart — largest total appearances first, bottom layer first. */
export function buildMetaTransferChartPoints(
  stats: WeeklyDeckMetaStat[],
  minMatches = MIN_WEEKLY_META_MATCHES,
): { points: MetaTransferChartPoint[]; deckKeys: Array<{ key: string; name: string }> } {
  const { qualified } = partitionWeeklyMetaStats(stats, minMatches)
  const totals = new Map<string, { name: string; count: number }>()
  for (const week of qualified) {
    for (const deck of week.decks) {
      const key = deck.deckId
      const current = totals.get(key) ?? { name: deck.deckName, count: 0 }
      totals.set(key, { name: deck.deckName, count: current.count + deck.count })
    }
  }

  const deckKeys = [...totals.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .map(([key, value]) => ({ key, name: value.name }))

  const activeWeeks = qualified
  const points = activeWeeks.map((week) => {
    const point: MetaTransferChartPoint = { label: week.label, total: week.total }
    for (const { key } of deckKeys) {
      const slice = week.decks.find((deck) => deck.deckId === key)
      point[key] = slice?.count ?? 0
    }
    return point
  })

  return { points, deckKeys }
}

export function partitionWeeklyMetaStats(
  stats: WeeklyDeckMetaStat[],
  minMatches = MIN_WEEKLY_META_MATCHES,
): {
  qualified: WeeklyDeckMetaStat[]
  skipped: WeeklyDeckMetaStat[]
} {
  const qualified: WeeklyDeckMetaStat[] = []
  const skipped: WeeklyDeckMetaStat[] = []
  for (const week of stats) {
    if (week.matchCount === 0) continue
    if (week.matchCount >= minMatches) qualified.push(week)
    else skipped.push(week)
  }
  return { qualified, skipped }
}

export interface DeckShareTrendPoint {
  label: string
  matchCount: number
  shares: Array<{ deckId: string; deckName: string; share: number }>
}

/** Top deck share % per qualified week (for line chart). */
export function buildTopDeckShareTrend(
  stats: WeeklyDeckMetaStat[],
  topN = 3,
  minMatches = MIN_WEEKLY_META_MATCHES,
): { deckIds: Array<{ id: string; name: string }>; points: DeckShareTrendPoint[] } {
  const { qualified } = partitionWeeklyMetaStats(stats, minMatches)
  const totals = new Map<string, { name: string; count: number }>()
  for (const week of qualified) {
    for (const deck of week.decks) {
      if (deck.deckId === '__other__') continue
      const current = totals.get(deck.deckId) ?? { name: deck.deckName, count: 0 }
      totals.set(deck.deckId, { name: deck.deckName, count: current.count + deck.count })
    }
  }
  const deckIds = [...totals.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, topN)
    .map(([id, value]) => ({ id, name: value.name }))

  const points = qualified.map((week) => ({
    label: week.label,
    matchCount: week.matchCount,
    shares: deckIds.map(({ id, name }) => {
      const slice = week.decks.find((deck) => deck.deckId === id)
      return { deckId: id, deckName: name, share: slice?.share ?? 0 }
    }),
  }))

  return { deckIds, points }
}

export interface MetaHeatmapCell {
  deckId: string
  deckName: string
  share: number
  count: number
}

export interface MetaHeatmapRow {
  label: string
  matchCount: number
  cells: MetaHeatmapCell[]
}

export function buildMetaHeatmapRows(
  stats: WeeklyDeckMetaStat[],
  topN = 8,
  minMatches = MIN_WEEKLY_META_MATCHES,
): MetaHeatmapRow[] {
  const { qualified } = partitionWeeklyMetaStats(stats, minMatches)
  const totals = new Map<string, { name: string; count: number }>()
  for (const week of qualified) {
    for (const deck of week.decks) {
      if (deck.deckId === '__other__') continue
      const current = totals.get(deck.deckId) ?? { name: deck.deckName, count: 0 }
      totals.set(deck.deckId, { name: deck.deckName, count: current.count + deck.count })
    }
  }
  const deckOrder = [...totals.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, topN)
    .map(([id, value]) => ({ id, name: value.name }))

  return qualified.map((week) => ({
    label: week.label,
    matchCount: week.matchCount,
    cells: deckOrder.map(({ id, name }) => {
      const slice = week.decks.find((deck) => deck.deckId === id)
      return {
        deckId: id,
        deckName: name,
        share: slice?.share ?? 0,
        count: slice?.count ?? 0,
      }
    }),
  }))
}

/** Rolling 4-week deck appearance share (qualified weeks only). */
export function buildRollingDeckMetaShare(
  stats: WeeklyDeckMetaStat[],
  windowWeeks = 4,
  topN = 5,
  minMatches = MIN_WEEKLY_META_MATCHES,
): Array<{ label: string; matchCount: number; decks: WeeklyDeckMetaSlice[] }> {
  const { qualified } = partitionWeeklyMetaStats(stats, minMatches)
  if (!qualified.length) return []

  const globalTotals = new Map<string, { name: string; count: number }>()
  for (const week of qualified) {
    for (const deck of week.decks) {
      const current = globalTotals.get(deck.deckId) ?? { name: deck.deckName, count: 0 }
      globalTotals.set(deck.deckId, { name: deck.deckName, count: current.count + deck.count })
    }
  }
  const topDeckIds = new Set(
    [...globalTotals.entries()]
      .sort((left, right) => right[1].count - left[1].count)
      .slice(0, topN)
      .map(([id]) => id),
  )

  const result: Array<{ label: string; matchCount: number; decks: WeeklyDeckMetaSlice[] }> = []
  for (let index = 0; index < qualified.length; index += 1) {
    const window = qualified.slice(Math.max(0, index - windowWeeks + 1), index + 1)
    const counts = new Map<string, { name: string; count: number }>()
    let matchCount = 0
    for (const week of window) {
      matchCount += week.matchCount
      for (const deck of week.decks) {
        if (!topDeckIds.has(deck.deckId) && deck.deckId !== '__other__') continue
        const current = counts.get(deck.deckId) ?? { name: deck.deckName, count: 0 }
        counts.set(deck.deckId, { name: deck.deckName, count: current.count + deck.count })
      }
    }
    const total = [...counts.values()].reduce((sum, item) => sum + item.count, 0)
    const decks = [...counts.entries()]
      .map(([deckId, value]) => ({
        deckId,
        deckName: value.name,
        count: value.count,
        share: total ? value.count / total : 0,
      }))
      .sort((left, right) => right.count - left.count)

    result.push({
      label: qualified[index].label,
      matchCount,
      decks,
    })
  }
  return result
}

export function buildDeckAppearanceSummary(
  decks: Deck[],
  matches: Match[],
  language: Language,
): Array<{ deckId: string; name: string; appearances: number; share: number }> {
  const completed = getCompletedMatches(matches)
  const counts = new Map<string, number>()
  for (const match of completed) {
    counts.set(match.deck1Id, (counts.get(match.deck1Id) ?? 0) + 1)
    counts.set(match.deck2Id, (counts.get(match.deck2Id) ?? 0) + 1)
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0)
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  return [...counts.entries()]
    .map(([deckId, appearances]) => ({
      deckId,
      name: deckById.get(deckId) ? localizedDeckName(deckById.get(deckId)!, language) : '未知牌組',
      appearances,
      share: total ? appearances / total : 0,
    }))
    .sort((left, right) => right.appearances - left.appearances)
}
