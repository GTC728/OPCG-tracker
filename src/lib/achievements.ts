import { createDefaultAppState } from '@/lib/constants'
import { BACKLOG_BATCH_DEFINITIONS, evaluateBacklogBatchMetrics } from '@/lib/achievementsBacklogBatch'
import {
  REMAINING_ACHIEVEMENT_DEFINITIONS,
  evaluateRemainingBacklogMetrics,
} from '@/lib/achievementsBacklogRemainingEval'
import type { BacklogExtras } from '@/lib/achievementsBacklogStats'
import { EXTRA_ACHIEVEMENT_DEFINITIONS, evaluateExtraAchievementMetrics } from '@/lib/achievementsExtra'
import { tierDefs, TIERS } from '@/lib/achievementTierCurves'
import { getCompletedMatches } from '@/lib/stats'
import type { AchievementUnlock, AppState, Deck, Language, Match, Player } from '@/types'
import { playerEligibleMatches, playerCumulativeAchievementMatches } from '@/lib/achievementEligibility'
import { mergeTieredAchievementMetrics } from '@/lib/achievementHistorical'
import { mergeLifetimeAchievementMetrics } from '@/lib/profileLifetime'
import { unlockProfileId, unlocksForProfile } from '@/lib/profileIdentity'
import type { ProfileLifetimeStats } from '@/types'

export type AchievementCategory = 'milestone' | 'streak' | 'meta' | 'social' | 'fun' | 'skill'
export type AchievementKind = 'grind' | 'skill' | 'special'
export type AchievementSortMode = 'global' | 'ease' | 'progress' | 'name' | 'category'
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
  kind: AchievementKind
  /** Higher = easier / more players complete (for default sort). */
  ease: number
  icon: AchievementIconKind
  title: Record<Language, string>
  description: Record<Language, string>
  tiers: AchievementTier[]
}

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  'milestone',
  'streak',
  'skill',
  'meta',
  'social',
  'fun',
]

export const CORE_ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'veteran',
    category: 'milestone',
    kind: 'grind',
    ease: 92,
    icon: 'medal',
    title: { 'zh-Hant': '老兵', 'zh-Hans': '老兵', en: 'Veteran', ja: 'ベテラン' },
    description: {
      'zh-Hant': '累計完成對局（長期目標：千戰）。',
      'zh-Hans': '累计完成对局（长期目标：千战）。',
      en: 'Total matches played — 1,000 for max tier.',
      ja: '累計対戦数（最大1000戦）。',
    },
    tiers: tierDefs.veteran(),
  },
  {
    id: 'first_win',
    category: 'skill',
    kind: 'special',
    ease: 98,
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
    id: 'win_streak',
    category: 'streak',
    kind: 'skill',
    ease: 58,
    icon: 'flame',
    title: { 'zh-Hant': '連勝之火', 'zh-Hans': '连胜之火', en: 'Win Streak', ja: '連勝の炎' },
    description: {
      'zh-Hant': '達成最高連勝紀錄（技術向，可重複挑戰）。',
      'zh-Hans': '达成最高连胜纪录（技术向，可重复挑战）。',
      en: 'Reach higher longest win streaks.',
      ja: '最高連勝記録を更新する。',
    },
    tiers: tierDefs.streak(),
  },
  {
    id: 'deck_specialist',
    category: 'meta',
    kind: 'grind',
    ease: 72,
    icon: 'cards',
    title: { 'zh-Hant': '主將專精', 'zh-Hans': '主将专精', en: 'Deck Specialist', ja: 'デッキ職人' },
    description: {
      'zh-Hant': '同一牌組累計勝場。',
      'zh-Hans': '同一牌组累计胜场。',
      en: 'Wins with a single deck.',
      ja: '同一デッキの累計勝利。',
    },
    tiers: tierDefs.wins(),
  },
  {
    id: 'meta_explorer',
    category: 'meta',
    kind: 'grind',
    ease: 76,
    icon: 'compass',
    title: { 'zh-Hant': 'Meta 探索', 'zh-Hans': 'Meta 探索', en: 'Meta Explorer', ja: 'メタ探索' },
    description: {
      'zh-Hant': '使用過的不同牌組數量。',
      'zh-Hans': '使用过的不同牌组数量。',
      en: 'Different decks piloted.',
      ja: '使用した異なるデッキ数。',
    },
    tiers: tierDefs.decks(),
  },
  {
    id: 'set_collector',
    category: 'meta',
    kind: 'grind',
    ease: 68,
    icon: 'package',
    title: { 'zh-Hant': '系列收藏', 'zh-Hans': '系列收藏', en: 'Set Collector', ja: 'セット収集' },
    description: {
      'zh-Hant': '使用過的不同系列 Leader。',
      'zh-Hans': '使用过的不同系列 Leader。',
      en: 'Different card sets used.',
      ja: '異なるセットのリーダーを使用。',
    },
    tiers: tierDefs.sets(),
  },
  {
    id: 'mono_maniac',
    category: 'meta',
    kind: 'grind',
    ease: 48,
    icon: 'palette',
    title: { 'zh-Hant': '單色狂人', 'zh-Hans': '单色狂人', en: 'Mono Maniac', ja: 'モノカラー狂' },
    description: {
      'zh-Hant': '以單色牌組累計勝場。',
      'zh-Hans': '以单色牌组累计胜场。',
      en: 'Wins with single-color decks.',
      ja: '単色デッキの累計勝利。',
    },
    tiers: tierDefs.wins(),
  },
  {
    id: 'rival_bond',
    category: 'social',
    kind: 'grind',
    ease: 62,
    icon: 'swords',
    title: { 'zh-Hant': '宿敵羈絆', 'zh-Hans': '宿敌羁绊', en: 'Rival Bond', ja: 'ライバル' },
    description: {
      'zh-Hant': '與同一對手的對戰場次。',
      'zh-Hans': '与同一对手的对战场次。',
      en: 'Matches against the same opponent.',
      ja: '同じ相手との対戦数。',
    },
    tiers: tierDefs.games(TIERS.medium),
  },
  {
    id: 'group_star',
    category: 'social',
    kind: 'grind',
    ease: 78,
    icon: 'anchor',
    title: { 'zh-Hant': '群組明星', 'zh-Hans': '群组明星', en: 'Group Star', ja: 'グループの星' },
    description: {
      'zh-Hant': '對戰過的不同對手數量。',
      'zh-Hans': '对战过的不同对手数量。',
      en: 'Unique opponents faced.',
      ja: '対戦した異なる相手の数。',
    },
    tiers: tierDefs.people(),
  },
  {
    id: 'session_marathon',
    category: 'fun',
    kind: 'grind',
    ease: 56,
    icon: 'moon',
    title: { 'zh-Hant': '場次馬拉松', 'zh-Hans': '场次马拉松', en: 'Session Marathon', ja: 'セッション耐久' },
    description: {
      'zh-Hant': '單一場次完成的對局數。',
      'zh-Hans': '单一场次完成的对局数。',
      en: 'Matches in one session.',
      ja: '1セッションの対戦数。',
    },
    tiers: tierDefs.session(),
  },
  {
    id: 'note_poet',
    category: 'fun',
    kind: 'grind',
    ease: 52,
    icon: 'sparkles',
    title: { 'zh-Hant': '備註詩人', 'zh-Hans': '备注诗人', en: 'Note Poet', ja: 'メモ詩人' },
    description: {
      'zh-Hant': '撰寫備註的對局數量。',
      'zh-Hans': '撰写备注的对局数量。',
      en: 'Matches with notes written.',
      ja: 'メモ付きの対戦数。',
    },
    tiers: tierDefs.notes(),
  },
  {
    id: 'comeback',
    category: 'skill',
    kind: 'skill',
    ease: 42,
    icon: 'refresh',
    title: { 'zh-Hant': '逆轉劇', 'zh-Hans': '逆转剧', en: 'Comeback', ja: '逆転劇' },
    description: {
      'zh-Hant': '連輸 3 後連贏 3 的次數。',
      'zh-Hans': '连输 3 后连赢 3 的次数。',
      en: 'Times you won 3 in a row after losing 3.',
      ja: '3連敗後3連勝を達成した回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'perfect_session',
    category: 'skill',
    kind: 'skill',
    ease: 38,
    icon: 'crown',
    title: { 'zh-Hant': '完美場次', 'zh-Hans': '完美场次', en: 'Perfect Session', ja: '完璧セッション' },
    description: {
      'zh-Hant': '單場次全勝（至少 5 場）的次數。',
      'zh-Hans': '单场次全胜（至少 5 场）的次数。',
      en: 'Undefeated sessions with 5+ games.',
      ja: '5戦以上の全勝セッション回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'first_player_king',
    category: 'skill',
    kind: 'special',
    ease: 22,
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
    kind: 'skill',
    ease: 32,
    icon: 'shield',
    title: { 'zh-Hant': '巨人殺手', 'zh-Hans': '巨人杀手', en: 'Giant Slayer', ja: '巨人殺し' },
    description: {
      'zh-Hant': '擊敗勝率 ≥60% 對手的次數（至少 3 場樣本）。',
      'zh-Hans': '击败胜率 ≥60% 对手的次数（至少 3 场样本）。',
      en: 'Wins vs 60%+ win-rate opponents (3+ games).',
      ja: '勝率60%以上の相手への勝利回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'color_spectrum',
    category: 'skill',
    kind: 'skill',
    ease: 44,
    icon: 'palette',
    title: { 'zh-Hant': '六色制霸', 'zh-Hans': '六色制霸', en: 'Color Spectrum', ja: '六色制覇' },
    description: {
      'zh-Hant': '以不同主色牌組累計勝場的顏色數。',
      'zh-Hans': '以不同主色牌组累计胜场的颜色数。',
      en: 'Primary colors you have won with.',
      ja: '勝利した主色の数。',
    },
    tiers: tierDefs.colors(),
  },
  {
    id: 'second_striker',
    category: 'skill',
    kind: 'skill',
    ease: 60,
    icon: 'sparkles',
    title: { 'zh-Hant': '後攻刺客', 'zh-Hans': '后攻刺客', en: 'Second Striker', ja: '後攻の刺客' },
    description: {
      'zh-Hant': '後攻累計勝場。',
      'zh-Hans': '后攻累计胜场。',
      en: 'Wins going second.',
      ja: '後攻での累計勝利。',
    },
    tiers: tierDefs.wins(TIERS.streak5),
  },
  {
    id: 'upset_alarm',
    category: 'skill',
    kind: 'skill',
    ease: 46,
    icon: 'trophy',
    title: { 'zh-Hant': '爆冷警報', 'zh-Hans': '爆冷警报', en: 'Upset Alarm', ja: '大番狂わせ' },
    description: {
      'zh-Hant': '終結對手 3 連勝以上的次數。',
      'zh-Hans': '终结对手 3 连胜以上的次数。',
      en: 'Times you ended an opponent\'s 3+ streak.',
      ja: '相手の3連勝以上を止めた回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'mirror_master',
    category: 'skill',
    kind: 'skill',
    ease: 36,
    icon: 'cards',
    title: { 'zh-Hant': '鏡像大師', 'zh-Hans': '镜像大师', en: 'Mirror Master', ja: 'ミラーマスター' },
    description: {
      'zh-Hant': '鏡像對局（同 Leader）勝利次數。',
      'zh-Hans': '镜像对局（同 Leader）胜利次数。',
      en: 'Wins in mirror matches (same leader).',
      ja: '同リーダー対戦での勝利回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'meta_breaker',
    category: 'skill',
    kind: 'skill',
    ease: 34,
    icon: 'bolt',
    title: { 'zh-Hant': '熱門終結者', 'zh-Hans': '热门终结者', en: 'Meta Breaker', ja: 'メタ破り' },
    description: {
      'zh-Hant': '擊敗環境熱門牌組的次數。',
      'zh-Hans': '击败环境热门牌组的次数。',
      en: 'Wins vs top-tier popular decks.',
      ja: '人気デッキへの勝利回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'revenge_win',
    category: 'skill',
    kind: 'skill',
    ease: 50,
    icon: 'refresh',
    title: { 'zh-Hant': '復仇賽', 'zh-Hans': '复仇赛', en: 'Revenge Match', ja: 'リベンジ' },
    description: {
      'zh-Hant': '同場次輸給對手後再勝出的次數。',
      'zh-Hans': '同场次输给对手后再胜出的次数。',
      en: 'Rematch wins in the same session after a loss.',
      ja: '同セッションで敗北後に勝った回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'underdog',
    category: 'skill',
    kind: 'skill',
    ease: 40,
    icon: 'shield',
    title: { 'zh-Hant': '劣勢突破', 'zh-Hans': '劣势突破', en: 'Underdog', ja: '劣勢突破' },
    description: {
      'zh-Hant': '對戰紀錄落後時仍取勝的次數。',
      'zh-Hans': '对战纪录落后时仍取胜的次数。',
      en: 'Wins while trailing the head-to-head record.',
      ja: '通算成績が劣勢の相手に勝った回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'weekend_warrior',
    category: 'fun',
    kind: 'skill',
    ease: 66,
    icon: 'moon',
    title: { 'zh-Hant': '週末戰神', 'zh-Hans': '周末战神', en: 'Weekend Warrior', ja: '週末の戦神' },
    description: {
      'zh-Hant': '週六日累計勝場。',
      'zh-Hans': '周六日累计胜场。',
      en: 'Wins on Saturdays and Sundays.',
      ja: '土日の累計勝利。',
    },
    tiers: tierDefs.wins(TIERS.streak5),
  },
  {
    id: 'rainbow_session',
    category: 'fun',
    kind: 'skill',
    ease: 28,
    icon: 'palette',
    title: { 'zh-Hant': '彩虹場次', 'zh-Hans': '彩虹场次', en: 'Rainbow Session', ja: 'レインボーセッション' },
    description: {
      'zh-Hant': '單場次使用涵蓋 6 種主色的次數。',
      'zh-Hans': '单场次使用涵盖 6 种主色的次数。',
      en: 'Sessions where you used all 6 colors.',
      ja: '6色を使ったセッション回数。',
    },
    tiers: tierDefs.times(),
  },
  {
    id: 'achievement_hunter',
    category: 'meta',
    kind: 'special',
    ease: 15,
    icon: 'trophy',
    title: { 'zh-Hant': '成就獵人', 'zh-Hans': '成就猎人', en: 'Achievement Hunter', ja: '実績ハンター' },
    description: {
      'zh-Hant': '解鎖其他成就種類的百分比。',
      'zh-Hans': '解锁其他成就种类的百分比。',
      en: 'Percent of other achievement families unlocked.',
      ja: '他実績ファミリーの解除率。',
    },
    tiers: tierDefs.percent(),
  },
]

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  ...CORE_ACHIEVEMENT_DEFINITIONS,
  ...(EXTRA_ACHIEVEMENT_DEFINITIONS as AchievementDefinition[]),
  ...BACKLOG_BATCH_DEFINITIONS,
  ...REMAINING_ACHIEVEMENT_DEFINITIONS,
]

export function backlogExtrasFromState(state: AppState): BacklogExtras {
  return {
    linkedPlayerId: state.settings.linkedPlayerId,
    settings: state.settings,
    auditLog: state.auditLog ?? [],
    matchRevisions: state.matchRevisions,
    achievementUnlocks: state.achievementUnlocks,
    sessions: state.sessions,
  }
}

const LEGACY_ACHIEVEMENT_MAP: Record<string, { id: string; level: number }> = {
  first_win: { id: 'first_win', level: 1 },
  matches_10: { id: 'veteran', level: 1 },
  matches_50: { id: 'veteran', level: 2 },
  matches_100: { id: 'veteran', level: 3 },
  streak_3: { id: 'win_streak', level: 1 },
  streak_5: { id: 'win_streak', level: 2 },
  streak_10: { id: 'win_streak', level: 3 },
  deck_master: { id: 'deck_specialist', level: 2 },
  meta_explorer: { id: 'meta_explorer', level: 2 },
  set_collector: { id: 'set_collector', level: 2 },
  first_player_king: { id: 'first_player_king', level: 1 },
  comeback: { id: 'comeback', level: 1 },
  perfect_session: { id: 'perfect_session', level: 1 },
  night_owl: { id: 'night_owl', level: 1 },
  rival: { id: 'rival_bond', level: 2 },
}

const ALL_COLORS = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'] as const

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id)
}

export function playerMatches(playerId: string, matches: Match[]): Match[] {
  return getCompletedMatches(matches).filter(
    (match) => match.player1Id === playerId || match.player2Id === playerId,
  )
}

export function sortByFinished(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
}

export function getLongestWinStreak(sortedMatches: Match[], playerId: string): number {
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

function countComebacks(sortedMatches: Match[], playerId: string): number {
  let count = 0
  let lossStreak = 0
  for (let i = 0; i < sortedMatches.length; i += 1) {
    const match = sortedMatches[i]
    const won = match.winnerPlayerId === playerId
    if (!won) {
      lossStreak += 1
      continue
    }
    if (lossStreak >= 3) {
      let winStreak = 1
      for (let j = i + 1; j < sortedMatches.length; j += 1) {
        if (sortedMatches[j].winnerPlayerId !== playerId) break
        winStreak += 1
      }
      if (winStreak >= 3) {
        count += 1
        lossStreak = 0
        continue
      }
    }
    lossStreak = 0
  }
  return count
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

function uniqueOpponents(playerId: string, matches: Match[]): number {
  const opponents = new Set<string>()
  for (const match of playerMatches(playerId, matches)) {
    opponents.add(match.player1Id === playerId ? match.player2Id : match.player1Id)
  }
  return opponents.size
}

function maxSessionMatches(playerId: string, matches: Match[]): number {
  const counts = new Map<string, number>()
  for (const match of playerMatches(playerId, matches)) {
    counts.set(match.sessionId, (counts.get(match.sessionId) ?? 0) + 1)
  }
  return Math.max(0, ...counts.values())
}

function countPerfectSessions(playerId: string, matches: Match[]): number {
  const bySession = new Map<string, Match[]>()
  for (const match of playerMatches(playerId, matches)) {
    const list = bySession.get(match.sessionId) ?? []
    list.push(match)
    bySession.set(match.sessionId, list)
  }
  let count = 0
  for (const sessionMatches of bySession.values()) {
    if (sessionMatches.length < 5) continue
    if (sessionMatches.every((match) => match.winnerPlayerId === playerId)) count += 1
  }
  return count
}

function opponentWinRates(
  players: Player[],
  matches: Match[],
): Map<string, number> {
  const stats = new Map<string, { wins: number; total: number }>()
  for (const match of getCompletedMatches(matches)) {
    const winner = match.winnerPlayerId
    const loser = winner === match.player1Id ? match.player2Id : match.player1Id
    for (const pid of [winner, loser]) {
      const row = stats.get(pid) ?? { wins: 0, total: 0 }
      row.total += 1
      if (pid === winner) row.wins += 1
      stats.set(pid, row)
    }
  }
  void players
  const rates = new Map<string, number>()
  for (const [pid, row] of stats) {
    rates.set(pid, row.total > 0 ? row.wins / row.total : 0)
  }
  return rates
}

function countGiantSlayerWins(playerId: string, players: Player[], matches: Match[]): number {
  const rates = opponentWinRates(players, matches)
  let count = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const oppGames = playerMatches(opponentId, matches).length
    if (oppGames < 3) continue
    if ((rates.get(opponentId) ?? 0) >= 0.6) count += 1
  }
  return count
}

function colorsWonCount(playerId: string, decks: Deck[], matches: Match[]): number {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  const wonColors = new Set<string>()
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    const deck = deckById.get(deckId)
    const primary = deck?.colors[0]
    if (primary) wonColors.add(primary)
  }
  return wonColors.size
}

function countRainbowSessions(playerId: string, decks: Deck[], matches: Match[]): number {
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
  let count = 0
  for (const colors of bySession.values()) {
    if (ALL_COLORS.every((color) => colors.has(color))) count += 1
  }
  return count
}

function countUpsetAlarms(playerId: string, matches: Match[]): number {
  const sorted = sortByFinished(playerMatches(playerId, matches))
  const streakByPlayer = new Map<string, number>()
  let count = 0
  for (const match of sorted) {
    const winner = match.winnerPlayerId
    const loser = winner === match.player1Id ? match.player2Id : match.player1Id
    if (winner === playerId) {
      const oppStreak = streakByPlayer.get(loser) ?? 0
      if (oppStreak >= 3) count += 1
    }
    for (const pid of [match.player1Id, match.player2Id]) {
      if (match.winnerPlayerId === pid) {
        streakByPlayer.set(pid, (streakByPlayer.get(pid) ?? 0) + 1)
      } else {
        streakByPlayer.set(pid, 0)
      }
    }
  }
  return count
}

function isMonoDeck(deck: Deck | undefined): boolean {
  return Boolean(deck && deck.colors.length === 1)
}

function maxMonoDeckWins(playerId: string, decks: Deck[], matches: Match[]): number {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  let totalMonoWins = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    if (isMonoDeck(deckById.get(deckId))) totalMonoWins += 1
  }
  return totalMonoWins
}

function countMirrorWins(playerId: string, decks: Deck[], matches: Match[]): number {
  const deckById = new Map(decks.map((deck) => [deck.id, deck]))
  let count = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const d1 = deckById.get(match.deck1Id)
    const d2 = deckById.get(match.deck2Id)
    if (d1 && d2 && d1.leaderName === d2.leaderName) count += 1
  }
  return count
}

function buildHotDeckIds(matches: Match[], decks: Deck[]): Set<string> {
  const counts = new Map<string, number>()
  for (const match of getCompletedMatches(matches)) {
    counts.set(match.deck1Id, (counts.get(match.deck1Id) ?? 0) + 1)
    counts.set(match.deck2Id, (counts.get(match.deck2Id) ?? 0) + 1)
  }
  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([deckId]) => deckId)
  void decks
  return new Set(ranked)
}

function countMetaBreakerWins(playerId: string, decks: Deck[], matches: Match[]): number {
  const hotDecks = buildHotDeckIds(matches, decks)
  if (!hotDecks.size) return 0
  let count = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const oppDeckId = match.player1Id === playerId ? match.deck2Id : match.deck1Id
    if (hotDecks.has(oppDeckId)) count += 1
  }
  return count
}

function countRevengeWins(playerId: string, matches: Match[]): number {
  const sorted = sortByFinished(playerMatches(playerId, matches))
  const sessionLosses = new Map<string, Set<string>>()
  let count = 0
  for (const match of sorted) {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const won = match.winnerPlayerId === playerId
    if (won && sessionLosses.get(match.sessionId)?.has(opponentId)) {
      count += 1
    }
    if (!won) {
      const set = sessionLosses.get(match.sessionId) ?? new Set<string>()
      set.add(opponentId)
      sessionLosses.set(match.sessionId, set)
    }
  }
  return count
}

function countUnderdogWins(playerId: string, matches: Match[]): number {
  const sorted = sortByFinished(playerMatches(playerId, matches))
  const h2h = new Map<string, { wins: number; losses: number }>()
  let count = 0
  for (const match of sorted) {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const row = h2h.get(opponentId) ?? { wins: 0, losses: 0 }
    const won = match.winnerPlayerId === playerId
    if (won && row.losses > row.wins) count += 1
    if (won) row.wins += 1
    else row.losses += 1
    h2h.set(opponentId, row)
  }
  return count
}

function countWeekendWins(playerId: string, matches: Match[]): number {
  let count = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const day = new Date(match.finishedAt).getDay()
    if (day === 0 || day === 6) count += 1
  }
  return count
}

function countMatchesWithNotes(playerId: string, matches: Match[]): number {
  return playerMatches(playerId, matches).filter((match) => Boolean(match.notes?.trim())).length
}

function tierLevelForValue(definition: AchievementDefinition, value: number): number {
  let level = 0
  for (const tier of definition.tiers) {
    if (value >= tier.threshold) level = tier.level
  }
  return level
}

function computeAchievementHunterPercent(levels: Record<string, number>): number {
  const families = ACHIEVEMENT_DEFINITIONS.filter((item) => item.id !== 'achievement_hunter')
  if (!families.length) return 0
  const unlocked = families.filter((item) => (levels[item.id] ?? 0) > 0).length
  return Math.round((unlocked / families.length) * 100)
}

export function evaluateAchievementMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  linkedPlayerId: string | null = null,
  extras?: BacklogExtras,
  lifetime: ProfileLifetimeStats | null = null,
): Record<string, number> {
  const skillMatches = playerEligibleMatches(playerId, matches)
  const cumulativeMatches = playerCumulativeAchievementMatches(playerId, matches)

  const build = (relevant: Match[]) => {
    const sorted = sortByFinished(relevant)
    const wins = relevant.filter((match) => match.winnerPlayerId === playerId).length
    const deckWins = deckWinsForPlayer(playerId, relevant)
    const firstStats = firstPlayerWinRate(playerId, relevant)
    const extra = evaluateExtraAchievementMetrics(playerId, players, decks, relevant)
    const batch = evaluateBacklogBatchMetrics(playerId, players, decks, relevant, linkedPlayerId)
    const defaultExtras = backlogExtrasFromState(createDefaultAppState())
    const backlogExtras = extras ?? {
      ...defaultExtras,
      linkedPlayerId: linkedPlayerId ?? defaultExtras.linkedPlayerId,
    }
    const remaining = evaluateRemainingBacklogMetrics(
      playerId,
      players,
      decks,
      relevant,
      backlogExtras,
    )
    return {
      veteran: relevant.length,
      first_win: wins >= 1 ? 1 : 0,
      win_streak: getLongestWinStreak(sorted, playerId),
      deck_specialist: Math.max(0, ...deckWins.values()),
      meta_explorer: decksUsedByPlayer(playerId, relevant).size,
      set_collector: setsUsedByPlayer(playerId, relevant, decks).size,
      mono_maniac: maxMonoDeckWins(playerId, decks, relevant),
      rival_bond: maxOpponentMatches(playerId, relevant),
      group_star: uniqueOpponents(playerId, relevant),
      session_marathon: maxSessionMatches(playerId, relevant),
      note_poet: countMatchesWithNotes(playerId, relevant),
      comeback: countComebacks(sorted, playerId),
      perfect_session: countPerfectSessions(playerId, relevant),
      first_player_king:
        firstStats.total >= 20 && firstStats.wins / firstStats.total >= 0.55 ? 1 : 0,
      giant_slayer: countGiantSlayerWins(playerId, players, relevant),
      color_spectrum: colorsWonCount(playerId, decks, relevant),
      second_striker: secondPlayerWins(playerId, relevant),
      upset_alarm: countUpsetAlarms(playerId, relevant),
      mirror_master: countMirrorWins(playerId, decks, relevant),
      meta_breaker: countMetaBreakerWins(playerId, decks, relevant),
      revenge_win: countRevengeWins(playerId, relevant),
      underdog: countUnderdogWins(playerId, relevant),
      weekend_warrior: countWeekendWins(playerId, relevant),
      rainbow_session: countRainbowSessions(playerId, decks, relevant),
      achievement_hunter: 0,
      ...extra,
      ...batch,
      ...remaining,
    }
  }

  const skillRaw = build(skillMatches)
  const cumulativeRaw = build(cumulativeMatches)
  const tiered = mergeTieredAchievementMetrics(
    ACHIEVEMENT_DEFINITIONS,
    cumulativeRaw,
    skillRaw,
  )

  return mergeLifetimeAchievementMetrics(
    tiered,
    lifetime,
    playerId,
    linkedPlayerId,
    matches,
  )
}

export function evaluateAchievementState(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  linkedPlayerId: string | null = null,
  extras?: BacklogExtras,
  lifetime: ProfileLifetimeStats | null = null,
): { metrics: Record<string, number>; levels: Record<string, number> } {
  const metrics = evaluateAchievementMetrics(
    playerId,
    players,
    decks,
    matches,
    linkedPlayerId,
    extras,
    lifetime,
  )
  const levels: Record<string, number> = {}
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (definition.id === 'achievement_hunter') continue
    levels[definition.id] = tierLevelForValue(definition, metrics[definition.id] ?? 0)
  }
  const hunterPct = computeAchievementHunterPercent(levels)
  levels.achievement_hunter = tierLevelForValue(
    getAchievementDefinition('achievement_hunter')!,
    hunterPct,
  )
  metrics.achievement_hunter = hunterPct
  return { metrics, levels }
}

export function evaluateAchievementLevels(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  linkedPlayerId: string | null = null,
  extras?: BacklogExtras,
  lifetime: ProfileLifetimeStats | null = null,
): Record<string, number> {
  return evaluateAchievementState(
    playerId,
    players,
    decks,
    matches,
    linkedPlayerId,
    extras,
    lifetime,
  ).levels
}

/** One full evaluation pass per eligible player (shared by global + peer rate helpers). */
export function evaluateAllEligibleAchievementLevels(
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Map<string, Record<string, number>> {
  const eligible = getEligiblePlayersForAchievements(players, matches)
  const levelByPlayer = new Map<string, Record<string, number>>()
  for (const player of eligible) {
    levelByPlayer.set(player.id, evaluateAchievementLevels(player.id, players, decks, matches))
  }
  return levelByPlayer
}

function globalRatesFromLevelMap(
  levelByPlayer: Map<string, Record<string, number>>,
  eligibleCount: number,
): Map<string, AchievementGlobalRate> {
  const unlockedCounts = new Map<string, number>()
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    unlockedCounts.set(definition.id, 0)
  }
  for (const levels of levelByPlayer.values()) {
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      if ((levels[definition.id] ?? 0) > 0) {
        unlockedCounts.set(definition.id, (unlockedCounts.get(definition.id) ?? 0) + 1)
      }
    }
  }
  const result = new Map<string, AchievementGlobalRate>()
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    const unlockedCount = unlockedCounts.get(definition.id) ?? 0
    result.set(definition.id, {
      achievementId: definition.id,
      unlockedCount,
      eligibleCount,
      rate: eligibleCount ? Math.round((unlockedCount / eligibleCount) * 1000) / 10 : 0,
    })
  }
  return result
}

function peerRatesFromLevelMap(levelByPlayer: Map<string, Record<string, number>>): Map<string, number> {
  const families = ACHIEVEMENT_DEFINITIONS.length
  const rates = new Map<string, number>()
  for (const [playerId, levels] of levelByPlayer) {
    const unlocked = ACHIEVEMENT_DEFINITIONS.filter((def) => (levels[def.id] ?? 0) > 0).length
    rates.set(playerId, families ? Math.round((unlocked / families) * 1000) / 10 : 0)
  }
  return rates
}

export function computeAchievementLeaderboards(
  players: Player[],
  decks: Deck[],
  matches: Match[],
): {
  globalRates: Map<string, AchievementGlobalRate>
  peerRateByPlayer: Map<string, number>
} {
  const levelByPlayer = evaluateAllEligibleAchievementLevels(players, decks, matches)
  const eligibleCount = levelByPlayer.size
  return {
    globalRates: globalRatesFromLevelMap(levelByPlayer, eligibleCount),
    peerRateByPlayer: peerRatesFromLevelMap(levelByPlayer),
  }
}

export function reconcileAchievementUnlocks(
  state: AppState,
  playerId: string,
  options?: { provisional?: boolean },
): { state: AppState; fresh: AchievementUnlock[] } {
  const profileId =
    playerId === state.settings.linkedPlayerId && state.settings.profileIdentityId
      ? state.settings.profileIdentityId
      : playerId
  const lifetime =
    playerId === state.settings.linkedPlayerId ? state.profileLifetime : null
  const earned = evaluateAchievementLevels(
    playerId,
    state.players,
    state.decks,
    state.matches,
    state.settings.linkedPlayerId,
    backlogExtrasFromState(state),
    lifetime,
  )
  const existingForProfile = state.achievementUnlocks.filter(
    (item) => unlockProfileId(item) === profileId && !item.provisional,
  )
  const now = new Date().toISOString()
  const fresh: AchievementUnlock[] = []
  const nextForProfile: AchievementUnlock[] = []

  for (const [achievementId, level] of Object.entries(earned)) {
    if (level <= 0) continue
    const prev = existingForProfile.find((item) => item.achievementId === achievementId)
    const unlock: AchievementUnlock = {
      achievementId,
      playerId,
      profileIdentityId: profileId,
      level,
      unlockedAt: prev && prev.level >= level ? prev.unlockedAt : now,
      provisional: options?.provisional || undefined,
    }
    nextForProfile.push(unlock)
    if (!prev || level > prev.level) {
      fresh.push(unlock)
    }
  }

  const others = state.achievementUnlocks.filter((item) => unlockProfileId(item) !== profileId)
  return {
    state: {
      ...state,
      achievementUnlocks: [...others, ...nextForProfile],
    },
    fresh,
  }
}

/** @deprecated Use reconcileAchievementUnlocks */
export function evaluateNewAchievementUnlocks(
  state: AppState,
  playerId: string,
): AchievementUnlock[] {
  return reconcileAchievementUnlocks(state, playerId).fresh
}

export function mergeAchievementUnlocks(
  unlocks: AchievementUnlock[],
  incoming: AchievementUnlock[],
): AchievementUnlock[] {
  const map = new Map(
    unlocks.map((item) => [`${unlockProfileId(item)}:${item.achievementId}`, item]),
  )
  for (const item of incoming) {
    const key = `${unlockProfileId(item)}:${item.achievementId}`
    const prev = map.get(key)
    if (!prev || item.level > prev.level) map.set(key, item)
  }
  return [...map.values()]
}

export function migrateLegacyUnlocks(
  unlocks: AchievementUnlock[],
  profileIdentityId: string | null,
): AchievementUnlock[] {
  const map = new Map<string, AchievementUnlock>()
  for (const unlock of unlocks) {
    const level = unlock.level ?? 1
    const mapped = LEGACY_ACHIEVEMENT_MAP[unlock.achievementId]
    const id = mapped?.id ?? unlock.achievementId
    const mappedLevel = mapped ? Math.max(mapped.level, level) : level
    const profileId = unlock.profileIdentityId ?? profileIdentityId ?? unlock.playerId
    const key = `${profileId}:${id}`
    const prev = map.get(key)
    if (!prev || mappedLevel > (prev.level ?? 1)) {
      map.set(key, {
        ...unlock,
        achievementId: id,
        level: mappedLevel,
        profileIdentityId: profileId,
        playerId: unlock.playerId,
      })
    }
  }
  return [...map.values()]
}

export interface AchievementPeerRate {
  playerId: string
  name: string
  rate: number
}

export interface AchievementGlobalRate {
  achievementId: string
  unlockedCount: number
  eligibleCount: number
  rate: number
}

export function getEligiblePlayersForAchievements(players: Player[], matches: Match[]): Player[] {
  const withMatches = new Set<string>()
  for (const match of getCompletedMatches(matches)) {
    withMatches.add(match.player1Id)
    withMatches.add(match.player2Id)
  }
  return players.filter((player) => !player.archived && withMatches.has(player.id))
}

export function computeGlobalAchievementRates(
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Map<string, AchievementGlobalRate> {
  return computeAchievementLeaderboards(players, decks, matches).globalRates
}

export function computePerPlayerAchievementRates(
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Map<string, number> {
  return computeAchievementLeaderboards(players, decks, matches).peerRateByPlayer
}

export interface AchievementProgress {
  definition: AchievementDefinition
  currentLevel: number
  maxLevel: number
  unlockedAt: string | null
  currentValue: number
  nextThreshold: number | null
  globalRate: number
}

export interface AchievementSummary {
  familiesUnlocked: number
  totalFamilies: number
  familyRate: number
  tiersEarned: number
  totalTiers: number
  tierRate: number
}

/** Family unlock count vs tier-weighted progress — avoids treating Lv.1/5 as a full achievement. */
export function computeAchievementSummary(achievements: AchievementProgress[]): AchievementSummary {
  const totalFamilies = achievements.length
  const familiesUnlocked = achievements.filter((item) => item.currentLevel > 0).length
  const tiersEarned = achievements.reduce((sum, item) => sum + item.currentLevel, 0)
  const totalTiers = achievements.reduce((sum, item) => sum + item.maxLevel, 0)
  return {
    familiesUnlocked,
    totalFamilies,
    familyRate: totalFamilies ? Math.round((familiesUnlocked / totalFamilies) * 1000) / 10 : 0,
    tiersEarned,
    totalTiers,
    tierRate: totalTiers ? Math.round((tiersEarned / totalTiers) * 1000) / 10 : 0,
  }
}

export function getPlayerAchievementProgress(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  unlocks: AchievementUnlock[],
  globalRates?: Map<string, AchievementGlobalRate>,
  linkedPlayerId: string | null = null,
  extras?: BacklogExtras,
  precomputedState?: { metrics: Record<string, number>; levels: Record<string, number> },
): AchievementProgress[] {
  const defaultExtras = backlogExtrasFromState(createDefaultAppState())
  const backlogExtras = extras ?? {
    ...defaultExtras,
    linkedPlayerId: linkedPlayerId ?? defaultExtras.linkedPlayerId,
    achievementUnlocks: unlocks,
  }
  const metrics =
    precomputedState ??
    evaluateAchievementState(playerId, players, decks, matches, linkedPlayerId, backlogExtras)
  const rates = globalRates ?? computeGlobalAchievementRates(players, decks, matches)
  const unlockMap = new Map(
    (playerId === linkedPlayerId && backlogExtras.settings.profileIdentityId
      ? unlocksForProfile(unlocks, backlogExtras.settings.profileIdentityId)
      : unlocks.filter((item) => item.playerId === playerId && !item.provisional)
    ).map((item) => [item.achievementId, item]),
  )

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const computedLevel = metrics.levels[definition.id] ?? 0
    const storedLevel = unlockMap.get(definition.id)?.level ?? 0
    const currentLevel = storedLevel
    const maxLevel = definition.tiers[definition.tiers.length - 1]?.level ?? 1
    const nextTier = definition.tiers.find((t) => t.level === Math.max(currentLevel, computedLevel) + 1)
    const currentValue =
      definition.id === 'achievement_hunter'
        ? computeAchievementHunterPercent(metrics.levels)
        : metrics.metrics[definition.id] ?? 0
    return {
      definition,
      currentLevel,
      maxLevel,
      unlockedAt: unlockMap.get(definition.id)?.unlockedAt ?? null,
      currentValue,
      nextThreshold: nextTier?.threshold ?? null,
      globalRate: rates.get(definition.id)?.rate ?? 0,
    }
  })
}

export function sortAchievementProgress(
  items: AchievementProgress[],
  mode: AchievementSortMode,
): AchievementProgress[] {
  const list = [...items]
  switch (mode) {
    case 'global':
      return list.sort((a, b) => {
        const rateDiff = b.globalRate - a.globalRate
        if (rateDiff !== 0) return rateDiff
        return b.definition.ease - a.definition.ease
      })
    case 'ease':
      return list.sort((a, b) => {
        const easeDiff = b.definition.ease - a.definition.ease
        if (easeDiff !== 0) return easeDiff
        return a.definition.title['zh-Hant'].localeCompare(b.definition.title['zh-Hant'])
      })
    case 'progress':
      return list.sort((a, b) => {
        const ratioA = a.currentLevel / a.maxLevel
        const ratioB = b.currentLevel / b.maxLevel
        if (ratioB !== ratioA) return ratioB - ratioA
        return b.definition.ease - a.definition.ease
      })
    case 'name':
      return list.sort((a, b) =>
        a.definition.title['zh-Hant'].localeCompare(b.definition.title['zh-Hant']),
      )
    case 'category':
      return list.sort((a, b) => {
        const catA = ACHIEVEMENT_CATEGORY_ORDER.indexOf(a.definition.category)
        const catB = ACHIEVEMENT_CATEGORY_ORDER.indexOf(b.definition.category)
        if (catA !== catB) return catA - catB
        return b.definition.ease - a.definition.ease
      })
    default:
      return list
  }
}

export function filterAchievementProgress(
  items: AchievementProgress[],
  category: AchievementCategory | 'all',
): AchievementProgress[] {
  if (category === 'all') return items
  return items.filter((item) => item.definition.category === category)
}

export function getAchievementPreviewItems(
  items: AchievementProgress[],
  limit = 8,
): { items: AchievementProgress[]; mode: 'recent' | 'highlights' } {
  const withTimestamp = items
    .filter((item) => item.currentLevel > 0 && item.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())

  if (withTimestamp.length > 0) {
    return { items: withTimestamp.slice(0, limit), mode: 'recent' }
  }

  const highlights = [...items]
    .filter((item) => item.currentLevel > 0)
    .sort((a, b) => {
      const ratioDiff = b.currentLevel / b.maxLevel - a.currentLevel / a.maxLevel
      if (ratioDiff !== 0) return ratioDiff
      return b.currentLevel - a.currentLevel
    })

  return { items: highlights.slice(0, limit), mode: 'highlights' }
}

export function getRecentAchievementProgress(
  items: AchievementProgress[],
  limit = 8,
): AchievementProgress[] {
  return getAchievementPreviewItems(items, limit).items
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
