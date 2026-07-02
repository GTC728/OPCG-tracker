# OPCG Tracker

**V3.0**：互動反饋、三語系、可讀 Excel 匯入匯出、Cloud group sync 和完整使用者文件。

OPCG Tracker 是一個手機優先的 One Piece Card Game 對局記錄、匯入匯出、戰績分析和雲端共享工具。

它適合卡店測試、朋友群練牌、賽前 meta 記錄，也可以長期在手機和電腦之間共用同一份資料。

## 第一次使用

1. 打開網站。
2. 先選擇語言。預設是 English，之後可在 `Settings / 設定` 更改。
3. 如要手機和電腦共用，可到 Cloud Backup 登入 email 並加入群組。
4. 到 `設定`。
5. 進入 `玩家 / Leader`。
6. 先新增至少兩位玩家。
7. 回到 `記錄`。
8. 按 `＋ 新對局`。
9. 選兩位玩家、兩副 Leader / 牌組。
10. 對局完成後按勝方。
11. 到 `統計` 查看統計，或到 `歷史` 修正舊對局。

## 常用功能

- `記錄`：建立正在進行的對局，完成後直接按勝方。
- `統計`：看勝率、先後攻、玩家表現、牌組表現和 matchup。
- `歷史`：搜尋舊對局、編輯、複製重開、刪除或還原。
- `設定`：管理玩家、Leader 別名、匯入舊 Excel、匯出 Excel、雲端備份和群組共享。

## 匯入舊 Excel

1. 到 `設定 → 匯入 / 清理`。
2. 按 `選擇 Excel / CSV 檔案`。
3. 選你的舊 `.xlsx`、`.xls` 或 `.csv`。
4. 如果是普通表格，系統會讓你配對欄位，例如玩家 A、牌組 A、勝方。
5. 確認 preview 沒問題後按 `確認匯入`。

## 匯出 Excel

1. 到 `設定 → 匯入 / 清理`。
2. 按 `匯出 Excel`。
3. Excel 會包含兩種內容：
   - `README` 和 `對局總表`：給人看的表。
   - `_meta`、`matches`、`_app_state_json`：給 app 日後完整還原用。

如果你之後把 OPCG Tracker 自己匯出的 Excel 再匯入，系統會自動辨認並要求你確認是否完整還原。

## 手機和電腦共用

1. 到 `設定 → App 資料 → Cloud Backup`。
2. 輸入 email。
3. 到 email 打開 magic link 登入。
4. 登入後輸入 8 字以上群組碼。
5. 同一群組碼的登入使用者可以上傳或下載同一份群組資料。

群組碼等同邀請密鑰，只分享給可信任的人。

## 更多文件

- 使用手冊：[`docs/USER-GUIDE.md`](docs/USER-GUIDE.md)
- 開發與本機執行：[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- Cloud Sync 設定：[`docs/CLOUD-SYNC.md`](docs/CLOUD-SYNC.md)
- Excel 格式：[`docs/EXCEL-FORMAT.md`](docs/EXCEL-FORMAT.md)
- Git / Push 摘要流程：[`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md)
- Changelog：[`CHANGELOG.md`](CHANGELOG.md)
- Roadmap：[`docs/ROADMAP.md`](docs/ROADMAP.md)
- 工程記錄：[`docs/ENGINEERING-LOG.md`](docs/ENGINEERING-LOG.md)
- 產品規格：[`docs/OPCG-Tracker-Product-Plan-V2.1.md`](docs/OPCG-Tracker-Product-Plan-V2.1.md)
