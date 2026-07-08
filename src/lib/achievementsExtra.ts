import { getCompletedMatches } from '@/lib/stats'
import type { Deck, Match, Player } from '@/types'

type ExtraDefinition = {
  id: string
  category: 'milestone' | 'streak' | 'meta' | 'social' | 'fun' | 'skill'
  kind: 'grind' | 'skill' | 'special'
  ease: number
  icon: string
  title: Record<string, string>
  description: Record<string, string>
  tiers: Array<{ level: number; threshold: number; label: Record<string, string> }>
}

/** Additional achievement families to reach the full discussed set (~50 total). */
export const EXTRA_ACHIEVEMENT_DEFINITIONS: ExtraDefinition[] = [
  {
    id: 'second_player_king',
    category: 'skill',
    kind: 'special',
    ease: 20,
    icon: 'sparkles',
    title: { 'zh-Hant': '後攻之王', 'zh-Hans': '后攻之王', en: 'Second Turn King', ja: '後攻の王' },
    description: {
      'zh-Hant': '後攻勝率 ≥55%（20 場以上）。',
      'zh-Hans': '后攻胜率 ≥55%（20 场以上）。',
      en: 'Second-turn win rate ≥55% (20+ games).',
      ja: '後攻勝率55%以上（20戦以上）。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'loyalist',
    category: 'meta',
    kind: 'grind',
    ease: 70,
    icon: 'anchor',
    title: { 'zh-Hant': '死忠牌組', 'zh-Hans': '死忠牌组', en: 'Loyalist', ja: '忠誠デッキ' },
    description: {
      'zh-Hant': '同一牌組累計出戰場次。',
      'zh-Hans': '同一牌组累计出战场次。',
      en: 'Matches played with one deck.',
      ja: '同一デッキの累計出場。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 場', 'zh-Hans': '5 场', en: '5 games', ja: '5戦' } },
      { level: 2, threshold: 15, label: { 'zh-Hant': '15 場', 'zh-Hans': '15 场', en: '15 games', ja: '15戦' } },
      { level: 3, threshold: 30, label: { 'zh-Hant': '30 場', 'zh-Hans': '30 场', en: '30 games', ja: '30戦' } },
      { level: 4, threshold: 50, label: { 'zh-Hant': '50 場', 'zh-Hans': '50 场', en: '50 games', ja: '50戦' } },
      { level: 5, threshold: 70, label: { 'zh-Hant': '70 場', 'zh-Hans': '70 场', en: '70 games', ja: '70戦' } },
    ],
  },
  {
    id: 'dual_tone',
    category: 'meta',
    kind: 'grind',
    ease: 55,
    icon: 'palette',
    title: { 'zh-Hant': '雙色好手', 'zh-Hans': '双色好手', en: 'Dual Tone', ja: '二色の達人' },
    description: {
      'zh-Hant': '雙色牌組累計勝場。',
      'zh-Hans': '双色牌组累计胜场。',
      en: 'Wins with dual-color decks.',
      ja: '二色デッキの累計勝利。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 勝', 'zh-Hans': '3 胜', en: '3 wins', ja: '3勝' } },
      { level: 2, threshold: 8, label: { 'zh-Hant': '8 勝', 'zh-Hans': '8 胜', en: '8 wins', ja: '8勝' } },
      { level: 3, threshold: 15, label: { 'zh-Hant': '15 勝', 'zh-Hans': '15 胜', en: '15 wins', ja: '15勝' } },
      { level: 4, threshold: 25, label: { 'zh-Hant': '25 勝', 'zh-Hans': '25 胜', en: '25 wins', ja: '25勝' } },
      { level: 5, threshold: 40, label: { 'zh-Hant': '40 勝', 'zh-Hans': '40 胜', en: '40 wins', ja: '40勝' } },
    ],
  },
  {
    id: 'color_devotee',
    category: 'meta',
    kind: 'grind',
    ease: 58,
    icon: 'palette',
    title: { 'zh-Hant': '色之信徒', 'zh-Hans': '色之信徒', en: 'Color Devotee', ja: '色の信奉者' },
    description: {
      'zh-Hant': '同一主色累計勝場。',
      'zh-Hans': '同一主色累计胜场。',
      en: 'Wins with one primary color.',
      ja: '同一主色の累計勝利。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 2, threshold: 12, label: { 'zh-Hant': '12 勝', 'zh-Hans': '12 胜', en: '12 wins', ja: '12勝' } },
      { level: 3, threshold: 20, label: { 'zh-Hant': '20 勝', 'zh-Hans': '20 胜', en: '20 wins', ja: '20勝' } },
      { level: 4, threshold: 30, label: { 'zh-Hant': '30 勝', 'zh-Hans': '30 胜', en: '30 wins', ja: '30勝' } },
      { level: 5, threshold: 45, label: { 'zh-Hant': '45 勝', 'zh-Hans': '45 胜', en: '45 wins', ja: '45勝' } },
    ],
  },
  {
    id: 'deck_rotator',
    category: 'meta',
    kind: 'grind',
    ease: 54,
    icon: 'compass',
    title: { 'zh-Hant': '換牌高手', 'zh-Hans': '换牌高手', en: 'Deck Rotator', ja: 'ローテの達人' },
    description: {
      'zh-Hant': '單場次使用不同牌組數。',
      'zh-Hans': '单场次使用不同牌组数。',
      en: 'Different decks used in one session.',
      ja: '1セッションの異なるデッキ数。',
    },
    tiers: [
      { level: 1, threshold: 2, label: { 'zh-Hant': '2 副', 'zh-Hans': '2 副', en: '2 decks', ja: '2種' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 副', 'zh-Hans': '3 副', en: '3 decks', ja: '3種' } },
      { level: 3, threshold: 4, label: { 'zh-Hant': '4 副', 'zh-Hans': '4 副', en: '4 decks', ja: '4種' } },
      { level: 4, threshold: 5, label: { 'zh-Hant': '5 副', 'zh-Hans': '5 副', en: '5 decks', ja: '5種' } },
      { level: 5, threshold: 6, label: { 'zh-Hant': '6 副', 'zh-Hans': '6 副', en: '6 decks', ja: '6種' } },
    ],
  },
  {
    id: 'ice_breaker',
    category: 'social',
    kind: 'grind',
    ease: 74,
    icon: 'star',
    title: { 'zh-Hant': '破冰者', 'zh-Hans': '破冰者', en: 'Ice Breaker', ja: 'アイスブレイカー' },
    description: {
      'zh-Hant': '擊敗過的不同對手數。',
      'zh-Hans': '击败过的不同对手数。',
      en: 'Unique opponents defeated.',
      ja: '倒した異なる相手の数。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 人', 'zh-Hans': '3 人', en: '3 rivals', ja: '3人' } },
      { level: 2, threshold: 5, label: { 'zh-Hant': '5 人', 'zh-Hans': '5 人', en: '5 rivals', ja: '5人' } },
      { level: 3, threshold: 8, label: { 'zh-Hant': '8 人', 'zh-Hans': '8 人', en: '8 rivals', ja: '8人' } },
      { level: 4, threshold: 12, label: { 'zh-Hant': '12 人', 'zh-Hans': '12 人', en: '12 rivals', ja: '12人' } },
      { level: 5, threshold: 18, label: { 'zh-Hant': '18 人', 'zh-Hans': '18 人', en: '18 rivals', ja: '18人' } },
    ],
  },
  {
    id: 'circle_session',
    category: 'social',
    kind: 'grind',
    ease: 64,
    icon: 'anchor',
    title: { 'zh-Hant': '社交場次', 'zh-Hans': '社交场次', en: 'Social Session', ja: '社交セッション' },
    description: {
      'zh-Hant': '單場次對戰不同對手數。',
      'zh-Hans': '单场次对战不同对手数。',
      en: 'Unique opponents in one session.',
      ja: '1セッションの異なる相手数。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 人', 'zh-Hans': '3 人', en: '3 rivals', ja: '3人' } },
      { level: 2, threshold: 4, label: { 'zh-Hant': '4 人', 'zh-Hans': '4 人', en: '4 rivals', ja: '4人' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 人', 'zh-Hans': '5 人', en: '5 rivals', ja: '5人' } },
      { level: 4, threshold: 6, label: { 'zh-Hant': '6 人', 'zh-Hans': '6 人', en: '6 rivals', ja: '6人' } },
      { level: 5, threshold: 8, label: { 'zh-Hant': '8 人', 'zh-Hans': '8 人', en: '8 rivals', ja: '8人' } },
    ],
  },
  {
    id: 'nemesis_bond',
    category: 'social',
    kind: 'grind',
    ease: 46,
    icon: 'swords',
    title: { 'zh-Hant': '剋星羈絆', 'zh-Hans': '克星羁绊', en: 'Nemesis Bond', ja: '天敵' },
    description: {
      'zh-Hant': '對同一對手累計敗場。',
      'zh-Hans': '对同一对手累计败场。',
      en: 'Losses to your toughest opponent.',
      ja: '同じ相手への累計敗北。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 敗', 'zh-Hans': '3 败', en: '3 losses', ja: '3敗' } },
      { level: 2, threshold: 6, label: { 'zh-Hant': '6 敗', 'zh-Hans': '6 败', en: '6 losses', ja: '6敗' } },
      { level: 3, threshold: 10, label: { 'zh-Hant': '10 敗', 'zh-Hans': '10 败', en: '10 losses', ja: '10敗' } },
      { level: 4, threshold: 15, label: { 'zh-Hant': '15 敗', 'zh-Hans': '15 败', en: '15 losses', ja: '15敗' } },
      { level: 5, threshold: 20, label: { 'zh-Hant': '20 敗', 'zh-Hans': '20 败', en: '20 losses', ja: '20敗' } },
    ],
  },
  {
    id: 'balanced_rival',
    category: 'social',
    kind: 'special',
    ease: 18,
    icon: 'swords',
    title: { 'zh-Hant': '勢均力敵', 'zh-Hans': '势均力敌', en: 'Even Rival', ja: '互角のライバル' },
    description: {
      'zh-Hant': '與對手 10 場以上且勝率 45–55%。',
      'zh-Hans': '与对手 10 场以上且胜率 45–55%。',
      en: '10+ games vs an opponent within 45–55% win rate.',
      ja: '10戦以上で勝率45〜55%の相手。',
    },
    tiers: [{ level: 1, threshold: 1, label: { 'zh-Hant': '達成', 'zh-Hans': '达成', en: 'Done', ja: '達成' } }],
  },
  {
    id: 'night_owl',
    category: 'fun',
    kind: 'skill',
    ease: 38,
    icon: 'moon',
    title: { 'zh-Hant': '夜貓子', 'zh-Hans': '夜猫子', en: 'Night Owl', ja: '夜ふかし' },
    description: {
      'zh-Hant': '22:00 後的勝場。',
      'zh-Hans': '22:00 后的胜场。',
      en: 'Wins after 10 PM.',
      ja: '22時以降の勝利。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 勝', 'zh-Hans': '1 胜', en: '1 win', ja: '1勝' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 勝', 'zh-Hans': '3 胜', en: '3 wins', ja: '3勝' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
    ],
  },
  {
    id: 'early_bird',
    category: 'fun',
    kind: 'skill',
    ease: 36,
    icon: 'bolt',
    title: { 'zh-Hant': '早起鳥', 'zh-Hans': '早起鸟', en: 'Early Bird', ja: '早起き' },
    description: {
      'zh-Hant': '10:00 前的勝場。',
      'zh-Hans': '10:00 前的胜场。',
      en: 'Wins before 10 AM.',
      ja: '10時前の勝利。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 勝', 'zh-Hans': '1 胜', en: '1 win', ja: '1勝' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 勝', 'zh-Hans': '3 胜', en: '3 wins', ja: '3勝' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
    ],
  },
  {
    id: 'hot_day',
    category: 'fun',
    kind: 'skill',
    ease: 42,
    icon: 'flame',
    title: { 'zh-Hant': '火熱單日', 'zh-Hans': '火热单日', en: 'Hot Day', ja: '灼熱の一日' },
    description: {
      'zh-Hant': '單日最高勝場。',
      'zh-Hans': '单日最高胜场。',
      en: 'Most wins in one calendar day.',
      ja: '1日の最多勝利。',
    },
    tiers: [
      { level: 1, threshold: 3, label: { 'zh-Hant': '3 勝', 'zh-Hans': '3 胜', en: '3 wins', ja: '3勝' } },
      { level: 2, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 3, threshold: 8, label: { 'zh-Hant': '8 勝', 'zh-Hans': '8 胜', en: '8 wins', ja: '8勝' } },
    ],
  },
  {
    id: 'hot_hand',
    category: 'streak',
    kind: 'skill',
    ease: 48,
    icon: 'flame',
    title: { 'zh-Hant': '手感火燙', 'zh-Hans': '手感火烫', en: 'Hot Hand', ja: '好調' },
    description: {
      'zh-Hant': '單場次最高勝場。',
      'zh-Hans': '单场次最高胜场。',
      en: 'Most wins in one session.',
      ja: '1セッションの最多勝利。',
    },
    tiers: [
      { level: 1, threshold: 4, label: { 'zh-Hant': '4 勝', 'zh-Hans': '4 胜', en: '4 wins', ja: '4勝' } },
      { level: 2, threshold: 6, label: { 'zh-Hant': '6 勝', 'zh-Hans': '6 胜', en: '6 wins', ja: '6勝' } },
      { level: 3, threshold: 8, label: { 'zh-Hant': '8 勝', 'zh-Hans': '8 胜', en: '8 wins', ja: '8勝' } },
    ],
  },
  {
    id: 'clutch_finisher',
    category: 'skill',
    kind: 'skill',
    ease: 44,
    icon: 'crown',
    title: { 'zh-Hant': '收官勝', 'zh-Hans': '收官胜', en: 'Clutch Finisher', ja: '締めの勝利' },
    description: {
      'zh-Hant': '場次末戰勝利（場次 ≥5 場）次數。',
      'zh-Hans': '场次末战胜利（场次 ≥5 场）次数。',
      en: 'Winning the last match of a 5+ game session.',
      ja: '5戦以上セッションの最終戦勝利回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 次', 'zh-Hans': '3 次', en: '3 times', ja: '3回' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 次', 'zh-Hans': '5 次', en: '5 times', ja: '5回' } },
    ],
  },
  {
    id: 'weekday_grind',
    category: 'fun',
    kind: 'grind',
    ease: 60,
    icon: 'medal',
    title: { 'zh-Hant': '平日戰士', 'zh-Hans': '平日战士', en: 'Weekday Grinder', ja: '平日の戦士' },
    description: {
      'zh-Hant': '週一至週五累計勝場。',
      'zh-Hans': '周一至周五累计胜场。',
      en: 'Wins Monday through Friday.',
      ja: '平日の累計勝利。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 2, threshold: 12, label: { 'zh-Hant': '12 勝', 'zh-Hans': '12 胜', en: '12 wins', ja: '12勝' } },
      { level: 3, threshold: 20, label: { 'zh-Hant': '20 勝', 'zh-Hans': '20 胜', en: '20 wins', ja: '20勝' } },
      { level: 4, threshold: 30, label: { 'zh-Hant': '30 勝', 'zh-Hans': '30 胜', en: '30 wins', ja: '30勝' } },
      { level: 5, threshold: 45, label: { 'zh-Hant': '45 勝', 'zh-Hans': '45 胜', en: '45 wins', ja: '45勝' } },
    ],
  },
  {
    id: 'streak_saver',
    category: 'streak',
    kind: 'skill',
    ease: 40,
    icon: 'refresh',
    title: { 'zh-Hant': '止敗者', 'zh-Hans': '止败者', en: 'Streak Saver', ja: '連敗ストップ' },
    description: {
      'zh-Hant': '終結自己 3 連敗以上的次數。',
      'zh-Hans': '终结自己 3 连败以上的次数。',
      en: 'Times you ended your own 3+ loss streak.',
      ja: '自分の3連敗以上を止めた回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 次', 'zh-Hans': '3 次', en: '3 times', ja: '3回' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 次', 'zh-Hans': '5 次', en: '5 times', ja: '5回' } },
    ],
  },
  {
    id: 'clean_sweep',
    category: 'skill',
    kind: 'skill',
    ease: 34,
    icon: 'shield',
    title: { 'zh-Hant': '橫掃對手', 'zh-Hans': '横扫对手', en: 'Clean Sweep', ja: '完封' },
    description: {
      'zh-Hant': '場次內對同一對手全勝（≥3 場）次數。',
      'zh-Hans': '场次内对同一对手全胜（≥3 场）次数。',
      en: 'Undefeated vs one opponent in a session (3+ games).',
      ja: 'セッション内で同一相手に全勝（3戦以上）した回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 2, label: { 'zh-Hant': '2 次', 'zh-Hans': '2 次', en: 'Twice', ja: '2回' } },
      { level: 3, threshold: 4, label: { 'zh-Hant': '4 次', 'zh-Hans': '4 次', en: '4 times', ja: '4回' } },
    ],
  },
  {
    id: 'leader_loyalty',
    category: 'meta',
    kind: 'grind',
    ease: 66,
    icon: 'cards',
    title: { 'zh-Hant': 'Leader 忠誠', 'zh-Hans': 'Leader 忠诚', en: 'Leader Loyalty', ja: 'リーダー忠誠' },
    description: {
      'zh-Hant': '同一 Leader 累計出戰場次。',
      'zh-Hans': '同一 Leader 累计出战场次。',
      en: 'Matches with the same leader.',
      ja: '同一リーダーの累計出場。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 場', 'zh-Hans': '5 场', en: '5 games', ja: '5戦' } },
      { level: 2, threshold: 15, label: { 'zh-Hant': '15 場', 'zh-Hans': '15 场', en: '15 games', ja: '15戦' } },
      { level: 3, threshold: 30, label: { 'zh-Hant': '30 場', 'zh-Hans': '30 场', en: '30 games', ja: '30戦' } },
      { level: 4, threshold: 50, label: { 'zh-Hant': '50 場', 'zh-Hans': '50 场', en: '50 games', ja: '50戦' } },
      { level: 5, threshold: 70, label: { 'zh-Hant': '70 場', 'zh-Hans': '70 场', en: '70 games', ja: '70戦' } },
    ],
  },
  {
    id: 'import_archivist',
    category: 'milestone',
    kind: 'grind',
    ease: 50,
    icon: 'package',
    title: { 'zh-Hant': '匯入檔案員', 'zh-Hans': '汇入档案员', en: 'Import Archivist', ja: 'インポート記録' },
    description: {
      'zh-Hant': '匯入來源的對局數。',
      'zh-Hans': '导入来源的对局数。',
      en: 'Matches from import source.',
      ja: 'インポート由来の対戦数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 場', 'zh-Hans': '1 场', en: '1 match', ja: '1戦' } },
      { level: 2, threshold: 5, label: { 'zh-Hant': '5 場', 'zh-Hans': '5 场', en: '5 matches', ja: '5戦' } },
      { level: 3, threshold: 15, label: { 'zh-Hant': '15 場', 'zh-Hans': '15 场', en: '15 matches', ja: '15戦' } },
      { level: 4, threshold: 30, label: { 'zh-Hant': '30 場', 'zh-Hans': '30 场', en: '30 matches', ja: '30戦' } },
      { level: 5, threshold: 50, label: { 'zh-Hant': '50 場', 'zh-Hans': '50 场', en: '50 matches', ja: '50戦' } },
    ],
  },
  {
    id: 'marathon_month',
    category: 'milestone',
    kind: 'grind',
    ease: 52,
    icon: 'medal',
    title: { 'zh-Hant': '月份馬拉松', 'zh-Hans': '月份马拉松', en: 'Monthly Marathon', ja: '月間マラソン' },
    description: {
      'zh-Hant': '單月最高對局數。',
      'zh-Hans': '单月最高对局数。',
      en: 'Most matches in one calendar month.',
      ja: '1ヶ月の最多対戦数。',
    },
    tiers: [
      { level: 1, threshold: 8, label: { 'zh-Hant': '8 場', 'zh-Hans': '8 场', en: '8 games', ja: '8戦' } },
      { level: 2, threshold: 15, label: { 'zh-Hant': '15 場', 'zh-Hans': '15 场', en: '15 games', ja: '15戦' } },
      { level: 3, threshold: 25, label: { 'zh-Hant': '25 場', 'zh-Hans': '25 场', en: '25 games', ja: '25戦' } },
      { level: 4, threshold: 40, label: { 'zh-Hant': '40 場', 'zh-Hans': '40 场', en: '40 games', ja: '40戦' } },
      { level: 5, threshold: 60, label: { 'zh-Hant': '60 場', 'zh-Hans': '60 场', en: '60 games', ja: '60戦' } },
    ],
  },
  {
    id: 'nemesis_slayer',
    category: 'skill',
    kind: 'skill',
    ease: 36,
    icon: 'trophy',
    title: { 'zh-Hant': '剋星剋星', 'zh-Hans': '克星克星', en: 'Nemesis Slayer', ja: '天敵撃破' },
    description: {
      'zh-Hant': '對手 3 連勝後首次取勝的次數。',
      'zh-Hans': '对手 3 连胜后首次取胜的次数。',
      en: 'Wins after losing 3 in a row to the same opponent.',
      ja: '同一相手に3連敗後に勝った回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 次', 'zh-Hans': '3 次', en: '3 times', ja: '3回' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 次', 'zh-Hans': '5 次', en: '5 times', ja: '5回' } },
    ],
  },
  {
    id: 'table_tactician',
    category: 'fun',
    kind: 'grind',
    ease: 48,
    icon: 'compass',
    title: { 'zh-Hant': '場次漫遊', 'zh-Hans': '场次漫游', en: 'Session Hopper', ja: 'セッション巡り' },
    description: {
      'zh-Hant': '參與過的不同場次數。',
      'zh-Hans': '参与过的不同场次数。',
      en: 'Different sessions played.',
      ja: '参加した異なるセッション数。',
    },
    tiers: [
      { level: 1, threshold: 2, label: { 'zh-Hant': '2 場', 'zh-Hans': '2 场', en: '2 sessions', ja: '2回' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 場', 'zh-Hans': '3 场', en: '3 sessions', ja: '3回' } },
      { level: 3, threshold: 4, label: { 'zh-Hant': '4 場', 'zh-Hans': '4 场', en: '4 sessions', ja: '4回' } },
      { level: 4, threshold: 5, label: { 'zh-Hant': '5 場', 'zh-Hans': '5 场', en: '5 sessions', ja: '5回' } },
      { level: 5, threshold: 6, label: { 'zh-Hant': '6 場', 'zh-Hans': '6 场', en: '6 sessions', ja: '6回' } },
    ],
  },
  {
    id: 'trio_triumph',
    category: 'skill',
    kind: 'skill',
    ease: 32,
    icon: 'cards',
    title: { 'zh-Hant': '三牌各勝', 'zh-Hans': '三牌各胜', en: 'Trio Triumph', ja: '三種勝利' },
    description: {
      'zh-Hant': '單場次以 3 副不同牌組各勝至少 1 場的次數。',
      'zh-Hans': '单场次以 3 副不同牌组各胜至少 1 场的次数。',
      en: 'Sessions where 3+ decks each got a win.',
      ja: '3種以上のデッキで各1勝以上したセッション回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 3, label: { 'zh-Hant': '3 次', 'zh-Hans': '3 次', en: '3 times', ja: '3回' } },
      { level: 3, threshold: 5, label: { 'zh-Hant': '5 次', 'zh-Hans': '5 次', en: '5 times', ja: '5回' } },
    ],
  },
  {
    id: 'rivalry_sweep',
    category: 'social',
    kind: 'skill',
    ease: 38,
    icon: 'flame',
    title: { 'zh-Hant': '連勝橫掃', 'zh-Hans': '连胜横扫', en: 'Rivalry Sweep', ja: 'ライバル連勝' },
    description: {
      'zh-Hant': '對同一對手連勝 3+ 的場次數。',
      'zh-Hans': '对同一对手连胜 3+ 的场次数。',
      en: 'Sessions with 3+ win streak vs one opponent.',
      ja: '同一相手に3連勝以上したセッション回数。',
    },
    tiers: [
      { level: 1, threshold: 1, label: { 'zh-Hant': '1 次', 'zh-Hans': '1 次', en: 'Once', ja: '1回' } },
      { level: 2, threshold: 2, label: { 'zh-Hant': '2 次', 'zh-Hans': '2 次', en: 'Twice', ja: '2回' } },
      { level: 3, threshold: 4, label: { 'zh-Hant': '4 次', 'zh-Hans': '4 次', en: '4 times', ja: '4回' } },
    ],
  },
  {
    id: 'set_dominance',
    category: 'meta',
    kind: 'grind',
    ease: 56,
    icon: 'package',
    title: { 'zh-Hant': '系列制霸', 'zh-Hans': '系列制霸', en: 'Set Dominance', ja: 'セット制覇' },
    description: {
      'zh-Hant': '同一系列累計勝場。',
      'zh-Hans': '同一系列累计胜场。',
      en: 'Wins with leaders from one card set.',
      ja: '同一セットの累計勝利。',
    },
    tiers: [
      { level: 1, threshold: 5, label: { 'zh-Hant': '5 勝', 'zh-Hans': '5 胜', en: '5 wins', ja: '5勝' } },
      { level: 2, threshold: 12, label: { 'zh-Hant': '12 勝', 'zh-Hans': '12 胜', en: '12 wins', ja: '12勝' } },
      { level: 3, threshold: 20, label: { 'zh-Hant': '20 勝', 'zh-Hans': '20 胜', en: '20 wins', ja: '20勝' } },
      { level: 4, threshold: 30, label: { 'zh-Hant': '30 勝', 'zh-Hans': '30 胜', en: '30 wins', ja: '30勝' } },
      { level: 5, threshold: 45, label: { 'zh-Hant': '45 勝', 'zh-Hans': '45 胜', en: '45 wins', ja: '45勝' } },
    ],
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

function maxCountInMap(counts: Map<string, number>): number {
  return Math.max(0, ...counts.values())
}

function maxSetSizeInMap(sets: Map<string, Set<string>>): number {
  return Math.max(0, ...[...sets.values()].map((s) => s.size))
}

export function evaluateExtraAchievementMetrics(
  playerId: string,
  players: Player[],
  decks: Deck[],
  matches: Match[],
): Record<string, number> {
  void players
  const relevant = playerMatches(playerId, matches)
  const sorted = sortByFinished(relevant)

  const deckGames = new Map<string, number>()
  const leaderGames = new Map<string, number>()
  const colorWins = new Map<string, number>()
  const setWins = new Map<string, number>()
  let dualWins = 0
  let weekdayWins = 0
  let nightWins = 0
  let earlyWins = 0
  let importCount = 0
  const opponentsBeaten = new Set<string>()
  const sessionDecks = new Map<string, Set<string>>()
  const sessionOpponents = new Map<string, Set<string>>()
  const sessionWins = new Map<string, number>()
  const dayWins = new Map<string, number>()
  const monthGames = new Map<string, number>()
  const opponentLosses = new Map<string, number>()
  const tables = new Set<string>()
  let maxSessionWins = 0
  let clutchCount = 0
  let streakSaverCount = 0
  let nemesisSlayerCount = 0
  let cleanSweepCount = 0
  let trioTriumphCount = 0
  let rivalrySweepCount = 0
  let balancedRival = 0
  let secondWins = 0
  let secondTotal = 0

  const h2h = new Map<string, { wins: number; losses: number }>()
  const sessionByOpponent = new Map<string, Map<string, Match[]>>()

  for (const match of relevant) {
    const deck = getDeckForPlayer(match, playerId, decks)
    const deckId = match.player1Id === playerId ? match.deck1Id : match.deck2Id
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const won = match.winnerPlayerId === playerId
    const date = new Date(match.finishedAt)
    const hour = date.getHours()
    const day = date.getDay()
    const dayKey = match.finishedAt.slice(0, 10)
    const monthKey = match.finishedAt.slice(0, 7)

    deckGames.set(deckId, (deckGames.get(deckId) ?? 0) + 1)
    if (deck) {
      leaderGames.set(deck.leaderName, (leaderGames.get(deck.leaderName) ?? 0) + 1)
      if (won) {
        const primary = deck.colors[0]
        if (primary) colorWins.set(primary, (colorWins.get(primary) ?? 0) + 1)
        setWins.set(deck.setCode, (setWins.get(deck.setCode) ?? 0) + 1)
        if (deck.colors.length === 2) dualWins += 1
      }
    }

    if (match.source === 'import') importCount += 1

    tables.add(match.sessionId)

    const sd = sessionDecks.get(match.sessionId) ?? new Set<string>()
    sd.add(deckId)
    sessionDecks.set(match.sessionId, sd)

    const so = sessionOpponents.get(match.sessionId) ?? new Set<string>()
    so.add(opponentId)
    sessionOpponents.set(match.sessionId, so)

    monthGames.set(monthKey, (monthGames.get(monthKey) ?? 0) + 1)

    if (won) {
      opponentsBeaten.add(opponentId)
      sessionWins.set(match.sessionId, (sessionWins.get(match.sessionId) ?? 0) + 1)
      dayWins.set(dayKey, (dayWins.get(dayKey) ?? 0) + 1)
      if (hour >= 22 || hour < 5) nightWins += 1
      if (hour < 10) earlyWins += 1
      if (day >= 1 && day <= 5) weekdayWins += 1
    } else {
      opponentLosses.set(opponentId, (opponentLosses.get(opponentId) ?? 0) + 1)
    }

    if (match.firstPlayerId === playerId) {
      // first player stats elsewhere
    } else if (match.firstPlayerId) {
      secondTotal += 1
      if (won) secondWins += 1
    }

    const row = h2h.get(opponentId) ?? { wins: 0, losses: 0 }
    if (won) row.wins += 1
    else row.losses += 1
    h2h.set(opponentId, row)

    const sessMap = sessionByOpponent.get(match.sessionId) ?? new Map<string, Match[]>()
    const list = sessMap.get(opponentId) ?? []
    list.push(match)
    sessMap.set(opponentId, list)
    sessionByOpponent.set(match.sessionId, sessMap)
  }

  for (const wins of sessionWins.values()) {
    maxSessionWins = Math.max(maxSessionWins, wins)
  }

  for (const [, row] of h2h) {
    const total = row.wins + row.losses
    if (total >= 10) {
      const rate = row.wins / total
      if (rate >= 0.45 && rate <= 0.55) balancedRival = 1
    }
  }

  let lossStreak = 0
  let lossToOpponent = new Map<string, number>()
  for (const match of sorted) {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
    const won = match.winnerPlayerId === playerId
    if (won) {
      if (lossStreak >= 3) streakSaverCount += 1
      const oppLosses = lossToOpponent.get(opponentId) ?? 0
      if (oppLosses >= 3) nemesisSlayerCount += 1
      lossStreak = 0
      lossToOpponent.set(opponentId, 0)
    } else {
      lossStreak += 1
      lossToOpponent.set(opponentId, (lossToOpponent.get(opponentId) ?? 0) + 1)
    }
  }

  const bySession = new Map<string, Match[]>()
  for (const match of relevant) {
    const list = bySession.get(match.sessionId) ?? []
    list.push(match)
    bySession.set(match.sessionId, list)
  }

  for (const sessionMatches of bySession.values()) {
    if (sessionMatches.length < 5) continue
    const last = [...sessionMatches].sort(
      (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
    ).at(-1)
    if (last?.winnerPlayerId === playerId) clutchCount += 1
  }

  for (const sessMap of sessionByOpponent.values()) {
    for (const oppMatches of sessMap.values()) {
      if (oppMatches.length < 3) continue
      const allWins = oppMatches.every((m) => m.winnerPlayerId === playerId)
      if (allWins) cleanSweepCount += 1

      let streak = 0
      let maxStreak = 0
      for (const m of sortByFinished(oppMatches)) {
        if (m.winnerPlayerId === playerId) {
          streak += 1
          maxStreak = Math.max(maxStreak, streak)
        } else {
          streak = 0
        }
      }
      if (maxStreak >= 3) rivalrySweepCount += 1
    }
  }

  for (const sessionMatches of bySession.values()) {
    const winDecks = new Set<string>()
    for (const m of sessionMatches) {
      if (m.winnerPlayerId !== playerId) continue
      winDecks.add(m.player1Id === playerId ? m.deck1Id : m.deck2Id)
    }
    if (winDecks.size >= 3) trioTriumphCount += 1
  }

  const maxDeckInSession = maxSetSizeInMap(sessionDecks)
  const maxOppInSession = maxSetSizeInMap(sessionOpponents)

  return {
    second_player_king: secondTotal >= 20 && secondWins / secondTotal >= 0.55 ? 1 : 0,
    loyalist: maxCountInMap(deckGames),
    dual_tone: dualWins,
    color_devotee: maxCountInMap(colorWins),
    deck_rotator: maxDeckInSession,
    ice_breaker: opponentsBeaten.size,
    circle_session: maxOppInSession,
    nemesis_bond: maxCountInMap(opponentLosses),
    balanced_rival: balancedRival,
    night_owl: nightWins,
    early_bird: earlyWins,
    hot_day: maxCountInMap(dayWins),
    hot_hand: maxSessionWins,
    clutch_finisher: clutchCount,
    weekday_grind: weekdayWins,
    streak_saver: streakSaverCount,
    clean_sweep: cleanSweepCount,
    leader_loyalty: maxCountInMap(leaderGames),
    import_archivist: importCount,
    marathon_month: maxCountInMap(monthGames),
    nemesis_slayer: nemesisSlayerCount,
    table_tactician: tables.size,
    trio_triumph: trioTriumphCount,
    rivalry_sweep: rivalrySweepCount,
    set_dominance: maxCountInMap(setWins),
  }
}
