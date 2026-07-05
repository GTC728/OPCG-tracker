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
| V4.0 | Event / League Foundation | 規劃中 | Event / League 資料結構、與現有玩家/Leader/Match 串接、草稿建立 |
| V4.1 | Store Tournament | 規劃中 | 16 人瑞士輪、抽籤 pairing、結果輸入、standings、event report |
| V4.2 | League Ruleset | 規劃中 | Leader 計分賽、Top Tier 規則、ban/restriction、從既有 matches 計算 leaderboard |
| V4.3 | Reports + Sharing | 規劃中 | 店賽報告、League leaderboard、Excel / image / read-only link 分享 |

## Next

- **V4.0**：Event / League foundation（見下方規劃）。
- Stats backlog：Recent form 分母調查、Profile heatmap 設計。
- Group backlog：首次加入群組時本地/雲端衝突合併策略。

## V4 Event / League Direction

詳情見 [`docs/EVENTS-AND-LEAGUES.md`](EVENTS-AND-LEAGUES.md)。

- `Session`：日常對局記錄。
- `Event`：店賽 / 瑞士輪 / 有輪次和 standings 的活動。
- `League`：長期自訂計分規則，讀取既有 match data 計算 leaderboard，不改原始對局資料。
