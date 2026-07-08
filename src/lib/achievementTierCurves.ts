import type { Language } from '@/types'

/** Tier ladders — multiples of 5; medium lv5 = 100, large lv5 = 1000. */
export const TIERS = {
  one: [1],
  three: [10, 30, 60],
  streak: [5, 10, 15],
  streak5: [5, 10, 15, 20, 30],
  fine: [5, 10, 15, 30, 50],
  medium: [10, 20, 30, 50, 100],
  large: [50, 100, 200, 500, 1000],
  veteran: [10, 50, 100, 500, 1000],
  wins: [10, 20, 30, 50, 100],
  winsLarge: [50, 100, 200, 500, 1000],
  meta: [5, 10, 10, 20, 30],
  sets: [5, 10, 10, 15, 20],
  opponents: [5, 10, 15, 20, 30],
  session: [10, 20, 30, 40, 50],
  notes: [5, 10, 20, 50, 100],
  days: [5, 10, 20, 50, 100],
  weekly: [5, 10, 20, 30, 50],
  times: [5, 10, 15],
  timesFirst: [1, 5, 10],
  times5: [5, 10, 10, 20, 30],
  percent3: [25, 50, 75],
  winRate: [50, 55, 60, 65, 70],
  importSync: [1, 5, 10, 20, 50],
  hunter: [10, 30, 60],
  colors3: [5, 10, 15],
  lucky777: [777],
} as const

export type TierCurve = readonly number[]

export function pickTierCurve(id: string, category: string): TierCurve {
  if (
    id.startsWith('secret_') ||
    id === 'onboarding_graduate' ||
    id === 'profile_complete' ||
    id === 'profile_linked' ||
    id === 'first_win' ||
    id === 'first_player_king' ||
    id === 'second_player_king' ||
    id === 'leap_day' ||
    id === 'new_year_first' ||
    id === 'exactly_fifty'
  ) {
    return TIERS.one
  }
  if (id === 'match_777') return TIERS.lucky777
  if (id === 'weighted_progress_50') return [50]
  if (id === 'weighted_progress_100') return [100]
  if (id === 'hunter_75' || id === 'completionist_90') return TIERS.hunter
  if (id === 'iron_win_rate') return TIERS.winRate
  if (id === 'achievement_hunter') return TIERS.percent3
  if (id === 'veteran') return TIERS.veteran
  if (id === 'centurion_wins') return TIERS.winsLarge
  if (id === 'win_streak' || id === 'streak_legend') return TIERS.streak
  if (id === 'color_spectrum') return [4, 5, 6]

  if (
    id.includes('mastery') ||
    id === 'deck_specialist' ||
    id === 'mono_maniac' ||
    id === 'daily_winner' ||
    id === 'second_striker' ||
    id === 'weekend_warrior' ||
    id === 'st_deck_winner' ||
    id === 'tricolor_win'
  ) {
    return TIERS.wins
  }

  if (id.includes('day') || id.includes('regular') || id.includes('sign')) return TIERS.days
  if (id === 'session_marathon' || id === 'session_heater') return TIERS.session
  if (id.includes('session') && (id.includes('starter') || id.includes('archive') || id.includes('end'))) {
    return TIERS.medium
  }
  if (id.includes('session') && (id.includes('opener') || id.includes('closer'))) return TIERS.streak5
  if (id.includes('note') || id.includes('gg_')) return TIERS.notes
  if (id.includes('edit') || id.includes('history')) return TIERS.medium
  if (id.includes('rival') || id.includes('nemesis') || id.includes('friend') || id.includes('opponent')) {
    return TIERS.opponents
  }
  if (id === 'set_collector') return TIERS.sets
  if (
    id.includes('deck') ||
    id.includes('leader') ||
    id.includes('set') ||
    id.includes('meta') ||
    id.includes('pie') ||
    id.includes('color_clash') ||
    id === 'meta_explorer'
  ) {
    return TIERS.meta
  }
  if (id.includes('table') || id.includes('slot')) return TIERS.medium
  if (id.includes('import') || id.includes('sync') || id.includes('cloud')) return TIERS.importSync
  if (id.includes('weekly') || id.includes('cap')) return TIERS.weekly
  if (id.includes('monthly') || id.includes('season_lore')) return TIERS.medium
  if (id.includes('streak')) return TIERS.streak5
  if (id.includes('win') && !id.includes('rate') && !id.includes('learn')) return TIERS.wins
  if (id === 'loss_survivor' || id.includes('learn')) return TIERS.large
  if (id.includes('loss')) return TIERS.medium

  if (
    id === 'comeback' ||
    id === 'revenge_win' ||
    id === 'upset_alarm' ||
    id === 'meta_breaker' ||
    id === 'mirror_master' ||
    id === 'giant_slayer' ||
    id === 'underdog' ||
    id === 'break_opp_streak'
  ) {
    return TIERS.timesFirst
  }
  if (id === 'perfect_session' || id === 'rainbow_session') return TIERS.timesFirst

  if (
    id === 'opening_act' ||
    id === 'closer' ||
    id === 'marathon_mind' ||
    id === 'speed_demon' ||
    id === 'midnight_duel' ||
    id === 'lunch_break' ||
    id === 'rematch_king'
  ) {
    return TIERS.times5
  }

  if (id === 'rival_bond' || id === 'note_poet') return TIERS.medium
  if (id === 'group_star') return TIERS.opponents

  switch (category) {
    case 'milestone':
      return TIERS.medium
    case 'streak':
      return TIERS.streak5
    case 'skill':
      return TIERS.medium
    case 'meta':
      return TIERS.meta
    case 'social':
      return TIERS.opponents
    case 'fun':
      return TIERS.fine
    default:
      return TIERS.medium
  }
}

export function makeLabeledTiers(
  thresholds: readonly number[],
  labelFn: (n: number) => Record<Language, string>,
): Array<{ level: number; threshold: number; label: Record<Language, string> }> {
  return thresholds.map((threshold, index) => ({
    level: index + 1,
    threshold,
    label: labelFn(threshold),
  }))
}

export function numLabel(n: number, suffix: string): Record<Language, string> {
  const label = `${n}${suffix}`
  return { 'zh-Hant': label, 'zh-Hans': label, en: label, ja: label }
}

type UnitLabels = { zh: string; en: string; ja: string }

function unitTiers(thresholds: readonly number[], unit: UnitLabels) {
  return makeLabeledTiers(thresholds, (n) => ({
    'zh-Hant': `${n} ${unit.zh}`,
    'zh-Hans': `${n} ${unit.zh}`,
    en: `${n} ${unit.en}`,
    ja: `${n}${unit.ja}`,
  }))
}

export const tierDefs = {
  wins: (curve: TierCurve = TIERS.wins) => unitTiers(curve, { zh: '勝', en: 'wins', ja: '勝' }),
  winsLarge: () => unitTiers(TIERS.winsLarge, { zh: '勝', en: 'wins', ja: '勝' }),
  games: (curve: TierCurve = TIERS.medium) => unitTiers(curve, { zh: '場', en: 'games', ja: '戦' }),
  veteran: () =>
    makeLabeledTiers(TIERS.veteran, (n) => ({
      'zh-Hant': `${n} 場`,
      'zh-Hans': `${n} 场`,
      en: `${n} games`,
      ja: `${n}戦`,
    })),
  times: (curve: TierCurve = TIERS.timesFirst) => unitTiers(curve, { zh: '次', en: 'times', ja: '回' }),
  days: (curve: TierCurve = TIERS.days) => unitTiers(curve, { zh: '天', en: 'days', ja: '日' }),
  people: (curve: TierCurve = TIERS.opponents) => unitTiers(curve, { zh: '人', en: 'rivals', ja: '人' }),
  decks: (curve: TierCurve = TIERS.meta) => unitTiers(curve, { zh: '副', en: 'decks', ja: '種' }),
  leaders: (curve: TierCurve = TIERS.medium) => unitTiers(curve, { zh: '主將', en: 'leaders', ja: '体' }),
  sets: (curve: TierCurve = TIERS.sets) => unitTiers(curve, { zh: '系列', en: 'sets', ja: 'セット' }),
  streak: (curve: TierCurve = TIERS.streak) =>
    makeLabeledTiers(curve, (n) => ({
      'zh-Hant': `${n} 連勝`,
      'zh-Hans': `${n} 连胜`,
      en: `${n} streak`,
      ja: `${n}連勝`,
    })),
  session: (curve: TierCurve = TIERS.session) => unitTiers(curve, { zh: '場', en: 'games', ja: '戦' }),
  notes: (curve: TierCurve = TIERS.notes) => unitTiers(curve, { zh: '場', en: 'matches', ja: '戦' }),
  weekly: (curve: TierCurve = TIERS.weekly) =>
    makeLabeledTiers(curve, (n) => ({
      'zh-Hant': `${n} 場/週`,
      'zh-Hans': `${n} 场/周`,
      en: `${n}/week`,
      ja: `${n}/週`,
    })),
  rematch: (curve: TierCurve = TIERS.times5) => unitTiers(curve, { zh: '再戰', en: 'rematches', ja: '再戦' }),
  winRate: () =>
    makeLabeledTiers(TIERS.winRate, (n) => ({
      'zh-Hant': `${n}%`,
      'zh-Hans': `${n}%`,
      en: `${n}%`,
      ja: `${n}%`,
    })),
  percent: (curve: TierCurve = TIERS.percent3) =>
    makeLabeledTiers(curve, (n) => ({
      'zh-Hant': `${n}%`,
      'zh-Hans': `${n}%`,
      en: `${n}%`,
      ja: `${n}%`,
    })),
  colors: () =>
    makeLabeledTiers([4, 5, 6], (n) => ({
      'zh-Hant': `${n} 色`,
      'zh-Hans': `${n} 色`,
      en: `${n} colors`,
      ja: `${n}色`,
    })),
  losses: (curve: TierCurve = TIERS.medium) => unitTiers(curve, { zh: '敗', en: 'losses', ja: '敗' }),
  importGames: (curve: TierCurve = TIERS.importSync) => unitTiers(curve, { zh: '場', en: 'matches', ja: '戦' }),
}
