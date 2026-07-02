# OPCG Tracker

Mobile-first OPCG 對局記錄與戰績分析工具（V2.1）。

完整產品規格見 [`docs/OPCG-Tracker-Product-Plan-V2.1.md`](docs/OPCG-Tracker-Product-Plan-V2.1.md)。

## 開發路線（分步實作）

| Step | 模組 | 狀態 | 交付物 |
|------|------|------|--------|
| **1** | 專案骨架 | ✅ 完成 | Vite + React + TS + Tailwind、型別定義、Bottom Nav、四頁 placeholder |
| **2** | 儲存層 | ✅ 完成 | localStorage 讀寫、Zustand actions、Session 自動建立 |
| **3** | 玩家 & 牌組管理 | ✅ 完成 | 設定頁 CRUD、搜尋資料、別名、封存 |
| **4** | 對局記錄 | ✅ 完成 | 新對局、進行中、完成、Undo、自動編號、最近組合 |
| **5** | 歷史 | ✅ 完成 | 列表、篩選、軟刪除、還原、複製重開 |
| **6** | 統計（基礎） | ✅ 完成 | 總覽、玩家/牌組勝率、樣本量提示 |
| **7A** | 玩家實戰體驗打磨 | ✅ 完成 | 對局編輯、Session dashboard、Deck alias、Rematch、基礎對位表 |
| **7B** | 統計（進階） | ✅ 完成 | 先後攻拆分、趨勢、Player×Deck |
| **8** | 匯入匯出 | ✅ 完成 | CSV / Excel import、mapping preview、import report |
| **8B** | V1.2 UX Polish | ✅ 完成 | Quick Mode、大 WIN 卡、分層 Deck Picker、Settings Hub、Insights |
| **8C** | V1.3 Data Foundation | ✅ 完成 | Schema V4、Leader/DeckVariant 正規化、PlayerAlias、MatchRevision、ImportBatch/Row、selector layer |
| **9A** | PWA App Shell | ✅ 完成 | manifest、install metadata、service worker、離線 shell cache |
| **9B** | IndexedDB | ✅ 完成 | Dexie app-state snapshot、localStorage → IndexedDB 自動遷移、localStorage fallback |
| **9C** | Cloud Backup / Restore | ✅ Part 1 完成 | Supabase email login、手動備份、最新備份還原、RLS schema |
| **9D** | Auto Sync | ⏳ 待做 | 自動同步、衝突提示、裝置狀態 |

## 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand（狀態管理）
- read-excel-file（Excel 匯入；按需載入）
- Dexie / IndexedDB（主要儲存）
- Supabase（Cloud backup / restore）
- localStorage fallback

## 本機開發

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Cloud backup 設定：

1. 在 Supabase 建立 project。
2. 在 Supabase SQL editor 執行 [`docs/supabase-setup.sql`](docs/supabase-setup.sql)。
3. 複製 `.env.example` 為 `.env.local`，填入：

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. 重啟 dev server。
5. 在 `設定 → App 資料 → Cloud Backup` 輸入 email，使用 magic link 登入後即可備份 / 還原。

## 專案結構

```text
src/
├── components/
│   ├── layout/     # AppShell, BottomNav
│   ├── record/     # Match recording UI
│   ├── settings/   # Player / Deck management UI
│   └── ui/         # Button, BottomSheet, Toast
├── data/           # Seeded OPCG leader deck database
├── lib/            # constants, storage, stats, selectors, entity helpers
├── pages/          # Record, Stats, History, Settings
├── stores/         # Zustand app store
└── types/          # 資料模型（對應計劃書 §10）
```

## Leader 牌組資料庫

App 內建 English OPCG base Leader 資料，來源為 `buhbbl/punk-records` 的靜態 JSON dataset。資料會在啟動時自動 merge 到 `decks`，所以已有 localStorage 的用戶刷新後也會補齊 leader。

更新 seed data：

```bash
python scripts/generate-leader-decks.py
```

新對局中可用 `OP01`、`OP-01`、`ST10`、`EB01`、leader name、顏色、traits 搜尋 leader。

## V1.3 Data Foundation

本輪把剛才討論的資料地基一次落實，但保留現有 UI 行為不變：

- Schema 升級到 V4，新增 `Leader`、`DeckVariant`、`PlayerAlias`、`SessionPlayer`、`SessionDeck`、`MatchRevision`、`ImportBatch`、`ImportRow`。
- V3 localStorage 會自動 migration：現有 `decks` 轉為 `leaders + deckVariants`，玩家 aliases 拆成 `playerAliases`。
- 現有 `decks` 保留為 compatibility view，因此 Record / Stats / History 暫時不用大改。
- 新增 selector layer：統一處理 deck 顯示名、variant 查 leader、玩家 alias、session roster、session deck、deck/player query resolving。
- 編輯完成對局會寫入 `matchRevisions`，匯入會同步保留舊 `importRecords` 與新 `importBatches/importRows`。

## 長期使用路線

長期多裝置使用會分三步做：

- **9A PWA App Shell**：已完成。可部署後在手機加入主畫面，並快取基本 app shell。
- **9B IndexedDB / Dexie**：已完成。啟動時優先讀 IndexedDB；若只有舊 `localStorage` 資料，會自動遷移到 IndexedDB。
- **9C Cloud Backup / Restore**：已完成第一階段。使用 Supabase email magic link 登入後，可手動備份本機資料或還原最新雲端備份。
- **9D Auto Sync**：下一步。每次修改後自動同步，並處理手機和電腦同時修改的衝突。

## 目前進度

**V1.3 Data Foundation + 9A/9B/9C Part 1 長期使用基礎已完成**：資料模型已從單一 `decks` 走向 `Leader + DeckVariant`；PWA manifest 和 service worker 已建立；主要儲存已遷移到 Dexie / IndexedDB；Cloud Backup / Restore 已接 Supabase email login。

下一步（Step 9D）：Auto Sync，讓手機與電腦更接近共用同一份即時資料。
