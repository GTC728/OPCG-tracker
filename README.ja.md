# OPCG Tracker

**Live Demo:** [https://opcg-tracker-v2.pages.dev](https://opcg-tracker-v2.pages.dev)

**V3.3**: セッション参加者選択、記録画面のコンパクト化、Deck combobox、試合後メモ、統計ミニランキング、Leader 多言語別名に対応。

言語:

- English: [`README.md`](README.md)
- 繁體中文: [`README.zh-HK.md`](README.zh-HK.md)
- 日本語: [`README.ja.md`](README.ja.md)

OPCG Tracker は、プレイヤーや小規模な調整グループが対戦を記録し、プレイヤーと Leader を管理し、戦績を分析し、古い表計算ファイルを取り込み、長期保存できる Excel バックアップを作成し、スマホと PC で同じデータを共有するためのツールです。

## 何に使うか

- カードショップでのフリー対戦、調整会、イベント前の練習を素早く記録する。
- プレイヤー勝率、Leader 勝率、先攻/後攻、最近の成績、対面データを見る。
- IndexedDB、Excel バックアップ/復元、任意の Supabase クラウド同期でデータを長期利用する。
- メールログインとグループコードで、信頼できるメンバーと同じデータを共有する。

## 初回利用

1. アプリを開きます。
2. 言語を選びます。新規ユーザーの初期言語は English で、あとから `Settings` で変更できます。
3. スマホと PC で共有したい場合は、`Cloud & Group` でメールログインし、グループコードに参加します。
4. `Settings` を開きます。
5. `Players` を開きます。
6. 最低 2 人のプレイヤーを追加します。
7. `Record` に戻ります。
8. `+ New Match` を押します。
9. 2 人のプレイヤーと 2 つの Leader / デッキを選びます。
10. 対戦後、勝者を押します。
11. `Stats` で分析し、必要なら `History` で過去の対戦を修正します。

## 主な機能

- `Record`: 進行中の対戦を作成し、プレイヤー、Leader、先攻、勝者を記録します。
- `Stats`: 勝率、先攻/後攻、プレイヤープロフィール、デッキプロフィール、対面、最近の成績を確認します。
- `History`: 完了した対戦を検索、絞り込み、編集、コピー、削除、復元します。
- `Settings`: プレイヤー、Leader 別名、言語、セッション、Excel、クラウドバックアップ、グループ共有を管理します。

## Excel インポート

1. `Settings -> Import / Export` に移動します。
2. `.xlsx`、`.xls`、または `.csv` を選びます。
3. 通常の表では、Player A、Deck A、Player B、Deck B、勝者、先攻などの列を対応付けます。
4. プレビューを確認します。
5. インポートを確定します。

OPCG Tracker 自身が出力した Excel は自動検出され、確認後に完全なアプリ状態を復元できます。

## Excel エクスポート

1. `Settings -> Import / Export` に移動します。
2. `Export Excel` を押します。
3. Workbook には次の種類のシートが含まれます。
   - `README`、`對局總表` などの人が読むためのシート。
   - `_meta`、`matches`、`_app_state_json` などのアプリ復元用シート。

`_app_state_json` は長期的に最も安全な復元ルートです。

## クラウドとグループ共有

1. `Settings -> Cloud & Group` に移動します。
2. メールアドレスを入力し、magic link を開きます。
3. 8 文字以上のグループコードを入力します。
4. グループメンバーは共有データをアップロードまたはダウンロードできます。

グループコードは招待シークレットです。信頼できる人だけに共有してください。

## 今後の方向性

現在の優先事項は、個人の対戦記録、調整グループでの共有、壊れにくいバックアップ、実用的な分析です。今後の計画には次が含まれます。

- 小規模スイスドロー向けの店鋪大会モード。
- 長期的なカスタム計分に使う League / Ruleset モード。
- 店鋪イベントやメタ分析向けの共有レポート。

設計の詳細は [`docs/EVENTS-AND-LEAGUES.md`](docs/EVENTS-AND-LEAGUES.md) を参照してください。

## ドキュメント

- User guide: [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md)
- Development: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- Cloud sync setup: [`docs/CLOUD-SYNC.md`](docs/CLOUD-SYNC.md)
- Excel format: [`docs/EXCEL-FORMAT.md`](docs/EXCEL-FORMAT.md)
- Git workflow: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)
- Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Project history: [`docs/PROJECT-HISTORY.md`](docs/PROJECT-HISTORY.md)
- Engineering log: [`docs/ENGINEERING-LOG.md`](docs/ENGINEERING-LOG.md)
- Product plan: [`docs/OPCG-Tracker-Product-Plan-V2.1.md`](docs/OPCG-Tracker-Product-Plan-V2.1.md)
- Event and League blueprint: [`docs/EVENTS-AND-LEAGUES.md`](docs/EVENTS-AND-LEAGUES.md)
