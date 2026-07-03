import type { Deck, Language, Match, Player } from '@/types'
import { getDeckDisplayName } from '@/lib/leaderDisplay'

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
    const leftScore = getWeightedWinRate(left.wins, left.total)
    const rightScore = getWeightedWinRate(right.wins, right.total)
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

export function getReliabilityLabel(total: number): string {
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
      const leftScore = getWeightedWinRate(left.wins, left.total)
      const rightScore = getWeightedWinRate(right.wins, right.total)
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
    topPlayer: playerStats[0] ?? null,
    topDeck: deckStats[0] ?? null,
    mostUsedDeck,
  }
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

export function buildFirstSecondStats(matches: Match[]): FirstSecondStat[] {
  const completed = getCompletedMatches(matches).filter((match) => match.firstPlayerId !== null)
  const firstWins = completed.filter((match) => match.firstPlayerId === match.winnerPlayerId).length
  const secondWins = completed.length - firstWins

  return [
    {
      label: '先攻',
      wins: firstWins,
      total: completed.length,
      winRate: getWinRate(firstWins, completed.length),
    },
    {
      label: '後攻',
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
  const firstSecond = buildFirstSecondStats(matches)
  const first = firstSecond.find((stat) => stat.label === '先攻')
  const second = firstSecond.find((stat) => stat.label === '後攻')
  const matchupStats = buildMatchupStats(decks, matches, language)
  const playerDeckStats = buildPlayerDeckStats(players, decks, matches, language)
  const playerStats = buildPlayerStats(players, matches)

  if (first && second && first.total >= 3) {
    insights.push({
      id: 'first-second',
      text: `先攻 ${formatPercent(first.winRate)}，後攻 ${formatPercent(second.winRate)}，可留意先後攻差距。`,
    })
  }

  const weakMatchup = matchupStats.find(
    (matchup) => matchup.total >= 3 && (matchup.deckAWinRate ?? 0) <= 0.34,
  )
  if (weakMatchup) {
    insights.push({
      id: 'weak-matchup',
      text: `${weakMatchup.deckAName} 對 ${weakMatchup.deckBName} 目前 ${weakMatchup.deckAWins}-${weakMatchup.deckBWins}，值得練。`,
    })
  }

  const hotPilot = playerDeckStats.find((stat) => stat.total >= 3 && (stat.winRate ?? 0) >= 0.7)
  if (hotPilot) {
    insights.push({
      id: 'hot-pilot',
      text: `${hotPilot.playerName} 使用 ${hotPilot.deckName} 有 ${formatPercent(hotPilot.winRate)}，狀態不錯。`,
    })
  }

  const chronologically = [...completed].sort(
    (left, right) => new Date(left.finishedAt).getTime() - new Date(right.finishedAt).getTime(),
  )
  if (chronologically.length >= 3) {
    const last = chronologically[chronologically.length - 1]
    let streak = 1
    for (let index = chronologically.length - 2; index >= 0; index -= 1) {
      if (chronologically[index].winnerPlayerId !== last.winnerPlayerId) break
      streak += 1
    }
    if (streak >= 3) {
      const winner = players.find((player) => player.id === last.winnerPlayerId)
      insights.push({
        id: 'win-streak',
        text: `${winner?.name ?? '玩家'} 連勝 ${streak} 場，狀態火熱。`,
      })
    }
  }

  const deckStats = buildDeckStats(decks, matches, language)
  const coldWin = completed.find((match) => {
    const winnerStat = deckStats.find((stat) => stat.id === match.winnerDeckId)
    return winnerStat && winnerStat.total >= 3 && (winnerStat.winRate ?? 0) < 0.4
  })
  if (coldWin) {
    const deck = decks.find((item) => item.id === coldWin.winnerDeckId)
    insights.push({
      id: 'upset',
      text: `${deck ? localizedDeckName(deck, language) : '冷門牌組'} 低勝率但剛剛贏了，值得留意。`,
    })
  }

  const uniqueDecks = new Set<string>()
  for (const match of completed) {
    uniqueDecks.add(match.deck1Id)
    uniqueDecks.add(match.deck2Id)
  }
  if (completed.length >= 4) {
    insights.push({
      id: 'diversity',
      text: `本範圍 ${uniqueDecks.size} 副不同牌組 / ${completed.length} 場，meta 多樣度 ${((uniqueDecks.size / completed.length) * 100).toFixed(0)}%。`,
    })
  }

  if (playerStats.length >= 2) {
    const margin = playerStats[0].wins - playerStats[1].wins
    if (margin >= 2) {
      insights.push({
        id: 'mvp-margin',
        text: `${playerStats[0].name} 領先 ${playerStats[1].name} ${margin} 勝。`,
      })
    }
  }

  return insights.slice(0, 4)
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
      label: `最近 ${windowSize} 場`,
      wins,
      total: windowMatches.length,
      winRate: playerId ? getWinRate(wins, windowMatches.length) : null,
    }
  })
}
