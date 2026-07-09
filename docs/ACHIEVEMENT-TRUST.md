# Achievement Trust Model (V4.11+)

## 設計原則

1. **統計 ≠ 成就**：所有對局仍計入勝率、歷史、匯出；只有「永久成就 / profileLifetime」使用 **eligible** 子集。
2. **備份優先於 CSV**：鼓勵 Gmail 雲端備份 + 完整還原；CSV 匯入保留給 mapping，**不計成就**。
3. **事件可重算**：migration / 規則升級時，從 match 歷史 replay（Trophy / event-sourcing 模式）。
4. **信任分級預留**：`trustTier: self | group | verified`（verified 待社群 v2）。

## Eligible 規則（`src/lib/achievementEligibility.ts`）

| 規則 | 條件 |
|------|------|
| 來源 | `manual` / `manual_edit` / `restore` ✓；`import` ✗ |
| 投降 | `resultType === forfeit` ✗ |
| 單場時長 | ≥ 5 分鐘 |
| 連續間隔 | 同一玩家上一場 `finishedAt` → 本場 `startedAt` ≥ 5 分鐘 |
| Session 上限 | 同一玩家同一 session 最多 **20** 場計成就 |

## 還原路徑

| 路徑 | 成就 |
|------|------|
| 雲端個人備份還原 | ✓（`prepareRestoredAppState` → `restore` source + backfill） |
| OPCG 完整 Excel 還原 | ✓ |
| CSV / Excel mapping 匯入 | ✗（仍顯示在統計） |
| **歷史還原 `historical`** | ✓ 累積型 only（≤100 場、≥30 天、終身 1 次） |

## 歷史還原（V4.11.1）

- 勾選「歷史戰績還原」或於匯入紀錄 **升級歷史還原**
- `kind === 'grind'` 且非 streak/fun 類成就計入；skill/special/連勝/時間類不計

## 群組角色（V4.11）

| 角色 | 錄局 | 刪除對局 |
|------|------|----------|
| owner | ✓ | ✓ |
| member | ✓ | ✗ |
| reader | ✗（觀眾） | ✗ |

離開群組會刪除 Supabase `group_members` 列（可重新加入）。

## 待做（Roadmap）

- **G-05** 遊戲大廳：群組 display name 可重複、invite slug、成員列表
- **G-06** RLS 依 role 限制 `sync_*` 寫入
- **A-02** Supabase `profile_achievement_unlocks` 伺服器帳本
- **A-03** 雙方確認 → `trustTier: verified`

Run SQL: `docs/supabase-v4.11.sql`
