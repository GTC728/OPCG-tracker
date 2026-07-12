# OPCG Tracker Roadmap

| Step | 模組 | 狀態 | 交付物 |
|------|------|------|--------|
| 1 | 專案骨架 | 完成 | Vite + React + TS + Tailwind、型別定義、Bottom Nav、四頁 placeholder |
| 2 | 儲存層 | 完成 | localStorage 讀寫、Zustand actions、Session 自動建立 |
| 3 | 玩家 & 牌組管理 | 完成 | 設定頁 CRUD、搜尋資料、別名、封存 |
| 4 | 對局記錄 | 完成 | 新對局、進行中、完成、Undo、自動編號、最近組合 |
| 5 | 歷史 | 完成 | 列表、篩選、軟刪除、還原、複製重開 |
| 6 | 統計（基礎） | 完成 | 總覽、玩家/牌組勝率、樣本量提示 |
| 7A | 玩家實戰體驗打磨 | 完成 | 對局編輯、Session dashboard、Deck alias、Rematch、基礎對位表 |
| 7B | 統計（進階） | 完成 | 先後攻拆分、趨勢、Player×Deck |
| 8 | 匯入匯出 | 完成 | CSV / Excel import、mapping preview、import report |
| 8B | V1.2 UX Polish | 完成 | Quick Mode、大 WIN 卡、分層 Deck Picker、Settings Hub、Insights |
| 8C | V1.3 Data Foundation | 完成 | Schema V4、Leader/DeckVariant 正規化、PlayerAlias、MatchRevision、ImportBatch/Row、selector layer |
| 9A | PWA App Shell | 完成 | manifest、install metadata、service worker、離線 shell cache |
| 9B | IndexedDB | 完成 | Dexie app-state snapshot、localStorage 遷移、localStorage fallback |
| 9C | Cloud Backup / Restore | Part 1 完成 | Supabase email login、手動備份、最新備份還原、RLS schema |
| 9D | Login + Group Sync | Part 1 完成 | Email login、群組碼加入/建立、群組上傳/下載 |
| 9E | Auto Sync | 待做 | 自動同步、衝突提示、裝置狀態 |
| V3.0 | Interaction + I18n + Docs | 完成 | 互動反饋、三語系、文件拆分、使用者 README、可讀 Excel 匯入匯出 |
| V3.1 | Usability Patch | 完成 | Email rate-limit 提示、短格式 Leader 顯示、History 牌組搜尋、別名分隔、Cloud 偏好保存、新對局重排 |
| V3.2 | Mobile + Settings Refinement | 完成 | 新對局彈窗高度、設定頁分類、玩家/Leader 分離、Session 切換、全站短格式 deck 名稱 |
| V3.3 | Match Flow & Density Patch | 完成 | Session roster、Record 緊湊排版、Deck combobox、完成後備註、History 勝方色、Stats 微排行榜、Leader locale aliases |
| V3.4 | Table Mode | 完成 | Slot-based 多桌對局、拖曳分配、± 調整桌數 |
| V3.4.1 | Record UX Patch | 完成 | 緊湊桌卡、AssignmentDock、移除新對局、最近組合→空桌 rematch |
| V3.5 | Group Realtime Collab | 完成 | Plan B：Supabase 拆表、entity sync、Realtime、offline queue |
| V3.6 | Mobile Record + Session Mgmt | 完成 | 手機桌在上、Session 管理、永久刪除、備份版本還原 |
| V3.7 | Tombstone Sync + Archive | 完成 | 統一 tombstone 同步、Session 封存、History 篩選 |
| V3.8 | Mobile Assignment Drawer | 完成 | 固定底部分配欄、雙向分配、緊湊桌列、UI 設計文件 |
| V3.9 | Bottom Chrome + Listed Players | 完成 | 統一底欄、玩家可見性規則、歷史自訂日期篩選 |
| V3.10 | Group Sync + Stats + i18n | 完成 | 強制群組同步、離線 queue、繁簡中、對手勝率、heatmap 放大 |
| V3.10.1 | Session Merge | 完成 | 場次合併、名單/桌數移轉、群組同步 |
| **V4.1** | **Profile UX & Tiered Achievements** | **完成** | Profile 橫向摘要卡 + 詳情 sheet、牌組 pie 同色分離、分級成就系統 |
| **V4.2–V4.3.5** | **Personal System 擴充** | **完成** | 50 成就家族、社群解鎖率、PNG 分享卡、light/dark 主題、音效、Profile 身份卡、趨勢柱狀圖、deck preview |
| V5.0 | Event / League Foundation | 規劃中 | Event / League 資料結構、與現有玩家/Leader/Match 串接、草稿建立 |
| V5.1 | Store Tournament | 規劃中 | 16 人瑞士輪、抽籤 pairing、結果輸入、standings、event report |
| V5.2 | League Ruleset | 規劃中 | Leader 計分賽、Top Tier 規則、ban/restriction、從既有 matches 計算 leaderboard |
| V5.3 | Reports + Sharing | 規劃中 | 店賽報告、League leaderboard、Excel / image / **公開 read-only URL** 分享 |

---

## Approved backlog（V4.4+，已確認納入規劃）

以下為產品討論後**確認要排進 roadmap** 的項目（2026-07-09 更新，基準版本 **V4.3.5**）。  
其餘腦暴見 [`docs/BACKLOG-IDEAS.md`](BACKLOG-IDEAS.md)。

狀態：**已完成** / **部分已有**（需加強）/ **規劃中**。

### Record & 桌面體驗

| ID | 項目 | 狀態 | 目標 | 備註 |
|----|------|------|------|------|
| R-01 | **對局計時器** | 規劃中 | V4.4 | 進行中顯示耗時；完成後可選寫入 Match；Stats 均局時長 |
| R-02 | **桌面版 Undo 歷史面板** | 規劃中 | V4.4–4.5 | 最近 N 步可視化還原（完成/編輯/刪除/分配），不只單場 Undo |
| R-03 | **操作 audit log** | 規劃中 | V4.5 | 與 R-02 共用事件流；群組內追蹤「誰改了什麼」 |
| R-04 | **iPad / 橫屏 layout** | 規劃中 | V4.5 | 左桌右分配（`V3.4.1-RECORD-UX.md` P2） |

**已有（不重複做）：** 單場 Undo 還原到空桌、Table Mode、AssignmentDock（V3.4–3.10.6）。

### 群組 & 同步

| ID | 項目 | 狀態 | 目標 | 備註 |
|----|------|------|------|------|
| G-01 | **多群組切換** | 部分已有 | V4.12 | `switchWorkspace` + 本機/快取群組列表；Settings 工作區 hub |
| G-02 | **離線優先 indicator 強化** | 部分已有 | V4.12 | Banner 可點 → 同步 sheet；System 仍保留 audit |
| G-03 | **衝突合併 UI** | 規劃中 | V4.5 | 與 9E 一併；入群 / pull 時本地 vs 雲端 diff |
| G-04 | **Profile claim 跨裝置 Supabase 同步** | 部分已有 | V4.5 | 現有本地 claim；需雲端持久化 |
| G-05 | **遊戲大廳 / 群組 registry** | 規劃中 | V4.12+ | `groups` 表、display name 可重複、invite slug；取代「code 被占即回不去」 |
| G-06 | **RLS 依 role 寫入 sync_*** | 部分已有 | V4.12 | V4.11 client 端 gate；需 Supabase policy + reader 只讀 |

**V4.11 已完成：** 成就 eligible 規則、雲端備份優先、owner/member/reader 角色基礎 — 見 [`docs/ACHIEVEMENT-TRUST.md`](ACHIEVEMENT-TRUST.md)。

### 成就 & 信任

| ID | 項目 | 狀態 | 目標 | 備註 |
|----|------|------|------|------|
| A-01 | **Eligible 成就規則** | 完成 | V4.11 | 5min 時長/間隔、session 20 場、import 不計 |
| A-02 | **Server achievement ledger** | 部分已有 | V4.12 | SQL 已備；client sync 待做 |
| A-03 | **Verified 雙確認** | 規劃中 | V5+ | 需社群普及；`trustTier` 欄位已預留 |
| A-04 | **備份自動化** | 部分已有 | V4.11 | 登入 auto-backup；待做：週期背景備份 |

**已有：** Excel import + mapping preview、cloud backup。

### 統計 & Meta 分析

| ID | 項目 | 狀態 | 目標 | 備註 |
|----|------|------|------|------|
| S-01 | **時間序列勝率** | 部分已有 | V4.4 | **已有** Profile 每週線圖 + Recent form 柱狀（V4.3.5）；待做：全站 Stats tab、牌組級趨勢 |
| S-02 | **Meta 轉移圖** | 規劃中 | V4.5 | 牌組出場率隨時間堆疊 / 佔比變化 |
| S-03 | **對位置信度** | 部分已有 | V4.4 | **已有** 樣本標籤、≥3 場、heatmap W-L；待做：Bayesian 平滑、不足灰階、tooltip |

**已有：** Heatmap、加權勝率、deck pie、連勝摘要、環境概覽（V3.10–V4.3.5）。

### 建議排程（草案）

| 版本 | 聚焦 |
|------|------|
| **V4.4** | R-01 計時器、G-02 同步 indicator、S-01/S-03 統計加強、D-01 Import 去重 |
| **V4.5** | R-02/R-03 Undo + audit、G-01 多群組、G-03/G-04、S-02 Meta 轉移、R-04 橫屏 |
| **V5.0+** | Event / League 主線；D-02 公開 URL 可併 V5.3 |

---

## Next

詳見 **[`docs/V4.16-ROADMAP.md`](V4.16-ROADMAP.md)**（V4.16–V4.21 重排版）。

- **V4.16** ✅：A-02 成就帳本、A-04 週期備份、D-01 去重、G-02 同步佇列 UI。
- **V4.17** ✅：R-01 計時器收尾、S-03 置信度 UI、S-01a Stats 趨勢。
- **V4.18** ✅：G-05 大廳、G-01+ 多群組、G-04 claim 雲端。
- **V4.19**：R-02 Undo 面板、R-03 audit、9E auto sync。
- **V5.0+**：Event / League 主線。

## V4.16+ 排程摘要

| 版本 | 聚焦 |
|------|------|
| V4.16 | 信任與同步基礎 |
| V4.17 | 記錄與統計收尾 |
| V4.18 | 群組體驗 |
| V4.19 | 操作可追溯 |
| V4.20 | 衝突與 Meta |
| V4.21 | 拋光與成就擴充 |

~~V4.4 草案~~ 已由 V4.16+ 取代。

## V4 Personal System (shipped — V4.1 through V4.3.5)

- **Profile linking (A+C hybrid)**：`settings.linkedPlayerId` + 裝置 claim（`profileClaimDeviceId`）。可「建立我的玩家」或「連結已有玩家」；後者需輸入完整名稱確認；若已在其他裝置連結，需額外勾選才能 reclaim。
- **Stats**：目前/最高連勝、牌組使用率 pie + preview 卡、每週勝率線圖、Recent form 柱狀圖、跨 Session 全時段 profile 數據。
- **Share export**：Profile / Session → **PNG**（Web Share API 或下載）；公開 URL 見 **D-02** backlog。
- **Achievements**：50 成就家族、分級 tier、社群解鎖率與排行、解鎖 toast + 音效。Backlog 見 [`docs/ACHIEVEMENTS-BACKLOG.md`](ACHIEVEMENTS-BACKLOG.md)。
- **Appearance**：dark / light / system、5 色 accent、compact/comfortable 密度、統計預設 scope。
- **UI**：glass card、統一圓角/按壓動畫、1st/2nd badge、TurnOrderBadge。

## V5 Event / League Direction

詳情見 [`docs/EVENTS-AND-LEAGUES.md`](EVENTS-AND-LEAGUES.md)。

- `Session`：日常對局記錄。
- `Event`：店賽 / 瑞士輪 / 有輪次和 standings 的活動。
- `League`：長期自訂計分規則，讀取既有 match data 計算 leaderboard，不改原始對局資料。
