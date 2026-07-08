# Achievements Backlog & External Research

Living document for **future achievement families** beyond the ~50 shipped in V4.3.x (`src/lib/achievements.ts`, `src/lib/achievementsExtra.ts`).

**Backlog total:** 250 items (Batch A–E × 50). **Shipped in app (V4.6.0):** ~300 families total (core 25 + extra 25 + backlog batches). Remaining 🔴 V5/event items are defined but metrics return 0 until Event/League ships.

**Related code:** `AchievementDefinition`, `evaluateExtraAchievementMetrics`, `AchievementsWall`, global unlock rates (V4.3+).

**Status legend**

| Tag | Meaning |
|-----|---------|
| 🟢 | Completable with current match/player/deck/session fields |
| 🟡 | Needs new fields or systems (timer, audit, daily quest, tags) |
| 🔴 | Needs V5 Event/League or major social layer |

---

## Part 1 — External research (2026-07-09)

Sources reviewed: public wikis, official FAQ, organized-play PDFs, community guides.

| Product | Achievement / task model | Key takeaway for OPCG |
|---------|--------------------------|------------------------|
| [Hearthstone Achievements](https://hearthstone.wiki.gg/wiki/Achievement) | Progression, Gameplay, Collection, Adventures, Game Modes; expansion batches | Split by **SET** / mode; in-match “fancy win” goals |
| [MTG Arena Achievements](https://mtgarena-support.wizards.com/hc/en-us/articles/34721092862228-Achievements-FAQ) | ~113 in 9 groups; **Color Mastery** (10 per color); favorite + home “almost done” | Color mastery lines; long time-gated grinds |
| [YGO Master Duel Missions](https://yugipedia.com/wiki/Mission_(Master_Duel)) | Daily / Lifetime / **Secret** (hidden until triggered) | Hidden achievements; extreme single-duel conditions |
| [Pokémon TCG Live Battle Pass](https://bulbapedia.bulbagarden.net/wiki/Battle_Pass_(TCG_Live)) | 3 daily quests, reroll 1×; weekly quests; season pass XP | **Separate daily track** from lifetime wall |
| [Disney Lorcana League OP](https://cdn.ravensburger.com/lorcana/op-kit3-instruction-en) | Points for sign-up, **win AND loss**, teach newbie, bring friend; cap 10 pts/week | Participation > winning; store-league flavor |
| [Chess.com Achievements](https://support.chess.com/en/articles/8618496-what-are-achievements) | Milestones + **opponent-gifted badges** + tournament medals | Social badges; profile showcase |
| Steam / tabletop trackers | Global %, rarity tiers, kanban “in progress” | Already partial via community unlock % (V4.3) |

### Design patterns to borrow

1. **Dual track** — Lifetime achievement wall vs daily/weekly refreshable challenges (HS / PTCG).
2. **Color / Leader mastery** — Tiered grinds per primary color or leader code (MTGA).
3. **Hidden / Secret** — Task hidden until first trigger (Master Duel).
4. **Participation scoring** — Losing still counts toward league-style goals (Lorcana).
5. **Favorite + near-complete UX** — Pin one goal; surface on home (MTGA).
6. **Rarity display** — Global unlock % buckets: common / rare / legendary (Steam).
7. **Event medals** — Top 8, Swiss record, check-in (Chess + Lorcana Championship → V5).

### Gap vs OPCG Tracker V4.3.5

| Strong today | Underused / missing |
|--------------|-------------------|
| Grind tiers (Veteran, Deck Specialist) | Daily / weekly quest rail |
| Meta diversity (Explorer, Rainbow Session) | Explicit **per-color mastery** families |
| Skill streaks & upsets | Single-match flags (duration, OT, Bo3) |
| Social volume (Rival Bond, Group Star) | Teach / bring-friend / sportsmanship |
| Community unlock % | Favorite achievement + “1 away” prompt |
| PNG share export | URL read-only share (separate roadmap) |

---

## Part 2 — Shipped families (reference)

Do **not** duplicate these ids when implementing backlog items.

**Core (`achievements.ts`):** `veteran`, `first_win`, `win_streak`, `deck_specialist`, `meta_explorer`, `set_collector`, `mono_maniac`, `rival_bond`, `group_star`, `session_marathon`, `note_poet`, `comeback`, `perfect_session`, `first_player_king`, `giant_slayer`, `color_spectrum`, `second_striker`, `upset_alarm`, `mirror_master`, `meta_breaker`, `revenge_win`, `underdog`, `weekend_warrior`, `rainbow_session`, `achievement_hunter`

**Extra (`achievementsExtra.ts`):** `second_player_king`, `loyalist`, `dual_tone`, `color_devotee`, `deck_rotator`, `ice_breaker`, `circle_session`, `nemesis_bond`, `balanced_rival`, `night_owl`, `early_bird`, `hot_day`, `hot_hand`, `clutch_finisher`, `weekday_grind`, `streak_saver`, `clean_sweep`, `leader_loyalty`, `import_archivist`, `marathon_month`, `nemesis_slayer`, `table_tactician`, `trio_triumph`, `rivalry_sweep`, `set_dominance`

---

## Part 3 — Backlog Batch A (product brainstorm, 50)

First internal list (2026-07-09). Not implemented.

| # | Proposed id | Title (zh) | Category | Data |
|---|-------------|------------|----------|------|
| A01 | `centurion_wins` | 百勝將 | milestone | 🟢 |
| A02 | `iron_win_rate` | 穩定勝者 | skill | 🟢 |
| A03 | `daily_regular` | 每日常客 | milestone | 🟡 login streak |
| A04 | `season_opener` | 新賽季先鋒 | meta | 🟢 |
| A05 | `table_veteran` | 多桌老手 | fun | 🟢 |
| A06 | `rematch_king` | 再戰之王 | social | 🟢 |
| A07 | `history_keeper` | 史官 | fun | 🟡 edit count |
| A08 | `profile_linked` | 真身現形 | milestone | 🟢 |
| A09 | `loss_survivor` | 止敗者 | streak | 🟢 |
| A10 | `bounce_back` | 東山再起 | streak | 🟢 |
| A11 | `session_heater` | 場次火燙 | streak | 🟢 |
| A12 | `cold_open` | 開局冷 | fun | 🟢 |
| A13 | `alternating_fate` | 勝敗交替 | fun | 🟢 |
| A14 | `no_mercy` | 無情連勝 | streak | 🟢 |
| A15 | `first_blood` | 先攻獵人 | skill | 🟢 |
| A16 | `second_wind` | 後攻專家 | skill | 🟢 |
| A17 | `turn_hunter` | 回合優勢 | skill | 🟢 |
| A18 | `mirror_breaker` | 鏡像剋星 | skill | 🟢 |
| A19 | `counter_expert` | 環境剋星 | skill | 🟢 |
| A20 | `flawless_table` | 全桌制霸 | skill | 🟢 |
| A21 | `clutch_streak` | 絕境連勝 | skill | 🟢 |
| A22 | `speed_demon` | 快攻結束 | skill | 🟡 timer |
| A23 | `marathon_mind` | 長局意志 | skill | 🟡 timer |
| A24 | `perfect_week` | 完美一週 | streak | 🟢 |
| A25 | `upset_chain` | 冷門連鎖 | skill | 🟢 |
| A26 | `clean_record` | 零失誤 Session | fun | 🟡 audit |
| A27 | `set_hopper` | 跳環玩家 | meta | 🟢 |
| A28 | `rainbow_pilot` | 七色旗手 | meta | 🟢 |
| A29 | `mono_session` | 單色之夜 | meta | 🟢 |
| A30 | `dual_color_master` | 雙色大師 | meta | 🟢 |
| A31 | `tri_color_trouble` | 三色混戰 | meta | 🟢 |
| A32 | `leader_collector` | 主將圖鑑 | meta | 🟢 |
| A33 | `meta_sheep` | 跟風者 | meta | 🟢 |
| A34 | `meta_rebel` | 逆風者 | meta | 🟢 |
| A35 | `deck_nomad` | 遊牧牌手 | meta | 🟢 |
| A36 | `op_era` | 時代見證 | meta | 🟢 |
| A37 | `round_robin` | 全員交手 | social | 🟢 |
| A38 | `nemesis_reversed` | 復仇成功 | social | 🟢 |
| A39 | `friendship_games` | 友誼賽 | social | 🟢 |
| A40 | `new_face_welcomer` | 迎新者 | social | 🟢 |
| A41 | `group_anchor` | 群組中流砥柱 | social | 🟢 |
| A42 | `sync_pioneer` | 同步先驅 | social | 🟡 |
| A43 | `peacemaker` | 和事佬 | social | 🟢 |
| A44 | `hill_king` | 山大王 | social | 🟢 |
| A45 | `palindrome_score` | 對稱戰績 | fun | 🟢 |
| A46 | `lucky_seven` | 幸運七 | fun | 🟢 |
| A47 | `midnight_duel` | 午夜決鬥 | fun | 🟢 |
| A48 | `lunch_break` | 午休局 | fun | 🟢 |
| A49 | `completionist_90` | 成就控 | fun | 🟢 |
| A50 | `secret_handshake` | 隱藏握手 | fun | 🟡 hidden |

---

## Part 4 — Backlog Batch B (research-inspired, 50)

From cross-game patterns (2026-07-09). Not implemented.

| # | Proposed id | Title (zh) | Inspiration | Data |
|---|-------------|------------|-------------|------|
| B01 | `set_sail` | 新集首勝 | HS expansion | 🟢 |
| B02 | `expansion_regular` | 單集常客 | HS | 🟢 |
| B03 | `class_loyalist` | 主將忠誠 | HS class | 🟢 |
| B04 | `noted_perfection` | 完美局註記 | HS flair | 🟢 |
| B05 | `same_turn_sweep` | 速戰連掃 | HS speed | 🟡 timer |
| B06 | `no_rematch_streak` | 全新對手 | HS variety | 🟡 |
| B07 | `bo3_ready` | 三戰兩勝 | HS Bo3 | 🔴 |
| B08 | `table_flip` | 逆轉場 | HS comeback | 🟢 |
| B09 | `opening_act` | 開場必勝 | HS | 🟢 |
| B10 | `closer` | 收尾者 | HS | 🟢 |
| B11 | `white_mastery` | 白之精通 | MTGA color | 🟢 |
| B12 | `blue_mastery` | 藍之精通 | MTGA | 🟢 |
| B13 | `red_rush` | 紅色快攻 | MTGA | 🟢 |
| B14 | `green_midrange` | 綠色中速 | MTGA | 🟢 |
| B15 | `black_control` | 黑色控制 | MTGA | 🟡 timer |
| B16 | `purple_pilot` | 紫色試手 | MTGA | 🟢 |
| B17 | `pauper_hero` | 預組英雄 | MTGA pauper | 🟢 |
| B18 | `event_entered` | 賽事入門 | MTGA events | 🔴 V5 |
| B19 | `swiss_survivor` | 瑞士生存 | MTGA | 🔴 V5 |
| B20 | `monthly_mythic` | 月度強者 | MTGA rank | 🟢 |
| B21 | `secret_first_blood` | ??? 先攻首回合 | YGO secret | 🟢 hidden |
| B22 | `secret_mirror_hell` | ??? 鏡像地獄 | YGO | 🟢 hidden |
| B23 | `secret_silent_win` | ??? 無痕勝利 | YGO | 🟡 audit |
| B24 | `secret_unknown_deck` | ??? 未知主將 | YGO | 🟢 hidden |
| B25 | `secret_exodia` | ??? 十戰八勝 | YGO | 🟢 hidden |
| B26 | `damage_clock` | 速攻時鐘 | YGO damage | 🟡 timer |
| B27 | `long_game` | 馬拉松局 | YGO | 🟡 timer |
| B28 | `ot_champion` | 加時王者 | YGO OT | 🔴 |
| B29 | `zero_undo_session` | 零 Undo 夜 | YGO clean | 🟡 audit |
| B30 | `perfect_table_four` | 四桌同贏 | YGO | 🟢 |
| B31 | `league_sign_in` | 聯盟簽到 | Lorcana | 🟢 |
| B32 | `win_or_learn` | 贏或學 | Lorcana loss pts | 🟢 |
| B33 | `teacher` | 教局者 | Lorcana teach | 🔴 tag |
| B34 | `ambassador` | 引薦人 | Lorcana bring friend | 🟢 |
| B35 | `sportsmanship` | 體育精神 | Lorcana | 🔴 social |
| B36 | `weekly_cap` | 週上限十場 | Lorcana cap | 🟢 |
| B37 | `season_lore` | 十二週傳說 | Lorcana season | 🟢 |
| B38 | `store_regular` | 店家常客 | Lorcana | 🟢 |
| B39 | `login_streak` | 登入連續 | Chess.com | 🟡 |
| B40 | `profile_complete` | 檔案完整 | Chess.com | 🟢 |
| B41 | `hunter_75` | 成就獵人 II | Chess.com | 🟢 |
| B42 | `rare_trophy` | 稀有獎盃 | Steam rarity | 🟢 |
| B43 | `showcase_master` | 展示大師 | Chess showcase | 🟢 |
| B44 | `data_importer` | 資料考古 | import | 🟢 |
| B45 | `cloud_guardian` | 雲端守護 | sync | 🟡 |
| B46 | `daily_duelist` | 今日一戰 | PTCG daily | 🟢 daily rail |
| B47 | `daily_winner` | 今日一勝 | PTCG | 🟢 daily |
| B48 | `weekly_grinder` | 本週十戰 | PTCG weekly | 🟢 daily |
| B49 | `quest_reroll` | 任務重抽 | PTCG reroll | 🔴 daily |
| B50 | `battle_pass_tier` | 賽季通行 | PTCG pass | 🔴 season |

---

## Part 5 — Backlog Batch C (third wave, 50)

New proposals (2026-07-09). Focus: V4 features (share, profile, achievements UI), data hygiene, table workflow, set codes (OP/ST/EB), group collab.

| # | Proposed id | Title (zh) | Category | Data |
|---|-------------|------------|----------|------|
| C01 | `share_first` | 初次分享 | milestone | 🟢 export PNG once |
| C02 | `share_evangelist` | 分享推廣 | social | 🟢 export 10× |
| C03 | `session_poster` | 場報記者 | fun | 🟢 session export |
| C04 | `card_case_artist` | 卡圖工匠 | fun | 🟢 profile export w/ decks |
| C05 | `community_peek` | 社群窺探 | fun | 🟢 open community sheet |
| C06 | `peer_parity` | 同溫層 | fun | 🟢 unlock rate within 5% of global |
| C07 | `lonely_elite` | 孤獨精英 | fun | 🟢 <2% global unlock |
| C08 | `tier_maxer` | 滿階收藏家 | milestone | 🟢 max tier on 5 families |
| C09 | `tier_triple` | 三線滿階 | milestone | 🟢 max 3 grind families |
| C10 | `skill_trifecta` | 技巧三冠 | skill | 🟢 max 3 skill families |
| C11 | `streak_legend` | 連勝傳說 | streak | 🟢 10+ win streak once |
| C12 | `loss_streak_iron` | 鐵心止損 | streak | 🟢 stop at 5 loss streak w/ win |
| C13 | `claim_creator` | 身份創建 | milestone | 🟢 create linked player |
| C14 | `claim_reclaim` | 身份回收 | milestone | 🟢 reclaim device |
| C15 | `alias_spirit` | 別名通 | meta | 🟢 win w/ deck matched via alias |
| C16 | `locale_polyglot` | 多語牌手 | fun | 🟡 UI language switches + wins |
| C17 | `st_deck_winner` | 預組勝者 | meta | 🟢 ST** deck 10 wins |
| C18 | `eb_specialist` | 強化包專家 | meta | 🟢 EB** deck 10 wins |
| C19 | `op16_native` | 環境原住民 | meta | 🟢 OP16 only session 5+ wins |
| C20 | `leader_rotation` | 主將輪替 | meta | 🟢 5 leaders in one session |
| C21 | `roster_full` | 滿編登記 | social | 🟢 session roster ≥8 used |
| C22 | `roster_solo` | 單打獨秀 | fun | 🟢 win with only 1 roster member as opp |
| C23 | `merge_survivor` | 合併見證 | milestone | 🟢 after player merge, win 5 |
| C24 | `session_merged` | 場次合流 | milestone | 🟢 participate post session-merge |
| C25 | `archive_diver` | 封存挖掘 | fun | 🟢 win w/ archived session data |
| C26 | `soft_delete_phoenix` | 刪除還原 | fun | 🟡 restore match then win |
| C27 | `history_editor` | 歷史修訂 | fun | 🟢 edit 5 matches |
| C28 | `copy_reopen` | 複製重開王 | fun | 🟢 history copy-rematch 10× |
| C29 | `slot_one_legend` | 一號桌傳奇 | fun | 🟢 50 wins at table slot 1 |
| C30 | `slot_wanderer` | 桌號游牧 | fun | 🟢 win on 8 different slots |
| C31 | `assign_speedrun` | 閃電分配 | fun | 🟡 time from open assign → complete |
| C32 | `dock_master` | 分配塢大師 | fun | 🟢 100 assigns via mobile dock |
| C33 | `first_second_balance` | 攻守平衡 | skill | 🟢 FP win% & SP win% both ≥50%, n≥20 |
| C34 | `first_only` | 先攻依賴 | skill | 🟢 FP WR ≥70%, SP WR <40% (fun label) |
| C35 | `second_only` | 後攻依賴 | skill | 🟢 inverse |
| C36 | `notes_streak` | 備註連載 | fun | 🟢 5 wins with notes in row |
| C37 | `gg_writer` | GG 紳士 | fun | 🟢 notes contain GG/gg 20× |
| C38 | `rival_top5` | 五宿敵 | social | 🟢 5 opponents each 10+ games |
| C39 | `nemesis_70` | 剋星降服 | skill | 🟢 vs nemesis reach 70% WR (n≥10) |
| C40 | `global_top100` | 社群百強 | social | 🔴 leaderboard rank |
| C41 | `offline_warrior` | 離線戰士 | milestone | 🟡 queue 10 ops offline then sync |
| C42 | `sync_same_day` | 當日同步 | milestone | 🟡 sync same calendar day |
| C43 | `multi_device` | 雙端選手 | milestone | 🟡 profile claim 2 devices |
| C44 | `group_founder's seed` | 群組種子 | social | 🟡 first 10 matches in new group |
| C45 | `excel_surgeon` | 試算表外科 | milestone | 🟢 import + export same month |
| C46 | `backup_hero` | 備份英雄 | milestone | 🟢 cloud backup restore success |
| C47 | `appearance_guru` | 外觀達人 | fun | 🟢 try all 5 accent colors |
| C48 | `compact_veteran` | 緊湊老將 | fun | 🟢 50 matches in compact density |
| C49 | `light_mode_hero` | 光之勇者 | fun | 🟢 20 wins in light theme |
| C50 | `sound_checker` | 音效確認 | fun | 🟢 first win w/ sound enabled |

---

## Part 5b — Backlog Batch D (fourth wave, 50)

Theme: calendar / rhythm, match-number milestones, stats & heatmap, workflow edge cases, group/session lifecycle.

| # | Proposed id | Title (zh) | Category | Data |
|---|-------------|------------|----------|------|
| D01 | `new_year_first` | 新年首戰 | fun | 🟢 first match Jan 1 |
| D02 | `lunar_spark` | 新春火花 | fun | 🟢 win during LNY window (config) |
| D03 | `halloween_night` | 萬聖夜 | fun | 🟡 seasonal window |
| D04 | `christmas_clash` | 聖誕對局 | fun | 🟢 Dec 24–26 match |
| D05 | `summer_surge` | 暑假高峰 | fun | 🟢 20 matches Jul–Aug |
| D06 | `friday_night` | 周五夜牌 | fun | 🟢 10 wins Fri 18:00–24:00 |
| D07 | `sunday_league` | 週日聯賽 | fun | 🟢 15 wins on Sunday |
| D08 | `leap_day` | 閏日稀有 | fun | 🟢 match on Feb 29 |
| D09 | `monthly_spread` | 十二個月 | milestone | 🟢 matches in 12 calendar months |
| D10 | `quarterly_regular` | 季度常客 | milestone | 🟢 30 matches per quarter |
| D11 | `match_100` | 第100戰 | milestone | 🟢 matchNumber or total=100 |
| D12 | `match_500` | 第500战 | milestone | 🟢 |
| D13 | `match_777` | 777 吉利 | fun | 🟢 777th completed match |
| D14 | `match_1000` | 千場記 | milestone | 🟢 |
| D15 | `win_100` | 百勝里程碑 | milestone | 🟢 |
| D16 | `win_250` | 二百五…勝 | milestone | 🟢 |
| D17 | `exactly_fifty` | 五十整 | fun | 🟢 career WR exactly 50% at n≥20 |
| D18 | `fibonacci_win` | 斐波那契 | fun | 🟢 win totals hit 1,2,3,5,8,13… |
| D19 | `prime_hunter` | 質數獵手 | fun | 🟢 win on prime-numbered match # |
| D20 | `heatmap_reader` | 讀熱圖者 | meta | 🟡 open stats heatmap 20× |
| D21 | `counter_pick` | 針對性選出 | skill | 🟢 beat session top deck 3× |
| D22 | `anti_meta_day` | 反环境日 | skill | 🟢 beat 3 decks never used by you before |
| D23 | `same_deck_different_pilots` | 同构异人 | meta | 🟢 same deck id, 3 different your pilots |
| D24 | `pilot_swap_win` | 换牌胜 | meta | 🟢 win deck A then deck B same session |
| D25 | `debut_win` | 初阵告捷 | skill | 🟢 first use of deck → win |
| D26 | `debut_redemption` | 初阵雪耻 | skill | 🟢 lose debut then win rematch same deck |
| D27 | `scope_toggle` | 雙視野 | fun | 🟢 win in session scope stats mindset |
| D28 | `all_time_legend` | 全史傳說 | milestone | 🟢 200 all-time wins linked player |
| D29 | `pie_master` | 餅圖大師 | meta | 🟢 deck usage pie ≥5 slices each ≥10% |
| D30 | `trend_rider` | 趋势骑手 | skill | 🟢 4-week WR uptrend |
| D31 | `trend_faller` | 低谷行者 | fun | 🟢 4-week WR down then recover week 5 |
| D32 | `break_opp_streak` | 斷火者 | skill | 🟢 beat opponent on 3+ win streak |
| D33 | `extend_own_streak` | 續火專家 | streak | 🟢 reach 5 streak twice in month |
| D34 | `session_opener_5` | 五連開場 | streak | 🟢 first 5 session matches all wins |
| D35 | `session_closer_5` | 五連收尾 | streak | 🟢 last 5 session matches all wins |
| D36 | `table_32_touch` | 满桌体验 | fun | 🟢 complete match at table slot 32 |
| D37 | `single_table_night` | 单桌之夜 | fun | 🟢 session tableCount=1, ≥8 matches |
| D38 | `overflow_veteran` | 溢出老手 | fun | 🟢 20 wins from overflow/unassigned legacy |
| D39 | `drag_drop_debut` | 拖拽首秀 | fun | 🟡 assign via drag first time |
| D40 | `tap_assign_only` | 点选流派 | fun | 🟢 50 assigns via tap-only mobile |
| D41 | `roster_prompt_hero` | 名单英雄 | social | 🟢 complete roster prompt same day |
| D42 | `session_end_ritual` | 收工仪式 | milestone | 🟢 end session after ≥10 matches |
| D43 | `new_session_starter` | 開季者 | milestone | 🟢 create 10 sessions |
| D44 | `session_archive` | 封存者 | milestone | 🟢 archive session w/ ≥20 matches |
| D45 | `merge_session_witness` | 合场见证 | milestone | 🟢 after session merge, play 1 match |
| D46 | `tombstone_purge` | 清理幽灵 | fun | 🟡 permanent delete restored entity |
| D47 | `filter_master` | 筛选大师 | fun | 🟡 history 5 filter combos used |
| D48 | `date_range_archaeologist` | 日期考古 | fun | 🟢 history custom range spans 90 days |
| D49 | `deck_search_sniper` | 牌组狙击 | fun | 🟢 history deck filter → 1 match win |
| D50 | `onboarding_graduate` | 結業生 | milestone | 🟢 onboarding done + 10 matches |

---

## Part 5c — Backlog Batch E (fifth wave, 50)

Theme: rival narratives, color/set deep cuts, achievement-system meta, collab/sync, V5/Event placeholders, secret & humor.

| # | Proposed id | Title (zh) | Category | Data |
|---|-------------|------------|----------|------|
| E01 | `rival_win5` | 五胜宿敌 | social | 🟢 5 opponents each 5+ wins vs |
| E02 | `rival_even` | 五五波 | social | 🟢 3 rivals WR 48–52%, n≥12 |
| E03 | `rival_dominate` | 压制 | social | 🟢 one rival 10+ wins, ≤2 losses |
| E04 | `rival_respect` | 敬對手 | social | 🟢 20 rivals each ≥3 games |
| E05 | `nemesis_chain` | 宿敌连环 | social | 🟢 beat nemesis 3 sessions in row |
| E06 | `new_rival` | 新敌初逢 | social | 🟢 first match vs new player → win |
| E07 | `old_rival` | 老友再战 | social | 🟢 vs same opp 2 years apart |
| E08 | `color_clash_red_blue` | 紅藍對決 | meta | 🟢 red deck beat blue deck 10× |
| E09 | `color_clash_green_purple` | 綠紫恩怨 | meta | 🟢 |
| E10 | `black_vs_yellow` | 黑黃相克 | meta | 🟢 |
| E11 | `tricolor_win` | 三色勝利 | meta | 🟢 win with 3-color deck |
| E12 | `single_color_session_sweep` | 純色橫掃 | meta | 🟢 mono color 8-0 session |
| E13 | `set_pair_master` | 双集精通 | meta | 🟢 OP15+OP16 combined 30 wins |
| E14 | `starter_only_month` | 预组月 | meta | 🟢 20 wins ST decks in 30 days |
| E15 | `leader_wall` | 主将墙 | meta | 🟢 display 20 leaders in profile rail |
| E16 | `achievement_sort_all` | 排序狂人 | fun | 🟡 use all sort modes once |
| E17 | `category_sweep` | 六类全收 | fun | 🟢 unlock from all 6 categories |
| E18 | `one_session_five_unlock` | 一夜五金 | fun | 🟢 5 unlocks same session |
| E19 | `same_day_skill_triple` | 技巧三响 | skill | 🟢 3 skill unlocks same day |
| E20 | `grind_level_up_live` | 当场升级 | milestone | 🟢 tier up during active session |
| E21 | `community_top10` | 社群前十 | social | 🔴 local rank unlock rate |
| E22 | `community_bottom10` | 稀有坚持 | fun | 🟢 hold <5% unlock 30 days |
| E23 | `share_unlock` | 分享解锁 | fun | 🟡 share PNG on unlock |
| E24 | `read_every_desc` | 熟读说明 | fun | 🟡 open all achievement sheets |
| E25 | `weighted_progress_50` | 半程里程碑 | milestone | 🟢 50% weighted tier progress |
| E26 | `weighted_progress_100` | 全阶毕业 | milestone | 🟢 100% weighted all families |
| E27 | `skill_gold` | 技巧金章 | skill | 🟢 max all skill families |
| E28 | `fun_gold` | 趣味金章 | fun | 🟢 max 10 fun families |
| E29 | `social_gold` | 社交金章 | social | 🟢 max 8 social families |
| E30 | `meta_gold` | 环境金章 | meta | 🟢 max 10 meta grind families |
| E31 | `email_login` | 邮箱登录 | milestone | 🟢 cloud email verified |
| E32 | `group_code_join` | 入群口令 | social | 🟢 join group ≥8 chars |
| E33 | `group_upload_first` | 首次上传 | social | 🟢 group upload once |
| E34 | `group_download_first` | 首次拉取 | social | 🟢 group download once |
| E35 | `realtime_witness` | 实时见证 | social | 🟡 collab pull during active match |
| E36 | `queue_hero` | 队列英雄 | milestone | 🟡 flush 50 queued ops |
| E37 | `conflict_survivor` | 冲突幸存者 | milestone | 🔴 merge conflict resolved |
| E38 | `multi_group_tourist` | 多群游客 | social | 🔴 multi-group switch |
| E39 | `event_check_in` | 赛事签到 | milestone | 🔴 V5 check-in |
| E40 | `event_3_0` | 瑞士三胜 | skill | 🔴 V5 Swiss 3 wins |
| E41 | `event_top8` | 八强 | skill | 🔴 V5 top 8 |
| E42 | `event_champion` | 冠军 | skill | 🔴 V5 win event |
| E43 | `league_points_100` | 聯賽百分 | milestone | 🔴 V5 league points |
| E44 | `secret_lucky_roll` | ??? 骰子神 | fun | 🟢 hidden: win after table roll |
| E45 | `secret_all_dash` | ??? 全劃線 | fun | 🟢 hidden: notes only "———" |
| E46 | `secret_midnight_mirror` | ??? 午夜鏡像 | fun | 🟢 hidden: mirror + night_owl |
| E47 | `secret_zero_note_streak` | ??? 沉默十勝 | fun | 🟢 10 wins no notes |
| E48 | `secret_achievement_hunter` | ??? 獵獵獵 | fun | 🟢 unlock hunter while unlocking 5th |
| E49 | `palindrome_session` | 回文场次 | fun | 🟢 session W-L palindrome ≥6 games |
| E50 | `chaos_session` | 混沌之夜 | fun | 🟢 8 players 8 decks 8 matches no repeat |

---

## Part 6 — Implementation priority (draft)

| Wave | Items | Notes |
|------|-------|-------|
| **V4.4** | B11–B16 color mastery; B31–B32, B36–B38 league; C01–C10 share/profile meta; A15–A16 first/second | Mostly 🟢 |
| **V4.5** | Daily rail B46–B48; hidden B21–B25; audit C26, B29 | Needs daily + audit design |
| **V4.6+** | Timer A22–A23, B26–B27; B18–B19 V5 bridge; D11–D16 match milestones | Tie to roadmap |
| **V4.7+** | D01–D10 seasonal; E08–E15 color deep cuts | Calendar config |
| **V5** | Event medals E39–E43; teach B33–B35; E38 multi-group | League / OP program |

When promoting an item to shipped: add to `achievements.ts` or `achievementsExtra.ts`, bump `CHANGELOG.md`, add evaluator in metrics function.

---

## Changelog (this document)

| Date | Notes |
|------|--------|
| 2026-07-09 | Batch D/E (+100): calendar, milestones, rivals, achievement meta, V5 hooks |
| 2026-07-09 | Initial research + Batch A/B/C (150 backlog items) |
