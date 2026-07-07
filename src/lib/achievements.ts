import { getCompletedMatches } from '@/lib/stats'
import type { AchievementUnlock, AppState, Deck, Language, Match, Player } from '@/types'

export type AchievementCategory = 'milestone' | 'streak' | 'meta' | 'social' | 'fun'
export type AchievementRarity = 'common' | 'rare' | 'legendary'

export interface AchievementDefinition {
  id: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: string
  title: Record<Language, string>
  description: Record<Language, string>
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_win',
    category: 'milestone',
    rarity: 'common',
    icon: '🎉',
    title: { 'zh-Hant': '首勝', 'zh-Hans': '首胜', en: 'First Win', ja: '初勝利' },
    description: {
      'zh-Hant': '拿下第一場勝利。',
      'zh-Hans': '拿下第一场胜利。',
      en: 'Win your first match.',
      ja: '初めて勝利を収める。',
    },
  },
  {
    id: 'matches_10',
    category: 'milestone',
    rarity: 'common',
    icon: '🎴',
    title: { 'zh-Hant': '十場老手', 'zh-Hans': '十场老手', en: 'Ten Matches', ja: '10戦' },
    description: {
      'zh-Hant': '累計完成 10 場對局。',
      'zh-Hans': '累计完成 10 场对局。',
      en: 'Complete 10 matches.',
      ja: '10試合を記録する。',
    },
  },
  {
    id: 'matches_50',
    category: 'milestone',
    rarity: 'rare',
    icon: '⚓',
    title: { 'zh-Hant': '航海者', 'zh-Hans': '航海者', en: 'Voyager', ja: '航海者' },
    description: {
      'zh-Hant': '累計完成 50 場對局。',
      'zh-Hans': '累计完成 50 场对局。',
      en: 'Complete 50 matches.',
      ja: '50試合を記録する。',
    },
  },
  {
    id: 'matches_100',
    category: 'milestone',
    rarity: 'legendary',
    icon: '👑',
    title: { 'zh-Hant': '百戰將', 'zh-Hans': '百战将', en: 'Centurion', ja: '百戦の将' },
    description: {
      'zh-Hant': '累計完成 100 場對局。',
      'zh-Hans': '累计完成 100 场对局。',
      en: 'Complete 100 matches.',
      ja: '100試合を記録する。',
    },
  },
  {
    id: 'streak_3',
    category: 'streak',
    rarity: 'common',
    icon: '🔥',
    title: { 'zh-Hant': '三連勝', 'zh-Hans': '三连胜', en: 'Hot Streak', ja: '3連勝' },
    description: {
      'zh-Hant': '達成 3 連勝。',
      'zh-Hans': '达成 3 连胜。',
      en: 'Win 3 matches in a row.',
      ja: '3連勝を達成する。',
    },
  },
  {
    id: 'streak_5',
    category: 'streak',
    rarity: 'rare',
    icon: '💥',
    title: { 'zh-Hant': '五連勝', 'zh-Hans': '五连胜', en: 'On Fire', ja: '5連勝' },
    description: {
      'zh-Hant': '達成 5 連勝。',
      'zh-Hans': '达成 5 连胜。',
      en: 'Win 5 matches in a row.',
      ja: '5連勝を達成する。',
    },
  },
  {
    id: 'streak_10',
    category: 'streak',
    rarity: 'legendary',
    icon: '🌊',
    title: { 'zh-Hant': '勢不可擋', 'zh-Hans': '势不可当', en: 'Unstoppable', ja: '止められない' },
    description: {
      'zh-Hant': '達成 10 連勝。',
      'zh-Hans': '达成 10 连胜。',
      en: 'Win 10 matches in a row.',
      ja: '10連勝を達成する。',
    },
  },
  {
    id: 'deck_master',
    category: 'meta',
    rarity: 'rare',
    icon: '🃏',
    title: { 'zh-Hant': '主將精通', 'zh-Hans': '主将精通', en: 'Deck Master', ja: 'デッキマスター' },
    description: {
      'zh-Hant': '同一牌組取得 10 勝。',
      'zh-Hans': '同一牌组取得 10 胜。',
      en: 'Win 10 times with one deck.',
      ja: '同一デッキで10勝する。',
    },
  },
  {
    id: 'meta_explorer',
    category: 'meta',
    rarity: 'common',
    icon: '🧭',
    title: { 'zh-Hant': 'Meta 探索者', 'zh-Hans': 'Meta 探索者', en: 'Meta Explorer', ja: 'メタ探索者' },
    description: {
      'zh-Hant': '使用 5 種不同牌組。',
      'zh-Hans': '使用 5 种不同牌组。',
      en: 'Use 5 different decks.',
      ja: '5種類のデッキを使う。',
    },
  },
  {
    id: 'set_collector',
    category: 'meta',
    rarity: 'rare',
    icon: '📦',
    title: { 'zh-Hant': '系列收藏家', 'zh-Hans': '系列收藏家', en: 'Set Collector', ja: 'セットコレクター' },
    description: {
      'zh-Hant': '使用 3 個不同系列的 Leader。',
      'zh-Hans': '使用 3 个不同系列的 Leader。',
      en: 'Use leaders from 3 different sets.',
      ja: '3つの異なるセットのリーダーを使う。',
    },
  },
  {
    id: 'first_player_king',
    category: 'meta',
    rarity: 'rare',
    icon: '⚡',
    title: { 'zh-Hant': '先攻之王', 'zh-Hans': '先攻之王', en: 'First Turn King', ja: '先攻の王' },
    description: {
      'zh-Hant': '先攻勝率 ≥55%（至少 20 場）。',
      'zh-Hans': '先攻胜率 ≥55%（至少 20 场）。',
      en: 'First-turn win rate ≥55% (20+ games).',
      ja: '先攻勝率55%以上（20戦以上）。',
    },
  },
  {
    id: 'comeback',
    category: 'streak',
    rarity: 'rare',
    icon: '🔄',
    title: { 'zh-Hant': '逆轉劇', 'zh-Hans': '逆转剧', en: 'Comeback', ja: '逆転劇' },
    description: {
      'zh-Hant': '連輸 3 場後連贏 3 場。',
      'zh-Hans': '连输 3 场后连赢 3 场。',
      en: 'Win 3 in a row after losing 3 in a row.',
      ja: '3連敗後に3連勝する。',
    },
  },
  {
    id: 'perfect_session',
    category: 'fun',
    rarity: 'legendary',
    icon: '✨',
    title: { 'zh-Hant': '完美場次', 'zh-Hans': '完美场次', en: 'Perfect Session', ja: '完璧なセッション' },
    description: {
      'zh-Hant': '單一場次全勝（至少 5 場）。',
      'zh-Hans': '单一场次全胜（至少 5 场）。',
      en: 'Go undefeated in one session (5+ games).',
      ja: '1セッション全勝（5戦以上）。',
    },
  },
  {
    id: 'night_owl',
    category: 'fun',
    rarity: 'common',
    icon: '🦉',
    title: { 'zh-Hant': '夜貓牌手', 'zh-Hans': '夜猫牌手', en: 'Night Owl', ja: '夜更かしプレイヤー' },
    description: {
      'zh-Hant': '單一場次完成 10 場以上。',
      'zh-Hans': '单一场次完成 10 场以上。',
      en: 'Play 10+ matches in one session.',
      ja: '1セッションで10試合以上。',
    },
  },
  {
    id: 'rival',
    category: 'social',
    rarity: 'rare',
    icon: '⚔️',
    title: { 'zh-Hant': '宿敵', 'zh-Hans': '宿敌', en: 'Rival', ja: 'ライバル' },
    description: {
      'zh-Hant': '與同一對手對戰 20 場以上。',
      'zh-Hans': '与同一对手对战 20 场以上。',
      en: 'Face the same opponent 20+ times.',
      ja: '同じ相手と20試合以上。',
    },
  },
]

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id)
}

function playerMatches(playerId: string, matches: Match[]): Match[] {
  return getCompletedMatches(matches).filter(
    (match) => match.player1Id === playerId || match.player2Id === playerId,
  )
}

function getLongestWinStreak(sortedMatches: Match[], playerId: string): number {
  let longest = 0
  let current = 0
  for (const match of sortedMatches) {
    if (match.winnerPlayerId === playerId) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

function hasComeback(sortedMatches: Match[], playerId: string): boolean {
  let lossStreak = 0
  for (const match of sortedMatches) {
    const won = match.winnerPlayerId === playerId
    if (!won) {
      lossStreak += 1
      continue
    }
    if (lossStreak >= 3) {
      let winStreak = 1
      const index = sortedMatches.indexOf(match)
      for (let i = index + 1; i < sortedMatches.length; i += 1) {
        if (sortedMatches[i].winnerPlayerId !== playerId) break
        winStreak += 1
      }
      if (winStreak >= 3) return true
    }
    lossStreak = 0
  }
  return false
}

function deckWinsForPlayer(playerId: string, matches: Match[]): Map<string, number> {
  const wins = new Map<string, number>()
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    wins.set(deckId, (wins.get(deckId) ?? 0) + 1)
  }
  return wins
}

function decksUsedByPlayer(playerId: string, matches: Match[]): Set<string> {
  const decks = new Set<string>()
  for (const match of playerMatches(playerId, matches)) {
    decks.add(match.player1Id === playerId ? match.deck1Id : match.deck2Id)
  }
  return decks
}

function setsUsedByPlayer(playerId: string, matches: Match[], decks: Deck[]): Set<string> {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const sets = new Set<string>()
  for (const deckId of decksUsedByPlayer(playerId, matches)) {
    const deck = deckById.get(deckId)
    if (deck) sets.add(deck.setCode)
  }
  return sets
}

function firstPlayerWinRate(playerId: string, matches: Match[]): { wins: number; total: number } {
  let wins = 0
  let total = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.firstPlayerId !== playerId) continue
    total += 1
    if (match.winnerPlayerId === playerId) wins += 1
  }
  return { wins, total }
}

function maxOpponentMatches(playerId: string, matches: Match[]): number {
  const counts = new Map<string, number>()
  for (const match of playerMatches(playerId, matches)) {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    counts.set(opponentId, (counts.get(opponentId) ?? 0) + 1)
  }
  return Math.max(0, ...counts.values())
}

function maxSessionMatches(playerId: string, matches: Match[]): number {
  const counts = new Map<string, number>()
  for (const match of playerMatches(playerId, matches)) {
    counts.set(match.sessionId, (counts.get(match.sessionId) ?? 0) + 1)
  }
  return Math.max(0, ...counts.values())
}

function hasPerfectSession(playerId: string, matches: Match[]): boolean {
  const bySession = new Map<string, Match[]>()
  for (const match of playerMatches(playerId, matches)) {
    const list = bySession.get(match.sessionId) ?? []
    list.push(match)
    bySession.set(match.sessionId, list)
  }
  for (const sessionMatches of bySession.values()) {
    if (sessionMatches.length < 5) continue
    if (sessionMatches.every((match) => match.winnerPlayerId === playerId)) return true
  }
  return false
}

export function evaluateAchievementsForPlayer(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
): string[] {
  const relevant = playerMatches(playerId, matches)
  const sorted = [...relevant].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
  const wins = relevant.filter((match) => match.winnerPlayerId === playerId).length
  const longestStreak = getLongestWinStreak(sorted, playerId)
  const deckWins = deckWinsForPlayer(playerId, matches)
  const firstStats = firstPlayerWinRate(playerId, matches)
  const unlocked: string[] = []

  if (wins >= 1) unlocked.push('first_win')
  if (relevant.length >= 10) unlocked.push('matches_10')
  if (relevant.length >= 50) unlocked.push('matches_50')
  if (relevant.length >= 100) unlocked.push('matches_100')
  if (longestStreak >= 3) unlocked.push('streak_3')
  if (longestStreak >= 5) unlocked.push('streak_5')
  if (longestStreak >= 10) unlocked.push('streak_10')
  if ([...deckWins.values()].some((count) => count >= 10)) unlocked.push('deck_master')
  if (decksUsedByPlayer(playerId, matches).size >= 5) unlocked.push('meta_explorer')
  if (setsUsedByPlayer(playerId, matches, decks).size >= 3) unlocked.push('set_collector')
  if (firstStats.total >= 20 && firstStats.wins / firstStats.total >= 0.55) unlocked.push('first_player_king')
  if (hasComeback(sorted, playerId)) unlocked.push('comeback')
  if (hasPerfectSession(playerId, matches)) unlocked.push('perfect_session')
  if (maxSessionMatches(playerId, matches) >= 10) unlocked.push('night_owl')
  if (maxOpponentMatches(playerId, matches) >= 20) unlocked.push('rival')

  void players
  return unlocked
}

export function evaluateNewAchievementUnlocks(
  state: AppState,
  playerId: string,
): AchievementUnlock[] {
  const earned = evaluateAchievementsForPlayer(playerId, state.players, state.decks, state.matches)
  const existing = new Set(
    state.achievementUnlocks
      .filter((item) => item.playerId === playerId)
      .map((item) => item.achievementId),
  )
  const now = new Date().toISOString()
  return earned
    .filter((id) => !existing.has(id))
    .map((achievementId) => ({ achievementId, playerId, unlockedAt: now }))
}

export function getPlayerAchievementProgress(
  playerId: string,
  unlocks: AchievementUnlock[],
): Array<AchievementDefinition & { unlockedAt: string | null }> {
  const unlockMap = new Map(
    unlocks.filter((item) => item.playerId === playerId).map((item) => [item.achievementId, item.unlockedAt]),
  )
  return ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    ...definition,
    unlockedAt: unlockMap.get(definition.id) ?? null,
  }))
}
