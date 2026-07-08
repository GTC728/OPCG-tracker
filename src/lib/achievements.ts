import { getCompletedMatches } from '@/lib/stats'
import type { AchievementUnlock, AppState, Deck, Language, Match, Player } from '@/types'

export type AchievementCategory = 'milestone' | 'streak' | 'meta' | 'social' | 'fun' | 'skill'
export type AchievementIconKind =
  | 'medal'
  | 'flame'
  | 'cards'
  | 'compass'
  | 'package'
  | 'swords'
  | 'crown'
  | 'palette'
  | 'bolt'
  | 'star'
  | 'anchor'
  | 'trophy'
  | 'moon'
  | 'sparkles'
  | 'shield'
  | 'refresh'

export interface AchievementTier {
  level: number
  threshold: number
  label: Record<Language, string>
}

export interface AchievementDefinition {
  id: string
  category: AchievementCategory
  icon: AchievementIconKind
  title: Record<Language, string>
  description: Record<Language, string>
  tiers: AchievementTier[]
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'veteran',
    category: 'milestone',
    icon: 'medal',
    title: { 'zh-Hant': '老兵', 'zh-Hans': '老兵', en: 'Veteran', ja: 'ベテラン' },
    description: {
      'zh-Hant': '累計完成對局，等級隨場次提升。',
      'zh-Hans': '累计完成对局，等级随场次提升。',
      en: 'Total matches played — level up as you go.',
      ja: '累計対戦数でレベルアップ。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '初陣', 'zh-Hans': '初阵', en: 'First bout', ja: '初陣' } },
      { level: 2, threshold: 10, label: { 'zh-Hant': '十場', 'zh-Hans': '十场', en: '10 matches', ja: '10戦' } },
      { level: 3, threshold: 25, label: { 'zh-Hant': '二十五', 'zh-Hans': '二十五', en: '25 matches', ja: '25戦' } },
      { level: 4, threshold: 50, label: { 'zh-Hant': '五十', 'zh-Hans': '五十', en: '50 matches', ja: '50戦' } },
      { level: 5, threshold: 100, label: { 'zh-Hant': '百戰', 'zh-Hans': '百战', en: '100 matches', ja: '100戦' } },
      { level: 6, threshold: 200, label: { 'zh-Hant': '二百', 'zh-Hans': '二百', en: '200 matches', ja: '200戦' } },
      { level: 7, threshold: 500, label: { 'zh-Hant': '五百', 'zh-Hans': '五百', en: '500 matches', ja: '500戦' } },
    ],
  },
  {
    id: 'win_streak',
    category: 'streak',
    icon: 'flame',
    title: { 'zh-Hant': '連勝之火', 'zh-Hans': '连胜之火', en: 'Win Streak', ja: '連勝の炎' },
    description: {
      'zh-Hant': '達成最高連勝紀錄（技術向）。',
      'zh-Hans': '达成最高连胜纪录（技术向）。',
      en: 'Reach higher longest win streaks.',
      ja: '最高連勝記録を更新する。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 連勝', 'zh-Hans': '3 连胜', en: '3 streak', ja: '3連勝' } },
      { level: 2, threshold: 5, label: { 'zh-Hant': '5 連勝', 'zh-Hans': '5 连胜', en: '5 streak', ja: '5連勝' } },
      { level: 3, threshold: 8, label: { 'zh-Hant': '8 連勝', 'zh-Hans': '8 连胜', en: '8 streak', ja: '8連勝' } },
      { level: 4, threshold: 10, label: { 'zh-Hant': '10 連勝', 'zh-Hans': '10 连胜', en: '10 streak', ja: '10連勝' } },
      { level: 5, threshold: 15, label: { 'zh-Hant': '15 連勝', 'zh-Hans': '15 连胜', en: '15 streak', ja: '15連勝' } },
      { level: 6, threshold: 20, label: { 'zh-Hant': '20 連勝', 'zh-Hans': '20 连胜', en: '20 streak', ja: '20連勝' } },
    ],
  },
  {
    id: 'deck_specialist',
    category: 'meta',
    icon: 'cards',
    title: { 'zh-Hant': '主將專精', 'zh-Hans': '主将专精', en: 'Deck Specialist', ja: 'デッキ職人' },
    description: {
      'zh-Hant': '同一牌組累計勝場。',
      'zh-Hans': '同一牌组累计胜场。',
      en: 'Wins with a single deck.',
      ja: '同一デッキの累計勝利。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 2, threshold: 10, label: { 'zh-Hant': '10 勝', 'zh-Hans': '10 胜', en: '10 wins', ja: '10勝' } },
      { level: 3, threshold: 25, label: { 'zh-Hant': '25 勝', 'zh-Hans': '25 胜', en: '25 wins', ja: '25勝' } },
      { level: 4, threshold: 50, label: { 'zh-Hant': '50 勝', 'zh-Hans': '50 胜', en: '50 wins', ja: '50勝' } },
      { level: 5, threshold: 100, label: { 'zh-Hant': '100 勝', 'zh-Hans': '100 胜', en: '100 wins', ja: '100勝' } },
    ],
  },
  {
    id: 'meta_explorer',
    category: 'meta',
    icon: 'compass',
    title: { 'zh-Hant': 'Meta 探索', 'zh-Hans': 'Meta 探索', en: 'Meta Explorer', ja: 'メタ探索' },
    description: {
      'zh-Hant': '使用過的不同牌組數量。',
      'zh-Hans': '使用过的不同牌组数量。',
      en: 'Different decks piloted.',
      ja: '使用した異なるデッキ数。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 副', 'zh-Hans': '3 副', en: '3 decks', ja: '3種' } },
      { level: 2, threshold: 5, label: { 'zh-Hant': '5 副', 'zh-Hans': '5 副', en: '5 decks', ja: '5種' } },
      { level: 3, threshold: 8, label: { 'zh-Hant': '8 副', 'zh-Hans': '8 副', en: '8 decks', ja: '8種' } },
      { level: 4, threshold: 12, label: { 'zh-Hant': '12 副', 'zh-Hans': '12 副', en: '12 decks', ja: '12種' } },
      { level: 5, threshold: 20, label: { 'zh-Hant': '20 副', 'zh-Hans': '20 副', en: '20 decks', ja: '20種' } },
    ],
  },
  {
    id: 'set_collector',
    category: 'meta',
    icon: 'package',
    title: { 'zh-Hant': '系列收藏', 'zh-Hans': '系列收藏', en: 'Set Collector', ja: 'セット収集' },
    description: {
      'zh-Hant': '使用過的不同系列 Leader。',
      'zh-Hans': '使用过的不同系列 Leader。',
      en: 'Different card sets used.',
      ja: '異なるセットのリーダーを使用。',
    },
    tiers: [
      { level: 1, threshold: 2, label: { 'zh-Hant': '2 系列', 'zh-Hans': '2 系列', en: '2 sets', ja: '2セット' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 系列', 'zh-Hans': '3 系列', en: '3 sets', ja: '3セット' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 系列', 'zh-Hans': '5 系列', en: '5 sets', ja: '5セット' } },
      { level: 4, threshold: 8, label: { 'zh-Hant': '8 系列', 'zh-Hans': '8 系列', en: '8 sets', ja: '8セット' } },
    ],
  },
  {
    id: 'rival_bond',
    category: 'social',
    icon: 'swords',
    title: { 'zh-Hant': '宿敵羈絆', 'zh-Hans': '宿敌羁绊', en: 'Rival Bond', ja: 'ライバル' },
    description: {
      'zh-Hant': '與同一對手的對戰場次。',
      'zh-Hans': '与同一对手的对战场次。',
      en: 'Matches against the same opponent.',
      ja: '同じ相手との対戦数。',
    },
    tiers: [
      { level: 1, threshold: 10, label: { 'zh-Hant': '10 場', 'zh-Hans': '10 场', en: '10 games', ja: '10戦' } },
      { level: 2, threshold: 20, label: { 'zh-Hant': '20 場', 'zh-Hans': '20 场', en: '20 games', ja: '20戦' } },
      { level: 3, threshold: 35, label: { 'zh-Hant': '35 場', 'zh-Hans': '35 场', en: '35 games', ja: '35戦' } },
      { level: 4, threshold: 50, label: { 'zh-Hant': '50 場', 'zh-Hans': '50 场', en: '50 games', ja: '50戦' } },
      { level: 5, threshold: 75, label: { 'zh-Hant': '75 場', 'zh-Hans': '75 场', en: '75 games', ja: '75戦' } },
    ],
  },
  {
    id: 'session_marathon',
    category: 'fun',
    icon: 'moon',
    title: { 'zh-Hant': '場次馬拉松', 'zh-Hans': '场次马拉松', en: 'Session Marathon', ja: 'セッション耐久' },
    description: {
      'zh-Hant': '單一場次完成的對局數。',
      'zh-Hans': '单一场次完成的对局数。',
      en: 'Matches in one session.',
      ja: '1セッションの対戦数。',
    },
    tiers: [
      { level: 1, threshold: 8, label: { 'zh-Hant': '8 場', 'zh-Hans': '8 场', en: '8 games', ja: '8戦' } },
      { level: 2, threshold: 12, label: { 'zh-Hant': '12 場', 'zh-Hans': '12 场', en: '12 games', ja: '12戦' } },
      { level: 3, threshold: 20, label: { 'zh-Hant': '20 場', 'zh-Hans': '20 场', en: '20 games', ja: '20戦' } },
      { level: 4, threshold: 30, label: { 'zh-Hant': '30 場', 'zh-Hans': '30 场', en: '30 games', ja: '30戦' } },
    ],
  },
  {
    id: 'first_win',
    category: 'skill',
    icon: 'star',
    title: { 'zh-Hant': '首勝', 'zh-Hans': '首胜', en: 'First Win', ja: '初勝利' },
    description: {
      'zh-Hant': '拿下第一場勝利。',
      'zh-Hans': '拿下第一场胜利。',
      en: 'Win your first match.',
      ja: '初勝利を収める。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'comeback',
    category: 'skill',
    icon: 'refresh',
    title: { 'zh-Hant': '逆轉劇', 'zh-Hans': '逆转剧', en: 'Comeback', ja: '逆転劇' },
    description: {
      'zh-Hant': '連輸 3 後連贏 3。',
      'zh-Hans': '连输 3 后连赢 3。',
      en: 'Win 3 in a row after losing 3.',
      ja: '3連敗後3連勝。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'perfect_session',
    category: 'skill',
    icon: 'crown',
    title: { 'zh-Hant': '完美場次', 'zh-Hans': '完美场次', en: 'Perfect Session', ja: '完璧セッション' },
    description: {
      'zh-Hant': '單場次全勝（至少 5 場）。',
      'zh-Hans': '单场次全胜（至少 5 场）。',
      en: 'Undefeated session (5+ games).',
      ja: '1セッション全勝（5戦以上）。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'first_player_king',
    category: 'skill',
    icon: 'bolt',
    title: { 'zh-Hant': '先攻之王', 'zh-Hans': '先攻之王', en: 'First Turn King', ja: '先攻の王' },
    description: {
      'zh-Hant': '先攻勝率 ≥55%（20 場以上）。',
      'zh-Hans': '先攻胜率 ≥55%（20 场以上）。',
      en: 'First-turn win rate ≥55% (20+ games).',
      ja: '先攻勝率55%以上（20戦以上）。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'giant_slayer',
    category: 'skill',
    icon: 'shield',
    title: { 'zh-Hant': '巨人殺手', 'zh-Hans': '巨人杀手', en: 'Giant Slayer', ja: '巨人殺し' },
    description: {
      'zh-Hant': '擊敗勝率 ≥60% 的對手（至少 3 場樣本）。',
      'zh-Hans': '击败胜率 ≥60% 的对手（至少 3 场样本）。',
      en: 'Beat a 60%+ win-rate opponent (3+ games).',
      ja: '勝率60%以上の相手に勝利（3戦以上）。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'color_spectrum',
    category: 'skill',
    icon: 'palette',
    title: { 'zh-Hant': '六色制霸', 'zh-Hans': '六色制霸', en: 'Color Spectrum', ja: '六色制覇' },
    description: {
      'zh-Hant': '以每種主色牌組各贏至少 1 場（紅綠藍紫黑黃）。',
      'zh-Hans': '以每种主色牌组各赢至少 1 场。',
      en: 'Win once with each primary deck color.',
      ja: '各属性で1勝以上。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'second_striker',
    category: 'skill',
    icon: 'sparkles',
    title: { 'zh-Hant': '後攻刺客', 'zh-Hans': '后攻刺客', en: 'Second Striker', ja: '後攻の刺客' },
    description: {
      'zh-Hant': '後攻累計 15 勝。',
      'zh-Hans': '后攻累计 15 胜。',
      en: '15 wins going second.',
      ja: '後攻で15勝。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 2, threshold: 15, label: { 'zh-Hant': '15 勝', 'zh-Hans': '15 胜', en: '15 wins', ja: '15勝' } },
      { level: 3, threshold: 30, label: { 'zh-Hant': '30 勝', 'zh-Hans': '30 胜', en: '30 wins', ja: '30勝' } },
    ],
  },
  {
    id: 'upset_alarm',
    category: 'skill',
    icon: 'trophy',
    title: { 'zh-Hant': '爆冷警報', 'zh-Hans': '爆冷警报', en: 'Upset Alarm', ja: '大番狂わせ' },
    description: {
      'zh-Hant': '終結對手 3 連勝以上。',
      'zh-Hans': '终结对手 3 连胜以上。',
      en: 'End an opponent\'s 3+ win streak.',
      ja: '相手の3連勝以上を止める。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'rainbow_session',
    category: 'fun',
    icon: 'palette',
    title: { 'zh-Hant': '彩虹場次', 'zh-Hans': '彩虹场次', en: 'Rainbow Session', ja: 'レインボーセッション' },
    description: {
      'zh-Hant': '單場次使用涵蓋 6 種主色的牌組。',
      'zh-Hans': '单场次使用涵盖 6 种主色的牌组。',
      en: 'Use all 6 colors in one session.',
      ja: '1セッションで6色を使用。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
]

const LEGACY_ACHIEVEMENT_MAP: Record<string, { id: string; level: number }> = {
  first_win: { id: 'first_win', level: 1 },
  matches_10: { id: 'veteran', level: 2 },
  matches_50: { id: 'veteran', level: 4 },
  matches_100: { id: 'veteran', level: 5 },
  streak_3: { id: 'win_streak', level: 1 },
  streak_5: { id: 'win_streak', level: 2 },
  streak_10: { id: 'win_streak', level: 4 },
  deck_master: { id: 'deck_specialist', level: 2 },
  meta_explorer: { id: 'meta_explorer', level: 2 },
  set_collector: { id: 'set_collector', level: 2 },
  first_player_king: { id: 'first_player_king', level: 1 },
  comeback: { id: 'comeback', level: 1 },
  perfect_session: { id: 'perfect_session', level: 1 },
  night_owl: { id: 'session_marathon', level: 2 },
  rival: { id: 'rival_bond', level: 2 },
}

const ALL_COLORS = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'] as const

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

function secondPlayerWins(playerId: string, matches: Match[]): number {
  let wins = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.firstPlayerId === playerId) continue
    if (match.winnerPlayerId === playerId) wins += 1
  }
  return wins
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

function hasGiantSlayer(playerId: string, players: Player[], matches: Match[]): boolean {
  const h2h = new Map<string, { wins: number; losses: number }>()
  for (const match of playerMatches(playerId, matches)) {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const row = h2h.get(opponentId) ?? { wins: 0, losses: 0 }
    if (match.winnerPlayerId === playerId) row.wins += 1
    else row.losses += 1
    h2h.set(opponentId, row)
  }
  for (const [, row] of h2h) {
    const total = row.wins + row.losses
    if (total < 3 || row.wins < 1) continue
    const oppRate = row.losses / total
    if (1 - oppRate >= 0.6) return true
  }
  void players
  return false
}

function hasColorSpectrum(playerId: string, decks: Deck[], matches: Match[]): boolean {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const wonColors = new Set<string>()
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    const deck = deckById.get(deckId)
    const primary = deck?.colors[0]
    if (primary) wonColors.add(primary)
  }
  return ALL_COLORS.every((color) => wonColors.has(color))
}

function hasRainbowSession(playerId: string, decks: Deck[], matches: Match[]): boolean {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const bySession = new Map<string, Set<string>>()
  for (const match of playerMatches(playerId, matches)) {
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    const deck = deckById.get(deckId)
    const primary = deck?.colors[0]
    if (!primary) continue
    const set = bySession.get(match.sessionId) ?? new Set<string>()
    set.add(primary)
    bySession.set(match.sessionId, set)
  }
  for (const colors of bySession.values()) {
    if (ALL_COLORS.every((color) => colors.has(color))) return true
  }
  return false
}

function hasUpsetAlarm(playerId: string, matches: Match[]): boolean {
  const sorted = [...playerMatches(playerId, matches)].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
  const streakByPlayer = new Map<string, number>()
  for (const match of sorted) {
    const winner = match.winnerPlayerId
    const loser = winner === match.player1Id ? match.player2Id : match.player1Id
    if (winner === playerId) {
      const oppStreak = streakByPlayer.get(loser) ?? 0
      if (oppStreak >= 3) return true
    }
    for (const pid of [match.player1Id, match.player2Id]) {
      if (match.winnerPlayerId === pid) {
        streakByPlayer.set(pid, (streakByPlayer.get(pid) ?? 0) + 1)
      } else {
        streakByPlayer.set(pid, 0)
      }
    }
  }
  return false
}

function tierLevelForValue(definition: AchievementDefinition, value: number): number {
  let level = 0
  for (const tier of definition.tiers) {
    if (value >= tier.threshold) level = tier.level
  }
  return level
}

export function evaluateAchievementMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Record<string, number> {
  const relevant = playerMatches(playerId, matches)
  const sorted = [...relevant].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
  const wins = relevant.filter((match) => match.winnerPlayerId === playerId).length
  const deckWins = deckWinsForPlayer(playerId, matches)
  const firstStats = firstPlayerWinRate(playerId, matches)
  void players
  return {
    veteran: relevant.length,
    win_streak: getLongestWinStreak(sorted, playerId),
    deck_specialist: Math.max(0, ...deckWins.values()),
    meta_explorer: decksUsedByPlayer(playerId, matches).size,
    set_collector: setsUsedByPlayer(playerId, matches, decks).size,
    rival_bond: maxOpponentMatches(playerId, matches),
    session_marathon: maxSessionMatches(playerId, matches),
    first_win: wins >= 1 ? 1 : 0,
    comeback: hasComeback(sorted, playerId) ? 1 : 0,
    perfect_session: hasPerfectSession(playerId, matches) ? 1 : 0,
    first_player_king:
      firstStats.total >= 20 && firstStats.wins / firstStats.total >= 0.55 ? 1 : 0,
    giant_slayer: hasGiantSlayer(playerId, players, matches) ? 1 : 0,
    color_spectrum: hasColorSpectrum(playerId, decks, matches) ? 1 : 0,
    second_striker: secondPlayerWins(playerId, matches),
    upset_alarm: hasUpsetAlarm(playerId, matches) ? 1 : 0,
    rainbow_session: hasRainbowSession(playerId, decks, matches) ? 1 : 0,
  }
}

export function evaluateAchievementLevels(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Record<string, number> {
  const metrics = evaluateAchievementMetrics(playerId, players, decks, matches)
  const levels: Record<string, number> = {}
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    levels[definition.id] = tierLevelForValue(definition, metrics[definition.id] ?? 0)
  }
  return levels
}

export function evaluateNewAchievementUnlocks(
  state: AppState,
  playerId: string,
): AchievementUnlock[] {
  const earned = evaluateAchievementLevels(playerId, state.players, state.decks, state.matches)
  const existing = new Map(
    state.achievementUnlocks
      .filter((item) => item.playerId === playerId)
      .map((item) => [item.achievementId, item]),
  )
  const now = new Date().toISOString()
  const fresh: AchievementUnlock[] = []

  for (const [achievementId, level] of Object.entries(earned)) {
    if (level <= 0) continue
    const prev = existing.get(achievementId)
    const prevLevel = prev?.level ?? 0
    if (level > prevLevel) {
      fresh.push({ achievementId, playerId, level, unlockedAt: now })
    }
  }
  return fresh
}

export function mergeAchievementUnlocks(
  unlocks: AchievementUnlock[],
  incoming: AchievementUnlock[],
): AchievementUnlock[] {
  const map = new Map(unlocks.map((item) => [`${item.playerId}:${item.achievementId}`, item]))
  for (const item of incoming) {
    const key = `${item.playerId}:${item.achievementId}`
    const prev = map.get(key)
    if (!prev || item.level > prev.level) map.set(key, item)
  }
  return [...map.values()]
}

export function migrateLegacyUnlocks(unlocks: AchievementUnlock[]): AchievementUnlock[] {
  const map = new Map<string, AchievementUnlock>()
  for (const unlock of unlocks) {
    const level = unlock.level ?? 1
    const mapped = LEGACY_ACHIEVEMENT_MAP[unlock.achievementId]
    const id = mapped?.id ?? unlock.achievementId
    const mappedLevel = mapped ? Math.max(mapped.level, level) : level
    const key = `${unlock.playerId}:${id}`
    const prev = map.get(key)
    if (!prev || mappedLevel > (prev.level ?? 1)) {
      map.set(key, { ...unlock, achievementId: id, level: mappedLevel })
    }
  }
  return [...map.values()]
}

export interface AchievementProgress {
  definition: AchievementDefinition
  currentLevel: number
  maxLevel: number
  unlockedAt: string | null
  currentValue: number
  nextThreshold: number | null
}

export function getPlayerAchievementProgress(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  unlocks: AchievementUnlock[],
): AchievementProgress[] {
  const metrics = evaluateAchievementMetrics(playerId, players, decks, matches)
  const levels = evaluateAchievementLevels(playerId, players, decks, matches)
  const unlockMap = new Map(
    unlocks.filter((item) => item.playerId === playerId).map((item) => [item.achievementId, item]),
  )

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const currentLevel = levels[definition.id] ?? 0
    const maxLevel = definition.tiers[definition.tiers.length - 1]?.level ?? 1
    const nextTier = definition.tiers.find((t) => t.level === currentLevel + 1)
    return {
      definition,
      currentLevel,
      maxLevel,
      unlockedAt: unlockMap.get(definition.id)?.unlockedAt ?? null,
      currentValue: metrics[definition.id] ?? 0,
      nextThreshold: nextTier?.threshold ?? null,
    }
  })
}

export function formatAchievementToast(
  achievementId: string,
  level: number,
  language: Language,
): string {
  const definition = getAchievementDefinition(achievementId)
  if (!definition) return achievementId
  const tier = definition.tiers.find((item) => item.level === level)
  const tierLabel = tier?.label[language] ?? `Lv.${level}`
  return `${definition.title[language]} · ${tierLabel}`
}
