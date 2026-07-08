/**
 * Human-readable achievement descriptions (zh-Hant first).
 * Used by remaining backlog definitions; core/batch keep inline descriptions.
 */
import type { Language } from '@/types'

type Desc = Record<Language, string>

const ZH: Record<string, string> = {
  daily_regular: '連續多天都有對局紀錄。',
  table_veteran: '在不同桌號上取得勝利。',
  history_keeper: '編輯或修訂對局歷史紀錄的次數。',
  loss_survivor: '在連敗後成功止血、終止連敗的次數。',
  bounce_back: '大幅落後或連敗後逆轉取勝的場次。',
  session_heater: '單一場次內連續取勝的最多場數。',
  cold_open: '場次首戰落敗的次數（趣味向）。',
  alternating_fate: '勝敗交替出現的場次模式。',
  no_mercy: '單場次或跨場連勝且不給對手喘息。',
  turn_hunter: '先攻勝率達標（至少 20 場樣本）。',
  flawless_table: '同一場次在單桌全勝。',
  clutch_streak: '險勝或低血量狀態下連續取勝。',
  perfect_week: '一週內高勝率且場次達標。',
  upset_chain: '連續擊敗使用率或戰績較高的對手。',
  clean_record: '整場 Session 無 Undo、無失誤完成。',
  set_hopper: '單場次使用多個不同系列牌組。',
  rainbow_pilot: '使用過六種主色的勝場累積。',
  mono_session: '單場次只用單色牌組取勝的場數。',
  dual_color_master: '雙色牌組累計勝場。',
  tri_color_trouble: '三色牌組累計勝場。',
  meta_sheep: '對局中使用「熱門牌組」取勝。',
  meta_rebel: '用冷門牌組擊敗熱門牌組。',
  deck_nomad: '單場次換用多副牌組並取勝。',
  op_era: '使用過的不同 OP 系列數量。',
  friendship_games: '與同一對手反覆對戰的累積場次。',
  new_face_welcomer: '首次交手並取勝的對手數。',
  group_anchor: '群組內活躍對局參與度。',
  group_code_join: '使用群組協作碼同步資料。',
  palindrome_score: '對戰數或勝敗呈對稱模式的場次。',
  lucky_seven: '與數字 7 相關的趣味勝場（如第 7 場、7 連勝片段）。',
  completionist_90: '將多個成就家族練到滿階（成就控終極目標）。',
  secret_handshake: '隱藏成就：達成特定連勝與對局數組合。',
  skill_trifecta: '技巧類成就中達到滿階的家族數量。',
  streak_legend: '達成 8 場以上的最高連勝紀錄。',
  st_deck_winner: '使用 ST 預組牌組的累計勝場。',
  eb_specialist: '使用 EB 強化包牌組的累計勝場。',
  op16_native: '在 OP16 環境專場中累計勝場。',
  leader_rotation: '單場次使用不同主將的數量。',
  roster_full: '單場次與多名不同對手交手。',
  slot_one_legend: '在一號桌的累計勝場。',
  slot_wanderer: '在不同桌號都取得過勝利。',
  first_second_balance: '先攻與後攻勝率均達 50% 以上（至少 20 場）。',
  gg_writer: '對局備註中包含 GG 的場次。',
  rival_top5: '與 5 位對手各自對戰至少 10 場。',
  nemesis_70: '對剋星對手勝率達 70%（至少 10 場）。',
  new_year_first: '在 1 月 1 日完成對局。',
  halloween_night: '萬聖節期間的對局。',
  christmas_clash: '聖誕期間（12/24–26）的對局。',
  summer_surge: '暑假（7–8 月）的對局數。',
  friday_night: '週五晚間的勝場。',
  sunday_league: '週日的累計勝場。',
  leap_day: '在 2 月 29 日完成對局。',
  match_100: '生涯完成第 100 場對局。',
  match_500: '生涯完成第 500 場對局。',
  match_777: '生涯完成第 777 場對局。',
  match_1000: '生涯完成第 1000 場對局。',
  win_250: '生涯累計 250 勝。',
  exactly_fifty: '生涯至少 20 場且勝率恰好 50%。',
  prime_hunter: '在「質數」序號的對局中取勝。',
  counter_pick: '擊敗當場熱門牌組的次數。',
  debut_win: '首次使用某牌組即取勝。',
  debut_redemption: '某牌組初戰落敗後復仇成功。',
  break_opp_streak: '終止對手連勝的次數。',
  session_opener_5: '場次前 5 戰全勝的次數。',
  session_closer_5: '場次最後 5 戰全勝的次數。',
  single_table_night: '單桌場次完成 8 場以上對局。',
  session_end_ritual: '場次結束前完成 10 場以上對局。',
  new_session_starter: '建立的場次數量。',
  session_archive: '封存含 20 場以上對局的場次。',
  onboarding_graduate: '完成新手引導且累積 10 場對局。',
  rival_respect: '與 20 位對手各自至少對戰 3 場。',
  color_clash_red_blue: '紅色牌組擊敗藍色牌組的勝場。',
  color_clash_green_purple: '綠色牌組擊敗紫色牌組的勝場。',
  black_vs_yellow: '黑 vs 黃配色對決的勝場。',
  tricolor_win: '三色牌組的累計勝場。',
  single_color_session_sweep: '單場次只用單色牌組橫掃。',
  category_sweep: '六大類成就各至少解鎖一項。',
  one_session_five_unlock: '單場次解鎖 5 個成就階段。',
  same_day_skill_triple: '同一天解鎖 3 個技巧類成就階段。',
  weighted_progress_50: '全成就階段進度達 50%。',
  weighted_progress_100: '全成就階段進度達 100%。',
  secret_lucky_roll: '隱藏：桌號隨機分配後取勝。',
  secret_all_dash: '隱藏：備註僅含「———」。',
  secret_midnight_mirror: '隱藏：午夜鏡像對決取勝。',
  secret_zero_note_streak: '隱藏：連續 10 勝且無備註。',
  secret_achievement_hunter: '隱藏：解鎖第 5 個成就時觸發獵人成就。',
  palindrome_session: '場次勝敗序列呈回文模式。',
  chaos_session: '單場次使用極多不同牌組的混亂之夜。',
  table_flip: '大幅落後後逆轉取勝（與 comeback 呼應）。',
}

const SIMPLIFY: Array<[string, string]> = [
  ['對', '对'], ['勝', '胜'], ['場', '场'], ['將', '将'], ['組', '组'], ['與', '与'],
  ['達', '达'], ['標', '标'], ['數', '数'], ['擊', '击'], ['敗', '败'], ['連', '连'],
  ['續', '续'], ['備', '备'], ['註', '注'], ['錄', '录'], ['編', '编'], ['輯', '辑'],
  ['歷', '历'], ['隱', '隐'], ['藏', '藏'], ['獵', '猎'], ['獨', '独'], ['環', '环'],
  ['鏡', '镜'], ['無', '无'], ['備', '备'], ['週', '周'], ['聖', '圣'], ['誕', '诞'],
  ['萬', '万'], ['質', '质'], ['復', '复'], ['讀', '读'], ['協', '协'], ['資料', '资料'],
]

function toSimplified(text: string): string {
  let out = text
  for (const [t, s] of SIMPLIFY) out = out.split(t).join(s)
  return out
}

export function getRemainingAchievementDescription(id: string, titleZh: string): Desc {
  const zhHant = ZH[id] ?? `${titleZh} — 依對局數據自動累積。`
  return {
    'zh-Hant': zhHant,
    'zh-Hans': toSimplified(zhHant),
    en: ZH[id] ? `${titleZh} — tracked from match data.` : `${titleZh} — auto-tracked progress.`,
    ja: `${titleZh} — 対戦データから自動集計。`,
  }
}
