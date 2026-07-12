# Server Integrity (V4.15+)

## 目的

在 PWA 客戶端之外，於 Supabase 強制執行群組協作與歷史還原規則，避免篡改 `source`、觀眾寫入、封禁用戶同步、或繞過歷史還原條件。

## 部署

在 Supabase SQL Editor 依序執行既有遷移後，執行：

```
docs/supabase-v4.15-integrity.sql
```

若先前執行失敗並出現 `relation "public.app_privileges" does not exist`，請重新執行**整份**更新後的 SQL（已修正函式與建表順序）。`create table if not exists` 與 `create or replace function` 可安全重跑。

## 機制摘要

| 層級 | 內容 |
|------|------|
| **RLS** | `user_can_write_group_collab()` — 僅 `owner` / `member` 且未封禁可寫入 `sync_*` |
| **Trigger** | `validate_sync_match_row` — 拒絕 `import` source、驗證勝方、歷史還原需 `integrity_grant_id` |
| **RPC** | `request_historical_import_grant` — 伺服器驗證 ≤100 場、≥30 天跨度（或特權略過） |
| **特權表** | `app_privileges` — 開發者於 Dashboard 手動加入 `user_id`（**勿寫入 GitHub**） |

## 歷史還原流程

1. 使用者勾選「歷史戰績還原」並匯入。
2. 若已登入雲端，App 呼叫 `request_historical_import_grant`，取得 `grant_id` 並存於 `ImportBatch.integrityGrantId`。
3. 群組同步推送 `source=historical` 對局時，附帶 `integrity_grant_id`；觸發器消耗 grant 額度。
4. 未登入時仍僅本機匯入（客戶端驗證）；日後加入群組同步前需重新取得 grant。

## 開發者特權（單日賽事等）

在 Supabase Dashboard → Table Editor → `app_privileges`：

```sql
insert into public.app_privileges (user_id, historical_bypass_span, note)
values ('<你的-auth-users-uuid>', true, 'tournament single-day import');
```

`user_id` 可於 Authentication → Users 複製。設定後，該帳號登入時可略過「≥30 天跨度」檢查（仍受 ≤100 場限制）。

## 相關檔案

- SQL：`docs/supabase-v4.15-integrity.sql`
- 客戶端：`src/lib/serverIntegrity.ts`
- 同步：`src/lib/groupSync.ts`（`integrity_grant_id` 欄位）
- 信任模型：`docs/ACHIEVEMENT-TRUST.md`
