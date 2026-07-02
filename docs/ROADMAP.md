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

## Next

- 做 Auto Sync 和衝突處理。
- 繼續補深層統計頁和少數提示文字的完整三語翻譯。
