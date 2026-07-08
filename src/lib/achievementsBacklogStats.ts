import { getMatchDurationMs } from '@/lib/matchTimer'
import { getCompletedMatches } from '@/lib/stats'
import type {
  AchievementUnlock,
  AppSettings,
  AuditEntry,
  Deck,
  Match,
  MatchRevision,
  Player,
  Session,
} from '@/types'

export interface BacklogExtras {
  linkedPlayerId: string | null
  settings: AppSettings
  auditLog: AuditEntry[]
  matchRevisions: MatchRevision[]
  achievementUnlocks: AchievementUnlock[]
  sessions: Session[]
}

export interface BacklogStats {
  wins: number
  losses: number
  total: number
  winRatePct: number
  longestWinStreak: number
  maxSessionWins: number
  maxDayStreak: number
  playDays: number
  uniqueTableSlots: number
  uniqueSessions: number
  uniqueOpponents: number
  uniqueLeaders: number
  uniqueSets: number
  uniqueDecks: number
  maxSessionOpponents: number
  maxSessionDecks: number
  firstPlayerWins: number
  firstPlayerTotal: number
  secondPlayerWins: number
  secondPlayerTotal: number
  firstPlayerWinPct: number
  secondPlayerWinPct: number
  importWins: number
  importTotal: number
  notesMatches: number
  ggNotes: number
  editCount: number
  undoCount: number
  midnightWins: number
  lunchWins: number
  fridayNightWins: number
  sundayWins: number
  summerMatches: number
  jan1Matches: number
  decHolidayMatches: number
  leapDayMatches: number
  uniqueMonths: number
  maxWeeklyGames: number
  maxMonthlyGames: number
  streakSaverCount: number
  bounceBackCount: number
  sessionHeaterMax: number
  coldOpenLosses: number
  alternatingSessions: number
  noMercyStreak: number
  mirrorWins: number
  upsetWins: number
  flawlessSessionTables: number
  clutchStreakCount: number
  perfectWeekCount: number
  upsetChainCount: number
  cleanSessionCount: number
  maxSetsInSession: number
  rainbowColorWins: number
  monoSessionMax: number
  dualColorWins: number
  triColorWins: number
  metaSheepWins: number
  metaRebelWins: number
  maxDecksInSession: number
  uniqueSetCodes: number
  nemesisReversedCount: number
  repeatOpponentGames: number
  newOpponentWins: number
  groupUniquePlayers: number
  palindromeSessions: number
  luckySevenWins: number
  setWins: number
  stDeckWins: number
  ebDeckWins: number
  op16SessionWins: number
  maxLeadersInSession: number
  openingActWins: number
  closerWins: number
  marathonWins: number
  speedWins: number
  longGameWins: number
  blackWins: number
  yellowWins: number
  tricolorWins: number
  monoSessionSweep: number
  setPairWins: number
  stMonthWins: number
  debutWins: number
  debutRedemption: number
  counterPickWins: number
  antiMetaWins: number
  breakOppStreakCount: number
  extendStreakTwice: number
  sessionOpener5: number
  sessionCloser5: number
  slot1Wins: number
  uniqueSlotsWon: number
  singleTableSessions: number
  sessionEndCount: number
  sessionsCreated: number
  archivedSessions: number
  match100: number
  match500: number
  match777: number
  match1000: number
  win100: number
  win250: number
  exactlyFiftyPct: number
  primeWinCount: number
  rivalTop5: number
  rivalRespect: number
  rivalDominate: number
  rivalEven: number
  nemesisChain: number
  oldRivalGap: number
  colorClashRedBlue: number
  colorClashGreenPurple: number
  blackVsYellow: number
  chaosSessions: number
  silentWinStreak: number
  secretMirrorHell: number
  secretExodiaWeek: number
  weightedProgressPct: number
  maxTierFamilies: number
  skillMaxCount: number
  funMaxCount: number
  socialMaxCount: number
  metaMaxCount: number
  categoryUnlocked: number
  sameSessionUnlocks: number
  profileLinked: number
  onboardingDone: number
  groupCollab: number
  syncCount: number
  auditCompleteCount: number
}

function playerMatches(playerId: string, matches: Match[]): Match[] {
  return getCompletedMatches(matches).filter(
    (m) => m.player1Id === playerId || m.player2Id === playerId,
  )
}

function sortByFinished(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
}

function deckFor(match: Match, playerId: string, decks: Deck[]): Deck | undefined {
  const id = match.player1Id === playerId ? match.deck1Id : match.deck2Id
  return decks.find((d) => d.id === id)
}

function maxRollingCount(matches: Match[], windowMs: number): number {
  if (!matches.length) return 0
  const times = matches.map((m) => new Date(m.finishedAt).getTime()).sort((a, b) => a - b)
  let best = 0
  for (let i = 0; i < times.length; i += 1) {
    const end = times[i] + windowMs
    let count = 0
    for (let j = i; j < times.length && times[j] <= end; j += 1) count += 1
    best = Math.max(best, count)
  }
  return best
}

function maxDayStreak(dayKeys: string[]): number {
  if (!dayKeys.length) return 0
  const sorted = [...new Set(dayKeys)].sort()
  let best = 1
  let streak = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1])
    const cur = new Date(sorted[i])
    const diff = (cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
    if (diff === 1) {
      streak += 1
      best = Math.max(best, streak)
    } else if (diff > 1) {
      streak = 1
    }
  }
  return best
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let i = 2; i <= Math.sqrt(n); i += 1) if (n % i === 0) return false
  return true
}

export function buildBacklogStats(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  extras: BacklogExtras,
): BacklogStats {
  const relevant = playerMatches(playerId, matches)
  const sorted = sortByFinished(relevant)
  const wins = relevant.filter((m) => m.winnerPlayerId === playerId).length
  const total = relevant.length
  const winRatePct = total >= 20 ? Math.round((wins / total) * 100) : 0

  const dayKeys: string[] = []
  const tableSlots = new Set<number>()
  const sessionIds = new Set<string>()
  const opponents = new Set<string>()
  const leaders = new Set<string>()
  const setCodes = new Set<string>()
  const deckIds = new Set<string>()
  const bySession = new Map<string, Match[]>()
  const h2h = new Map<string, { wins: number; losses: number }>()
  const deckDebut = new Map<string, { firstLoss: boolean; won: boolean }>()

  let firstPlayerWins = 0
  let firstPlayerTotal = 0
  let secondPlayerWins = 0
  let secondPlayerTotal = 0
  let importWins = 0
  let importTotal = 0
  let notesMatches = 0
  let ggNotes = 0
  let midnightWins = 0
  let lunchWins = 0
  let fridayNightWins = 0
  let sundayWins = 0
  let summerMatches = 0
  let jan1Matches = 0
  let decHolidayMatches = 0
  let leapDayMatches = 0
  const months = new Set<string>()
  let streakSaverCount = 0
  let bounceBackCount = 0
  let lossStreak = 0
  let winStreak = 0
  let longestWinStreak = 0
  let noMercyStreak = 0
  let mirrorWins = 0
  let upsetWins = 0
  let midnightMirror = 0
  let silentStreak = 0
  let maxSilentStreak = 0
  let slot1Wins = 0
  const slotsWon = new Set<number>()
  let stDeckWins = 0
  let ebDeckWins = 0
  let blackWins = 0
  let yellowWins = 0
  let tricolorWins = 0
  let debutWins = 0
  let debutRedemption = 0
  let breakOppStreak = 0
  let newOpponentWins = 0
  const seenOpponents = new Set<string>()
  let setWins = 0
  let colorClashRedBlue = 0
  let colorClashGreenPurple = 0
  let blackVsYellow = 0
  let marathonWins = 0
  let speedWins = 0
  let longGameWins = 0
  let luckySevenWins = 0

  for (const match of relevant) {
    const list = bySession.get(match.sessionId) ?? []
    list.push(match)
    bySession.set(match.sessionId, list)
  }

  let maxSessionWins = 0
  let maxSessionOpponents = 0
  let maxSessionDecks = 0
  let maxSetsInSession = 0
  let monoSessionMax = 0
  let maxDecksInSession = 0
  let maxLeadersInSession = 0
  let sessionHeaterMax = 0
  let flawlessSessionTables = 0
  let clutchStreakCount = 0
  let upsetChainCount = 0
  let cleanSessionCount = 0
  let monoSessionSweep = 0
  let op16SessionWins = 0
  let openingActWins = 0
  let closerWins = 0
  let palindromeSessions = 0
  let chaosSessions = 0
  let singleTableSessions = 0
  let sessionOpener5 = 0
  let sessionCloser5 = 0
  let alternatingSessions = 0
  let coldOpenLosses = 0
  let metaSheepWins = 0
  let metaRebelWins = 0
  let counterPickWins = 0
  let antiMetaWins = 0
  let setPairWins = 0
  let stMonthWins = 0
  let secretMirrorHell = 0
  let secretExodiaWeek = 0
  let extendStreakTwice = 0
  let nemesisReversedCount = 0
  let repeatOpponentGames = 0
  let nemesisChain = 0
  let oldRivalGap = 0
  let rivalTop5 = 0
  let rivalRespect = 0
  let rivalDominate = 0
  let rivalEven = 0

  for (const [, sessionMatches] of bySession) {
    const sortedSession = sortByFinished(sessionMatches)
    const sessionWins = sessionMatches.filter((m) => m.winnerPlayerId === playerId).length
    maxSessionWins = Math.max(maxSessionWins, sessionWins)
    sessionHeaterMax = Math.max(sessionHeaterMax, sessionWins)

    const opps = new Set<string>()
    const sessDecks = new Set<string>()
    const sessSets = new Set<string>()
    const sessLeaders = new Set<string>()
    const colors = new Set<string>()
    let stOnly = true
    let op16Only = true
    let op16Wins = 0

    for (const m of sessionMatches) {
      const opp = m.player1Id === playerId ? m.player2Id : m.player1Id
      opps.add(opp)
      const deck = deckFor(m, playerId, decks)
      if (deck) {
        sessDecks.add(deck.id)
        sessSets.add(deck.setCode)
        sessLeaders.add(deck.leaderName)
        deck.colors.forEach((c) => colors.add(c.toLowerCase()))
        if (!deck.setCode.startsWith('ST')) stOnly = false
        if (!deck.setCode.includes('OP16')) op16Only = false
      }
      if (m.winnerPlayerId === playerId && deck?.setCode.includes('OP16')) op16Wins += 1
    }

    maxSessionOpponents = Math.max(maxSessionOpponents, opps.size)
    maxSessionDecks = Math.max(maxSessionDecks, sessDecks.size)
    maxSetsInSession = Math.max(maxSetsInSession, sessSets.size)
    maxDecksInSession = Math.max(maxDecksInSession, sessDecks.size)
    maxLeadersInSession = Math.max(maxLeadersInSession, sessLeaders.size)
    monoSessionMax = Math.max(monoSessionMax, colors.size === 1 ? sessionWins : 0)
    if (sessionWins === sessionMatches.length && sessionMatches.length >= 8 && colors.size === 1) {
      monoSessionSweep = Math.max(monoSessionSweep, sessionWins)
    }
    if (op16Only && op16Wins >= 5) op16SessionWins = Math.max(op16SessionWins, op16Wins)
    if (stOnly && sessionWins >= 3) stMonthWins += sessionWins

    const first = sortedSession[0]
    const last = sortedSession.at(-1)
    if (first?.winnerPlayerId === playerId) openingActWins += 1
    if (last?.winnerPlayerId === playerId) closerWins += 1
    if (sortedSession.slice(0, 5).every((m) => m.winnerPlayerId === playerId) && sortedSession.length >= 5) {
      sessionOpener5 += 1
    }
    if (sortedSession.slice(-5).every((m) => m.winnerPlayerId === playerId) && sortedSession.length >= 5) {
      sessionCloser5 += 1
    }

    const wl = sortedSession.map((m) => (m.winnerPlayerId === playerId ? 'W' : 'L')).join('')
    if (wl.length >= 6 && wl === [...wl].reverse().join('')) palindromeSessions += 1

    let alt = true
    for (let i = 1; i < sortedSession.length; i += 1) {
      const a = sortedSession[i - 1].winnerPlayerId === playerId
      const b = sortedSession[i].winnerPlayerId === playerId
      if (a === b) alt = false
    }
    if (alt && sortedSession.length >= 4) alternatingSessions += 1

    if (first && first.winnerPlayerId !== playerId) coldOpenLosses += 1

    if (sessionWins === sessionMatches.length && sessionMatches.length >= 4) {
      flawlessSessionTables += 1
    }
    if (sessionMatches.length >= 8 && opps.size >= 8 && sessDecks.size >= 8) chaosSessions += 1
    if (sessionMatches.length >= 8 && sessionWins === sessionMatches.length) {
      cleanSessionCount += 1
    }
  }

  for (const match of sorted) {
    const won = match.winnerPlayerId === playerId
    const deck = deckFor(match, playerId, decks)
    const opp = match.player1Id === playerId ? match.player2Id : match.player1Id
    const date = new Date(match.finishedAt)
    const hour = date.getHours()
    const month = match.finishedAt.slice(0, 7)
    const dayKey = match.finishedAt.slice(0, 10)

    dayKeys.push(dayKey)
    months.add(month)
    sessionIds.add(match.sessionId)
    opponents.add(opp)
    if (deck) {
      leaders.add(deck.leaderName)
      setCodes.add(deck.setCode)
      deckIds.add(deck.id)
      if (deck.setCode.startsWith('ST') && won) stDeckWins += 1
      if (deck.setCode.startsWith('EB') && won) ebDeckWins += 1
      if (won) setWins += 1
      if (won && deck.colors.length >= 3) tricolorWins += 1
      if (won && deck.colors[0]?.toLowerCase() === 'black') blackWins += 1
      if (won && deck.colors[0]?.toLowerCase() === 'yellow') yellowWins += 1

      const oppDeck = deckFor(match, opp, decks)
      if (won && deck.colors[0]?.toLowerCase() === 'red' && oppDeck?.colors[0]?.toLowerCase() === 'blue') {
        colorClashRedBlue += 1
      }
      if (won && deck.colors[0]?.toLowerCase() === 'green' && oppDeck?.colors[0]?.toLowerCase() === 'purple') {
        colorClashGreenPurple += 1
      }
      if (won && deck.colors[0]?.toLowerCase() === 'black' && oppDeck?.colors[0]?.toLowerCase() === 'yellow') {
        blackVsYellow += 1
      }
      if (won && deck.leaderName === oppDeck?.leaderName) {
        mirrorWins += 1
        if (hour >= 0 && hour < 4) midnightMirror += 1
        secretMirrorHell = Math.max(secretMirrorHell, mirrorWins)
      }

      const debut = deckDebut.get(deck.id)
      if (!debut) {
        deckDebut.set(deck.id, { firstLoss: !won, won })
        if (won) debutWins += 1
      } else if (!debut.won && won) debutRedemption += 1
    }

    if (match.source === 'import') {
      importTotal += 1
      if (won) importWins += 1
    }
    if (match.notes?.trim()) {
      notesMatches += 1
      if (/gg/i.test(match.notes)) ggNotes += 1
    }

    if (match.firstPlayerId === playerId) {
      firstPlayerTotal += 1
      if (won) firstPlayerWins += 1
    } else if (match.firstPlayerId) {
      secondPlayerTotal += 1
      if (won) secondPlayerWins += 1
    }

    if (won) {
      if (hour >= 0 && hour < 4) midnightWins += 1
      if (hour >= 11 && hour < 14) lunchWins += 1
      if (date.getDay() === 5 && hour >= 18) fridayNightWins += 1
      if (date.getDay() === 0) sundayWins += 1
      const duration = getMatchDurationMs(match.startedAt, match.finishedAt) ?? 0
      if (duration >= 30 * 60 * 1000) marathonWins += 1
      if (duration > 0 && duration <= 15 * 60 * 1000) speedWins += 1
      if (duration >= 45 * 60 * 1000) longGameWins += 1
      if (wins > 0 && wins % 7 === 0) luckySevenWins += 1

      silentStreak += 1
      maxSilentStreak = Math.max(maxSilentStreak, silentStreak)
    } else {
      silentStreak = 0
    }

    const monthNum = date.getMonth() + 1
    if (monthNum === 7 || monthNum === 8) summerMatches += 1
    if (match.finishedAt.slice(5, 10) === '01-01') jan1Matches += 1
    if (match.finishedAt.slice(5, 5) === '12-24' || match.finishedAt.slice(5, 5) === '12-25' || match.finishedAt.slice(5, 5) === '12-26') {
      decHolidayMatches += 1
    }
    if (match.finishedAt.slice(5, 10) === '02-29') leapDayMatches += 1

    if (!seenOpponents.has(opp)) {
      seenOpponents.add(opp)
      if (won) newOpponentWins += 1
    } else {
      repeatOpponentGames += 1
    }

    const row = h2h.get(opp) ?? { wins: 0, losses: 0 }
    if (won) {
      if (lossStreak >= 3) streakSaverCount += 1
      if (lossStreak >= 5) bounceBackCount += 1
      row.wins += 1
      winStreak += 1
      lossStreak = 0
      longestWinStreak = Math.max(longestWinStreak, winStreak)
      noMercyStreak = Math.max(noMercyStreak, winStreak)
    } else {
      row.losses += 1
      lossStreak += 1
      winStreak = 0
    }
    h2h.set(opp, row)

    if (isPrime(match.matchNumber) && won) {
      // prime hunter uses separate counter below
    }
  }

  let rival5 = 0
  let rival10 = 0
  let rivalEvenCount = 0
  let rivalDominateCount = 0
  for (const [, row] of h2h) {
    const games = row.wins + row.losses
    if (games >= 10) rival10 += 1
    if (games >= 5) rival5 += 1
    if (games >= 12) {
      const rate = row.wins / games
      if (rate >= 0.48 && rate <= 0.52) rivalEvenCount += 1
    }
    if (row.wins >= 10 && row.losses <= 2) rivalDominateCount += 1
    if (row.losses >= 3 && row.wins > row.losses) nemesisReversedCount += 1
  }
  rivalTop5 = rival5
  rivalRespect = rival10
  rivalEven = rivalEvenCount
  rivalDominate = rivalDominateCount

  const editCount = extras.matchRevisions.length
  const undoCount = extras.auditLog.filter((e) => e.kind === 'match_undo').length
  const auditCompleteCount = extras.auditLog.filter((e) => e.kind === 'match_complete').length
  const syncCount = extras.auditLog.filter((e) => e.kind === 'sync').length

  const player = players.find((p) => p.id === playerId)
  const profileLinked =
    extras.linkedPlayerId === playerId || Boolean(player?.profileClaimedAt || player?.profileClaimDeviceId)
      ? 1
      : 0

  const exactlyFiftyPct = total >= 20 && wins / total >= 0.495 && wins / total <= 0.505 ? 1 : 0
  const primeWinCount = sorted.filter((m, i) => m.winnerPlayerId === playerId && isPrime(i + 1)).length

  const maxWeeklyGames = maxRollingCount(relevant, 7 * 24 * 60 * 60 * 1000)
  const maxMonthlyGames = maxRollingCount(relevant, 30 * 24 * 60 * 60 * 1000)
  const perfectWeekCount = maxWeeklyGames >= 10 && wins >= 8 ? 1 : 0
  const secretExodiaWeekVal = maxWeeklyGames >= 10 && wins >= 8 ? 1 : 0
  secretExodiaWeek = secretExodiaWeekVal

  const unlocks = extras.achievementUnlocks.filter((u) => u.playerId === playerId)
  const maxTierFamilies = new Set(unlocks.map((u) => u.achievementId)).size

  return {
    wins,
    losses: total - wins,
    total,
    winRatePct,
    longestWinStreak,
    maxSessionWins,
    maxDayStreak: maxDayStreak(dayKeys),
    playDays: new Set(dayKeys).size,
    uniqueTableSlots: tableSlots.size,
    uniqueSessions: sessionIds.size,
    uniqueOpponents: opponents.size,
    uniqueLeaders: leaders.size,
    uniqueSets: setCodes.size,
    uniqueDecks: deckIds.size,
    maxSessionOpponents,
    maxSessionDecks,
    firstPlayerWins,
    firstPlayerTotal,
    secondPlayerWins,
    secondPlayerTotal,
    firstPlayerWinPct: firstPlayerTotal >= 20 ? Math.round((firstPlayerWins / firstPlayerTotal) * 100) : 0,
    secondPlayerWinPct: secondPlayerTotal >= 20 ? Math.round((secondPlayerWins / secondPlayerTotal) * 100) : 0,
    importWins,
    importTotal,
    notesMatches,
    ggNotes,
    editCount,
    undoCount,
    midnightWins,
    lunchWins,
    fridayNightWins,
    sundayWins,
    summerMatches,
    jan1Matches,
    decHolidayMatches,
    leapDayMatches,
    uniqueMonths: months.size,
    maxWeeklyGames,
    maxMonthlyGames,
    streakSaverCount,
    bounceBackCount,
    sessionHeaterMax,
    coldOpenLosses,
    alternatingSessions,
    noMercyStreak,
    mirrorWins,
    upsetWins,
    flawlessSessionTables,
    clutchStreakCount,
    perfectWeekCount,
    upsetChainCount,
    cleanSessionCount,
    maxSetsInSession,
    rainbowColorWins: 0,
    monoSessionMax,
    dualColorWins: 0,
    triColorWins: tricolorWins,
    metaSheepWins,
    metaRebelWins,
    maxDecksInSession,
    uniqueSetCodes: setCodes.size,
    nemesisReversedCount,
    repeatOpponentGames,
    newOpponentWins,
    groupUniquePlayers: players.filter((p) => !p.archived).length,
    palindromeSessions,
    luckySevenWins,
    setWins,
    stDeckWins,
    ebDeckWins,
    op16SessionWins,
    maxLeadersInSession,
    openingActWins,
    closerWins,
    marathonWins,
    speedWins,
    longGameWins,
    blackWins,
    yellowWins,
    tricolorWins,
    monoSessionSweep,
    setPairWins,
    stMonthWins,
    debutWins,
    debutRedemption,
    counterPickWins,
    antiMetaWins,
    breakOppStreakCount: breakOppStreak,
    extendStreakTwice,
    sessionOpener5,
    sessionCloser5,
    slot1Wins,
    uniqueSlotsWon: slotsWon.size,
    singleTableSessions,
    sessionEndCount: extras.sessions.filter((s) => s.endedAt).length,
    sessionsCreated: extras.sessions.length,
    archivedSessions: extras.sessions.filter((s) => s.archivedAt).length,
    match100: total >= 100 ? 1 : 0,
    match500: total >= 500 ? 1 : 0,
    match777: total >= 777 ? 1 : 0,
    match1000: total >= 1000 ? 1 : 0,
    win100: wins >= 100 ? wins : 0,
    win250: wins >= 250 ? wins : 0,
    exactlyFiftyPct,
    primeWinCount,
    rivalTop5,
    rivalRespect,
    rivalDominate,
    rivalEven,
    nemesisChain,
    oldRivalGap,
    colorClashRedBlue,
    colorClashGreenPurple,
    blackVsYellow,
    chaosSessions,
    silentWinStreak: maxSilentStreak,
    secretMirrorHell: midnightMirror >= 3 ? 1 : 0,
    secretExodiaWeek,
    weightedProgressPct: 0,
    maxTierFamilies,
    skillMaxCount: 0,
    funMaxCount: 0,
    socialMaxCount: 0,
    metaMaxCount: 0,
    categoryUnlocked: 0,
    sameSessionUnlocks: 0,
    profileLinked,
    onboardingDone: extras.settings.onboardingCompleted ? 1 : 0,
    groupCollab: extras.settings.groupCollabEnabled ? 1 : 0,
    syncCount,
    auditCompleteCount,
  }
}
