# kanjireader

小学生向け漢字読みの勉強アプリです。React Native (Expo) で実装されており、SQLite に保存した例文データをもとにクイズ形式で出題します。スコアやレベル、バッジ獲得機能で継続的な学習をサポートします。

## 主要ディレクトリ
- `assets/` - 画像や TSV データなどの静的アセットを配置。`create_kanji_data.sh` を実行すると `kanji1_6.tsv` から `kanji-data.js` を生成できます。
- `components/` - スコアバーやバッジ表示など、画面で使用する再利用可能なコンポーネント群。
- `screens/` - 画面遷移用コンポーネント。現在はフィルタ設定画面 (`FilterScreen.js`) を収録。
- `utils/` - レベル管理やユーザー統計管理のヘルパー関数をまとめています。
- `db.js` - SQLite データベースを利用したデータ管理モジュール。
- `memoryDb.js` - テスト向けのメモリ版データベース実装。

## セットアップ
1. Node.js と npm を用意します。
2. 依存パッケージをインストールします。
   ```bash
   npm install
   ```
3. 必要に応じてデータファイルを生成します。
   ```bash
   bash create_kanji_data.sh
   ```
4. Expo 開発サーバーを起動します。
   ```bash
   npm start
   ```
   表示された QR コードを端末の Expo Go アプリで読み込むとアプリを確認できます。

## ライセンス
MIT License
