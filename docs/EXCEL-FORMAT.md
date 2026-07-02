# Excel Export / Import Format

## Goals

The OPCG Tracker Excel format serves two audiences:

- Humans: open Excel and read `README` and `對局總表`.
- App importers: restore complete data through `_meta` and `_app_state_json`.

## Human Sheets

### `README`

Explains which sheet to read first and how the workbook can be imported back into the app.

### `對局總表`

Readable match table with:

- 日期
- Session
- 場次
- 對局
- 玩家A
- 牌組A
- 玩家B
- 牌組B
- 勝方
- 先攻
- 結果
- 狀態
- 來源
- 備註

## Machine Sheets

### `_meta`

Contains workbook identity:

- `export_format = opcg-tracker-excel`
- `export_format_version`
- `app_schema_version`
- `app_version`
- `exported_at`
- `timezone`
- `row_counts`

### `matches`

Canonical completed match records with stable IDs.

### `players`, `player_aliases`, `leaders`, `deck_variants`, `sessions`

Normalized reference tables for future import and audits.

### `active_matches`, `match_revisions`, `import_batches`, `import_rows`

Recovery and audit data.

### `_dictionary`

Machine-readable description of sheet columns.

### `_app_state_json`

Lossless `AppState` snapshot, split into chunks when needed. Current app import prefers this sheet because it preserves full compatibility.

## Import Strategy

1. Read `_meta`.
2. If `export_format` is `opcg-tracker-excel`, read `_app_state_json`.
3. Migrate the imported app state through the storage migration layer.
4. Ask the user to confirm before replacing local data.
5. If `_meta` is missing, fall back to normal CSV/Excel mapping import.
