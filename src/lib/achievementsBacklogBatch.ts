import type { AchievementDefinition } from '@/lib/achievements'
import { tierDefs, TIERS } from '@/lib/achievementTierCurves'
import { getCompletedMatches } from '@/lib/stats'
import type { Deck, Match, Player } from '@/types'

export const BACKLOG_BATCH_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'centurion_wins',
    category: 'milestone',
    kind: 'grind',
    ease: 35,
    icon: 'crown',
    title: { 'zh-Hant': '百勝將', 'zh-Hans': '百胜将', en: 'Centurion', ja: '百勝将' },
    description: {
      'zh-Hant': '累計勝場里程碑。',
      'zh-Hans': '累计胜场里程碑。',
      en: 'Lifetime win milestones.',
      ja: '累計勝利の節目。',
    },
    tiers: tierDefs.winsLarge(),
  },
  {
    id: 'iron_win_rate',
    category: 'skill',
    kind: 'skill',
    ease: 25,
    icon: 'shield',
    title: { 'zh-Hant': '穩定勝者', 'zh-Hans': '稳定胜者', en: 'Iron Win Rate', ja: '安定勝者' },
    description: {
      'zh-Hant': '至少 30 場且勝率達標。',
      'zh-Hans': '至少 30 场且胜率达标。',
      en: 'Win rate tiers with 30+ games.',
      ja: '30戦以上で勝率達成。',
    },
    tiers: tierDefs.winRate(),
  },
  {
    id: 'rematch_king',
    category: 'social',
    kind: 'grind',
    ease: 55,
    icon: 'refresh',
    title: { 'zh-Hant': '再戰之王', 'zh-Hans': '再战之王', en: 'Rematch King', ja: '再戦王' },
    description: {
      'zh-Hant': '與同一對手跨場再戰次數。',
      'zh-Hans': '与同一对手跨场再战次数。',
      en: 'Rematches vs the same opponent across sessions.',
      ja: '同一相手との再戦回数。',
    },
    tiers: tierDefs.rematch(),
  },
  {
    id: 'leader_collector',
    category: 'meta',
    kind: 'grind',
    ease: 60,
    icon: 'cards',
    title: { 'zh-Hant': '主將圖鑑', 'zh-Hans': '主将图鉴', en: 'Leader Collector', ja: 'リーダー図鑑' },
    description: {
      'zh-Hant': '使用過的不同主將數量。',
      'zh-Hans': '使用过的不同主将数量。',
      en: 'Unique leaders played.',
      ja: '使用したリーダー数。',
    },
    tiers: tierDefs.leaders(),
  },
  {
    id: 'round_robin',
    category: 'social',
    kind: 'skill',
    ease: 45,
    icon: 'anchor',
    title: { 'zh-Hant': '全員交手', 'zh-Hans': '全员交手', en: 'Round Robin', ja: '全員対戦' },
    description: {
      'zh-Hant': '單場次交手不同對手數。',
      'zh-Hans': '单场次交手不同对手数。',
      en: 'Unique opponents in one session.',
      ja: '1セッションの対戦相手数。',
    },
    tiers: tierDefs.people(),
  },
  {
    id: 'midnight_duel',
    category: 'fun',
    kind: 'special',
    ease: 70,
    icon: 'moon',
    title: { 'zh-Hant': '午夜決鬥', 'zh-Hans': '午夜决斗', en: 'Midnight Duel', ja: '真夜中決闘' },
    description: {
      'zh-Hant': '凌晨 0–4 點的勝利。',
      'zh-Hans': '凌晨 0–4 点的胜利。',
      en: 'Wins between midnight and 4 AM.',
      ja: '0–4時の勝利。',
    },
    tiers: tierDefs.wins(),
  },
  {
    id: 'lunch_break',
    category: 'fun',
    kind: 'special',
    ease: 75,
    icon: 'sparkles',
    title: { 'zh-Hant': '午休局', 'zh-Hans': '午休局', en: 'Lunch Break', ja: 'ランチブレイク' },
    description: {
      'zh-Hant': '11:00–14:00 的勝利。',
      'zh-Hans': '11:00–14:00 的胜利。',
      en: 'Wins during lunch hours.',
      ja: '昼休みの勝利。',
    },
    tiers: tierDefs.wins(TIERS.times5),
  },
  {
    id: 'white_mastery',
    category: 'meta',
    kind: 'grind',
    ease: 50,
    icon: 'palette',
    title: { 'zh-Hant': '白之精通', 'zh-Hans': '白之精通', en: 'White Mastery', ja: '白の精通' },
    description: { 'zh-Hant': '以白色為主色勝場。', 'zh-Hans': '以白色为主色胜场。', en: 'Wins with White primary.', ja: '白メインの勝利。' },
    tiers: tierDefs.wins(),
  },
  {
    id: 'blue_mastery',
    category: 'meta',
    kind: 'grind',
    ease: 50,
    icon: 'palette',
    title: { 'zh-Hant': '藍之精通', 'zh-Hans': '蓝之精通', en: 'Blue Mastery', ja: '青の精通' },
    description: { 'zh-Hant': '以藍色為主色勝場。', 'zh-Hans': '以蓝色为主色胜场。', en: 'Wins with Blue primary.', ja: '青メインの勝利。' },
    tiers: tierDefs.wins(),
  },
  {
    id: 'red_mastery',
    category: 'meta',
    kind: 'grind',
    ease: 50,
    icon: 'palette',
    title: { 'zh-Hant': '紅色快攻', 'zh-Hans': '红色快攻', en: 'Red Rush', ja: '赤の快攻' },
    description: { 'zh-Hant': '以紅色為主色勝場。', 'zh-Hans': '以红色为主色胜场。', en: 'Wins with Red primary.', ja: '赤メインの勝利。' },
    tiers: tierDefs.wins(),
  },
  {
    id: 'green_mastery',
    category: 'meta',
    kind: 'grind',
    ease: 50,
    icon: 'palette',
    title: { 'zh-Hant': '綠色中速', 'zh-Hans': '绿色中速', en: 'Green Midrange', ja: '緑の中速' },
    description: { 'zh-Hant': '以綠色為主色勝場。', 'zh-Hans': '以绿色为主色胜场。', en: 'Wins with Green primary.', ja: '緑メインの勝利。' },
    tiers: tierDefs.wins(),
  },
  {
    id: 'purple_mastery',
    category: 'meta',
    kind: 'grind',
    ease: 55,
    icon: 'palette',
    title: { 'zh-Hant': '紫色試手', 'zh-Hans': '紫色试手', en: 'Purple Pilot', ja: '紫の試手' },
    description: { 'zh-Hant': '以紫色為主色勝場。', 'zh-Hans': '以紫色为主色胜场。', en: 'Wins with Purple primary.', ja: '紫メインの勝利。' },
    tiers: tierDefs.wins(),
  },
  {
    id: 'weekly_grinder',
    category: 'milestone',
    kind: 'grind',
    ease: 40,
    icon: 'bolt',
    title: { 'zh-Hant': '本週十戰', 'zh-Hans': '本周十战', en: 'Weekly Grinder', ja: '週間グラインダー' },
    description: {
      'zh-Hant': '七日內最多對局數。',
      'zh-Hans': '七日内最多对局数。',
      en: 'Most games in any rolling 7-day window.',
      ja: '7日間の最多試合数。',
    },
    tiers: tierDefs.weekly(),
  },
  {
    id: 'store_regular',
    category: 'social',
    kind: 'grind',
    ease: 65,
    icon: 'anchor',
    title: { 'zh-Hant': '店家常客', 'zh-Hans': '店家常客', en: 'Store Regular', ja: '店の常連' },
    description: {
      'zh-Hant': '不同日期有對局紀錄的天數。',
      'zh-Hans': '不同日期有对局记录的天数。',
      en: 'Distinct calendar days with matches.',
      ja: '対戦した日数。',
    },
    tiers: tierDefs.days(),
  },
  {
    id: 'opening_act',
    category: 'skill',
    kind: 'special',
    ease: 55,
    icon: 'star',
    title: { 'zh-Hant': '開場必勝', 'zh-Hans': '开场必胜', en: 'Opening Act', ja: '開幕必勝' },
    description: {
      'zh-Hant': '場次首戰獲勝次數。',
      'zh-Hans': '场次首战获胜次数。',
      en: 'Session openers won.',
      ja: 'セッション初戦勝利。',
    },
    tiers: tierDefs.times(TIERS.times5),
  },
  {
    id: 'closer',
    category: 'skill',
    kind: 'special',
    ease: 55,
    icon: 'trophy',
    title: { 'zh-Hant': '收尾者', 'zh-Hans': '收尾者', en: 'Closer', ja: 'クローザー' },
    description: {
      'zh-Hant': '場次最後一戰獲勝次數。',
      'zh-Hans': '场次最后一战获胜次数。',
      en: 'Session finales won.',
      ja: 'セッション最終戦勝利。',
    },
    tiers: tierDefs.times(TIERS.times5),
  },
  {
    id: 'profile_linked',
    category: 'milestone',
    kind: 'special',
    ease: 90,
    icon: 'star',
    title: { 'zh-Hant': '真身現形', 'zh-Hans': '真身现形', en: 'Profile Linked', ja: 'プロフィール連携' },
    description: {
      'zh-Hant': '已連結個人檔案。',
      'zh-Hans': '已连结个人档案。',
      en: 'Linked your player profile.',
      ja: 'プロフィールを連携。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '已連結', 'zh-Hans': '已连结', en: 'Linked', ja: '連携済' } }],
  },
  {
    id: 'marathon_mind',
    category: 'skill',
    kind: 'special',
    ease: 30,
    icon: 'moon',
    title: { 'zh-Hant': '長局意志', 'zh-Hans': '长局意志', en: 'Marathon Mind', ja: '長局の意志' },
    description: {
      'zh-Hant': '單局超過 30 分鐘的勝利。',
      'zh-Hans': '单局超过 30 分钟的胜利。',
      en: 'Wins in matches over 30 minutes.',
      ja: '30分以上の勝利。',
    },
    tiers: tierDefs.wins(TIERS.times5),
  },
  {
    id: 'speed_demon',
    category: 'skill',
    kind: 'special',
    ease: 35,
    icon: 'bolt',
    title: { 'zh-Hant': '快攻結束', 'zh-Hans': '快攻结束', en: 'Speed Demon', ja: 'スピードデーモン' },
    description: {
      'zh-Hant': '15 分鐘內結束的勝利。',
      'zh-Hans': '15 分钟内结束的胜利。',
      en: 'Wins finished within 15 minutes.',
      ja: '15分以内の勝利。',
    },
    tiers: tierDefs.wins(TIERS.times5),
  },
  {
    id: 'conflict_survivor',
    category: 'milestone',
    kind: 'special',
    ease: 70,
    icon: 'shield',
    title: { 'zh-Hant': '衝突倖存者', 'zh-Hans': '冲突幸存者', en: 'Conflict Survivor', ja: '競合サバイバー' },
    description: {
      'zh-Hant': '解決群組同步衝突的次數。',
      'zh-Hans': '解决群组同步冲突的次数。',
      en: 'Group sync conflicts resolved.',
      ja: 'グループ同期の競合を解決した回数。',
    },
    tiers: tierDefs.wins([1, 3, 5, 10, 25]),
  },
  {
    id: 'multi_group_tourist',
    category: 'social',
    kind: 'grind',
    ease: 65,
    icon: 'compass',
    title: { 'zh-Hant': '多群遊客', 'zh-Hans': '多群游客', en: 'Multi-Group Tourist', ja: 'マルチグループ旅行者' },
    description: {
      'zh-Hant': '加入過的不同群組數量。',
      'zh-Hans': '加入过的不同群组数量。',
      en: 'Distinct groups joined.',
      ja: '参加した異なるグループ数。',
    },
    tiers: tierDefs.people([1, 2, 3, 5, 8]),
  },
]

function playerMatches(playerId: string, matches: Match[]): Match[] {
  return getCompletedMatches(matches).filter(
    (match) => match.player1Id === playerId || match.player2Id === playerId,
  )
}

function sortByFinished(matches: Match[]): Match[] {
  return [...matches].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  )
}

function getDeckForPlayer(match: Match, playerId: string, decks: Deck[]): Deck | undefined {
  const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
  return decks.find((d) => d.id === deckId)
}

function maxInRollingWeek(matches: Match[]): number {
  if (!matches.length) return 0
  const windowMs = 7 * 24 * 60 * 60 * 1000
  const times = matches.map((m) => new Date(m.finishedAt).getTime()).sort((a, b) => a - b)
  let best = 0
  let left = 0
  for (let right = 0; right < times.length; right += 1) {
    while (left <= right && times[right] - times[left] > windowMs) left += 1
    best = Math.max(best, right - left + 1)
  }
  return best
}

function colorWins(playerId: string, decks: Deck[], matches: Match[], color: string): number {
  let count = 0
  for (const match of playerMatches(playerId, matches)) {
    if (match.winnerPlayerId !== playerId) continue
    const deck = getDeckForPlayer(match, playerId, decks)
    if (deck?.colors[0]?.toLowerCase() === color) count += 1
  }
  return count
}

function matchDurationMs(match: Match): number {
  const start = new Date(match.startedAt).getTime()
  const end = new Date(match.finishedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, end - start)
}

export function evaluateBacklogBatchMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
  linkedPlayerId: string | null,
): Record<string, number> {
  const relevant = playerMatches(playerId, matches)
  const wins = relevant.filter((m) => m.winnerPlayerId === playerId).length
  const total = relevant.length
  const winRatePct = total >= 30 ? Math.round((wins / total) * 100) : 0

  const leaders = new Set<string>()
  const playDays = new Set<string>()
  const opponentSessions = new Map<string, Set<string>>()
  const rematchCounts = new Map<string, number>()
  let midnightWins = 0
  let lunchWins = 0
  let openingWins = 0
  let closerWins = 0
  let marathonWins = 0
  let speedWins = 0
  let maxSessionOpponents = 0

  const bySession = new Map<string, Match[]>()
  for (const match of relevant) {
    const list = bySession.get(match.sessionId) ?? []
    list.push(match)
    bySession.set(match.sessionId, list)
  }

  for (const [sessionId, sessionMatches] of bySession) {
    const sorted = sortByFinished(sessionMatches)
    const opponents = new Set<string>()
    for (const match of sessionMatches) {
      const opp = match.player1Id === playerId ? match.player2Id : match.player1Id
      opponents.add(opp)
      const key = `${opp}:${sessionId}`
      rematchCounts.set(opp, (rematchCounts.get(opp) ?? 0) + 1)
      void key
    }
    maxSessionOpponents = Math.max(maxSessionOpponents, opponents.size)

    const first = sorted[0]
    const last = sorted.at(-1)
    if (first?.winnerPlayerId === playerId) openingWins += 1
    if (last?.winnerPlayerId === playerId) closerWins += 1
  }

  for (const match of relevant) {
    const deck = getDeckForPlayer(match, playerId, decks)
    if (deck) leaders.add(deck.leaderName)
    playDays.add(match.finishedAt.slice(0, 10))

    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const sessions = opponentSessions.get(opponentId) ?? new Set<string>()
    sessions.add(match.sessionId)
    opponentSessions.set(opponentId, sessions)

    if (match.winnerPlayerId === playerId) {
      const hour = new Date(match.finishedAt).getHours()
      if (hour >= 0 && hour < 4) midnightWins += 1
      if (hour >= 11 && hour < 14) lunchWins += 1
      const duration = matchDurationMs(match)
      if (duration >= 30 * 60 * 1000) marathonWins += 1
      if (duration > 0 && duration <= 15 * 60 * 1000) speedWins += 1
    }
  }

  let maxRematchSessions = 0
  for (const sessions of opponentSessions.values()) {
    maxRematchSessions = Math.max(maxRematchSessions, sessions.size)
  }

  const player = players.find((p) => p.id === playerId)
  const profileLinked =
    linkedPlayerId === playerId || Boolean(player?.profileClaimedAt || player?.profileClaimDeviceId)
      ? 1
      : 0

  return {
    centurion_wins: wins,
    iron_win_rate: winRatePct,
    rematch_king: maxRematchSessions,
    leader_collector: leaders.size,
    round_robin: maxSessionOpponents,
    midnight_duel: midnightWins,
    lunch_break: lunchWins,
    white_mastery: colorWins(playerId, decks, matches, 'white'),
    blue_mastery: colorWins(playerId, decks, matches, 'blue'),
    red_mastery: colorWins(playerId, decks, matches, 'red'),
    green_mastery: colorWins(playerId, decks, matches, 'green'),
    purple_mastery: colorWins(playerId, decks, matches, 'purple'),
    weekly_grinder: maxInRollingWeek(relevant),
    store_regular: playDays.size,
    opening_act: openingWins,
    closer: closerWins,
    profile_linked: profileLinked,
    marathon_mind: marathonWins,
    speed_demon: speedWins,
  }
}
