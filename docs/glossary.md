# 用語集

- **品質ルールの正本**：Lint と Format の既定値を定義する唯一の共有 preset。本リポジトリでは Ultracite を指す。
- **ローカル差分**：生成物の除外など、共有 preset だけでは表現できないリポジトリ固有の設定。
- **品質ゲート**：コードを変更せずに Lint、Format、Typecheck を実行する root の `check` コマンド。
- **自動修正入口**：Formatter と安全な Lint fix を実行する root の `fix` コマンド。
- **型情報 lint**：`oxlint-tsgolint` が TypeScript の型情報を使って Promise の誤用などを検出する検査。
- **適用面**：品質ゲートまたは自動修正入口を呼び出す CI、Git hook、Editor、Agent の各連携箇所。
